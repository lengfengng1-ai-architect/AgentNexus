# Button Rename + Quick-Btn Reorder + Brief Prefill from BrandInput

## 需求

1.「方案模板」→「方案简报模版」
2.「填写简报」→「一键填充简报」  
3. 快捷按钮排序：附件 → 方案简报模版 → 一键填充简报
4. 修正预填 bug：当前仅输入框文本 parse，对话历史中后端返回的结构化 BrandInput 数据未用到，导致即使对话中有完整信息跳转简报后仍显示默认 mock 数据

## 设计

### 按钮改动

**ScreenChat.tsx** quick-btns 行：

```
旧顺序：[语音输入→已删除] 填写简报  附件  方案模板
新顺序：附件  方案简报模版  一键填充简报
```

### BrandInput 数据传递链路

```
ScreenChat（从 useChat 取 latestBrandInput）
  → 点击"一键填充简报"时onNavigate('brief', inputValue, brandData)
    → MobileWorkbenchPage 暂存 pendingBriefBrandData
      → ScreenBrief 接收 initialBrandData prop
        → 合并优先级：BrandInput 结构化 > parse 提取 > mock 默认值
```

### onNavigate 签名扩展

```ts
type BrandBriefData = {
  brand_name?: string | null
  category?: string | null
  city?: string | null
  budget?: number | null
  period?: number | null
}

// 可选参数，向后兼容
onNavigate: (screen: MobileScreen, inputText?: string, brandData?: BrandBriefData) => void
```

### 合并逻辑

ScreenBrief 内：

```ts
const parsed = parseBriefInput(initialInput ?? '')
const brandData = initialBrandData ?? {}

// brandData 字段覆盖 parsed 结果（后端结构化数据最高优先级）
const mergedBrand = brandData.brand_name ?? parsed.brand ?? '娃哈哈'
const mergedProduct = brandData.category ?? parsed.productLine ?? '魅力系列（蓝莓/石榴/荔枝）'
const mergedCities = brandData.city
  ? matchCities(brandData.city) // 从城市字符串匹配 CITIES 列表
  : (parsed.cities ?? ['北京', '上海', '广州', '深圳'])
const mergedGoal = brandData.budget
  ? `认知度 ≥80% · 预算 ${brandData.budget}万`
  : (parsed.budget ? `认知度 ≥80% · 预算 ${parsed.budget}` : '认知度 ≥60% · 私域会员 ≥50万')
const mergedCycle = brandData.period
  ? `${brandData.period} 个月（${brandData.period * 4} 周）`
  : (parsed.duration ?? '3 个月（12 周）')
```

### useChat 暴露 latestBrandInput

返回值增加：

```ts
const latestBrandInput = useMemo(() => getLatestBrandInput(messages), [messages])
```

### wk-head 头部同步

brand 名称、productLine、cycle 使用合并后的受控 state，不再硬编码尾部文案。

### 影响范围

- **ScreenChat.tsx** — 按钮文案/排序、onNavigate 多传 brandData
- **MobileWorkbenchPage.tsx** — 暂存 pendingBriefBrandData、透传 new prop
- **ScreenBrief.tsx** — 新增 initialBrandData prop、合并逻辑、受控 state 使用合并结果
- **useChat.ts** — 暴露 latestBrandInput
