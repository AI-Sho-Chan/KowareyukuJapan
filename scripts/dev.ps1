param(
  [int]$Port = 3000
)

$ErrorActionPreference = 'Stop'

Write-Host "[dev] Checking dependencies..." -ForegroundColor Cyan
$web = Resolve-Path "web"

# Ensure logs folder exists
$logs = Join-Path $web 'logs'
if (!(Test-Path $logs)) { New-Item -ItemType Directory $logs | Out-Null }
$outLog = Join-Path $logs 'dev.out.log'
$errLog = Join-Path $logs 'dev.err.log'
if (Test-Path $outLog) { Remove-Item $outLog -Force }
if (Test-Path $errLog) { Remove-Item $errLog -Force }

if (!(Test-Path "$web\node_modules")) {
  Write-Host "[dev] Installing packages in ./web" -ForegroundColor Yellow
  Push-Location $web
  # Use cmd.exe to ensure npm.cmd is used on Windows
  cmd.exe /c npm.cmd ci
  Pop-Location
}

# Start Next.js using Windows-safe invocation of npm.cmd via cmd.exe
Write-Host "[dev] Starting Next.js (port=$Port) ..." -ForegroundColor Green
$cmdArgs = @('/c', 'set', "PORT=$Port", '&&', 'npm.cmd', 'run', 'dev:patched')
$p = Start-Process -FilePath cmd.exe -ArgumentList $cmdArgs -WorkingDirectory $web -WindowStyle Hidden -PassThru -RedirectStandardOutput $outLog -RedirectStandardError $errLog
Write-Host "[dev] PID=$($p.Id) Logs: $outLog" -ForegroundColor DarkGray

# Wait until health endpoint responds
Write-Host "[dev] Waiting for server readiness (/api/ok) ..." -ForegroundColor Cyan
$max = 90
$ready = $false
for ($i = 0; $i -lt $max; $i++) {
  try {
    $r = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:$Port/api/ok" -TimeoutSec 2
    if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 600) { $ready = $true; break }
  } catch { }
  Start-Sleep -Milliseconds 750
}

if ($ready) {
  Write-Host "[dev] Ready: http://localhost:$Port" -ForegroundColor Green
  Write-Host "[dev] Frontend:  http://localhost:$Port/"
  Write-Host "[dev] Admin UI:  http://localhost:$Port/admin/console"
  # Auto-open both pages
  Start-Process "http://localhost:$Port/" | Out-Null
  Start-Process "http://localhost:$Port/admin/console" | Out-Null
} else {
  Write-Warning "Dev server not responding yet. Tail logs below (last 50 lines):"
  if (Test-Path $outLog) { Get-Content $outLog -Tail 50 }
  if (Test-Path $errLog) { Get-Content $errLog -Tail 50 }
  Write-Host "[dev] You can also open logs at:" -ForegroundColor Yellow
  Write-Host "      $outLog" -ForegroundColor Yellow
  Write-Host "      $errLog" -ForegroundColor Yellow
}
