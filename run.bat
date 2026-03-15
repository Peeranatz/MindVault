@echo off
echo ===================================================
echo Starting MindVault-V2
echo ===================================================

echo Starting Backend (FastAPI on port 8001)...
start cmd /k "cd /d %~dp0 && python -m uvicorn backend.main:app --port 8001 --reload"

echo Starting Frontend (Next.js)...
start cmd /k "cd /d %~dp0frontend && npm run dev"

echo Both services are starting up in new windows!
echo Backend API: http://127.0.0.1:8001
echo Frontend URL: http://localhost:3000 (or 3001)
