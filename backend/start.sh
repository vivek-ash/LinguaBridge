#!/usr/bin/env bash
# Render start script for LinguaBridge backend
set -o errexit

echo "🚀 Starting LinguaBridge backend..."
cd /opt/render/project/src/backend
exec uvicorn app.main:app --host 0.0.0.0 --port $PORT
