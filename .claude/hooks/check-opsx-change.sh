#!/bin/bash
# .claude/hooks/check-opsx-change.sh
# PreToolUse hook: block code edits when there is no active opsx change.

FILE_PATH="$1"

# Only intercept implementation/spec paths.
case "$FILE_PATH" in
  backend/app/*|backend/tests/*|docs/api/*|frontend/src/*) ;;
  *) exit 0 ;;
esac

# Check for an active local opsx change.
PROJ_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || echo "/Users/hxq/Desktop/AgentNexus")
ACTIVE=$(cd "$PROJ_ROOT" && openspec list --json 2>/dev/null | jq -r '.changes | length')
if [ "$ACTIVE" = "0" ] || [ -z "$ACTIVE" ]; then
  echo "[Guard] 没有活跃的 opsx change，禁止写代码。" >&2
  echo "流程：Step 0 检查 Superpowers skill → Step 1 brainstorming → Step 2 grilling → Step 3 /opsx:explore <想法> → Step 8 /opsx:propose <change-name> → /opsx:apply → 完成 Step 9 编码前强制勾选 → /opsx:archive" >&2
  exit 2
fi

exit 0
