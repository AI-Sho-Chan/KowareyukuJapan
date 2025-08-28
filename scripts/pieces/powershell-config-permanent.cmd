@echo off
echo Configuring PowerShell settings permanently...
powershell -ExecutionPolicy Bypass -Command "& {
    $profilePath = $PROFILE;
    $profileDir = Split-Path $profilePath;
    if (-not (Test-Path $profileDir)) { New-Item -ItemType Directory -Path $profileDir -Force | Out-Null }
    
    $gitConfig = @'
# Git configuration for stable execution
git config --global core.pager ""
git config --global pager.branch ""
git config --global pager.diff ""
git config --global pager.log ""
git config --global pager.show ""
git config --global advice.statusHints false
'@;

    $psConfig = @'
# PowerShell configuration for stable development
Set-PSReadLineOption -EditMode Windows
Set-PSReadLineOption -HistoryNoDuplicates
Set-PSReadLineOption -HistorySearchCursorMovesToEnd
Set-PSReadLineOption -PredictionSource History
Set-PSReadLineOption -PredictionViewStyle ListView
Set-PSReadLineOption -BellStyle None

# Increase buffer size for long strings
$Host.UI.RawUI.BufferSize = New-Object Management.Automation.Host.Size(200, 3000)
$Host.UI.RawUI.WindowSize = New-Object Management.Automation.Host.Size(120, 30)

# Disable command confirmation for better automation
$ConfirmPreference = 'None'

# Set timeout for long-running commands
$PSSessionOption = New-PSSessionOption -OpenTimeout 30000 -OperationTimeout 30000

# Function to safely set long environment variables
function Set-EnvVar {
    param([string]$Name, [string]$Value)
    try {
        [Environment]::SetEnvironmentVariable($Name, $Value, 'Process')
        Write-Host "Set $Name successfully" -ForegroundColor Green
    } catch {
        Write-Host "Failed to set $Name" -ForegroundColor Red
    }
}
'@;

    if (-not (Get-Content $profilePath -ErrorAction SilentlyContinue | Select-String -Pattern "git config --global core.pager")) {
        Add-Content -Path $profilePath -Value "`n$gitConfig`n";
        Write-Host "Added Git pager settings to PowerShell profile."
    } else {
        Write-Host "Git pager settings already exist in PowerShell profile."
    }
    
    if (-not (Get-Content $profilePath -ErrorAction SilentlyContinue | Select-String -Pattern "Set-PSReadLineOption")) {
        Add-Content -Path $profilePath -Value "`n$psConfig`n";
        Write-Host "Added PowerShell stability settings to profile."
    } else {
        Write-Host "PowerShell stability settings already exist in profile."
    }
    
    Write-Host "Checking and updating PSReadLine module...";
    try {
        Update-Module -Name PSReadLine -Force -ErrorAction Stop;
        Write-Host "PSReadLine module updated successfully."
    } catch {
        Write-Warning "Failed to update PSReadLine module. Error: $($_.Exception.Message)"
    }
    
    Write-Host "PowerShell setup script completed. Please restart your PowerShell session for changes to take effect."
}"
echo PowerShell setup completed for stable development