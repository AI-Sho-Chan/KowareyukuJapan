@echo off
echo Turso DB直接初期化を開始...
echo.

echo 環境変数の確認:
echo TURSO_DB_URL: %TURSO_DB_URL%
echo TURSO_AUTH_TOKEN: %TURSO_AUTH_TOKEN%
echo.

if "%TURSO_DB_URL%"=="" (
    echo ERROR: TURSO_DB_URLが設定されていません
    echo Vercelダッシュボードで環境変数を確認してください
    pause
    exit /b 1
)

if "%TURSO_AUTH_TOKEN%"=="" (
    echo ERROR: TURSO_AUTH_TOKENが設定されていません
    echo Vercelダッシュボードで環境変数を確認してください
    pause
    exit /b 1
)

echo Turso DB初期化を実行中...
npx tsx src/scripts/init-turso-direct.ts

if %errorlevel% neq 0 (
    echo ERROR: Turso DB初期化に失敗しました
    pause
    exit /b %errorlevel%
)

echo.
echo ✅ Turso DB初期化が完了しました！
echo 管理画面で投稿が表示されるはずです
pause