## 1. Prompt 模板

- [x] 1.1 改造 `plan_generator.md.j2` 为一次性生成模板:写入 `PLAN_CHAPTER_SPEC` 9 章标题和说明,规定 LLM 按序输出 Markdown 并用分隔符 `@@CH:N@@` 标记每章边界
- [x] 1.2 确认 LLM 只输出每章 content(不输出 title/subtitle),title/subtitle 由 handler 通过 `PLAN_CHAPTER_SPEC` 固定注入
- [x] 1.3 废弃 `plan_generator_chapter.md.j2`

## 2. LLM 工具层增强

- [x] 2.1 `build_chat_model` 单例化:`functools.lru_cache` 按 provider 组合缓存 model 实例
- [x] 2.2 新增 `stream_chat` 流式辅助函数,返回 `async generator[Token]`,复用单例 model,支持 `max_tokens` 传参
- [x] 2.3 确认 `build_chat_model` 调用处传 `max_tokens=16384`(非默认)

## 3. plan_generator agent 重写

- [x] 3.1 `run_plan_generator(state)` 重写:渲染 1 份 prompt→`model.astream` 流式累积 buffer→扫描分隔符 `@@CH:N@@` 切分 9 段
- [x] 3.2 检测到章节边界 → `write_log("plan_generator", "✓ 第 N 章:{title}")`
- [x] 3.3 检测到第一节 content 开始前 → `write_log("plan_generator", "🤔 策略构思中…")`
- [x] 3.4 结束校验:恰好 9 段 → 组装 `PlanGeneratorOutput(chapters=...).model_dump()` 返回;段数不符 → `raise` 格式错误
- [x] 3.5 保持 `writer` 参数签名不变(供未来 C3 兼容),保持 `StreamWriter | None = None`

## 4. 测试

- [x] 4.1 单测(mock 串流):分隔符切分正确性——模拟流式 token 序列,验证被切为 9 段且 content 正确
- [x] 4.2 单测:恰好 9 段校验——模拟缺章(token 流不足 9 段),验证 `raise`
- [x] 4.3 单测:**handler 返回值与改动前同构**——mock 9 段完整流,验证返回 `PlanGeneratorOutput.chapters` 长度=9、`title/subtitle` 与 `PLAN_CHAPTER_SPEC` 一致、content 非空
- [x] 4.4 单测:章节里程碑 `write_log` 顺序——验证每章解析后 `write_log` 被调用,index 递增
- [x] 4.5 单测:`build_chat_model` 单例——验证同 provider 组合只 init 一次

## 5. Apply 验证

- [x] 5.1 运行已有流水线单测,确认回归通过
- [ ] 5.2 跑通 `graph.astream_events` 验证:handler 内部 `model.astream` 的 token 事件被 `astream_events` 捕获(drain 实时性假设)
- [ ] 5.3 端到端触发一次完整流水线,确认 `outputs.plan_generator` 逐字段同构,LogViewer 实时滚章节里程碑
- [x] 5.4 覆盖率验证 ≥ 80%
