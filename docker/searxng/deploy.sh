#!/usr/bin/env bash
# SearxNG 一键部署脚本（Linux / macOS / Git Bash on Windows）
#
# 用法: ./deploy.sh
# 前置: 已安装 Docker 且 Docker daemon 正在运行。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "==> 检查 Docker..."
if ! command -v docker >/dev/null 2>&1; then
  echo "❌ 未检测到 docker，请先安装 Docker"
  exit 1
fi
if ! docker info >/dev/null 2>&1; then
  echo "❌ Docker 未运行，请先启动 Docker（Docker Desktop / dockerd）"
  exit 1
fi

echo "==> 启动 SearxNG..."
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
exit 1
