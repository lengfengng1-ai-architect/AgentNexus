import { useCallback, useEffect, useRef, useState } from 'react'
import { useWorkflowSSE } from '../hooks/useWorkflowSSE'
import type { BrandInput } from '../types/chat'
import { PlanActionCards } from './PlanActionCards'
import { PlanForm } from './PlanForm'
import { PlanLogStream } from './PlanLogStream'
import { PlanPreview } from './PlanPreview'
import { PipelineTimeline } from './PipelineTimeline'

const STORAGE_KEY = 'allygo_plan_session'

interface PlanSession {
  brandInput: BrandInput
}

function usePlanSession() {
  const [seed, setSeed] = useState<BrandInput | undefined>(undefined)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as PlanSession
        if (parsed.brandInput) setSeed(parsed.brandInput)
      }
    } catch {
      // ignore corrupted storage
    }
  }, [])

  const save = useCallback((brandInput: BrandInput) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ brandInput }))
    } catch {
      // ignore storage errors
    }
  }, [])

  return { seed, save }
}

interface PlanFormData {
  brandName: string
  category: string
  city: string
  budget: number
  period: number
  productMatrix?: string
  positioning?: string
  marketingGoal?: string
  targetAudience?: string
  history?: string
  constraints?: string
}

export function PlanPage() {
  const {
    runId,
    status,
    nodes,
    logs,
    outputs,
    failedNode,
    error,
    isConnected,
    start,
    control,
    reset,
  } = useWorkflowSSE()
  const { seed, save } = usePlanSession()
  const [autoContinue, setAutoContinue] = useState(true)

  const handleStart = useCallback(
    (data: PlanFormData) => {
      const brandInput: BrandInput = {
        brand_name: data.brandName,
        category: data.category,
        city: data.city,
        budget: data.budget,
        period: data.period,
      }
      save(brandInput)
      start({
        brand_name: brandInput.brand_name,
        category: brandInput.category,
        city: brandInput.city,
        budget: brandInput.budget,
        period: brandInput.period,
      })
    },
    [save, start],
  )

  const startedRef = useRef(false)
  useEffect(() => {
    if (seed && status === 'idle' && !startedRef.current) {
      startedRef.current = true
      handleStart({
        brandName: seed.brand_name ?? '',
        category: seed.category ?? '',
        city: seed.city ?? '上海',
        budget: seed.budget ?? 300,
        period: seed.period ?? 3,
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed, status])

  const chapters = outputs.plan_generator?.chapters || []
  const actionItems = outputs.action_recommendations?.actions?.map(
    (a: { title: string; description: string }) => ({
      title: a.title,
      description: a.description,
      buttonLabel: '查看详情',
    }),
  )

  return (
    <div className="app" style={{ display: 'flex', height: '100vh', overflow: 'hidden', backgroundColor: '#fafbfc' }}>
      {/* Sidebar — fixed width 360px, sticky full-height */}
      <aside style={{
        width: 360, flexShrink: 0, background: '#fff', borderRight: '1px solid #e2e8f0',
        height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        <div style={{ padding: '20px 22px 16px', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 6,
              background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: 15,
            }}>A</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.3px', color: '#0f172a' }}>AllyGo 营销方案 Agent</div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>智能生成 · 数据驱动 · 可执行</div>
            </div>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 22px 24px' }}>
          <PlanForm initial={seed} onSubmit={handleStart} isLoading={status === 'running'} />
        </div>
      </aside>

      {/* Main area — scrolls as one unit */}
      <main style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>
        {/* Main header */}
        <header style={{
          height: 64, background: '#fff', borderBottom: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 28px', flexShrink: 0,
        }}>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.3px', color: '#0f172a' }}>
            营销方案工作台
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => window.print()} style={{
              padding: '8px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
              background: '#fff', border: '1px solid #e2e8f0', color: '#475569',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
              导出 PDF
            </button>
            <button onClick={exportWord} style={{
              padding: '8px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600,
              cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6,
              background: '#fff', border: '1px solid #e2e8f0', color: '#475569',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>
              导出 Word
            </button>
          </div>
        </header>

        {/* Tab bar */}
        <nav style={{
          height: 52, background: '#fff', borderBottom: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center', gap: 4, padding: '0 28px',
          overflowX: 'auto', flexShrink: 0,
        }}>
          {[{ idx: 0, label: '概览' }, { idx: 1, label: '1. 项目概述' }, { idx: 2, label: '2. 市场分析' },
            { idx: 3, label: '3. 营销策略' }, { idx: 4, label: '4. 执行方案' }, { idx: 5, label: '5. 数字化运营' },
            { idx: 6, label: '6. 达人体系' }, { idx: 7, label: '7. 时间规划' }, { idx: 8, label: '8. KPI' },
            { idx: 9, label: '9. 预算' },
          ].map(t => (
            <button key={t.idx} onClick={() => scrollToChapter(t.idx)} style={{
              padding: '8px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              cursor: 'pointer', whiteSpace: 'nowrap', border: 'none',
              background: t.idx === 0 ? '#1e40af' : 'transparent',
              color: t.idx === 0 ? '#fff' : '#475569',
            }}>{t.label}</button>
          ))}
        </nav>

        {/* Log stream */}
        <div style={{ flexShrink: 0 }}>
          <PlanLogStream logs={logs} />
        </div>

        {/* Content — fills remaining space, scrolls within */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 28, background: '#fafbfc' }}>
          <div style={{ maxWidth: 900, margin: '0 auto' }}>
            {/* Pipeline section */}
            <section style={{
              background: '#fff', borderRadius: 14, padding: 24, marginBottom: 24,
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.06), 0 2px 4px -2px rgb(0 0 0 / 0.04)',
              border: '1px solid #e2e8f0',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h2 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, color: '#0f172a' }}>
                  <span style={{
                    width: 28, height: 28, borderRadius: 6,
                    background: '#dbeafe', color: '#1e40af',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
                  }}>🤖</span>
                  Agent 执行流水线
                </h2>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#475569', cursor: 'pointer' }}>
                  <div
                    onClick={() => setAutoContinue(v => !v)}
                    className={autoContinue ? 'on' : ''}
                    style={{
                      width: 38, height: 20, borderRadius: 10,
                      background: autoContinue ? '#1e40af' : '#e2e8f0',
                      position: 'relative', transition: 'background 0.2s', cursor: 'pointer',
                    }}
                  >
                    <span style={{
                      position: 'absolute', width: 16, height: 16, borderRadius: '50%',
                      background: '#fff', top: 2,
                      left: autoContinue ? 20 : 2,
                      transition: 'left 0.2s',
                    }} />
                  </div>
                  <span>自动确认继续</span>
                </label>
              </div>
              <PipelineTimeline nodes={nodes} failedNode={failedNode} />
            </section>

            {/* Plan preview */}
            <PlanPreview chapters={chapters} />

            {/* Action cards */}
            {actionItems && actionItems.length > 0 && (
              <div id="actions-anchor">
                <PlanActionCards actions={actionItems} />
              </div>
            )}
          </div>
        </div>
      </main>

      {/* FAB */}
      {actionItems && actionItems.length > 0 && (
        <button id="fab-actions" onClick={() => document.getElementById('action-modal')?.classList.add('open')} style={{
          position: 'fixed', right: 28, bottom: 28, width: 56, height: 56,
          borderRadius: '50%', background: '#f97316', color: '#fff',
          border: 'none', boxShadow: '0 6px 20px rgba(249, 115, 22, 0.35)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, zIndex: 200,
        }}>🎯</button>
      )}

      {/* Action modal */}
      {actionItems && actionItems.length > 0 && (
        <div id="action-modal" onClick={(e) => { if (e.target === e.currentTarget) e.currentTarget.classList.remove('open') }} style={{
          position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)',
          display: 'none', alignItems: 'center', justifyContent: 'center',
          zIndex: 300, backdropFilter: 'blur(4px)',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#fff', borderRadius: 14, width: '90%', maxWidth: 520,
            maxHeight: '80vh', overflow: 'hidden', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.08)',
          }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>🎯 下一步行动建议</h3>
              <button onClick={() => document.getElementById('action-modal')?.classList.remove('open')} style={{
                width: 28, height: 28, borderRadius: '50%', border: 'none',
                background: '#f1f5f9', color: '#475569', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>✕</button>
            </div>
            <div style={{ padding: '20px 24px', overflowY: 'auto', maxHeight: '50vh' }}>
              <PlanActionCards actions={actionItems} />
            </div>
            <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => document.getElementById('action-modal')?.classList.remove('open')} style={{
                padding: '8px 14px', borderRadius: 6, fontSize: 13, fontWeight: 600,
                cursor: 'pointer', background: '#fff', border: '1px solid #e2e8f0', color: '#475569',
              }}>关闭</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function exportWord() {
  const title = '营销方案'
  const html = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset='utf-8'><title>${title}</title></head>
<body><p>请使用导出功能生成完整文档</p></body>
</html>`
  const blob = new Blob(['﻿', html], { type: 'application/msword' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${title}.doc`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function scrollToChapter(idx: number) {
  if (idx === 0) {
    document.querySelector('.pipeline-section')?.scrollIntoView({ behavior: 'smooth' })
    return
  }
  const el = document.querySelector(`[data-chapter-idx="${idx}"]`)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    el.classList.add('open')
  }
}

// Inject modal open/close style
const style = document.createElement('style')
style.textContent = `#action-modal.open { display: flex !important; }`
document.head.appendChild(style)
