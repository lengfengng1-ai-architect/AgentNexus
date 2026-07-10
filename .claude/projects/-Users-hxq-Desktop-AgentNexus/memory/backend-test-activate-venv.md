---
name: backend-test-activate-venv
description: 跑后端测试前先激活虚拟环境再 uv run
metadata:
  type: feedback
---

跑 `uv run pytest` 之前，先 `source .venv/bin/activate` 激活虚拟环境，再执行测试命令。这样 uv 不会额外创建环境，比不激活快很多。

**Why:** 用户观察到直接 `uv run pytest` 在我这里耗时很长，但他本地激活 venv 后很快。虽然 venv 已存在时 uv 不会重新下载依赖，但激活后能跳过 uv 的环境检测进程开销。

**How to apply:** 每次需要跑后端测试时，先 `source /Users/hxq/Desktop/AgentNexus/backend/.venv/bin/activate`，再 `uv run pytest ...`。
