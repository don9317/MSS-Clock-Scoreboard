@echo off
REM Launch My Sport Space Clock, Scoreboard & Signage v4
set DIR=%~dp0
set EDGE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe
if not exist "%EDGE%" set EDGE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe

if exist "%EDGE%" (
  start "MSS Controller" "%EDGE%" --new-window "file:///%DIR%controller.html"
  timeout /t 2 /nobreak >nul
  start "MSS Display" "%EDGE%" --new-window "file:///%DIR%display.html"
) else (
  start "" "controller.html"
  timeout /t 2 /nobreak >nul
  start "" "display.html"
)
