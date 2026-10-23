@echo off
set DIR=%~dp0
set EDGE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe
if not exist "%EDGE%" set EDGE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe
if exist "%EDGE%" (
  start "MSS Controller" "%EDGE%" --new-window --window-size=1500,950 "file:///%DIR%controller.html"
  timeout /t 2 /nobreak >nul
  start "MSS Display" "%EDGE%" --new-window --window-size=1280,720 "file:///%DIR%display.html"
) else (
  start "" "controller.html"
  timeout /t 2 /nobreak >nul
  start "" "display.html"
)
