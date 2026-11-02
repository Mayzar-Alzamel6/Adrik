@echo off
set PORT=3334
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":%PORT% " ^| findstr LISTENING') do taskkill /F /T /PID %%a >nul 2>&1
echo Adrik Omrak server stopped.
timeout /t 2 /nobreak >nul
