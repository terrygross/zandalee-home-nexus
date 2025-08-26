param()
$ErrorActionPreference = 'Stop'
$root  = 'C:\Users\teren\Documents\Zandalee'
$proxy = 'C:\Users\teren\Documents\Zandalee\proxy'
$py    = 'C:\Users\teren\Documents\Zandalee\proxy\.venv\Scripts\python.exe'
$log   = Join-Path $proxy 'proxy.log'

# rotate old log
if (Test-Path $log) {
  Move-Item $log (Join-Path $proxy ('proxy_' + (Get-Date -Format yyyyMMdd_HHmmss) + '.log')) -Force
}

# ensure venv + deps
if (!(Test-Path $py)) {
  Write-Output '[setup] creating venv...'
  py -3 -m venv "$proxy\.venv"
}
& "$py" -m pip install --upgrade pip fastapi uvicorn httpx | Out-File -Append $log

# sanity checks
if (!(Test-Path (Join-Path $proxy 'ollama_proxy.py'))) {
  '❌ Missing ollama_proxy.py in ' + $proxy | Out-File -Append $log
  exit 1
}
if (!(Test-Path (Join-Path $proxy 'salad_config.json'))) {
  '❌ Missing salad_config.json in ' + $proxy | Out-File -Append $log
  exit 1
}

# free port 11500 if taken
$conn = Get-NetTCPConnection -LocalPort 11500 -ErrorAction SilentlyContinue
if ($conn) {
  try { Get-Process -Id ($conn.OwningProcess) | Stop-Process -Force } catch {}
  Start-Sleep -Seconds 1
}

# start proxy minimized and log stdout/stderr
$args = @('-m','uvicorn','ollama_proxy:app','--host','127.0.0.1','--port','11500')
Start-Process -FilePath "$py" -ArgumentList $args -WorkingDirectory "$proxy" `
  -WindowStyle Minimized -RedirectStandardOutput $log -RedirectStandardError $log

# wait up to ~10s for /health
$ok = $false
for ($i=0; $i -lt 10; $i++) {
  try {
    $r = Invoke-WebRequest -UseBasicParsing -TimeoutSec 2 -Uri 'http://127.0.0.1:11500/health'
    if ($r.StatusCode -eq 200) { $ok = $true; break }
  } catch {}
  Start-Sleep -Milliseconds 800
}
if ($ok) { '[ok] proxy listening on http://127.0.0.1:11500' | Out-File -Append $log }
else     { '[warn] health not ready after 10s' | Out-File -Append $log }
