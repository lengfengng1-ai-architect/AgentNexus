// ScreenActions — ④ 行动建议屏
// 对接后端 action_recommendations + plan_data_query + 视频/海报数据
import { useState } from 'react'
import type { MobileScreen } from './ScreenChat'
import type { PlanOutputs } from '../../types/plan'

interface ScreenActionsProps {
  onNavigate: (s: MobileScreen) => void
  outputs: PlanOutputs
}

interface CardItem {
  id: string
  type: string
  stage: string
  title: string
  meta: string
  metaFull: string
  time: string
  filterKey: 'poster' | 'shortvideo' | 'event' | 'thirdparty'
  videoUrl?: string
  imageUrl?: string
  isVideo?: boolean
}

const FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'poster', label: '海报' },
  { key: 'shortvideo', label: '短视频' },
  { key: 'event', label: '赛事' },
  { key: 'thirdparty', label: '第三方' },
] as const

type FilterKey = (typeof FILTERS)[number]['key']

const STAGE_LABELS = ['筹备期', '预热期', '爆发期', '收割期']

function stageFor(idx: number): string {
  return STAGE_LABELS[idx % STAGE_LABELS.length]
}

function buildCards(outputs: PlanOutputs): CardItem[] {
  const cards: CardItem[] = []
  const cityData = outputs.plan_data_query as Record<string, unknown> | undefined
  const strategy = outputs.strategy_generation as Record<string, unknown> | undefined
  const fitness = outputs.fitness_analysis as Record<string, unknown> | undefined
  const execution = outputs.execution_planning as Record<string, unknown> | undefined
  const brandInput = (outputs as Record<string, unknown>).brand_input as Record<string, unknown> | undefined
  const brandName = brandInput?.brand_name as string || ''
  const primarySport = (fitness?.primary_sport as string) || ''
  const positioning = strategy?.positioning as string || ''
  const marketGoal = strategy?.marketing_goal as string || ''
  const eventsPlan = (execution?.events_plan as string) || ''
  const contentPlan = (execution?.content_plan as string) || ''
  const leaguesPlan = (execution?.leagues_plan as string) || ''

  // 海报卡片
  const poster = outputs.poster
  if (poster) {
    cards.push({
      id: 'poster_card',
      type: '海报',
      stage: poster.status === 'completed' ? '已生成' : poster.status === 'failed' ? '生成失败' : '生成中',
      title: '营销方案主视觉海报',
      meta: poster.status === 'completed' ? '点击查看大图' : poster.status === 'failed' ? `生成失败: ${poster.error || ''}` : '海报正在生成中…',
      metaFull: poster.status === 'completed' ? '海报已生成，点击可查看大图' : `状态: ${poster.status}`,
      time: poster.size ? `尺寸 ${poster.size}` : '',
      filterKey: 'poster',
      imageUrl: poster.image_url,
    })
  }

  // 视频卡片
  const pv = outputs.promo_video
  if (pv) {
    cards.push({
      id: 'promo_video_card',
      type: '短视频',
      stage: pv.status === 'completed' ? '已生成' : pv.status === 'failed' ? '生成失败' : '生成中',
      title: '营销方案宣传视频',
      meta: pv.status === 'completed' ? '点击播放查看' : pv.status === 'failed' ? `生成失败: ${pv.error || ''}` : '视频正在生成中…',
      metaFull: pv.status === 'completed' ? '宣传视频已生成，可直接播放' : `状态: ${pv.status}`,
      time: '',
      filterKey: 'shortvideo',
      videoUrl: pv.video_url,
      isVideo: true,
    })
  }

  // 赛事活动
  const tournaments = (cityData?.tournament as Record<string, unknown> | undefined)?.available_tournaments as unknown[] | undefined
  if (tournaments && tournaments.length > 0 && primarySport) {
    const names = tournaments.slice(0, 3).map((t: unknown) => (t as Record<string, unknown>).name as string).join('、')
    const detail = (tournaments as Record<string, unknown>[]).map((t, i) =>
      `${i+1}. ${t.name}（${t.sport_type}）规模${t.scale}，${t.frequency}`
    ).join('\n')
    cards.push({
      id: 'event_platform',
      type: '赛事活动', stage: stageFor(0),
      title: `发起"${names.slice(0, 30)}"${primarySport}活动`,
      meta: `方案规划${eventsPlan.slice(0, 50)}`,
      metaFull: `【可选赛事】\n${detail}\n\n【方案规划】\n${eventsPlan}`,
      time: '进入赛事管理 → 创建赛事',
      filterKey: 'event',
    })
  }

  // 奖杯定制
  const trophy = cityData?.trophy as Record<string, unknown> | undefined
  if (trophy && (trophy.trophy_types as string[] | undefined)?.length && primarySport) {
    const types = (trophy.trophy_types as string[]).join('、')
    cards.push({
      id: 'trophy',
      type: '奖杯定制', stage: stageFor(2),
      title: `定制${primarySport}赛事奖杯`,
      meta: `支持${types.slice(0, 40)}等，提前${trophy.avg_lead_time_days || 15}天预订`,
      metaFull: `【支持的奖杯类型】\n${types}\n\n【定制提前期】\n${trophy.avg_lead_time_days || 15}天`,
      time: '进入赛事管理 → 奖杯定制',
      filterKey: 'event',
    })
  }

  // 排行榜
  const leaderboard = cityData?.leaderboard as Record<string, unknown> | undefined
  const kpis = (outputs.budget_kpi as Record<string, unknown> | undefined)?.kpis as Record<string, unknown> | undefined
  if (leaderboard && kpis) {
    const kpiText = Object.entries(kpis).slice(0, 3).map(([k, v]) => `${k}：${v}`).join('\n')
    const lbTypes = (leaderboard.leaderboard_types as string[]) || []
    const reward = (leaderboard.reward_mechanism as string) || ''
    cards.push({
      id: 'leaderboard',
      type: '排行榜', stage: stageFor(2),
      title: `冲榜：${Object.entries(kpis).slice(0, 1).map(([k, v]) => `${k}${v}`).join('、').slice(0, 30)}`,
      meta: `参与${lbTypes.slice(0, 2).join('、')}争夺流量奖励`,
      metaFull: `【KPI 目标】\n${kpiText}\n\n【排行榜类型】\n${lbTypes.join('、')}\n\n【奖励机制】\n${reward}`,
      time: '进入数据中心 → 查看排行',
      filterKey: 'event',
    })
  }

  // 第三方推广
  if (brandName && positioning) {
    cards.push({
      id: 'xiaohongshu',
      type: '小红书', stage: stageFor(0),
      title: `小红书"#${brandName}${primarySport || '运动'}"话题营销`,
      meta: `基于"${positioning}"定位，发布穿搭/测评/赛事Vlog种草内容`,
      metaFull: `【品牌】${brandName}\n【定位】${positioning}\n【运动场景】${primarySport || '运动'}\n\n【内容方向】\n发布${primarySport || '运动'}穿搭/测评/赛事Vlog等种草内容\n\n【话题】\n#${brandName}${primarySport || '运动'}`,
      time: `${contentPlan.slice(0, 40)}`,
      filterKey: 'thirdparty',
    })
    cards.push({
      id: 'douyin',
      type: '抖音', stage: stageFor(2),
      title: `抖音#${brandName}品牌挑战赛`,
      meta: `围绕${marketGoal}目标，发起挑战赛+达人带货直播`,
      metaFull: `【品牌】${brandName}\n【营销目标】${marketGoal || '未设置'}\n\n【推广策略】\n发起品牌挑战赛，联动达人带货直播\n${contentPlan.slice(0, 100)}`,
      time: `${contentPlan.slice(0, 40)}`,
      filterKey: 'thirdparty',
    })
  }

  return cards
}

function renderCard(c: CardItem, onDetail: (card: CardItem) => void) {
  if (c.isVideo && c.videoUrl) {
    return (
      <div key={c.id} className="acard">
        <div style={{ background: '#0f0f23', minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <video src={c.videoUrl} controls style={{ width: '100%', maxHeight: 200 }}>您的浏览器不支持视频播放</video>
        </div>
        <div className="ab">
          <div className="at">{c.title}</div>
          <div className="am"><span className="type-tag">{c.type}</span>{c.meta}</div>
          <div className="af"><div className="meta">{c.time}</div></div>
        </div>
      </div>
    )
  }

  if (c.imageUrl) {
    return (
      <div key={c.id} className="acard">
        <div style={{ background: 'var(--accent-softer)', minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 8 }}>
          <img src={c.imageUrl} alt={c.title} style={{ maxWidth: '100%', maxHeight: 180, borderRadius: 4, objectFit: 'contain' }} />
        </div>
        <div className="ab">
          <div className="at">{c.title}</div>
          <div className="am"><span className="type-tag">{c.type}</span>{c.meta}</div>
          <div className="af"><div className="meta">{c.time}</div></div>
        </div>
      </div>
    )
  }

  return (
    <div key={c.id} className="acard">
      <div className="thumb">
        <span className="type">{c.type}</span>
        <span className="stage">{c.stage}</span>
      </div>
      <div className="ab">
        <div className="at">{c.title}</div>
        <div className="am">{c.meta}</div>
        <div className="af">
          <div className="meta">{c.time}</div>
          <button className="adopt" onClick={() => onDetail(c)}>查看详情</button>
        </div>
      </div>
    </div>
  )
}

export function ScreenActions({ onNavigate, outputs }: ScreenActionsProps) {
  const [filter, setFilter] = useState<FilterKey>('all')
  const [detailCard, setDetailCard] = useState<CardItem | null>(null)
  const cards = buildCards(outputs)
  const filtered = filter === 'all' ? cards : cards.filter(c => c.filterKey === filter)

  return (
    <>
      {cards.length === 0 ? (
        <div className="mw-placeholder">
          <div className="ph-title">💡 暂无行动建议</div>
          <div>请先在 ③ 方案生成屏完成方案生成</div>
        </div>
      ) : (
        <>
          <div className="filters">
            {FILTERS.map(f => (
              <span key={f.key} className={'fchip' + (filter === f.key ? ' on' : '')} onClick={() => setFilter(f.key)}>
                {f.label}
              </span>
            ))}
          </div>
          <div className="feed">
            {filtered.map(c => renderCard(c, setDetailCard))}
          </div>
          <div className="cta-line" onClick={() => onNavigate('dispatch')}>
            <div>
              <div className="big">采纳并下发至盟域</div>
              <div className="small">统一发声 · 跨盟转发执行</div>
            </div>
            <div className="go">下发 ›</div>
          </div>
        </>
      )}

      {/* 详情弹窗 */}
      {detailCard && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(15, 23, 42, 0.3)', padding: 20,
          }}
          onClick={() => setDetailCard(null)}
        >
          <div
            style={{
              width: 320, background: '#fff', borderRadius: 12,
              padding: 20, boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
              maxHeight: '70vh', overflowY: 'auto',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{detailCard.type} · {detailCard.stage}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#111', marginBottom: 12 }}>{detailCard.title}</div>
            <div style={{ fontSize: 12, lineHeight: 1.7, color: '#374151', whiteSpace: 'pre-wrap' }}>
              {detailCard.metaFull}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 12 }}>{detailCard.time}</div>
            <button
              onClick={() => setDetailCard(null)}
              style={{
                width: '100%', height: 40, border: 'none', borderRadius: 8,
                background: '#1677ff', color: '#fff', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', marginTop: 14, fontFamily: 'var(--ff)',
              }}
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </>
  )
}
