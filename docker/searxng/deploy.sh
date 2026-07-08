#!/usr/bin/env bash
# SearxNG 一键部署脚本（Linux / macOS / Git Bash on Windows）
#
# 用法:
#   ./deploy.sh               # 代理端口默认 7890
#   ./deploy.sh 7897          # 指定代理端口
#   PROXY_PORT=1080 ./deploy.sh
#
# 前置: 已安装 Docker 且 Docker daemon 正在运行；本机有翻墙代理（用于容器访问外网搜索引擎）。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 代理端口优先级: 命令行参数 > 环境变量 > 默认 7890
PROXY_PORT="${1:-${PROXY_PORT:-7890}}"

echo "==> 检查 Docker..."
if ! command -v docker >/dev/null 2>&1; then
  echo "❌ 未检测到 docker，请先安装 Docker"
  exit 1
fi
if ! docker info >/dev/null 2>&1; then
  echo "❌ Docker 未运行，请先启动 Docker（Docker Desktop / dockerd）"
  exit 1
fi

echo "==> 通过代理端口 ${PROXY_PORT} 启动 SearxNG..."
export PROXY_PORT
docker compose up -d

echo "==> 等待 SearxNG 就绪（最多 40s）..."
for _ in $(seq 1 20); do
  if curl -sf "http://localhost:8080/search?q=healthcheck&format=json" >/dev/null 2>&1; then
    echo "✅ SearxNG 已就绪: http://localhost:8080"
    echo "   验证: curl 'http://localhost:8080/search?q=test&format=json'"
    exit 0
  fi
  sleep 2
done

echo "⚠️  SearxNG 40s 内未响应，请排查:"
echo "   docker logs searxng"
echo "   常见原因: 代理端口不对 / 代理未开启 / 搜索引擎被墙"
exit 1
