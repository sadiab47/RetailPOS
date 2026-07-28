@echo off
title RetailPOS Database Backup Utility
echo ===================================================
echo             RetailPOS Database Backup              
echo ===================================================
echo.
call node database/backup.js
echo.
pause
