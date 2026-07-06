@echo off
setlocal enabledelayedexpansion

set PORT=%1
if "%PORT%"=="" set PORT=5173

REM Kill existing process on the port if any
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%PORT% " ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
    timeout /t 1 /nobreak >nul
)

cd /d "%~dp0frontend"
call npm install --no-audit --no-fund
call npm run dev

endlocal
