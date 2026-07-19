// OpenSpec: openspec/changes/activity-planning
// in_scope id: activity-planning
// 移动端活动规划详情覆盖屏 — 毛玻璃顶栏 + 候选赛事卡 + 活动热度 + 场馆 + 建议。
// 数据按 activity_planning_id 从后端拉取，刷新后仍可用。
import { useEffect, useState } from 'react'
import { fetchActivityResult, ActivityResultNotFoundError, type ActivityPlanningResult } from '../../api/activityPlanning'

interface ScreenActivityPlanningProps {
  activityId: string
  fallbackTitle?: string
  onBack: () => void
}

type LoadState = 'loading' | 'ok' | 'expired' | 'error'

export function ScreenActivityPlanning({ activityId, fallbackTitle, onBack }: ScreenActivityPlanningProps) {
  const [state, setState] = useState<LoadState>('loading')
  const [result, setResult] = useState<ActivityPlanningResult | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const data = await fetchActivityResult(activityId)
        if (cancelled) return
        setResult(data)
        setState('ok')
      } catch (err) {
        if (cancelled) return
        setState(err instanceof ActivityResultNotFoundError ? 'expired' : 'error')
      }
    })()
    return () => { cancelled = true }
  }, [activityId])

  const title = result?.sport_type ? `${result.sport_type}活动规划` : fallbackTitle || '活动规划'

  return (
    <div className="map-screen">
      <div className="map-topbar">
        <button type="button" className="map-back" onClick={onBack} aria-label="返回">‹</button>
        <div className="map-topbar-text">
          <div className="map-topbar-title">{title}</div>
          {result && <div className="map-topbar-sub">{result.city} · {result.candidates.length} 个候选赛事</div>}
        </div>
      </div>

      <div className="map-body">
        {state === 'loading' && (
          <div className="map-skeleton-wrap" aria-label="加载中">
            <div className="map-skeleton" style={{ height: 140 }} />
            <div className="map-skeleton" style={{ height: 90 }} />
            <div className="map-skeleton" style={{ height: 100 }} />
          </div>
        )}

        {(state === 'expired' || state === 'error') && (
          <div className="map-empty">
            <span className="map-empty-icon">{state === 'expired' ? '🗂' : '⚠'}</span>
            <p className="map-empty-text">
              {state === 'expired' ? '活动规划数据已过期，请重新规划' : '活动详情加载失败，请稍后重试'}
            </p>
            <button type="button" className="map-empty-back" onClick={onBack}>返回聊天</button>
          </div>
        )}

        {state === 'ok' && result && (
          <div className="map-cards">
            {/* 候选赛事 */}
            {result.candidates.length > 0 && (
              <div className="map-card">
                <div className="map-card-head">候选赛事<span className="map-tag">{result.candidates.length} 个</span></div>
                <div className="map-tournaments">
                  {result.candidates.map((t, i) => (
                    <div key={i} className="map-tournament">
                      <div className="map-t-name">{t.name}</div>
                      <div className="map-t-meta">{t.scale} · {t.frequency}{!t.exact_match && ' · 推荐'}</div>
                      {t.sponsorship_options.length > 0 && (
                        <div className="map-t-chips">
                          {t.sponsorship_options.map((s, j) => (
                            <span key={j} className="map-t-chip">{s}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 城市活动热度 */}
            {result.events_summary && (
              <div className="map-card">
                <div className="map-card-head">城市活动热度<span className="map-tag">{result.city}</span></div>
                <div className="map-stats">
                  <div className="map-stat"><span className="map-stat-value">{result.events_summary.monthly}</span><span className="map-stat-label">月均活动</span></div>
                  <div className="map-stat"><span className="map-stat-value">{result.events_summary.avg_participants}</span><span className="map-stat-label">平均参与人数</span></div>
                </div>
                {result.events_summary.categories.length > 0 && (
                  <div className="map-t-chips">
                    {result.events_summary.categories.map((c, j) => (
                      <span key={j} className="map-t-chip">{c}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 场馆资源 */}
            {result.venues_summary && (
              <div className="map-card">
                <div className="map-card-head">场馆资源<span className="map-tag">{result.venues_summary.count} 个</span></div>
                <div className="map-stat-line">平均容量：{result.venues_summary.capacity}</div>
                {result.venues_summary.types.length > 0 && (
                  <div className="map-t-chips">
                    {result.venues_summary.types.map((t, j) => (
                      <span key={j} className="map-t-chip">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 建议 */}
            {result.suggestion && (
              <div className="map-suggestion">
                <span className="map-suggestion-icon" aria-hidden="true">💡</span>
                <span>{result.suggestion}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
