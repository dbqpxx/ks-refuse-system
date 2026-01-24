@echo off
cd /d "%~dp0"
echo Starting Local Development Environment...
echo ------------------------------------------
echo NOTE: If you see a PowerShell execution policy error, 
echo please run: Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
echo in a PowerShell window as Administrator.
echo ------------------------------------------
echo Starting Netlify Dev Server (Vite + Functions)...
start npx netlify dev
timeout /t 8
start http://localhost:8888
