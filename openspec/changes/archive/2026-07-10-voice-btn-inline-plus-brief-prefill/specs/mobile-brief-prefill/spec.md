## ADDED Requirements

### Requirement: 从用户对话文本解析并预填简报表单字段

系统 SHALL 从用户输入文本中按正则提取品牌、品类、城市、预算、周期等信息，用于简报表单预填。

#### Scenario: 正则提取品牌信息
- **GIVEN** 用户输入包含"我是{品牌名}"匹配
- **WHEN** `parseBriefInput(text)` 执行
- **THEN** 返回对象包含 `brand` 字段，值为提取的品牌名
- **AND** 未匹配时 `brand` 为 null

#### Scenario: 正则提取品类
- **GIVEN** 用户输入包含"属于{品类}"匹配
- **WHEN** `parseBriefInput(text)` 执行
- **THEN** 返回对象包含 `productLine` 字段，值为提取的品类

#### Scenario: 正则提取城市
- **GIVEN** 用户输入包含"想在{城市}"匹配
- **WHEN** `parseBriefInput(text)` 执行
- **THEN** 返回对象包含 `cities` 数组字段
- **AND** 多城市格式（"北京上海"/"北京、上海"/"北京,上海"/"北京/上海"）SHALL 正确拆分

#### Scenario: 正则提取预算
- **GIVEN** 用户输入包含"预算{金额}"匹配
- **WHEN** `parseBriefInput(text)` 执行
- **THEN** 返回对象包含 `budget` 字段

#### Scenario: 正则提取周期
- **GIVEN** 用户输入包含"周期{时长}"匹配
- **WHEN** `parseBriefInput(text)` 执行
- **THEN** 返回对象包含 `duration` 字段

#### Scenario: 全部未匹配时返回空对象
- **GIVEN** 用户输入不含任何模板格式
- **WHEN** `parseBriefInput(text)` 执行
- **THEN** 返回空对象 `{}`
