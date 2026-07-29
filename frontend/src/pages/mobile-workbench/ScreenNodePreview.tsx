// ScreenNodePreview — 通用节点结果预览屏
// 各 Agent 输出结构化展示，原生质感卡片布局，与 ScreenActionPreview / ScreenBudgetPreview 风格一致
//
// Design: native iOS-style — clean cards, generous spacing, subtle chroma, no raw JSON anywhere

import { useCallback, useMemo, useState } from 'react'

interface ScreenNodePreviewProps {
  nodeId: string
  title: string
  rawData: Record<string, unknown>
  onBack: () => void
  /** 重新生成回调（传 null 或不传则不显示底部输入栏） */
  onReject?: ((reason: string) => void) | null
  /** 是否正在重新生成 */
  loading?: boolean
}

// ── 共享设计常量 ──────────────────────────────────────────
const CARD_GAP = 10
const CONTENT_PAD = 14
const SECTION_GAP = 6

// ── 字段名 → 中文映射 ────────────────────────────────────
const FIELD_LABELS: Record<string, string> = {
  product_name: '产品名称',
  brand: '品牌',
  manufacturer: '厂商',
  industry: '行业',
  category: '品类',
  description: '描述',
  tagline: '标语',
  statement: '声明',
  details: '详情',
  status: '状态',
  pricing: '定价',
  available_regions: '可用地区',
  access_model: '获取方式',
  design: '设计',
  material: '材质',
  color: '颜色',
  weight: '重量',
  dimensions: '尺寸',
  power: '功率',
  battery: '电池',
  warranty: '保修',
  item_model: '型号',
}

function fieldLabel(k: string): string {
  return FIELD_LABELS[k] || k
}

// ── 通用 UI 原语 ──────────────────────────────────────────

function SectionTitle({ icon, title }: { icon?: string; title: string }) {
  return (
    <div style={{
      fontSize: 13, fontWeight: 700, color: 'var(--accent)',
      padding: '12px 0 6px', borderBottom: '1px solid var(--line)',
      marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6,
      marginTop: 4,
    }}>
      {icon && <span>{icon}</span>}
      <span>{title}</span>
    </div>
  )
}

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
      <SectionTitle icon="🏷️" title="产品调研" />
      {identityFields.length > 0 && (
        <Card title="产品标识" icon="🏷️" accent>
          {identityFields.map(([k, v]) => <Row key={k} label={fieldLabel(k)} value={v} />)}
        </Card>
      )}

      {descFields.length > 0 && (
        <Card title="官方描述" icon="📝">
          {descFields.map(([k, v]) => <Row key={k} label={fieldLabel(k)} value={v} />)}
        </Card>
      )}

      {features && features.length > 0 && (
        <Card title="功能特性" icon="⚡">
          {features.map((f, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 0',
              borderBottom: i < features.length - 1 ? '1px solid var(--line)' : 'none',
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%', background: 'var(--accent)',
                color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)', marginBottom: 2 }}>
                  {String(f.name || `特性 ${i + 1}`)}
                </div>
                {f.description ? (
                  <div style={{ fontSize: 11, color: 'var(--fg-soft)', lineHeight: 1.6 }}>
                    {String(f.description)}
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </Card>
      )}

      {specs?.value && typeof specs.value === 'object' && (
        <Card title="规格参数" icon="📏">
          {Object.entries(specs.value as Record<string, unknown>).map(([k, v]) => (
            <Row key={k} label={fieldLabel(k)} value={String(v)} />
          ))}
        </Card>
      )}

      {avail && (() => {
        const items = Object.entries(avail)
          .filter(([k]) => !['sources', 'method', 'quote'].includes(k))
          .map(([k, v]) => {
            let val: string | undefined
            if (v && typeof v === 'object' && 'value' in (v as object)) val = idVal(v)
            else if (Array.isArray(v)) val = v.length > 0 ? v.join('、') : undefined
            else if (v) val = String(v)
            return val ? { label: k, value: val } : null
          })
          .filter(Boolean) as { label: string; value: string }[]
        return items.length > 0 ? <Card title="上市信息" icon="📦">{items.map(e => <Row key={e.label} label={fieldLabel(e.label)} value={e.value} />)}</Card> : null
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
      <SectionTitle icon="📈" title="市场调研" />
      {data.market_summary && (
        <Card title="市场分析摘要" icon="📊" accent>
          <div style={{ fontSize: 12, lineHeight: 1.7, color: 'var(--fg-soft)' }}>{data.market_summary as string}</div>
        </Card>
      )}

      {trends && trends.length > 0 && (
        <Card title="行业趋势" icon="📈">
          {trends.map((t, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 0',
              borderBottom: i < trends.length - 1 ? '1px solid var(--line)' : 'none',
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%', background: 'var(--accent)',
                color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex',
                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                marginTop: 1,
              }}>{i + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)', marginBottom: 2 }}>{String(t.title || '')}</div>
                <div style={{ fontSize: 11, color: 'var(--fg-soft)', lineHeight: 1.6 }}>{String(t.description || '')}</div>
              </div>
            </div>
          ))}
        </Card>
      )}

      {opportunities && opportunities.length > 0 && (
        <Card title="机会点" icon="🎯">
          {opportunities.map((o, i) => (
            <div key={i} style={{
              padding: '5px 0', borderBottom: i < opportunities.length - 1 ? '1px solid var(--line)' : 'none',
              display: 'flex', gap: 8, fontSize: 12, color: 'var(--fg-soft)', lineHeight: 1.5,
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

/** 人群洞察：{audience_data: {demographics, purchase_motivations, decision_factors, usage_scenarios, descriptions}, persona: {profile_summary, typical_user, demographics, ...}} */
function AudienceInsightView({ data }: { data: Record<string, unknown> }) {
  const persona = data.persona as Record<string, unknown> | undefined
  const audienceData = data.audience_data as Record<string, unknown> | undefined
  const profileSummary = persona?.profile_summary as Record<string, unknown> | undefined

  const summaryText: string | undefined =
    (profileSummary?.value as string) || (persona?.profile_summary_text as string) || undefined

  const extractField = (obj: unknown): string | undefined => {
    if (obj && typeof obj === 'object' && 'value' in (obj as object)) {
      return ((obj as Record<string, unknown>).value as string) || undefined
    }
    return obj ? String(obj) : undefined
  }

  return (
    <>
      <SectionTitle icon="👥" title="人群洞察" />
      {summaryText && (
        <Card title="人群画像摘要" icon="📋" accent>
          <div style={{ fontSize: 12, lineHeight: 1.7, color: 'var(--fg-soft)' }}>{summaryText}</div>
        </Card>
      )}

      {persona?.product_fit && (
        <Card title="产品契合度" icon="🎯">
          {extractField((persona.product_fit as Record<string, unknown>)?.reason_this_product) && (
            <div style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--fg-soft)', marginBottom: 6 }}>
              <strong style={{ color: 'var(--fg)', fontSize: 11 }}>选择理由：</strong>
              {extractField((persona.product_fit as Record<string, unknown>)?.reason_this_product)}
            </div>
          )}
          {extractField((persona.product_fit as Record<string, unknown>)?.valued_features) && (
            <div style={{ fontSize: 12, lineHeight: 1.6, color: 'var(--fg-soft)' }}>
              <strong style={{ color: 'var(--fg)', fontSize: 11 }}>关注功能：</strong>
              {extractField((persona.product_fit as Record<string, unknown>)?.valued_features)}
            </div>
          )}
        </Card>
      )}

      {persona?.demographics && (() => {
        const demo = persona.demographics as Record<string, unknown>
        const entries = Object.entries(demo).filter(([, v]) => v)
        if (entries.length === 0) return null
        return <Card title="人口统计" icon="👤">{entries.map(([k, v]) => {
          const val = typeof v === 'object' && v && 'value' in (v as object) ? String((v as Record<string, unknown>).value ?? '') : String(v ?? '')
          return val ? <Row key={k} label={fieldLabel(k)} value={val} /> : null
        })}</Card>
      })()}

      {audienceData?.purchase_motivations && Array.isArray(audienceData.purchase_motivations) && (
        <Card title="购买动机" icon="💡">
          {(audienceData.purchase_motivations as Array<Record<string, unknown>>).map((item, i) => (
            <div key={i} style={{
              padding: '5px 0', borderBottom: i < (audienceData.purchase_motivations as Array<unknown>).length - 1 ? '1px solid var(--line)' : 'none',
              fontSize: 12, color: 'var(--fg-soft)', lineHeight: 1.5, display: 'flex', gap: 6,
            }}>
              <span style={{ color: 'var(--accent)' }}>•</span>
              <span>{item.text as string}</span>
            </div>
          ))}
        </Card>
      )}

      {audienceData?.usage_scenarios && Array.isArray(audienceData.usage_scenarios) && (
        <Card title="使用场景" icon="🏃">
          {(audienceData.usage_scenarios as Array<Record<string, unknown>>).map((item, i) => (
            <div key={i} style={{
              padding: '5px 0', borderBottom: i < (audienceData.usage_scenarios as Array<unknown>).length - 1 ? '1px solid var(--line)' : 'none',
              fontSize: 12, color: 'var(--fg-soft)', lineHeight: 1.5, display: 'flex', gap: 6,
            }}>
              <span style={{ color: 'var(--accent)' }}>•</span>
              <span>{item.text as string}</span>
            </div>
          ))}
        </Card>
      )}

      {persona?.lifestyle && (() => {
        const ls = persona.lifestyle as Record<string, unknown>
        const entries = Object.entries(ls).filter(([, v]) => v)
        if (entries.length === 0) return null
        return <Card title="生活方式" icon="🎭">{entries.map(([k, v]) => {
          const val = typeof v === 'object' && v && 'value' in (v as object) ? String((v as Record<string, unknown>).value ?? '') : String(v ?? '')
          return val ? <Row key={k} label={fieldLabel(k)} value={val} /> : null
        })}</Card>
      })()}
    </>
  )
}

/** 数据查询（多城联动：plan_data_query 输出 { cities: [CityDataOutput] }） */
function PlanDataQueryView({ data }: { data: Record<string, unknown> }) {
  const citiesList = (data.cities as Array<Record<string, unknown>> | undefined) ?? []
  // 向后兼容旧的单城扁平结构（cities 不存在时 data 本身即单城）
  const cities = citiesList.length > 0 ? citiesList : [data]
  const primary = cities[0] ?? {}

  return (
    <>
      <SectionTitle icon="📍" title="数据查询" />
      {cities.map((c, i) => {
        const leagues = c.leagues as Record<string, unknown> | undefined
        const events = c.events as Record<string, unknown> | undefined
        const influencers = c.influencers as Record<string, unknown> | undefined
        const stores = c.stores as Record<string, unknown> | undefined
        const venues = c.venues as Record<string, unknown> | undefined
        const isPrimary = i === 0
        const cityLabel = `${c.city ?? '城市'}${isPrimary ? ' · 主城' : ''}`
        return (
          <div key={cityLabel + i} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Card title={cityLabel} icon="📍" accent={isPrimary}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <StatTile value={String(c.population || '-')} label="常住人口" />
                <StatTile value={String(c.sport_index ?? '-')} label="运动指数" />
                <StatTile value={(c.consumption as string) || '-'} label="消费力" />
                <StatTile value={(c.weekend_active as string) || '-'} label="周末活跃" />
              </div>
            </Card>
            {leagues && <SimpleStatCard icon="🏟️" title={`盟域·${c.city}`} rows={[['数量', String(leagues.count ?? '')], ['平均成员', String(leagues.avg_members ?? '')]]} />}
            {events && <SimpleStatCard icon="🏆" title={`赛事活动·${c.city}`} rows={[['月均活动', String(events.monthly ?? '')], ['平均参与', String(events.avg_participants ?? '')]]} />}
            {influencers && <SimpleStatCard icon="⭐" title={`达人·${c.city}`} rows={[['总数', String(influencers.count ?? '')], ['平均报价', influencers.avg_quote as string]]} />}
            {stores && <SimpleStatCard icon="🏪" title={`经营社·${c.city}`} rows={[['数量', String(stores.count ?? '')]]} />}
            {venues && <SimpleStatCard icon="🏛️" title={`场馆·${c.city}`} rows={[['数量', String(venues.count ?? '')], ['容量', venues.capacity as string]]} />}
          </div>
        )
      })}
      {primary.tournament && renderSubCard('赛事资源', '🏆', primary.tournament as Record<string, unknown>, ['available_tournaments'])}
      {primary.trophy && renderSubCard('奖杯定制', '🥇', primary.trophy as Record<string, unknown>, ['trophy_types', 'avg_lead_time_days'])}
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

const STAT_CARD_LABELS: Record<string, string> = {
  '数量': '数量',
  '平均成员': '平均成员',
  '月均活动': '月均活动',
  '平均参与': '平均参与',
  '总数': '总数',
  '平均报价': '平均报价',
  '容量': '容量',
}

function SimpleStatCard({ icon, title, rows }: { icon: string; title: string; rows: [string, string][] }) {
  return (
    <Card title={title} icon={icon}>
      {rows.map(([label, value]) => <Row key={label} label={STAT_CARD_LABELS[label] || label} value={value} />)}
    </Card>
  )
}

const SUB_CARD_LABELS: Record<string, string> = {
  available_tournaments: '可用赛事',
  trophy_types: '奖杯类型',
  avg_lead_time_days: '定制提前期',
}

function renderSubCard(title: string, icon: string, data: Record<string, unknown>, keys: string[]) {
  const entries = keys.map(k => {
    const v = data[k]
    if (!v) return null
    let val: string
    if (Array.isArray(v)) {
      // 对象数组 → 格式化展示
      if (v.length > 0 && typeof v[0] === 'object') {
        val = v.map((item: Record<string, unknown>, i: number) =>
          `${i + 1}. ${item.name || item.title || ''}（${item.sport_type || item.description || ''}）`
        ).join('\n')
      } else {
        val = v.join('、')
      }
    } else {
      val = String(v)
    }
    return { label: SUB_CARD_LABELS[k] || k, value: val }
  }).filter(Boolean) as { label: string; value: string }[]
  if (entries.length === 0) return null
  return <Card title={title} icon={icon}>{entries.map(e => <Row key={e.label} label={fieldLabel(e.label)} value={e.value} />)}</Card>
}

/** 适配度分析 */
function FitnessAnalysisView({ data }: { data: Record<string, unknown> }) {
  const scores = data.sport_fitness_scores as Array<Record<string, unknown>> | undefined

  return (
    <>
      <SectionTitle icon="🎯" title="适配度分析" />
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
              const barColor = '#1677ff'
              const barBg = '#e8f0fe'
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)', minWidth: 56, textAlign: 'right' }}>
                    {s.sport as string}
                  </span>
                  <div style={{
                    flex: 1, height: 22, background: barBg, borderRadius: 11,
                    overflow: 'hidden', position: 'relative',
                  }}>
                    <div style={{
                      width: `${Math.min(sc, 100)}%`, height: '100%', borderRadius: 11,
                      background: `linear-gradient(90deg, ${barColor}88, ${barColor})`,
                      transition: 'width 0.4s ease',
                    }} />
                    <span style={{
                      position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                      fontSize: 10, fontWeight: 700, color: 'var(--fg)',
                    }}>{sc}分</span>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {scores && scores.some(s => s.reason) && (
        <Card title="适配理由" icon="📌">
          {scores.filter(s => s.reason).map((s, i) => (
            <div key={i} style={{
              padding: '6px 0', borderBottom: i < scores.length - 1 ? '1px solid var(--line)' : 'none',
              fontSize: 11, lineHeight: 1.6, color: 'var(--fg-soft)',
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
      <SectionTitle icon="💡" title="核心策略" />
      <Card title="核心主张" icon="💡" accent>
        {data.positioning ? (
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', lineHeight: 1.5, marginBottom: 8 }}>
            {String(data.positioning)}
          </div>
        ) : null}
        <Row label="营销目标" value={data.marketing_goal as string} />
      </Card>

      {data.strategy_framework && (
        <Card title="策略框架" icon="📐">
          <div style={{ fontSize: 12, lineHeight: 1.7, color: 'var(--fg-soft)' }}>{data.strategy_framework as string}</div>
        </Card>
      )}

      {msgs && msgs.length > 0 && (
        <Card title={`核心传播信息（${msgs.length}条）`} icon="📢">
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
  const plans: { key: string; label: string; icon: string; sublabel: string }[] = [
    { key: 'leagues_plan', label: '盟域共建计划', icon: '🏟️', sublabel: '盟域' },
    { key: 'events_plan', label: '赛事活动计划', icon: '🏆', sublabel: '赛事' },
    { key: 'influencer_plan', label: '达人合作矩阵', icon: '⭐', sublabel: '达人' },
    { key: 'content_plan', label: '内容运营计划', icon: '📝', sublabel: '内容' },
    { key: 'store_plan', label: '经营社联动计划', icon: '🏪', sublabel: '经营社' },
  ]

  return (
    <>
      <SectionTitle icon="📋" title="执行规划" />
      {plans.map(({ key, label, icon, sublabel }) => {
        const content = data[key] as string | undefined
        if (!content) return null
        return (
          <Card key={key} title={`${icon} ${label}`}>
            <div style={{
              fontSize: 13, fontWeight: 700, color: 'var(--fg)', marginBottom: 8,
              paddingBottom: 6, borderBottom: '1px solid var(--line)',
            }}>
              {sublabel}
            </div>
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
    if (['method', 'sources', 'quote', 'source', 'search_results', 'fetched_pages', 'seen_urls', 'exclude_urls', 'initial_pages'].includes(key)) return null
    if (value === null || value === undefined) return null
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return <div key={key} style={{ fontSize: 12, color: 'var(--fg-soft)', padding: '2px 0' }}>{String(value)}</div>
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
            {filtered.map(([, v]) => <div key={String(v)} style={{ fontSize: 12, color: 'var(--fg-soft)', padding: '2px 0' }}>{String(v)}</div>)}
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

/** 并行调研结果 Tab 栏 + 内容（放在顶栏和滚动区之间） */
function ParallelResearchTabs({ data }: { data: Record<string, unknown> }) {
  const [activeTab, setActiveTab] = useState(0)
  const tabs = ['概览', '产品调研', '市场调研', '人群洞察']

  const productData = data.product_research as Record<string, unknown> | undefined
  const marketData = data.market_research as Record<string, unknown> | undefined
  const audienceData = data.audience_insight as Record<string, unknown> | undefined

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
      {/* Tab 栏 */}
      <div style={{
        display: 'flex', gap: 6, padding: '10px 14px 6px', flexShrink: 0,
        overflowX: 'auto', scrollbarWidth: 'none',
        borderBottom: '1px solid var(--line)',
      }}>
        {tabs.map((tab, i) => (
          <span
            key={tab}
            onClick={() => setActiveTab(i)}
            style={{
              flex: 'none', fontSize: 11, padding: '5px 12px',
              borderRadius: 20, border: '1px solid var(--border)',
              color: activeTab === i ? 'var(--accent)' : 'var(--muted)',
              background: activeTab === i ? 'var(--accent-soft)' : 'var(--bg)',
              borderColor: activeTab === i ? 'var(--accent-border)' : 'var(--border)',
              fontWeight: activeTab === i ? 600 : 500,
              cursor: 'pointer', fontFamily: 'var(--ff)',
            }}
          >{tab}</span>
        ))}
      </div>

      {/* 滚动内容 */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '14px 14px 0' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: CARD_GAP, paddingBottom: 28 }}>
          {activeTab === 0 && (
            <>
              <Card title="调研概览" icon="📋" accent>
                <div style={{ fontSize: 12, lineHeight: 1.7, color: 'var(--fg-soft)' }}>
                  本次调研覆盖了品牌产品信息、行业市场趋势和核心人群画像三个维度，为策略制定提供数据支撑。
                </div>
              </Card>
              {productData?.identity && (
                <Card title="产品标识" icon="🏷️">
                  {(() => {
                    const id = productData.identity as Record<string, unknown>
                    return Object.entries(id)
                      .filter(([k]) => !['sources', 'method', 'quote'].includes(k))
                      .map(([k, v]) => {
                        const val = typeof v === 'object' && v && 'value' in (v as object) ? (v as Record<string, unknown>).value : v
                        return val ? <Row key={k} label={fieldLabel(k)} value={String(val)} /> : null
                      })
                  })()}
                </Card>
              )}
              {marketData?.trends && Array.isArray(marketData.trends) && (
                <Card title="行业趋势" icon="📈">
                  {(marketData.trends as Array<Record<string, unknown>>).slice(0, 2).map((t, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 0',
                      borderBottom: i < 1 ? '1px solid var(--line)' : 'none',
                    }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: '50%', background: 'var(--accent)',
                        color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex',
                        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>{i + 1}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg)', marginBottom: 2 }}>{t.title as string}</div>
                        <div style={{ fontSize: 11, color: 'var(--fg-soft)', lineHeight: 1.5 }}>{t.description as string}</div>
                      </div>
                    </div>
                  ))}
                </Card>
              )}
              {audienceData && (
                <Card title="人群画像" icon="👥">
                  {(() => {
                    const persona = audienceData?.persona as Record<string, unknown> | undefined
                    const profile = persona?.profile_summary as Record<string, unknown> | undefined
                    const summary = (profile?.value as string) || ''
                    return summary ? <div style={{ fontSize: 12, lineHeight: 1.7, color: 'var(--fg-soft)' }}>{summary}</div> : <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>暂无人群画像数据</div>
                  })()}
                </Card>
              )}
            </>
          )}
          {activeTab === 1 && productData && <ProductResearchView data={productData} />}
          {activeTab === 2 && marketData && <MarketResearchView data={marketData} />}
          {activeTab === 3 && audienceData && <AudienceInsightView data={audienceData} />}
        </div>
      </div>
    </div>
  )
}

/** 并行调研结果渲染器（Render 空内容，Tab 已在 ParallelResearchTabs 中处理） */
function ParallelResearchView({ data: _data }: { data: Record<string, unknown> }) {
  return null
}

const RENDERERS: Record<string, React.ComponentType<{ data: Record<string, unknown> }>> = {
  product_research: ProductResearchView,
  market_research: MarketResearchView,
  audience_insight: AudienceInsightView,
  plan_data_query: PlanDataQueryView,
  fitness_analysis: FitnessAnalysisView,
  strategy_generation: StrategyGenerationView,
  execution_planning: ExecutionPlanningView,
  parallel_research: ParallelResearchView,
}

// ── 主组件 ────────────────────────────────────────────────

export function ScreenNodePreview({ nodeId, title, rawData, onBack, onReject, loading = false }: ScreenNodePreviewProps) {
  const Renderer = RENDERERS[nodeId]
  const hasData = rawData && Object.keys(rawData).length > 0
  const [feedback, setFeedback] = useState('')

  const isParallel = nodeId === 'parallel_research'

  const handleSendFeedback = useCallback(() => {
    if (!feedback.trim() || !onReject) return
    onReject(feedback.trim())
    setFeedback('')
  }, [feedback, onReject])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', padding: '8px 14px',
        borderBottom: '1px solid var(--line)', background: 'var(--bg)', flexShrink: 0,
      }}>
        <button
          type="button"
          onClick={onBack}
          style={{
            width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: 'none', background: 'none', cursor: 'pointer', borderRadius: 8,
            color: 'var(--fg)', fontSize: 18, fontFamily: 'var(--ff)',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { (e.target as HTMLElement).style.background = 'var(--surface)' }}
          onMouseLeave={e => { (e.target as HTMLElement).style.background = 'none' }}
        >‹</button>
        <span style={{
          flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 600,
          color: 'var(--fg)', fontFamily: 'var(--ff)',
        }}>{title}</span>
        <div style={{ width: 32 }} />
      </div>

      {/* Tab bar — 仅并行调研结果显示 */}
      {isParallel && (
        <ParallelResearchTabs data={rawData} />
      )}

      {/* 非并行调研节点的滚动区 */}
      {!isParallel && (
        <div style={{
          flex: 1, overflowY: 'auto', overflowX: 'hidden',
          padding: `${CONTENT_PAD}px ${CONTENT_PAD}px 0`,
        }}>
          {!hasData ? (
            <EmptyState message="暂无节点数据" />
          ) : (
            <div style={{
              display: 'flex', flexDirection: 'column', gap: CARD_GAP,
              paddingBottom: CONTENT_PAD * 2,
            }}>
              {Renderer ? <Renderer data={rawData} /> : <GenericFallbackView data={rawData} />}
            </div>
          )}
        </div>
      )}

      {/* 底部输入栏（仅在 onReject 存在时显示，与 ScreenActionPreview 一致） */}
      {onReject && (
        <div style={{
          borderTop: '1px solid var(--line)', background: 'var(--bg)',
          padding: '10px 14px 10px', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0,
        }}>
          <input
            type="text"
            placeholder="输入修改意见后发送，重新生成节点数据…"
            value={feedback}
            disabled={loading}
            onChange={e => setFeedback(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSendFeedback() }}
            style={{
              flex: 1, height: 36, border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
              padding: '0 10px', fontSize: 12, fontFamily: 'var(--ff)', outline: 'none',
              background: loading ? 'var(--surface)' : 'var(--surface)', color: 'var(--fg)',
              opacity: loading ? 0.5 : 1,
            }}
          />
          <button
            type="button"
            disabled={loading || !feedback.trim()}
            onClick={handleSendFeedback}
            style={{
              width: 36, height: 36, border: 'none', borderRadius: 'var(--r-sm)',
              background: loading || !feedback.trim() ? 'var(--border)' : 'var(--accent)',
              color: '#fff', fontSize: 16,
              cursor: loading || !feedback.trim() ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              fontFamily: 'var(--ff)',
            }}
          >↵</button>
        </div>
      )}
    </div>
  )
}
