#!/usr/bin/env python3
"""
Download training and evaluation datasets for LinguaBridge fine-tuning.

Usage:
    python download_data.py --dataset flores200 samanantar --langs en-hi en-pa en-ta en-te en-bn
"""

import argparse
import logging
from pathlib import Path

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

LANG_MAP = {
    "hi": ("eng_Latn", "hin_Deva"),
    "pa": ("eng_Latn", "pan_Guru"),
    "ta": ("eng_Latn", "tam_Taml"),
    "te": ("eng_Latn", "tel_Telu"),
    "bn": ("eng_Latn", "ben_Beng"),
    "mr": ("eng_Latn", "mar_Deva"),
    "gu": ("eng_Latn", "guj_Gujr"),
    "kn": ("eng_Latn", "kan_Knda"),
    "ml": ("eng_Latn", "mal_Mlym"),
    "or": ("eng_Latn", "ory_Orya"),
    "ur": ("eng_Latn", "urd_Arab"),
    "es": ("eng_Latn", "spa_Latn"),
    "fr": ("eng_Latn", "fra_Latn"),
    "de": ("eng_Latn", "deu_Latn"),
    "zh": ("eng_Latn", "zho_Hans"),
    "ja": ("eng_Latn", "jpn_Jpan"),
    "ko": ("eng_Latn", "kor_Hang"),
    "ar": ("eng_Latn", "arb_Arab"),
    "ru": ("eng_Latn", "rus_Cyrl"),
}


def download_flores200(langs: list[str], output_dir: Path):
    """Download FLORES-200 dataset."""
    from datasets import load_dataset
    
    for lang_pair in langs:
        src, tgt = lang_pair.split("-")
        tgt_key = LANG_MAP.get(tgt)
        if not tgt_key:
            logger.warning(f"Unknown language: {tgt}")
            continue
        
        src_code, tgt_code = tgt_key
        logger.info(f"Downloading FLORES-200 for {src_code} - {tgt_code}...")
        
        try:
            for split in ["dev", "devtest"]:
                src_ds = load_dataset("facebook/flores", src_code, split=split)
                tgt_ds = load_dataset("facebook/flores", tgt_code, split=split)
                
                output_file = output_dir / f"flores200_{src_code}_{tgt_code}_{split}.tsv"
                with open(output_file, "w", encoding="utf-8") as f:
                    f.write("source\ttarget\n")
                    for s, t in zip(src_ds["sentence"], tgt_ds["sentence"]):
                        f.write(f"{s}\t{t}\n")
                
                logger.info(f"  Saved {len(src_ds)} pairs to {output_file}")
        except Exception as e:
            logger.error(f"  Failed to download: {e}")


def download_samanantar(langs: list[str], output_dir: Path, max_samples: int = 100000):
    """Download Samanantar dataset."""
    from datasets import load_dataset
    
    for lang_pair in langs:
        src, tgt = lang_pair.split("-")
        
        logger.info(f"Downloading Samanantar for en-{tgt}...")
        try:
            dataset = load_dataset("ai4bharat/samanantar", tgt, split="train")
            if len(dataset) > max_samples:
                dataset = dataset.shuffle(seed=42).select(range(max_samples))
            
            output_file = output_dir / f"samanantar_en_{tgt}.tsv"
            with open(output_file, "w", encoding="utf-8") as f:
                f.write("source\ttarget\n")
                for item in dataset:
                    f.write(f"{item['en']}\t{item[tgt]}\n")
            
            logger.info(f"  Saved {len(dataset)} pairs to {output_file}")
        except Exception as e:
            logger.error(f"  Failed to download: {e}")


def main():
    parser = argparse.ArgumentParser(description="Download training datasets")
    parser.add_argument("--dataset", nargs="+", default=["flores200"],
                       choices=["flores200", "samanantar", "opus"])
    parser.add_argument("--langs", nargs="+", default=["en-hi", "en-pa"])
    parser.add_argument("--output-dir", type=str, default="../data")
    parser.add_argument("--max-samples", type=int, default=100000)
    args = parser.parse_args()
    
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    if "flores200" in args.dataset:
        download_flores200(args.langs, output_dir)
    
    if "samanantar" in args.dataset:
        download_samanantar(args.langs, output_dir, args.max_samples)
    
    logger.info("Download complete!")


if __name__ == "__main__":
    main()
