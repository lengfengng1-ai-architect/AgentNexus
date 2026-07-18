// OpenSpec: openspec/changes/budget-analysis
// in_scope id: budget-analysis
// 移动端预算评估完成态摘要卡片：分配迷你条形图 + KPI 预估 + 一句话建议 + 详情页入口按钮。
// 数据全部来自消息的 budgetAssessmentResult（SSE result 已存），不请求后端。
import './budget-assessment-entry.css'

interface BudgetAssessmentEntryCardProps {
  result: Record<string, unknown>
  onOpen: () => void
}

const ALLOC_COLORS = ['#1677ff', '#52c41a', '#fa8c16', '#eb2f96', '#722ed1']

export function BudgetAssessmentEntryCard({ result, onOpen }: BudgetAssessmentEntryCardProps) {
  const category = (result.category as string) || ''
  const city = (result.city as string) || ''
  const totalBudget = typeof result.total_budget === 'number' ? result.total_budget : null
  const periodMonths = typeof result.period_months === 'number' ? result.period_months : null
  const allocations = (result.allocations as { category: string; amount: number; percentage: number }[]) || []
  const kpis = (result.kpis as Record<string, string>) || {}
  const suggestion = (result.suggestion as string) || ''

  // 取前 4 个 KPI 展示
  const kpiEntries = Object.entries(kpis).slice(0, 4)

  return (
    <div className="bae-card">
      <div className="bae-title-row">
        <span className="bae-title-icon" aria-hidden="true">💰</span>
        <div className="bae-title-text">
          <div className="bae-title">{category ? `${category}预算评估` : '预算评估'}</div>
          <div className="bae-sub">
            已完成
            {totalBudget !== null && periodMonths !== null ? ` · ${totalBudget}万 / ${periodMonths}个月` : ''}
            {city ? ` · ${city}` : ''}
          </div>
        </div>
      </div>

      {allocations.length > 0 && (
        <div className="bae-allocs">
          {allocations.map((a, i) => (
            <div key={a.category} className="bae-alloc">
              <div className="bae-alloc-head">
                <span className="bae-alloc-cat">{a.category}</span>
                <span className="bae-alloc-pct">{a.percentage}%</span>
              </div>
              <div className="bae-alloc-track">
                <div
                  className="bae-alloc-bar"
                  style={{ width: `${a.percentage}%`, background: ALLOC_COLORS[i % ALLOC_COLORS.length] }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {kpiEntries.length > 0 && (
        <div className="bae-kpis">
          {kpiEntries.map(([name, value]) => (
            <div key={name} className="bae-kpi">
              <div className="bae-kpi-value">{value}</div>
              <div className="bae-kpi-label">{name}</div>
            </div>
          ))}
        </div>
      )}

      {suggestion && (
        <div className="bae-suggestion">
          <span className="bae-suggestion-icon" aria-hidden="true">💡</span>
          <span>{suggestion}</span>
        </div>
      )}

      <button type="button" className="bae-cta" onClick={onOpen}>
        查看预算详情
        <span className="bae-cta-arrow" aria-hidden="true">›</span>
      </button>
    </div>
  )
}
