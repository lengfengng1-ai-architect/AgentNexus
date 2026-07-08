## 1. Prompt 模板修改

- [x] 1.1 `intent_recognition.md.j2` — 规则 5（text_to_video）增加约束：仅当输入包含具体视频描述（场景/主题/风格）时才触发，否则归为 chat 并反问

- [x] 1.2 `intent_recognition.md.j2` — 规则 6（text_to_image）增加约束：仅当输入包含具体图片描述（场景/主题/风格）时才触发，否则归为 chat 并反问

## 2. 测试

- [x] 2.1 `test_intent_recognition.py` — 新增"我要生成图片"→ chat（反问）测试用例

- [x] 2.2 `test_intent_recognition.py` — 新增"生成视频"→ chat（反问）测试用例

- [x] 2.3 确认已有 text_to_image/text_to_video 正常描述测试仍然通过
