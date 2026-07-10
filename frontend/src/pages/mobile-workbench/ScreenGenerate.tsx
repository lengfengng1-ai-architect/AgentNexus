// ScreenGenerate — ③ 方案生成屏
// OpenSpec: mobile-brief-connect-backend · specs/mobile-brief-connect/spec.md
// SSE 驱动 10 Agent 流水线 + 点击展开日志 + 方案卡片 + CTA + Checkpoint 审核面板
import { createPortal } from 'react-dom'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useMobilePlanRun } from '../../hooks/useMobilePlanRun'
import type { BriefFormData } from './ScreenBrief'
import type { MobileScreen } from './ScreenChat'

interface ScreenGenerateProps {
  onNavigate: (s: MobileScreen) => void
  briefData: BriefFormData | null
}

export function ScreenGenerate({ onNavigate, briefData }: ScreenGenerateProps) {
  const {
    status,
    steps,
    chapters,
    outputs,
    pausedSnapshot,
    error,
    isLoading,
    isConnected,
    start,
    approve,
    reject,
    reset,
  } = useMobilePlanRun()

  // 日志默认不展开，只有手动点击才展示
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [autoMode, setAutoMode] = useState(false)
  const logEndRef = useRef<HTMLDivElement>(null)

  // 组件卸载时重置状态（用户切到其他 Tab 再回来时显示空态）
  useEffect(() => () => reset(), [reset])

  // 只在从简报页跳转过来（带 briefData）时才启动流水线
  const hasStartedRef = useRef(false)
  useEffect(() => {
    if (briefData && status === 'idle' && !hasStartedRef.current) {
      hasStartedRef.current = true
      const brandInput: Record<string, unknown> = {
        brand_name: briefData.brand_name,
        category: briefData.category,
        product_matrix: briefData.product_matrix,
        target_audience: briefData.target_audience,
        marketing_goal: briefData.marketing_goal,
        city: briefData.selected_cities?.[0] || '上海',
        selected_cities: briefData.selected_cities,
        core_strategy: briefData.core_strategy,
        period: briefData.period,
      }
      start(brandInput)
    }
  }, [briefData, status, start])

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

  // 自动模式：暂停后自动确认继续
  useEffect(() => {
    if (autoMode && status === 'paused' && pausedSnapshot && !isLoading && !isConnected) {
      handleApprove()
    }
  }, [autoMode, status, pausedSnapshot, isLoading, isConnected, handleApprove])

  const isIdle = status === 'idle'

  if (isIdle && !briefData) {
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
        <h3>Agent 生成流水线 {status === 'running' && isConnected && <span className="more" style={{color:'var(--accent)'}}>执行中…</span>}</h3>
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
                <div className="sd">{s.summary}</div>
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
          <div className="sec"><h3>生成结果</h3></div>

          {/* 策略定位 */}
          {outputs?._strategy && (
            <div className="plancard">
              <div className="ph">策略定位 <span className="tag">已生成</span></div>
              <div className="pb">
                <p>{(outputs._strategy as Record<string,unknown>)?.positioning as string || ''}</p>
                {(outputs._strategy as Record<string,unknown>)?.key_messages && (
                  <div className="model" style={{marginTop:8}}>
                    {((outputs._strategy as Record<string,unknown>).key_messages as string[])?.map((m: string, i: number) => (
                      <span key={i}>{m}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 执行规划 */}
          {outputs?._execution && (() => {
            const exec = outputs._execution as Record<string,unknown>
            const plans = ['leagues_plan','events_plan','influencer_plan','content_plan','store_plan']
            const items = plans.filter(p => exec[p]).slice(0,3)
            if (!items.length) return null
            return (
              <div className="plancard">
                <div className="ph">执行规划 <span className="tag">已生成</span></div>
                <div className="pb">
                  {items.map((key) => (
                    <p key={key} style={{marginBottom:4}}><b>{({leagues_plan:'盟域',events_plan:'赛事',influencer_plan:'达人',content_plan:'内容',store_plan:'渠道'})[key] || key}：</b>{(exec[key] as string)?.slice(0,60)}…</p>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* 核心 KPI */}
          {outputs?._budget && (() => {
            const b = outputs._budget as Record<string,unknown>
            const kpis = b.kpis as Record<string,string> || {}
            const entries = Object.entries(kpis).slice(0,5)
            if (!entries.length) return null
            return (
              <div className="plancard">
                <div className="ph">核心 KPI <span className="tag">目标</span></div>
                <div className="pb">
                  <div className="kpi-row">
                    {entries.map(([key, val], i) => (
                      <div key={i} className="k">
                        <div className="n">{val}</div>
                        <div className="l">{key}</div>
                      </div>
                    ))}
                  </div>
                  {/* 预算分配进度条 */}
                  {Array.isArray(b.allocations) && (b.allocations as {category:string;percentage:number}[]).length > 0 && (
                    <div style={{marginTop:12}}>
                      <div style={{fontSize:10,fontWeight:600,color:'var(--muted)',marginBottom:6}}>预算分配</div>
                      {(b.allocations as {category:string;percentage:number}[]).map((a, i) => (
                        <div key={i} style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
                          <span style={{fontSize:10,color:'var(--muted)',width:48,flexShrink:0}}>{a.category}</span>
                          <div style={{flex:1,height:8,borderRadius:4,background:'var(--surface)',overflow:'hidden'}}>
                            <div style={{width:`${a.percentage}%`,height:'100%',borderRadius:4,background:'var(--accent)'}} />
                          </div>
                          <span style={{fontSize:10,fontWeight:600,color:'var(--accent)',width:28,textAlign:'right'}}>{a.percentage}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })()}

          {/* 行动建议摘要 */}
          {outputs?._actions && (() => {
            const acts = (outputs._actions as Record<string,unknown>).actions as {title:string;description:string}[] || []
            const top = acts.slice(0,3)
            if (!top.length) return null
            return (
              <div className="plancard">
                <div className="ph">行动建议 <span className="tag">{acts.length}项</span></div>
                <div className="pb">
                  {top.map((a, i) => (
                    <p key={i} style={{marginBottom:3, fontSize:12}}>• {a.title}：{a.description?.slice(0,50)}</p>
                  ))}
                </div>
              </div>
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
            width: 342, background: '#fff', borderRadius: 12,
            padding: 20, boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
          }}>
            {/* 即将执行的节点名 */}
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 4 }}>即将执行</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#111' }}>
                {steps.find(s => s.id === pausedSnapshot!.node_id)?.label || pausedSnapshot!.node_id}
              </div>
            </div>

            {/* 两个按钮 */}
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

            {/* 驳回输入 */}
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
