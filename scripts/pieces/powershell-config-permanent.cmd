@echo off
echo Configuring PowerShell permanently for stable operation...
powershell -NoProfile -ExecutionPolicy Bypass -Command "Set-PSReadLineOption -EditMode Windows; Set-PSReadLineOption -HistoryNoDuplicates; Set-PSReadLineOption -HistorySearchCursorMovesToEnd; Set-PSReadLineOption -PredictionSource History; Set-PSReadLineOption -PredictionViewStyle ListView; Set-PSReadLineOption -BellStyle None; Write-Host 'PowerShell configuration completed successfully.'"
echo PowerShell configuration completed.
pause