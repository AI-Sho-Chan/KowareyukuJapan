param(
  [int]$Port = 3000
)

$ErrorActionPreference = 'Stop'

Write-Host "[dev] Checking dependencies..." -ForegroundColor Cyan
$web = Resolve-Path "web"
if (!(Test-Path "$web\node_modules")) {
  Write-Host "[dev] Installing packages in ./web" -ForegroundColor Yellow
  Push-Location $web
  npm ci
  Pop-Location
}

Write-Host "[dev] Starting Next.js dev server on http://localhost:$Port" -ForegroundColor Green
$p = Start-Process -FilePath npm -ArgumentList 'run', 'dev:patched' -WorkingDirectory $web -PassThru
Write-Host "[dev] PID=$($p.Id)"
Write-Host "[dev] Frontend:  http://localhost:$Port/"
Write-Host "[dev] Admin UI:  http://localhost:$Port/admin/console"

