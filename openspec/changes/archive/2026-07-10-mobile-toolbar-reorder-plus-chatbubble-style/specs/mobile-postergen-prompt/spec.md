## ADDED Requirements

### Requirement: 系统 SHALL 提供产品海报 prompt 模板快捷填充

用户点击"产品海报"按钮时，系统 SHALL 将结构化海报 prompt 模板填入输入框。

#### Scenario: 填入海报模板
- **WHEN** 用户点击"产品海报"按钮
- **THEN** 输入框 SHALL 更新为：`帮我生成一张【产品名】的产品海报图片，颜色/材质为【颜色/材质】，背景为【背景】，光线为【光线】`

#### Scenario: 模板可编辑
- **WHEN** 模板填入后用户修改 `【产品名】` 为实际产品名称
- **AND** 用户点击发送
- **THEN** 后端 SHALL 通过 intent recognition 识别为 `text_to_image` 意图
