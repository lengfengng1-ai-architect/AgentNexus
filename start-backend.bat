@echo off
setlocal enabledelayedexpansion

set PORT=%1
if "%PORT%"=="" set PORT=8000

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

cd /d "%~dp0backend"
echo Starting backend on port %PORT%...
call uv run uvicorn app.main:app --port %PORT% --reload
