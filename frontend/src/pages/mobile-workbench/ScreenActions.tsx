// ScreenActions — ④ 行动建议屏
// 对接后端 action_recommendations + plan_data_query + 视频/海报数据
import { useCallback, useState } from 'react'
import type { MobileScreen } from './ScreenChat'
import type { PlanOutputs } from '../../types/plan'
import { regeneratePoster, regeneratePromoVideo } from '../../api/plan'
import { optimizePrompt } from '../../api/promptOptimizer'

interface ScreenActionsProps {
  onNavigate: (s: MobileScreen) => void
  outputs: PlanOutputs
  runId?: string
  checkMediaStatus?: () => void
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

// ── 修改意见弹窗 ──────────────────────────────────

interface FeedbackModalProps {
  card: CardItem
  runId: string
  outputs: PlanOutputs
  onClose: () => void
  onRegenerated: () => void
}

function FeedbackModal({ card, runId, outputs, onClose, onRegenerated }: FeedbackModalProps) {
  const [feedback, setFeedback] = useState('')
  const [optimizing, setOptimizing] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isPoster = card.filterKey === 'poster'
  const promptType = isPoster ? 'image' as const : 'video' as const

  // 从 outputs 中提取品牌/产品/策略上下文，保证 AI 优化不偏题
  const buildContext = useCallback(() => {
    const brand = (outputs as Record<string, unknown>).brand_input as Record<string, unknown> | undefined
    const strategy = outputs.strategy_generation as Record<string, unknown> | undefined
    const fitness = outputs.fitness_analysis as Record<string, unknown> | undefined
    const parts: string[] = []
    if (brand?.brand_name) parts.push(`品牌：${brand.brand_name}`)
    if (brand?.category) parts.push(`品类：${brand.category}`)
    if (strategy?.positioning) parts.push(`核心主张：${strategy.positioning}`)
    if (fitness?.primary_sport) parts.push(`运动场景：${fitness.primary_sport}`)
    if (strategy?.marketing_goal) parts.push(`营销目标：${strategy.marketing_goal}`)
    return parts.join(' | ')
  }, [outputs])

  const handleOptimizePrompt = useCallback(async () => {
    if (!feedback.trim()) return
    setOptimizing(true)
    setError(null)
    try {
      // 把方案上下文拼到用户反馈前面，保证 LLM 知道是什么产品/品牌
      const context = buildContext()
      const contextualized = context ? `【方案背景】${context}\n【用户修改意见】${feedback}` : feedback
      const result = await optimizePrompt(contextualized, promptType)
      setFeedback(result.optimized)
    } catch (err) {
      setError(err instanceof Error ? err.message : '优化失败')
    } finally {
      setOptimizing(false)
    }
  }, [feedback, promptType, buildContext])

  const handleRegenerate = useCallback(async () => {
    if (!runId) return
    setSubmitting(true)
    setError(null)
    try {
      if (isPoster) {
        await regeneratePoster(runId, '2688*1536', feedback)
      } else {
        await regeneratePromoVideo(runId, feedback)
      }
      onClose()
      onRegenerated()
    } catch (err) {
      setError(err instanceof Error ? err.message : '重新生成失败')
    } finally {
      setSubmitting(false)
    }
  }, [runId, feedback, isPoster, onClose, onRegenerated])

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(15, 23, 42, 0.3)', padding: 20,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 320, background: '#fff', borderRadius: 16,
          padding: 24, boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
          animation: 'fadeSlideIn 0.25s ease-out',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 2 }}>
              {card.type} · 修改意见
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#111', lineHeight: 1.3 }}>
              重新生成{card.type}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              width: 28, height: 28, border: 'none', borderRadius: '50%',
              background: '#f3f4f6', color: '#6b7280', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 15, fontFamily: 'var(--ff)', flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Textarea */}
        <textarea
          value={feedback}
          onChange={e => setFeedback(e.target.value)}
          placeholder="说说你想怎么修改？比如：换个更清新的风格、色彩更鲜艳、突出运动感…"
          rows={3}
          style={{
            width: '100%', padding: '10px 12px', borderRadius: 10,
            border: '1px solid #e5e7eb', fontSize: 13, lineHeight: 1.5,
            fontFamily: 'var(--ff)', resize: 'none', boxSizing: 'border-box',
            outline: 'none', transition: 'border-color 0.2s',
          }}
          onFocus={e => { e.target.style.borderColor = '#1677ff' }}
          onBlur={e => { e.target.style.borderColor = '#e5e7eb' }}
        />

        {/* Optimize prompt button */}
        <div style={{ marginTop: 8, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            disabled={!feedback.trim() || optimizing}
            onClick={handleOptimizePrompt}
            style={{
              fontSize: 11, padding: '4px 12px', borderRadius: 12,
              border: '1px solid #dbeafe', background: optimizing ? '#f0f5ff' : '#eff6ff',
              color: optimizing ? '#9ca3af' : '#1677ff', cursor: feedback.trim() ? 'pointer' : 'not-allowed',
              fontFamily: 'var(--ff)', fontWeight: 600,
              display: 'inline-flex', alignItems: 'center', gap: 3,
              transition: 'all 0.2s',
            }}
          >
            {optimizing ? '⏳ 优化中…' : '✨ 优化提示词'}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={{ fontSize: 11, color: '#dc2626', marginTop: 8, lineHeight: 1.4 }}>
            {error}
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              flex: 1, height: 40, border: '1px solid #e5e7eb',
              borderRadius: 10, background: '#fff',
              color: '#6b7280', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', fontFamily: 'var(--ff)',
            }}
          >
            取消
          </button>
          <button
            type="button"
            disabled={submitting || !runId}
            onClick={handleRegenerate}
            style={{
              flex: 1, height: 40, border: 'none', borderRadius: 10,
              background: submitting ? '#9ca3af' : '#1677ff',
              color: '#fff', fontSize: 13, fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--ff)',
            }}
          >
            {submitting ? '⏳ 生成中…' : '🔄 重新生成'}
          </button>
        </div>

        <style>{`
          @keyframes fadeSlideIn {
            from { opacity: 0; transform: translateY(12px) scale(0.97); }
            to { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}</style>
      </div>
    </div>
  )
}

// ── 卡片渲染 ──────────────────────────────────

function renderCard(c: CardItem, onDetail: (card: CardItem) => void, onEdit: (card: CardItem) => void) {
  const showEditBtn = c.filterKey === 'poster' || c.filterKey === 'shortvideo'

  const editBtn = showEditBtn && (
    <button
      type="button"
      onClick={e => { e.stopPropagation(); onEdit(c) }}
      title="修改后重新生成"
      style={{
        position: 'absolute', top: 6, right: 6,
        width: 26, height: 26, border: 'none', borderRadius: '50%',
        background: 'rgba(0,0,0,0.35)', color: '#fff', cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, lineHeight: 1, backdropFilter: 'blur(4px)',
        transition: 'background 0.2s', zIndex: 2,
      }}
      onMouseEnter={e => { (e.target as HTMLElement).style.background = 'rgba(0,0,0,0.55)' }}
      onMouseLeave={e => { (e.target as HTMLElement).style.background = 'rgba(0,0,0,0.35)' }}
    >
      ✏️
    </button>
  )

  if (c.isVideo && c.videoUrl) {
    return (
      <div key={c.id} className="acard" style={{ position: 'relative' }}>
        {editBtn}
        <div style={{ background: '#0f0f23', minHeight: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
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
      <div key={c.id} className="acard" style={{ position: 'relative' }}>
        {editBtn}
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

export function ScreenActions({ onNavigate, outputs, runId, checkMediaStatus }: ScreenActionsProps) {
  const [filter, setFilter] = useState<FilterKey>('all')
  const [detailCard, setDetailCard] = useState<CardItem | null>(null)
  const [editCard, setEditCard] = useState<CardItem | null>(null)
  const cards = buildCards(outputs)
  const filtered = filter === 'all' ? cards : cards.filter(c => c.filterKey === filter)

  const handleEdit = (card: CardItem) => {
    setDetailCard(null)
    setEditCard(card)
  }

  const handleRegenerated = useCallback(() => {
    // 触发媒体状态轮询
    if (checkMediaStatus) {
      checkMediaStatus()
      // 额外轮询几次确保拿到新状态
      let count = 0
      const interval = setInterval(() => {
        checkMediaStatus()
        count++
        if (count >= 6) clearInterval(interval)
      }, 4000)
    }
  }, [checkMediaStatus])

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
            {filtered.map(c => renderCard(c, setDetailCard, handleEdit))}
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

      {/* 修改意见弹窗 */}
      {editCard && runId && (
        <FeedbackModal
          card={editCard}
          runId={runId}
          outputs={outputs}
          onClose={() => setEditCard(null)}
          onRegenerated={handleRegenerated}
        />
      )}
    </>
  )
}
