@echo off
REM PSL hourly backup to Google Drive
REM Google Drive for Desktop syncs the output automatically
cd /d "%~dp0..\.."
python backend\scripts\backup_database.py >> backend\scripts\backup_log.txt 2>&1
echo [%DATE% %TIME%] Backup completed with exit code %ERRORLEVEL% >> backend\scripts\backup_log.txt
