@echo off
setlocal enabledelayedexpansion
echo Checking Turso environment...
if "%TURSO_DB_URL%"=="" (
  echo ERROR: TURSO_DB_URL is not set
  echo Please set TURSO_DB_URL in your environment
  exit /b 1
)
if "%TURSO_AUTH_TOKEN%"=="" (
  echo ERROR: TURSO_AUTH_TOKEN is not set  
  echo Please set TURSO_AUTH_TOKEN in your environment
  exit /b 1
)
echo Environment variables found
echo Initializing Turso database...
npx tsx src/scripts/init-turso-db.ts
if %ERRORLEVEL% NEQ 0 (
  echo Failed to initialize Turso DB
  exit /b 1
)
echo Turso DB initialization completed successfully
endlocal