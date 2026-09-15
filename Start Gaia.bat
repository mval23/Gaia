@echo off
rem Double-click to run Gaia. Installs dependencies on first run, starts the app and opens the browser.
title Gaia
cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Install it from https://nodejs.org and run this again.
  pause
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
    pause
    exit /b 1
  )
)

echo Starting Gaia at http://localhost:5173 - close this window to stop it.
call npm run dev -- --open
pause
