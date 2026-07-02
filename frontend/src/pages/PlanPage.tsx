import { useCallback, useEffect, useRef, useState } from 'react'
import { useWorkflowSSE } from '../hooks/useWorkflowSSE'
import type { BrandInput } from '../types/chat'
import { PlanActionCards } from './PlanActionCards'
import { PlanForm } from './PlanForm'
import { PlanLogStream } from './PlanLogStream'
import { PlanPreview } from './PlanPreview'
import { PipelineTimeline } from './PipelineTimeline'

const STORAGE_KEY = 'allygo_plan_session'

interface PlanSession { brandInput: BrandInput }

function usePlanSession() {
  const [seed, setSeed] = useState<BrandInput | undefined>(undefined)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as PlanSession
        if (parsed.brandInput) setSeed(parsed.brandInput)
      }
    } catch { /* ignore */ }
  }, [])
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
  const { runId, status, nodes, logs, outputs, failedNode, error, isConnected, start, control, reset } = useWorkflowSSE()
  const { seed, save } = usePlanSession()
  const [autoContinue, setAutoContinue] = useState(true)
  const contentRef = useRef<HTMLDivElement>(null)

  const handleStart = useCallback((data: PlanFormData) => {
    const brandInput: BrandInput = { brand_name: data.brandName, category: data.category, city: data.city, budget: data.budget, period: data.period }
    save(brandInput)
    start({ brand_name: brandInput.brand_name, category: brandInput.category, city: brandInput.city, budget: brandInput.budget, period: brandInput.period })
  }, [save, start])

  const startedRef = useRef(false)
  useEffect(() => {
    if (seed && status === 'idle' && !startedRef.current) {
      startedRef.current = true
      handleStart({ brandName: seed.brand_name ?? '', category: seed.category ?? '', city: seed.city ?? '上海', budget: seed.budget ?? 300, period: seed.period ?? 3 })
    }
  }, [seed, status, handleStart])

  const chapters = outputs.plan_generator?.chapters || []
  const actionItems = outputs.action_recommendations?.actions?.map((a: { title: string; description: string }) => ({ title: a.title, description: a.description, buttonLabel: '查看详情' }))

  const [activeTab, setActiveTab] = useState(0)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const scrollTicking = useRef(false)

  const scrollToChapter = useCallback((idx: number) => {
    setActiveTab(idx)
    const el = contentRef.current
    if (!el) return
    if (idx === 0) { el.scrollTo({ top: 0, behavior: 'smooth' }); return }
    const target = el.querySelector<HTMLElement>(`[data-chapter-idx="${idx}"]`)
    if (target) {
      target.classList.add('open')
      el.scrollTo({ top: target.offsetTop - el.offsetTop - 16, behavior: 'smooth' })
    }
  }, [])

  // Sync active tab with scroll position
  useEffect(() => {
    const el = contentRef.current
    if (!el) return
    const handleScroll = () => {
      if (scrollTicking.current) return
      scrollTicking.current = true
      requestAnimationFrame(() => {
        scrollTicking.current = false
        const scrollTop = el!.scrollTop + 120 // offset so heading is near top
        let bestIdx = 0
        let bestDist = Infinity
        for (let i = 1; i <= 9; i++) {
          const target = el!.querySelector<HTMLElement>(`[data-chapter-idx="${i}"]`)
          if (target) {
            const d = Math.abs(target.offsetTop - el!.offsetTop - scrollTop)
            if (d < bestDist) { bestDist = d; bestIdx = i }
          }
        }
        // Also check if scrolled near top → activeTab=0
        if (el!.scrollTop < 100) bestIdx = 0
        if (bestIdx !== activeTab) setActiveTab(bestIdx)
      })
    }
    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => el.removeEventListener('scroll', handleScroll)
  }, [activeTab])

  const TABS = [{ idx: 0, label: '概览' }, { idx: 1, label: '1. 项目概述' }, { idx: 2, label: '2. 市场分析' }, { idx: 3, label: '3. 营销策略' }, { idx: 4, label: '4. 执行方案' }, { idx: 5, label: '5. 数字化运营' }, { idx: 6, label: '6. 达人体系' }, { idx: 7, label: '7. 时间规划' }, { idx: 8, label: '8. KPI' }, { idx: 9, label: '9. 预算' }]

  return (
    <div className="app" style={{ display: 'flex', height: 'var(--app-height)', overflow: 'hidden', backgroundColor: '#fafbfc' }}>
      <aside style={{ width: 360, minWidth: 360, flexShrink: 0, background: '#fff', borderRight: '1px solid #e2e8f0', height: 'var(--app-height)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ padding: '20px 22px 12px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 6, background: 'linear-gradient(135deg, #1e40af, #3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 15 }}>A</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.3px', color: '#0f172a' }}>AllyGo 营销方案 Agent</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>智能生成 · 数据驱动 · 可执行</div>
              </div>
            </div>
          </div>
          <a href="/chat" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 8, fontSize: 12, color: '#1e40af', fontWeight: 500, textDecoration: 'none' }} onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')} onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>
            返回聊天
          </a>
        </div>
        <div className="sidebar-scroll" style={{ flex: 1, overflowY: 'auto', padding: '16px 22px 24px', minHeight: 0 }}>
          <PlanForm initial={seed} onSubmit={handleStart} isLoading={status === 'running'} />
        </div>
      </aside>

      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: 'var(--app-height)', overflow: 'hidden' }}>
        <header style={{ height: 64, background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 28px', flexShrink: 0 }}>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.3px', color: '#0f172a' }}>营销方案工作台</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => window.print()} style={{ padding: '8px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid #e2e8f0', color: '#475569' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>导出 PDF</button>
            <button onClick={exportWord} style={{ padding: '8px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid #e2e8f0', color: '#475569' }}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>导出 Word</button>
          </div>
        </header>

        <nav style={{ height: 52, background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 4, padding: '0 28px', flexShrink: 0 }}>
          {TABS.map(t => (
            <button key={t.idx} ref={el => { (tabRefs.current as (HTMLButtonElement | null)[])[t.idx] = el }} onClick={() => { setActiveTab(t.idx); scrollToChapter(t.idx) }} style={{ padding: '8px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', border: 'none', background: activeTab === t.idx ? '#1e40af' : 'transparent', color: activeTab === t.idx ? '#fff' : '#475569' }}>{t.label}</button>
          ))}
        </nav>

        <div style={{ flexShrink: 0 }}><PlanLogStream logs={logs} /></div>

        {/* Only this area scrolls */}
        <div ref={contentRef} style={{ flex: 1, overflowY: 'auto', padding: 28, background: '#fafbfc' }}>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            <PipelineTimeline nodes={nodes} failedNode={failedNode} />
            {chapters.length > 0 && <PlanPreview chapters={chapters} />}
            {actionItems && actionItems.length > 0 && (
              <div id="actions-anchor"><PlanActionCards actions={actionItems} /></div>
            )}
          </div>
        </div>
      </main>

      {actionItems && actionItems.length > 0 && (
        <button style={{ position: 'fixed', right: 28, bottom: 28, width: 56, height: 56, borderRadius: '50%', background: '#f97316', color: '#fff', border: 'none', boxShadow: '0 6px 20px rgba(249, 115, 22, 0.35)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, zIndex: 200 }} onClick={() => document.getElementById('action-modal')?.classList.add('open')}>🎯</button>
      )}
      {actionItems && actionItems.length > 0 && (
        <div id="action-modal" onClick={(e) => { if (e.target === e.currentTarget) e.currentTarget.classList.remove('open') }} style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)', display: 'none', alignItems: 'center', justifyContent: 'center', zIndex: 300, backdropFilter: 'blur(4px)' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: 14, width: '90%', maxWidth: 520, maxHeight: '80vh', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.08)' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>🎯 下一步行动建议</h3>
              <button onClick={() => document.getElementById('action-modal')?.classList.remove('open')} style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', background: '#f1f5f9', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
            </div>
            <div style={{ padding: '20px 24px', overflowY: 'auto', maxHeight: '50vh' }}><PlanActionCards actions={actionItems} /></div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => document.getElementById('action-modal')?.classList.remove('open')} style={{ padding: '8px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', background: '#fff', border: '1px solid #e2e8f0', color: '#475569' }}>关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function exportWord() {
  const html = '<html><meta charset="utf-8"><title>营销方案</title><body><p>导出功能待完善</p></body></html>'
  const blob = new Blob(['﻿', html], { type: 'application/msword' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = '营销方案.doc'
  document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url)
}

const _injectedStyle = document.createElement('style')
_injectedStyle.textContent = `#action-modal.open { display: flex !important; }`
document.head.appendChild(_injectedStyle)
