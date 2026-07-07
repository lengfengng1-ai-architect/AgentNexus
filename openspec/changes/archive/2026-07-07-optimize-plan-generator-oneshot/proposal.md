## Why

营销方案流水线最后一个节点 `plan_generator` 目前串行调用 9 次 LLM 生成 9 章内容——每次 prompt 都重复塞入 8 个上游节点的完整输出,且每次调用都新建 model 实例。实测该节点耗时约为其他节点的 9 倍,成为流水线尾延迟瓶颈。同时 LogViewer 在串行间隔下逐章静止(15-30s),体感差。

## What Changes

- **plan_generator 由 9 次串行 LLM 调用改为 1 次生成 9 章**:LLM 一次性输出全部 9 章 markdown 内容(以分隔符 @@CH:N@@ 标识章节边界),handler 解析切分后按 `PlanChapter` 契约组装
- **LLM 输出格式从 JSON 改为 Markdown + 分隔符**:JSON 无法流式增量解析移除——改为文本流扫描分隔符,支持分章实时解析
- **handler 改用 `model.astream` 而非 `ainvoke`**:LLM token 流作为 `drain_logs()` 的高频心跳,使章节里程碑日志(`write_log`)近实时发出至 LogViewer
- **`build_chat_model` 单例化**:重复初始化改为缓存单例,减少创建开销
- **Prompt 模板合并**:9 份章节模板合并为 1 份一次性生成模板,废弃 `plan_generator_chapter.md.j2`
- **显式设置 `max_tokens=16384`**:当前配置不设 `max_tokens`,改为显式设置以匹配 DeepSeek V4-Flash 输出上限

**给前端的最终契约不发生变化:** `outputs.plan_generator = {chapters:[{title,subtitle,content}×9]}` 逐字段同构不变,service/前端零改。

## Capabilities

### New Capabilities

无。本次不引入新 capability,只优化已有节点的内部实现。

### Modified Capabilities

无。`plan-generation-pipeline` capability 的 REQUIREMENTS 不发生变化——`plan_generator` 节点的输入/输出契约、SSE 事件序列、workflow 生命周期均不变。

## Impact

- **`backend/app/agents/plan_generator_agent.py`**:handler 重写(astream + 分隔符解析 + `write_log`章节里程碑 + 组装)
- **`backend/app/agents/llm_utils.py`**:**`build_chat_model` 单例化**;新增 astream helper
- **`backend/app/prompt_templates/plan_generator.md.j2`**:改造为一次性生成 + 分隔符协议
- **`backend/app/prompt_templates/plan_generator_chapter.md.j2`**:废弃
- **`backend/app/services/plan_generation_service.py`**:零改
- **frontend**:零改
