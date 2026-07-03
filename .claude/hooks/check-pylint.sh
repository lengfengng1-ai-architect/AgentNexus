#!/bin/bash
# .claude/hooks/check-pylint.sh
# PostToolUse hook: run pylint static analysis after Python edits.

cd /Users/hxq/Desktop/AgentNexus/backend || exit 0
uv run pylint app/ --score=n 2>&1 | grep -E 'E[0-9]{4}|W[0-9]{4}'
