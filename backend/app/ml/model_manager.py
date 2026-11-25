"""
Singleton model manager for all ML models used by LinguaBridge.
Handles lazy loading, caching, GPU detection, and graceful degradation.
"""

from __future__ import annotations

import logging
import os
import urllib.request
from pathlib import Path
from threading import Lock
from typing import Any, Optional

logger = logging.getLogger(__name__)

_MODEL_DIR = Path(__file__).resolve().parent.parent.parent / "models_cache"
_FASTTEXT_URL = "https://dl.fbaipublicfiles.com/fasttext/supervised-models/lid.176.bin"
_FASTTEXT_PATH = _MODEL_DIR / "lid.176.bin"


class ModelManager:
    """
    Thread-safe singleton that lazily loads and caches all ML models.

    If a model fails to load the corresponding attribute remains ``None``
    and the app continues with degraded functionality (demo / fallback mode).
    """

    _instance: Optional[ModelManager] = None
    _lock: Lock = Lock()

    # Loaded model handles (None = not yet loaded / failed)
    _nllb_model: Any = None
    _nllb_tokenizer: Any = None
    _whisper_model: Any = None
    _fasttext_model: Any = None

    _device: str = "cpu"
    _nllb_model_name: str = "facebook/nllb-200-distilled-600M"
    _whisper_model_size: str = "base"
    _lora_path: str = ""

    _nllb_loaded: bool = False
    _whisper_loaded: bool = False
    _fasttext_loaded: bool = False

    def __new__(cls) -> ModelManager:
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
        return cls._instance

    # ── Initialisation helpers ───────────────────────────────────────────

    def configure(
        self,
        *,
        device: str = "cpu",
        nllb_model: str = "facebook/nllb-200-distilled-600M",
        whisper_model: str = "base",
        lora_path: str = "",
    ) -> None:
        """Store configuration values (call once on startup)."""
        self._device = device
        self._nllb_model_name = nllb_model
        self._whisper_model_size = whisper_model
        self._lora_path = lora_path
        _MODEL_DIR.mkdir(parents=True, exist_ok=True)
        logger.info(
            "ModelManager configured: device=%s, nllb=%s, whisper=%s, lora=%s",
            device, nllb_model, whisper_model, lora_path or "(none)",
        )

    # ── Properties ───────────────────────────────────────────────────────

    @property
    def device(self) -> str:
        return self._device

    @property
    def nllb_ready(self) -> bool:
        return self._nllb_loaded and self._nllb_model is not None

    @property
    def whisper_ready(self) -> bool:
        return self._whisper_loaded and self._whisper_model is not None

    @property
    def fasttext_ready(self) -> bool:
        return self._fasttext_loaded and self._fasttext_model is not None

    # ── NLLB ─────────────────────────────────────────────────────────────

    def load_nllb(self) -> None:
        """Load the NLLB-200 model + tokenizer (with optional LoRA). Thread-safe and fast offline-first."""
        from app.config import settings
        if not settings.PRELOAD_MODELS:
            logger.info("Cloud-light mode active (PRELOAD_MODELS=false): skipping NLLB load to stay under memory limits.")
            return
        if self._nllb_loaded:
            return
        with self._lock:
            if self._nllb_loaded:
                return
            try:
                from transformers import AutoModelForSeq2SeqLM, AutoTokenizer

                logger.info("Loading NLLB model: %s …", self._nllb_model_name)
                # First try loading with local_files_only=True for instant offline startup without network lag
                try:
                    self._nllb_tokenizer = AutoTokenizer.from_pretrained(
                        self._nllb_model_name,
                        cache_dir=str(_MODEL_DIR),
                        local_files_only=True,
                    )
                    self._nllb_model = AutoModelForSeq2SeqLM.from_pretrained(
                        self._nllb_model_name,
                        cache_dir=str(_MODEL_DIR),
                        local_files_only=True,
                    )
                except Exception as local_err:
                    logger.info("Local offline load failed (%s), loading with cache fallback …", local_err)
                    self._nllb_tokenizer = AutoTokenizer.from_pretrained(
                        self._nllb_model_name,
                        cache_dir=str(_MODEL_DIR),
                    )
                    self._nllb_model = AutoModelForSeq2SeqLM.from_pretrained(
                        self._nllb_model_name,
                        cache_dir=str(_MODEL_DIR),
                    )

                # Optional LoRA adapter
                if self._lora_path and Path(self._lora_path).exists():
                    try:
                        from peft import PeftModel

                        logger.info("Applying LoRA adapter from %s", self._lora_path)
                        self._nllb_model = PeftModel.from_pretrained(
                            self._nllb_model, self._lora_path
                        )
                    except Exception as exc:
                        logger.warning("Failed to load LoRA adapter: %s", exc)

                if self._device == "cuda":
                    self._nllb_model = self._nllb_model.to("cuda")

                self._nllb_model.eval()
                self._nllb_loaded = True
                logger.info("NLLB model loaded successfully on %s.", self._device)

                # Warm up model so the very first user request is instant
                self._warmup_nllb()

            except Exception as exc:
                logger.warning("NLLB model failed to load – translations will use fallback. Error: %s", exc, exc_info=True)
                self._nllb_loaded = False  # allow retry on next request

    def _warmup_nllb(self) -> None:
        """Run a 1-step warmup translation so PyTorch compilation is done before any user request arrives."""
        if not self._nllb_model or not self._nllb_tokenizer:
            return
        try:
            import torch
            self._nllb_tokenizer.src_lang = "eng_Latn"
            inputs = self._nllb_tokenizer("Hello", return_tensors="pt")
            if self._device == "cuda":
                inputs = {k: v.to("cuda") for k, v in inputs.items()}
            tgt_id = self._nllb_tokenizer.convert_tokens_to_ids("hin_Deva")
            with torch.no_grad():
                self._nllb_model.generate(**inputs, forced_bos_token_id=tgt_id, max_new_tokens=4)
            logger.info("NLLB model warmed up and ready for instant translation.")
        except Exception as e:
            logger.debug("NLLB warmup error (non-fatal): %s", e)

    def get_nllb(self) -> tuple[Any, Any]:
        """Return (model, tokenizer) or (None, None) if unavailable."""
        if not self._nllb_loaded:
            self.load_nllb()
        return self._nllb_model, self._nllb_tokenizer

    # ── Whisper (faster-whisper) ─────────────────────────────────────────

    def load_whisper(self) -> None:
        """Load the faster-whisper model."""
        from app.config import settings
        if not settings.PRELOAD_MODELS:
            logger.info("Cloud-light mode active (PRELOAD_MODELS=false): skipping Whisper load to stay under memory limits.")
            return
        if self._whisper_loaded:
            return
        with self._lock:
            if self._whisper_loaded:
                return
            try:
                import av
                _orig_av_open = av.open
                def _safe_av_open(*args, **kwargs):
                    kwargs.pop("metadata_errors", None)
                    return _orig_av_open(*args, **kwargs)
                av.open = _safe_av_open

                from faster_whisper import WhisperModel

                compute_type = "float16" if self._device == "cuda" else "int8"
                logger.info(
                    "Loading Whisper model: size=%s, device=%s, compute=%s …",
                    self._whisper_model_size, self._device, compute_type,
                )
                # Prefer highest-accuracy local model available: medium -> small -> base
                candidates = [
                    _MODEL_DIR / "models--Systran--faster-whisper-medium",
                    _MODEL_DIR / "models--Systran--faster-whisper-small",
                    _MODEL_DIR / "models--Systran--faster-whisper-base",
                ]
                model_source = self._whisper_model_size
                for cand in candidates:
                    if cand.exists() and (cand / "model.bin").exists():
                        model_source = str(cand)
                        logger.info("Found local high-accuracy Whisper model at: %s", cand.name)
                        break

                self._whisper_model = WhisperModel(
                    model_source,
                    device=self._device,
                    compute_type=compute_type,
                    download_root=str(_MODEL_DIR),
                )
                self._whisper_loaded = True
                logger.info("Whisper model loaded successfully.")

            except Exception as exc:
                logger.warning("Whisper model failed to load – speech features unavailable. Error: %s", exc)
                self._whisper_loaded = False

    def get_whisper(self) -> Any:
        """Return the WhisperModel instance or None."""
        if not self._whisper_loaded:
            self.load_whisper()
        return self._whisper_model

    # ── fastText language detection ──────────────────────────────────────

    def load_fasttext(self) -> None:
        """Load fastText lid.176.bin if present."""
        if self._fasttext_loaded:
            return
        try:
            if not _FASTTEXT_PATH.exists():
                logger.info("fastText model file not found at %s – language detection will use script heuristics fallback.", _FASTTEXT_PATH)
                self._fasttext_loaded = True
                return

            import fasttext
            # Suppress fastText warnings about deprecated load_model
            fasttext.FastText.eprint = lambda *a, **kw: None  # type: ignore[attr-defined]
            self._fasttext_model = fasttext.load_model(str(_FASTTEXT_PATH))
            self._fasttext_loaded = True
            logger.info("fastText language-detection model loaded.")

        except Exception as exc:
            logger.warning("fastText model failed to load – detection will use fallback. Error: %s", exc)
            self._fasttext_loaded = True

    def get_fasttext(self) -> Any:
        """Return the fastText model or None."""
        if not self._fasttext_loaded:
            self.load_fasttext()
        return self._fasttext_model

    # ── Bulk preload ─────────────────────────────────────────────────────

    def preload_all(self) -> None:
        """Attempt to preload all models (called during app startup)."""
        logger.info("Pre-loading all ML models …")
        self.load_nllb()
        self.load_whisper()
        self.load_fasttext()
        logger.info(
            "Model pre-load complete. NLLB=%s, Whisper=%s, fastText=%s",
            self.nllb_ready, self.whisper_ready, self.fasttext_ready,
        )

    # ── Teardown ─────────────────────────────────────────────────────────

    def unload_all(self) -> None:
        """Release model references to free memory."""
        self._nllb_model = None
        self._nllb_tokenizer = None
        self._whisper_model = None
        self._fasttext_model = None
        self._nllb_loaded = False
        self._whisper_loaded = False
        self._fasttext_loaded = False
        logger.info("All ML models unloaded.")


# Module-level singleton accessor
model_manager = ModelManager()
