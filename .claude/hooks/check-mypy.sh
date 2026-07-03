#!/bin/bash
# .claude/hooks/check-mypy.sh
# PostToolUse hook: run mypy static type check after Python edits.

cd /Users/hxq/Desktop/AgentNexus/backend || exit 0
uv run mypy app/ --no-error-summary --ignore-missing-imports 2>&1
