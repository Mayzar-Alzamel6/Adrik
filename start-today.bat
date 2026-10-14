@echo off
setlocal
title Adrik Omrak (INTJ-A Protocol)
cd /d "%~dp0"
set PORT=3334
set URL=http://localhost:%PORT%
set TARGET_URL=%URL%/app?station=INTJ_PROTOCOL

echo ========================================================
echo   نظام التشغيل السلوكي: أدرك عمرك (بروتوكول INTJ-A)
echo ========================================================
echo.

rem --- 1. Prepare today's journal file in the background ---
if exist "scripts\adrik_cli.py" (
    python scripts\adrik_cli.py today >nul 2>&1
)

rem --- 2. Check if Next.js server is running; if not, start it in background ---
netstat -ano | findstr ":%PORT% " | findstr LISTENING >nul 2>&1
if errorlevel 1 (
    echo جاري تشغيل خادم لوحة التحكم في الخلفية...
    powershell -NoProfile -Command "Start-Process -WindowStyle Hidden -FilePath 'npm.cmd' -ArgumentList 'run','start' -WorkingDirectory '%CD%'"
    for /l %%i in (1,1,30) do (
        timeout /t 1 /nobreak >nul
        netstat -ano | findstr ":%PORT% " | findstr LISTENING >nul 2>&1 && goto open_app
    )
    echo تعذر تشغيل الخادم خلال 30 ثانية.
    goto failed
)

:open_app
echo جاري فتح بروتوكول INTJ في لوحة التحكم...
rem --- 3. Open as a standalone app window directly to INTJ_PROTOCOL ---
if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --new-window --app=%TARGET_URL%
) else if exist "C:\Program Files\Microsoft\Edge\Application\msedge.exe" (
    start "" "C:\Program Files\Microsoft\Edge\Application\msedge.exe" --new-window --app=%TARGET_URL%
) else if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --new-window --app=%TARGET_URL%
) else (
    start "" %TARGET_URL%
)
exit /b 0

:failed
echo.
echo حدث خطأ أثناء تشغيل التطبيق.
pause
exit /b 1
