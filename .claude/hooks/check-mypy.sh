#!/bin/bash
# .claude/hooks/check-mypy.sh
# PostToolUse hook: run mypy static type check after Python edits.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJ_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$PROJ_ROOT/backend" || exit 0
uv run mypy app/ --no-error-summary --ignore-missing-imports 2>&1
