## MODIFIED Requirements

### Requirement: 📎附件 — 贴图 URL 输入

【更换为文件上传+预览】功能入口从独立按钮移入 ➕ 菜单。点击后不再展示 URL 输入框，改为文件上传区域（点击选择+拖拽），选中文件后在输入框容器内部上沿展示预览条，发送时自动上传到后端获取 URL。

#### Scenario: 点击📎附件后展开文件上传区
- **WHEN** 用户点击面板中的 📎附件
- **THEN** 面板关闭，输入框容器内部上沿展示文件上传区
- **AND** 上传区支持点击选择文件和拖拽文件
- **AND** ➕ 按钮进入高亮态，表示附件已开启

#### Scenario: 上传附件预览
- **WHEN** 用户选择或拖拽文件到上传区
- **THEN** 在输入框容器内部上沿的预览条中展示附件卡片
- **AND** 图片展示缩略图，非图片展示文件名+后缀

#### Scenario: 关闭附件模式后 ➕ 按钮恢复
- **WHEN** 用户再次点击高亮的 ➕ 按钮，或所有附件被删除后
- **THEN** 附件预览条折叠，➕ 按钮恢复正常态

### Requirement: 发送 — 图片 URL 来源变更

`onSend` 的 `imageUrls` 参数来源从 URL 输入框变为：上传文件得到的线上 URL + textarea 中自动提取的图片 URL。

#### Scenario: 发送时合并两种来源的 URL
- **WHEN** 用户点击发送
- **AND** 附件列表中有本地文件 + textarea 中包含 http/https URL
- **THEN** 首先上传全部附件获得线上 URL
- **THEN** 提取 textarea 中的所有 http/https URL
- **THEN** 合并两个列表后调用 `onSend(imageUrls)`

#### Scenario: 仅有 textarea URL 时正常发送
- **WHEN** 用户未选择任何文件
- **AND** textarea 中包含 http/https URL
- **THEN** 直接提取 textarea 中的 URL 传给 `onSend`
- **AND** 不触发文件上传
