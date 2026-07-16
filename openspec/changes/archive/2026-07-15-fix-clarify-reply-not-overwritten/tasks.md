## 1. Bugfix

- [x] 1.1 `intent_recognition_agent.py`: 将 `clarify` 从 `INDEPENDENT` 元组中移除
- [x] 1.2 `intent_recognition_agent.py`: 去除 `elif` 分支中 `if not output.reply` 守卫

## 2. 验证

- [x] 2.1 意图测试页输入完整字段的方案文本，确认 intent 为 clarify 时 reply 显示缺失字段反问而非"正在生成…"
- [x] 2.2 正常流程（字段齐全→generate_plan）不受影响
