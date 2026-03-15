@echo off
echo ===================================================
echo   MindVault - Frontend (Next.js)
echo ===================================================
SET PATH=C:\Program Files\nodejs;%PATH%
cd /d "%~dp0frontend"

if not exist node_modules (
    echo node_modules not found. Installing...
    npm install
)

echo Starting Frontend on http://localhost:3000 ...
npm run dev
pause
