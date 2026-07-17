// OpenSpec: openspec/changes/mobile-research-report-page
// in_scope id: market-analysis
// 移动端调研完成态摘要卡片：市场名 + 关键数字 + 机会评估 + 结果页入口按钮。
// 数据全部来自消息的 marketResearchResult（SSE result 已存），不请求后端。
import './research-report-entry.css'

interface ResearchReportEntryCardProps {
  result: Record<string, unknown>
  onOpen: () => void
}

function num(v: unknown): string | null {
  if (typeof v !== 'number' || !Number.isFinite(v)) return null
  return v >= 10000 ? `${(v / 10000).toLocaleString()}万亿` : v.toLocaleString()
}

/** 统计有数据的板块数（规模/趋势/用户/竞品/机会/报告），用于副标题 */
function countSections(result: Record<string, unknown>): number {
  const ms = (result.market_size as Record<string, unknown>) || {}
  const hasSize = ['tam', 'sam', 'som'].some(k => {
    const seg = ms[k] as Record<string, unknown> | undefined
    return seg?.value != null
  }) || ms.cagr != null
  const opp = (result.opportunity_assessment as Record<string, unknown>) || {}
  const hasOpp = !!(opp.market_attractiveness || opp.competition_intensity || opp.entry_difficulty)
  return [
    hasSize,
    ((result.trend_signals as unknown[]) || []).length > 0,
    ((result.target_users as unknown[]) || []).length > 0,
    ((result.competitors as unknown[]) || []).length > 0,
    hasOpp,
    !!(result.full_report as string),
  ].filter(Boolean).length
}

const LEVEL_LABEL: Record<string, string> = { high: '高', medium: '中', low: '低' }
const LEVEL_CLASS: Record<string, string> = { high: 'rre-badge-high', medium: 'rre-badge-mid', low: 'rre-badge-low' }

export function ResearchReportEntryCard({ result, onOpen }: ResearchReportEntryCardProps) {
  const marketName = (result.market_name as string) || ''
  const ms = (result.market_size as Record<string, unknown>) || {}
  const tam = (ms.tam as Record<string, unknown>) || {}
  const tamText = num(tam.value)
  const tamUnit = (tam.unit as string) || '亿元'
  const cagr = typeof ms.cagr === 'number' ? ms.cagr : null
  const opp = (result.opportunity_assessment as Record<string, unknown>) || {}
  const badges: { label: string; level: string }[] = (
    [
      ['吸引力', opp.market_attractiveness],
      ['竞争', opp.competition_intensity],
      ['进入难度', opp.entry_difficulty],
    ] as const
  )
    .filter(([, v]) => typeof v === 'string' && v in LEVEL_LABEL)
    .map(([label, v]) => ({ label, level: v as string }))

  const sections = countSections(result)

  return (
    <div className="rre-card">
      <div className="rre-title-row">
        <span className="rre-title-icon" aria-hidden="true">📊</span>
        <div className="rre-title-text">
          <div className="rre-title">{marketName ? `${marketName}调研报告` : '市场调研报告'}</div>
          <div className="rre-sub">已完成{sections > 0 ? ` · ${sections} 个板块` : ''}</div>
        </div>
      </div>

      {(tamText || cagr !== null) && (
        <div className="rre-nums">
          {tamText && (
            <div className="rre-num">
              <span className="rre-num-value">{tamText}</span>
              <span className="rre-num-unit">{tamUnit}</span>
              <span className="rre-num-label">市场规模 TAM{tam.year ? `（${String(tam.year)}）` : ''}</span>
            </div>
          )}
          {cagr !== null && (
            <div className="rre-num">
              <span className="rre-num-value">{cagr}%</span>
              <span className="rre-num-label">年复合增长率{(ms.cagr_period as string) ? `（${ms.cagr_period as string}）` : ''}</span>
            </div>
          )}
        </div>
      )}

      {badges.length > 0 && (
        <div className="rre-badges">
          {badges.map(b => (
            <span key={b.label} className={`rre-badge ${LEVEL_CLASS[b.level]}`}>
              {b.label} {LEVEL_LABEL[b.level]}
            </span>
          ))}
        </div>
      )}

      <button type="button" className="rre-cta" onClick={onOpen}>
        查看完整调研报告
        <span className="rre-cta-arrow" aria-hidden="true">›</span>
      </button>
    </div>
  )
}
