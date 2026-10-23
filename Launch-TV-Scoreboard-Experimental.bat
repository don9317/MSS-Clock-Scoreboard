@echo off
REM Optional: tries to open Display on a TV/second monitor positioned to the RIGHT of the laptop.
set DIR=%~dp0
set EDGE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe
if not exist "%EDGE%" set EDGE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe
if exist "%EDGE%" (
  start "MSS Controller" "%EDGE%" --new-window --window-position=50,50 --window-size=1500,950 "file:///%DIR%controller.html"
  timeout /t 2 /nobreak >nul
  start "MSS Display TV" "%EDGE%" --new-window --window-position=1920,0 --window-size=1280,720 "file:///%DIR%display.html"
) else (
  start "" "controller.html"
  timeout /t 2 /nobreak >nul
  start "" "display.html"
)
