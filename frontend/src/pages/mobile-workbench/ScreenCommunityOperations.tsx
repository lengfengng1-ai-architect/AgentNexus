// ScreenCommunityOperations — 社群运营详情覆盖屏
import { useEffect, useState } from 'react'
import { fetchCommunityResult, CommunityResultNotFoundError, type CommunityOperationsResult } from '../../api/communityOperations'

interface ScreenCommunityOperationsProps {
  coId: string
  fallbackTitle?: string
  onBack: () => void
}

type LoadState = 'loading' | 'ok' | 'expired' | 'error'

export function ScreenCommunityOperations({ coId, fallbackTitle, onBack }: ScreenCommunityOperationsProps) {
  const [state, setState] = useState<LoadState>('loading')
  const [result, setResult] = useState<CommunityOperationsResult | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const data = await fetchCommunityResult(coId)
        if (cancelled) return
        setResult(data)
        setState('ok')
      } catch (err) {
        if (cancelled) return
        setState(err instanceof CommunityResultNotFoundError ? 'expired' : 'error')
      }
    })()
    return () => { cancelled = true }
  }, [coId])

  const title = result?.category ? `${result.category}社群运营（${result.city}）` : fallbackTitle || '社群运营'

  return (
    <div className="mbu-screen">
      <div className="mbu-topbar">
        <button type="button" className="mbu-back" onClick={onBack} aria-label="返回">‹</button>
        <div className="mbu-topbar-text">
          <div className="mbu-topbar-title">{title}</div>
          {result && (
            <div className="mbu-topbar-sub">
              {result.content_plan.length > 0 ? `${result.content_plan.length} 项内容` : ''}
              {result.operation_activities.length > 0 ? ` · ${result.operation_activities.length} 项活动` : ''}
            </div>
          )}
        </div>
      </div>

      <div className="mbu-body">
        {state === 'loading' && (
          <div className="mbu-skeleton-wrap" aria-label="加载中">
            <div className="mbu-skeleton" style={{ height: 100 }} />
            <div className="mbu-skeleton" style={{ height: 140 }} />
            <div className="mbu-skeleton" style={{ height: 120 }} />
          </div>
        )}

        {(state === 'expired' || state === 'error') && (
          <div className="mbu-empty">
            <span className="mbu-empty-icon">{state === 'expired' ? '🗂' : '⚠'}</span>
            <p className="mbu-empty-text">
              {state === 'expired' ? '社群运营数据已过期，请重新规划' : '社群详情加载失败，请稍后重试'}
            </p>
            <button type="button" className="mbu-empty-back" onClick={onBack}>返回聊天</button>
          </div>
        )}

        {state === 'ok' && result && (
          <div className="mbu-cards">
            {/* 社群定位 */}
            <div className="mbu-card">
              <div className="mbu-card-head">社群定位</div>
              <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--fg-soft)', marginBottom: 8 }}>{result.community_positioning}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>目标人群：{result.target_members}</div>
            </div>

            {/* 内容规划 */}
            {result.content_plan.length > 0 && (
              <div className="mbu-card">
                <div className="mbu-card-head">内容规划<span className="mbu-tag">{result.content_plan.length}项</span></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {result.content_plan.map((c, i) => (
                    <div key={i} style={{ padding: 10, borderRadius: 8, background: 'var(--surface)' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', marginBottom: 3 }}>{c.content_type}</div>
                      <div style={{ fontSize: 11, color: 'var(--fg-soft)', marginBottom: 2 }}>{c.description}</div>
                      <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 500 }}>频次：{c.frequency}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 运营活动 */}
            {result.operation_activities.length > 0 && (
              <div className="mbu-card">
                <div className="mbu-card-head">运营活动<span className="mbu-tag">{result.operation_activities.length}项</span></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {result.operation_activities.map((a, i) => (
                    <div key={i} style={{ padding: 10, borderRadius: 8, background: 'var(--surface)' }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg)', marginBottom: 3 }}>{a.activity_name}</div>
                      <div style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 500, marginBottom: 2 }}>目标：{a.goal}</div>
                      <div style={{ fontSize: 11, color: 'var(--fg-soft)' }}>{a.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* KPI 目标 */}
            {Object.keys(result.kpi_targets).length > 0 && (
              <div className="mbu-card">
                <div className="mbu-card-head">KPI 目标<span className="mbu-tag">预估</span></div>
                <div className="mbu-kpis">
                  {Object.entries(result.kpi_targets).map(([name, value]) => (
                    <div key={name} className="mbu-kpi">
                      <div className="mbu-kpi-value">{value}</div>
                      <div className="mbu-kpi-label">{name}</div>
                    </div>
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
