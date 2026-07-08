## MODIFIED Requirements

### Requirement: ImageThumbnail SHALL 正常加载图片

ImageThumbnail 组件 SHALL 确保图片被浏览器正常请求加载，不因 DOM 状态导致请求被抑制。

#### Scenario: 图片加载成功渲染
- **WHEN** ImageThumbnail 接收到有效图片 URL
- **THEN** `<img>` SHALL 发起 HTTP 请求，不因 `display: none` 或 `loading="lazy"` 被抑制
- **AND** 加载完成后渲染图片

#### Scenario: 图片加载失败显示占位
- **WHEN** 图片 URL 不可访问
- **THEN** `<img>` onError SHALL 触发
- **AND** 组件显示"加载失败"占位符

### Requirement: URL 输入 SHALL 使用行级交互

VideoTestPage SHALL 使用独立的 URL 输入行替代多行 textarea。

#### Scenario: 自动追加空行
- **WHEN** 用户输入一个有效的图片 URL
- **THEN** 系统 SHALL 自动在下方追加一个空的 URL 输入框

#### Scenario: 删除 URL 行
- **WHEN** 用户点击某 URL 行的删除按钮
- **THEN** 该行 SHALL 被移除
- **AND** 对应的缩略图 SHALL 消失
