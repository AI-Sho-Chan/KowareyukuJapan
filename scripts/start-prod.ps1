param(
  [int]$Port = 3030,
  [switch]$NoKill,
  [switch]$NoBrowser,
  [int]$TimeoutSec = 1200
)

$ErrorActionPreference = 'Stop'

function Ensure-Npm {
  if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
    throw 'npm not found. Please install Node.js or ensure npm.cmd is in PATH.'
  }
}

function Stop-ListeningPort([int]$p){
  try {
    $conns = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction Stop
    $procIds = $conns | Select-Object -ExpandProperty OwningProcess -Unique
    foreach($procId in $procIds){
      try { Stop-Process -Id $procId -Force -ErrorAction Stop; Write-Host ("Killed PID {0} on port {1}" -f $procId, $p) } catch {}
    }
  } catch {
    $lines = netstat -ano | Select-String ":$p\s" | ForEach-Object { $_.Line }
    foreach($ln in $lines){
      $parts = $ln -split '\s+'
      $procId = $parts[-1]
      if($procId -match '^\d+$'){
        try { Stop-Process -Id [int]$procId -Force -ErrorAction SilentlyContinue; Write-Host ("Killed PID {0} on port {1} (netstat)" -f $procId, $p) } catch {}
      }
    }
  }
}

function Wait-ForUrl([string]$url, [int]$timeoutSec){
  $deadline = (Get-Date).AddSeconds($timeoutSec)
  while((Get-Date) -lt $deadline){
    try {
      $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 5
      if($r.StatusCode -ge 200 -and $r.StatusCode -lt 500){ return $true }
    } catch {}
    Start-Sleep -Milliseconds 1000
  }
  return $false
}

$root = Split-Path -Parent $PSScriptRoot
$web = Join-Path $root 'web'
Set-Location $web

Ensure-Npm
if(-not $NoKill){ Stop-ListeningPort -p $Port }

$stamp = Get-Date -Format 'yyyyMMdd_HHmmss'

# This runs: next build && next start -p 3030
$proc = Start-Process -FilePath 'npm.cmd' -ArgumentList 'run','preview' -WorkingDirectory $web -WindowStyle Minimized -PassThru

$url = "http://localhost:$Port"
if(Wait-ForUrl -url $url -timeoutSec $TimeoutSec){
  Write-Host ("Production preview is up at {0} (PID={1})" -f $url, $proc.Id)
  if(-not $NoBrowser){ Start-Process $url }
} else {
  Write-Warning ("Production preview did not respond within {0}s." -f $TimeoutSec)
  exit 1
}
