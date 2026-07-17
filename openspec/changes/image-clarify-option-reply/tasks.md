# Tasks: image-clarify-option-reply

## 1. 模板规则

- [x] 1.1 `intent_recognition.md.j2`：在图片澄清补充规则后追加「序号快捷回复」规则段——触发条件（上一轮图片选项反问 + image_urls）、①②③ 分流映射（含各自 generation_prompt/video_prompt 风格方向）、序号优先于数字字段提取、无效序号回退 clarify

## 2. 测试

- [x] 2.1 `test_intent_recognition.py`：渲染断言——prompt 包含序号分流规则关键文本（①②③ 映射、优先级说明）
- [x] 2.2 `test_intent_recognition.py`：conversation_history 含反问 + message="3" 时，prompt 同时包含上文反问与序号规则

## 3. 验证

- [x] 3.1 既有 intent 测试全绿（caption、澄清分支不回归）
- [x] 3.2 浏览器预览：上传图片 → 收到选项反问 → 输入 "3" → 分流 generate_video 且 video_prompt 预填含主体信息；输入 "1" → text_to_image 电商参数图方向；输入 "4" → clarify 重问
- [x] 3.3 code-reviewer 审查改动文件
