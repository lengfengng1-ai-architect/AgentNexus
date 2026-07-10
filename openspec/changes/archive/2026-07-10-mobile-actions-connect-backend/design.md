## 移动端行动建议屏对接后端数据

### 架构

```
MobileWorkbenchPage (父组件)
  ├─ useMobilePlanRun()  ← hook 提升到此处
  ├─ ScreenGenerate ← 接收 planRun prop
  └─ ScreenActions  ← 接收 outputs prop
      └─ buildCards(outputs) → 动态生成卡片
```

### 数据流

1. `MobileWorkbenchPage` 调用 `useMobilePlanRun()`，持有完整的流水线状态
2. 方案生成完成后，`outputs` 中包含 `plan_data_query`、`action_recommendations`、`strategy_generation`、`fitness_analysis`、`execution_planning` 等数据
3. 跳转到 ScreenActions 时，`outputs` 通过 props 传入
4. `buildCards()` 函数从 outputs 提取数据，生成结构化卡片列表
5. 界面框架保持不变（acard / filters / cta-line 样式）

### 卡片数据结构

```typescript
interface CardItem {
  id: string              // 唯一标识
  type: string            // 卡片类型标签（如"赛事活动""合作招募""小红书"）
  stage: string           // 阶段标签（筹备期/预热期/爆发期/收割期）
  thumb: string           // 缩略图文字
  title: string           // 卡片标题
  meta: string            // 详细信息描述
  time: string            // 时间/操作指引
  category: 'platform' | 'external'  // 平台内 or 外部推广
}
```

### 卡片映射规则

| 卡片 | 数据来源 | 展示条件 |
|------|---------|---------|
| 赛事活动 | `tournament.available_tournaments` + `fitness_analysis.primary_sport` | primarySport 存在且有赛事 |
| 合作招募 | `cooperation_center.recruitments` + `execution_planning.leagues_plan` | 有招募数据 |
| 排行榜 | `leaderboard` + `budget_kpi.kpis` | leaderboard 存在 |
| 奖杯定制 | `trophy` + `fitness_analysis.primary_sport` | primarySport 存在且有奖杯类型 |
| 促销活动 | `sale.available_types` + `group_buy.available_types` | 有促销或拼团数据 |
| 达人合作 | `influencers` + `execution_planning.influencer_plan` | influencers 存在 |
| 小红书 | `brand_name` + `strategy_generation.positioning` | brandName 和 positioning 都存在 |
| 抖音 | `brand_name` + `strategy_generation.marketing_goal` | brandName 和 marketGoal 都存在 |

### 边界情况

- **无数据时**：显示空态提示"请先在方案生成屏完成方案生成"
- **卡片过多时**：feed 容器自动滚动
- **数据缺失时**：单个卡片因为条件不满足不会渲染，不影响其他卡片

### 接口（类型导出）

`useMobilePlanRun.ts` 新增 `MobilePlanRunAPI` 接口导出：

```typescript
export interface MobilePlanRunAPI {
  status, steps, outputs, chapters, pausedSnapshot, error, isConnected, isLoading
  start, approve, reject, reset, restoreFromRunId
}
```
