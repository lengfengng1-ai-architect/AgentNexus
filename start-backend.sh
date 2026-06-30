#!/usr/bin/env bash
set -e

cd "$(dirname "$0")/backend"
uv run python -m app.main
