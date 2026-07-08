@echo off
chcp 65001 >nul
REM SearxNG 一键部署脚本（Windows）
REM
REM 用法:
REM   deploy.bat            REM 代理端口默认 7890
REM   deploy.bat 7897       REM 指定代理端口
REM
REM 前置: 已安装 Docker Desktop 且正在运行；本机有翻墙代理（用于容器访问外网搜索引擎）。

cd /d "%~dp0"

REM 代理端口: 命令行参数 > 默认 7890
set PROXY_PORT=7890
if not "%~1"=="" set PROXY_PORT=%~1

echo ==^> 检查 Docker...
where docker >nul 2>&1
if errorlevel 1 (
  echo ❌ 未检测到 docker，请先安装 Docker Desktop
  exit /b 1
)
docker info >nul 2>&1
if errorlevel 1 (
  echo ❌ Docker 未运行，请先启动 Docker Desktop
  exit /b 1
)

echo ==^> 通过代理端口 %PROXY_PORT% 启动 SearxNG...
docker compose up -d
if errorlevel 1 (
  echo ❌ docker compose 启动失败
  exit /b 1
)

echo ==^> 等待 SearxNG 就绪（最多 40s）...
set /a count=0

:waitloop
curl -sf "http://localhost:8080/search?q=healthcheck&format=json" >nul 2>&1
if not errorlevel 1 goto ready
set /a count+=1
if %count% geq 20 goto timeout
timeout /t 2 /nobreak >nul
goto waitloop

:ready
echo ✅ SearxNG 已就绪: http://localhost:8080
echo    验证: curl "http://localhost:8080/search?q=test^&format=json"
exit /b 0

:timeout
echo ⚠️ SearxNG 40s 内未响应，请排查:
echo    docker logs searxng
echo    常见原因: 代理端口不对 / 代理未开启 / 搜索引擎被墙
exit /b 1
