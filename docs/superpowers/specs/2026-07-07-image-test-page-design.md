# 图片生成测试工具 — 前端页面设计

## 背景

图片生成 Agent（`image_generation`）后端已实现并测试通过。需要一个前端测试页面，让用户输入 prompt 直接调 Qwen-Image 出图并预览效果，方便快速验证图片生成质量。

## 需求

1. 在顶部导航栏的"测试"下拉菜单中增加"图片测试"入口
2. 页面包含：prompt 输入框、尺寸选择、生成按钮、图片预览区
3. prompt 原样传给 Qwen-Image（不经 LLM 优化）
4. 显示生成的图片，加载中状态，错误提示

## 设计

### 后端

新增直通路由，调用已注册的 `image_generation` Agent。

```
POST /api/v1/image/generate
Content-Type: application/json

{
  "prompt": "用户的提示词",
  "size": "2048*2048"       // 可选，默认 2048*2048
}

Response 200:
{
  "success": true,
  "data": {
    "image_url": "https://...png",
    "width": 2048,
    "height": 2048
  },
  "error": null
}
```

### 前端

新增 `ImageTestPage.tsx`，放在 `frontend/src/pages/`。

页面布局：

```
┌──────────────────────────────────────┐
│  prompt 输入框 (textarea, 5行)        │
│                                      │
│  尺寸下拉: [2048*2048 ▼]   [生成]     │
│                                      │
│  ┌─ 图片预览区域 ──────────────────┐  │
│  │  加载中 / 图片 / 错误信息        │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
```

尺寸选项：

| 值 | 比例 | 说明 |
|----|------|------|
| 2048*2048 | 1:1 | 默认 |
| 2688*1536 | 16:9 | 横版 |
| 1536*2688 | 9:16 | 竖版 |
| 2368*1728 | 4:3 | 通用 |

状态处理：
- 加载中：按钮 disabled + 文字"生成中…"，预览区显示 loading
- 成功：显示图片，URL 可复制
- 失败：显示错误信息

### 涉及文件

| 操作 | 文件路径 |
|------|----------|
| 新增 | `backend/app/routers/image_generation.py` |
| 修改 | `backend/app/main.py` — 注册路由 |
| 新增 | `frontend/src/pages/ImageTestPage.tsx` |
| 修改 | `frontend/src/App.tsx` — 导航和路由 |
