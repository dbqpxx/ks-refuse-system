@echo off
cd /d "%~dp0"
echo Starting Server...
start npm run dev
timeout /t 5
start http://localhost:5173
