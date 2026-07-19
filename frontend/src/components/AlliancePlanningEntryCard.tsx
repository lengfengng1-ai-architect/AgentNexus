import './alliance-planning-entry.css'

interface AlliancePlanningEntryCardProps {
  result: Record<string, unknown>
  onOpen: () => void
}

export function AlliancePlanningEntryCard({ result, onOpen }: AlliancePlanningEntryCardProps) {
  const category = (result.category as string) || ''
  const city = (result.city as string) || ''
  const leagues = (result.leagues as { count: number; top_leagues: string[] }) | null
  const recruitments = (result.recruitments as { title: string; type: string; target_count: number }[]) || []
  const suggestion = (result.suggestion as string) || ''

  return (
    <div className="ale-card">
      <div className="ale-title-row">
        <span className="ale-title-icon" aria-hidden="true">🤝</span>
        <div className="ale-title-text">
          <div className="ale-title">{category ? `${category}盟域规划` : '盟域规划'}</div>
          <div className="ale-sub">
            已完成{leagues ? ` · ${leagues.count} 个盟域` : ''}{city ? ` · ${city}` : ''}
          </div>
        </div>
      </div>

      {leagues && leagues.top_leagues.length > 0 && (
        <div className="ale-leagues">
          {leagues.top_leagues.slice(0, 3).map((l, i) => (
            <span key={i} className="ale-league-chip">{l}</span>
          ))}
        </div>
      )}

      {recruitments.length > 0 && (
        <div className="ale-recruit-summary">
          招募岗位：{recruitments.map(r => `${r.type} ${r.target_count}个`).join(' · ')}
        </div>
      )}

      {suggestion && (
        <div className="ale-suggestion">
          <span className="ale-suggestion-icon" aria-hidden="true">💡</span>
          <span>{suggestion}</span>
        </div>
      )}

      <button type="button" className="ale-cta" onClick={onOpen}>
        查看盟域详情
        <span className="ale-cta-arrow" aria-hidden="true">›</span>
      </button>
    </div>
  )
}
