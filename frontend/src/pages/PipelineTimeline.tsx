import { useState, useEffect, useRef } from 'react'
import type { PlanNode } from '../types/plan'

interface PipelineTimelineProps {
  nodes: PlanNode[]
  failedNode: string | null
  nodeLogs?: Record<string, string[]>
  pausedNode?: string | null
  autoMode?: boolean
  isLoading?: boolean
  isConnected?: boolean
  onApprove?: () => void
  onRerun?: () => void
  onNodeClick?: (nodeId: string) => void
}

interface AgentMeta {
  id: string
  name: string
  desc: string
  icon: string
}

const agents: AgentMeta[] = [
  { id: 'product_research', name: '产品调研 Agent', desc: '搜索并分析品牌产品信息与市场定位', icon: '\u{1F50E}' },
  { id: 'market_research', name: '市场调研 Agent', desc: '收集行业趋势、竞品格局、消费洞察', icon: '\u{1F4CA}' },
  { id: 'audience_insight', name: '人群洞察 Agent', desc: '分析目标城市运动人群画像', icon: '\u{1F465}' },
  { id: 'plan_data_query', name: '数据查询 Agent', desc: '调取 AllyGo 盟域/赛事/达人/场馆/经营社数据', icon: '\u{1F50D}' },
  { id: 'fitness_analysis', name: '适配度分析 Agent', desc: '计算品牌品类 × 运动场景适配度', icon: '\u{1F3AF}' },
  { id: 'strategy_generation', name: '策略生成 Agent', desc: '制定营销策略、核心定位、4M+1C框架', icon: '\u{1F4A1}' },
  { id: 'execution_planning', name: '执行规划 Agent', desc: '规划赛事/盟域/达人/内容/运营落地方案', icon: '\u{1F680}' },
  { id: 'budget_kpi', name: '预算与 KPI Agent', desc: '测算预算分配、KPI预测、时间表', icon: '\u{1F4B0}' },
  { id: 'action_recommendations', name: '行动建议 Agent', desc: '生成可执行的系统操作指导', icon: '\u{1F3AF}' },
  { id: 'plan_generator', name: '方案生成 Agent', desc: '汇总上游输出为 9 章 Markdown 方案', icon: '\u{1F4CB}' },
]

function statusLabel(status: PlanNode['status']): string {
  switch (status) {
    case 'running':
      return '执行中'
    case 'complete':
      return '已完成'
    case 'failed':
      return '失败'
    case 'waiting':
      return '等待确认'
    default:
      return '待执行'
  }
}

function stepClass(node: PlanNode, failedNode: string | null): string {
  if (node.status === 'complete') return 'completed'
  if (node.id === failedNode || node.status === 'failed') return 'failed'
  if (node.status === 'waiting') return 'waiting'
  if (node.status === 'running') return 'running'
  return 'pending'
}

function statusBadgeClass(status: PlanNode['status']): string {
  switch (status) {
    case 'completed':
    case 'complete':
      return 'bg-emerald-50 text-emerald-700'
    case 'running':
      return 'bg-blue-50 text-blue-800'
    case 'waiting':
      return 'bg-amber-50 text-amber-700'
    case 'failed':
      return 'bg-red-50 text-red-700'
    default:
      return 'bg-gray-100 text-gray-500'
  }
}

function dotClass(status: PlanNode['status'], isPaused: boolean): string {
  if (isPaused) return 'border-[#d97706] bg-[#d97706] text-white'
  switch (status) {
    case 'completed':
    case 'complete':
      return 'border-[#059669] bg-[#059669] text-white'
    case 'running':
      return 'border-[#1e40af] bg-[#1e40af] text-white'
    case 'waiting':
      return 'border-[#d97706] bg-[#d97706] text-white'
    case 'failed':
      return 'border-red-600 bg-red-600 text-white'
    default:
      return 'border-gray-300 bg-white text-gray-400'
  }
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}秒`
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return s > 0 ? `${m}分${s}秒` : `${m}分钟`
}

/** Terminal-style log viewer: dark background, monospace, vertical scroll, auto-scroll */
function LogViewer({ logs, isRunning }: { logs: string[]; isRunning: boolean }) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = bottomRef.current?.parentElement
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, [logs.length])

  if (logs.length === 0) {
    return (
      <div className="log-viewer" style={{
        background: '#f8fafc', borderRadius: 8,
        padding: '12px 16px', maxHeight: 200, overflowY: 'auto',
        fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
        fontSize: 12, lineHeight: 1.7, color: '#94a3b8',
      }}>
        <span style={{ color: '#94a3b8' }}>等待执行…</span>
      </div>
    )
  }

  return (
    <div className="log-viewer" style={{
      background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0',
      padding: '12px 16px', maxHeight: 200, overflowY: 'auto',
      fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
      fontSize: 12, lineHeight: 1.7, color: '#334155',
    }}>
      {logs.map((msg, i) => {
        const prefix = isRunning && i === logs.length - 1 ? '▸ ' : '  '
        const color =
          msg.includes('✗') ? '#dc2626' :
          msg.includes('✓') ? '#059669' :
          msg.includes('等待') ? '#d97706' :
          msg.includes('开始') ? '#2563eb' :
          msg.includes('🔍') ? '#2563eb' :
          msg.includes('📄') || msg.includes('🌐') ? '#7c3aed' :
          msg.includes('🤖') ? '#0891b2' :
          msg.includes('⚠️') || msg.includes('⏱️') ? '#d97706' :
          '#334155'
        return (
          <div key={i} style={{ color, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {prefix}{msg}
          </div>
        )
      })}
      <div ref={bottomRef} />
    </div>
  )
}

export function PipelineTimeline({ nodes, failedNode, nodeLogs, pausedNode, autoMode = false, isLoading = false, isConnected = false, onApprove, onRerun  }: PipelineTimelineProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set())

  // Auto-expand running or paused node
  useEffect(() => {
    const runningNode = nodes.find(n => n.status === 'running')
    const target = runningNode?.id ?? pausedNode
    if (target) {
      setExpandedSteps(prev => {
        if (prev.has(target)) return prev
        const next = new Set(prev)
        next.add(target)
        return next
      })
    }
  }, [nodes, pausedNode])

  const toggleStep = (nodeId: string) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev)
      if (next.has(nodeId)) {
        next.delete(nodeId)
      } else {
        next.add(nodeId)
      }
      return next
    })
  }

  const nodeMap = new Map(nodes.map((n) => [n.id, n]))

  return (
    <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-bold text-gray-800">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-sm text-[#1e40af]">
            {'\u{1F916}'}
          </span>
          Agent 执行流水线
        </h2>
      </div>

      <div className="relative pl-7">
        <div className="absolute bottom-0 left-[11px] top-0 w-0.5 bg-gray-200" />

        <div className="space-y-1">
          {agents.map((agent) => {
            const node = nodeMap.get(agent.id)
            const status: PlanNode['status'] = node?.status ?? 'pending'
            const sClass = node ? stepClass(node, failedNode) : 'pending'
            const isExpanded = node ? expandedSteps.has(node.id) : false
            const isPaused = pausedNode === agent.id
            const isRunning = status === 'running'
            const isComplete = status === 'complete' || status === 'completed'
            const logs = nodeLogs?.[agent.id] ?? []

            // Duration from node timestamps
            const duration = (node?.startedAt && node?.completedAt)
              ? Math.round((node.completedAt - node.startedAt) / 1000)
              : null

            return (
              <div key={agent.id} data-agent-id={agent.id} className={`pipeline-step ${sClass}`}>
                <div className={`step-dot ${dotClass(status, isPaused)} ${isRunning ? 'ripple' : ''}`}>
                  <span className="leading-none">{agent.icon}</span>
                </div>

                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    className="flex w-full items-start gap-3.5 rounded-md px-0 py-3 text-left transition-colors hover:bg-gray-50"
                    onClick={() => node && toggleStep(node.id)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-gray-800">{agent.name}</div>
                        <span className={`whitespace-nowrap rounded-[10px] px-2 py-0.5 text-[11px] font-semibold ${statusBadgeClass(status)}`}>
                          {isPaused ? '等待确认' : statusLabel(status)}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-gray-500">{agent.desc}</div>
                    </div>
                  </button>

                  {node && isExpanded && (
                    <div className="mb-3 mt-0 rounded-lg border border-gray-200 bg-gray-50 p-4">
                      {/* Terminal-style logs */}
                      <LogViewer logs={logs} isRunning={isRunning} />

                      {/* Execution summary — shown after completion or pause */}
                      {logs.length > 0 && !isRunning && !isPaused && (
                        <div className="mt-3 border-t border-gray-200 pt-3">
                          <div className="mb-1.5 text-xs font-bold text-gray-700">
                            {isComplete ? '✅ 执行摘要' : '📋 执行摘要'}
                          </div>
                          <div className="text-xs leading-relaxed text-gray-600">
                            <span>
                              状态：{isComplete ? '已完成' : '已暂停'}
                              {duration !== null && ` · 耗时：${formatDuration(duration)}`}
                              {' · '}日志：共 {logs.length} 条
                            </span>
                          </div>
                        </div>
                      )}

                      {!autoMode && (isPaused || isComplete) && onApprove && onRerun && (
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); onRerun() }}
                            className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100"
                          >
                            ↻ 重新执行
                          </button>
                          {isPaused && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); onApprove() }}
                              disabled={isConnected || isLoading}
                              className="inline-flex items-center gap-1.5 rounded-md border border-transparent px-3.5 py-1.5 text-xs font-semibold text-white"
                              style={{
                                background: isConnected || isLoading ? '#9ca3af' : '#1e40af',
                                cursor: isConnected || isLoading ? 'not-allowed' : 'pointer',
                              }}
                            >
                              ✓ 确认继续
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <style>{`
        .pipeline-step {
          position: relative;
        }
        .step-dot {
          position: absolute;
          left: -28px;
          top: 14px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          border: 2px solid #d1d5db;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          z-index: 2;
          transition: all 0.3s;
        }
        .step-dot::before {
          content: '';
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          border: 2px solid transparent;
          transition: all 0.3s;
        }
        .step-dot.ripple::before {
          border-color: #93c5fd;
          animation: pipeline-ripple 1.5s infinite;
        }
        @keyframes pipeline-ripple {
          0% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        .log-viewer::-webkit-scrollbar {
          width: 4px;
        }
        .log-viewer::-webkit-scrollbar-track {
          background: transparent;
        }
        .log-viewer::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .log-viewer::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </section>
  )
}
