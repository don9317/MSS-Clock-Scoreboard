@echo off
setlocal
set SOURCE=%~dp0
set DEST=C:\MySportSpaceClockScoreboard
echo Installing My Sport Space Clock, Scoreboard & Signage...
if not exist "%DEST%" mkdir "%DEST%"
xcopy "%SOURCE%*" "%DEST%\" /E /I /Y >nul
powershell -NoProfile -ExecutionPolicy Bypass -Command "$desktop=[Environment]::GetFolderPath('Desktop'); $path=Join-Path $desktop 'My Sport Space Clock Scoreboard Signage.lnk'; $WshShell=New-Object -ComObject WScript.Shell; $Shortcut=$WshShell.CreateShortcut($path); $Shortcut.TargetPath='C:\MySportSpaceClockScoreboard\Launch-MSS-Clock-Scoreboard.bat'; $Shortcut.WorkingDirectory='C:\MySportSpaceClockScoreboard'; $Shortcut.IconLocation=$env:SystemRoot + '\System32\SHELL32.dll,220'; $Shortcut.Save()"
echo.
echo Done. Desktop shortcut created: My Sport Space Clock Scoreboard Signage
pause
