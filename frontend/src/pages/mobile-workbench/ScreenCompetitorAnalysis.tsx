// ScreenCompetitorAnalysis — 竞品分析详情覆盖屏
// Corresponding OpenSpec: openspec/changes/competitor-analysis
// in_scope id: competitor-analysis
// 毛玻璃顶栏 + 市场概况 + 竞品对比 + 策略建议 + 数据来源
import { useEffect, useState } from 'react'
import { fetchCompetitorResult, CompetitorResultNotFoundError, type CompetitorAnalysisResult } from '../../api/competitorAnalysis'

interface ScreenCompetitorAnalysisProps {
  caId: string
  fallbackTitle?: string
  onBack: () => void
}

type LoadState = 'loading' | 'ok' | 'expired' | 'error'

export function ScreenCompetitorAnalysis({ caId, fallbackTitle, onBack }: ScreenCompetitorAnalysisProps) {
  const [state, setState] = useState<LoadState>('loading')
  const [result, setResult] = useState<CompetitorAnalysisResult | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const data = await fetchCompetitorResult(caId)
        if (cancelled) return
        setResult(data)
        setState('ok')
      } catch (err) {
        if (cancelled) return
        setState(err instanceof CompetitorResultNotFoundError ? 'expired' : 'error')
      }
    })()
    return () => { cancelled = true }
  }, [caId])

  const title = result?.category ? `${result.category}竞品分析${result.brand_name ? ` - ${result.brand_name}` : ''}` : fallbackTitle || '竞品分析'

  return (
    <div className="mbu-screen">
      <div className="mbu-topbar">
        <button type="button" className="mbu-back" onClick={onBack} aria-label="返回">‹</button>
        <div className="mbu-topbar-text">
          <div className="mbu-topbar-title">{title}</div>
          {result && (
            <div className="mbu-topbar-sub">
              {result.competitors.length > 0 ? `发现 ${result.competitors.length} 个竞品` : ''}
            </div>
          )}
        </div>
      </div>

      <div className="mbu-body">
        {state === 'loading' && (
          <div className="mbu-skeleton-wrap" aria-label="加载中">
            <div className="mbu-skeleton" style={{ height: 100 }} />
            <div className="mbu-skeleton" style={{ height: 200 }} />
            <div className="mbu-skeleton" style={{ height: 80 }} />
          </div>
        )}

        {(state === 'expired' || state === 'error') && (
          <div className="mbu-empty">
            <span className="mbu-empty-icon">{state === 'expired' ? '🗂' : '⚠'}</span>
            <p className="mbu-empty-text">
              {state === 'expired' ? '竞品分析数据已过期，请重新分析' : '竞品详情加载失败，请稍后重试'}
            </p>
            <button type="button" className="mbu-empty-back" onClick={onBack}>返回聊天</button>
          </div>
        )}

        {state === 'ok' && result && (
          <div className="mbu-cards">
            {/* 市场概况 */}
            {result.market_overview && (
              <div className="mbu-card">
                <div className="mbu-card-head">市场概况</div>
                <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--fg-soft)' }}>{result.market_overview}</div>
              </div>
            )}

            {/* 竞品对比 */}
            {result.competitors.length > 0 && (
              <div className="mbu-card">
                <div className="mbu-card-head">竞品对比<span className="mbu-tag">{result.competitors.length}个</span></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {result.competitors.map((c, i) => (
                    <div key={i} style={{ padding: 10, borderRadius: 8, background: 'var(--surface)' }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--fg)', marginBottom: 4 }}>{c.name}</div>
                      {c.positioning && <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 500, marginBottom: 4 }}>{c.positioning}</div>}
                      {c.price_range && <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>价格：{c.price_range}</div>}
                      {c.product_matrix && c.product_matrix.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                          {c.product_matrix.map((p, j) => (
                            <span key={j} style={{ fontSize: 10, color: 'var(--fg-soft)', background: 'var(--accent-softer)', border: '1px solid var(--accent-border)', padding: '2px 8px', borderRadius: 999 }}>{p}</span>
                          ))}
                        </div>
                      )}
                      {c.marketing_channels && c.marketing_channels.length > 0 && (
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>渠道：{c.marketing_channels.join('、')}</div>
                      )}
                      {c.recent_moves && (
                        <div style={{ fontSize: 11, color: 'var(--fg-soft)', marginTop: 4, lineHeight: 1.5 }}>动态：{c.recent_moves}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 策略建议 */}
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
