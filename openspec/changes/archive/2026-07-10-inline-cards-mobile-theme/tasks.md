## 1. ChatBubble 新增 variant prop

- [x] 1.1 `ChatBubble.tsx` — 新增 `variant?: 'mobile'` prop 定义和类型
- [x] 1.2 `ChatBubble.tsx` — 将 variant prop 透传给 InlineImageCard 和 InlineVideoCard

## 2. InlineImageCard 移动端主题适配

- [x] 2.1 `InlineImageCard.tsx` — 新增 `variant?: 'mobile'` prop 定义
- [x] 2.2 `InlineImageCard.tsx` — variant=mobile 时切换背景色、边框色、按钮色、文字色
- [x] 2.3 `InlineImageCard.tsx` — variant=mobile 时缩紧间距（p-3 → p-2.5）、调小字号

## 3. InlineVideoCard 移动端主题适配

- [x] 3.1 `InlineVideoCard.tsx` — 新增 `variant?: 'mobile'` prop 定义
- [x] 3.2 `InlineVideoCard.tsx` — variant=mobile 时切换背景色、边框色、按钮色、文字色、输入框色
- [x] 3.3 `InlineVideoCard.tsx` — variant=mobile 时缩紧间距（p-3 → p-2.5）、调小字号

## 4. ScreenChat 传入 variant prop

- [x] 4.1 `ScreenChat.tsx` — 传入 `variant="mobile"` 给 ChatBubble

## 5. 测试验证

- [x] 5.1 运行现有测试，确认无回归
