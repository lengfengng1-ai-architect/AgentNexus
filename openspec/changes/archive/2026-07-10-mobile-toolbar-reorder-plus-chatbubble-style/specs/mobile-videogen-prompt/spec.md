## ADDED Requirements

### Requirement: 系统 SHALL 提供产品视频 prompt 模板快捷填充

用户点击"产品视频"按钮时，系统 SHALL 将结构化视频 prompt 模板填入输入框。

#### Scenario: 填入视频模板
- **WHEN** 用户点击"产品视频"按钮
- **THEN** 输入框 SHALL 更新为：`帮我生成一条宣传视频，主体是【主体】，动作/状态是【动作/状态】，场景为【场景】，运镜为【运镜】`

#### Scenario: 模板可编辑后发送触发视频意图
- **WHEN** 模板填入后用户修改 `【主体】` 为实际主体
- **AND** 用户点击发送
- **THEN** 后端 SHALL 通过 intent recognition 识别为 `text_to_video` 意图
