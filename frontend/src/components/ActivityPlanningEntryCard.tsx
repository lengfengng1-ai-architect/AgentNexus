// OpenSpec: openspec/changes/activity-planning
// in_scope id: activity-planning
// 移动端活动规划完成态摘要卡片：候选赛事数 + top 赛事摘要 + 一句话建议 + 详情页入口按钮。
import './activity-planning-entry.css'

interface ActivityPlanningEntryCardProps {
  result: Record<string, unknown>
  onOpen: () => void
}

export function ActivityPlanningEntryCard({ result, onOpen }: ActivityPlanningEntryCardProps) {
  const sportType = (result.sport_type as string) || ''
  const city = (result.city as string) || ''
  const candidates = (result.candidates as { name: string; scale: string; frequency: string; exact_match: boolean }[]) || []
  const suggestion = (result.suggestion as string) || ''
  const top = candidates[0]

  return (
    <div className="ape-card">
      <div className="ape-title-row">
        <span className="ape-title-icon" aria-hidden="true">🏆</span>
        <div className="ape-title-text">
          <div className="ape-title">{sportType ? `${sportType}活动规划` : '活动规划'}</div>
          <div className="ape-sub">
            已完成{candidates.length > 0 ? ` · ${candidates.length} 个候选赛事` : ''}{city ? ` · ${city}` : ''}
          </div>
        </div>
      </div>

      {top && (
        <div className="ape-top-event">
          <span className="ape-event-name">{top.name}</span>
          <span className="ape-event-scale">{top.scale} · {top.frequency}</span>
          {!top.exact_match && <span className="ape-event-note">推荐</span>}
        </div>
      )}

      {suggestion && (
        <div className="ape-suggestion">
          <span className="ape-suggestion-icon" aria-hidden="true">💡</span>
          <span>{suggestion}</span>
        </div>
      )}

      <button type="button" className="ape-cta" onClick={onOpen}>
        查看活动详情
        <span className="ape-cta-arrow" aria-hidden="true">›</span>
      </button>
    </div>
  )
}
