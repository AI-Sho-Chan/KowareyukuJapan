Param(
  [string]$OutDir = "docs\screenshots",
  [string[]]$Names
)

New-Item -ItemType Directory -Force $OutDir | Out-Null

Add-Type -AssemblyName System.Drawing

function Get-ClipboardImage {
  try {
    return Get-Clipboard -Format Image -ErrorAction Stop
  } catch {
    return $null
  }
}

$targets = $Names
if (-not $targets -or $targets.Count -eq 0) {
  $targets = @(
    'vercel-deploy-details.png',
    'vercel-404-1.png',
    'vercel-404-2.png'
  )
}

$start = Get-Date
$lastSig = ''
$saved = 0

while ($saved -lt $targets.Count) {
  if ( ((Get-Date) - $start).TotalMinutes -ge 10 ) { break }

  $img = Get-ClipboardImage
  if ($img -ne $null) {
    $ms = New-Object System.IO.MemoryStream
    $img.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $bytes = $ms.ToArray()
    $sha1  = [System.Security.Cryptography.SHA1]::Create()
    $sig = [System.BitConverter]::ToString($sha1.ComputeHash($bytes))

    if ($sig -ne $lastSig) {
      $path = Join-Path $OutDir $targets[$saved]
      $img.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
      $lastSig = $sig
      try { Set-Clipboard -Value '' } catch {}
      Write-Host "Saved: $path"
      $saved++
    }
  }
  Start-Sleep -Milliseconds 500
}

if ($saved -lt $targets.Count) {
  Write-Warning "Timeout before receiving all images. Saved $saved/${($targets.Count)} files."
} else {
  Write-Host "All images saved to $OutDir"
}


