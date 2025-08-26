param()
$ErrorActionPreference = 'SilentlyContinue'
(Get-NetTCPConnection -LocalPort 11500).OwningProcess | ForEach-Object { Get-Process -Id $_ | Stop-Process -Force }
Get-Process | Where-Object { $_.Path -like '*\Zandalee\proxy\*' -or $_.Path -like '*\python.exe' } | 
  Where-Object { $_.MainWindowTitle -like '*uvicorn*' -or $_.Path -like '*\Zandalee\proxy\*' } | Stop-Process -Force
Write-Host '🛑 Zandalee stopped.'
