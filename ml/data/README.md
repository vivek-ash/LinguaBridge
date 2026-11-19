# Data Directory

This directory stores downloaded training and evaluation data.

## Datasets Used

### FLORES-200
- Multilingual benchmark dataset from Meta
- Used for evaluation (devtest split) and supplementary training (dev split)
- ~1,000 sentences per language

### Samanantar
- Largest publicly available parallel corpus for Indian languages
- 49.7M sentence pairs across 11 Indian languages
- We subsample ~100K pairs per language for tractable training

### OPUS (Optional)
- Open parallel corpus collection
- Additional training data for European languages

## File Format
All data files use TSV format:
```
source\ttarget
Hello, how are you?\tनमस्ते, आप कैसे हैं?
```

## Download
Run `python scripts/download_data.py` to download datasets.
