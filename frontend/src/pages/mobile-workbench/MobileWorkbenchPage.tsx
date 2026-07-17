// MobileWorkbenchPage — 移动端工作台展示页（页壳 + Tab 切换）
// OpenSpec: mobile-brief-connect-backend · specs/mobile-brief-connect/spec.md
// ② 简报 → ③ 方案生成打通，传递 briefFormData
import { useEffect, useRef, useState } from 'react'
import { PhoneFrame } from './PhoneFrame'
import { ScreenChat, type MobileScreen } from './ScreenChat'
import { ScreenBrief, type BriefFormData } from './ScreenBrief'
import { ScreenGenerate } from './ScreenGenerate'
import { ScreenPreview } from './ScreenPreview'
import { ScreenActions } from './ScreenActions'
import { ScreenDispatch } from './ScreenDispatch'
import { ScreenBudgetPreview, type BudgetAllocation } from './ScreenBudgetPreview'
import { ScreenActionPreview } from './ScreenActionPreview'
import { ScreenResearchReport } from './ScreenResearchReport'
import { useMobilePlanRun } from '../../hooks/useMobilePlanRun'
import { exportPlanPdf, exportPlanXlsx } from '../../api/plan'
import type { BrandInput } from '../../types/chat'
import './mobile-workbench.css'

const TABS: { key: MobileScreen; label: string }[] = [
  { key: 'chat', label: '① 对话入口' },
  { key: 'brief', label: '② 简报' },
  { key: 'generate', label: '③ 方案生成' },
  { key: 'actions', label: '④ 行动建议' },
  { key: 'dispatch', label: '⑤ 下发转达' },
]

// 隐藏 Tab 栏的屏
const HIDE_TABS: MobileScreen[] = ['preview', 'budget-preview', 'action-preview', 'research-report']

const DEFAULT_TOPBAR: Record<string, { t: string; sub: string }> = {
  chat: { t: '营销方案助手', sub: 'AllyGo Agent' },
  brief: { t: '营销方案工作台', sub: '娃哈哈 · 魅力系列' },
  generate: { t: '方案生成', sub: '魅力系列 · 运动盟域' },
  preview: { t: '方案预览', sub: '完整展示' },
  actions: { t: '下一步行动建议', sub: '魅力系列 · 共 6 项' },
  dispatch: { t: '下发与转发达成', sub: '统一发声 · 跨盟下发' },
  'budget-preview': { t: '预算分配与预览', sub: '' },
  'action-preview': { t: '行动预览', sub: '' },
  'research-report': { t: '调研结果', sub: '' },
}

// 从 pendingChatData 的 inputText 中提取 product_label 用于 topbar
function parseProductLabel(inputText?: string): string {
  if (!inputText) return ''
  const m = inputText.match(/产品线是(.+?)[，,]/)
  if (!m) return ''
  return m[1].trim().split(/[（(]/)[0] || m[1].trim()
}

export function MobileWorkbenchPage() {
  const [screen, setScreen] = useState<MobileScreen>('chat')
  const [briefData, setBriefData] = useState<BriefFormData | null>(null)
  const planRun = useMobilePlanRun()
  const { outputs, checkMediaStatus, status } = planRun

  // Budget preview state
  const [budgetPreviewData, setBudgetPreviewData] = useState<{
    totalBudget: number
    periodMonths: number
    allocations: BudgetAllocation[]
    kpis: Record<string, string>
    timeline: string[]
  } | null>(null)

  // 预算预览滑动动画状态：关闭弹窗后抑制 checkpoint 弹窗再次弹出
  // 记录正在被抑制的节点 ID，只有该节点的 checkpoint 才被抑制，新节点到来时自动清除
  const [suppressedPausedNodeId, setSuppressedPausedNodeId] = useState<string | null>(null)
  // 预算预览正在退出动画中
  const [isBpAnimatingOut, setIsBpAnimatingOut] = useState(false)
  // 预算预览重新生成中（用户点发送 → 加载新数据）
  const [budgetPreviewLoading, setBudgetPreviewLoading] = useState(false)

  // Action preview state
  const [actionPreviewLoading, setActionPreviewLoading] = useState(false)

  // Research report overlay state：查看的 researchId + 退出动画标记
  const [researchReportId, setResearchReportId] = useState<string | null>(null)
  const [isRrAnimatingOut, setIsRrAnimatingOut] = useState(false)
  // 打开覆盖屏时缓存 marketName 作顶栏兜底（拉取成功后被 result.market_name 覆盖）
  const [researchReportTitle, setResearchReportTitle] = useState('')

  // Action preview data — extracted from pausedSnapshot
  const [actionPreviewData, setActionPreviewData] = useState<{
    actions: { title: string; description: string; start_date?: string; end_date?: string; priority?: string; category?: string }[]
    brandName?: string
    category?: string
    totalBudget?: number
    periodMonths?: number
  } | null>(null)

  // 三点导出菜单状态
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [exporting, setExporting] = useState<'pdf' | 'xlsx' | null>(null)
  const exportRef = useRef<HTMLDivElement>(null)

  // 当流水线脱离 paused 状态（变为 running / completed / failed）时，
  // 自动清除抑制
  useEffect(() => {
    if (status !== 'paused') {
      setSuppressedPausedNodeId(null)
    }
  }, [status])

  // 当 checkpoint 到达非被抑制的节点时，清除抑制的记录
  useEffect(() => {
    if (planRun.pausedSnapshot && suppressedPausedNodeId !== null && planRun.pausedSnapshot.node_id !== suppressedPausedNodeId) {
      setSuppressedPausedNodeId(null)
    }
  }, [planRun.pausedSnapshot, suppressedPausedNodeId])

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setShowExportMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleExport = async (fmt: 'pdf' | 'xlsx') => {
    setExporting(fmt)
    setShowExportMenu(false)
    try {
      const rid = (() => { try { return localStorage.getItem('allygo_mobile_plan_run_id') } catch { return null } })()
      if (!rid) throw new Error('未找到运行记录')
      const result = fmt === 'pdf' ? await exportPlanPdf(rid) : await exportPlanXlsx(rid)
      // determine backend origin from API_BASE_URL
      const apiOrigin = typeof import.meta.env.VITE_API_BASE_URL === 'string'
        ? new URL(import.meta.env.VITE_API_BASE_URL).origin
        : 'http://localhost:8000'
      // trigger download via hidden link — use full URL so it hits backend, not Vite dev server
      const a = document.createElement('a')
      a.href = new URL(result.download_url, apiOrigin).toString()
      a.download = ''
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (err) {
      alert(`导出 ${fmt.toUpperCase()} 失败: ${err instanceof Error ? err.message : '未知错误'}`)
    } finally {
      setExporting(null)
    }
  }

  // 媒体轮询：actions 屏或 action-preview 时才查，海报/视频都到终态就不轮询了
  useEffect(() => {
    const shouldPoll = (status === 'completed' && screen === 'actions') || screen === 'action-preview'
    if (!shouldPoll) return
    const posterDone = outputs?.poster?.status === 'completed' || outputs?.poster?.status === 'failed'
    const videoDone = outputs?.promo_video?.status === 'completed' || outputs?.promo_video?.status === 'failed'
    if (posterDone && videoDone) return
    checkMediaStatus()
    const interval = setInterval(checkMediaStatus, 5000)
    return () => clearInterval(interval)
  }, [status, checkMediaStatus, screen, outputs?.poster?.status, outputs?.promo_video?.status])

  // ChatBubble 的「生成方案」携带的对话数据，预填简报字段
  const [pendingChatData, setPendingChatData] = useState<{ inputText?: string; brandInput?: BrandInput } | null>(null)

  const handleNavigate = (s: MobileScreen, data?: BriefFormData) => {
    if (data) {
      planRun.reset()  // 重置上次流水线状态，确保新生成从 idle 开始
      setBriefData(data)
    }
    setScreen(s)
  }

  // 预算预览返回时：触发滑出动画 → 完成后切回 generate 屏并提交数据
  const handleBudgetPreviewBack = (allocations: BudgetAllocation[]) => {
    // 1. 触发滑出动画的同时开始提交流程（SSE 在动画期间即可启动）
    setIsBpAnimatingOut(true)
    const rid = (() => { try { return localStorage.getItem('allygo_mobile_plan_run_id') } catch { return null } })()
    if (rid) {
      planRun.approveWithBudget(allocations)
    }
    // 2. 等待动画结束后切换屏幕，此时流水线可能已开始执行
    setTimeout(() => {
      setIsBpAnimatingOut(false)
      setBudgetPreviewData(null)
      setScreen('generate')
      // 抑制 budget_kpi 的 checkpoint，用户看到的是流水线继续执行中的状态
      setSuppressedPausedNodeId('budget_kpi')
    }, 300) // 匹配滑出动画时长 0.3s
  }

  // 预算预览重新生成：用户发送反馈 → loading → 后端 SSE 重新执行 → 收到新 paused 数据后刷新
  const handleBudgetRegen = (feedback: string) => {
    setBudgetPreviewLoading(true)
    const rid = (() => { try { return localStorage.getItem('allygo_mobile_plan_run_id') } catch { return null } })()
    if (rid) {
      planRun.reject(feedback)
    }
  }

  // Action preview: navigate from generate screen
  const handleOpenActionPreview = () => {
    if (planRun.pausedSnapshot) {
      const ar = planRun.pausedSnapshot.upstream_outputs?.action_recommendations as Record<string, unknown> | undefined
      const brandInput = planRun.pausedSnapshot.upstream_outputs?.brand_input as Record<string, unknown> | undefined
      const budgetKpi = planRun.pausedSnapshot.upstream_outputs?.budget_kpi as Record<string, unknown> | undefined
      if (ar && Array.isArray(ar.actions)) {
        setActionPreviewData({
          actions: ar.actions as { title: string; description: string; start_date?: string; end_date?: string; priority?: string; category?: string }[],
          brandName: (brandInput?.brand_name as string) || '',
          category: (brandInput?.category as string) || '',
          totalBudget: (budgetKpi?.total_budget as number) || 0,
          periodMonths: (budgetKpi?.period_months as number) || 0,
        })
      }
    }
    setSuppressedPausedNodeId('action_recommendations')
    setScreen('action-preview')
  }

  // Action preview: approve and return to generate screen
  const handleActionApprove = () => {
    planRun.approve()
    setActionPreviewData(null)
    setSuppressedPausedNodeId(null)
    setScreen('generate')
  }

  // Action preview: reject (send feedback) → backend reruns action_recommendations
  const handleActionRegen = (feedback: string) => {
    setActionPreviewLoading(true)
    planRun.reject(feedback)
  }

  // 监控 pausedSnapshot 更新：当预算预览 loading 中且收到新的 budget_kpi paused 数据时刷新预览
  useEffect(() => {
    if (!budgetPreviewLoading) return
    if (!planRun.pausedSnapshot) return
    const bk = planRun.pausedSnapshot.upstream_outputs?.budget_kpi as Record<string, unknown> | undefined
    if (!bk || typeof bk.total_budget === 'undefined') return
    // 提取新数据刷新预算预览
    const allocs = (bk.allocations as Array<{category: string; percentage: number; amount: number}> | undefined) || []
    const kpis = (bk.kpis as Record<string, string>) || {}
    const timeline = (bk.timeline as string[]) || []
    setBudgetPreviewData({
      totalBudget: (bk.total_budget as number) || 0,
      periodMonths: (bk.period_months as number) || 0,
      allocations: allocs,
      kpis,
      timeline,
    })
    setBudgetPreviewLoading(false)
  }, [budgetPreviewLoading, planRun.pausedSnapshot])

  // 监控 action_recommendations pausedSnapshot：loading 中收到新数据时刷新
  useEffect(() => {
    if (!actionPreviewLoading) return
    if (!planRun.pausedSnapshot) return
    const ar = planRun.pausedSnapshot.upstream_outputs?.action_recommendations as Record<string, unknown> | undefined
    if (!ar || !ar.actions) return
    const brandInput = planRun.pausedSnapshot.upstream_outputs?.brand_input as Record<string, unknown> | undefined
    const budgetKpi = planRun.pausedSnapshot.upstream_outputs?.budget_kpi as Record<string, unknown> | undefined
    setActionPreviewData({
      actions: (ar.actions as Array<{title: string; description: string; start_date?: string; end_date?: string; priority?: string; category?: string}>) || [],
      brandName: (brandInput?.brand_name as string) || '',
      category: (brandInput?.category as string) || '',
      totalBudget: (budgetKpi?.total_budget as number) || 0,
      periodMonths: (budgetKpi?.period_months as number) || 0,
    })
    setActionPreviewLoading(false)
  }, [actionPreviewLoading, planRun.pausedSnapshot])

  // 从 ScreenChat / ChatBubble 接收携带数据的跳转（仅跳转简报，不触发生成）
  const handleChatNavigate = (s: MobileScreen, inputText?: string, brandInput?: BrandInput, researchId?: string) => {
    if (s === 'research-report') {
      // 调研结果页：记录 researchId，覆盖屏自行拉取数据；inputText 位置是 marketName 兜底标题
      if (!researchId) return  // 兜底：无 researchId 不跳转
      setResearchReportId(researchId)
      setResearchReportTitle(inputText || '')
      setScreen('research-report')
      return
    }
    if (inputText || brandInput) {
      setPendingChatData({ inputText, brandInput })
    } else {
      setPendingChatData(null)
    }
    setScreen(s)
  }

  // 直接点击 Tab 时清除 pendingChatData 和 briefData，只有从 handleNavigate/handleChatNavigate 跳转才携带数据
  const handleTabClick = (key: MobileScreen) => {
    setBriefData(null)
    setPendingChatData(null)
    setScreen(key)
  }

  // 返回上一屏（不回退数据）
  const handleBack = () => {
    const prev: Record<string, MobileScreen | null> = {
      chat: null,
      brief: 'chat',
      generate: 'brief',
      preview: 'generate',
      'budget-preview': 'generate',
      'action-preview': 'generate',
      'research-report': 'chat',
      actions: 'generate',
      dispatch: 'actions',
    }
    const target = prev[screen]
    if (target) setScreen(target)
  }

  // 根据实际表单数据动态更新 topbar sub 文本
  const brandLabel = briefData?.brand_name ?? pendingChatData?.brandInput?.brand_name ?? ''
  const productLabel = briefData?.product_matrix?.split(/[（(]/)[0] || briefData?.product_matrix || parseProductLabel(pendingChatData?.inputText) || ''
  const itemCount = outputs?.action_recommendations?.actions?.length ?? 6
  const topbarText: Record<string, { t: string; sub: string }> = {
    ...DEFAULT_TOPBAR,
    brief: { t: '营销方案工作台', sub: `${brandLabel} · ${productLabel}` },
    generate: { t: '方案生成', sub: `${productLabel} · 运动盟域` },
    preview: { t: '方案预览', sub: `${productLabel} · 完整展示` },
    actions: { t: '下一步行动建议', sub: `${productLabel} · 共 ${itemCount + 6} 项` },
    dispatch: { t: '下发与转发达成', sub: `${brandLabel} · 跨盟下发` },
    'budget-preview': { t: '预算分配与预览', sub: `${productLabel}` },
    'action-preview': { t: '行动预览', sub: `${productLabel}` },
  }
  const meta = topbarText[screen]
  const isExportReady = (screen === 'generate' || screen === 'preview') && status === 'completed'

  // 调研结果页返回：触发滑出动画 → 300ms 后卸载覆盖层回到聊天屏（与 budget-preview 同构）
  const handleResearchReportBack = () => {
    setIsRrAnimatingOut(true)
    setTimeout(() => {
      setIsRrAnimatingOut(false)
      setResearchReportId(null)
      setScreen('chat')
    }, 300)
  }

  // 预算预览页在手机框内展示，使用自己的顶栏，隐藏 PhoneFrame 顶栏
  // 动画退出中也不显示 topbar（保持视觉连贯）
  const hideTopbar = screen === 'budget-preview' || isBpAnimatingOut || screen === 'action-preview' || screen === 'research-report'

  // 预算预览正在展示中：包括正在展示 slide-in 或已展示
  const showingBudgetPreview = screen === 'budget-preview' || isBpAnimatingOut

  // action-preview 返回时 approve 继续流水线（同 budget-preview 模式）
  const handleActionPreviewBack = () => {
    setSuppressedPausedNodeId('action_recommendations')
    planRun.approve()
    setActionPreviewData(null)
    setScreen('generate')
  }

  // action-preview 与 budget-preview 共享 hideTopbar 和 showing 逻辑
  const showingActionPreview = screen === 'action-preview'

  // 调研结果覆盖屏展示中（含滑出动画期间）
  const showingResearchReport = screen === 'research-report' || isRrAnimatingOut

  // 方案生成活跃状态：running / paused 时简报页按钮应显示生成中并禁用
  const isPlanGenerating = status === 'running' || status === 'paused'

  const topbar = (
    <div className="topbar">
      {screen !== 'chat' && (
        <span className="ico" onClick={handleBack} onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleBack() } }} role="button" tabIndex={0} aria-label="返回">‹</span>
      )}
      {screen === 'chat' && <span style={{ width: 18 }} />}
      <span className="t">
        {meta.t}
        <small>{meta.sub}</small>
      </span>
      <div ref={exportRef} style={{ position: 'relative' }}>
        <span
          className="ico"
          onClick={() => isExportReady && setShowExportMenu(v => !v)}
          style={{ opacity: isExportReady ? 1 : 0.3, cursor: isExportReady ? 'pointer' : 'default' }}
        >⋯</span>
        {showExportMenu && (
          <div
            style={{
              position: 'absolute', top: 32, right: 0, zIndex: 999,
              minWidth: 120, background: '#fff', borderRadius: 8,
              boxShadow: '0 4px 16px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.06)',
              padding: '4px 0', overflow: 'hidden',
            }}
          >
            <button
              type="button"
              disabled={exporting !== null}
              onClick={() => handleExport('pdf')}
              style={{
                display: 'block', width: '100%', border: 'none', background: 'none',
                padding: '10px 16px', fontSize: 13, fontWeight: 500,
                color: exporting === 'pdf' ? '#9ca3af' : '#111',
                cursor: exporting !== null ? 'not-allowed' : 'pointer',
                textAlign: 'left', fontFamily: 'var(--ff)',
              }}
            >📄 {exporting === 'pdf' ? '生成中…' : '导出 PDF'}</button>
            <button
              type="button"
              disabled={exporting !== null}
              onClick={() => handleExport('xlsx')}
              style={{
                display: 'block', width: '100%', border: 'none', background: 'none',
                padding: '10px 16px', fontSize: 13, fontWeight: 500,
                color: exporting === 'xlsx' ? '#9ca3af' : '#111',
                cursor: exporting !== null ? 'not-allowed' : 'pointer',
                textAlign: 'left', fontFamily: 'var(--ff)',
              }}
            >📊 {exporting === 'xlsx' ? '生成中…' : '导出 XLSX'}</button>
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="mw">
      <div className="mw-tabs" role="tablist" aria-label="移动端工作台屏幕切换" style={{ display: HIDE_TABS.includes(screen) ? 'none' : '' }}>
        {TABS.map(t => (
          <button
            key={t.key}
            role="tab"
            aria-selected={screen === t.key}
            className={`mw-tab${screen === t.key ? ' on' : ''}`}
            onClick={() => handleTabClick(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div style={{ position: 'relative' }}>
        <PhoneFrame topbar={hideTopbar ? undefined : topbar}>
          {/* 预算预览覆盖层：手机框内绝对定位，从右向左滑入/滑出
              不依赖 !showingBudgetPreview 做条件渲染，确保其他屏保持挂载 */}
          {showingBudgetPreview && budgetPreviewData && (
            <div
              className={isBpAnimatingOut ? 'bp-slide-out' : 'bp-slide-in'}
              style={{
                position: 'absolute', inset: 0, zIndex: 40,
                display: 'flex', flexDirection: 'column',
                background: 'var(--bg)', overflow: 'hidden',
              }}
            >
              <ScreenBudgetPreview
                onNavigate={setScreen}
                totalBudget={budgetPreviewData.totalBudget}
                periodMonths={budgetPreviewData.periodMonths}
                initialAllocations={budgetPreviewData.allocations}
                initialKpis={budgetPreviewData.kpis}
                initialTimeline={budgetPreviewData.timeline}
                onBack={handleBudgetPreviewBack}
                loading={budgetPreviewLoading}
                onRegenerate={handleBudgetRegen}
              />
            </div>
          )}
          {/* 行动建议预览覆盖层 */}
          {showingActionPreview && actionPreviewData && (
            <div
              className="ap-overlay"
              style={{
                position: 'absolute', inset: 0, zIndex: 40,
                display: 'flex', flexDirection: 'column',
                background: 'var(--bg)', overflow: 'hidden',
              }}
            >
              <ScreenActionPreview
                onNavigate={setScreen}
                actions={actionPreviewData.actions}
                brandName={actionPreviewData.brandName}
                category={actionPreviewData.category}
                totalBudget={actionPreviewData.totalBudget}
                periodMonths={actionPreviewData.periodMonths}
                posterStatus={outputs?.poster?.status}
                videoStatus={outputs?.promo_video?.status}
                posterUrl={outputs?.poster?.image_url}
                videoUrl={outputs?.promo_video?.video_url}
                onApprove={handleActionApprove}
                onReject={handleActionRegen}
                onBack={handleActionPreviewBack}
                loading={actionPreviewLoading}
              />
            </div>
          )}
          {/* 调研结果覆盖层：手机框内绝对定位，从右往左滑入/滑出 */}
          {showingResearchReport && researchReportId && (
            <div
              className={isRrAnimatingOut ? 'rr-slide-out' : 'rr-slide-in'}
              style={{
                position: 'absolute', inset: 0, zIndex: 40,
                display: 'flex', flexDirection: 'column',
                background: 'var(--bg)', overflow: 'hidden',
              }}
            >
              <ScreenResearchReport
                researchId={researchReportId}
                fallbackTitle={researchReportTitle}
                onBack={handleResearchReportBack}
              />
            </div>
          )}
          <div style={{ display: screen === 'chat' ? 'flex' : 'none', flex: screen === 'chat' ? 1 : '', flexDirection: 'column', minHeight: 0, overflow: 'hidden', position: 'relative' }}>
            <ScreenChat onNavigate={handleChatNavigate} />
          </div>
          <div style={{ display: screen === 'brief' ? '' : 'none' }}>
            <ScreenBrief onNavigate={handleNavigate} initialInput={pendingChatData?.inputText} initialBrandData={pendingChatData?.brandInput ?? undefined} isGenerating={isPlanGenerating} />
          </div>
          <div style={{ display: screen === 'generate' ? 'flex' : 'none', flexDirection: 'column', overflow: 'hidden' }}>
            <ScreenGenerate
              onNavigate={handleNavigate}
              briefData={briefData}
              planRun={planRun}
              suppressCheckpointNodeId={suppressedPausedNodeId}
              onOpenBudgetPreview={(data) => {
                setBudgetPreviewData(data)
                setSuppressedPausedNodeId('budget_kpi')
                setScreen('budget-preview')
              }}
              onOpenActionPreview={() => {
                handleOpenActionPreview()
              }}
            />
          </div>
          <div style={{ display: screen === 'preview' ? '' : 'none' }}>
            <ScreenPreview
              onNavigate={handleNavigate}
              chapters={planRun.chapters}
            />
          </div>
          <div style={{ display: screen === 'actions' ? '' : 'none' }}>
            <ScreenActions
              onNavigate={handleNavigate}
              outputs={outputs}
              runId={(() => { try { return localStorage.getItem('allygo_mobile_plan_run_id') } catch { return null } })() || undefined}
              checkMediaStatus={planRun.checkMediaStatus}
            />
          </div>
          <div style={{ display: screen === 'dispatch' ? '' : 'none' }}>
            <ScreenDispatch outputs={outputs} briefData={briefData} />
          </div>
        </PhoneFrame>
      </div>
    </div>
  )
}
