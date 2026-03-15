@echo off
echo ===================================================
echo   MindVault - Starting All Services
echo ===================================================

echo [1/2] Starting Backend (FastAPI on port 8001)...
start "MindVault Backend" cmd /k "%~dp0start_backend.bat"

timeout /t 3 /nobreak >nul

echo [2/2] Starting Frontend (Next.js)...
start "MindVault Frontend" cmd /k "%~dp0start_frontend.bat"

echo.
echo Both services are starting in separate windows.
echo.
echo   Backend API : http://localhost:8001
echo   Frontend    : http://localhost:3000
echo   API Docs    : http://localhost:8001/docs
echo.
echo Press any key to close this window...
pause >nul
