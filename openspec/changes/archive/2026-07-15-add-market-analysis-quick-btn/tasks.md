## 1. 移动端对话框快捷按钮

- [x] 1.1 ScreenChat.tsx: 新增 `handleMarketAnalysisTemplate` handler，功能为 `setInputValue('我要对[产品名]进行市场分析')`
- [x] 1.2 ScreenChat.tsx: 在 quick-btns 区域「方案模版」与「方案生成」之间新增一个 `.qb` 按钮，文案「市场分析」，`onClick={handleMarketAnalysisTemplate}`

## 2. 桌面端输入框浮层菜单

- [x] 2.1 ChatInput.tsx: 将「📈 数据」按钮占位处理函数从 `showPlaceholderToast` 替换为填充"我要对[产品名]进行市场分析"并关闭浮层
- [x] 2.2 ChatInput.tsx: 更新按钮 label 为「📈 市场分析」

## 3. 验证

- [x] 3.1 移动端：点击「市场分析」→ 输入框填入"我要对[产品名]进行市场分析" ✓
- [x] 3.2 桌面端：展开「+」浮层 → 看到「📈 市场分析」→ 点击 → 输入框填入模板内容 ✓
