import { useState } from 'react'
import type { PlanNode } from '../types/plan'

interface PipelineTimelineProps {
  nodes: PlanNode[]
  failedNode: string | null
}

interface AgentMeta {
  id: string
  name: string
  desc: string
  icon: string
}

const agents: AgentMeta[] = [
  { id: 'collect', name: '需求收集 Agent', desc: '检查品牌信息完整性，识别缺失字段', icon: '\u{1F4DD}' },
  { id: 'market', name: '市场调研 Agent', desc: '收集行业趋势、竞品格局、消费洞察', icon: '\u{1F4CA}' },
  { id: 'audience', name: '人群洞察 Agent', desc: '分析目标城市运动人群画像', icon: '\u{1F465}' },
  { id: 'data', name: '数据查询 Agent', desc: '调取 AllyGo 盟域/赛事/达人/场馆/经营社数据', icon: '\u{1F50D}' },
  { id: 'fitness', name: '适配度分析 Agent', desc: '计算品牌品类 × 运动场景适配度', icon: '\u{1F3AF}' },
  { id: 'strategy', name: '策略生成 Agent', desc: '制定营销策略、核心定位、4M+1C框架', icon: '\u{1F4A1}' },
  { id: 'execution', name: '执行规划 Agent', desc: '规划赛事/盟域/达人/内容/运营落地方案', icon: '\u{1F680}' },
  { id: 'budget', name: '预算与 KPI Agent', desc: '测算预算分配、KPI预测、时间表', icon: '\u{1F4B0}' },
  { id: 'actions', name: '行动建议 Agent', desc: '生成可执行的系统操作指导', icon: '\u{1F3AF}' },
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

function dotClass(status: PlanNode['status']): string {
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

export function PipelineTimeline({ nodes, failedNode }: PipelineTimelineProps) {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set())
  const [autoContinue, setAutoContinue] = useState(false)

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
      {/* Section head */}
      <div className="mb-5 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-bold text-gray-800">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-sm text-[#1e40af]">
            {'\u{1F916}'}
          </span>
          Agent 执行流水线
        </h2>
        <label className="flex cursor-pointer items-center gap-2 text-xs text-gray-500">
          <button
            type="button"
            role="switch"
            aria-checked={autoContinue}
            onClick={() => setAutoContinue((v) => !v)}
            className={`relative inline-flex h-5 w-[38px] shrink-0 rounded-full transition-colors ${
              autoContinue ? 'bg-[#1e40af]' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 translate-y-0.5 rounded-full bg-white shadow-sm transition-transform ${
                autoContinue ? 'translate-x-[18px]' : 'translate-x-0.5'
              }`}
            />
          </button>
          <span>自动确认继续</span>
        </label>
      </div>

      {/* Pipeline */}
      <div className="relative pl-7">
        {/* Vertical line */}
        <div className="absolute bottom-0 left-[11px] top-0 w-0.5 bg-gray-200" />

        <div className="space-y-1">
          {agents.map((agent, idx) => {
            const node = nodeMap.get(agent.id)
            const status: PlanNode['status'] = node?.status ?? 'pending'
            const sClass = node ? stepClass(node, failedNode) : 'pending'
            const isExpanded = node ? expandedSteps.has(node.id) : false

            return (
              <div key={agent.id} className={`pipeline-step ${sClass}`}>
                {/* Dot on the timeline */}
                <div className={`step-dot ${dotClass(status)} ${status === 'running' ? 'ripple' : ''}`}>
                  <span className="leading-none">{agent.icon}</span>
                </div>

                {/* Body */}
                <div className="min-w-0 flex-1">
                  {/* Clickable node header */}
                  <button
                    type="button"
                    className="flex w-full items-start gap-3.5 px-0 py-3 text-left transition-colors hover:bg-gray-50 rounded-md"
                    onClick={() => node && toggleStep(node.id)}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-semibold text-gray-800">{agent.name}</div>
                        <span className={`whitespace-nowrap rounded-[10px] px-2 py-0.5 text-[11px] font-semibold ${statusBadgeClass(status)}`}>
                          {statusLabel(status)}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-gray-500">{agent.desc}</div>
                    </div>
                  </button>

                  {/* Detail panel */}
                  {node && isExpanded && (
                    <div className="mb-3 mt-0 rounded-md border-l-[3px] border-[#1e40af] bg-blue-50/50 p-3">
                      <div className="mb-2 text-xs font-bold text-[#1e40af]">执行摘要</div>
                      <div className="text-xs leading-relaxed text-gray-600">
                        {node.startedAt ? (
                          <p>开始时间: {new Date(node.startedAt).toLocaleString('zh-CN')}</p>
                        ) : null}
                        {node.completedAt ? (
                          <p>完成时间: {new Date(node.completedAt).toLocaleString('zh-CN')}</p>
                        ) : null}
                        {!node.startedAt && !node.completedAt && (
                          <p>暂无摘要信息</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  {node && status === 'waiting' && (
                    <div className="mb-3 flex gap-2">
                      <button
                        type="button"
                        className="rounded-md bg-[#1e40af] px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-800 transition-colors"
                      >
                        {'✓'} 确认继续
                      </button>
                      <button
                        type="button"
                        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        {'↻'} 重新执行
                      </button>
                    </div>
                  )}

                  {node && (status === 'complete' || status === 'completed') && (
                    <div className="mb-3 flex gap-2">
                      <button
                        type="button"
                        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                      >
                        {'↻'} 重做此步骤
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Ripple animation keyframes injected via style tag */}
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
