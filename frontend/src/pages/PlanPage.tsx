import { useCallback, useEffect, useRef, useState } from 'react'
import { usePlanRun } from '../hooks/usePlanRun'
import type { BrandInput } from '../types/chat'
import { PlanActionCards } from './PlanActionCards'
import { PlanForm } from './PlanForm'
import { PlanPreview } from './PlanPreview'
import { PipelineTimeline } from './PipelineTimeline'
import { PlanLogStream } from './PlanLogStream'

const BRAND_INPUT_KEY = 'allygo_pending_brand_input'
const STORAGE_KEY = 'allygo_plan_session'
const RUN_ID_KEY = 'allygo_plan_run_id'

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
    runId,
    logs,
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

  const displayedChapters = chapters.length > 0 ? chapters : outputs.plan_generator?.chapters || []
  const actionItems = outputs.action_recommendations?.actions?.map((a: { title: string; description: string }) => ({
    title: a.title,
    description: a.description,
    buttonLabel: '查看详情',
  }))

  const [activeTab, setActiveTab] = useState(0)
  const [autoMode, setAutoMode] = useState(false)

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

  // Auto-highlight tab based on running/paused agent.
  // 双源查找：先从 nodes 数组里找 running/paused 节点；
  // 若 nodes 还没更新到（paused 事件刚到）则 fallback 到 pausedNode 单值
  const activeAgentId =
    nodes.find(n => n.status === 'running' || n.status === 'paused')?.id
    ?? pausedNode
    ?? null
  const activeTabFromAgent = activeAgentId
    ? TABS.findIndex(t => t.agentId === activeAgentId)
    : -1

  useEffect(() => {
    if (status === 'paused' && pausedNode && autoMode) {
      approve()
    }
  }, [status, pausedNode, autoMode, approve])

  const scrollToAgent = useCallback((agentId: string) => {
    const el = contentRef.current
    if (!el) return
    if (!agentId) { el.scrollTo({ top: 0, behavior: 'smooth' }); return }
    const target = el.querySelector<HTMLElement>('[data-agent-id="' + agentId + '"]')
    if (!target) return
    const containerRect = el.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()
    // 防御：父容器或目标元素高度为 0 时（flex 坍缩瞬间）直接放弃滚动
    if (containerRect.height === 0 || targetRect.height === 0) return
    const offsetRelativeToContainer = targetRect.top - containerRect.top
    const scrollTo = el.scrollTop + offsetRelativeToContainer - containerRect.height / 2 + targetRect.height / 2
    el.scrollTo({ top: Math.max(0, scrollTo), behavior: 'smooth' })
  }, [])

  const isPaused = status === 'paused'

  const auditPanel = null

  return (
    <div key={runId ?? 'idle'} className="app" style={{ display: 'flex', minHeight: 'var(--app-height)', backgroundColor: '#fafbfc' }}>
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
                      cursor: 'pointer',
                      opacity: isConnected ? 0.6 : 1,
                    }}
                  >
                    ✓ 确认继续
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
        overflow: 'auto',
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
              onClick={() => window.print()}
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
              onClick={exportWord}
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
            const isActive = t.agentId
              ? t.agentId === activeAgentId
              : !activeAgentId
            return (
            <button
              key={t.idx}
              onClick={() => { setActiveTab(t.idx); scrollToAgent(t.agentId) }}
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
            <PipelineTimeline nodes={nodes} failedNode={failedNode} nodeLogs={nodeLogs} pausedNode={pausedNode} autoMode={autoMode} onApprove={approve} onRerun={rerun} />
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
    </div>
  )
}

function exportWord() {
  const html = '<html><meta charset="utf-8"><title>营销方案</title><body><p>导出功能待完善</p></body></html>'
  const blob = new Blob(['﻿', html], { type: 'application/msword' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = '营销方案.doc'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const _injectedStyle = document.createElement('style')
_injectedStyle.textContent = `#action-modal.open { display: flex !important; }`
document.head.appendChild(_injectedStyle)
