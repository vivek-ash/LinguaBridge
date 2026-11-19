#!/usr/bin/env bash
# ============================================================
#  LinguaBridge — One-Command Startup (Linux/macOS)
# ============================================================
set -e

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║          🌐  LinguaBridge  — Starting Up            ║"
echo "║   Real-time Multilingual Translation + Sign Avatar  ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR"

# Check prerequisites
command -v python3 >/dev/null 2>&1 || { echo "[ERROR] Python 3 not found."; exit 1; }
command -v node >/dev/null 2>&1 || { echo "[ERROR] Node.js not found."; exit 1; }

# .env
if [ ! -f .env ]; then
  echo "[INFO] Creating .env from .env.example ..."
  cp .env.example .env
fi

# Backend
echo "[1/4] Installing backend dependencies ..."
cd "$ROOT_DIR/backend"
pip install -q fastapi "uvicorn[standard]" pydantic pydantic-settings sqlalchemy aiosqlite python-multipart python-dotenv aiofiles PyPDF2 python-docx httpx 2>/dev/null || true

echo "[2/4] Seeding demo database ..."
python3 seed_data.py 2>/dev/null || true
echo "       Database ready."

echo "[3/4] Starting backend on http://localhost:8000 ..."
python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!
sleep 2

# Frontend
echo "[4/4] Starting frontend on http://localhost:5173 ..."
cd "$ROOT_DIR/frontend"
[ ! -d node_modules ] && npm install
npm run dev -- --host 0.0.0.0 &
FRONTEND_PID=$!

echo ""
echo "╔══════════════════════════════════════════════════════╗"
echo "║  ✅  LinguaBridge is running!                       ║"
echo "║                                                     ║"
echo "║  Frontend:   http://localhost:5173                  ║"
echo "║  Backend:    http://localhost:8000                  ║"
echo "║  API Docs:   http://localhost:8000/docs             ║"
echo "║                                                     ║"
echo "║  Press Ctrl+C to stop.                              ║"
echo "╚══════════════════════════════════════════════════════╝"
echo ""

# Graceful shutdown
trap "echo 'Shutting down...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM
wait
