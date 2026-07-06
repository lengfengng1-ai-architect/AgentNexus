@echo off
setlocal enabledelayedexpansion

set PORT=%1
if "%PORT%"=="" set PORT=8000

REM Kill existing process on the port if any
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%PORT% " ^| findstr LISTENING') do (
    taskkill /F /PID %%a >nul 2>&1
    timeout /t 1 /nobreak >nul
)

cd /d "%~dp0backend"
set LOG_LEVEL=%LOG_LEVEL%
if "%LOG_LEVEL%"=="" set LOG_LEVEL=DEBUG
uv run uvicorn app.main:app --port %PORT% --reload

endlocal
