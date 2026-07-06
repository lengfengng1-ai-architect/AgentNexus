import { useState } from 'react'
import type { PlanNode } from '../types/plan'

interface PipelineTimelineProps {
  nodes: PlanNode[]
  failedNode: string | null
  nodeLogs?: Record<string, string[]>
  pausedNode?: string | null
  onNodeClick?: (nodeId: string) => void
}

interface AgentMeta {
  id: string
  name: string
  desc: string
  icon: string
}

const agents: AgentMeta[] = [
  { id: 'product_research', name: '产品调研 Agent', desc: '搜索并分析品牌产品信息与市场定位', icon: '50e' },
  { id: 'market_research', name: '市场调研 Agent', desc: '收集行业趋势、竞品格局、消费洞察', icon: '4ca' },
  { id: 'audience_insight', name: '人群洞察 Agent', desc: '分析目标城市运动人群画像', icon: '465' },
  { id: 'plan_data_query', name: '数据查询 Agent', desc: '调取 AllyGo 盟域/赛事/达人/场馆/经营社数据', icon: '50d' },
  { id: 'fitness_analysis', name: '适配度分析 Agent', desc: '计算品牌品类 × 运动场景适配度', icon: '3af' },
  { id: 'strategy_generation', name: '策略生成 Agent', desc: '制定营销策略、核心定位、4M+1C框架', icon: '4a1' },
  { id: 'execution_planning', name: '执行规划 Agent', desc: '规划赛事/盟域/达人/内容/运营落地方案', icon: '680' },
  { id: 'budget_kpi', name: '预算与 KPI Agent', desc: '测算预算分配、KPI预测、时间表', icon: '4b0' },
  { id: 'action_recommendations', name: '行动建议 Agent', desc: '生成可执行的系统操作指导', icon: '3af' },
  { id: 'plan_generator', name: '方案生成 Agent', desc: '汇总上游输出为 9 章 Markdown 方案', icon: '4cb' },
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

export function PipelineTimeline({ nodes, failedNode, nodeLogs, pausedNode, onNodeClick }: PipelineTimelineProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set())

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

            return (
              <div key={agent.id} data-agent-id={agent.id} className={`pipeline-step ${sClass}`}>
                <div className={`step-dot ${dotClass(status, isPaused)} ${status === 'running' ? 'ripple' : ''}`}>
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
                    <div className="mb-3 mt-0 rounded-md border-l-[3px] border-[#1e40af] bg-blue-50/50 p-3">
                      <div className="mb-2 text-xs font-bold text-[#1e40af]">执行摘要</div>
                      <div className="text-xs leading-relaxed text-gray-600">
                        {(() => {
                          const logs = nodeLogs?.[node.id]
                          if (logs && logs.length > 0) {
                            return logs.map((msg, i) => (
                              <p key={i}>{'•'} {msg}</p>
                            ))
                          }
                          if (node.id === failedNode || node.status === 'failed') {
                            return <p>执行失败</p>
                          }
                          if (node.status === 'running') {
                            return <p>执行中...</p>
                          }
                          return <p>执行完成</p>
                        })()}
                      </div>
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
      `}</style>
    </section>
  )
}
