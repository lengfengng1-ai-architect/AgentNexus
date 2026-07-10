## MODIFIED Requirements

### Requirement: 快捷按钮行提供可横向滚动的工具栏入口

系统 SHALL 在输入框上方提供可横向滚动的快捷按钮工具栏，当前按钮为「附件上传」「方案模版」「方案生成」「产品海报」「产品视频」，后续可继续增加。

#### Scenario: 工具栏按钮渲染和排序
- **WHEN** ① 对话屏渲染
- **THEN** 输入框上方 SHALL 显示一行可横向滚动的快捷按钮
- **AND** 按钮行 SHALL 可横向滚动（`overflow-x: auto`）
- **AND** 按钮顺序 SHALL 为「附件上传」「方案模版」「方案生成」「产品海报」「产品视频」

### MODIFIED Requirements

### Requirement: "方案生成"按钮 SHALL 纯跳转到②简报屏

点击"方案生成"时，SHALL 仅切换到②简报屏，不传递任何填充数据。

#### Scenario: 点击方案生成纯跳转
- **WHEN** 用户点击"方案生成"按钮
- **THEN** SHALL 调用 `onNavigate('brief')`
- **AND** SHALL 不传递 inputValue
- **AND** SHALL 不传递 brandData
- **AND** ScreenBrief SHALL 使用默认 mock 数据

## ADDED Requirements

### Requirement: "产品海报"按钮填入海报 prompt 模板到输入框

点击"产品海报"时，SHALL 将海报 prompt 模板填入输入框，模板包含产品名、颜色/材质、背景、光线等占位参数。

#### Scenario: 点击产品海报填入模板
- **WHEN** 用户点击"产品海报"按钮
- **THEN** 输入框 SHALL 填入：`帮我生成一张【产品名】的产品海报图片，颜色/材质为【颜色/材质】，背景为【背景】，光线为【光线】`

### Requirement: "产品视频"按钮填入视频 prompt 模板到输入框

点击"产品视频"时，SHALL 将视频 prompt 模板填入输入框，模板包含主体、动作/状态、场景、运镜等占位参数。

#### Scenario: 点击产品视频填入模板
- **WHEN** 用户点击"产品视频"按钮
- **THEN** 输入框 SHALL 填入：`帮我生成一条宣传视频，主体是【主体】，动作/状态是【动作/状态】，场景为【场景】，运镜为【运镜】`
