# 移动端工作台 UI 调整实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 三项移动端 UI 调整：导航按钮右移、对话入口添加快捷键行、简报底部去提示文本

**Architecture:** 纯前端 UI 修改，不涉及后端/API/数据层。三项调整互不依赖，可独立实施。

**Tech Stack:** React 18, TypeScript, CSS

**影响文件:**
- `frontend/src/App.tsx` — 顺序调整 1 行
- `frontend/src/pages/mobile-workbench/ScreenChat.tsx` — 新增快捷键行
- `frontend/src/pages/mobile-workbench/ScreenBrief.tsx` — 删除 hint 元素
- `frontend/src/pages/mobile-workbench/mobile-workbench.css` — 新增快捷键行样式 + 调整 dock 样式

---

### Task 1: 移动端按钮右移

**Files:**
- Modify: `frontend/src/App.tsx:24-37`

**Interfaces:**
- 无，纯 DOM/样式改动

- [ ] **Step 1: 将 `mobile` 条目移到 `intent`（测试下拉）之后**

```diff
 const NAV: { key: Page; label: string; children?: { key: string; label: string }[] }[] = [
   { key: 'chat', label: '对话' },
   { key: 'plan', label: '工作台' },
-  { key: 'mobile', label: '移动端' },
   {
     key: 'intent',
     label: '测试',
     children: [
       { key: 'intent', label: '意图识别' },
       { key: 'image', label: '图片生成' },
       { key: 'video', label: '视频生成' },
     ],
   },
+  { key: 'mobile', label: '移动端' },
 ]
```

- [ ] **Step 2: 启动前端预览确认**

启 frontend dev server，切换到移动端页面，确认导航栏顺序变为：**对话 → 工作台 → 测试 ▼ → 移动端**。

```bash
cd frontend && npm run dev
```

- [ ] **Step 3: 提交**

```bash
git add frontend/src/App.tsx
git commit -m "fix(mobile): 移动端导航按钮移至最右侧"
```

---

### Task 2: 对话入口添加快捷键行

**Files:**
- Modify: `frontend/src/pages/mobile-workbench/ScreenChat.tsx`
- Modify: `frontend/src/pages/mobile-workbench/mobile-workbench.css`

**Interfaces:**
- 新增 `fileInputRef: RefObject<HTMLInputElement>` 在 `ScreenChat` 函数内
- 新增快捷键行 JSX 片段，位于 `.chat` 和 `.inputbar` 之间

- [ ] **Step 1: 在 `ScreenChat.tsx` 新增快捷键行**

在 `ScreenChat` 组件的 `.chat` div 后面、`.inputbar` div 前面插入快捷键行：

```tsx
      {/* ── 快捷键行 ── */}
      <div className="quick-btns">
        <button className="qb" onClick={() => onNavigate('brief')}>
          填写简报
        </button>
        <button className="qb voice" onClick={handleVoice}>
          语音输入
        </button>
        <button className="qb" onClick={() => fileInputRef.current?.click()}>
          附件
        </button>
        <button className="qb" onClick={handlePrefillTemplate}>
          方案模板
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />
```

在 `ScreenChat` 函数体头部添加 ref 和辅助函数：

```tsx
import { useEffect, useRef, useState } from 'react'
```

`fileInputRef`、`handleVoice`、`handlePrefillTemplate`、`handleFileSelect` 四个变量需要新增。修改后完整函数体：

```diff
 export function ScreenChat({ onNavigate }: { onNavigate: (s: MobileScreen) => void }) {
   const [messages, setMessages] = useState<Msg[]>(() => INITIAL.map(m => ({ ...m })))
   const [input, setInput] = useState('')
   const bottomRef = useRef<HTMLDivElement>(null)
+  const fileInputRef = useRef<HTMLInputElement>(null)
+  const [isListening, setIsListening] = useState(false)
+  const recognitionRef = useRef<SpeechRecognition | null>(null)
 
   useEffect(() => {
     bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
   }, [messages])
 
+  const handleVoice = () => {
+    const API: new () => SpeechRecognition =
+      (window as unknown as { SpeechRecognition: new () => SpeechRecognition }).SpeechRecognition ??
+      (window as unknown as { webkitSpeechRecognition: new () => SpeechRecognition }).webkitSpeechRecognition
+    if (!API) return
+    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return }
+    const recognition = new API()
+    recognition.lang = 'zh-CN'
+    recognition.continuous = true
+    recognition.interimResults = true
+    recognition.onresult = (event: SpeechRecognitionEvent) => {
+      let finalText = ''
+      for (let i = event.resultIndex; i < event.results.length; i++) {
+        if (event.results[i].isFinal) finalText += event.results[i][0].transcript
+      }
+      if (finalText) setInput(prev => prev + (prev ? ' ' : '') + finalText)
+    }
+    recognition.onend = () => setIsListening(false)
+    recognition.onerror = () => setIsListening(false)
+    recognition.start()
+    recognitionRef.current = recognition
+    setIsListening(true)
+  }
+
+  const handlePrefillTemplate = () => {
+    setInput('我是 [品牌名]，属于 [品类]，想在 [城市] 做活动，预算 [金额] 万，周期 [时长] 个月')
+  }
+
+  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
+    // MVP: 仅选中文件，实际上传逻辑后续集成
+    const files = e.target.files
+    if (files && files.length > 0) {
+      console.log('Selected files:', Array.from(files).map(f => f.name).join(', '))
+    }
+    e.target.value = ''
+  }
+
   const send = () => {
     const v = input.trim()
     if (!v) return
```

- [ ] **Step 2: 在 CSS 新增快捷键行样式**

在 `mobile-workbench.css` 的 `/* —— ① 对话入口 —— */` 区块末尾添加：

```css
/* 快捷键行 */
.mw .quick-btns {
  display: flex;
  gap: 6px;
  padding: 8px 12px 4px;
  overflow-x: auto;
  scrollbar-width: none;
  flex-shrink: 0;
}
.mw .quick-btns::-webkit-scrollbar {
  display: none;
}
.mw .quick-btns .qb {
  flex: none;
  font-size: 11px;
  padding: 5px 11px;
  border-radius: 16px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--fg-soft);
  cursor: pointer;
  font-family: var(--ff);
  font-weight: 500;
  white-space: nowrap;
  transition: background 0.15s, color 0.15s;
}
.mw .quick-btns .qb:active {
  background: var(--accent-soft);
  color: var(--accent);
  border-color: var(--accent-border);
}
/* 添加 hidden 工具类 */
.mw .hidden {
  display: none;
}
```

- [ ] **Step 3: 启动前端预览确认**

确认快捷键行出现在对话输入框上方，点击各按钮验证：
- **填写简报** → 跳转到简报屏
- **语音输入** → 触发浏览器语音权限请求（需通过 HTTPS 或 localhost）
- **附件** → 触发了文件选择对话框
- **方案模板** → 输入框填入模板文本

- [ ] **Step 4: 提交**

```bash
git add frontend/src/pages/mobile-workbench/ScreenChat.tsx frontend/src/pages/mobile-workbench/mobile-workbench.css
git commit -m "feat(mobile): 对话入口添加快捷键行"
```

---

### Task 3: 简报底部去除提示文本

**Files:**
- Modify: `frontend/src/pages/mobile-workbench/ScreenBrief.tsx`
- Modify: `frontend/src/pages/mobile-workbench/mobile-workbench.css`

**Interfaces:**
- 无，纯 DOM/样式修改

- [ ] **Step 1: 删除 hint 元素**

在 `ScreenBrief.tsx` 中删除 `.dock` 内的 `.hint` div：

```diff
       <div className="dock">
         <button className="gen" onClick={() => console.log('AI generate')}>✦ AI 生成方案</button>
-        <div className="hint">基于简报自动拆解 4M+1C 策略与执行</div>
       </div>
```

- [ ] **Step 2: 调整 dock 样式让按钮居中**

在 CSS 中将 `.dock` 的 `justify-content` 改为 `center`（让按钮水平居中）：

```diff
 .mw .dock {
   position: absolute; left: 0; right: 0; bottom: 0; background: var(--bg);
-  border-top: 1px solid var(--line); padding: 10px 16px 16px; display: flex; gap: 10px;
-  align-items: center; z-index: 15;
+  border-top: 1px solid var(--line); padding: 10px 16px 16px; display: flex;
+  justify-content: center; align-items: center; z-index: 15;
 }
```

- [ ] **Step 3: 启动前端预览确认**

切换到简报屏（Tab ②），确认底部只有 "✦ AI 生成方案" 按钮居中显示，没有多余的文字提示。

- [ ] **Step 4: 提交**

```bash
git add frontend/src/pages/mobile-workbench/ScreenBrief.tsx frontend/src/pages/mobile-workbench/mobile-workbench.css
git commit -m "fix(mobile): 简报底部去除提示文本"
```
