## 1. 修复 ImageThumbnail "加载中"卡死

- [x] 1.1 `VideoTestPage.tsx` — ImageThumbnail 组件：移除 `style={{ display: 'none' }}`，改为 `opacity` 控制；`loading="lazy"` → `loading="eager"`

## 2. 行级 URL 输入交互

- [x] 2.1 `VideoTestPage.tsx` — 移除 `imageUrlInput` / `imageUrls` 双状态，改为 `urlRows: string[]` 初始含 1 个空字符串
- [x] 2.2 `VideoTestPage.tsx` — URL 输入区域从 textarea 改为 `urlRows.map` 渲染独立 input 行，onChange 时更新对应行值
- [x] 2.3 `VideoTestPage.tsx` — auto-append：用户输入有效 URL 后（非空 + HTTP/HTTPS + 不重复），自动 push 一个空字符串新行
- [x] 2.4 `VideoTestPage.tsx` — 按钮守卫 / handleGenerate / 自触发 适配 `urlRows` 派生 `imageUrls`
