@echo off
setlocal
cd /d "C:\Users\teren\Documents\Zandalee\proxy"

REM ensure venv exists
if not exist ".venv\Scripts\python.exe" (
  py -3 -m venv .venv
  ".venv\Scripts\python.exe" -m pip install --upgrade pip fastapi uvicorn httpx
)

REM start proxy minimized on 11500
start "Zandalee Proxy" /min ".venv\Scripts\python.exe" -m uvicorn ollama_proxy:app --host 127.0.0.1 --port 11500
