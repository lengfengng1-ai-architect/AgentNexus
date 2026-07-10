import { useCallback, useEffect, useRef, useState } from 'react'
import { marked } from 'marked'
import { usePlanRun } from '../hooks/usePlanRun'
import { regeneratePoster } from '../api/plan'
import type { BrandInput } from '../types/chat'
import { PlanActionCards } from './PlanActionCards'
import { PlanForm } from './PlanForm'
import { PlanPreview, stripDuplicateTitleHeading } from './PlanPreview'
import type { PlanChapter } from '../types/plan'
import { PipelineTimeline } from './PipelineTimeline'

const BRAND_INPUT_KEY = 'allygo_pending_brand_input'
const STORAGE_KEY = 'allygo_plan_session'
const RUN_ID_KEY = 'allygo_plan_run_id'
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

// 从方案章节中拼出海报生成提示词：取各章标题 + 内容摘要
function buildPosterPrompt(chapters: PlanChapter[]): string {
  if (chapters.length === 0) return ''
  const summary = chapters
    .slice(0, 4)
    .map((c) => `${c.title}：${c.content.replace(/[#*`\n]/g, ' ').slice(0, 120)}`)
    .join('；')
  return `基于以下营销方案生成一张主视觉海报，要求画面大气、品牌感强、色彩鲜明，突出运动场景与年轻活力：${summary}`
}

const POSTER_SIZE_OPTIONS = [
  { value: '2688*1536', label: '16:9 横版' },
  { value: '1536*2688', label: '9:16 竖版' },
  { value: '2048*2048', label: '1:1 方图' },
  { value: '2368*1728', label: '4:3 通用' },
]

function usePlanSession() {
  const [seed] = useState<BrandInput | undefined>(() => {
    try {
      const raw = sessionStorage.getItem(BRAND_INPUT_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as BrandInput
        if (parsed.brand_name || parsed.category || parsed.city || parsed.budget || parsed.period) {
          sessionStorage.removeItem(BRAND_INPUT_KEY)
          return parsed
        }
      }
    } catch { /* ignore */ }
    return undefined
  })
  const save = useCallback((brandInput: BrandInput) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ brandInput })) } catch { /* ignore */ }
  }, [])
  return { seed, save }
}

interface PlanFormData {
  brandName: string; category: string; city: string; budget: number; period: number
  productMatrix?: string; positioning?: string; marketingGoal?: string
  targetAudience?: string; history?: string; constraints?: string
}

export function PlanPage() {
  const {
    runId,
    status,
    nodes,
    outputs,
    failedNode,
    error,
    isLoading,
    isConnected,
    nodeLogs,
    pausedNode,
    pausedSnapshot,
    chapters,
    start,
    approve,
    reject,
    cancel,
    rerun,
    restoreFromRunId,
    checkMediaStatus,
  } = usePlanRun()
  const { seed, save } = usePlanSession()

  // Restore paused/completed run on mount
  useEffect(() => {
    const savedRunId = localStorage.getItem(RUN_ID_KEY)
    if (savedRunId && savedRunId !== 'null' && savedRunId !== 'undefined') {
      restoreFromRunId(savedRunId)
    }
  }, [restoreFromRunId])
  const [sidebarCollapsed, setSidebarCollapsed] = useState(status !== 'idle')
  useEffect(() => { if (status !== 'idle') setSidebarCollapsed(true) }, [status])
  const contentRef = useRef<HTMLDivElement>(null)

  const handleStart = useCallback((data: PlanFormData) => {
    const brandInput: BrandInput = {
      brand_name: data.brandName,
      category: data.category,
      city: data.city,
      budget: data.budget,
      period: data.period,
    }
    save(brandInput)
    start({ ...brandInput })
  }, [save, start])

  const displayedChapters = chapters.length > 0 ? chapters : (outputs?.plan_generator?.chapters || [])

  // 海报:状态完全从后端 outputs.poster 读(后端 plan_generator 完成后自动生成并入库),
  // 刷新页面不重新生成。posterSize 仅是本地尺寸选择。
  const poster = outputs?.poster
  const posterUrl = poster?.status === 'completed' ? poster.image_url : null
  const isGeneratingPoster = poster?.status === 'generating'
  const [posterSize, setPosterSize] = useState('2688*1536')
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [posterTriggerError, setPosterTriggerError] = useState<string | null>(null)

  const handleGeneratePoster = useCallback(async () => {
    if (!runId || isGeneratingPoster) return
    setPosterTriggerError(null)
    try {
      await regeneratePoster(runId, posterSize)
      // 立即拉一次,让 outputs.poster 变成 generating(后续轮询接管)
      checkMediaStatus()
    } catch (err) {
      setPosterTriggerError(err instanceof Error ? err.message : '海报生成失败')
    }
  }, [runId, isGeneratingPoster, posterSize, checkMediaStatus])

  // 切换尺寸:立即触发后端重新生成
  const handleSizeChange = useCallback((size: string) => {
    setPosterSize(size)
    if (runId && !isGeneratingPoster) {
      setPosterTriggerError(null)
      regeneratePoster(runId, size).then(() => checkMediaStatus()).catch((err) => {
        setPosterTriggerError(err instanceof Error ? err.message : '海报生成失败')
      })
    }
  }, [runId, isGeneratingPoster, checkMediaStatus])

  const posterPromptText = buildPosterPrompt(displayedChapters) || '基于当前营销方案自动生成主视觉海报'

  // 视频卡片:始终占位,没数据时显示生成中
  const pv = outputs?.promo_video
  const promoVideoCard = {
    title: !pv
      ? '🎬 宣传视频生成中…'
      : pv.status === 'completed'
        ? '🎬 宣传视频'
        : pv.status === 'failed'
          ? '🎬 视频生成失败'
          : '🎬 宣传视频生成中…',
    description: !pv
      ? '视频正在生成中，请耐心等待…'
      : pv.status === 'completed'
        ? '点击播放查看营销方案宣传视频'
        : pv.status === 'failed'
          ? `视频生成失败: ${pv.error || ''}`
          : '视频正在生成中，请耐心等待…',
    buttonLabel: '查看详情',
    type: 'video' as const,
    videoUrl: pv?.video_url,
    promoVideo: pv ?? { status: 'generating' as const },
  }

  const actionItemsBase = outputs?.action_recommendations?.actions?.map((a: { title: string; description: string }) => ({
    title: a.title,
    description: a.description,
    buttonLabel: '查看详情',
    type: 'normal' as const,
  })) ?? []

  // 平台操作模块（按方案内容定制，引导去app操作）
  const cityData = outputs?.plan_data_query as Record<string, unknown> | undefined
  const strategy = outputs?.strategy_generation as Record<string, unknown> | undefined
  const fitness = outputs?.fitness_analysis as Record<string, unknown> | undefined
  const execution = outputs?.execution_planning as Record<string, unknown> | undefined
  const planChapters = displayedChapters
  const platformModules: { title: string; description: string; buttonLabel: string }[] = []

  const primarySport = (fitness?.primary_sport as string) || ''
  const secondarySport = (fitness?.secondary_sport as string) || ''
  const eventsPlan = (execution?.events_plan as string) || ''
  const category = (outputs?.brand_input as Record<string, unknown> | undefined)?.category as string || ''
  const kpis = (outputs?.budget_kpi as Record<string, unknown> | undefined)?.kpis as Record<string, unknown> | undefined
  const budget = (outputs?.budget_kpi as Record<string, unknown> | undefined)?.total_budget as number | undefined
  const contentPlan = (execution?.content_plan as string) || ''
  const influencerPlan = (execution?.influencer_plan as string) || ''
  const leaguesPlan = (execution?.leagues_plan as string) || ''
  const brandName = (outputs?.brand_input as Record<string, unknown> | undefined)?.brand_name as string || ''
  const positioning = strategy?.positioning as string || ''
  const marketGoal = strategy?.marketing_goal as string || ''

  // 赛事活动模块 — 引用方案的运动类型和赛事计划
  const tournaments = (cityData?.tournament as Record<string, unknown> | undefined)?.available_tournaments as unknown[] | undefined
  if (tournaments && tournaments.length > 0 && primarySport) {
    const matched = tournaments.filter((t: Record<string, unknown>) =>
      (t.sport_type as string).includes(primarySport) || (t.name as string).includes(primarySport)
    ).slice(0, 2)
    const names = matched.length > 0
      ? matched.map((t: Record<string, unknown>) => t.name as string).join('、')
      : tournaments.slice(0, 2).map((t: Record<string, unknown>) => t.name as string).join('、')
    platformModules.push({
      title: `🏆 发起"${names}"${primarySport}活动`,
      description: `方案规划${primarySport}活动${eventsPlan.slice(0, 60)}，建议在平台发起"${names}"等赛事。进入赛事管理创建赛事、配置冠名/赞助权益。`,
      buttonLabel: '创建赛事',
    })
  } else if (tournaments && tournaments.length > 0) {
    const names = tournaments.slice(0, 2).map((t: Record<string, unknown>) => t.name as string).join('、')
    platformModules.push({
      title: `🏆 发起"${names}"赛事活动`,
      description: `方案涉及赛事推广，可在平台发起"${names}"等活动。进入赛事管理创建赛事即可发布。`,
      buttonLabel: '创建赛事',
    })
  }

  // 合作中心模块 — 引用品类/盟域计划
  const recruitments = (cityData?.cooperation_center as Record<string, unknown> | undefined)?.recruitments as unknown[] | undefined
  if (recruitments && recruitments.length > 0 && (category || leaguesPlan)) {
    const matched = recruitments.filter((r: Record<string, unknown>) => r.type === '达人招募' || r.type === '代理商招募')
    platformModules.push({
      title: `🤝 招募${category || ''}合作伙伴`,
      description: `方案聚焦${category}${leaguesPlan.slice(0, 40)}，建议在合作中心发布${matched.map((r: Record<string, unknown>) => r.type).join('、')}，目标招募${matched.map((r: Record<string, unknown>) => `${r.title}${r.target_count}个`).join('、')}。`,
      buttonLabel: '发布招募',
    })
  }

  // 排行榜模块 — 引用KPI目标
  const leaderboard = cityData?.leaderboard as Record<string, unknown> | undefined
  if (leaderboard && kpis) {
    const kpiText = Object.entries(kpis).slice(0, 2).map(([k, v]) => `${k}${v}`).join('、')
    const lbTypes = (leaderboard.leaderboard_types as string[]) || []
    platformModules.push({
      title: `📊 冲榜：${kpiText}`,
      description: `围绕KPI目标（${kpiText}），参与${lbTypes.slice(0, 2).join('、')}争夺流量和现金奖励加速达成。进入数据中心查看实时排名。`,
      buttonLabel: '查看排行',
    })
  }

  // 奖杯定制模块 — 引用赛事计划
  const trophy = cityData?.trophy as Record<string, unknown> | undefined
  if (trophy && (trophy.trophy_types as string[] | undefined)?.length && primarySport) {
    const types = (trophy.trophy_types as string[]).slice(0, 2).join('、')
    platformModules.push({
      title: `🏅 定制${primarySport}赛事奖杯`,
      description: `针对方案中的${primarySport}赛事，可定制${types}，提前${trophy.avg_lead_time_days || 15}天预订。进入赛事管理选择款式并上传logo。`,
      buttonLabel: '定制奖杯',
    })
  }

  // 促销模块 — 引用预算
  const saleTypes = (cityData?.sale as Record<string, unknown> | undefined)?.available_types as unknown[] | undefined
  if (saleTypes) {
    const names = (saleTypes as Record<string, unknown>[]).map(s => s.type as string).join('、')
    const saleData = cityData?.sale as Record<string, unknown> | undefined
    platformModules.push({
      title: `🛒 ${budget ? budget + '万预算' : ''}促销方案`,
      description: `预算${budget ? `${budget}万元` : '已定'}，支持${names}等方式配合营销节奏${saleData?.platform_commission_rate ? `（佣金${saleData.platform_commission_rate}）` : ''}。进入营销中心设置规则即可生效。`,
      buttonLabel: '创建促销',
    })
  }

  // 达人合作模块 — 引用达人矩阵内容
  const influencers = cityData?.influencers as Record<string, unknown> | undefined
  if (influencers) {
    const tiers = influencers.tiers as Record<string, unknown> | undefined
    platformModules.push({
      title: `⭐ ${brandName}达人合作计划`,
      description: `方案${influencerPlan.slice(0, 40)}，需筛选${influencers.count}位达人分层合作（至尊/大师${tiers?.supreme || 0}人、明星/精英${tiers?.star || 0}人、健将${tiers?.elite || 0}人、达人${tiers?.influencer || 0}人）。进入合作中心按条件筛选后发起邀约。`,
      buttonLabel: '筛选达人',
    })
  }

  // 外部平台推广模块
  const externalModules: { title: string; description: string; buttonLabel: string }[] = []

  if (brandName && positioning) {
    const chapterForContent = planChapters.find(c => c.title.includes('创意内容'))?.content || ''
    const chapterForChannel = planChapters.find(c => c.title.includes('达人') || c.title.includes('合作'))?.content || ''
    const sportStr = primarySport || '运动'

    externalModules.push({
      title: `📱 小红书"#${brandName}${sportStr}"话题营销`,
      description: `基于方案"${positioning}"定位，建议在小红书发起"#${brandName}${sportStr}挑战"话题，发布${sportStr}穿搭/测评/赛事Vlog等种草内容。参考内容方向：${chapterForContent.slice(0, 80)}。使用平台数据工具跟踪曝光和互动数据。`,
      buttonLabel: '查看内容策略',
    })
    externalModules.push({
      title: `🎬 抖音#${brandName}品牌挑战赛`,
      description: `围绕方案${marketGoal}目标，在抖音发起品牌挑战赛+达人带货直播。内容方向：${sportStr}场景短视频、产品开箱测评、赛事现场花絮。${chapterForContent.slice(0, 60)}。配合Dou+投流放大曝光。`,
      buttonLabel: '查看视频策略',
    })
    externalModules.push({
      title: '📺 视频号/公众号运营',
      description: `利用微信生态传播方案内容：视频号发布赛事精彩集锦和品牌故事，公众号发布深度营销复盘文章，微信社群做用户裂变和私域转化。结合${sportStr}场景触达目标人群。`,
      buttonLabel: '查看社媒策略',
    })
    externalModules.push({
      title: '🤳 得物/垂直社区种草',
      description: `在得物等运动潮流社区发布"${brandName}"装备评测和穿搭推荐，联合${chapterForChannel.slice(0, 60)}合作达人产出真实体验内容，引导用户到平台完成转化闭环。`,
      buttonLabel: '查看种草策略',
    })
  }

  // 合并：app平台模块 + 外部推广模块 + LLM行动建议
  const planGeneratorDone = Array.isArray(outputs?.plan_generator?.chapters) && outputs!.plan_generator!.chapters.length > 0
  const actionItems = !planGeneratorDone
    ? undefined
    : [
        promoVideoCard,
        {
          title: '根据方案生成海报',
          description: posterPromptText,
          buttonLabel: isGeneratingPoster ? '生成中…' : (posterUrl ? '重新生成' : '生成海报'),
          onClick: handleGeneratePoster,
          imageUrl: posterTriggerError ? null : posterUrl,
          isGenerating: isGeneratingPoster,
          hasImageLayout: true,
          onImageClick: posterUrl ? () => setLightboxOpen(true) : undefined,
          size: posterSize,
          sizeOptions: POSTER_SIZE_OPTIONS,
          onSizeChange: handleSizeChange,
        },
        ...platformModules,
        ...externalModules,
      ]

  const [autoMode, setAutoMode] = useState(false)
  const userInteractedRef = useRef(false)
  const [activeTab, setActiveTab] = useState(0)
  // 视频/海报轮询:仅在未连接 SSE 时拉。
  // SSE 连接中由事件驱动节点状态,轮询会触发 RESTORE_STATUS 重建所有节点,
  // 覆盖 SSE 刚推过来的 running 状态(节点状态闪烁/误弹确认继续)。
  useEffect(() => {
    if (isConnected) return
    // 两个都还没开始(plan_generator 未完成)→ 不轮询
    if (!pv && !poster) return
    const pvDone = pv?.status === 'completed' || pv?.status === 'failed'
    const posterDone = poster?.status === 'completed' || poster?.status === 'failed'
    if (pvDone && posterDone) return
    const interval = setInterval(checkMediaStatus, 5000)
    return () => clearInterval(interval)
  }, [pv?.status, poster?.status, isConnected, checkMediaStatus])

  const TABS = [
    { idx: 0, label: '概览', agentId: '' },
    { idx: 1, label: '产品调研', agentId: 'product_research' },
    { idx: 2, label: '市场研究', agentId: 'market_research' },
    { idx: 3, label: '人群洞察', agentId: 'audience_insight' },
    { idx: 4, label: '平台资源', agentId: 'plan_data_query' },
    { idx: 5, label: '适配度分析', agentId: 'fitness_analysis' },
    { idx: 6, label: '策略生成', agentId: 'strategy_generation' },
    { idx: 7, label: '执行规划', agentId: 'execution_planning' },
    { idx: 8, label: '预算KPI', agentId: 'budget_kpi' },
    { idx: 9, label: '行动建议', agentId: 'action_recommendations' },
    { idx: 10, label: '方案生成', agentId: 'plan_generator' },
  ]

  // Agent 运行时自动高亮对应 tab（仅在用户未手动点击时生效）
  // 并行场景下高亮最后一个 running agent（人群洞察）
  const runningAgentId =
    nodes.findLast(n => n.status === 'running')?.id
    ?? pausedNode
    ?? null
  const runningTabIndex = runningAgentId
    ? TABS.findIndex(t => t.agentId === runningAgentId)
    : -1

  // 用户手动点击 tab → 标记 interacted，防止自动高亮覆盖
  const handleTabClick = (idx: number) => {
    userInteractedRef.current = true
    setActiveTab(idx)
  }

  // 新 agent 执行时，若用户未手动操作过，自动跟随到对应 tab
  // ponytail: 仅在 runningTabIndex 有合法值时触发，不会在 inactive 时覆盖用户手动选择
  useEffect(() => {
    if (!userInteractedRef.current && runningTabIndex >= 0 && runningTabIndex !== activeTab) {
      setActiveTab(runningTabIndex)
    }
  }, [runningTabIndex]) // eslint-disable-line react-hooks/exhaustive-deps

  // 流水线完成后重置 interacted 状态
  useEffect(() => {
    if (status === 'idle' || status === 'completed') {
      userInteractedRef.current = false
      if (status === 'idle') setActiveTab(0)
    }
  }, [status])
  useEffect(() => {
    if (status === 'paused' && pausedNode && autoMode) {
      approve()
    }
  }, [status, pausedNode, autoMode, approve])

  const scrollToAgent = useCallback((agentId: string) => {
    const el = contentRef.current
    if (!el) return
    if (!agentId) { el.scrollTo?.({ top: 0, behavior: 'instant' }); return }
    const target = el.querySelector<HTMLElement>('[data-agent-id="' + agentId + '"]')
    if (!target) return
    const containerRect = el.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()
    // 防御：父容器或目标元素高度为 0 时（flex 坍缩瞬间）直接放弃滚动
    if (containerRect.height === 0 || targetRect.height === 0) return
    const offsetRelativeToContainer = targetRect.top - containerRect.top
    const scrollTo = el.scrollTop + offsetRelativeToContainer - containerRect.height / 2 + targetRect.height / 2
    el.scrollTo?.({ top: Math.max(0, scrollTo), behavior: 'smooth' })
  }, [])

  // 点击 tab → setActiveTab → re-render 完成后 → 滚动到对应 agent
  useEffect(() => {
    scrollToAgent(TABS[activeTab]?.agentId ?? '')
  }, [activeTab, scrollToAgent])

  const isPaused = status === 'paused'

  const auditPanel = null

  return (
    <div className="app" style={{ display: 'flex', height: '100%', backgroundColor: '#fafbfc' }}>
      <aside style={{
        width: sidebarCollapsed ? 48 : 360,
        minWidth: sidebarCollapsed ? 48 : 360,
        flexShrink: 0,
        background: '#fff',
        borderRight: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        transition: 'width 0.25s, min-width 0.25s',
      }}>
        <div style={{
          height: 64,
          padding: sidebarCollapsed ? '0 8px' : '0 22px',
          borderBottom: '1px solid #f1f5f9',
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {sidebarCollapsed ? (
              <div
                style={{
                  width: 34, height: 34, borderRadius: 6,
                  background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer',
                }}
                onClick={() => setSidebarCollapsed(false)}
              >
                A
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 6,
                    background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontWeight: 700, fontSize: 15,
                  }}
                  >
                    A
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.3px', color: '#0f172a' }}>AllyGo 营销方案 Agent</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>智能生成 · 数据驱动 · 可执行</div>
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="收起侧边栏"
                  onClick={() => setSidebarCollapsed(true)}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8', padding: 4, borderRadius: 4, display: 'flex' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="15" y1="18" x2="9" y2="12" />
                    <line x1="9" y1="12" x2="15" y2="6" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
        {!sidebarCollapsed && (
          <div className="sidebar-scroll" style={{ flex: 1, overflowY: 'auto', padding: '16px 22px 24px', minHeight: 0 }}>
            <PlanForm
              initial={seed}
              onSubmit={handleStart}
              isLoading={status === 'running'}
              status={status}
            />
            {isPaused && pausedSnapshot && (
              <div style={{
                marginTop: 16,
                padding: 14,
                borderRadius: 8,
                background: '#fffbeb',
                border: '1px solid #fcd34d',
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e', marginBottom: 8 }}>
                  ⏸ 等待人工审核：{pausedSnapshot.node_id}
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                  <button
                    type="button"
                    onClick={() => approve()}
                    disabled={isLoading || isConnected}
                    style={{
                      flex: 1,
                      padding: '8px 0',
                      borderRadius: 6,
                      border: 'none',
                      background: '#1e40af',
                      color: '#fff',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: isLoading || isConnected ? 'not-allowed' : 'pointer',
                      opacity: isLoading || isConnected ? 0.5 : 1,
                    }}
                  >
                    {isLoading ? '⏳ 提交中…' : '✓ 确认继续'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const reason = window.prompt('请输入驳回原因（必填）：')
                      if (reason) reject(reason)
                    }}
                    disabled={isLoading || isConnected}
                    style={{
                      flex: 1,
                      padding: '8px 0',
                      borderRadius: 6,
                      border: '1px solid #d1d5db',
                      background: '#fff',
                      color: '#374151',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      opacity: isConnected ? 0.6 : 1,
                    }}
                  >
                    ↻ 驳回重跑
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('确定取消本次方案生成？取消后将删除运行记录。')) cancel()
                  }}
                  style={{
                    width: '100%',
                    padding: '6px 0',
                    borderRadius: 6,
                    border: 'none',
                    background: 'transparent',
                    color: '#b45309',
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  取消运行
                </button>
              </div>
            )}
            {error && (
              <div style={{
                marginTop: 16,
                padding: 12,
                borderRadius: 8,
                background: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#b91c1c',
                fontSize: 12,
              }}>
                {error}
              </div>
            )}
          </div>
        )}
      </aside>

      <main style={{
        flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column',
      }}>
        <header style={{
          height: 64, background: '#fff', borderBottom: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 28px', flexShrink: 0,
        }}>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.3px', color: '#0f172a' }}>营销方案工作台</div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
            <button
              type="button"
              onClick={() => setAutoMode(!autoMode)}
              style={{
                padding: '8px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600,
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                background: autoMode ? '#059669' : '#fff',
                border: autoMode ? 'none' : '1px solid #e2e8f0',
                color: autoMode ? '#fff' : '#475569',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              {autoMode ? '自动执行中' : '自动执行'}
            </button>
            <button
              onClick={() => exportPdf(displayedChapters)}
              style={{
                padding: '8px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600,
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                background: '#fff', border: '1px solid #e2e8f0', color: '#475569',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              导出 PDF
            </button>
            <button
              onClick={() => {
                const xlsxPath = outputs?.plan_generator?.xlsx_path as string | undefined
                if (xlsxPath) {
                  const downloadUrl = `${API_BASE.replace('/api/v1', '')}${xlsxPath}`
                  window.open(downloadUrl, '_blank')
                }
              }}
              style={{
                padding: '8px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600,
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                background: '#fff', border: '1px solid #e2e8f0', color: '#475569',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="18" rx="2" ry="2" />
                <line x1="2" y1="9" x2="22" y2="9" />
                <line x1="9" y1="3" x2="9" y2="21" />
              </svg>
              导出 XLSX
            </button>
          </div>
        </header>

        <nav style={{
          height: 52, background: '#fff', borderBottom: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center', gap: 4, padding: '0 28px', flexShrink: 0,
        }}
        >
          {TABS.map(t => {
            const isActive = t.idx === activeTab
            return (
            <button
              key={t.idx}
              onClick={() => handleTabClick(t.idx)}
              style={{
                padding: '8px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', whiteSpace: 'nowrap', border: 'none',
                background: isActive ? '#1e40af' : 'transparent',
                color: isActive ? '#fff' : '#475569',
              }}
            >
              {t.label}
            </button>
            )
          })}
        </nav>


        <div ref={contentRef} style={{ flex: 1, overflowY: 'auto', padding: 28, background: '#fafbfc' }}>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            {auditPanel}
            <PipelineTimeline nodes={nodes} failedNode={failedNode} nodeLogs={nodeLogs} pausedNode={pausedNode} autoMode={autoMode} isLoading={isLoading} isConnected={isConnected} onApprove={approve} onRerun={rerun} />
            {displayedChapters.length > 0 && <PlanPreview chapters={displayedChapters} />}
            {actionItems && actionItems.length > 0 && (
              <div id="actions-anchor"><PlanActionCards actions={actionItems} /></div>
            )}
          </div>
        </div>
      </main>

      {actionItems && actionItems.length > 0 && (
        <button
          style={{
            position: 'fixed', right: 28, bottom: 28, width: 56, height: 56,
            borderRadius: '50%', background: '#f97316', color: '#fff', border: 'none',
            boxShadow: '0 6px 20px rgba(249, 115, 22, 0.35)',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, zIndex: 200,
          }}
          onClick={() => document.getElementById('action-modal')?.classList.add('open')}
        >
          🎯
        </button>
      )}
      {actionItems && actionItems.length > 0 && (
        <div
          id="action-modal"
          onClick={(e) => { if (e.target === e.currentTarget) e.currentTarget.classList.remove('open') }}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)',
            display: 'none', alignItems: 'center', justifyContent: 'center',
            zIndex: 300, backdropFilter: 'blur(4px)',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 14, width: '90%', maxWidth: 520,
              maxHeight: '80vh', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.08)',
            }}
          >
            <div style={{
              padding: '20px 24px', borderBottom: '1px solid #e2e8f0',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}
            >
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>🎯 下一步行动建议</h3>
              <button
                onClick={() => document.getElementById('action-modal')?.classList.remove('open')}
                style={{
                  width: 28, height: 28, borderRadius: '50%', border: 'none',
                  background: '#f1f5f9', color: '#475569', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: '20px 24px', overflowY: 'auto', maxHeight: '50vh' }}>
              <PlanActionCards actions={actionItems} />
            </div>
            <div style={{
              padding: '16px 24px', borderTop: '1px solid #e2e8f0',
              display: 'flex', justifyContent: 'flex-end',
            }}
            >
              <button
                onClick={() => document.getElementById('action-modal')?.classList.remove('open')}
                style={{
                  padding: '8px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', background: '#fff', border: '1px solid #e2e8f0', color: '#475569',
                }}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {lightboxOpen && posterUrl && (
        <div
          onClick={() => setLightboxOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.85)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 400, padding: 32, backdropFilter: 'blur(4px)',
          }}
        >
          <img
            src={posterUrl}
            alt="海报大图"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '100%', maxHeight: '100%', borderRadius: 8,
              boxShadow: '0 20px 60px rgba(0,0,0,0.4)', objectFit: 'contain',
            }}
          />
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            style={{
              position: 'absolute', top: 20, right: 24, width: 36, height: 36,
              borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.15)',
              color: '#fff', cursor: 'pointer', fontSize: 18,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}

function exportPdf(chapters: PlanChapter[]) {
  if (!chapters.length) return
  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>营销方案</title>
<style>
  @page { margin: 2.5cm 2cm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif; color: #1a1a1a; line-height: 1.8; padding: 0; }
  .cover { text-align: center; padding: 12rem 0 8rem; page-break-after: always; }
  .cover h1 { font-size: 2.4em; font-weight: 800; letter-spacing: 2px; margin-bottom: 1rem; }
  .cover p { font-size: 1.1em; color: #666; }
  .chapter { page-break-before: always; padding-top: 2rem; }
  .chapter:first-of-type { page-break-before: auto; }
  .chapter h2 { font-size: 1.6em; font-weight: 700; color: #1e40af; padding-bottom: 0.5rem; border-bottom: 2px solid #e2e8f0; margin-bottom: 1.5rem; }
  .chapter .subtitle { font-size: 0.9em; color: #94a3b8; margin-top: -1rem; margin-bottom: 1.5rem; }
  .chapter-content { font-size: 0.95em; }
  .chapter-content h2 { font-size: 1.25rem; font-weight: 700; color: #0f172a; margin-top: 1.5em; margin-bottom: 0.75em; }
  .chapter-content h3 { font-size: 1.1rem; font-weight: 600; color: #1e293b; margin-top: 1.25em; margin-bottom: 0.5em; }
  .chapter-content h4 { font-size: 1rem; font-weight: 600; color: #334155; margin-top: 1em; margin-bottom: 0.5em; }
  .chapter-content p { margin-bottom: 0.75em; line-height: 1.8; }
  .chapter-content strong { font-weight: 600; }
  .chapter-content em { font-style: italic; }
  .chapter-content ul, .chapter-content ol { margin: 0.5em 0; padding-left: 1.5em; }
  .chapter-content li { margin-bottom: 0.3em; line-height: 1.7; }
  .chapter-content table { width: 100%; border-collapse: collapse; margin: 1em 0; }
  .chapter-content th, .chapter-content td { border: 1px solid #d1d5db; padding: 8px 12px; text-align: left; }
  .chapter-content th { background: #f8fafc; font-weight: 600; }
  .chapter-content blockquote { border-left: 3px solid #3b82f6; padding: 8px 16px; margin: 1em 0; background: #f8fafc; color: #475569; }
  .chapter-content code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 0.875em; }
  .chapter-content pre { background: #1e293b; color: #e2e8f0; padding: 16px; border-radius: 8px; overflow-x: auto; margin: 1em 0; }
  .chapter-content pre code { background: transparent; padding: 0; color: inherit; }
  .chapter-content hr { margin: 1.5em 0; border: none; border-top: 1px solid #e2e8f0; }
  @media print { .no-print { display: none; } }
</style>
</head>
<body>
  <div class="cover">
    <h1>营销方案</h1>
    <p>由 AllyGo AI 智能生成 · 数据驱动 · 可执行</p>
  </div>
  ${chapters.map((ch, i) => `
  <div class="chapter">
    <h2>${i + 1}. ${ch.title}</h2>
    <div class="subtitle">${ch.subtitle}</div>
    <div class="chapter-content">${(() => { try { return marked.parse(stripDuplicateTitleHeading(ch.content, ch.title)) } catch { return ch.content } })()}</div>
  </div>`).join('\n  ')}
</body>
</html>`
  const win = window.open('', '_blank')
  if (!win) { alert('请允许弹出窗口'); return }
  win.document.write(html)
  win.document.close()
  win.focus()
  win.print()
}

const _injectedStyle = document.createElement('style')
_injectedStyle.textContent = `#action-modal.open { display: flex !important; }`
// ponytail: 模块级 style 注入在 HMR 时重复执行，但因 ID 覆盖无实际影响
document.head.appendChild(_injectedStyle)
