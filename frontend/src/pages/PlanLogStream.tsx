import { useRef, useEffect, useMemo } from 'react'
import type { PlanLogEvent } from '../types/plan'

interface PlanLogStreamProps {
  logs: PlanLogEvent[]
}

const AGENT_NAMES: Record<string, string> = {
  collect: '需求收集 Agent',
  market_research: '市场调研 Agent',
  audience_insight: '人群洞察 Agent',
  plan_data_query: '数据查询 Agent',
  fitness_analysis: '适配度分析 Agent',
  strategy_generation: '策略生成 Agent',
  execution_planning: '执行规划 Agent',
  budget_kpi: '预算与 KPI Agent',
  action_recommendations: '行动建议 Agent',
  plan_generator: '方案生成 Agent',
}

function agentLabel(nodeId: string): string {
  return AGENT_NAMES[nodeId] ?? nodeId
}

function formatLogEvent(event: PlanLogEvent): string {
  const agent = event.nodeId ? agentLabel(event.nodeId) : ''

  switch (event.event) {
    case 'node.start':
      return agent ? `${agent}：开始执行…` : '开始执行…'
    case 'node.complete':
      return agent ? `${agent}：执行完成` : '执行完成'
    case 'node.failed':
      return agent
        ? `${agent}：执行失败: ${event.message ?? '未知错误'}`
        : `执行失败: ${event.message ?? '未知错误'}`
    case 'workflow.complete':
      return '方案生成完成'
    case 'workflow.start':
      return '启动流水线'
    default:
      return agent
        ? `${agent}：${event.message ?? event.event}`
        : (event.message ?? event.event)
  }
}

export function PlanLogStream({ logs }: PlanLogStreamProps) {
  const textRef = useRef<HTMLSpanElement>(null)

  const latestMessage = useMemo(() => {
    if (logs.length === 0) return null
    const latest = logs[logs.length - 1]
    return formatLogEvent(latest)
  }, [logs])

  // Reset scroll position when a new message arrives
  useEffect(() => {
    if (textRef.current) {
      // Force a reflow reset so the CSS animation restarts from the start
      textRef.current.style.animation = 'none'
      void textRef.current.offsetHeight // trigger reflow
      textRef.current.style.animation = ''
    }
  }, [latestMessage])

  return (
    <div
      className="flex h-10 items-center overflow-hidden px-6 font-mono text-[13px]"
      style={{
        background: 'linear-gradient(90deg, #0f172a 0%, #1e293b 100%)',
        color: '#e2e8f0',
      }}
    >
      {/* Pulse dot */}
      <span
        className="mr-3 h-2 w-2 flex-shrink-0 rounded-full"
        style={{
          backgroundColor: '#22d3ee',
          animation: logs.length > 0 ? 'plan-log-pulse 1.5s infinite' : 'none',
          opacity: logs.length > 0 ? 1 : 0.4,
        }}
      />

      {/* Scrolling text */}
      <span className="flex-1 overflow-hidden whitespace-nowrap">
        {latestMessage ? (
          <span
            ref={textRef}
            className="inline-block"
            style={{
              animation: `plan-log-marquee ${Math.max(8, latestMessage.length * 0.25)}s linear infinite`,
            }}
          >
            {latestMessage}
          </span>
        ) : (
          <span className="text-slate-500">
            等待输入品牌信息，点击「生成营销方案」开始…
          </span>
        )}
      </span>

      {/* Keyframe styles injected once */}
      <style>{`
        @keyframes plan-log-pulse {
          0% { box-shadow: 0 0 0 0 rgba(34, 211, 238, 0.6); }
          70% { box-shadow: 0 0 0 8px rgba(34, 211, 238, 0); }
          100% { box-shadow: 0 0 0 0 rgba(34, 211, 238, 0); }
        }
        @keyframes plan-log-marquee {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  )
}
