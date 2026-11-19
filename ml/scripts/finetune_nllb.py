#!/usr/bin/env python3
"""
LinguaBridge - NLLB-200 LoRA Fine-tuning Script

Fine-tunes NLLB-200-distilled-600M with LoRA adapters on parallel text data
focusing on English <-> Indian languages.

Usage:
    python finetune_nllb.py --config ../configs/training_config.yaml
    python finetune_nllb.py --src-lang eng_Latn --tgt-lang hin_Deva --epochs 3
"""

import argparse
import json
import logging
import os
import sys
from pathlib import Path
from typing import Optional

import yaml
import torch
import numpy as np
from datasets import Dataset, load_dataset, concatenate_datasets
from transformers import (
    AutoModelForSeq2SeqLM,
    AutoTokenizer,
    Seq2SeqTrainer,
    Seq2SeqTrainingArguments,
    DataCollatorForSeq2Seq,
    EarlyStoppingCallback,
)
from peft import LoraConfig, get_peft_model, TaskType, PeftModel
import evaluate

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def load_config(config_path: str) -> dict:
    """Load training configuration from YAML file."""
    with open(config_path, "r") as f:
        return yaml.safe_load(f)


def get_device() -> torch.device:
    """Auto-detect best available device."""
    if torch.cuda.is_available():
        device = torch.device("cuda")
        logger.info(f"Using GPU: {torch.cuda.get_device_name(0)}")
    elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        device = torch.device("mps")
        logger.info("Using Apple MPS")
    else:
        device = torch.device("cpu")
        logger.info("Using CPU (training will be slow)")
    return device


def load_flores200_data(src_lang: str, tgt_lang: str, split: str = "dev") -> Dataset:
    """Load FLORES-200 dataset for a language pair."""
    logger.info(f"Loading FLORES-200 {src_lang}-{tgt_lang} ({split})")
    try:
        dataset = load_dataset("facebook/flores", f"{src_lang}-{tgt_lang}", split=split)
        return dataset
    except Exception:
        # Try loading individual language datasets and aligning
        try:
            src_ds = load_dataset("facebook/flores", src_lang, split=split)
            tgt_ds = load_dataset("facebook/flores", tgt_lang, split=split)
            return Dataset.from_dict({
                "source": src_ds["sentence"],
                "target": tgt_ds["sentence"],
            })
        except Exception as e:
            logger.warning(f"Could not load FLORES-200 for {src_lang}-{tgt_lang}: {e}")
            return None


def load_samanantar_data(src_lang: str, tgt_lang: str, max_samples: int = 100000) -> Dataset:
    """Load Samanantar dataset (English-Indian language pairs)."""
    lang_map = {
        "hin_Deva": "hi", "pan_Guru": "pa", "tam_Taml": "ta",
        "tel_Telu": "te", "ben_Beng": "bn", "mar_Deva": "mr",
        "guj_Gujr": "gu", "kan_Knda": "kn", "mal_Mlym": "ml",
        "ory_Orya": "or",
    }
    
    indic_code = lang_map.get(tgt_lang) or lang_map.get(src_lang)
    if not indic_code:
        logger.warning(f"Samanantar not available for {src_lang}-{tgt_lang}")
        return None
    
    try:
        logger.info(f"Loading Samanantar en-{indic_code}")
        dataset = load_dataset("ai4bharat/samanantar", indic_code, split="train")
        if len(dataset) > max_samples:
            dataset = dataset.shuffle(seed=42).select(range(max_samples))
        
        if src_lang == "eng_Latn":
            return Dataset.from_dict({
                "source": dataset["en"],
                "target": dataset[indic_code],
            })
        else:
            return Dataset.from_dict({
                "source": dataset[indic_code],
                "target": dataset["en"],
            })
    except Exception as e:
        logger.warning(f"Could not load Samanantar for {indic_code}: {e}")
        return None


def prepare_dataset(
    config: dict, src_lang: str, tgt_lang: str
) -> tuple[Dataset, Dataset]:
    """Prepare training and validation datasets."""
    datasets_list = []
    
    for ds_config in config.get("data", {}).get("datasets", []):
        name = ds_config["name"]
        if name == "flores200":
            ds = load_flores200_data(src_lang, tgt_lang, ds_config.get("split", "dev"))
            if ds:
                datasets_list.append(ds)
        elif name == "samanantar":
            ds = load_samanantar_data(
                src_lang, tgt_lang,
                ds_config.get("max_samples", 100000)
            )
            if ds:
                datasets_list.append(ds)
    
    if not datasets_list:
        logger.error("No datasets loaded! Creating a small synthetic dataset for demo.")
        # Create minimal demo dataset
        demo_pairs = [
            ("Hello, how are you?", "नमस्ते, आप कैसे हैं?"),
            ("What is your name?", "आपका नाम क्या है?"),
            ("Thank you very much.", "बहुत-बहुत धन्यवाद।"),
            ("I love programming.", "मुझे प्रोग्रामिंग पसंद है।"),
            ("The weather is nice today.", "आज मौसम अच्छा है।"),
        ] * 100  # Repeat for minimum viable dataset
        
        datasets_list.append(Dataset.from_dict({
            "source": [p[0] for p in demo_pairs],
            "target": [p[1] for p in demo_pairs],
        }))
    
    combined = concatenate_datasets(datasets_list) if len(datasets_list) > 1 else datasets_list[0]
    
    val_split = config.get("data", {}).get("validation_split", 0.05)
    split = combined.train_test_split(test_size=val_split, seed=42)
    
    logger.info(f"Training samples: {len(split['train'])}, Validation samples: {len(split['test'])}")
    return split["train"], split["test"]


def tokenize_dataset(
    dataset: Dataset,
    tokenizer,
    src_lang: str,
    tgt_lang: str,
    max_length: int = 256,
) -> Dataset:
    """Tokenize a dataset for seq2seq training."""
    tokenizer.src_lang = src_lang
    
    def tokenize_fn(examples):
        model_inputs = tokenizer(
            examples["source"],
            max_length=max_length,
            truncation=True,
            padding=False,
        )
        
        with tokenizer.as_target_tokenizer():
            labels = tokenizer(
                examples["target"],
                max_length=max_length,
                truncation=True,
                padding=False,
            )
        
        model_inputs["labels"] = labels["input_ids"]
        return model_inputs
    
    return dataset.map(
        tokenize_fn,
        batched=True,
        remove_columns=dataset.column_names,
        desc="Tokenizing",
    )


def compute_metrics(eval_preds, tokenizer):
    """Compute BLEU, chrF++, and METEOR metrics."""
    bleu_metric = evaluate.load("sacrebleu")
    chrf_metric = evaluate.load("chrf")
    meteor_metric = evaluate.load("meteor")
    
    preds, labels = eval_preds
    
    # Replace -100 with pad token id
    labels = np.where(labels != -100, labels, tokenizer.pad_token_id)
    
    decoded_preds = tokenizer.batch_decode(preds, skip_special_tokens=True)
    decoded_labels = tokenizer.batch_decode(labels, skip_special_tokens=True)
    
    # Strip whitespace
    decoded_preds = [pred.strip() for pred in decoded_preds]
    decoded_labels = [[label.strip()] for label in decoded_labels]
    
    bleu = bleu_metric.compute(predictions=decoded_preds, references=decoded_labels)
    chrf = chrf_metric.compute(predictions=decoded_preds, references=decoded_labels, word_order=2)
    
    # METEOR expects flat references
    flat_refs = [ref[0] for ref in decoded_labels]
    meteor = meteor_metric.compute(predictions=decoded_preds, references=flat_refs)
    
    return {
        "bleu": bleu["score"],
        "chrf": chrf["score"],
        "meteor": meteor["meteor"] * 100,
    }


def main():
    parser = argparse.ArgumentParser(description="Fine-tune NLLB-200 with LoRA")
    parser.add_argument("--config", type=str, default="../configs/training_config.yaml")
    parser.add_argument("--src-lang", type=str, default=None)
    parser.add_argument("--tgt-lang", type=str, default=None)
    parser.add_argument("--epochs", type=int, default=None)
    parser.add_argument("--batch-size", type=int, default=None)
    parser.add_argument("--lr", type=float, default=None)
    parser.add_argument("--output-dir", type=str, default=None)
    parser.add_argument("--no-wandb", action="store_true")
    args = parser.parse_args()
    
    # Load config
    config = load_config(args.config)
    
    device = get_device()
    
    # Model settings
    model_name = config["model"]["name"]
    max_length = config["model"].get("max_length", 256)
    
    # Get language pair
    lang_pairs = config.get("data", {}).get("language_pairs", [])
    if args.src_lang and args.tgt_lang:
        src_lang, tgt_lang = args.src_lang, args.tgt_lang
    elif lang_pairs:
        src_lang = lang_pairs[0]["src"]
        tgt_lang = lang_pairs[0]["tgt"]
    else:
        src_lang, tgt_lang = "eng_Latn", "hin_Deva"
    
    logger.info(f"Fine-tuning {model_name} for {src_lang} -> {tgt_lang}")
    
    # Load tokenizer and model
    logger.info("Loading tokenizer and model...")
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForSeq2SeqLM.from_pretrained(
        model_name,
        torch_dtype=torch.float16 if device.type == "cuda" else torch.float32,
    )
    
    # Configure LoRA
    lora_cfg = config.get("lora", {})
    peft_config = LoraConfig(
        r=lora_cfg.get("r", 16),
        lora_alpha=lora_cfg.get("alpha", 32),
        lora_dropout=lora_cfg.get("dropout", 0.05),
        target_modules=lora_cfg.get("target_modules", ["q_proj", "v_proj"]),
        bias=lora_cfg.get("bias", "none"),
        task_type=TaskType.SEQ_2_SEQ_LM,
    )
    
    model = get_peft_model(model, peft_config)
    model.print_trainable_parameters()
    
    # Load data
    train_dataset, val_dataset = prepare_dataset(config, src_lang, tgt_lang)
    
    # Tokenize
    train_tokenized = tokenize_dataset(train_dataset, tokenizer, src_lang, tgt_lang, max_length)
    val_tokenized = tokenize_dataset(val_dataset, tokenizer, src_lang, tgt_lang, max_length)
    
    # Data collator
    data_collator = DataCollatorForSeq2Seq(
        tokenizer=tokenizer,
        model=model,
        padding=True,
        max_length=max_length,
    )
    
    # Training arguments
    train_cfg = config.get("training", {})
    output_dir = args.output_dir or train_cfg.get("output_dir", "./output/lora_adapter")
    
    report_to = [] if args.no_wandb else train_cfg.get("report_to", [])
    
    training_args = Seq2SeqTrainingArguments(
        output_dir=output_dir,
        num_train_epochs=args.epochs or train_cfg.get("num_train_epochs", 3),
        per_device_train_batch_size=args.batch_size or train_cfg.get("per_device_train_batch_size", 8),
        per_device_eval_batch_size=train_cfg.get("per_device_eval_batch_size", 16),
        gradient_accumulation_steps=train_cfg.get("gradient_accumulation_steps", 4),
        learning_rate=args.lr or train_cfg.get("learning_rate", 2e-4),
        weight_decay=train_cfg.get("weight_decay", 0.01),
        warmup_steps=train_cfg.get("warmup_steps", 500),
        lr_scheduler_type=train_cfg.get("lr_scheduler_type", "cosine"),
        logging_steps=train_cfg.get("logging_steps", 50),
        eval_steps=train_cfg.get("eval_steps", 500),
        save_steps=train_cfg.get("save_steps", 500),
        save_total_limit=train_cfg.get("save_total_limit", 3),
        fp16=train_cfg.get("fp16", True) and device.type == "cuda",
        bf16=train_cfg.get("bf16", False),
        dataloader_num_workers=train_cfg.get("dataloader_num_workers", 4),
        evaluation_strategy="steps",
        predict_with_generate=True,
        generation_max_length=max_length,
        load_best_model_at_end=True,
        metric_for_best_model="eval_loss",
        greater_is_better=False,
        report_to=report_to,
        run_name=f"nllb-lora-{src_lang}-{tgt_lang}",
    )
    
    # Trainer
    trainer = Seq2SeqTrainer(
        model=model,
        args=training_args,
        train_dataset=train_tokenized,
        eval_dataset=val_tokenized,
        tokenizer=tokenizer,
        data_collator=data_collator,
        compute_metrics=lambda ep: compute_metrics(ep, tokenizer),
        callbacks=[EarlyStoppingCallback(early_stopping_patience=3)],
    )
    
    # Train
    logger.info("Starting training...")
    train_result = trainer.train()
    
    # Save
    logger.info(f"Saving adapter to {output_dir}")
    model.save_pretrained(output_dir)
    tokenizer.save_pretrained(output_dir)
    
    # Save training metrics
    metrics = train_result.metrics
    trainer.log_metrics("train", metrics)
    trainer.save_metrics("train", metrics)
    
    # Evaluate
    logger.info("Running final evaluation...")
    eval_metrics = trainer.evaluate()
    trainer.log_metrics("eval", eval_metrics)
    trainer.save_metrics("eval", eval_metrics)
    
    # Save config
    with open(os.path.join(output_dir, "training_info.json"), "w") as f:
        json.dump({
            "model": model_name,
            "src_lang": src_lang,
            "tgt_lang": tgt_lang,
            "lora_config": lora_cfg,
            "train_samples": len(train_tokenized),
            "val_samples": len(val_tokenized),
            "metrics": eval_metrics,
        }, f, indent=2)
    
    logger.info("Training complete!")
    logger.info(f"Adapter saved to: {output_dir}")
    logger.info(f"Final metrics: {eval_metrics}")


if __name__ == "__main__":
    main()
