# 移动端聊天界面视觉升级 — Design（浅色主题最终版）

## 1. 主题方向

**已确认：保持浅色主题，不切换深色。**

在现有 `mobile-workbench.css` 浅色变量基础上，通过以下方式模拟参考图的层次感：
- 背景使用极浅蓝灰渐变 + 品牌蓝微光晕。
- 推荐卡片使用毛玻璃/半透明浅色表面。
- 保留品牌蓝 `#1677ff` 作为强调色。
- 通过大字号、充足留白、柔和阴影建立层次。

## 2. 色彩 token（复用并扩展现有变量）

```css
/* 复用现有变量 */
--bg: #ffffff;
--fg: #111111;
--accent: #1677ff;
--surface: #f7f8fa;
--muted: #6b7280;
--border: #d9dee7;
--accent-deep: color-mix(in srgb, #1677ff 52%, #111111);
--accent-soft: color-mix(in srgb, #1677ff 14%, #ffffff);
--accent-softer: color-mix(in srgb, #1677ff 6%, #ffffff);
--accent-border: color-mix(in srgb, #1677ff 32%, #ffffff);
--fg-soft: color-mix(in srgb, #111111 72%, #ffffff);
--shadow: color-mix(in srgb, #111111 16%, transparent);
--shadow-lg: color-mix(in srgb, #111111 22%, transparent);
--line: color-mix(in srgb, #d9dee7 55%, #ffffff);

/* 新增 */
--chat-bg-start: #f8fafc;
--chat-bg-end: #ffffff;
--surface-glass: rgba(255, 255, 255, 0.72);
--surface-glass-hover: rgba(255, 255, 255, 0.90);
--surface-glass-active: rgba(241, 245, 249, 0.95);
--border-glass: rgba(255, 255, 255, 0.60);
--text-on-glass: #0f172a;
--text-on-glass-secondary: #475569;
--text-placeholder: #94a3b8;
--accent-glow: rgba(22, 119, 255, 0.18);
```

## 3. 背景实现

```css
.mw .chat-screen {
  background:
    radial-gradient(ellipse 140% 90% at 50% -20%, rgba(22, 119, 255, 0.10), transparent 55%),
    linear-gradient(180deg, #f8fafc 0%, #ffffff 60%);
}
```

- 顶部品牌蓝光晕更柔和（透明度 0.10），保持浅色基调。
- 不使用图片背景。

## 4. 顶部推荐输入区（空态 + 聚焦时显示）

### 布局

```
┌─────────────────────────────────────┐
│                                     │
│  Hi, 老板                           │
│  让复杂，变简单                      │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ 📝  推荐方案生成        ▸   │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ 💰  预算评估            ▸   │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ 📊  市场分析            ▸   │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ 🤝  创建盟域            ▸   │    │
│  └─────────────────────────────┘    │
│                                     │
│        🔄 换一批                     │
│                                     │
├─────────────────────────────────────┤
│  +  给 Agent 发消息…            🎤   │
└─────────────────────────────────────┘
```

### 规格

| 元素 | 规格 |
|------|------|
| 问候标题 | `font-size: 28px; font-weight: 700; color: #0f172a; letter-spacing: -0.02em;` |
| 副标题 | `font-size: 14px; color: #475569; margin-top: 4px;` |
| 推荐卡片 | `display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-radius: 18px; background: rgba(255,255,255,0.72); border: 1px solid rgba(255,255,255,0.60); box-shadow: 0 4px 20px rgba(15,23,42,0.06); backdrop-filter: blur(12px);` |
| 卡片图标 | `width: 28px; height: 28px; font-size: 20px;` |
| 卡片文字 | `font-size: 14px; font-weight: 500; color: #0f172a;` |
| 卡片箭头 | `margin-left: auto; color: #94a3b8;` |
| 卡片 hover/active | `background: rgba(255,255,255,0.90); transform: translateY(-1px); box-shadow: 0 6px 24px rgba(15,23,42,0.08);` |
| 换一批 | `display: inline-flex; align-items: center; gap: 6px; color: #475569; font-size: 13px; padding: 8px 14px; border-radius: 20px; background: rgba(255,255,255,0.72); border: 1px solid rgba(255,255,255,0.60);` |
| 推荐区容器 | `padding: 28px 16px 16px; display: flex; flex-direction: column; gap: 10px; align-items: center;` |

### 动效

- 推荐区进入：`opacity 0 → 1`, `translateY(16px) → 0`, `duration: 350ms`, `ease: cubic-bezier(0.16, 1, 0.3, 1)`。
- 卡片依次进入：每张延迟 40ms，stagger。
- 点击卡片：`scale(0.98)`, `duration: 80ms`。

## 5. 输入框

### 布局

```
┌───────────────────────────────────────────────────┐
│  [+]  给 Agent 发消息…                    [🎤/↑]  │
└───────────────────────────────────────────────────┘
```

### 规格

| 元素 | 规格 |
|------|------|
| 输入条容器 | `position: absolute; left: 0; right: 0; bottom: 0; padding: 10px 12px 16px; background: linear-gradient(0deg, rgba(255,255,255,0.98) 0%, rgba(255,255,255,0) 100%); z-index: 20;` |
| 输入框 | `flex: 1; height: 44px; border-radius: 22px; padding: 0 14px; background: #f1f5f9; border: 1px solid #e2e8f0; color: #0f172a; font-size: 14px;` |
| 输入框聚焦 | `border-color: var(--accent-border); box-shadow: 0 0 0 3px var(--accent-softer); background: #ffffff;` |
| 占位符 | `color: #94a3b8;` |
| + 号按钮 | `width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #475569; background: transparent; font-size: 20px;` |
| + 号激活 | `background: #f1f5f9; color: #0f172a; transform: rotate(45deg);`（展开时 + 变 ×） |
| 语音/发送按钮 | `width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center;` |
| 语音按钮 | `color: #475569; background: transparent;` |
| 发送按钮 | `background: var(--accent); color: #fff; box-shadow: 0 2px 12px rgba(22,119,255,0.30);` |

### 行为

- 输入为空 → 右侧显示麦克风图标。
- 有文字 → 右侧显示发送箭头，麦克风消失。
- 聚焦时 → 如果 `messages.length === 0`，上方显示推荐区；否则只高亮输入框。
- + 号展开面板时**不收起键盘/不失焦**（已确认）。

## 6. + 号底部面板

### 布局

```
┌─────────────────────────────────────┐
│         ─────── 抓手                 │
│                                     │
│  📎  上传附件                        │
│     支持图片、文档等                 │
│                                     │
│  🖼️  创作图片                        │
│     一句话生成产品海报               │
│                                     │
│  🎬  创作视频                        │
│     快速生成宣传视频                 │
│                                     │
└─────────────────────────────────────┘
```

### 规格

| 元素 | 规格 |
|------|------|
| 面板容器 | `position: absolute; left: 0; right: 0; bottom: 0; z-index: 25; padding: 12px 16px 24px; border-radius: 24px 24px 0 0; background: rgba(255, 255, 255, 0.96); border-top: 1px solid #e2e8f0; box-shadow: 0 -8px 32px rgba(15,23,42,0.08); backdrop-filter: blur(24px);` |
| 抓手 | `width: 40px; height: 4px; border-radius: 2px; background: #cbd5e1; margin: 0 auto 20px;` |
| 列表项 | `display: flex; align-items: center; gap: 14px; padding: 14px 12px; border-radius: 16px; background: transparent;` |
| 列表项 hover/active | `background: #f1f5f9; transform: scale(0.99);` |
| 图标区 | `width: 44px; height: 44px; border-radius: 14px; background: linear-gradient(135deg, var(--accent-soft), rgba(22,119,255,0.05)); display: flex; align-items: center; justify-content: center; font-size: 22px; flex: none;` |
| 文字区 | `display: flex; flex-direction: column; gap: 2px;` |
| 主标题 | `font-size: 15px; font-weight: 600; color: #0f172a;` |
| 副标题 | `font-size: 12px; color: #64748b;` |
| 列表间距 | 相邻列表项间距 `4px` |

### 动效

- 面板进入：`translateY(100%) → translateY(0)`, `duration: 280ms`, `ease: cubic-bezier(0.16, 1, 0.3, 1)`。
- 面板退出：`translateY(0) → translateY(100%)`, `duration: 200ms`。
- + 号旋转：`rotate(0deg) → rotate(45deg)`，展开时变成关闭 ×。
- 列表项 stagger：依次延迟 30ms 淡入上移。

## 7. 历史消息区域（有消息时）

- 保持现有 `.mw .chat` 气泡样式，背景适配浅色。
- AI 气泡：背景 `var(--surface)`，边框 `var(--border)`，文字 `var(--fg)`。
- 用户气泡：背景 `var(--accent)`，文字 `#fff`。
- 滚动时输入条上方有白色渐变遮罩，避免消息直接贴到输入框。

## 8. 组件拆分建议

`ScreenChat.tsx` 当前约 250 行，新增逻辑后预计 500-600 行。建议拆分为：

```
frontend/src/pages/mobile-workbench/
├── ScreenChat.tsx              # 主屏幕，状态管理
├── screen-chat/
│   ├── ChatSuggestionHeader.tsx  # 顶部推荐区
│   ├── ChatActionPanel.tsx       # + 号底部面板
│   └── ChatInputBar.tsx          # 输入框组合
```

## 9. 推荐文案池（已确认 7 个）

```ts
const SUGGESTION_POOL = [
  { icon: '📝', label: '推荐方案生成', action: 'navigate-brief' },
  { icon: '💰', label: '预算评估', action: 'prefill-brand-template' },
  { icon: '📊', label: '市场分析', action: 'prefill-market-analysis' },
  { icon: '🤝', label: '创建盟域', action: 'send-text', payload: '帮我创建一个盟域活动方案' },
  { icon: '🎯', label: '创建活动', action: 'send-text', payload: '帮我策划一个品牌营销活动' },
  { icon: '🖼️', label: '产品海报', action: 'virtual-image' },
  { icon: '🎬', label: '产品视频', action: 'virtual-video' },
]
```

每批随机展示 4 个，点击"换一批"重新随机打乱。图标使用 emoji（已确认）。

## 10. 状态与交互流程

```
Empty + Focused
       │
       ▼
┌─────────────────────┐
│  SuggestionHeader   │
│  + ChatInputBar     │
└─────────────────────┘
       │ click '+'
       ▼
┌─────────────────────┐
│  SuggestionHeader   │
│  + ActionPanel      │
│  + ChatInputBar     │
└─────────────────────┘

Has Messages
       │
       ▼
┌─────────────────────┐
│  Chat messages      │
│  + ChatInputBar     │
└─────────────────────┘
       │ click '+'
       ▼
┌─────────────────────┐
│  Chat messages      │
│  + ActionPanel      │
│  + ChatInputBar     │
└─────────────────────┘
```

## 11. 待确认清单（已全部确认）

- [x] 不要深色，保持浅色主题。
- [x] 问候标题："Hi, 老板"。
- [x] 换一批图标：🔄 刷新。
- [x] 推荐文案 7 个：推荐方案生成、预算评估、市场分析、创建盟域、创建活动、产品海报、产品视频。
- [x] + 号展开时不收起键盘/不失焦。
- [x] 图标使用 emoji。
- [x] 加顶部品牌蓝光晕。
- [x] 顶部栏保持原系统样式，不做任何改动。

## 12. 风险

1. 浅色毛玻璃在 Safari 上可能需要 `-webkit-backdrop-filter`。
2. 不收起键盘时，+ 号面板可能与键盘同时出现，需确保面板层级在键盘上方（z-index 足够高）。
3. 由于使用 emoji 图标，不同平台渲染可能略有差异，但风格一致。
