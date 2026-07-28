@echo off
title Starting RetailPOS Servers
echo ===================================================
echo             Starting RetailPOS Services            
echo ===================================================
echo.

:: 1. Start NestJS Backend
echo Starting Backend Server on port 4000...
start "RetailPOS Backend" /min node backend/dist/main

:: 2. Start Next.js Frontend
echo Starting Frontend Server on port 3000...
start "RetailPOS Frontend" /min npm run start --workspace frontend

echo.
echo Waiting for servers to initialize...
echo (Checking ports 3000 and 4000)

:: Port availability verification loop
:wait_loop
timeout /t 2 /nobreak >nul
netstat -ano | findstr LISTENING | findstr :4000 >nul
if %errorlevel% neq 0 (
    goto wait_loop
)
netstat -ano | findstr LISTENING | findstr :3000 >nul
if %errorlevel% neq 0 (
    goto wait_loop
)

echo.
echo ===================================================
echo             RetailPOS Services Started!            
echo ===================================================
echo.
echo  - Frontend URL : http://localhost:3000
echo  - Backend URL  : http://localhost:4000
echo.
echo Opening default web browser...
start http://localhost:3000
echo.
echo Press any key to stop all services.
pause >nul

:: Terminate on keypress
call stop.bat
