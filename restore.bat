@echo off
title RetailPOS Database Restore Utility
echo ===================================================
echo             RetailPOS Database Restore             
echo ===================================================
echo.
call node database/restore.js
echo.
pause
