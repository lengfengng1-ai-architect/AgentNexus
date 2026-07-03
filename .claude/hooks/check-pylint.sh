#!/bin/bash
# .claude/hooks/check-pylint.sh
# PostToolUse hook: run pylint static analysis after Python edits.

FILE_PATH="$1"

# Only run for Python files
case "$FILE_PATH" in
  *.py) ;;
  *) exit 0 ;;
esac

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJ_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$PROJ_ROOT/backend" || exit 0
uv run pylint app/ --score=n 2>&1 | grep -E 'E[0-9]{4}|W[0-9]{4}'
