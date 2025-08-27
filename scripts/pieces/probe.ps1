$ErrorActionPreference = 'Stop'

function Test-Url($url) {
  try {
    $res = Invoke-WebRequest -Uri $url -UseBasicParsing -Method Get -TimeoutSec 5 -ErrorAction Stop
    return @{ ok = $true; code = $res.StatusCode; url = $url }
  } catch {
    return @{ ok = $false; error = $_.Exception.Message; url = $url }
  }
}

$urls = @(
  'http://localhost:39300/model_context_protocol/2024-11-05/sse',
  'http://localhost:39300/model-context-protocol/2024-11-05/sse',
  'http://localhost:39300/sse'
)

$result = @()
foreach ($u in $urls) { $result += ,(Test-Url $u) }

$result | ForEach-Object {
  if ($_.ok) {
    Write-Host ("OK  " + $_.code + "  " + $_.url) -ForegroundColor Green
  } else {
    Write-Host ("NG      " + $_.url + "  -- " + $_.error) -ForegroundColor Yellow
  }
}
