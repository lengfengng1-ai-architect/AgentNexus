import { useEffect, useState } from 'react'
import { fetchAllianceResult, AllianceResultNotFoundError, type AlliancePlanningResult } from '../../api/alliancePlanning'

interface ScreenAlliancePlanningProps {
  allianceId: string
  fallbackTitle?: string
  onBack: () => void
}

type LoadState = 'loading' | 'ok' | 'expired' | 'error'

export function ScreenAlliancePlanning({ allianceId, fallbackTitle, onBack }: ScreenAlliancePlanningProps) {
  const [state, setState] = useState<LoadState>('loading')
  const [result, setResult] = useState<AlliancePlanningResult | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const data = await fetchAllianceResult(allianceId)
        if (cancelled) return
        setResult(data); setState('ok')
      } catch (err) {
        if (cancelled) return
        setState(err instanceof AllianceResultNotFoundError ? 'expired' : 'error')
      }
    })()
    return () => { cancelled = true }
  }, [allianceId])

  const title = result?.category ? `${result.category}盟域规划` : fallbackTitle || '盟域规划'

  return (
    <div className="mal-screen">
      <div className="mal-topbar">
        <button type="button" className="mal-back" onClick={onBack} aria-label="返回">‹</button>
        <div className="mal-topbar-text">
          <div className="mal-topbar-title">{title}</div>
          {result && <div className="mal-topbar-sub">{result.city}{result.leagues ? ` · ${result.leagues.count} 个盟域` : ''}</div>}
        </div>
      </div>
      <div className="mal-body">
        {state === 'loading' && (
          <div className="mal-skeleton-wrap"><div className="mal-skeleton" style={{ height: 120 }} /><div className="mal-skeleton" style={{ height: 140 }} /><div className="mal-skeleton" style={{ height: 90 }} /></div>
        )}
        {(state === 'expired' || state === 'error') && (
          <div className="mal-empty"><span className="mal-empty-icon">{state === 'expired' ? '🗂' : '⚠'}</span><p className="mal-empty-text">{state === 'expired' ? '盟域规划数据已过期，请重新规划' : '盟域详情加载失败，请稍后重试'}</p><button type="button" className="mal-empty-back" onClick={onBack}>返回聊天</button></div>
        )}
        {state === 'ok' && result && (
          <div className="mal-cards">
            {result.leagues && (
              <div className="mal-card">
                <div className="mal-card-head">头部盟域<span className="mal-tag">{result.leagues.count} 个</span></div>
                <div className="mal-stat-line">平均 {result.leagues.avg_members} 成员/盟域</div>
                {result.leagues.top_leagues.length > 0 && (
                  <div className="mal-chips">{result.leagues.top_leagues.map((l, i) => <span key={i} className="mal-chip">{l}</span>)}</div>
                )}
              </div>
            )}
            {result.recruitments.length > 0 && (
              <div className="mal-card">
                <div className="mal-card-head">招募计划<span className="mal-tag">{result.recruitments.length} 项</span></div>
                <div className="mal-recruit-list">
                  {result.recruitments.map((r, i) => (
                    <div key={i} className="mal-recruit">
                      <div className="mal-recruit-title">{r.title}</div>
                      <div className="mal-recruit-meta">{r.type} · 目标 {r.target_count} 个</div>
                      {r.requirements.length > 0 && <div className="mal-recruit-req">{r.requirements.join('；')}</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {result.influencers && (
              <div className="mal-card">
                <div className="mal-card-head">达人矩阵<span className="mal-tag">{result.influencers.count} 位</span></div>
                <div className="mal-stat-line">平均报价：{result.influencers.avg_quote}</div>
                {Object.keys(result.influencers.tiers).length > 0 && (
                  <div className="mal-chips">{Object.entries(result.influencers.tiers).map(([k, v]) => <span key={k} className="mal-chip">{k} {v}</span>)}</div>
                )}
              </div>
            )}
            {result.suggestion && (
              <div className="mal-suggestion"><span className="mal-suggestion-icon" aria-hidden="true">💡</span><span>{result.suggestion}</span></div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
