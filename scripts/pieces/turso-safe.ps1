# Turso DB initialization wrapper
$ErrorActionPreference = 'Stop'
try {
  Remove-Module PSReadLine -ErrorAction SilentlyContinue | Out-Null
} catch {}

$env:NODE_ENV = 'production'
Set-Location "$PSScriptRoot\..\web"

if (-not (Test-Path "node_modules")) {
  Write-Output "Installing dependencies..."
  npm install
}

Write-Output "Running Turso DB initialization..."
npx tsx src/scripts/init-turso-db.ts

if ($LASTEXITCODE -ne 0) {
  Write-Error "Failed to initialize Turso DB"
  exit 1
}

Write-Output "Turso DB initialization completed successfully"