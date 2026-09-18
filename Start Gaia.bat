@echo off
rem Double-click to run Gaia. Installs dependencies on first run, starts the app and opens the browser.
rem "Start Gaia.vbs" passes --hidden to run this with no console window; then there
rem is nothing to read and nobody to press a key, so problems go to a dialog instead.
title Gaia
cd /d "%~dp0"

set "HIDDEN="
if /i "%~1"=="--hidden" set "HIDDEN=1"

where npm >nul 2>nul
if errorlevel 1 (
  call :report "Node.js is not installed. Install it from https://nodejs.org and start Gaia again."
  exit /b 1
)

rem If Gaia is already running, just open it.
curl -s -o nul http://localhost:5173 >nul 2>nul
if not errorlevel 1 (
  start "" http://localhost:5173
  exit /b 0
)

if not exist node_modules (
  echo Installing Gaia's dependencies ^(first run only^)...
  call npm install
  if errorlevel 1 (
    call :report "Gaia could not install what it needs. Open a terminal in the Gaia folder and run npm install to see why."
    exit /b 1
  )
)

echo Starting Gaia at http://localhost:5173 - close this window to stop it.
call npm run dev -- --open
if not defined HIDDEN pause
exit /b 0

rem Say something went wrong, in whichever way the person can actually see.
:report
if defined HIDDEN (
  mshta "javascript:alert('%~1');close()"
) else (
  echo %~1
  pause
)
exit /b 0
