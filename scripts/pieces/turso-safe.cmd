@echo off
setlocal
set NODE_ENV=production
cd /d "%~dp0..\web"
if not exist "node_modules" (
  echo Installing dependencies...
  npm install
)
echo Running Turso DB initialization...
npx tsx src/scripts/init-turso-db.ts
if %ERRORLEVEL% NEQ 0 (
  echo Failed to initialize Turso DB
  exit /b 1
)
echo Turso DB initialization completed successfully
endlocal