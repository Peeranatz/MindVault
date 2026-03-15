@echo off
echo ===================================================
echo   MindVault - Backend (FastAPI)
echo ===================================================
cd /d "%~dp0"

if not exist backend\venv\Scripts\python.exe (
    echo ERROR: venv not found. Please run setup first:
    echo   cd backend
    echo   python -m venv venv
    echo   venv\Scripts\pip install -r requirements.txt
    pause
    exit /b 1
)

if not exist backend\.env (
    echo WARNING: .env file not found!
    echo Please create backend\.env with your GEMINI_API_KEY
    echo Example: GEMINI_API_KEY=your_key_here
    pause
    exit /b 1
)

echo Starting Backend on http://localhost:8001 ...
backend\venv\Scripts\python.exe -m uvicorn backend.main:app --port 8001 --reload
pause
