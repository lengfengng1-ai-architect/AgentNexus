# optimize-plan-generator-oneshot — Specs

本 change 不涉及 capability 级别的 REQUIREMENTS 变更:

- **无新增 capability**:`plan_generator` 的输入/输出契约不变,不引入新功能。
- **无修改 capability**:`plan-generation-pipeline` 的 REQUIREMENTS 不变化——`plan_generator` 节点的内部实现优化(9→1 次调用、LLM 输出从 JSON→分隔符文本、`build_chat_model` 单例化)属于实现细节,不改变 spec 层行为。
