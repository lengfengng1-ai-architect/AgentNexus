import { useCallback, useEffect, useRef, useState } from 'react'
import { marked } from 'marked'
import { usePlanRun } from '../hooks/usePlanRun'
import type { BrandInput } from '../types/chat'
import { PlanActionCards } from './PlanActionCards'
import { PlanForm } from './PlanForm'
import { PlanPreview } from './PlanPreview'
import type { PlanChapter } from '../types/plan'
import { PipelineTimeline } from './PipelineTimeline'

const BRAND_INPUT_KEY = 'allygo_pending_brand_input'
const STORAGE_KEY = 'allygo_plan_session'
const RUN_ID_KEY = 'allygo_plan_run_id'
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

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
    refreshStatus,
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

  // 海报生成状态
  const [posterUrl, setPosterUrl] = useState<string | null>(null)
  const [isGeneratingPoster, setIsGeneratingPoster] = useState(false)
  const [posterError, setPosterError] = useState<string | null>(null)
  const [posterSize, setPosterSize] = useState('2688*1536')
  const [lightboxOpen, setLightboxOpen] = useState(false)
  // 自动生成只触发一次,避免重复请求(即使 status 多次重渲染)
  const autoTriggeredRef = useRef(false)

  const handleGeneratePoster = useCallback(async () => {
    if (isGeneratingPoster) return
    const prompt = buildPosterPrompt(displayedChapters)
    if (!prompt) return
    setIsGeneratingPoster(true)
    setPosterError(null)
    setPosterUrl(null)
    try {
      const resp = await fetch(`${API_BASE_URL}/image/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, size: posterSize }),
      })
      const body = await resp.json()
      if (!body.success) {
        throw new Error(body.error?.detail || '海报生成失败')
      }
      setPosterUrl(body.data.image_url)
    } catch (err) {
      setPosterError(err instanceof Error ? err.message : '请求失败')
    } finally {
      setIsGeneratingPoster(false)
    }
  }, [displayedChapters, isGeneratingPoster, posterSize])

  // 方案完成后自动生成海报(只触发一次)
  useEffect(() => {
    if (
      status === 'completed'
      && displayedChapters.length > 0
      && !autoTriggeredRef.current
      && !posterUrl
      && !isGeneratingPoster
    ) {
      autoTriggeredRef.current = true
      handleGeneratePoster()
    }
  }, [status, displayedChapters.length, posterUrl, isGeneratingPoster, handleGeneratePoster])

  // 切换尺寸时若有图片,自动重新生成;无图片时只更新下拉值,等自动生成触发
  const handleSizeChange = useCallback((size: string) => {
    setPosterSize(size)
    if (posterUrl) {
      // 已有图片 → 切尺寸立即重生成
      setPosterUrl(null)
      // 等下一帧 state 更新后再触发(handleGeneratePoster 依赖 posterSize)
      setTimeout(() => { handleGeneratePoster() }, 0)
    }
  }, [posterUrl, handleGeneratePoster])

  const posterPromptText = buildPosterPrompt(displayedChapters) || '基于当前营销方案自动生成主视觉海报'

  // 下一步建议只在完整方案生成后展示(completed 状态)
  // 卡片顺序: 宣传视频(若有) → 海报生成 → 基础建议
  const promoVideo = outputs?.promo_video
  const actionItemsBase = outputs?.action_recommendations?.actions?.map((a: { title: string; description: string }) => ({
    title: a.title,
    description: a.description,
    buttonLabel: '查看详情',
    type: 'normal' as const,
  })) ?? []

  const actionItems = status !== 'completed'
    ? undefined
    : [
        ...(promoVideo
          ? [{
              title: promoVideo.status === 'completed'
                ? '🎬 宣传视频'
                : promoVideo.status === 'failed'
                  ? '🎬 视频生成失败'
                  : '🎬 宣传视频生成中…',
              description: promoVideo.status === 'completed'
                ? '点击播放查看营销方案宣传视频'
                : promoVideo.status === 'failed'
                  ? `视频生成失败: ${promoVideo.error || ''}`
                  : '视频正在生成中，请耐心等待…',
              buttonLabel: '查看详情',
              type: 'video' as const,
              videoUrl: promoVideo.video_url,
              promoVideo: promoVideo,
            }]
          : []),
        {
          title: '根据方案生成海报',
          description: posterPromptText,
          buttonLabel: isGeneratingPoster ? '生成中…' : (posterUrl ? '重新生成' : '生成海报'),
          onClick: handleGeneratePoster,
          imageUrl: posterError ? null : posterUrl,
          isGenerating: isGeneratingPoster,
          hasImageLayout: true,
          onImageClick: posterUrl ? () => setLightboxOpen(true) : undefined,
          size: posterSize,
          sizeOptions: POSTER_SIZE_OPTIONS,
          onSizeChange: handleSizeChange,
        },
        ...actionItemsBase,
      ]

  const [autoMode, setAutoMode] = useState(false)
  const userInteractedRef = useRef(false)
  const [activeTab, setActiveTab] = useState(0)
  // 宣传视频轮询：流水线完成后如果视频还在生成中，定时轮询
  useEffect(() => {
    const pv = outputs?.promo_video
    if (status !== 'completed' || !pv || pv.status !== 'generating') return

    const interval = setInterval(() => {
      refreshStatus()
    }, 5000)

    return () => clearInterval(interval)
  }, [status, outputs?.promo_video?.status, refreshStatus])

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
              onClick={() => exportPdf(displayedChapters)}
              style={{
                padding: '8px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600,
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
                background: '#fff', border: '1px solid #e2e8f0', color: '#475569',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
              导出 Word
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
    <div class="chapter-content">${(() => { try { return marked.parse(ch.content) } catch { return ch.content } })()}</div>
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
