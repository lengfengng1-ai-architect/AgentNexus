// OpenSpec: openspec/changes/budget-analysis
// in_scope id: budget-analysis
// 移动端预算评估详情覆盖屏 — 毛玻璃顶栏 + 完整预算分配可视化 + KPI 栅格 + 时间线 + 建议。
// 数据按 budget_assessment_id 从后端拉取（刷新后仍可用），拉取失败显示占位。
import { useEffect, useState } from 'react'
import { fetchBudgetResult, BudgetResultNotFoundError, type BudgetAssessmentResult } from '../../api/budgetAnalysis'

interface ScreenBudgetAssessmentProps {
  budgetId: string
  /** 顶栏标题兜底（消息里的 category），拉取成功后被 result.category 覆盖 */
  fallbackTitle?: string
  onBack: () => void
}

type LoadState = 'loading' | 'ok' | 'expired' | 'error'

const ALLOC_COLORS = ['#1677ff', '#52c41a', '#fa8c16', '#eb2f96', '#722ed1']

export function ScreenBudgetAssessment({ budgetId, fallbackTitle, onBack }: ScreenBudgetAssessmentProps) {
  const [state, setState] = useState<LoadState>('loading')
  const [result, setResult] = useState<BudgetAssessmentResult | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const data = await fetchBudgetResult(budgetId)
        if (cancelled) return
        setResult(data)
        setState('ok')
      } catch (err) {
        if (cancelled) return
        setState(err instanceof BudgetResultNotFoundError ? 'expired' : 'error')
      }
    })()
    return () => { cancelled = true }
  }, [budgetId])

  const title = result?.category ? `${result.category}预算评估` : fallbackTitle || '预算评估'
  const maxPct = result ? Math.max(...result.allocations.map(a => a.percentage), 1) : 1

  return (
    <div className="mbu-screen">
      <div className="mbu-topbar">
        <button type="button" className="mbu-back" onClick={onBack} aria-label="返回">‹</button>
        <div className="mbu-topbar-text">
          <div className="mbu-topbar-title">{title}</div>
          {result && (
            <div className="mbu-topbar-sub">
              {result.total_budget}万 · {result.period_months}个月 · {result.city}
            </div>
          )}
        </div>
      </div>

      <div className="mbu-body">
        {state === 'loading' && (
          <div className="mbu-skeleton-wrap" aria-label="加载中">
            <div className="mbu-skeleton" style={{ height: 160 }} />
            <div className="mbu-skeleton" style={{ height: 110 }} />
            <div className="mbu-skeleton" style={{ height: 120 }} />
          </div>
        )}

        {(state === 'expired' || state === 'error') && (
          <div className="mbu-empty">
            <span className="mbu-empty-icon">{state === 'expired' ? '🗂' : '⚠'}</span>
            <p className="mbu-empty-text">
              {state === 'expired' ? '预算评估数据已过期，请重新评估' : '预算详情加载失败，请稍后重试'}
            </p>
            <button type="button" className="mbu-empty-back" onClick={onBack}>返回聊天</button>
          </div>
        )}

        {state === 'ok' && result && (
          <div className="mbu-cards">
            {/* 预算分配可视化 */}
            <div className="mbu-card">
              <div className="mbu-card-head">预算分配<span className="mbu-tag">{result.total_budget} 万元</span></div>
              <div className="mbu-allocs">
                {result.allocations.map((a, i) => (
                  <div key={a.category} className="mbu-alloc">
                    <div className="mbu-alloc-head">
                      <span className="mbu-alloc-cat">{a.category}</span>
                      <span className="mbu-alloc-val">{a.amount}万 · {a.percentage}%</span>
                    </div>
                    <div className="mbu-alloc-track">
                      <div
                        className="mbu-alloc-bar"
                        style={{ width: `${(a.percentage / maxPct) * 100}%`, background: ALLOC_COLORS[i % ALLOC_COLORS.length] }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* KPI 预估 */}
            {Object.keys(result.kpis).length > 0 && (
              <div className="mbu-card">
                <div className="mbu-card-head">KPI 预估<span className="mbu-tag">预估</span></div>
                <div className="mbu-kpis">
                  {Object.entries(result.kpis).map(([name, value]) => (
                    <div key={name} className="mbu-kpi">
                      <div className="mbu-kpi-value">{value}</div>
                      <div className="mbu-kpi-label">{name}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 时间线 */}
            {result.timeline.length > 0 && (
              <div className="mbu-card">
                <div className="mbu-card-head">执行时间线<span className="mbu-tag">{result.period_months}个月</span></div>
                <div className="mbu-timeline">
                  {result.timeline.map((t, i) => (
                    <div key={i} className="mbu-tl-item">{t}</div>
                  ))}
                </div>
              </div>
            )}

            {/* 一句话建议 */}
            {result.suggestion && (
              <div className="mbu-suggestion">
                <span className="mbu-suggestion-icon" aria-hidden="true">💡</span>
                <span>{result.suggestion}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
