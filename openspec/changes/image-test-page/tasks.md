## 1. 后端 API 路由

- [x] 1.1 新增 `backend/app/routers/image_generation.py`，实现 `POST /api/v1/image/generate`，调用已注册的 `image_generation` Agent，返回图片 URL
- [x] 1.2 在 `backend/app/main.py` 中注册新路由 `app.include_router(image_generation.router, prefix="/api/v1")`

## 2. 前端测试页面

- [x] 2.1 新增 `frontend/src/pages/ImageTestPage.tsx`，包含 prompt 输入框、尺寸下拉、生成按钮、图片预览
- [x] 2.2 修改 `frontend/src/App.tsx`，在「测试」下拉菜单添加「图片测试」入口、路由映射到新页面
