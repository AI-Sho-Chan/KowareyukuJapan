$ErrorActionPreference = 'Stop'
$taskName = 'PiecesMCP-CheckOnLogin'
$script = Join-Path $PSScriptRoot '..\pieces\check-and-guide.ps1'
$script = [IO.Path]::GetFullPath($script)

if (-not (Test-Path $script)) {
  Write-Error "依存スクリプトが見つかりません: $script"
}

$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$script`" -OpenDocs"
$trigger = New-ScheduledTaskTrigger -AtLogOn
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERNAME" -RunLevel LeastPrivilege

try {
  if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $taskName -Confirm:$false | Out-Null
  }
  Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal | Out-Null
  Write-Host "スケジュールタスクを登録しました: $taskName"
}
catch {
  Write-Error "登録に失敗しました: $($_.Exception.Message)"
}
