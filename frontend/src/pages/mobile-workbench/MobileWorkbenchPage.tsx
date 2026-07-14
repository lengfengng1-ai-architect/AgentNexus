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

const DEFAULT_TOPBAR: Record<MobileScreen, { t: string; sub: string }> = {
  chat: { t: '营销方案助手', sub: 'AllyGo Agent · 4M+1C 模型' },
  brief: { t: '营销方案工作台', sub: '娃哈哈 · 魅力系列' },
  generate: { t: '方案生成', sub: '魅力系列 · 运动盟域' },
  preview: { t: '方案预览', sub: '完整展示' },
  actions: { t: '下一步行动建议', sub: '魅力系列 · 共 6 项' },
  dispatch: { t: '下发与转发达成', sub: '统一发声 · 跨盟下发' },
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

  // 三点导出菜单状态
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [exporting, setExporting] = useState<'pdf' | 'xlsx' | null>(null)
  const exportRef = useRef<HTMLDivElement>(null)

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

  // 媒体轮询：actions 屏时才查，海报/视频都到终态（completed/failed）就不轮询了
  useEffect(() => {
    if (status !== 'completed' || screen !== 'actions') return
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

  // 从 ScreenChat / ChatBubble 接收携带数据的跳转（仅跳转简报，不触发生成）
  const handleChatNavigate = (s: MobileScreen, inputText?: string, brandInput?: BrandInput) => {
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
    const prev: Record<MobileScreen, MobileScreen | null> = {
      chat: null,
      brief: 'chat',
      generate: 'brief',
      preview: 'generate',
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
  const topbarText: Record<MobileScreen, { t: string; sub: string }> = {
    ...DEFAULT_TOPBAR,
    brief: { t: '营销方案工作台', sub: `${brandLabel} · ${productLabel}` },
    generate: { t: '方案生成', sub: `${productLabel} · 运动盟域` },
    preview: { t: '方案预览', sub: `${productLabel} · 完整展示` },
    actions: { t: '下一步行动建议', sub: `${productLabel} · 共 ${itemCount + 6} 项` },
    dispatch: { t: '下发与转发达成', sub: `${brandLabel} · 跨盟下发` },
  }
  const meta = topbarText[screen]
  const isExportReady = (screen === 'generate' || screen === 'preview') && status === 'completed'

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
      <div className="mw-tabs" role="tablist" aria-label="移动端工作台屏幕切换">
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
        <PhoneFrame topbar={topbar}>
          <div style={{ display: screen === 'chat' ? '' : 'none' }}>
            <ScreenChat onNavigate={handleChatNavigate} />
          </div>
          <div style={{ display: screen === 'brief' ? '' : 'none' }}>
            <ScreenBrief onNavigate={handleNavigate} initialInput={pendingChatData?.inputText} initialBrandData={pendingChatData?.brandInput ?? undefined} />
          </div>
          <div style={{ display: screen === 'generate' ? '' : 'none' }}>
            <ScreenGenerate
              onNavigate={handleNavigate}
              briefData={briefData}
              planRun={planRun}
            />
          </div>
          <div style={{ display: screen === 'preview' ? '' : 'none' }}>
            <ScreenPreview
              onNavigate={handleNavigate}
              chapters={planRun.chapters}
            />
          </div>
          <div style={{ display: screen === 'actions' ? '' : 'none' }}>
            <ScreenActions onNavigate={handleNavigate} outputs={outputs} />
          </div>
          <div style={{ display: screen === 'dispatch' ? '' : 'none' }}>
            <ScreenDispatch outputs={outputs} briefData={briefData} />
          </div>
        </PhoneFrame>
      </div>
    </div>
  )
}
