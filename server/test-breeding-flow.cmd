@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
node scripts\test-breeding-flow.js
echo.
pause
