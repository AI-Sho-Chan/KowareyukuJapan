# Git wrapper to avoid PSReadLine/pager hangs
param(
  [Parameter(ValueFromRemainingArguments=$true)]
  [string[]]$Args
)
$ErrorActionPreference = 'Stop'
try {
  Remove-Module PSReadLine -ErrorAction SilentlyContinue | Out-Null
} catch {}
$env:GIT_PAGER = ''
$env:LESS = 'FRX'
$env:TERM = 'dumb'
$exe = 'git.exe'
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = $exe
$psi.Arguments = [string]::Join(' ', $Args)
$psi.UseShellExecute = $false
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true
$psi.CreateNoWindow = $true
$proc = New-Object System.Diagnostics.Process
$proc.StartInfo = $psi
$null = $proc.Start()
$stdOut = $proc.StandardOutput.ReadToEnd()
$stdErr = $proc.StandardError.ReadToEnd()
$proc.WaitForExit()
if ($stdOut) { [Console]::Out.Write($stdOut) }
if ($stdErr) { [Console]::Error.Write($stdErr) }
exit $proc.ExitCode
