@echo off
REM ============================================================
REM  LinguaBridge — One-Command Startup (Windows)
REM ============================================================
title LinguaBridge
echo.
echo  ╔══════════════════════════════════════════════════════╗
echo  ║          🌐  LinguaBridge  — Starting Up            ║
echo  ║   Real-time Multilingual Translation + Sign Avatar  ║
echo  ╚══════════════════════════════════════════════════════╝
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found. Install Python 3.10+ and add to PATH.
    pause
    exit /b 1
)

REM Check Node
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found. Install Node 18+ and add to PATH.
    pause
    exit /b 1
)

REM Copy .env if needed
if not exist ".env" (
    echo [INFO] Creating .env from .env.example ...
    copy .env.example .env >nul
)

REM Install backend dependencies
echo.
echo [1/4] Installing backend dependencies ...
cd backend
pip install -q fastapi uvicorn[standard] pydantic pydantic-settings sqlalchemy aiosqlite python-multipart python-dotenv aiofiles PyPDF2 python-docx httpx 2>nul
if errorlevel 1 (
    echo [WARN] Some backend packages may not have installed. Continuing...
)

REM Seed database
echo [2/4] Seeding demo database ...
python seed_data.py 2>nul
echo        Database ready.

REM Start backend
echo [3/4] Starting backend on http://localhost:8000 ...
start "LinguaBridge Backend" cmd /k "cd /d %~dp0backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"
timeout /t 3 /nobreak >nul

REM Start frontend
echo [4/4] Starting frontend on http://localhost:5173 ...
cd ..\frontend
if not exist node_modules (
    echo        Installing frontend dependencies (first run) ...
    call npm install
)
start "LinguaBridge Frontend" cmd /k "cd /d %~dp0frontend && npm run dev -- --host 0.0.0.0"

echo.
echo  ╔══════════════════════════════════════════════════════╗
echo  ║  ✅  LinguaBridge is running!                       ║
echo  ║                                                     ║
echo  ║  Frontend:   http://localhost:5173                  ║
echo  ║  Backend:    http://localhost:8000                  ║
echo  ║  API Docs:   http://localhost:8000/docs             ║
echo  ║                                                     ║
echo  ║  Close the terminal windows to stop.                ║
echo  ╚══════════════════════════════════════════════════════╝
echo.
timeout /t 3 /nobreak >nul
start http://localhost:5173
