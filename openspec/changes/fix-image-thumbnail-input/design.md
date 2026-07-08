## Context

当前 ImageThumbnail 组件在 `<img>` 未加载完成时通过 `style={{ display: 'none' }}` 隐藏图片，同时使用了 `loading="lazy"`。浏览器对 `display: none` 且 `loading="lazy"` 的图片**不会发起网络请求**，导致 onLoad/onError 永远不触发，"加载中…"状态卡死。

图片 URL 输入使用多行 textarea，用户无法逐行感知输入状态。

## Goals / Non-Goals

**Goals:**
- 修复"加载中"卡死 bug
- 行级 URL 输入 + auto-append 空行
- 缩略图预览即时响应

**Non-Goals:**
- 不改变后端数据结构（仍为 `image_urls: list[str]`）
- 不改变导航传递方式（仍为 `?image_urls=u1,u2`）

## Decisions

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | `loading="lazy"` → `loading="eager"` | 关闭延迟加载，确保图片立即发起请求 |
| 2 | `display: none` → `className` + `opacity` | 图片始终在 DOM 中，浏览器可正常加载；加载前 opacity:0 不可见，加载后 opacity:1 |
| 3 | textarea → array of input rows | 每行一个独立 input，onChange 时校验 URL 格式，自动追加空行 |
| 4 | auto-append 条件：非空 + 非重复 + 有效 URL | 避免空行追加、重复 URL 浪费缩略图渲染 |

## Risks / Trade-offs

- [低] 行级输入无法一次性粘贴多个 URL → 保留 URL 数量提示的同时，支持批量粘贴到首个 input 后自动拆分
