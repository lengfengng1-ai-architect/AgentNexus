# 移动端聊天界面视觉升级 — Spec（浅色主题最终版）

## 需求清单

| 编号 | 需求 | 优先级 | 来源 |
|------|------|--------|------|
| R1 | 输入框聚焦时，聊天区域显示沉浸式推荐态 | P0 | 用户图 2 |
| R2 | 输入框左侧添加 + 号按钮，点击展开底部操作面板 | P0 | 用户图 3 |
| R3 | 底部面板提供：上传附件、创建图片、创建视频 | P0 | 用户图 3 |
| R4 | 语音输入按钮移至输入框内部 | P0 | 用户 |
| R5 | 聊天区域顶部增加"Hi, 老板"推荐输入区 | P0 | 用户 |
| R6 | 推荐输入区支持随机换一批 | P1 | 用户 |
| R7 | 推荐文案结合现有能力 | P0 | 用户 |
| R8 | 风格参考现有应用，保持浅色品牌一致性 | P0 | 用户 |
| R9 | 顶部栏保持原系统样式，不做改动 | P0 | 用户 |

## 非功能需求

- 保持浅色主题，不切换深色。
- 顶部栏保持原系统样式，不改动。
- 动画只使用 `transform` / `opacity`。
- 移动端 320px 宽度不溢出。
- 键盘弹起时输入框不被遮挡；+ 号展开面板时键盘不收起。
- 保持现有可访问性：按钮有 `aria-label`。

## 接口/数据

本次改动不新增或修改后端接口。前端复用：
- `POST /api/v1/upload`：附件上传。
- `POST /api/v1/chat/stream`：文字消息/图片/视频 virtual message。
- `onNavigate('brief', ...)`：方案生成导航。

## 状态定义

```ts
interface SuggestedPrompt {
  id: string
  icon: string
  label: string
  action: 'navigate-brief' | 'prefill-brand-template' | 'prefill-market-analysis' | 'send-text' | 'virtual-image' | 'virtual-video'
  payload?: string
}
```

## 行为规格

### 聚焦态
- 当 `messages.length === 0` 且 `isInputFocused === true` 时，在聊天区域顶部渲染 `SuggestionHeader`。
- 有历史消息时，不显示 `SuggestionHeader`。

### 换一批
- 每次点击"换一批"，从 `SUGGESTION_POOL` 中随机抽取 4 个，允许重复抽取直到池耗尽后重置。
- ponytail：使用 `Math.random()` 简单打乱，天花板是伪随机分布不均；升级路径是引入加权随机或后端推荐。
- 换一批图标：🔄。

### + 号面板
- 展开时高度约 180px，占满底部宽度。
- 点击面板外部、或再次点击 + 号，关闭面板。
- 面板项点击后立即关闭面板。
- + 号展开时**不**收起键盘/失焦。

### 语音/发送切换
- `inputValue.trim() === ''` 时显示语音按钮。
- 否则显示发送按钮。

## 测试要点

- 空态聚焦显示推荐区。
- 有消息后聚焦不显示推荐区。
- + 号面板展开/关闭。
- 语音/发送按钮切换。
- 附件上传、创建图片、创建视频调用现有处理函数。
- 换一批不崩溃。

## 视觉规格（浅色主题）

### 色彩
- 聊天背景：`radial-gradient(ellipse 140% 90% at 50% -20%, rgba(22,119,255,0.10), transparent 55%), linear-gradient(180deg, #f8fafc 0%, #ffffff 60%)`
- 玻璃表面：`rgba(255,255,255,0.72)`，hover `0.90`，active `0.95`
- 玻璃边框：`rgba(255,255,255,0.60)`
- 主文字：`#0f172a`；次级：`#475569`；muted：`#94a3b8`
- 强调色：`#1677ff`；发光：`rgba(22,119,255,0.18)`

### 顶部推荐区
- 问候标题：`28px / 700 / #0f172a / letter-spacing: -0.02em`
- 副标题：`14px / #475569`
- 推荐卡片：`padding: 14px 16px; border-radius: 18px; backdrop-filter: blur(12px); background: rgba(255,255,255,0.72); border: 1px solid rgba(255,255,255,0.60); box-shadow: 0 4px 20px rgba(15,23,42,0.06);`
- 卡片间距：`10px`
- 卡片图标：`28px`，文字 `14px / 500`
- 换一批：`13px / #475569 / padding: 8px 14px / border-radius: 20px / 图标 🔄`

### 输入框
- 输入条吸底，`padding: 10px 12px 16px`，底部白色渐变遮罩
- 输入框：`height: 44px; border-radius: 22px; background: #f1f5f9; border: 1px solid #e2e8f0;`
- 聚焦：`border-color: var(--accent-border); box-shadow: 0 0 0 3px var(--accent-softer); background: #ffffff;`
- + 号：`36px` 圆形，展开时旋转 45° 变 ×
- 语音/发送：`36px` 圆形，发送按钮背景 `#1677ff`

### + 号面板
- 从底部滑出，`border-radius: 24px 24px 0 0`
- 背景：`rgba(255,255,255,0.96) / backdrop-filter: blur(24px)`
- 抓手：`40px × 4px / #cbd5e1`
- 列表项：`display: flex; align-items: center; gap: 14px; padding: 14px 12px; border-radius: 16px;`
- 图标区：`44px` 方形圆角 `14px`，渐变背景
- 主标题：`15px / 600 / #0f172a`
- 副标题：`12px / #64748b`
- 列表项间距：`4px`

### 动效
- 推荐区进入：`opacity 0→1, translateY(16px)→0, 350ms, ease: cubic-bezier(0.16,1,0.3,1)`，卡片 stagger 40ms
- 面板进入：`translateY(100%)→0, 280ms`
- 面板退出：`translateY(0)→100%, 200ms`
- 列表项 stagger：依次延迟 30ms 淡入上移
- 列表项 press：`scale(0.99), 80ms`
- + 号旋转：`0deg→45deg, 200ms`

## 验收标准

- [ ] 顶部栏保持原系统样式，不做任何改动。
- [ ] 保持浅色主题，不切换深色。
- [ ] 输入框聚焦时界面与图 2 风格一致（浅色背景 + 顶部问候 + 推荐卡片）。
- [ ] 输入框左侧 + 号、内部语音按钮、右侧发送/语音切换正常。
- [ ] + 号面板包含上传附件、创建图片、创建视频三项，以垂直列表形式从底部滑出。
- [ ] 推荐输入区可换一批，文案覆盖方案生成、预算评估、市场分析、创建盟域、创建活动、产品海报、产品视频。
- [ ] 风格与现有移动端 workbench 浅色主题一致，强调色保留 `#1677ff`。
- [ ] 动画只使用 transform / opacity，流畅不卡顿。
- [ ] 320px 宽度不溢出，键盘弹起时输入框可见。
- [ ] 现有测试通过，新增测试覆盖聚焦态、面板、换一批。
