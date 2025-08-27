# PowerShell setup for stable development
$ErrorActionPreference = 'Stop'

# Disable PSReadLine to prevent hangs
try {
  Remove-Module PSReadLine -ErrorAction SilentlyContinue | Out-Null
  Write-Output "PSReadLine disabled"
} catch {}

# Set git config for stability
git config --global core.pager ""
git config --global pager.status false
git config --global pager.diff false
git config --global pager.log false
git config --global pager.show false
git config --global advice.statusHints false

Write-Output "PowerShell setup completed for stable development"