// CommunityOperationsEntryCard — 社群运营完成态摘要卡片
import './community-operations-entry.css'

interface CommunityOperationsEntryCardProps {
  result: Record<string, unknown>
  onOpen: () => void
}

export function CommunityOperationsEntryCard({ result, onOpen }: CommunityOperationsEntryCardProps) {
  const category = (result.category as string) || ''
  const city = (result.city as string) || ''
  const positioning = (result.community_positioning as string) || ''
  const contentPlan = (result.content_plan as Array<Record<string, unknown>>) || []
  const operationActivities = (result.operation_activities as Array<Record<string, unknown>>) || []
  const suggestion = (result.suggestion as string) || ''

  return (
    <div className="coe-card">
      <div className="coe-title-row">
        <span className="coe-title-icon" aria-hidden="true">👥</span>
        <div className="coe-title-text">
          <div className="coe-title">{category}社群运营</div>
          <div className="coe-sub">
            已完成 · {city}
            {contentPlan.length > 0 ? ` · ${contentPlan.length} 项内容` : ''}
            {operationActivities.length > 0 ? ` · ${operationActivities.length} 项活动` : ''}
          </div>
        </div>
      </div>

      {positioning && (
        <div className="coe-positioning">{positioning}</div>
      )}

      {suggestion && (
        <div className="coe-suggestion">
          <span className="coe-suggestion-icon" aria-hidden="true">💡</span>
          <span>{suggestion}</span>
        </div>
      )}

      <button type="button" className="coe-cta" onClick={onOpen}>
        查看社群运营详情
        <span className="coe-cta-arrow" aria-hidden="true">›</span>
      </button>
    </div>
  )
}
