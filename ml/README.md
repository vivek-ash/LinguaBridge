# ML Pipeline - LinguaBridge

This folder contains scripts and notebooks for fine-tuning NLLB-200 on domain-specific data,
evaluating translation quality, and exporting optimized models.

## Structure

```
ml/
├── scripts/
│   ├── finetune_nllb.py      # LoRA fine-tuning script
│   ├── evaluate_model.py      # BLEU/chrF++/METEOR evaluation
│   ├── export_ctranslate2.py  # Convert to CTranslate2 for fast CPU inference
│   └── download_data.py       # Download training datasets
├── notebooks/
│   └── finetune_nllb_colab.ipynb  # Colab/Kaggle-friendly notebook
├── data/
│   └── README.md              # Data documentation
├── configs/
│   └── training_config.yaml   # Training hyperparameters
└── model_card.md              # Model card with results
```

## Quick Start

### 1. Download Data
```bash
python scripts/download_data.py --dataset flores200 samanantar --langs en-hi en-pa en-ta en-te en-bn
```

### 2. Fine-tune with LoRA
```bash
python scripts/finetune_nllb.py --config configs/training_config.yaml
```

### 3. Evaluate
```bash
python scripts/evaluate_model.py --model-path ./output/lora_adapter --test-data ./data/flores200_test.tsv
```

### 4. Export (Optional)
```bash
python scripts/export_ctranslate2.py --model-path ./output/lora_adapter --output ./output/ct2_model --quantization int8
```

## Requirements
All requirements are in the main `backend/requirements.txt`. Additional ML-specific:
```
peft>=0.7.0
datasets>=2.15.0
accelerate>=0.25.0
bitsandbytes>=0.41.0
wandb>=0.16.0
mlflow>=2.9.0
sacrebleu>=2.3.0
evaluate>=0.4.0
```
