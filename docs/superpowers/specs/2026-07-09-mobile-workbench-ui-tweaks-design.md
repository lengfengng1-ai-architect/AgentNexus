# 移动端工作台 UI 调整设计

## 概述

针对移动端工作台预览页的三项 UI 调整：导航栏移动端按钮右移、对话入口添加快捷键行、简报底部去除提示文本。

## 1. 移动端按钮右移

**文件**: `frontend/src/App.tsx`

将 `NAV` 数组中 `{ key: 'mobile', label: '移动端' }` 从 `intent` 之前挪至之后，使其显示在导航栏最右侧。

```diff
 const NAV = [
   { key: 'chat', label: '对话' },
   { key: 'plan', label: '工作台' },
-  { key: 'mobile', label: '移动端' },
   { key: 'intent', label: '测试', children: [...] },
+  { key: 'mobile', label: '移动端' },
 ]
```

样式不需要改动，现有 header 按钮样式通用。

## 2. 对话入口快捷键行

**文件**: `frontend/src/pages/mobile-workbench/ScreenChat.tsx`、`mobile-workbench.css`

在 `inputbar` 上方新增一行横向文字快捷按钮，包含以下功能：

| 按钮 | 点击行为 | 对应逻辑 |
|------|----------|----------|
| 填写简报 | `onNavigate('brief')` | 跳转简报屏 |
| 语音输入 | 启动 `webkitSpeechRecognition` | 识别结果填入输入框 |
| 附件 | 触发隐藏 `<input type="file">` | 上传文件（MVP 只做选择，实际上传逻辑后续集成） |
| 方案模板 | `setInput('我是 [品牌名]...')` | 填入预设模板文本 |

**样式**：横向 `flex` 行，按钮为圆角小标签样式（`h-7`、`text-[11px]`、灰底/蓝底区分、`gap-2`），允许横向溢出滚动（`overflow-x: auto; scrollbar-width: none`），与移动端现有设计语言一致。

**与 ChatInput 的区分**：PC 端 ChatInput 的浮层面板放在 `+` 按钮弹出，移动端直接展示为可见的一行，降低操作层级。

## 3. 简报底部去除提示文本

**文件**: `frontend/src/pages/mobile-workbench/ScreenBrief.tsx`、`mobile-workbench.css`

删除 `.dock` 区内的 `.hint` 元素，同时调整 `.dock` 样式让按钮居中。

```diff
 <div className="dock">
   <button className="gen">✦ AI 生成方案</button>
-  <div className="hint">基于简报自动拆解 4M+1C 策略与执行</div>
 </div>
```

CSS 调整：`.dock` 改为 `justify-content: center`，原有 `gap: 10px` 保留但已无实际影响。

---

## 影响范围

- `frontend/src/App.tsx` — 一行顺序调整
- `frontend/src/pages/mobile-workbench/ScreenChat.tsx` — 新增快捷键行 + 语音/附件逻辑
- `frontend/src/pages/mobile-workbench/ScreenBrief.tsx` — 删除 hint 行
- `frontend/src/pages/mobile-workbench/mobile-workbench.css` — 新增快捷键行样式 + 调整 dock 样式

均为前端 UI 修改，不涉及后端 API、OpenSpec YAML、mock 数据或测试文件。
