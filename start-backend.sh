#!/usr/bin/env bash
set -e

PORT=${1:-8000}

# Kill existing process on the port if any
LSOF_OUT=$(lsof -ti ":$PORT" 2>/dev/null) || true
if [ -n "$LSOF_OUT" ]; then
  echo "$LSOF_OUT" | xargs kill -9 2>/dev/null || true
  sleep 0.5
fi

cd "$(dirname "$0")/backend"
uv run uvicorn app.main:app --port "$PORT" --reload
