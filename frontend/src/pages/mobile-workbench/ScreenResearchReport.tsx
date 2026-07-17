// OpenSpec: openspec/changes/mobile-research-report-page
// in_scope id: market-analysis
// 移动端调研结果覆盖屏 — 毛玻璃顶栏 + 长滚动结构化板块。
// 数据总是从后端按 researchId 拉取（消息里只存轻量摘要字段），
// 拉取失败显示"报告已过期"占位。
import { useEffect, useState } from 'react'
import { fetchResearchResult, ResearchResultNotFoundError } from '../../api/marketAnalysis'
import { MarketResearchResultCards } from '../../components/MarketResearchResultCards'

interface ScreenResearchReportProps {
  researchId: string
  /** 顶栏标题兜底（消息里存的 marketName），拉取成功后被 result.market_name 覆盖 */
  fallbackTitle?: string
  onBack: () => void
}

type LoadState = 'loading' | 'ok' | 'expired' | 'error'

export function ScreenResearchReport({ researchId, fallbackTitle, onBack }: ScreenResearchReportProps) {
  const [state, setState] = useState<LoadState>('loading')
  const [result, setResult] = useState<Record<string, unknown> | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchResearchResult(researchId)
      .then(data => {
        if (cancelled) return
        setResult(data.result)
        setState('ok')
      })
      .catch(err => {
        if (cancelled) return
        setState(err instanceof ResearchResultNotFoundError ? 'expired' : 'error')
      })
    return () => { cancelled = true }
  }, [researchId])

  const marketName = (result?.market_name as string) || fallbackTitle || '市场调研'

  // 副标题：板块构成统计
  const subtitle = (() => {
    if (!result) return ''
    const parts: string[] = []
    const trends = (result.trend_signals as unknown[]) || []
    const users = (result.target_users as unknown[]) || []
    const comps = (result.competitors as unknown[]) || []
    if (trends.length) parts.push(`${trends.length}个趋势`)
    if (users.length) parts.push(`${users.length}类用户`)
    if (comps.length) parts.push(`${comps.length}家竞品`)
    return parts.join(' · ')
  })()

  return (
    <div className="mrr-screen">
      {/* 毛玻璃 sticky 顶栏 */}
      <div className="mrr-topbar">
        <button type="button" className="mrr-back" onClick={onBack} aria-label="返回">‹</button>
        <div className="mrr-topbar-text">
          <div className="mrr-topbar-title">{marketName}</div>
          {subtitle && <div className="mrr-topbar-sub">{subtitle}</div>}
        </div>
      </div>

      {/* 内容区 */}
      <div className="mrr-body">
        {state === 'loading' && (
          <div className="mrr-skeleton-wrap" aria-label="加载中">
            <div className="mrr-skeleton mrr-skeleton-hero" />
            <div className="mrr-skeleton" style={{ height: 96 }} />
            <div className="mrr-skeleton" style={{ height: 140 }} />
            <div className="mrr-skeleton" style={{ height: 110 }} />
          </div>
        )}

        {(state === 'expired' || state === 'error') && (
          <div className="mrr-empty">
            <span className="mrr-empty-icon">🗂</span>
            <p className="mrr-empty-text">
              {state === 'expired' ? '报告数据已过期，请重新调研' : '报告加载失败，请稍后重试'}
            </p>
            <button type="button" className="mrr-empty-back" onClick={onBack}>返回聊天</button>
          </div>
        )}

        {state === 'ok' && result && (
          <div className="mrr-cards">
            <MarketResearchResultCards result={result} variant="mobile" />
          </div>
        )}
      </div>
    </div>
  )
}
