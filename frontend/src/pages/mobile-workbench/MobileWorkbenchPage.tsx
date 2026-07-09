// MobileWorkbenchPage — 移动端工作台展示页（页壳 + Tab 切换）
// OpenSpec: openspec/changes/add-mobile-workbench-preview · tasks 3.2
// P1：① 对话屏实现；②-⑤ 占位「开发中」，后续变更补齐
import { useState } from 'react'
import { PhoneFrame } from './PhoneFrame'
import { ScreenChat, type MobileScreen } from './ScreenChat'
import { ScreenBrief } from './ScreenBrief'
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

const TOPBAR: Record<MobileScreen, { t: string; sub: string }> = {
  chat: { t: '营销方案助手', sub: 'AllyGo Agent · 4M+1C 模型' },
  brief: { t: '营销方案工作台', sub: '娃哈哈 · 魅力系列' },
  generate: { t: '方案生成', sub: '魅力系列 · 运动盟域' },
  actions: { t: '下一步行动建议', sub: '魅力系列 · 共 6 项' },
  dispatch: { t: '下发与转发达成', sub: '统一发声 · 跨盟下发' },
}

export function MobileWorkbenchPage() {
  const [screen, setScreen] = useState<MobileScreen>('chat')
  const meta = TOPBAR[screen]
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
            onClick={() => setScreen(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <PhoneFrame topbar={topbar}>
        {screen === 'chat' ? (
          <ScreenChat onNavigate={setScreen} />
        ) : screen === 'brief' ? (
          <ScreenBrief onNavigate={setScreen} />
        ) : screen === 'generate' ? (
          <ScreenGenerate onNavigate={setScreen} />
        ) : screen === 'actions' ? (
          <ScreenActions onNavigate={setScreen} />
        ) : (
          <ScreenDispatch />
        )}
      </PhoneFrame>
    </div>
  )
}
