## MODIFIED Requirements

### Requirement: ② 简报屏展示方案头与品牌需求表单

系统 SHALL 在 ② 简报屏展示方案渐变头部 + 品牌需求表单（品牌/品类/产品线/目标人群/营销目标/投放周期/首批城市/核心策略），表单字段预填自设计稿 mock 数据，且所有字段为 controlled state。wk-head 的文案 SHALL 使用表单 state 驱动，不使用固定字符串。

#### Scenario: ② 简报屏的视觉布局
- **WHEN** Tab 切换到 ② 简报
- **THEN** 手机框架内 SHALL 渲染渐变方案头
- **AND** 品牌标题 SHALL 为 `{brand} · {category}`
- **AND** 副标题 SHALL 为 `{productMatrix}`
- **AND** 产品矩阵标签 SHALL 拆分自 `{productMatrix}`
- **AND** 元数据区 SHALL 显示 `{category}` / 预算信息 / `{period}`
- **AND** 方案头下方 SHALL 显示"方案简报"标题
- **AND** 简报表单 SHALL 显示 8 个字段（品牌/品类/产品线/目标人群/营销目标/投放周期/首批城市/核心策略），每个字段预填设计稿的 mock 数据
- **AND** 吸底显示"✦ AI 生成方案"按钮

### Requirement: 目标人群 select 选项只保留年龄

"目标人群" select 字段的选项 SHALL 去掉地域描述，只保留年龄/身份标签。

#### Scenario: 选项列表
- **WHEN** 用户打开目标人群 select
- **THEN** 选项 SHALL 为：`25-35岁`、`运动健身爱好者`、`新中产人群`、`Z 世代`
- **AND** `25-35岁` SHALL 不包含"一线白领"后缀
