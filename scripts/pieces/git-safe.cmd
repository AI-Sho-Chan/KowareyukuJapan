@echo off
setlocal
set GIT_PAGER=
set LESS=FRX
set TERM=dumb
"%ProgramFiles%\Git\bin\git.exe" -c core.pager= -c pager.status=false -c pager.diff=false -c pager.log=false -c pager.show=false --no-pager %*
endlocal
