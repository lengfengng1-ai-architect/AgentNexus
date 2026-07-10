// MobileWorkbenchPage — 移动端工作台展示页（页壳 + Tab 切换）
// OpenSpec: mobile-brief-connect-backend · specs/mobile-brief-connect/spec.md
// ② 简报 → ③ 方案生成打通，传递 briefFormData
import { useState } from 'react'
import { PhoneFrame } from './PhoneFrame'
import { ScreenChat, type MobileScreen } from './ScreenChat'
import { ScreenBrief, type BriefFormData } from './ScreenBrief'
import { ScreenGenerate } from './ScreenGenerate'
import { ScreenActions } from './ScreenActions'
import { ScreenDispatch } from './ScreenDispatch'
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
  actions: { t: '下一步行动建议', sub: '魅力系列 · 共 6 项' },
  dispatch: { t: '下发与转发达成', sub: '统一发声 · 跨盟下发' },
}

export function MobileWorkbenchPage() {
  const [screen, setScreen] = useState<MobileScreen>('chat')
  const [briefData, setBriefData] = useState<BriefFormData | null>(null)

  const handleNavigate = (s: MobileScreen, data?: BriefFormData) => {
    if (data) setBriefData(data)
    setScreen(s)
  }

  // 直接点击 Tab 时清除 briefData，只有从 handleNavigate 跳转才携带数据
  const handleTabClick = (key: MobileScreen) => {
    setBriefData(null)
    setScreen(key)
  }

  // 根据实际表单数据动态更新 topbar sub 文本
  const brandLabel = briefData ? briefData.brand_name : '娃哈哈'
  const productLabel = briefData ? briefData.product_matrix?.split(/[（(]/)[0] || briefData.product_matrix : '魅力系列'
  const topbarText: Record<MobileScreen, { t: string; sub: string }> = {
    ...DEFAULT_TOPBAR,
    brief: { t: '营销方案工作台', sub: `${brandLabel} · ${productLabel}` },
    generate: { t: '方案生成', sub: `${productLabel} · 运动盟域` },
    actions: { t: '下一步行动建议', sub: `${productLabel} · 共 6 项` },
    dispatch: { t: '下发与转发达成', sub: `${brandLabel} · 跨盟下发` },
  }
  const meta = topbarText[screen]

  const topbar = (
    <div className="topbar">
      <span className="ico">‹</span>
      <span className="t">
        {meta.t}
        <small>{meta.sub}</small>
      </span>
      <span className="ico">⋯</span>
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
          {screen === 'chat' ? (
            <ScreenChat onNavigate={handleNavigate} />
          ) : screen === 'brief' ? (
            <ScreenBrief onNavigate={handleNavigate} />
          ) : screen === 'generate' ? (
            <ScreenGenerate
              key={briefData ? 'active' : 'empty'}
              onNavigate={handleNavigate}
              briefData={briefData}
            />
          ) : screen === 'actions' ? (
            <ScreenActions onNavigate={handleNavigate} />
          ) : (
            <ScreenDispatch />
          )}
        </PhoneFrame>
      </div>
    </div>
  )
}
