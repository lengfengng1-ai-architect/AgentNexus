## Context

ScreenBrief 的 wk-head（简报上半部分展示区）目前有大量固定字符串：品牌标题后缀"新产品 · 集群营销全功能方案"、元数据区的"150ml 规格 / ¥20 中高端"与表单数据完全无关。当用户通过 ChatBubble 预填表单后，表单数据变了但头部还是 mock 数据，产生割裂。

## Goals / Non-Goals

**Goals:**
- wk-head 的品牌标题动态拼接 `{brand} · {category}`
- wk-head 的副标题直接用 `{productMatrix}`
- wk-head 的元数据区从表单字段获取：`{category}`、预算出自主管营销目标中的预算信息、`{period}`
- "目标人群" select 选项中去掉"一线白领"描述，只保留年龄

**Non-Goals:**
- 不改 wk-head 的 CSS 样式和布局结构
- 不改其他 select 选项

## Decisions

- 元数据的规格/价格原 mock 数据（150ml / ¥20）无对应表单字段，改为显示 `{category}` 和营销目标提取的预算信息
- 目标人群选项逐个修改，只改 "25-35岁 一线白领" → "25-35岁"，其他不动

## Risks / Trade-offs

- 元数据"规格"行现在没有对应的输入字段，改为品类展示。如果用户需要规格输入字段，后续可添加
