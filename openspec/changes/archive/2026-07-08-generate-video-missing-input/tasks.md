## 1. 输入状态管理

- [x] 1.1 InlineVideoCard 新增 `urlRows` state（string[], 默认 `['']`）、`descriptionText` state（string, 默认 `''`）、`urlInputImageUrls` state（string[], 默认 `[]`）
- [x] 1.2 `handleUrlRowChange` 回调：更新 URL input 并验证后自动追加空行（最多 9 行）；`normalizeUrl` 提取有效 URL 到 imageUrls
- [x] 1.3 `removeUrlRow` 回调：删除 URL 行，只剩一行时清空而非移除
- [x] 1.4 `handleUrlRowPaste`：粘贴换行/逗号分隔的多 URL 自动拆分
- [x] 1.5 最终 `imageUrls` 取值：`prop.imageUrls` 非空时取 prop，否则取 input 输入的有效 URL 列表；`prompt` 取值同理

## 2. URL 输入区域 UI

- [x] 2.1 当 `imageUrls` prop 为空时，在参数面板上方渲染 URL 输入区：单行 input + 缩略图预览（复用 ThumbnailPreview 模式）
- [x] 2.2 URL 输入框右侧内嵌缩略图（loading/failed/loaded 三态），加载失败显示 × 占位符

## 3. 描述输入区域 UI

- [x] 3.1 当 `prompt` prop 为空时，在参数面板上方渲染视频描述 textarea
- [x] 3.2 textarea placeholder="描述希望生成的视频内容…（可选）"，最小 2 行，max-height 自动伸缩

## 4. 生成逻辑联动

- [x] 4.1 `handleGenerate` 中取 input state（而非 prop）的 URL 列表和描述文本作为 `image_urls` 和 `prompt` 参数
- [x] 4.2 TypeScript 编译无报错，测试通过

## 5. Spec 同步

- [x] 5.1 同步 delta spec 到主 spec `openspec/specs/inline-video-gen/spec.md`
