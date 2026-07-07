## Why

图片生成 Agent（`image_generation`）后端已完成，需要一个前端测试工具来快速验证 prompt 到出图的链路。方便后续调整 prompt 策略、测试不同尺寸和风格，确认图片生成质量。

## What Changes

- **后端新增路由** `POST /api/v1/image/generate`：接收用户输入的 prompt 和尺寸参数，原样传给 Qwen-Image API，返回图片 URL
- **前端新增页面** "图片测试": 在顶部导航「测试」下拉菜单中新增入口，页面包含 prompt 输入框、尺寸选择、生成按钮和图片预览区
- **导航更新**: `App.tsx` 的「测试」下拉菜单增加「图片测试」选项，路由映射到新页面

## Capabilities

### New Capabilities

无。本 change 仅新增测试工具页面，不涉及业务能力新增。

### Modified Capabilities

无。

## Impact

- `backend/app/routers/image_generation.py` — 新增路由文件
- `backend/app/main.py` — 注册新路由
- `frontend/src/pages/ImageTestPage.tsx` — 新增测试页面
- `frontend/src/App.tsx` — 导航和路由更新
