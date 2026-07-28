@echo off
title Stopping RetailPOS Services
echo ===================================================
echo             Stopping RetailPOS Services            
echo ===================================================
echo.

echo Releasing port 3000 (Next.js)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr LISTENING ^| findstr :3000') do (
    echo Terminating PID %%a
    taskkill /f /pid %%a >nul 2>&1
)

echo Releasing port 4000 (NestJS)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr LISTENING ^| findstr :4000') do (
    echo Terminating PID %%a
    taskkill /f /pid %%a >nul 2>&1
)

echo.
echo ✓ All RetailPOS service ports have been released and processes closed!
echo.
timeout /t 3 >nul
