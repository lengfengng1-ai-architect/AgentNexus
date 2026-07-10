## Context

移动端工作台①对话屏快捷按钮行当前顺序为「填写简报 附件 方案模板」。用户要求改名并重排序。同时，当前"填写简报→简报屏"的预填逻辑仅从输入框文本正则提取，对话历史中后端已返回的 BrandInput 结构化数据未用到，导致对话包含完整品牌信息时跳转后仍显示 mock 默认值。

## Goals / Non-Goals

**Goals:**
- 按钮文案改名（方案模板→方案简报模版，填写简报→一键填充简报）
- 按钮排序改为「附件 方案简报模版 一键填充简报」
- 简报预填使用 BrandInput 结构化数据（最高优先级）+ 输入框 parse 补充

**Non-Goals:**
- 不改变后端 API 或 BrandInput 数据格式
- 不改变现有 mock 数据结构和 fallback 逻辑
- 不涉及 PC 端工作台

## Decisions

### 1. onNavigate 签名扩展为可选参数

`onNavigate: (screen: MobileScreen, inputText?: string, brandData?: BrandBriefData) => void`

向后兼容——现有调用方（其他屏的 onNavigate）不需要改。

### 2. useChat 直接暴露 latestBrandInput

在 useChat 返回值中增加 `latestBrandInput`（useMemo 包装），由 ScreenChat 取用后传入 onNavigate。

### 3. 合并优先级：BrandInput > parse > mock

ScreenBrief 内 useMemo 合并：

```
BrandInput 结构化字段（brand_name/category/city/budget/period）
  → 覆盖 parseBriefInput 的对应字段
    → 剩余字段用默认 mock 值
```

## Risks / Trade-offs

- **TODO** BrandInput 的 `city` 字段是字符串，需要映射到 `CITIES` 数组匹配城市 chips
- BrandInput 可能为 null（历史对话中意图识别未触发时），此时退化到纯输入框 parse 逻辑
