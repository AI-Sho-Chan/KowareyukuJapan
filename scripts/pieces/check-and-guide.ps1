param(
  [switch]$OpenDocs
)

$ErrorActionPreference = 'Stop'
$port = 39300

function Write-Info($msg) { Write-Host "[INFO] $msg" -ForegroundColor Cyan }
function Write-Warn($msg) { Write-Host "[WARN] $msg" -ForegroundColor Yellow }
function Write-Ok($msg) { Write-Host "[OK]  $msg" -ForegroundColor Green }

try {
  $test = Test-NetConnection -ComputerName '127.0.0.1' -Port $port -WarningAction SilentlyContinue
  if ($test.TcpTestSucceeded) {
    Write-Ok "Pieces MCP SSE エンドポイント (http://localhost:$port) に接続できました。"
  } else {
    Write-Warn "Pieces OS が起動していないか、ポート $port がリッスンされていません。"
    Write-Info "対処: 'Pieces for Developers' をインストール/起動し、Settings > MCP を有効化してください。"
    if ($OpenDocs) {
      Start-Process "https://docs.pieces.app/products/mcp/cursor"
    }
  }
}
catch {
  Write-Warn "接続確認に失敗しました: $($_.Exception.Message)"
}
