// ScreenGenerate — ③ 方案生成屏
// OpenSpec: mobile-brief-connect-backend · specs/mobile-brief-connect/spec.md
// SSE 驱动 10 Agent 流水线 + 点击展开日志 + 方案卡片 + CTA + Checkpoint 审核面板
import { createPortal } from 'react-dom'
import { useCallback, useEffect, useRef, useState } from 'react'
import { getPlanSummary } from '../../api/plan'
import type { PlanSummary } from '../../api/plan'
import type { BriefFormData } from './ScreenBrief'
import type { MobileScreen } from './ScreenChat'
import type { MobilePlanRunAPI } from '../../hooks/useMobilePlanRun'
import type { BudgetAllocation } from './ScreenBudgetPreview'

interface ScreenGenerateProps {
  onNavigate: (s: MobileScreen, data?: BriefFormData) => void
  briefData: BriefFormData | null
  planRun: MobilePlanRunAPI
  /** 要抑制的 paused node_id，为 null 时不抑制 */
  suppressCheckpointNodeId?: string | null
  onOpenBudgetPreview: (data: {
    totalBudget: number
    periodMonths: number
    allocations: BudgetAllocation[]
    kpis: Record<string, string>
    timeline: string[]
  }) => void
  onOpenActionPreview: () => void
  /** 从 checkpoint 弹窗打开执行规划预览 */
  onOpenExecutionPlanningPreview?: () => void
  /** 从 checkpoint 弹窗打开策略生成预览 */
  onOpenStrategyPreview?: () => void
  /** 从 checkpoint 弹窗打开适配度分析预览 */
  onOpenFitnessPreview?: () => void
  /** 从 checkpoint 弹窗打开数据查询预览 */
  onOpenDataQueryPreview?: () => void
  /** 预览并行调研节点结果 */
  onViewParallelResult?: (nodeId: string) => void
  /** 从流水线步骤中打开只读的行动建议预览 */
  onViewActionResult?: () => void
  /** 查看任意节点结果（除 plan_generator 外的所有节点） */
  onViewNodeResult?: (nodeId: string, title: string, data: Record<string, unknown>) => void
}

export function ScreenGenerate({ onNavigate, briefData, planRun, suppressCheckpointNodeId, onOpenBudgetPreview, onOpenActionPreview, onViewActionResult, onViewNodeResult, onOpenExecutionPlanningPreview, onOpenStrategyPreview, onOpenFitnessPreview, onOpenDataQueryPreview, onViewParallelResult }: ScreenGenerateProps) {
  const {
    status,
    steps,
    chapters,
    pausedSnapshot,
    error,
    isLoading,
    isConnected,
    outputs,
    start,
    approve,
    reject,
    restoreFromRunId,
  } = planRun

  // 日志默认不展开，只有手动点击才展示
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [autoMode] = useState(false)
  const [summary, setSummary] = useState<PlanSummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [restoring, setRestoring] = useState(false) // 恢复中不显示 idle 占位
  const logEndRef = useRef<HTMLDivElement>(null)

  // 切回页面时从 localStorage 恢复运行记录，不清空已有数据
  // 从 localStorage 恢复历史流水线（仅当没有 briefData 即非从简报跳转时）
  useEffect(() => {
    const savedRunId = localStorage.getItem('allygo_mobile_plan_run_id')
    if (!briefData && status === 'idle' && savedRunId && savedRunId !== 'null') {
      setRestoring(true)
      restoreFromRunId(savedRunId).finally(() => setRestoring(false))
    } else if (!briefData && status === 'idle' && (!savedRunId || savedRunId === 'null')) {
      // 没有存过的 run_id，用后端最新的已完成 run
      setRestoring(true)
      import('../../api/plan').then(({ listPlanRuns }) => {
        listPlanRuns(3).then(runs => {
          const completed = runs.find(r => r.status === 'completed')
          if (completed) {
            localStorage.setItem('allygo_mobile_plan_run_id', completed.run_id)
            return restoreFromRunId(completed.run_id)
          }
        }).catch(() => {}).finally(() => setRestoring(false))
      })
    }
  }, [briefData, status, restoreFromRunId])

  // 只在从简报页跳转过来（带 briefData）时才启动流水线
  const hasStartedRef = useRef(false)
  useEffect(() => {
    if (status === 'idle') hasStartedRef.current = false
  }, [status])

  useEffect(() => {
    if (briefData && status === 'idle' && !hasStartedRef.current) {
      hasStartedRef.current = true
      const budgetMatch = briefData.period.match(/\d+/)
      const budget = parseInt(briefData.marketing_goal.match(/\d+/)?.[0] || '0', 10)
      const period = budgetMatch ? parseInt(budgetMatch[0], 10) : 3
      const brandInput: Record<string, unknown> = {
        brand_name: briefData.brand_name,
        category: briefData.category,
        budget,
        period,
        product_matrix: briefData.product_matrix,
        target_audience: briefData.target_audience,
        marketing_goal: briefData.marketing_goal,
        city: briefData.selected_cities?.[0] || '上海',
        selected_cities: briefData.selected_cities,
        core_strategy: briefData.core_strategy,
      }
      start(brandInput)
    }
  }, [briefData, status, start])

  // 方案完成时调用摘要端点（briefData 变化时应清空旧摘要）
  useEffect(() => {
    if (briefData) {
      setSummary(null)
      setSummaryLoading(false)
    }
  }, [briefData])

  useEffect(() => {
    if (status !== 'completed') return
    const rid = (() => { try { return localStorage.getItem('allygo_mobile_plan_run_id') } catch { return null } })()
    if (rid && !summary && !summaryLoading) {
      setSummaryLoading(true)
      getPlanSummary(rid).then(s => {
        setSummary(s)
        setSummaryLoading(false)
      }).catch(() => {
        setSummaryLoading(false)
      })
    }
  }, [status, summary, summaryLoading])

  // Auto-scroll log to bottom
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [steps, expandedId])

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id))
  }

  const handleApprove = useCallback(() => {
    approve()
  }, [approve])

  const handleReject = useCallback(() => {
    if (rejectReason.trim()) {
      reject(rejectReason.trim())
      setShowRejectInput(false)
      setRejectReason('')
    }
  }, [rejectReason, reject])

  const showModal = status === 'paused' && pausedSnapshot !== null
    && (!suppressCheckpointNodeId || pausedSnapshot.node_id !== suppressCheckpointNodeId)

  // 弹窗关闭/重新打开时重置驳回输入状态
  useEffect(() => {
    setShowRejectInput(false)
    setRejectReason('')
  }, [showModal])
  useEffect(() => {
    if (autoMode && status === 'paused' && pausedSnapshot && !isLoading && !isConnected) {
      handleApprove()
    }
  }, [autoMode, status, pausedSnapshot, isLoading, isConnected, handleApprove])

  const isIdle = status === 'idle'

  // 恢复中不显示 idle 占位，等拿到结果后直接展示 pipeline
  if (isIdle && !briefData && !restoring) {
    return (
      <div className="mw-placeholder" style={{ flex: 1 }}>
        <div className="ph-title">📋 方案生成</div>
        <div>请先在 ② 简报屏填写信息，点击「AI 生成方案」开始</div>
      </div>
    )
  }

  return (
    <div className="mw-generate-scroll" style={{ flex: 1, paddingBottom: 20, overflowY: 'auto', overflowX: 'hidden' }}>
      <style>{`.mw-generate-scroll{scrollbar-width:none!important;-ms-overflow-style:none!important}
.mw-generate-scroll::-webkit-scrollbar{display:none!important;width:0!important;height:0!important;background:transparent!important;}`}</style>
      {status !== 'idle' && (
      <div className="sec">
        <h3>智能方案生成引擎 {status === 'running' && isConnected && <span className="more" style={{color:'var(--accent)'}}>执行中…</span>}</h3>
      </div>
      )}
      <div className="pipe">
        {steps.map((s) => {
          const isExpanded = expandedId === s.id
          const dotContent =
            s.status === 'complete' ? '✓' :
            s.status === 'failed' ? '✗' :
            s.status === 'waiting' ? '⏸' :
            s.status === 'running' ? '◉' : ''
          const stepClass =
            s.status === 'complete' ? ' done' :
            s.status === 'running' ? ' now' :
            s.status === 'failed' ? ' failed' :
            s.status === 'waiting' ? ' waiting' : ''

          return (
            <div key={s.id} className={'step' + stepClass}>
              <div className="dot">{dotContent}</div>
              <div className="body" style={{ cursor: s.logs.length > 0 || (s.status === 'complete' && s.id !== 'plan_generator' && onViewNodeResult) ? 'pointer' : 'default' }} onClick={() => {
                const hasLogs = s.logs.length > 0
                const hasViewBtn = s.status === 'complete' && s.id !== 'plan_generator' && onViewNodeResult
                if (hasLogs || hasViewBtn) toggleExpand(s.id)
              }}>
                <div className="st">{s.label}</div>
                <div className="sd">{s.id === 'action_recommendations' && s.status === 'running' ? '行动建议执行中…' : s.id === 'action_recommendations' && s.status === 'complete' ? '行动建议执行完毕' : s.summary}</div>
                {isExpanded && (s.logs.length > 0 || (s.status === 'complete' && s.id !== 'plan_generator' && onViewNodeResult)) && (
                  <div className="log-card" style={{
                    marginTop: 8, padding: 8, borderRadius: 'var(--r-sm)',
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    fontSize: 11, lineHeight: 1.6, color: 'var(--fg-soft)',
                    maxHeight: 120, overflowY: 'auto',
                  }}>
                    {s.logs.map((log, i) => (
                      <div key={i} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{log}</div>
                    ))}
                    {/* 通用查看结果按钮（除 plan_generator 外所有 complete 节点） */}
                    {s.status === 'complete' && s.id !== 'plan_generator' && onViewNodeResult && (
                      <div style={{ marginTop: 6 }}>
                        <button
                          type="button"
                          onClick={() => {
                            const raw = (outputs as Record<string, unknown>)[s.id]
                            const data = (raw && typeof raw === 'object' && !Array.isArray(raw))
                              ? raw as Record<string, unknown>
                              : {}
                            onViewNodeResult(s.id, s.label, data)
                          }}
                          style={{
                            fontSize: 11, padding: '3px 10px', borderRadius: 6,
                            border: '1px solid var(--border)', background: 'var(--accent)',
                            color: '#fff', cursor: 'pointer',
                            fontFamily: 'var(--ff)', fontWeight: 500,
                            transition: 'all 0.15s',
                          }}
                        >查看结果</button>
                      </div>
                    )}
                    <div ref={logEndRef} />
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {error && (
        <div className="plancard" style={{ borderColor: '#fecaca', margin: '4px 16px 10px' }}>
          <div className="pb" style={{ color: '#dc2626', fontSize: 12 }}>
            ✗ {error}
          </div>
        </div>
      )}

      {chapters.length > 0 && status === 'completed' && (
        <>
          <div className="sec">
            <h3>
              生成结果
              <span
                className="more"
                onClick={() => onNavigate('preview')}
                style={{ cursor: 'pointer', color: 'var(--accent)', fontWeight: 600 }}
                title="查看完整方案"
              >查看完整方案</span>
            </h3>
          </div>

          {summaryLoading && (
            <div className="plancard">
              <div className="pb" style={{textAlign:'center',fontSize:12,color:'var(--muted)',padding:'16px 0'}}>
                ⏳ 正在提炼方案摘要…
              </div>
            </div>
          )}

          {/* summary 模式：用 LLM 归一化后的数据渲染 */}
          {!summaryLoading && summary && (() => {
            const s = summary
            return (
              <>
                {/* 策略定位 */}
                {s.strategy?.positioning && (
                  <div className="plancard">
                    <div className="ph">策略定位 <span className="tag">已生成</span></div>
                    <div className="pb">
                      <p>{s.strategy.positioning}</p>
                      {s.strategy.key_messages?.length > 0 && (
                        <div className="model" style={{marginTop:8}}>
                          {s.strategy.key_messages.map((m, i) => (
                            <span key={i}>{m}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 执行规划 */}
                {s.execution?.length > 0 && (
                  <div className="plancard">
                    <div className="ph">执行规划 <span className="tag">已生成</span></div>
                    <div className="pb">
                      {s.execution.slice(0,4).map((item, i) => (
                        <p key={i} style={{marginBottom:4}}><b>{item.label}：</b>{item.description}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* 核心 KPI */}
                {s.kpis?.length > 0 && (
                  <div className="plancard">
                    <div className="ph">核心 KPI <span className="tag">目标</span></div>
                    <div className="pb">
                      <div className="kpi-row" style={{gridTemplateColumns:s.kpis.length <= 3 ? '1fr 1fr 1fr' : '1fr 1fr'}}>
                        {s.kpis.map((k, i) => (
                          <div key={i} className="k">
                            <div className="n">{k.target}</div>
                            <div className="l">{k.name}{k.unit ? `（${k.unit}）` : ''}</div>
                          </div>
                        ))}
                      </div>
                      {/* 预算分配 */}
                      {s.allocations?.length > 0 && (
                        <div style={{marginTop:12}}>
                          <div style={{fontSize:10,fontWeight:600,color:'var(--muted)',marginBottom:6}}>预算分配</div>
                          {s.allocations.map((a, i) => (
                            <div key={i} style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
                              <span style={{fontSize:10,color:'var(--muted)',width:48,flexShrink:0}}>{a.category}</span>
                              <div style={{flex:1,height:8,borderRadius:4,background:'var(--surface)',overflow:'hidden'}}>
                                <div style={{width:`${a.percentage}%`,height:'100%',borderRadius:4,background:'var(--accent)'}} />
                              </div>
                              <span style={{fontSize:10,fontWeight:600,color:'var(--accent)',width:40,textAlign:'right'}}>{a.percentage}%</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 行动建议 */}
                {s.actions?.length > 0 && (
                  <div className="plancard">
                    <div className="ph">行动建议 <span className="tag">{s.actions.length}项</span></div>
                    <div className="pb">
                      {s.actions.slice(0,4).map((a, i) => (
                        <p key={i} style={{marginBottom:3,fontSize:12}}>• {a.title}：{a.description?.slice(0,60)}</p>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )
          })()}
        </>
      )}

      {status === 'completed' && chapters.length > 0 && (
        <div className="cta-line" onClick={() => onNavigate('actions')}>
          <div>
            <div className="big">下一步行动建议</div>
            <div className="small">基于方案生成 6 项可执行动作</div>
          </div>
          <div className="go">查看 ›</div>
        </div>
      )}

      {/* Checkpoint modal — slide from right to center inside phone frame */}
      {showModal && <div style={{
        position: 'absolute', inset: 0, zIndex: 50,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none',
      }}>
        <div style={{
          width: 300, borderRadius: 'var(--r-lg)',
          boxShadow: '0 12px 40px var(--shadow-lg)',
          overflow: 'hidden', background: 'var(--bg)',
          maxHeight: '68vh',
          animation: 'bksi 0.35s cubic-bezier(0.16,1,0.3,1) both',
          pointerEvents: 'auto',
        }}>
          <div style={{
            padding: '16px 16px 14px',
            maxHeight: 'inherit', overflowY: 'auto', overflowX: 'hidden',
          }}>
          {(() => {
              const isBk = pausedSnapshot!.node_id === 'budget_kpi'
              const isAr = pausedSnapshot!.node_id === 'action_recommendations'
              const isEp = pausedSnapshot!.node_id === 'execution_planning'
              const isSg = pausedSnapshot!.node_id === 'strategy_generation'
              const isFa = pausedSnapshot!.node_id === 'fitness_analysis'
              const isDq = pausedSnapshot!.node_id === 'plan_data_query'
              const isPr = pausedSnapshot!.node_id === 'product_research'
              const isMr = pausedSnapshot!.node_id === 'market_research'
              const isAi = pausedSnapshot!.node_id === 'audience_insight'
              const isParallelResult = isPr || isMr || isAi
              const isResultNode = isBk || isAr || isEp || isSg || isFa || isDq || isParallelResult
              let bk: Record<string, unknown> | undefined
              let ar: Record<string, unknown> | undefined
              let ep: Record<string, unknown> | undefined
              let sg: Record<string, unknown> | undefined
              let fa: Record<string, unknown> | undefined
              let dq: Record<string, unknown> | undefined
              let hasData = false
              if (isBk) {
                bk = pausedSnapshot!.upstream_outputs.budget_kpi as Record<string, unknown> | undefined
                hasData = !!(bk && typeof bk.total_budget !== 'undefined')
              }
              if (isAr) {
                ar = pausedSnapshot!.upstream_outputs.action_recommendations as Record<string, unknown> | undefined
                hasData = !!(ar && Array.isArray(ar.actions) && ar.actions.length > 0)
              }
              if (isEp) {
                ep = pausedSnapshot!.upstream_outputs.execution_planning as Record<string, unknown> | undefined
                hasData = !!(ep && Object.keys(ep).length > 0)
              }
              if (isSg) {
                sg = pausedSnapshot!.upstream_outputs.strategy_generation as Record<string, unknown> | undefined
                hasData = !!(sg && Object.keys(sg).length > 0)
              }
              if (isFa) {
                fa = pausedSnapshot!.upstream_outputs.fitness_analysis as Record<string, unknown> | undefined
                hasData = !!(fa && Object.keys(fa).length > 0)
              }
              if (isDq) {
                dq = pausedSnapshot!.upstream_outputs.plan_data_query as Record<string, unknown> | undefined
                hasData = !!(dq && Object.keys(dq).length > 0)
              }
              // 只有结果节点真正执行完（有输出数据）才展示结果弹窗
              // 并行节点（product_research/market_research/audience_insight）的
              // interrupt_after 暂停时，其数据在 upstream_outputs 中可直接取
              const showResult = isResultNode && (isParallelResult || hasData)

              if (!showResult) {
                /* ── 通用弹窗（非 budget_kpi，或首次到 budget_kpi 但还没跑） ── */
                return <>
                  <div style={{ textAlign: 'center', marginBottom: 20 }}>
                    <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>即将执行</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#111' }}>
                      {steps.find(s => s.id === pausedSnapshot!.node_id)?.label || pausedSnapshot!.node_id}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      type="button"
                      disabled={isLoading || isConnected}
                      onClick={handleApprove}
                      style={{
                        flex: 1, height: 40, border: 'none', borderRadius: 8,
                        background: isLoading || isConnected ? '#9ca3af' : '#1677ff',
                        color: '#ffffff', fontSize: 13, fontWeight: 600,
                        cursor: isLoading || isConnected ? 'not-allowed' : 'pointer',
                        fontFamily: 'var(--ff)',
                      }}
                    >
                      {isLoading ? '…' : '✓ 确认继续'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowRejectInput(true); setRejectReason('') }}
                      style={{
                        flex: 1, height: 40, border: '1px solid #d9dee7',
                        borderRadius: 8, background: '#ffffff',
                        color: '#6b7280', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                        fontFamily: 'var(--ff)',
                      }}
                    >
                      ✕ 驳回重跑
                    </button>
                  </div>

                  {showRejectInput && (
                    <div style={{ marginTop: 12 }}>
                      <textarea
                        placeholder="请输入驳回原因…"
                        value={rejectReason}
                        onChange={e => setRejectReason(e.target.value)}
                        rows={2}
                        style={{
                          width: '100%', padding: '8px 10px', borderRadius: 8,
                          border: '1px solid var(--border)', fontSize: 12,
                          fontFamily: 'var(--ff)', resize: 'none', boxSizing: 'border-box',
                        }}
                      />
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button
                          type="button"
                          disabled={!rejectReason.trim()}
                          onClick={handleReject}
                          style={{
                            flex: 1, height: 36, border: 'none', borderRadius: 8,
                            background: rejectReason.trim() ? '#dc2626' : '#9ca3af',
                            color: '#fff', fontSize: 12, fontWeight: 600,
                            cursor: rejectReason.trim() ? 'pointer' : 'not-allowed',
                            fontFamily: 'var(--ff)',
                          }}
                        >
                          确认驳回
                        </button>
                        <button
                          type="button"
                          onClick={() => { setShowRejectInput(false); setRejectReason('') }}
                          style={{
                            flex: 1, height: 36, border: '1px solid var(--border)',
                            borderRadius: 8, background: '#fff',
                            color: 'var(--muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                            fontFamily: 'var(--ff)',
                          }}
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  )}
                </>
              }

              /* ── 结果弹窗（budget_kpi 或 action_recommendations） ── */
              return <>
                <style>{`
                  @keyframes bk-fade-in { from { opacity: 0; transform: translateY(16px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
                  @keyframes bk-slide-up { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
                  .bk-modal { animation: bk-fade-in 0.35s cubic-bezier(0.16,1,0.3,1) both; }
                  .bk-section { animation: bk-slide-up 0.35s cubic-bezier(0.16,1,0.3,1) both; }
                  .bk-section:nth-child(1) { animation-delay: 0.05s; }
                  .bk-section:nth-child(2) { animation-delay: 0.1s; }
                  .bk-btn { transition: all 0.2s cubic-bezier(0.16,1,0.3,1); }
                  .bk-btn:active { transform: scale(0.97); }
                `}</style>

                <div className="bk-modal">
                  {/* 标题 */}
                  <div className="bk-section" style={{ textAlign: 'center', marginBottom: 20 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--fg)' }}>
                      {isBk ? <><span style={{ fontSize: 16, marginRight: 4 }}>📊</span>预算与 KPI</> : isAr ? <><span style={{ fontSize: 16, marginRight: 4 }}>💡</span>行动建议</> : isEp ? <><span style={{ fontSize: 16, marginRight: 4 }}>📋</span>执行规划</> : isSg ? <><span style={{ fontSize: 16, marginRight: 4 }}>🎯</span>策略生成</> : isFa ? <><span style={{ fontSize: 16, marginRight: 4 }}>📊</span>适配度分析</> : isDq ? <><span style={{ fontSize: 16, marginRight: 4 }}>🗃️</span>数据查询</> : <><span style={{ fontSize: 16, marginRight: 4 }}>📋</span>调研结果</>}
                    </div>
                    {isAr && (
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                        {ar && Array.isArray(ar.actions) ? `共 ${ar.actions.length} 项行动建议` : ''}，点击预览查看详情
                      </div>
                    )}
                    {isEp && (
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                        执行规划已生成，点击预览查看详情
                      </div>
                    )}
                    {isSg && (
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                        策略已生成，点击预览查看详情
                      </div>
                    )}
                    {isFa && (
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                        适配度分析已完成，点击预览查看详情
                      </div>
                    )}
                    {isDq && (
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                        数据查询已完成，点击预览查看详情
                      </div>
                    )}
                    {isPr && (
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                        产品调研已完成，点击预览查看详情
                      </div>
                    )}
                    {isMr && (
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                        市场调研已完成，点击预览查看详情
                      </div>
                    )}
                    {isAi && (
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                        人群洞察已完成，点击预览查看详情
                      </div>
                    )}
                  </div>

                  {/* 按钮组 */}
                  <div className="bk-section" style={{ display: 'flex', gap: 10 }}>
                    {isAr && (
                      <button
                        type="button"
                        className="bk-btn"
                        onClick={onOpenActionPreview}
                        style={{
                          flex: 1, height: 40, border: '1px solid var(--border)',
                          borderRadius: 8, background: 'var(--bg)',
                          color: 'var(--muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                          fontFamily: 'var(--ff)',
                        }}
                      >
                        行动预览
                      </button>
                    )}
                    {isEp && (
                      <button
                        type="button"
                        className="bk-btn"
                        onClick={() => {
                          onOpenExecutionPlanningPreview?.()
                        }}
                        style={{
                          flex: 1, height: 40, border: '1px solid var(--border)',
                          borderRadius: 8, background: 'var(--bg)',
                          color: 'var(--muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                          fontFamily: 'var(--ff)',
                        }}
                      >
                        预览执行规划
                      </button>
                    )}
                    {isSg && (
                      <button
                        type="button"
                        className="bk-btn"
                        onClick={() => {
                          onOpenStrategyPreview?.()
                        }}
                        style={{
                          flex: 1, height: 40, border: '1px solid var(--border)',
                          borderRadius: 8, background: 'var(--bg)',
                          color: 'var(--muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                          fontFamily: 'var(--ff)',
                        }}
                      >
                        预览策略
                      </button>
                    )}
                    {isFa && (
                      <button
                        type="button"
                        className="bk-btn"
                        onClick={() => {
                          onOpenFitnessPreview?.()
                        }}
                        style={{
                          flex: 1, height: 40, border: '1px solid var(--border)',
                          borderRadius: 8, background: 'var(--bg)',
                          color: 'var(--muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                          fontFamily: 'var(--ff)',
                        }}
                      >
                        预览适配度
                      </button>
                    )}
                    {isDq && (
                      <button
                        type="button"
                        className="bk-btn"
                        onClick={() => {
                          onOpenDataQueryPreview?.()
                        }}
                        style={{
                          flex: 1, height: 40, border: '1px solid var(--border)',
                          borderRadius: 8, background: 'var(--bg)',
                          color: 'var(--muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                          fontFamily: 'var(--ff)',
                        }}
                      >
                        预览数据
                      </button>
                    )}
                    {/* 并行调研节点预览按钮 */}
                    {(isPr || isMr || isAi) && (
                      <button
                        type="button"
                        className="bk-btn"
                        onClick={() => onViewParallelResult?.(pausedSnapshot!.node_id)}
                        style={{
                          flex: 1, height: 40, border: '1px solid var(--border)',
                          borderRadius: 8, background: 'var(--bg)',
                          color: 'var(--muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                          fontFamily: 'var(--ff)',
                        }}
                      >
                        预览结果
                      </button>
                    )}
                    {isBk && (
                      <button
                        type="button"
                        className="bk-btn"
                        onClick={() => {
                          const allocs = (bk?.allocations as Array<{category: string; percentage: number; amount: number}> | undefined) || []
                          const kpis = (bk?.kpis as Record<string, string>) || {}
                          const timeline = (bk?.timeline as string[]) || []
                          onOpenBudgetPreview({
                            totalBudget: (bk?.total_budget as number) || 0,
                            periodMonths: (bk?.period_months as number) || 0,
                            allocations: allocs,
                            kpis,
                            timeline,
                          })
                        }}
                        style={{
                          flex: 1, height: 40, border: '1px solid var(--border)',
                          borderRadius: 8, background: 'var(--bg)',
                          color: 'var(--muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                          fontFamily: 'var(--ff)',
                        }}
                      >
                        预览预算
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={isLoading || isConnected}
                      onClick={handleApprove}
                      className="bk-btn"
                      style={{
                        flex: 1, height: 40, border: 'none', borderRadius: 8,
                        background: isLoading || isConnected ? '#9ca3af' : 'var(--accent)',
                        color: '#ffffff', fontSize: 13, fontWeight: 600,
                        cursor: isLoading || isConnected ? 'not-allowed' : 'pointer',
                        fontFamily: 'var(--ff)',
                      }}
                    >
                      {isLoading ? '…' : '确认继续'}
                    </button>
                  </div>

                </div>
              </>
            })()}
          </div>
        </div>
      </div>
      }
      <style>{`
        @keyframes bksi{from{transform:translateX(100%)}to{transform:translateX(0)}}
        .step.failed .dot { background: #dc2626 !important; border-color: #dc2626 !important; color: #fff !important; }
        .step.waiting .dot { background: #d97706 !important; border-color: #d97706 !important; color: #fff !important; }
        .step.now .dot { animation: mobile-pulse 1.5s infinite; }
        @keyframes mobile-pulse {
          0% { box-shadow: 0 0 0 0 rgba(22, 119, 255, 0.4); }
          70% { box-shadow: 0 0 0 8px rgba(22, 119, 255, 0); }
          100% { box-shadow: 0 0 0 0 rgba(22, 119, 255, 0); }
        }
      `}</style>
    </div>
  )
}
