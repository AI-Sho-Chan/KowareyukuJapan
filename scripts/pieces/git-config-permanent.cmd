@echo off
echo Configuring Git permanently for stable operation...
git config --global core.pager ""
git config --global pager.branch ""
git config --global pager.diff ""
git config --global pager.log ""
git config --global pager.show ""
git config --global advice.statusHints false
git config --global init.defaultBranch main
git config --global pull.rebase false
echo Git configuration completed successfully.
pause