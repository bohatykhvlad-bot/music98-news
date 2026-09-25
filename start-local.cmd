@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ============================================
echo   music98.news - local server
echo ============================================
echo.
echo   Site:  http://127.0.0.1:43123
echo   Desk:  http://127.0.0.1:43123/admin-desk
echo.
echo   Press Ctrl+C to stop.
echo ============================================
echo.

rem open the private desk in the browser a few seconds after the server boots
start "" /min cmd /c "timeout /t 3 /nobreak >nul & start "" http://127.0.0.1:43123/admin-desk"

python scripts/serve.py

echo.
echo Server stopped.
pause
