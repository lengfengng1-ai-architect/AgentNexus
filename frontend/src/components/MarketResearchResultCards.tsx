import { useState } from 'react'
import { marked } from 'marked'
import { CompetitiveLandscapeCard } from './CompetitiveLandscapeCard'

interface SourceItem {
  url: string
  title: string
}

interface ResultCardsProps {
  /** Serialized from MarketResearchResult model */
  result: Record<string, unknown>
  variant?: 'mobile'
}

/**
 * 市场分析结果卡片集合 — 流完成后的结构化信息展示
 *
 * Corresponding OpenSpec: openspec/changes/market-analysis-chat-display/specs/market-analysis/spec.md
 * Corresponding in_scope ID: market-analysis
 *
 * ponytail: 数据来自后端 MarketResearchResult 的序列化 dict。如果后续需要更强的类型安全，
 * 可以引入前端的 MarketResearchResult 类型定义，而不是用 Record<string, unknown>。
 */
export function MarketResearchResultCards({ result, variant }: ResultCardsProps) {
  const isMobile = variant === 'mobile'

  const marketName = (result.market_name as string) || ''
  const industry = (result.industry as string) || ''
  const category = (result.category as string) || ''
  const geoScope = (result.geo_scope as string) || ''
  const focusPeriod = (result.focus_period as string) || ''
  const description = (result.description as string) || ''

  const marketDefinition = (result.market_definition as Record<string, unknown>) || {}
  const marketSize = (result.market_size as Record<string, unknown>) || {}

  const trendSignals = (result.trend_signals as Array<Record<string, unknown>>) || []
  const targetUsers = (result.target_users as Array<Record<string, unknown>>) || []
  const competitors = (result.competitors as Array<Record<string, unknown>>) || []
  const opportunity = (result.opportunity_assessment as Record<string, unknown>) || {}
  const evidence = (result.evidence as Array<Record<string, unknown>>) || []
  const fullReport = (result.full_report as string) || ''

  return (
    <div className={`space-y-4 ${isMobile ? 'px-0' : ''}`}>
      {/* 市场摘要 */}
      {marketName && <MarketSummaryCard name={marketName} industry={industry} category={category} geo={geoScope} period={focusPeriod} description={description} isMobile={isMobile} />}

      {/* 市场规模 */}
      {hasSizeData(marketSize) && <MarketSizeCard size={marketSize} isMobile={isMobile} />}

      {/* 趋势信号 */}
      {trendSignals.length > 0 && <TrendSignalsCard signals={trendSignals} isMobile={isMobile} />}

      {/* 目标用户 */}
      {targetUsers.length > 0 && <TargetUsersCard users={targetUsers} isMobile={isMobile} />}

      {/* 竞争格局 */}
      {competitors.length > 0 && (
        <CompetitiveLandscapeCard
          variant={isMobile ? 'mobile' : undefined}
          data={{
            competitors: competitors.map((c: Record<string, unknown>) => ({
              brand_name: (c.brand_name as string) || (c.brand as string) || '',
              product_highlights: (c.product_or_service as string) || (c.product_highlights as string) || '',
              pricing: (c.pricing as string) || '',
              source: (c.company_name as string) || '',
            })),
          }}
        />
      )}

      {/* 机会评估 */}
      {hasOpportunityData(opportunity) && <OpportunityCard opportunity={opportunity} isMobile={isMobile} />}

      {/* 完整报告 */}
      {fullReport && (
        <div className={`rounded-xl border border-line bg-white ${isMobile ? 'p-3' : 'p-4'} shadow-sm sm:p-5`}>
          <div className="mb-3 flex items-center gap-2">
            <span className="text-lg">📄</span>
            <h3 className="font-semibold text-track">完整分析报告</h3>
          </div>
          <div className={`prose prose-sm max-w-none text-sm leading-relaxed text-track/80 ${isMobile ? 'break-all' : ''}`}
            dangerouslySetInnerHTML={{ __html: marked.parse(fullReport) }}
          />
        </div>
      )}

      {/* 证据来源 */}
      {evidence.length > 0 && <EvidenceCard evidence={evidence} isMobile={isMobile} />}
    </div>
  )
}

/* ── 子卡片组件 ───────────────────────────────────── */

function MarketSummaryCard({ name, industry, category, geo, period, description, isMobile }: {
  name: string; industry: string; category: string; geo: string; period: string; description: string; isMobile: boolean
}) {
  return (
    <div className={`rounded-xl border border-line bg-white ${isMobile ? 'p-3' : 'p-4'} shadow-sm sm:p-5`}>
      <div className="mb-3 flex items-center gap-2">
        <span className={`${isMobile ? 'text-base' : 'text-lg'}`}>📊</span>
        <h3 className={`font-semibold text-track ${isMobile ? 'text-sm' : ''}`}>市场摘要</h3>
      </div>
      <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <div><span className="block text-xs text-track/50">市场名称</span><span className="font-medium text-track">{name}</span></div>
        <div><span className="block text-xs text-track/50">所属行业</span><span className="font-medium text-track">{industry}</span></div>
        <div><span className="block text-xs text-track/50">市场类别</span><span className="font-medium text-track">{category}</span></div>
        <div><span className="block text-xs text-track/50">地理范围</span><span className="font-medium text-track">{geo}</span></div>
        {period && <div><span className="block text-xs text-track/50">研究周期</span><span className="font-medium text-track">{period}</span></div>}
      </div>
      {description && <p className="mt-2 text-xs text-track/60">{description}</p>}
    </div>
  )
}

function MarketSizeCard({ size, isMobile }: { size: Record<string, unknown>; isMobile: boolean }) {
  const tam = (size.tam as Record<string, unknown>) || {}
  const sam = (size.sam as Record<string, unknown>) || {}
  const som = (size.som as Record<string, unknown>) || {}
  const cagr = size.cagr
  const cagrPeriod = (size.cagr_period as string) || ''

  function seg(s: Record<string, unknown>, label: string) {
    const val = s.value
    const unit = (s.unit as string) || '亿元'
    const year = s.year || ''
    return (
      <div>
        <span className="block text-xs text-track/50">{label}</span>
        <span className={isMobile ? 'text-sm font-semibold text-track' : 'text-sm font-semibold text-track'}>
          {val != null ? `${typeof val === 'number' ? val.toLocaleString() : val} ${unit}` : '暂无数据'}
        </span>
        {year && <span className="ml-1 text-xs text-track/40">({year})</span>}
      </div>
    )
  }

  return (
    <div className={`rounded-xl border border-line bg-white ${isMobile ? 'p-3' : 'p-4'} shadow-sm sm:p-5`}>
      <div className="mb-3 flex items-center gap-2">
        <span className={`${isMobile ? 'text-base' : 'text-lg'}`}>📏</span>
        <h3 className="font-semibold text-track">市场规模</h3>
      </div>
      <div className={`grid ${isMobile ? 'grid-cols-1' : 'grid-cols-3'} gap-3`}>
        {seg(tam, 'TAM（潜在市场）')}
        {seg(sam, 'SAM（可达市场）')}
        {seg(som, 'SOM（可服务市场）')}
      </div>
      {cagr != null && (
        <div className="mt-2 text-sm">
          <span className="text-xs text-track/50">CAGR </span>
          <span className="font-semibold text-track">{cagr}%</span>
          {cagrPeriod && <span className="ml-1 text-xs text-track/40">({cagrPeriod})</span>}
        </div>
      )}
    </div>
  )
}

function TrendSignalsCard({ signals, isMobile }: { signals: Array<Record<string, unknown>>; isMobile: boolean }) {
  return (
    <div className={`rounded-xl border border-line bg-white ${isMobile ? 'p-3' : 'p-4'} shadow-sm sm:p-5`}>
      <div className="mb-3 flex items-center gap-2">
        <span className={`${isMobile ? 'text-base' : 'text-lg'}`}>📈</span>
        <h3 className="font-semibold text-track">趋势信号</h3>
      </div>
      <div className="space-y-3">
        {signals.map((s, i) => (
          <div key={i} className="border-b border-line pb-3 last:border-0 last:pb-0">
            <div className="flex items-start justify-between gap-2">
              <p className={`font-medium text-track ${isMobile ? 'text-xs' : 'text-sm'}`}>{s.title as string}</p>
              <ImpactBadge impact={s.impact as string} />
            </div>
            <p className="mt-0.5 text-xs text-track/60">{s.summary as string}</p>
            {s.signal_type && (
              <span className="mt-1 inline-block rounded-full bg-mist px-2 py-0.5 text-[10px] font-medium text-track/50">
                {(s.signal_type as string).includes('_') || (s.signal_type as string).length > 4 ? (s.signal_type as string) : `⚡${s.signal_type}`}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function ImpactBadge({ impact }: { impact: string }) {
  const colors: Record<string, string> = {
    positive: 'bg-green-100 text-green-700',
    negative: 'bg-red-100 text-red-700',
    neutral: 'bg-gray-100 text-gray-600',
  }
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium ${colors[impact] || colors.neutral}`}>
      {impact === 'positive' ? '利好' : impact === 'negative' ? '利空' : '中性'}
    </span>
  )
}

function TargetUsersCard({ users, isMobile }: { users: Array<Record<string, unknown>>; isMobile: boolean }) {
  return (
    <div className={`rounded-xl border border-line bg-white ${isMobile ? 'p-3' : 'p-4'} shadow-sm sm:p-5`}>
      <div className="mb-3 flex items-center gap-2">
        <span className={`${isMobile ? 'text-base' : 'text-lg'}`}>👤</span>
        <h3 className="font-semibold text-track">目标用户</h3>
      </div>
      <div className={`${isMobile ? 'space-y-3' : 'space-y-4'}`}>
        {users.map((u, i) => (
          <div key={i} className="border-b border-line pb-4 last:border-0 last:pb-0">
            <p className="text-sm font-medium text-track">{u.segment_name as string}</p>
            {u.user_profile && <p className="mt-0.5 text-xs text-track/60">{u.user_profile as string}</p>}
            {(u.core_scenarios as string[] | undefined) && (u.core_scenarios as string[]).length > 0 && (
              <div className="mt-2">
                <span className="text-[10px] font-medium text-track/50">使用场景：</span>
                <div className="mt-0.5 flex flex-wrap gap-1">
                  {(u.core_scenarios as string[]).map((s, j) => (
                    <span key={j} className="rounded-full bg-mist px-2 py-0.5 text-[10px] text-track/60">{s}</span>
                  ))}
                </div>
              </div>
            )}
            {(u.pain_points as string[] | undefined) && (u.pain_points as string[]).length > 0 && (
              <div className="mt-1.5">
                <span className="text-[10px] font-medium text-track/50">核心痛点：</span>
                <ul className="mt-0.5 list-inside list-disc text-xs text-track/60">
                  {(u.pain_points as string[]).map((p, j) => (
                    <li key={j}>{p}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function OpportunityCard({ opportunity, isMobile }: { opportunity: Record<string, unknown>; isMobile: boolean }) {
  const badgeColors: Record<string, string> = {
    high: 'bg-green-100 text-green-700',
    medium: 'bg-yellow-100 text-yellow-700',
    low: 'bg-red-100 text-red-700',
  }

  function levelBadge(val: unknown) {
    const s = String(val || '')
    return (
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${badgeColors[s] || badgeColors.medium}`}>
        {s === 'high' ? '高' : s === 'medium' ? '中' : s === 'low' ? '低' : s}
      </span>
    )
  }

  return (
    <div className={`rounded-xl border border-line bg-white ${isMobile ? 'p-3' : 'p-4'} shadow-sm sm:p-5`}>
      <div className="mb-3 flex items-center gap-2">
        <span className={`${isMobile ? 'text-base' : 'text-lg'}`}>🎯</span>
        <h3 className="font-semibold text-track">机会评估</h3>
      </div>
      <div className={`mb-3 flex ${isMobile ? 'flex-col gap-2' : 'flex-wrap gap-3'} text-sm`}>
        <div><span className="text-xs text-track/50">市场吸引力 </span>{levelBadge(opportunity.market_attractiveness)}</div>
        <div><span className="text-xs text-track/50">竞争强度 </span>{levelBadge(opportunity.competition_intensity)}</div>
        <div><span className="text-xs text-track/50">进入难度 </span>{levelBadge(opportunity.entry_difficulty)}</div>
      </div>
      {renderList(opportunity.key_opportunities as string[], '主要机会', '✅')}
      {renderList(opportunity.key_risks as string[], '主要风险', '⚠️')}
      {renderList(opportunity.recommended_actions as string[], '建议动作', '💡')}
      {renderList(opportunity.unknowns_to_verify as string[], '待人工核实', '🔍')}
    </div>
  )

  function renderList(items: string[] | undefined, label: string, icon: string) {
    if (!items || items.length === 0) return null
    return (
      <div className="mt-2">
        <span className="text-xs font-medium text-track/50">{icon} {label}</span>
        <ul className="mt-1 space-y-1">
          {items.map((item, i) => (
            <li key={i} className="flex items-start gap-1.5 text-xs text-track/70">
              <span className="mt-0.5">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    )
  }
}

function EvidenceCard({ evidence, isMobile }: { evidence: Array<Record<string, unknown>>; isMobile: boolean }) {
  const [expanded, setExpanded] = useState(false)
  const displayLimit = 3
  const shown = expanded ? evidence : evidence.slice(0, displayLimit)

  return (
    <div className={`rounded-xl border border-line bg-white ${isMobile ? 'p-3' : 'p-4'} shadow-sm sm:p-5`}>
      <div className="mb-2 flex items-center gap-2">
        <span className="text-lg">🔗</span>
        <h3 className="font-semibold text-track">证据来源（{evidence.length} 条）</h3>
      </div>
      <div className="space-y-2">
        {shown.map((e, i) => {
          const url = (e.source_url as string) || ''
          const name = (e.source_name as string) || ''
          const claim = (e.claim as string) || ''
          return (
            <div key={i} className="border-b border-line pb-2 last:border-0 last:pb-0">
              {claim && <p className="text-xs text-track/70">{claim}</p>}
              <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[10px] text-track/50">
                {name && <span>{name}</span>}
                {url && (
                  <a href={url} target="_blank" rel="noopener noreferrer" className="truncate text-start underline hover:text-start/80">
                    {url}
                  </a>
                )}
              </div>
            </div>
          )
        })}
      </div>
      {evidence.length > displayLimit && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-xs font-medium text-start hover:underline focus-visible:outline-none"
        >
          {expanded ? '收起' : `展开全部 ${evidence.length} 条`}
        </button>
      )}
    </div>
  )
}

/* ── 辅助函数 ── */

function hasSizeData(s: Record<string, unknown>): boolean {
  const tam = (s.tam as Record<string, unknown>) || {}
  const sam = (s.sam as Record<string, unknown>) || {}
  const som = (s.som as Record<string, unknown>) || {}
  return !!(tam.value || sam.value || som.value || s.cagr)
}

function hasOpportunityData(o: Record<string, unknown>): boolean {
  return !!(o.market_attractiveness || o.competition_intensity || o.entry_difficulty)
}
