## 1. ScreenBrief：新增 useEffect 同步 mergedDefaults 到 state

- [x] 1.1 新增 useCallback 封装所有 setState，监听 mergedDefaults 变化
- [x] 1.2 新增 useEffect 驱动 state 同步

## 2. ScreenBrief：删除 mock 字符串默认值

- [x] 2.1 mergedDefaults 中所有字段的 fallback 从 '娃哈哈' / '果汁饮料' 等 mock 值改为空字符串 ''

## 3. 验证

- [x] 3.1 发送"我是 阿嬷手作..."→ 点击生成方案 → 简报自动填充"阿嬷手作"各字段 + 蓝色头部更新
- [x] 3.2 点击 Tab「方案生成」→ 简报表单为空，蓝色头部显示空值
- [x] 3.3 第二次跳转（不同品牌）→ 简报自动更新为新的字段值
