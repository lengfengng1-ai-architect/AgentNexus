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

interface ScreenGenerateProps {
  onNavigate: (s: MobileScreen) => void
  briefData: BriefFormData | null
  planRun: MobilePlanRunAPI
}

export function ScreenGenerate({ onNavigate, briefData, planRun }: ScreenGenerateProps) {
  const {
    status,
    steps,
    chapters,
    pausedSnapshot,
    error,
    isLoading,
    isConnected,
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
      <div className="mw-placeholder">
        <div className="ph-title">📋 方案生成</div>
        <div>请先在 ② 简报屏填写信息，点击「AI 生成方案」开始</div>
      </div>
    )
  }

  return (
    <>
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
              <div className="body" style={{ cursor: s.logs.length > 0 ? 'pointer' : 'default' }} onClick={() => s.logs.length > 0 && toggleExpand(s.id)}>
                <div className="st">{s.label}</div>
                <div className="sd">{s.id === 'action_recommendations' && s.status === 'running' ? '行动建议执行中…' : s.id === 'action_recommendations' && s.status === 'complete' ? '行动建议执行完毕' : s.summary}</div>
                {isExpanded && s.logs.length > 0 && (
                  <div className="log-card" style={{
                    marginTop: 8, padding: 8, borderRadius: 'var(--r-sm)',
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    fontSize: 11, lineHeight: 1.6, color: 'var(--fg-soft)',
                    maxHeight: 120, overflowY: 'auto',
                  }}>
                    {s.logs.map((log, i) => (
                      <div key={i} style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{log}</div>
                    ))}
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

      {/* Checkpoint modal portal — rendered outside all overflow:hidden containers */}
      {showModal && createPortal(
        <div style={{
          position: 'fixed', inset: 0, zIndex: 99999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(15, 23, 42, 0.3)',
        }}>
          {/* 手机框内弹窗 */}
          <div style={{
            width: 300, background: '#fff', borderRadius: 10,
            padding: '14px 16px', boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
            maxHeight: '60vh', overflow: 'auto',
          }}>
            {(() => {
              const isBk = pausedSnapshot!.node_id === 'budget_kpi'
              let bk: Record<string, unknown> | undefined
              let hasData = false
              if (isBk) {
                bk = pausedSnapshot!.upstream_outputs.budget_kpi as Record<string, unknown> | undefined
                hasData = !!(bk && typeof bk.total_budget !== 'undefined')
              }
              // 只有 budget_kpi 真正执行完（有输出数据）才展示结果弹窗
              // 否则都用通用弹窗（首次到 budget_kpi 时节点还没跑，或者非 budget_kpi 节点）
              const showResult = isBk && hasData

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

              /* ── budget_kpi 结果弹窗 ── */
              return <>
                <div style={{ textAlign: 'center', marginBottom: 10 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>预算与 KPI</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>确认后继续，不满意可驳回重跑</div>
                </div>

                {/* 总预算 + 周期 */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                  <div style={{ flex: 1, background: '#f5f7fa', borderRadius: 6, padding: '8px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 1 }}>总预算</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#1677ff' }}>{bk?.total_budget ?? '—'}<span style={{ fontSize: 10, fontWeight: 400, color: 'var(--muted)' }}> 万元</span></div>
                  </div>
                  <div style={{ flex: 1, background: '#f5f7fa', borderRadius: 6, padding: '8px 10px', textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginBottom: 1 }}>执行周期</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#111' }}>{bk?.period_months ?? '—'}<span style={{ fontSize: 10, fontWeight: 400, color: 'var(--muted)' }}> 个月</span></div>
                  </div>
                </div>

                {/* 预算分配 */}
                {Array.isArray(bk?.allocations) && (bk!.allocations as Array<Record<string, unknown>>).length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#111', marginBottom: 4 }}>预算分配</div>
                    {(bk!.allocations as Array<Record<string, unknown>>).map((a, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                        <span style={{ fontSize: 10, color: 'var(--muted)', width: 52, flexShrink: 0 }}>{a.category as string}</span>
                        <div style={{ flex: 1, height: 5, borderRadius: 3, background: 'var(--surface)', overflow: 'hidden' }}>
                          <div style={{ width: `${a.percentage as number}%`, height: '100%', borderRadius: 3, background: 'var(--accent)' }} />
                        </div>
                        <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--accent)', width: 40, textAlign: 'right' }}>{a.percentage as number}%</span>
                        <span style={{ fontSize: 10, color: 'var(--muted)', width: 44, textAlign: 'right' }}>{a.amount as number}万元</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* KPI 指标 */}
                {bk?.kpis && typeof bk.kpis === 'object' && Object.keys(bk.kpis).length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#111', marginBottom: 4 }}>KPI 指标</div>
                    <div style={{ background: '#f5f7fa', borderRadius: 6, padding: 8 }}>
                      {(Object.entries(bk.kpis as Record<string, string>)).map(([key, val]) => (
                        <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2, fontSize: 10 }}>
                          <span style={{ color: 'var(--muted)' }}>{key}</span>
                          <span style={{ fontWeight: 600, color: '#111' }}>{val}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 关键里程碑 */}
                {Array.isArray(bk?.timeline) && (bk!.timeline as string[]).length > 0 && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#111', marginBottom: 4 }}>里程碑</div>
                    {(bk!.timeline as string[]).map((t, i) => (
                      <div key={i} style={{ display: 'flex', gap: 4, marginBottom: 2, fontSize: 10, color: 'var(--muted)' }}>
                        <span style={{ color: 'var(--accent)' }}>•</span>
                        <span>{t}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* 两个按钮 */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    disabled={isLoading || isConnected}
                    onClick={handleApprove}
                    style={{
                      flex: 1, height: 36, border: 'none', borderRadius: 8,
                      background: isLoading || isConnected ? '#9ca3af' : '#1677ff',
                      color: '#ffffff', fontSize: 13, fontWeight: 600,
                      cursor: isLoading || isConnected ? 'not-allowed' : 'pointer',
                      fontFamily: 'var(--ff)',
                    }}
                  >
                    {isLoading ? '…' : '确认继续'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowRejectInput(true); setRejectReason('') }}
                    style={{
                      flex: 1, height: 36, border: '1px solid #d9dee7',
                      borderRadius: 8, background: '#ffffff',
                      color: '#6b7280', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      fontFamily: 'var(--ff)',
                    }}
                  >
                    驳回重跑
                  </button>
                </div>

                {/* 驳回输入 */}
                {showRejectInput && (
                  <div style={{ marginTop: 10 }}>
                    <textarea
                      placeholder="补充要求，如：减少赛事投入、提高达人合作占比…"
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      rows={2}
                      style={{
                        width: '100%', padding: '6px 8px', borderRadius: 6,
                        border: '1px solid var(--border)', fontSize: 11,
                        fontFamily: 'var(--ff)', resize: 'none', boxSizing: 'border-box',
                      }}
                    />
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      <button
                        type="button"
                        disabled={!rejectReason.trim()}
                        onClick={handleReject}
                        style={{
                          flex: 1, height: 32, border: 'none', borderRadius: 6,
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
                          flex: 1, height: 32, border: '1px solid var(--border)',
                          borderRadius: 6, background: '#fff',
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
            })()}
          </div>
        </div>,
        document.body
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
        .step.failed .dot { background: #dc2626 !important; border-color: #dc2626 !important; color: #fff !important; }
        .step.waiting .dot { background: #d97706 !important; border-color: #d97706 !important; color: #fff !important; }
        .step.now .dot { animation: mobile-pulse 1.5s infinite; }
        @keyframes mobile-pulse {
          0% { box-shadow: 0 0 0 0 rgba(22, 119, 255, 0.4); }
          70% { box-shadow: 0 0 0 8px rgba(22, 119, 255, 0); }
          100% { box-shadow: 0 0 0 0 rgba(22, 119, 255, 0); }
        }
      `}</style>
    </>
  )
}
