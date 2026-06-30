## Context

当前后端已实现 `POST /api/v1/chat`，但缺少用户可访问的前端入口。本次设计为中小品牌操盘手提供一个自然语言录入品牌需求的聊天界面，作为 `plan-generation-chat-preview` 能力的前端载体。

## Goals / Non-Goals

**Goals:**
- 提供单页聊天界面，对接已有 `/api/v1/chat`
- 通过"进度跑道"让用户直观看到需求字段收集进度
- 支持欢迎引导、错误重试、加载状态、字段编辑引导
- 本地保存历史会话，用户可回到之前对话
- 响应式适配桌面与移动端

**Non-Goals:**
- 不做完整营销方案预览或编辑（超出 MVP）
- 不做用户登录/多用户同步
- 不做后端 API 改动
- 不做结构化表单录入（后续 change 再做）

## Decisions

1. **技术栈：React + TypeScript + Vite + Tailwind CSS**
   - Rationale: 轻量、流行、类型安全、构建快；Tailwind 适合快速实现设计 tokens 和响应式。

2. **布局：一屏居中垂直堆叠 + 底部固定输入框**
   - Rationale: 参考豆包/ChatGPT 的主交互模式，AI 是主角；移动端自然适配。

3. **设计系统："跑道美学"**
   - 浅灰背景 `#F5F5F5` + 黑色 `#0A0A0A` + 橙色触发 `#FF4D00` + 绿色确认 `#00D084`
   - 标题字体 `Bebas Neue`，正文 `Inter`，数据 `JetBrains Mono`
   - Rationale：运动品牌感强，避免通用 SaaS 或科技渐变模板。

4. **进度跑道一开始就显示 5 个空槽**
   - 图标 + 极简标签：🏷 品牌 / 🏃 品类 / 📍 城市 / 💰 预算 / 📅 周期
   - Rationale：空槽本身就是引导，告诉用户需要说什么。

5. **字段编辑：点击字段卡 → 底部输入框预填充**
   - Rationale：不新增后端 API，把编辑转化为自然语言消息。

6. **历史记录：localStorage 存完整 message 数组**
   - Rationale：MVP 最小实现，后续可迁移到后端历史。

7. **状态管理：局部 `useReducer` + `useState`**
   - Rationale：无复杂跨组件状态，不需要 Redux/Zustand。

## Risks / Trade-offs

- [CORS 开发配置] → 后端需要允许 `localhost:5173`，生产环境用反向代理
- [localStorage 容量有限] → MVP 单用户会话量小，可控；未来迁移后端
- [Bebas Neue 中文字体 fallback] → 中文标题回退到系统黑体，保持压缩感可用 `Dela Gothic One`
- [Tailwind 工具类过多] → 用 CSS variables 承载 tokens，Tailwind 只负责布局

## Open Questions

- 生产部署时前端和后端是同域还是分离？影响 CORS 和 API base URL 配置
- 是否需要流式输出？当前后端不支持，后续可扩展
