#!/usr/bin/env bash
set -e

PORT=${1:-8000}

# Kill existing process on the port
lsof -ti ":$PORT" 2>/dev/null | xargs kill -9 2>/dev/null || true
sleep 0.5

cd "$(dirname "$0")/backend"
uv run uvicorn app.main:app --port "$PORT" --reload
