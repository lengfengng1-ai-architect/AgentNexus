## MODIFIED Requirements

### Requirement: ② 简报屏展示方案头与品牌需求表单

系统 SHALL 在 ② 简报屏展示方案渐变头部 + 品牌需求表单（品牌/品类/产品线/目标人群/营销目标/投放周期/首批城市/核心策略），表单字段预填自外部传入的对话数据（initialInput / initialBrandData），且所有字段为 controlled state。当无外部数据传入时，表单字段使用空字符串默认值。表单字段 state 在外部 props 变化时自动同步更新。

#### Scenario: 从 ChatBubble「生成方案」跳转时自动填充
- **GIVEN** 用户发送消息内容为"我是 阿嬷手作，属于 新中式茶饮，产品线是 现煮手作茶与在地文化联名系列，目标人群 25-35岁注重情绪价值与文化认同的都市女性，想在 成都 做活动，预算 80 万，周期 2 个月"
- **AND** 后端返回的 brandInput 包含 `{ brand_name: "阿嬷手作", category: "新中式茶饮", city: "成都", budget: 80, period: 2 }`
- **WHEN** 用户点击 ChatBubble 的「生成方案」按钮跳转到 ② 简报屏
- **THEN** 品牌字段 SHALL 显示"阿嬷手作"
- **AND** 品类字段 SHALL 显示"新中式茶饮"
- **AND** 产品线字段 SHALL 显示"现煮手作茶与在地文化联名系列"
- **AND** 目标人群字段 SHALL 显示"25-35岁注重情绪价值与文化认同的都市女性"
- **AND** 营销目标字段 SHALL 显示"认知度 ≥80% · 预算 80万"
- **AND** 投放周期字段 SHALL 显示"2 个月（8 周）"
- **AND** 首批城市 chips SHALL 选中"成都"
- **AND** 蓝色头部区域 SHALL 显示"阿嬷手作 · 新中式茶饮" / "现煮手作茶与在地文化联名系列" / "新中式茶饮 · 认知度 ≥80% · 预算 80万 · 2 个月（8 周）"

#### Scenario: 点击 Tab「方案生成」跳转时字段为空
- **WHEN** 用户在对话入口屏点击 Tab「方案生成」从对话入口跳转到 ② 简报
- **THEN** 品牌字段 SHALL 为空字符串
- **AND** 品类字段 SHALL 为空字符串
- **AND** 所有表单字段 SHALL 为空
- **AND** 蓝色头部区域 SHALL 显示空值

#### Scenario: 多次从不同对话消息的「生成方案」跳转后自动更新
- **GIVEN** 第一次通过"我是 阿嬷手作..."跳转 → 简报显示"阿嬷手作"各字段
- **WHEN** 回到对话入口发送"我是 可口可乐，属于 碳酸饮料..."，再次点击「生成方案」
- **THEN** 简报字段 SHALL 自动更新为"可口可乐" / "碳酸饮料"等新值
- **AND** 蓝色头部区域 SHALL 同步更新

### Requirement: ② 简报屏表单为 controlled state 并支持数据提交（修改）

系统 SHALL 使 ScreenBrief 中的所有表单字段为 controlled useState 管理，且当组件因 props 变化重新计算 mergedDefaults 时，自动同步到 useState。

#### Scenario: 外部 props 变化后表单同步更新
- **WHEN** ScreenBrief 的 initialInput 或 initialBrandData props 变化
- **THEN** mergedDefaults SHALL 重新计算
- **AND** 所有表单 useState SHALL 同步更新为 mergedDefaults 的新值
