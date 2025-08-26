@echo off
REM kill whatever is listening on port 11500
for /f "tokens=5" %%p in ('netstat -ano ^| find ":11500" ^| find "LISTENING"') do taskkill /PID %%p /F >nul 2>&1
