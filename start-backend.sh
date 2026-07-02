#!/usr/bin/env bash
set -e

cd "$(dirname "$0")/backend"
uv run uvicorn app.main:app --port 8000 --reload
