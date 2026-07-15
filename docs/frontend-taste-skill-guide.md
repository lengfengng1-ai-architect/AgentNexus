# Frontend Taste-Skill 使用方案

> 本文档定义了 AgentNexus 项目前端修改/开发时的**默认设计规范**。
> 所有前端改动（新增页面、改版、组件优化）必须优先遵循本方案，调用 `design-taste-frontend` 技能。

---

## 1. 背景

项目已安装 [taste-skill](https://github.com/Leonxlnx/taste-skill) 的 13 个前端设计技能，安装在 `.agents/skills/` 下。其中**核心默认技能**是 `design-taste-frontend` — 一个反模板（anti-slop）前端设计规范，涵盖：

- 需求推断（Design Read）
- 三旋钮配置（方差/动效/密度）
- 设计系统映射
- 排版、配色、布局硬规范
- 预检清单（Pre-Flight Check）

---

## 2. 何时调用

以下场景**必须**在动手前调用 `design-taste-frontend` 技能：

| 场景 | 说明 |
|---|---|
| 新增前端页面 | Landing page、作品集、营销页 |
| 现有页面改版 | 视觉升级、布局重构 |
| 前端组件开发 | 新的通用组件、卡片、导航等 |
| 设计评审前 | 产出需要经过 Pre-Flight Check |

**例外**：纯数据仪表盘、管理后台（Admin Panel）、多步骤表单、代码编辑器等不在技能 scope 内的场景，可不调用。

---

## 3. 标准工作流

### Step 1 — 需求读取（Design Read）

AI 必须先输出一行设计读取声明：

> **"Reading this as: \<页面类型> for \<受众>, with a \<氛围> language, leaning toward \<设计系统或美学家族>."**

例如：
- *"Reading this as: B2B SaaS landing for technical buyers, with a Linear-style minimalist language, leaning toward Tailwind utilities + Geist + restrained motion."*
- *"Reading this as: 营销方案后台 for 品牌运营人员, with a clean editorial language, leaning toward Tailwind + cabin grotesk + calm motion."*

### Step 2 — 设定三旋钮

基于 Design Read 设定三个核心参数：

| 旋钮 | 范围 | 含义 |
|---|---|---|
| `DESIGN_VARIANCE` | 1-10 | 1=完全对称，10=艺术混沌 |
| `MOTION_INTENSITY` | 1-10 | 1=静态，10=电影级/物理动效 |
| `VISUAL_DENSITY` | 1-10 | 1=画廊式宽松，10=驾驶舱密集 |

**基线值：`8 / 6 / 4`**，除非 Design Read 要求覆盖。

### Step 3 — 选择设计基础

- 匹配到官方设计系统的（如 Fluent、Carbon、shadcn/ui），使用官方包
- 没有官方系统的美学方向（Glassmorphism、Bento、Editorial），用 Tailwind + Motion 手写

### Step 4 — 实现并执行 Pre-Flight Check

产出代码前，必须逐项执行[预检清单](#6-预检清单-pre-flight-check)。

---

## 4. 核心设计约束（摘要）

### 4.1 排版
- 默认 Sans：`Geist`、`Outfit`、`Cabinet Grotesk`、`Satoshi`（**避免默认 Inter**）
- 衬线体极保守：仅当品牌明确指定或编辑/奢侈品场景才使用
- **禁止默认使用** `Fraunces`、`Instrument_Serif`
- H1: `text-4xl md:text-6xl tracking-tighter leading-none`
- 正文: `text-base text-gray-600 leading-relaxed max-w-[65ch]`

### 4.2 配色
- 最多 1 个强调色，饱和度 < 80%
- **禁止默认 AI 紫/蓝渐变**，用中性底 + 高对比单色强调
- **禁止默认暖米色+铜色+红褐色方案**（消费品页面的 AI 默认配色）
- 强化色一致性：整页锁定一个强调色

### 4.3 布局
- 方差 > 4 时避免居中 Hero，改用 Split Screen / 左对齐非对称
- **禁止三列等宽特性卡片**
- **禁止连续的"左图右文 + 左文右图"Z字型交替超过 2 个区块**
- Hero 必须在首屏完全可见（标题 ≤ 2 行，副文本 ≤ 20 词，CTA 不用滚动）
- Hero 顶部内边距最大 `pt-24`，标题从 `text-4xl` 起而不是 `text-7xl`
- 导航栏桌面端单行显示，高度 ≤ 80px

### 4.4 动效
- 仅使用 `transform` 和 `opacity`，禁止动 `top`/`left`/`width`/`height`
- `MOTION_INTENSITY > 3` 时必须支持 `prefers-reduced-motion`
- Motion（原 Framer Motion）为默认动效库
- GSAP + ScrollTrigger 仅用于全页滚动叙事，且必须与 React 组件隔离
- **禁止 `window.addEventListener('scroll')`**

### 4.5 组件规范
- 按钮文本必须在桌面端**单行显示**，禁止换行
- 同意图的 CTA 在全页只能用**一个标签**（"联系我们" 和 "咨询我们" 不能同时出现）
- 卡片仅在真正需要层级时才使用，否则用 `border-t` / 间距做分组
- 全页统一一个圆角系统（全直角 / 全软角 / 全胶囊）
- 每 3 个区块最多 1 个 eyebrow（小标头标签）

### 4.6 图片与视觉素材
- 优先使用生图工具生成图片
- 其次用 `https://picsum.photos/seed/{描述词}/{w}/{h}`
- **禁止用 div 拼假截图**
- **禁止在图片上覆盖标签/水印**
- Logo 墙必须用真实 SVG（Simple Icons / devicon），禁止纯文字 wordmark

---

## 5. 技能调用示例

### 在需求中说：

> "用 design-taste-frontend 帮我改一下首页 Hero 区域"

### AI 应自动执行：

1. 调用 `design-taste-frontend` 技能 → 加载 SKILL.md
2. 输出 Design Read："Reading this as: 营销方案 landing page for 品牌运营人员..."
3. 设定旋钮值
4. 按技能规范修改代码
5. 运行 Pre-Flight Check
6. 交付

---

## 6. 预检清单（Pre-Flight Check）

以下为**强制检查项**，缺一不可：

- [ ] Design Read 声明已输出
- [ ] 三旋钮值已明确设定并作用于产出
- [ ] 全页零 em-dash（`—`）使用
- [ ] 全页主题锁定（light/dark/auto 单一模式）
- [ ] 强调色一致性锁定
- [ ] 圆角一致性锁定
- [ ] 所有 CTA 按钮文本对比度 ≥ WCAG AA 4.5:1
- [ ] CTA 按钮文本无换行
- [ ] Hero 首屏完整可见
- [ ] Hero 顶部内边距 ≤ `pt-24`
- [ ] 导航桌面端单行，高度 ≤ 80px
- [ ] 无三列等宽卡片
- [ ] 无连续 3+ 个相同布局族
- [ ] 动效可解释动机（非"看起来酷"）
- [ ] 图片使用真实素材，无 div 假截图
- [ ] 按钮无同意图重复
- [ ] 所有 `h-screen` 已替换为 `min-h-[100dvh]`
- [ ] `prefers-reduced-motion` 已处理

---

## 7. 与项目现有流程的集成

本方案融合了 CLAUDE.md 中的入口流程与 taste-skill 的设计规范：

```
Step 0-9 流程（CLAUDE.md）
  └─ Step 5 CodeGraph 查询 → 理解现有前端结构
  └─ Step 8 OpenSpec 变更流程 → API 契约先行
  └─ Step 9 编码前勾选 → 加入本方案检查
        └─ 调用 design-taste-frontend 技能 ✓
        └─ 输出 Design Read ✓
        └─ 执行 Pre-Flight Check ✓
```

**优先级**：项目 OpenSpec 与 API 契约约束 > taste-skill 视觉规范 > 默认 LLM 行为。

如果 OpenSpec 规定了特定的交互或布局，先满足 OpenSpec，再用 taste-skill 提升视觉品质。

---

## 8. 其他可用技能速查

| 技能 | 适用场景 | 风格定位 |
|---|---|---|
| `design-taste-frontend` | **默认选择** — 所有前端改动 | 反模板、适配需求 |
| `minimalist-ui` | 极简编辑风、内容型页面 | 暖色单色、柔和粉彩、无阴影 |
| `high-end-visual-design` | 高端品牌感、Awwwards 级别 | 深度空间、电影级动效 |
| `industrial-brutalist-ui` | 数据密集、机械风格 | 瑞士排版、军用终端 |
| `gpt-taste` | GSAP 复杂动效页面 | AIDA 结构、随机布局 |
| `redesign-existing-projects` | 现有项目视觉升级 | 先审计再改造 |
| `imagegen-frontend-web` | 生成设计参考图（不写代码） | — |
| `imagegen-frontend-mobile` | 生成 App 设计参考图（不写代码） | — |

> **默认**：无特殊说明时，前端改动一律使用 `design-taste-frontend`。
