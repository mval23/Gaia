@echo off
rem Double-click to stop Gaia. Only needed because "Start Gaia.vbs" runs it hidden,
rem so there is no window left to close.
title Stop Gaia

rem Find whatever holds port 5173 and end it. No -p filter: Vite listens on IPv6.
set "PID="
for /f "tokens=5" %%p in ('netstat -ano ^| findstr /r /c:":5173 .*LISTENING"') do set "PID=%%p"

rem A ping, not timeout, for the beat that lets the line be read: timeout refuses
rem to run when this is called from another script rather than double-clicked.
if not defined PID (
  echo Gaia is not running.
  ping -n 3 127.0.0.1 >nul
  exit /b 0
)

taskkill /pid %PID% /t /f >nul 2>nul
echo Gaia stopped.
ping -n 3 127.0.0.1 >nul
