// ScreenNodePreview — 通用节点结果预览屏
// 各 Agent 输出结构化展示，原生质感卡片布局，与 ScreenActionPreview / ScreenBudgetPreview 风格一致
//
// Design: native iOS-style — clean cards, generous spacing, subtle chroma, no raw JSON anywhere

import { useMemo } from 'react'

interface ScreenNodePreviewProps {
  nodeId: string
  title: string
  rawData: Record<string, unknown>
  onBack: () => void
}

// ── 共享设计常量 ──────────────────────────────────────────
const CARD_GAP = 10
const CONTENT_PAD = 14
const SECTION_GAP = 6

// ── 通用 UI 原语 ──────────────────────────────────────────

function Card({ title, icon, children, accent }: { title: string; icon?: string; children: React.ReactNode; accent?: boolean }) {
  return (
    <div style={{
      background: 'var(--bg)',
      border: `1px solid ${accent ? 'var(--accent-border)' : 'var(--border)'}`,
      borderRadius: 'var(--r-md)',
      overflow: 'hidden',
      boxShadow: accent ? '0 1px 4px var(--shadow)' : 'none',
    }}>
      <div style={{
        padding: '11px 14px',
        fontSize: 12,
        fontWeight: 600,
        borderBottom: '1px solid var(--line)',
        background: accent ? 'var(--accent-softer)' : 'var(--surface)',
        display: 'flex',
        alignItems: 'center',
        gap: SECTION_GAP,
        color: accent ? 'var(--accent)' : 'var(--fg)',
      }}>
        {icon && <span style={{ fontSize: 13, lineHeight: 1 }}>{icon}</span>}
        <span>{title}</span>
      </div>
      <div style={{ padding: '10px 14px 12px' }}>
        {children}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value?: string | number | null }) {
  if (value === undefined || value === null || value === '') return null
  return (
    <div style={{
      display: 'flex',
      alignItems: 'baseline',
      gap: 10,
      padding: '6px 0',
      borderBottom: '1px solid var(--line)',
      fontSize: 12,
    }}>
      <span style={{
        color: 'var(--muted)',
        minWidth: 62,
        flexShrink: 0,
        fontWeight: 500,
        fontSize: 11,
      }}>{label}</span>
      <span style={{
        color: 'var(--fg)',
        wordBreak: 'break-word',
        fontWeight: 500,
      }}>{value}</span>
    </div>
  )
}

function Tag({ label, color, bg }: { label: string; color?: string; bg?: string }) {
  return (
    <span style={{
      display: 'inline-block',
      fontSize: 11,
      fontWeight: 600,
      padding: '3px 10px',
      borderRadius: 20,
      background: bg || 'var(--accent-softer)',
      color: color || 'var(--accent)',
    }}>
      {label}
    </span>
  )
}

function EmptyState({ message }: { message: string }) {
  return (
    <div style={{
      textAlign: 'center',
      padding: '32px 0',
      color: 'var(--muted)',
      fontSize: 12,
      lineHeight: 1.6,
    }}>
      {message}
    </div>
  )
}

// ── 各节点专属渲染器 ──────────────────────────────────────

/** 产品调研 */
function ProductResearchView({ data }: { data: Record<string, unknown> }) {
  const idVal = (v: unknown): string | undefined => {
    if (v && typeof v === 'object' && 'value' in (v as object)) {
      const val = (v as Record<string, unknown>).value
      return val ? String(val) : undefined
    }
    return v ? String(v) : undefined
  }

  const identity = data.identity as Record<string, unknown> | undefined
  const desc = data.official_description as Record<string, unknown> | undefined
  const features = data.features as Array<Record<string, unknown>> | undefined
  const specs = data.specifications as Record<string, unknown> | undefined
  const avail = data.availability as Record<string, unknown> | undefined

  const identityFields = identity
    ? Object.entries(identity).filter(([k]) => !['sources', 'method', 'quote'].includes(k)).map(([k, v]) => [k, idVal(v)] as const).filter(([, v]) => v)
    : []

  const descFields = desc
    ? Object.entries(desc).filter(([k]) => !['sources', 'method', 'quote'].includes(k)).map(([k, v]) => [k, idVal(v)] as const).filter(([, v]) => v)
    : []

  return (
    <>
      {/* 产品标识 */}
      {identityFields.length > 0 && (
        <Card title="产品标识" icon="🏷️">
          {identityFields.map(([k, v]) => <Row key={k} label={k} value={v} />)}
        </Card>
      )}

      {/* 官方描述 */}
      {descFields.length > 0 && (
        <Card title="官方描述" icon="📝">
          {descFields.map(([k, v]) => <Row key={k} label={k} value={v} />)}
        </Card>
      )}

      {/* 功能特性 */}
      {features && features.length > 0 && (
        <Card title={`功能特性`} icon="⚡">
          {features.map((f, i) => (
            <div key={i} style={{
              padding: '7px 0',
              borderBottom: i < features.length - 1 ? '1px solid var(--line)' : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <Tag label={String(f.name || `特性 ${i + 1}`)} />
                {f.category && <span style={{ fontSize: 10, color: 'var(--muted)' }}>{String(f.category)}</span>}
              </div>
              {f.description && (
                <div style={{ fontSize: 11, color: 'var(--fg-soft)', lineHeight: 1.6, marginTop: 4 }}>
                  {String(f.description)}
                </div>
              )}
            </div>
          ))}
        </Card>
      )}

      {/* 规格参数（优雅键值对，拒绝 raw JSON） */}
      {specs?.value && typeof specs.value === 'object' && (
        <Card title="规格参数" icon="📏">
          {Object.entries(specs.value as Record<string, unknown>).map(([k, v]) => (
            <Row key={k} label={k} value={String(v)} />
          ))}
        </Card>
      )}

      {/* 上市信息 */}
      {avail && (() => {
        const items = Object.entries(avail)
          .filter(([k]) => !['sources', 'method', 'quote'].includes(k))
          .map(([k, v]) => {
            let val: string | undefined
            if (v && typeof v === 'object' && 'value' in (v as object)) {
              val = idVal(v)
            } else if (Array.isArray(v)) {
              val = v.length > 0 ? v.join('、') : undefined
            } else if (v) {
              val = String(v)
            }
            return [k, val] as const
          })
          .filter(([, v]) => v)
        return items.length > 0 ? <Card title="上市信息" icon="📦">{items.map(([k, v]) => <Row key={k} label={k} value={v} />)}</Card> : null
      })()}
    </>
  )
}

/** 市场调研 */
function MarketResearchView({ data }: { data: Record<string, unknown> }) {
  const trends = data.trends as Array<Record<string, unknown>> | undefined
  const opportunities = data.opportunities as string[] | undefined

  return (
    <>
      {data.market_summary && (
        <Card title="市场分析摘要" icon="📊" accent>
          <div style={{ fontSize: 12, lineHeight: 1.7, color: 'var(--fg-soft)' }}>{data.market_summary as string}</div>
        </Card>
      )}

      {trends && trends.length > 0 && (
        <Card title={`行业趋势`} icon="📈">
          {trends.map((t, i) => (
            <div key={i} style={{
              padding: '8px 0',
              borderBottom: i < trends.length - 1 ? '1px solid var(--line)' : 'none',
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)', marginBottom: 2 }}>{String(t.title || '')}</div>
              <div style={{ fontSize: 11, color: 'var(--fg-soft)', lineHeight: 1.6 }}>{String(t.description || '')}</div>
            </div>
          ))}
        </Card>
      )}

      {opportunities && opportunities.length > 0 && (
        <Card title="机会点" icon="🎯">
          {opportunities.map((o, i) => (
            <div key={i} style={{
              padding: '5px 0',
              borderBottom: i < opportunities.length - 1 ? '1px solid var(--line)' : 'none',
              display: 'flex',
              gap: 8,
              fontSize: 12,
              color: 'var(--fg-soft)',
              lineHeight: 1.5,
            }}>
              <span style={{ color: 'var(--accent)', fontWeight: 700, flexShrink: 0 }}>{i + 1}.</span>
              <span>{o}</span>
            </div>
          ))}
        </Card>
      )}
    </>
  )
}

/** 人群洞察 */
function AudienceInsightView({ data }: { data: Record<string, unknown> }) {
  const topSports = data.top_sports as string[] | undefined
  const traits = data.traits as string[] | undefined

  return (
    <>
      <Card title="人群概览" icon="👥" accent>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <div style={{ textAlign: 'center', padding: '8px 4px', background: 'var(--surface)', borderRadius: 'var(--r-sm)' }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)' }}>{data.sport_index ?? '-'}</div>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>运动人群指数</div>
          </div>
          <div style={{ textAlign: 'center', padding: '8px 4px', background: 'var(--surface)', borderRadius: 'var(--r-sm)' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--fg)' }}>{data.peak_hours as string || '-'}</div>
            <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>活跃高峰</div>
          </div>
        </div>
        <Row label="城市" value={data.city as string} />
      </Card>

      {data.persona_summary && (
        <Card title="人群画像" icon="📋">
          <div style={{ fontSize: 12, lineHeight: 1.7, color: 'var(--fg-soft)' }}>{data.persona_summary as string}</div>
        </Card>
      )}

      {topSports && topSports.length > 0 && (
        <Card title="Top 运动项目" icon="🏅">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {topSports.map((s, i) => (
              <Tag key={i} label={s} />
            ))}
          </div>
        </Card>
      )}

      {traits && traits.length > 0 && (
        <Card title="特征标签" icon="🔖">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {traits.map((t, i) => (
              <span key={i} style={{
                fontSize: 10,
                fontWeight: 500,
                padding: '4px 10px',
                borderRadius: 20,
                background: 'var(--surface)',
                color: 'var(--muted)',
                border: '1px solid var(--border)',
              }}>{t}</span>
            ))}
          </div>
        </Card>
      )}
    </>
  )
}

/** 数据查询 */
function PlanDataQueryView({ data }: { data: Record<string, unknown> }) {
  const leagues = data.leagues as Record<string, unknown> | undefined
  const events = data.events as Record<string, unknown> | undefined
  const influencers = data.influencers as Record<string, unknown> | undefined
  const stores = data.stores as Record<string, unknown> | undefined
  const venues = data.venues as Record<string, unknown> | undefined

  return (
    <>
      <Card title="城市概况" icon="📍" accent>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <StatTile value={String(data.population || '-')} label="常住人口" />
          <StatTile value={String(data.sport_index ?? '-')} label="运动指数" />
          <StatTile value={data.consumption as string || '-'} label="消费力" />
          <StatTile value={data.weekend_active as string || '-'} label="周末活跃" />
        </div>
        <Row label="城市" value={data.city as string} />
      </Card>

      {leagues && <SimpleStatCard icon="🏟️" title="盟域" rows={[['数量', String(leagues.count ?? '')], ['平均成员', String(leagues.avg_members ?? '')]]} />}
      {events && <SimpleStatCard icon="🏆" title="赛事活动" rows={[['月均活动', String(events.monthly ?? '')], ['平均参与', String(events.avg_participants ?? '')]]} />}
      {influencers && <SimpleStatCard icon="⭐" title="达人" rows={[['总数', String(influencers.count ?? '')], ['平均报价', influencers.avg_quote as string]]} />}
      {stores && <SimpleStatCard icon="🏪" title="经营社" rows={[['数量', String(stores.count ?? '')]]} />}
      {venues && <SimpleStatCard icon="🏛️" title="场馆" rows={[['数量', String(venues.count ?? '')], ['容量', venues.capacity as string]]} />}

      {/* 隐藏的详细信息（超出摘要展示范围的以摘要卡片展示） */}
      {data.tournament && renderSubCard('赛事资源', '🏆', data.tournament as Record<string, unknown>, ['available_tournaments'])}
      {data.trophy && renderSubCard('奖杯定制', '🥇', data.trophy as Record<string, unknown>, ['trophy_types', 'avg_lead_time_days'])}
    </>
  )
}

function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <div style={{ textAlign: 'center', padding: '8px 4px', background: 'var(--surface)', borderRadius: 'var(--r-sm)' }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent)' }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>{label}</div>
    </div>
  )
}

function SimpleStatCard({ icon, title, rows }: { icon: string; title: string; rows: [string, string][] }) {
  return (
    <Card title={title} icon={icon}>
      {rows.map(([label, value]) => <Row key={label} label={label} value={value} />)}
    </Card>
  )
}

function renderSubCard(title: string, icon: string, data: Record<string, unknown>, keys: string[]) {
  const entries = keys.map(k => {
    const v = data[k]
    if (!v) return null
    const val = Array.isArray(v) ? v.join('、') : String(v)
    return { label: k, value: val }
  }).filter(Boolean) as { label: string; value: string }[]
  if (entries.length === 0) return null
  return <Card title={title} icon={icon}>{entries.map(e => <Row key={e.label} label={e.label} value={e.value} />)}</Card>
}

/** 适配度分析 */
function FitnessAnalysisView({ data }: { data: Record<string, unknown> }) {
  const scores = data.sport_fitness_scores as Array<Record<string, unknown>> | undefined

  return (
    <>
      <Card title="分析概览" icon="🎯" accent>
        <Row label="品牌品类" value={data.category as string} />
        <Row label="目标城市" value={data.city as string} />
        <Row label="主推运动" value={data.primary_sport as string} />
        <Row label="次要运动" value={data.secondary_sport as string} />
      </Card>

      {scores && scores.length > 0 && (
        <Card title="适配度评分" icon="📊">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {scores.map((s, i) => {
              const sc = s.score as number || 0
              const barColor = sc >= 80 ? '#22c55e' : sc >= 60 ? '#eab308' : '#f97316'
              const barBg = sc >= 80 ? '#dcfce7' : sc >= 60 ? '#fef9c3' : '#ffedd5'
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)', minWidth: 56, textAlign: 'right' }}>
                    {s.sport as string}
                  </span>
                  <div style={{
                    flex: 1,
                    height: 22,
                    background: barBg,
                    borderRadius: 11,
                    overflow: 'hidden',
                    position: 'relative',
                  }}>
                    <div style={{
                      width: `${Math.min(sc, 100)}%`,
                      height: '100%',
                      borderRadius: 11,
                      background: `linear-gradient(90deg, ${barColor}88, ${barColor})`,
                      transition: 'width 0.4s ease',
                    }} />
                    <span style={{
                      position: 'absolute',
                      right: 8,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontSize: 10,
                      fontWeight: 700,
                      color: sc >= 50 ? '#fff' : 'var(--fg-soft)',
                    }}>{sc}分</span>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* 具体适配理由 */}
      {scores && scores.some(s => s.reason) && (
        <Card title="适配理由" icon="📌">
          {scores.filter(s => s.reason).map((s, i) => (
            <div key={i} style={{
              padding: '6px 0',
              borderBottom: i < scores.length - 1 ? '1px solid var(--line)' : 'none',
              fontSize: 11,
              lineHeight: 1.6,
              color: 'var(--fg-soft)',
            }}>
              <strong style={{ color: 'var(--fg)' }}>{s.sport as string}:</strong> {s.reason as string}
            </div>
          ))}
        </Card>
      )}
    </>
  )
}

/** 策略生成 */
function StrategyGenerationView({ data }: { data: Record<string, unknown> }) {
  const msgs = data.key_messages as string[] | undefined

  return (
    <>
      <Card title="核心策略" icon="💡" accent>
        {data.positioning && (
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', lineHeight: 1.5, marginBottom: 8 }}>
            {data.positioning as string}
          </div>
        )}
        <Row label="营销目标" value={data.marketing_goal as string} />
      </Card>

      {data.strategy_framework && (
        <Card title="策略框架" icon="📐">
          <div style={{ fontSize: 12, lineHeight: 1.7, color: 'var(--fg-soft)' }}>{data.strategy_framework as string}</div>
        </Card>
      )}

      {msgs && msgs.length > 0 && (
        <Card title="传播信息" icon="📢">
          {msgs.map((m, i) => (
            <div key={i} style={{
              padding: '6px 0',
              borderBottom: i < msgs.length - 1 ? '1px solid var(--line)' : 'none',
              display: 'flex',
              gap: 8,
              fontSize: 12,
              color: 'var(--fg-soft)',
              lineHeight: 1.5,
            }}>
              <span style={{ color: 'var(--accent)', fontWeight: 700, flexShrink: 0, fontSize: 10 }}>▸</span>
              <span>{m}</span>
            </div>
          ))}
        </Card>
      )}
    </>
  )
}

/** 执行规划 */
function ExecutionPlanningView({ data }: { data: Record<string, unknown> }) {
  const plans: { key: string; label: string; icon: string }[] = [
    { key: 'leagues_plan', label: '盟域共建计划', icon: '🏟️' },
    { key: 'events_plan', label: '赛事活动计划', icon: '🏆' },
    { key: 'influencer_plan', label: '达人合作矩阵', icon: '⭐' },
    { key: 'content_plan', label: '内容运营计划', icon: '📝' },
    { key: 'store_plan', label: '经营社联动计划', icon: '🏪' },
  ]

  return (
    <>
      {plans.map(({ key, label, icon }) => {
        const content = data[key] as string | undefined
        if (!content) return null
        return (
          <Card key={key} title={label} icon={icon}>
            <div style={{ fontSize: 12, lineHeight: 1.8, color: 'var(--fg-soft)', whiteSpace: 'pre-wrap', fontFamily: 'var(--ff)' }}>
              {content}
            </div>
          </Card>
        )
      })}
    </>
  )
}

/** 通用兜底渲染（优雅卡片，拒绝 raw JSON） */
function GenericFallbackView({ data }: { data: Record<string, unknown> }) {
  const entries = useMemo(() => Object.entries(data), [data])

  const renderValue = (value: unknown, key: string): React.ReactNode => {
    if (['method', 'sources', 'quote', 'source'].includes(key)) return null
    if (value === null || value === undefined) return null
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return <Row label={key} value={String(value)} />
    }
    if (Array.isArray(value)) {
      if (value.length === 0) return null
      return (
        <Card title={key}>
          {value.map((item, i) => {
            if (typeof item === 'string') {
              return <div key={i} style={{ padding: '5px 0', fontSize: 12, color: 'var(--fg-soft)', lineHeight: 1.5, borderBottom: i < value.length - 1 ? '1px solid var(--line)' : 'none', display: 'flex', gap: 6 }}>
                <span style={{ color: 'var(--accent)' }}>•</span>
                <span>{item}</span>
              </div>
            }
            if (typeof item === 'object' && item !== null) {
              return (
                <div key={i} style={{ padding: '7px 0', borderBottom: i < value.length - 1 ? '1px solid var(--line)' : 'none' }}>
                  <GenericFallbackView data={item as Record<string, unknown>} />
                </div>
              )
            }
            return null
          })}
        </Card>
      )
    }
    if (typeof value === 'object' && value !== null) {
      const obj = value as Record<string, unknown>
      const filtered = Object.entries(obj).filter(([k, v]) => v !== null && v !== undefined && !['method', 'sources', 'quote', 'source'].includes(k))
      if (filtered.length === 0) return null

      const allSimple = filtered.every(([, v]) => typeof v === 'string' || typeof v === 'number')
      if (allSimple) {
        return (
          <Card title={key}>
            {filtered.map(([k, v]) => <Row key={k} label={k} value={String(v)} />)}
          </Card>
        )
      }

      const labelMap: Record<string, string> = {
        demographics: '人口统计',
        purchase_motivations: '购买动机',
        decision_factors: '决策因素',
        usage_scenarios: '使用场景',
        descriptions: '用户描述',
        profile_summary: '画像摘要',
        typical_user: '典型用户',
        product_usage: '产品使用',
        lifestyle: '生活方式',
        product_fit: '产品契合',
      }
      const prettyKey = labelMap[key] || key

      return (
        <Card title={prettyKey}>
          <GenericFallbackView data={obj} />
        </Card>
      )
    }
    return null
  }

  return (
    <>
      {entries.map(([key, value]) => (
        <div key={key}>{renderValue(value, key)}</div>
      ))}
    </>
  )
}

// ── 节点类型 → 渲染器映射 ────────────────────────────────

const RENDERERS: Record<string, React.ComponentType<{ data: Record<string, unknown> }>> = {
  product_research: ProductResearchView,
  market_research: MarketResearchView,
  audience_insight: AudienceInsightView,
  plan_data_query: PlanDataQueryView,
  fitness_analysis: FitnessAnalysisView,
  strategy_generation: StrategyGenerationView,
  execution_planning: ExecutionPlanningView,
}

// ── 主组件 ────────────────────────────────────────────────

export function ScreenNodePreview({ nodeId, title, rawData, onBack }: ScreenNodePreviewProps) {
  const Renderer = RENDERERS[nodeId]
  const hasData = rawData && Object.keys(rawData).length > 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Top bar — 精确匹配 ScreenActionPreview */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        padding: '8px 14px',
        borderBottom: '1px solid var(--line)',
        background: 'var(--bg)',
        flexShrink: 0,
      }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            borderRadius: 8,
            color: 'var(--fg)',
            fontSize: 18,
            fontFamily: 'var(--ff)',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { (e.target as HTMLElement).style.background = 'var(--surface)' }}
          onMouseLeave={e => { (e.target as HTMLElement).style.background = 'none' }}
        >‹</button>
        <span style={{
          flex: 1,
          textAlign: 'center',
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--fg)',
          fontFamily: 'var(--ff)',
        }}>{title}</span>
        <div style={{ width: 32 }} />
      </div>

      {/* Scrollable content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: `${CONTENT_PAD}px ${CONTENT_PAD}px 0`,
      }}>
        {!hasData ? (
          <EmptyState message="暂无节点数据" />
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: CARD_GAP,
            paddingBottom: CONTENT_PAD * 2,
          }}>
            {Renderer ? <Renderer data={rawData} /> : <GenericFallbackView data={rawData} />}
          </div>
        )}
      </div>
    </div>
  )
}
