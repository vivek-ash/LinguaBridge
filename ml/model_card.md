# Model Card: LinguaBridge NLLB-200 LoRA Adapter

## Model Description

This is a LoRA (Low-Rank Adaptation) fine-tuned version of [facebook/nllb-200-distilled-600M](https://huggingface.co/facebook/nllb-200-distilled-600M) optimized for English ↔ Indian language translation.

### Base Model
- **Name**: NLLB-200 Distilled 600M
- **Architecture**: Transformer encoder-decoder (seq2seq)
- **Parameters**: 615M (base) + ~2M (LoRA adapter)
- **License**: CC-BY-NC 4.0

### Fine-tuning Details
- **Method**: LoRA (Low-Rank Adaptation) via PEFT
- **LoRA Rank (r)**: 16
- **LoRA Alpha**: 32
- **Target Modules**: q_proj, v_proj, k_proj, o_proj, fc1, fc2
- **Trainable Parameters**: ~0.3% of total

## Training Data

| Dataset | Language Pairs | Samples |
|---------|---------------|---------|
| FLORES-200 | en↔hi, en↔pa, en↔ta, en↔te, en↔bn | ~1,000 per pair |
| Samanantar | en↔hi, en↔pa, en↔ta, en↔te, en↔bn | ~100,000 per pair |

## Evaluation Results

Evaluated on FLORES-200 devtest set:

### English → Hindi
| Metric | Base | Fine-tuned | Δ |
|--------|------|------------|---|
| BLEU | - | - | - |
| chrF++ | - | - | - |
| METEOR | - | - | - |

### English → Punjabi
| Metric | Base | Fine-tuned | Δ |
|--------|------|------------|---|
| BLEU | - | - | - |
| chrF++ | - | - | - |
| METEOR | - | - | - |

> **Note**: Fill in actual scores after running `python scripts/evaluate_model.py`

## Training Hyperparameters
- Epochs: 3
- Batch size: 8 (effective: 32 with gradient accumulation)
- Learning rate: 2e-4 (cosine schedule)
- Warmup steps: 500
- Weight decay: 0.01
- FP16: Yes (GPU) / FP32 (CPU)

## Usage

### With LinguaBridge
Set `LORA_ADAPTER_PATH` in `.env` to the adapter directory.

### Standalone
```python
from transformers import AutoModelForSeq2SeqLM, AutoTokenizer
from peft import PeftModel

base_model = AutoModelForSeq2SeqLM.from_pretrained("facebook/nllb-200-distilled-600M")
model = PeftModel.from_pretrained(base_model, "./output/lora_adapter")
tokenizer = AutoTokenizer.from_pretrained("facebook/nllb-200-distilled-600M")

tokenizer.src_lang = "eng_Latn"
inputs = tokenizer("Hello, how are you?", return_tensors="pt")
translated = model.generate(**inputs, forced_bos_token_id=tokenizer.convert_tokens_to_ids("hin_Deva"))
print(tokenizer.decode(translated[0], skip_special_tokens=True))
```

## Limitations
- Fine-tuned primarily on English ↔ Indian languages; other pairs use base model performance
- Domain-general; may not perform well on specialized terminology without glossary
- Maximum sequence length: 256 tokens
- Quality depends heavily on training data quality and size

## Ethical Considerations
- Translation errors may occur, especially for nuanced or culturally specific content
- Not suitable for critical/legal translation without human review
- Sign language interpretation is AI-generated and should not be treated as professional interpretation
- May exhibit biases present in training data

## Citation
```bibtex
@misc{linguabridge2024,
  title={LinguaBridge: Real-time Multilingual Translation with AI Sign Language},
  author={LinguaBridge Team},
  year={2024},
}
```
