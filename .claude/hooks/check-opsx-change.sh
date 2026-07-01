#!/bin/bash
# .claude/hooks/check-opsx-change.sh
# PreToolUse hook: block code edits when there is no active opsx change.

FILE_PATH="$1"

# Only intercept source/spec/convention paths.
case "$FILE_PATH" in
  backend/*|docs/api/*|docs/conventions/*|frontend/*) ;;
  *) exit 0 ;;
esac

# Allow edits inside opsx change artifacts.
case "$FILE_PATH" in
  openspec/*) exit 0 ;;
esac

# Check for an active local opsx change.
ACTIVE=$(cd /Users/hxq/Desktop/AgentNexus && openspec list --json 2>/dev/null | jq -r '.changes | length')
if [ "$ACTIVE" = "0" ] || [ -z "$ACTIVE" ]; then
  echo "[Guard] 没有活跃的 opsx change，禁止写代码。" >&2
  echo "流程：Skill:using-superpowers → Skill:brainstorming（不写 design doc） → /opsx:propose <change-name> → /opsx:apply → /opsx:archive" >&2
  exit 2
fi

exit 0
