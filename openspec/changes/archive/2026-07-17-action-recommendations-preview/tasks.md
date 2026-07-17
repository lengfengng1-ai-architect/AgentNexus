## 1. 后端 Schema 与数据流

- [ ] 1.1 ActionRecommendation 扩展 start_date/end_date/priority/category 字段
- [ ] 1.2 _node_inputs 中 action_recommendations 传入 execution_planning
- [ ] 1.3 action_recommendations agent 读取 execution_planning 5 个维度传入模板
- [ ] 1.4 prompt 模板加预算里程碑/执行规划/驳回反馈区块
- [ ] 1.5 _INTERRUPT_AFTER 添加 action_recommendations
- [ ] 1.6 reject_run 分 action_recommendations/budget_kpi 两种驳回场景

## 2. 后端媒体触发优化

- [ ] 2.1 海报生成从 action_recommendations 就已触发（和视频并行）
- [ ] 2.2 plan_generator 完成后用完整 chapters 内容再次触发海报覆盖

## 3. 前端行动预览覆盖层

- [ ] 3.1 新建 ScreenActionPreview.tsx 全屏覆盖层组件
- [ ] 3.2 行动建议卡片列表（序号/标题/日期/优先级/分类/描述）
- [ ] 3.3 媒体素材模块（海报/视频的加载圈/缩略图/播放器/lightbox）
- [ ] 3.4 品牌摘要行 + 底部反馈输入栏
- [ ] 3.5 MobileScreen 类型扩展 action-preview

## 4. 前端路由与交互

- [ ] 4.1 MobileWorkbenchPage 加 action-preview 状态/路由
- [ ] 4.2 ScreenGenerate 弹窗加 action_recommendations 结果弹窗
- [ ] 4.3 suppressCheckpoint 从布尔值改为节点 ID 跟踪
- [ ] 4.4 媒体轮询在 action-preview 屏也生效
- [ ] 4.5 CSS 滑动动画 + 滚动条隐藏
