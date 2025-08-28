Write-Host "Turso DB直接初期化を開始..." -ForegroundColor Green
Write-Host ""

Write-Host "環境変数の確認:" -ForegroundColor Yellow
Write-Host "TURSO_DB_URL: $env:TURSO_DB_URL"
Write-Host "TURSO_AUTH_TOKEN: $env:TURSO_AUTH_TOKEN"
Write-Host ""

if (-not $env:TURSO_DB_URL) {
    Write-Host "ERROR: TURSO_DB_URLが設定されていません" -ForegroundColor Red
    Write-Host "Vercelダッシュボードで環境変数を確認してください" -ForegroundColor Red
    Read-Host "Enterキーを押して終了"
    exit 1
}

if (-not $env:TURSO_AUTH_TOKEN) {
    Write-Host "ERROR: TURSO_AUTH_TOKENが設定されていません" -ForegroundColor Red
    Write-Host "Vercelダッシュボードで環境変数を確認してください" -ForegroundColor Red
    Read-Host "Enterキーを押して終了"
    exit 1
}

Write-Host "Turso DB初期化を実行中..." -ForegroundColor Yellow
npx tsx src/scripts/init-turso-direct.ts

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Turso DB初期化に失敗しました" -ForegroundColor Red
    Read-Host "Enterキーを押して終了"
    exit $LASTEXITCODE
}

Write-Host ""
Write-Host "✅ Turso DB初期化が完了しました！" -ForegroundColor Green
Write-Host "管理画面で投稿が表示されるはずです" -ForegroundColor Green
Read-Host "Enterキーを押して終了"