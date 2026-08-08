@echo off
title Pool Sports Leipzig — Backend
echo [%DATE% %TIME%] Starting Pool Sports Leipzig Dashboard...
echo Backend URL: http://localhost:8000
echo.
cd /d "%~dp0backend"
"%~dp0backend\venv\Scripts\python.exe" run.py
echo.
echo [%DATE% %TIME%] Backend stopped or crashed. Press any key to close.
pause > nul
