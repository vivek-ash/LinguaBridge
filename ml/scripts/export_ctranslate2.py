#!/usr/bin/env python3
"""
LinguaBridge - Export NLLB-200 to CTranslate2 for faster CPU inference.

Usage:
    python export_ctranslate2.py --model facebook/nllb-200-distilled-600M --output ./output/ct2_model
    python export_ctranslate2.py --model facebook/nllb-200-distilled-600M --adapter ./output/lora_adapter --output ./output/ct2_model --quantization int8
"""

import argparse
import logging
import shutil
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def export_model(
    model_name: str,
    output_dir: str,
    adapter_path: str = None,
    quantization: str = "int8",
):
    """Export model to CTranslate2 format."""
    try:
        import ctranslate2
    except ImportError:
        logger.error("ctranslate2 not installed. Run: pip install ctranslate2")
        return
    
    from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
    
    output_path = Path(output_dir)
    output_path.mkdir(parents=True, exist_ok=True)
    
    # If we have a LoRA adapter, merge it first
    if adapter_path:
        logger.info("Merging LoRA adapter with base model...")
        from peft import PeftModel
        import torch
        
        base_model = AutoModelForSeq2SeqLM.from_pretrained(model_name)
        model = PeftModel.from_pretrained(base_model, adapter_path)
        model = model.merge_and_unload()
        
        merged_path = output_path / "merged_model"
        model.save_pretrained(str(merged_path))
        
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        tokenizer.save_pretrained(str(merged_path))
        
        source_model = str(merged_path)
    else:
        source_model = model_name
    
    # Convert to CTranslate2
    logger.info(f"Converting to CTranslate2 with {quantization} quantization...")
    converter = ctranslate2.converters.TransformersConverter(source_model)
    converter.convert(
        str(output_path / "ct2_model"),
        quantization=quantization,
        force=True,
    )
    
    # Copy tokenizer files
    tokenizer = AutoTokenizer.from_pretrained(source_model)
    tokenizer.save_pretrained(str(output_path / "ct2_model"))
    
    # Clean up merged model if it was created
    if adapter_path:
        shutil.rmtree(str(merged_path), ignore_errors=True)
    
    logger.info(f"CTranslate2 model saved to {output_path / 'ct2_model'}")
    logger.info(f"Quantization: {quantization}")
    
    # Test the model
    logger.info("Testing exported model...")
    translator = ctranslate2.Translator(str(output_path / "ct2_model"))
    test_input = tokenizer("Hello, how are you?", return_tensors=None)
    tokens = tokenizer.convert_ids_to_tokens(test_input["input_ids"])
    
    results = translator.translate_batch(
        [tokens],
        target_prefix=[["hin_Deva"]],
        beam_size=5,
    )
    
    output_tokens = results[0].hypotheses[0]
    output_text = tokenizer.decode(
        tokenizer.convert_tokens_to_ids(output_tokens),
        skip_special_tokens=True,
    )
    logger.info(f"Test translation: 'Hello, how are you?' -> '{output_text}'")


def main():
    parser = argparse.ArgumentParser(description="Export NLLB-200 to CTranslate2")
    parser.add_argument("--model", type=str, default="facebook/nllb-200-distilled-600M")
    parser.add_argument("--adapter", type=str, default=None)
    parser.add_argument("--output", type=str, default="./output/ct2_model")
    parser.add_argument("--quantization", type=str, default="int8",
                       choices=["int8", "int16", "float16", "float32"])
    args = parser.parse_args()
    
    export_model(args.model, args.output, args.adapter, args.quantization)


if __name__ == "__main__":
    main()
