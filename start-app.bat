@echo off
setlocal
title Adrik Omrak (personal)
cd /d "%~dp0"
set PORT=3334
set URL=http://localhost:%PORT%

rem --- 1. First run: install dependencies ---
if not exist "node_modules" (
    echo Installing dependencies, first run only...
    call npm.cmd install --no-audit --no-fund
    if errorlevel 1 goto failed
)

rem --- 2. Rebuild when the code changed since the last build ---
powershell -NoProfile -Command "$b='.next\BUILD_ID'; if(-not (Test-Path $b)){exit 1}; $t=(Get-Item $b).LastWriteTime; $changed=Get-ChildItem src,public -Recurse -File | Where-Object { $_.LastWriteTime -gt $t } | Select-Object -First 1; if($changed -or (Get-Item tailwind.config.ts,package.json | Where-Object { $_.LastWriteTime -gt $t })){exit 1}; exit 0"
if errorlevel 1 (
    echo Updating the app, this takes about a minute...
    call :stop_server
    call npm.cmd run build
    if errorlevel 1 goto failed
)

rem --- 3. Start the server in the background if it is not running ---
netstat -ano | findstr ":%PORT% " | findstr LISTENING >nul 2>&1
if errorlevel 1 (
    echo Starting server...
    powershell -NoProfile -Command "Start-Process -WindowStyle Hidden -FilePath 'npm.cmd' -ArgumentList 'run','start' -WorkingDirectory '%CD%'"
    for /l %%i in (1,1,30) do (
        timeout /t 1 /nobreak >nul
        netstat -ano | findstr ":%PORT% " | findstr LISTENING >nul 2>&1 && goto open_app
    )
    echo Server did not start within 30 seconds.
    goto failed
)

:open_app
rem --- 4. Open as a standalone app window ---
if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --new-window --app=%URL%/app
) else if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files\Microsoft\Edge\Application\msedge.exe" --new-window --app=%URL%/app
) else if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --new-window --app=%URL%/app
) else (
    start "" %URL%/app
)
exit /b 0

:stop_server
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":%PORT% " ^| findstr LISTENING') do taskkill /F /T /PID %%a >nul 2>&1
exit /b 0

:failed
echo.
echo Something went wrong. Take a screenshot of this window and send it.
pause
exit /b 1
