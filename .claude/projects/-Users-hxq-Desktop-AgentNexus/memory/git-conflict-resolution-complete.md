---
name: git-conflict-resolution-complete
description: 解决完冲突后禁止继续输出调试信息，直接结束
metadata:
  type: feedback
---

解决完 git 冲突后，提交并推送就结束，不要继续输出无内容的回应或执行额外验证命令。用户看到的是你的输出内容，不是命令行结果。提交推送完表示你完成了，停在那里等用户下一步指令就行。

**Why:** 用户刚刚反馈说"解决了冲突还不断输出啥"——说明我的额外验证输出对用户来说是噪音。

**How to apply:** `git add → git commit -m "merge: ..." → git push` 三步做完后，一条消息告诉用户"已解决并推送"，不再做任何额外操作。
