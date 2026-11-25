#!/usr/bin/env bash
# Render build script for LinguaBridge backend
set -o errexit

echo "📦 Installing Python dependencies..."
pip install --upgrade pip
pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu
pip install --no-cache-dir -r requirements.txt

echo "📁 Creating required directories..."
mkdir -p uploads exports models_cache

echo "🎙️ Pre-caching lightweight Whisper model for instant video captions..."
python -c "from faster_whisper import download_model; download_model('tiny', output_dir='models_cache/models--Systran--faster-whisper-tiny')" || true

echo "✅ Build complete!"
