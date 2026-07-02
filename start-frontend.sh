#!/usr/bin/env bash
set -e

PORT=${1:-5173}

# Kill existing process on the port
lsof -ti ":$PORT" 2>/dev/null | xargs kill -9 2>/dev/null || true
sleep 0.5

cd "$(dirname "$0")/frontend"
npm install --no-audit --no-fund && npm run dev
