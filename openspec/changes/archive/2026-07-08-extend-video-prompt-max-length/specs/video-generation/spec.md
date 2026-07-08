## ADDED Requirements

### Requirement: prompt 字段 SHALL 有长度限制

`POST /api/v1/video/generate` 的 `prompt` 字段 SHALL 设置最大长度限制，超出时返回 422 校验错误。

#### Scenario: prompt 超限返回 422
- **WHEN** 用户提交 `POST /api/v1/video/generate`，`prompt` 字符数超过 10000
- **THEN** 系统 SHALL 返回 422 Validation Error
- **AND** 错误信息提示 prompt 超长

#### Scenario: prompt 长度在限制内正常处理
- **WHEN** 用户提交 `POST /api/v1/video/generate`，`prompt` 字符数 ≤ 10000
- **THEN** 系统 SHALL 正常生成视频
- **AND** 响应不受影响
