## Context

当前 `handlePrefillTemplate` 填充的模板文本不包含「产品线」和「目标人群」字段，`parseBriefInput` 解析器也没有对应的正则提取规则。用户点击 ChatBubble「生成方案」后，简报中这两个字段保持默认 mock 数据。

## Goals / Non-Goals

**Goals:**
- 方案模版文本追加产品线和目标人群两个占位符
- parseBriefInput 增加对应正则提取，映射到 product_matrix 和 target_audience

**Non-Goals:**
- 不改动 API / props / 组件结构
- 不改动其他模板（产品海报/产品视频）

## Decisions

改动极小，不做架构性设计。仅修改：
1. ScreenChat.tsx `handlePrefillTemplate` 的模板字符串
2. ScreenBrief.tsx `parseBriefInput` 追加两个正则

新模板格式保持与现有风格一致，字段顺序：品牌 > 品类 > 产品线 > 目标人群 > 城市 > 预算 > 周期。

## Risks / Trade-offs

- 正则匹配依赖占位符文本顺序和标点，改造时如果用户修改模板文本需同步更新正则
