---
name: no-auto-push
description: 不要自动推送 git 提交
metadata:
  type: feedback
---

不要自动 push。commit 做完就停，让用户自己决定什么时候推送到远程。

**Why:** 用户明确说"不要你帮我推送"。

**How to apply:** `git commit` 完成后就停，等用户下一步指令。
