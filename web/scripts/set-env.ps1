# Turso DB環境変数設定スクリプト
Write-Host "Turso DB環境変数を設定中..." -ForegroundColor Green

# 環境変数を設定
$env:TURSO_DB_URL = "libsql://kowareyuku-japan-ai-sho-chan.aws-ap-northeast-1.turso.io"
$env:TURSO_AUTH_TOKEN = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NTYyODQ1NjgsImlkIjoiNTdhMzY2ZDUtMjM5ZS00YThlLTgxNjEtMTRkODhkODhhNjczIiwicmlkIjoiZWU3YzI2OWQtNDdmMS00OGVhLTk5ZDItMzA5ZDE4OTczOWQ3In0.bpsYlhpy4wMhoEgM6cpydcpIRcDaIUBMGMJ9tnEUekMNt3wlS5jIvJXWgJJ4Xj6cmNAnr0bdhpEtdpJspVUfAQ"

Write-Host "環境変数設定完了:" -ForegroundColor Yellow
Write-Host "TURSO_DB_URL: $env:TURSO_DB_URL"
Write-Host "TURSO_AUTH_TOKEN: $($env:TURSO_AUTH_TOKEN.Substring(0, 20))..."

Write-Host ""
Write-Host "データベース初期化を実行しますか？ (y/n)" -ForegroundColor Cyan
$response = Read-Host

if ($response -eq 'y' -or $response -eq 'Y') {
    Write-Host "データベース初期化を開始..." -ForegroundColor Green
    npx tsx src/scripts/init-turso-direct.ts
} else {
    Write-Host "環境変数の設定のみ完了しました。" -ForegroundColor Green
    Write-Host "手動で実行する場合: npx tsx src/scripts/init-turso-direct.ts" -ForegroundColor Yellow
} 
