param(
  [Parameter(Mandatory=$true)][int]$Port
)

$ErrorActionPreference = 'Stop'

function Stop-ListeningPort([int]$p){
  $stopped = @()
  try {
    $conns = Get-NetTCPConnection -LocalPort $p -State Listen -ErrorAction Stop
    $procIds = $conns | Select-Object -ExpandProperty OwningProcess -Unique
    foreach($procId in $procIds){
      try { Stop-Process -Id $procId -Force -ErrorAction Stop; $stopped += $procId } catch {}
    }
  } catch {
    $lines = netstat -ano | Select-String ":$p\s" | ForEach-Object { $_.Line }
    foreach($ln in $lines){
      $parts = $ln -split '\s+'
      $procId = $parts[-1]
      if($procId -match '^\d+$'){
        try { Stop-Process -Id [int]$procId -Force -ErrorAction SilentlyContinue; $stopped += [int]$procId } catch {}
      }
    }
  }
  if($stopped.Count -gt 0){
    $unique = $stopped | Sort-Object -Unique
    $joined = ($unique -join ', ')
    Write-Host ("Stopped processes on port {0}: {1}" -f $p, $joined)
  } else {
    Write-Host ("No listening process found on port {0}." -f $p)
  }
}

Stop-ListeningPort -p $Port
