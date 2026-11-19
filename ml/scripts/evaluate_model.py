#!/usr/bin/env python3
"""
LinguaBridge - Model Evaluation Script

Evaluates NLLB-200 (base or fine-tuned) on FLORES-200 devtest set
with BLEU, chrF++, and METEOR metrics.

Usage:
    python evaluate_model.py --model facebook/nllb-200-distilled-600M --src eng_Latn --tgt hin_Deva
    python evaluate_model.py --model facebook/nllb-200-distilled-600M --adapter ./output/lora_adapter --src eng_Latn --tgt hin_Deva
"""

import argparse
import json
import logging
import time
from pathlib import Path

import torch
import numpy as np
from datasets import load_dataset
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
from peft import PeftModel
import evaluate
from tqdm import tqdm

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def load_model(model_name: str, adapter_path: str = None):
    """Load base model with optional LoRA adapter."""
    device = "cuda" if torch.cuda.is_available() else "cpu"
    dtype = torch.float16 if device == "cuda" else torch.float32
    
    logger.info(f"Loading model: {model_name}")
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForSeq2SeqLM.from_pretrained(model_name, torch_dtype=dtype)
    
    if adapter_path:
        logger.info(f"Loading LoRA adapter: {adapter_path}")
        model = PeftModel.from_pretrained(model, adapter_path)
        model = model.merge_and_unload()
    
    model = model.to(device)
    model.eval()
    return model, tokenizer, device


def translate_batch(
    texts: list[str],
    model,
    tokenizer,
    src_lang: str,
    tgt_lang: str,
    device: str,
    max_length: int = 256,
    num_beams: int = 5,
    batch_size: int = 32,
) -> list[str]:
    """Translate a batch of texts."""
    tokenizer.src_lang = src_lang
    all_translations = []
    
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        inputs = tokenizer(
            batch,
            return_tensors="pt",
            padding=True,
            truncation=True,
            max_length=max_length,
        ).to(device)
        
        tgt_lang_id = tokenizer.convert_tokens_to_ids(tgt_lang)
        
        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                forced_bos_token_id=tgt_lang_id,
                max_new_tokens=max_length,
                num_beams=num_beams,
            )
        
        translations = tokenizer.batch_decode(outputs, skip_special_tokens=True)
        all_translations.extend(translations)
    
    return all_translations


def evaluate_model(
    model,
    tokenizer,
    device: str,
    src_lang: str,
    tgt_lang: str,
    test_sources: list[str],
    test_references: list[str],
    num_beams: int = 5,
) -> dict:
    """Evaluate model with BLEU, chrF++, METEOR."""
    logger.info(f"Evaluating on {len(test_sources)} samples...")
    
    start_time = time.time()
    predictions = translate_batch(
        test_sources, model, tokenizer, src_lang, tgt_lang, device, num_beams=num_beams
    )
    total_time = time.time() - start_time
    
    # Compute metrics
    bleu_metric = evaluate.load("sacrebleu")
    chrf_metric = evaluate.load("chrf")
    meteor_metric = evaluate.load("meteor")
    
    references_wrapped = [[ref] for ref in test_references]
    
    bleu_result = bleu_metric.compute(predictions=predictions, references=references_wrapped)
    chrf_result = chrf_metric.compute(predictions=predictions, references=references_wrapped, word_order=2)
    meteor_result = meteor_metric.compute(predictions=predictions, references=test_references)
    
    results = {
        "bleu": round(bleu_result["score"], 2),
        "chrf++": round(chrf_result["score"], 2),
        "meteor": round(meteor_result["meteor"] * 100, 2),
        "num_samples": len(test_sources),
        "total_time_s": round(total_time, 2),
        "avg_time_per_sample_ms": round(total_time / len(test_sources) * 1000, 2),
    }
    
    # Sample translations
    samples = []
    for i in range(min(5, len(predictions))):
        samples.append({
            "source": test_sources[i],
            "reference": test_references[i],
            "prediction": predictions[i],
        })
    results["samples"] = samples
    
    return results


def load_test_data(src_lang: str, tgt_lang: str) -> tuple[list[str], list[str]]:
    """Load FLORES-200 devtest data."""
    try:
        src_ds = load_dataset("facebook/flores", src_lang, split="devtest")
        tgt_ds = load_dataset("facebook/flores", tgt_lang, split="devtest")
        return src_ds["sentence"], tgt_ds["sentence"]
    except Exception as e:
        logger.warning(f"Could not load FLORES-200 devtest: {e}")
        # Fallback demo data
        return (
            ["Hello, how are you?", "The weather is nice today."],
            ["नमस्ते, आप कैसे हैं?", "आज मौसम अच्छा है।"],
        )


def main():
    parser = argparse.ArgumentParser(description="Evaluate NLLB-200 translation model")
    parser.add_argument("--model", type=str, default="facebook/nllb-200-distilled-600M")
    parser.add_argument("--adapter", type=str, default=None, help="Path to LoRA adapter")
    parser.add_argument("--src", type=str, default="eng_Latn")
    parser.add_argument("--tgt", type=str, default="hin_Deva")
    parser.add_argument("--num-beams", type=int, default=5)
    parser.add_argument("--output", type=str, default=None, help="Output JSON file path")
    parser.add_argument("--compare", type=str, default=None, help="Path to adapter to compare against base")
    args = parser.parse_args()
    
    results = {}
    
    # Evaluate base model
    model, tokenizer, device = load_model(args.model)
    sources, references = load_test_data(args.src, args.tgt)
    
    logger.info("=== Evaluating Base Model ===")
    base_results = evaluate_model(
        model, tokenizer, device, args.src, args.tgt,
        sources, references, args.num_beams
    )
    results["base"] = base_results
    
    logger.info(f"Base BLEU: {base_results['bleu']}")
    logger.info(f"Base chrF++: {base_results['chrf++']}")
    logger.info(f"Base METEOR: {base_results['meteor']}")
    
    # Evaluate fine-tuned model if adapter provided
    adapter_path = args.adapter or args.compare
    if adapter_path:
        del model
        torch.cuda.empty_cache() if torch.cuda.is_available() else None
        
        model, tokenizer, device = load_model(args.model, adapter_path)
        
        logger.info("=== Evaluating Fine-tuned Model ===")
        ft_results = evaluate_model(
            model, tokenizer, device, args.src, args.tgt,
            sources, references, args.num_beams
        )
        results["finetuned"] = ft_results
        
        logger.info(f"Fine-tuned BLEU: {ft_results['bleu']}")
        logger.info(f"Fine-tuned chrF++: {ft_results['chrf++']}")
        logger.info(f"Fine-tuned METEOR: {ft_results['meteor']}")
        
        # Improvement
        logger.info("\n=== Improvements ===")
        for metric in ["bleu", "chrf++", "meteor"]:
            diff = ft_results[metric] - base_results[metric]
            logger.info(f"{metric}: {diff:+.2f} ({base_results[metric]:.2f} -> {ft_results[metric]:.2f})")
    
    # Save results
    output_path = args.output or f"eval_results_{args.src}_{args.tgt}.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    logger.info(f"\nResults saved to {output_path}")


if __name__ == "__main__":
    main()
