@echo off
setlocal
cd /d "C:\Users\teren\Documents\Zandalee\proxy"

REM ensure venv + deps
if not exist ".venv\Scripts\python.exe" (
  py -3 -m venv .venv
)
".venv\Scripts\python.exe" -m pip install --upgrade pip fastapi uvicorn httpx

echo Starting gateway in DEBUG (window will stay open)...
".venv\Scripts\python.exe" -m uvicorn ollama_proxy:app --host 127.0.0.1 --port 11500
echo.
echo (Copy any error above if it crashes.)
pause
