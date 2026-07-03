@echo off
setlocal enabledelayedexpansion

set PORT=%1
if "%PORT%"=="" set PORT=5173

echo Port: %PORT%

REM Kill existing process on the port if any
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%PORT% " ^| findstr LISTENING') do (
    echo Killing process %%a on port %PORT%...
    taskkill /F /PID %%a >nul 2>&1
    if !errorlevel! equ 0 (
        echo Process %%a killed.
    )
    timeout /t 1 /nobreak >nul
)

cd /d "%~dp0frontend"
echo Starting frontend on port %PORT%...
call npm install --no-audit --no-fund
call npm run dev -- --port %PORT%
