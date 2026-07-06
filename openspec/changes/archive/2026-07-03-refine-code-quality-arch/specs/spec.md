# refine-code-quality-arch — Spec 变更

## 无新增或变更的 Requirement

本 Change 全部为内部代码质量重构和清理，不涉及 API 端点、Pydantic schema 字段、业务规则或外部行为的变更。具体范围：

- Agent 内部 node 函数的同步→异步转换（不改变输入输出契约）
- Service 层调用方式从手动 node 调用改为 `astream_events()`（不改变 API 端点响应格式）
- 缓存路径提取到共享模块（不改变路径值）
- 注册名修正（`audience_insight` handler 从只生成画像改为全流程，输出字段不变）
- 依赖清理、死代码删除、文档同步

因此无需新增或修改任何 capability spec。
