// CompetitorAnalysisEntryCard — 竞品分析完成态摘要卡片
// Corresponding OpenSpec: openspec/changes/competitor-analysis
// in_scope id: competitor-analysis
// 数据全部来自消息的 competitorAnalysisResult（SSE result 已存），不请求后端。
import './competitor-analysis-entry.css'

interface CompetitorAnalysisEntryCardProps {
  result: Record<string, unknown>
  onOpen: () => void
}

export function CompetitorAnalysisEntryCard({ result, onOpen }: CompetitorAnalysisEntryCardProps) {
  const category = (result.category as string) || ''
  const brandName = (result.brand_name as string) || null
  const competitors = (result.competitors as Array<Record<string, unknown>>) || []
  const marketOverview = (result.market_overview as string) || ''
  const suggestion = (result.suggestion as string) || ''

  return (
    <div className="cae-card">
      <div className="cae-title-row">
        <span className="cae-title-icon" aria-hidden="true">🔍</span>
        <div className="cae-title-text">
          <div className="cae-title">{category}竞品分析{brandName ? ` - ${brandName}` : ''}</div>
          <div className="cae-sub">
            已完成
            {competitors.length > 0 ? ` · 发现 ${competitors.length} 个竞品` : ''}
          </div>
        </div>
      </div>

      {marketOverview && (
        <div className="cae-overview">{marketOverview}</div>
      )}

      {competitors.length > 0 && (
        <div className="cae-competitors">
          {competitors.slice(0, 3).map((c, i) => (
            <div key={i} className="cae-competitor">
              <div className="cae-competitor-name">{c.name as string}</div>
              {(c.positioning as string) && <div className="cae-competitor-meta">{c.positioning as string}</div>}
            </div>
          ))}
          {competitors.length > 3 && (
            <div className="cae-more">等 {competitors.length} 个竞品</div>
          )}
        </div>
      )}

      {suggestion && (
        <div className="cae-suggestion">
          <span className="cae-suggestion-icon" aria-hidden="true">💡</span>
          <span>{suggestion}</span>
        </div>
      )}

      <button type="button" className="cae-cta" onClick={onOpen}>
        查看完整竞品分析
        <span className="cae-cta-arrow" aria-hidden="true">›</span>
      </button>
    </div>
  )
}
