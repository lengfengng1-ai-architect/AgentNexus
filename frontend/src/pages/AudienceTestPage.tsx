import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { startAudiencePlanTest, agentStatusFromEvent, type SSEEvent } from '../api/audience'
import { PARALLEL_AGENTS, type AgentState, type AudienceState } from '../types/audience'

// ── Reducer ──

type Action =
  | { type: 'SET_PRODUCT_NAME'; value: string }
  | { type: 'RESET' }
  | { type: 'SET_RUNNING' }
  | { type: 'AGENT_START'; nodeId: string }
  | { type: 'AGENT_LOG'; nodeId: string; message: string }
  | { type: 'AGENT_COMPLETE'; nodeId: string; data?: Record<string, unknown> }
  | { type: 'AGENT_FAILED'; nodeId: string; error: string }
  | { type: 'SET_PERSONA'; data: Record<string, unknown> }
  | { type: 'WORKFLOW_COMPLETE' }
  | { type: 'SET_ERROR'; error: string }

function buildInitialAgents(): AgentState[] {
  return PARALLEL_AGENTS.map((m) => ({ id: m.id, name: m.name, icon: m.icon, status: 'pending', logs: [] }))
}

function reducer(state: AudienceState, action: Action): AudienceState {
  switch (action.type) {
    case 'SET_PRODUCT_NAME':
      return { ...state, productName: action.value }

    case 'RESET':
      return { productName: state.productName, status: 'idle', agents: buildInitialAgents(), personaData: null, error: null }

    case 'SET_RUNNING':
      return { ...state, status: 'running', error: null }

    case 'AGENT_START':
      return {
        ...state,
        agents: state.agents.map((a) => (a.id === action.nodeId ? { ...a, status: 'running' as const, logs: [] } : a)),
      }

    case 'AGENT_LOG':
      return {
        ...state,
        agents: state.agents.map((a) =>
          a.id === action.nodeId ? { ...a, logs: [...a.logs, action.message] } : a,
        ),
      }

    case 'AGENT_COMPLETE':
      return {
        ...state,
        agents: state.agents.map((a) => (a.id === action.nodeId ? { ...a, status: 'complete' as const, data: action.data } : a)),
      }

    case 'AGENT_FAILED':
      return {
        ...state,
        status: 'error',
        agents: state.agents.map((a) => (a.id === action.nodeId ? { ...a, status: 'failed' as const, error: action.error } : a)),
        error: action.error,
      }

    case 'SET_PERSONA':
      return { ...state, personaData: action.data }

    case 'WORKFLOW_COMPLETE':
      return { ...state, status: 'done' }

    case 'SET_ERROR':
      return { ...state, status: 'error', error: action.error }

    default:
      return state
  }
}

// ── Agent Card ──

function AgentCard({ agent, expanded, onToggle }: {
  agent: AgentState
  expanded: boolean
  onToggle: () => void
}) {
  const statusLabel: Record<string, string> = { pending: '待执行', running: '执行中', complete: '已完成', failed: '失败' }
  const statusColors: Record<string, string> = {
    pending: 'border-gray-200 bg-white',
    running: 'border-blue-400 bg-blue-50',
    complete: 'border-emerald-400 bg-emerald-50',
    failed: 'border-red-400 bg-red-50',
  }
  const dotColors: Record<string, string> = {
    pending: 'bg-gray-300',
    running: 'bg-blue-500 animate-pulse',
    complete: 'bg-emerald-500',
    failed: 'bg-red-500',
  }

  return (
    <div className={`rounded-xl border-2 ${statusColors[agent.status]} p-4 transition-colors`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{agent.icon}</span>
          <span className="font-semibold text-sm text-gray-800">{agent.name}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${dotColors[agent.status]}`} />
          <span className="text-xs font-medium text-gray-500">{statusLabel[agent.status]}</span>
        </div>
      </div>

      {/* Expand log toggle — always show when there's content */}
      {(agent.logs.length > 0 || agent.data || agent.status === 'complete' || agent.status === 'failed') && (
        <button
          type="button"
          onClick={onToggle}
          className="mt-2 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          <span className={`inline-block transition-transform ${expanded ? 'rotate-90' : ''}`}>▶</span>
          {agent.status === 'running' ? '执行日志' : agent.status === 'complete' ? '查看结果' : '思维链'}
          {agent.logs.length > 0 && `（${agent.logs.length}）`}
        </button>
      )}

      {/* Expanded content */}
      {expanded && (
        <div className="mt-2 space-y-2">
          {/* Logs */}
          {agent.logs.length > 0 && (
            <div className="max-h-32 overflow-y-auto rounded-lg bg-white/70 p-2 text-xs space-y-1">
              {agent.logs.map((msg, i) => (
                <div key={i} className="flex gap-2 text-gray-600">
                  <span className="text-gray-300 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                  <span>{msg}</span>
                </div>
              ))}
              {agent.status === 'running' && (
                <div className="flex gap-2 text-blue-500">
                  <span className="text-blue-300 shrink-0">{String(agent.logs.length + 1).padStart(2, '0')}</span>
                  <span className="animate-pulse">执行中…</span>
                </div>
              )}
            </div>
          )}

          {/* Data summary */}
          {agent.data && (
            <div className="rounded-lg border border-gray-200 bg-white p-2">
              <div className="mb-1 text-xs font-semibold text-gray-500">执行结果摘要</div>
              <pre className="max-h-40 overflow-y-auto text-xs text-gray-600 font-mono leading-relaxed whitespace-pre-wrap">
                {(() => {
                  const d = agent.data as Record<string, unknown>
                  // Pick short fields, skip long ones
                  const keys = Object.keys(d).filter(k => k !== 'sources' && k !== 'fetched_pages')
                  const lines: string[] = []
                  for (const k of keys.slice(0, 5)) {
                    const v = d[k]
                    if (typeof v === 'string') lines.push(`${k}: ${v.slice(0, 120)}${v.length > 120 ? '…' : ''}`)
                    else if (Array.isArray(v)) lines.push(`${k}: [${v.length} items]`)
                    else if (typeof v === 'object' && v) lines.push(`${k}: {...}`)
                    else lines.push(`${k}: ${String(v)}`)
                  }
                  return lines.join('\n') || '（无结构化摘要）'
                })()}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {agent.status === 'failed' && agent.error && (
        <div className="mt-2 rounded-lg bg-red-100 p-2 text-xs text-red-700">{agent.error}</div>
      )}
    </div>
  )
}

// ── Persona Display ──

function PersonaDisplay({ data }: { data: Record<string, unknown> }) {
  const persona = ((data.audience_insight || data) as Record<string, unknown>).persona as Record<string, unknown> || {}
  const sections: { key: string; label: string; icon: string }[] = [
    { key: 'demographics', label: '人口画像', icon: '👤' },
    { key: 'purchase_motivation', label: '购买动机', icon: '💡' },
    { key: 'product_usage', label: '产品使用', icon: '📱' },
    { key: 'lifestyle', label: '生活方式', icon: '🏃' },
    { key: 'product_fit', label: '产品关联度', icon: '🎯' },
  ]

  function renderValue(value: unknown): React.ReactNode {
    if (value === null || value === undefined) return <span className="text-gray-300">-</span>
    if (typeof value === 'string') return value
    if (Array.isArray(value)) {
      return (
        <ul className="list-disc pl-4 space-y-0.5">
          {value.map((item, i) => (
            <li key={i}>{typeof item === 'object' ? (item as Record<string, unknown>).text as string || JSON.stringify(item) : String(item)}</li>
          ))}
        </ul>
      )
    }
    if (typeof value === 'object') {
      if ((value as Record<string, unknown>).value) return String((value as Record<string, unknown>).value)
      return JSON.stringify(value, null, 2)
    }
    return String(value)
  }

  return (
    <div className="rounded-xl border-2 border-purple-200 bg-white p-5">
      <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-gray-800">
        <span>👤</span>
        用户画像
      </h3>

      {persona.profile_summary && (
        <div className="mb-4 rounded-lg bg-purple-50 p-3 text-sm text-gray-700">
          {(persona.profile_summary as Record<string, unknown>).value as string ||
           (persona.profile_summary as Record<string, unknown>).quote as string ||
           '画像已生成'}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map((s) => {
          const val = persona[s.key]
          if (!val || (typeof val === 'object' && Object.keys(val as Record<string, unknown>).length === 0)) {
            return null
          }
          return (
            <div key={s.key} className="rounded-lg border border-purple-100 bg-purple-50/50 p-3">
              <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-purple-700">
                <span>{s.icon}</span>
                {s.label}
              </div>
              <pre className="whitespace-pre-wrap text-xs text-gray-600 font-mono leading-relaxed">{renderValue(val)}</pre>
            </div>
          )
        })}
      </div>

      <details className="mt-3">
        <summary className="cursor-pointer text-xs text-gray-400 hover:text-gray-600">查看原始数据</summary>
        <pre className="mt-2 max-h-60 overflow-y-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-500 font-mono">
          {JSON.stringify(data, null, 2)}
        </pre>
      </details>
    </div>
  )
}

// ── Main Component ──

const initialState: AudienceState = {
  productName: '',
  status: 'idle',
  agents: buildInitialAgents(),
  personaData: null,
  error: null,
}

export function AudienceTestPage() {
  const [state, dispatch] = useReducer(reducer, initialState)
  const abortRef = useRef<AbortController | null>(null)
  const [expandedAgents, setExpandedAgents] = useState(new Set<string>())

  useEffect(() => {
    return () => { abortRef.current?.abort() }
  }, [])

  const toggleAgent = (id: string) => {
    setExpandedAgents((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const processEvent = useCallback((event: SSEEvent) => {
    const e = event.event
    if (!e || !event.nodeId) return

    const status = agentStatusFromEvent(e)
    if (status) {
      if (status === 'running') {
        dispatch({ type: 'AGENT_START', nodeId: event.nodeId })
      } else if (status === 'complete') {
        dispatch({ type: 'AGENT_COMPLETE', nodeId: event.nodeId, data: event.data })
        // Check if this was the audience_insight node (persona completed)
        if (event.nodeId === 'audience_insight') {
          dispatch({ type: 'SET_PERSONA', data: event.data || {} })
        }
      } else if (status === 'failed') {
        dispatch({ type: 'AGENT_FAILED', nodeId: event.nodeId, error: event.error || '节点失败' })
      }
    } else if (e === 'node.log' && event.message) {
      dispatch({ type: 'AGENT_LOG', nodeId: event.nodeId, message: event.message })
    } else if (e === 'workflow.complete') {
      dispatch({ type: 'WORKFLOW_COMPLETE' })
      // Extract persona from outputs if available
      const outputs = event.data?.outputs as Record<string, unknown> | undefined
      if (outputs?.audience_insight) {
        dispatch({ type: 'SET_PERSONA', data: outputs.audience_insight as Record<string, unknown> })
      }
    }
  }, [])

  const handleStart = useCallback(async () => {
    abortRef.current?.abort()
    dispatch({ type: 'RESET' })

    const controller = new AbortController()
    abortRef.current = controller
    dispatch({ type: 'SET_RUNNING' })

    try {
      const stream = await startAudiencePlanTest(
        { brand_name: state.productName, category: '运动', city: null, budget: null, period: null },
        controller.signal,
      )
      for await (const event of stream) {
        processEvent(event)
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      dispatch({ type: 'SET_ERROR', error: err instanceof Error ? err.message : '请求失败' })
    }
  }, [state.productName, processEvent])

  const isRunning = state.status === 'running'

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto w-full max-w-5xl">
          {/* Input */}
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <label htmlFor="audience-input" className="mb-1.5 block text-sm font-medium text-gray-700">产品名称</label>
              <input
                id="audience-input"
                type="text"
                value={state.productName}
                onChange={(e) => dispatch({ type: 'SET_PRODUCT_NAME', value: e.target.value })}
                disabled={isRunning}
                placeholder="例如：Nike Alphafly 3"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none placeholder:text-gray-300 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 disabled:bg-gray-50"
              />
            </div>
            <button
              type="button"
              onClick={handleStart}
              disabled={isRunning || !state.productName.trim()}
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
            >
              {isRunning ? '执行中…' : '开始测试'}
            </button>
          </div>

          {/* Error */}
          {state.status === 'error' && state.error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{state.error}</div>
          )}

          {/* Three agent columns */}
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {state.agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} expanded={expandedAgents.has(agent.id)} onToggle={() => toggleAgent(agent.id)} />
            ))}
          </div>

          {/* Persona */}
          {state.personaData && (
            <div className="mt-6"><PersonaDisplay data={state.personaData} /></div>
          )}

          {/* Empty state */}
          {state.status === 'idle' && (
            <div className="mt-16 text-center text-sm text-gray-400">
              <div className="mb-2 text-4xl">🧪</div>
              <p>输入产品名称并点击"开始测试"</p>
              <p className="mt-1 text-xs">三个调研 Agent 将并行执行，最终生成用户画像</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
