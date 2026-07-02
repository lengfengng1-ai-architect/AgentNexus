import { useCallback, useEffect, useReducer, useRef } from 'react'
import { controlPlanRun, getPlanRunStatus, resumePlanRun, startPlanRun } from '../api/plan'
import type { PlanLogEvent, PlanNode, PlanNodeStatus, PlanOutputs, WorkflowControlAction } from '../types/plan'

const PIPELINE_NODES: { id: string; label: string }[] = [
  { id: 'market_research', label: '市场研究' },
  { id: 'audience_insight', label: '人群洞察' },
  { id: 'plan_data_query', label: '平台资源' },
  { id: 'fitness_analysis', label: '适配度分析' },
  { id: 'strategy_generation', label: '策略生成' },
  { id: 'execution_planning', label: '执行规划' },
  { id: 'budget_kpi', label: '预算 KPI' },
  { id: 'action_recommendations', label: '行动建议' },
  { id: 'plan_generator', label: '方案生成' },
]

interface SSEState {
  runId: string | null
  status: 'idle' | 'running' | 'failed' | 'completed'
  nodes: PlanNode[]
  logs: PlanLogEvent[]
  outputs: PlanOutputs
  failedNode: string | null
  error: string | null
  isConnected: boolean
  lastEventId: number | null
}

type SSEAction =
  | { type: 'RESET' }
  | { type: 'SET_RUN_ID'; runId: string }
  | { type: 'SET_CONNECTED'; connected: boolean }
  | { type: 'APPEND_LOG'; event: PlanLogEvent }
  | { type: 'NODE_START'; nodeId: string }
  | { type: 'NODE_COMPLETE'; nodeId: string; data?: Record<string, unknown> }
  | { type: 'NODE_FAILED'; nodeId: string; message: string }
  | { type: 'NODE_WAITING'; nodeId: string }
  | { type: 'WORKFLOW_COMPLETE'; outputs: PlanOutputs }
  | { type: 'WORKFLOW_FAILED'; message: string }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'SET_FAILED_NODE'; nodeId: string | null }
  | { type: 'RESTORE_STATUS'; status: SSEState }

function buildInitialNodes(): PlanNode[] {
  return PIPELINE_NODES.map((node) => ({
    ...node,
    status: 'pending',
  }))
}

function sseReducer(state: SSEState, action: SSEAction): SSEState {
  switch (action.type) {
    case 'RESET':
      return {
        runId: null,
        status: 'idle',
        nodes: buildInitialNodes(),
        logs: [],
        outputs: {},
        failedNode: null,
        error: null,
        isConnected: false,
        lastEventId: null,
      }
    case 'SET_RUN_ID':
      return { ...state, runId: action.runId }
    case 'SET_CONNECTED':
      return { ...state, isConnected: action.connected }
    case 'APPEND_LOG':
      return { ...state, logs: [...state.logs, action.event], lastEventId: action.event.id }
    case 'NODE_START':
      return {
        ...state,
        nodes: state.nodes.map((n) =>
          n.id === action.nodeId ? { ...n, status: 'running', startedAt: Date.now() } : n,
        ),
      }
    case 'NODE_COMPLETE': {
      const nextOutputs = action.data ? { ...state.outputs, [action.nodeId]: action.data } : state.outputs
      return {
        ...state,
        nodes: state.nodes.map((n) =>
          n.id === action.nodeId ? { ...n, status: 'complete', completedAt: Date.now() } : n,
        ),
        outputs: nextOutputs,
      }
    }
    case 'NODE_FAILED':
      return {
        ...state,
        nodes: state.nodes.map((n) => (n.id === action.nodeId ? { ...n, status: 'failed' } : n)),
        failedNode: action.nodeId,
        error: action.message,
      }
    case 'NODE_WAITING':
      return {
        ...state,
        nodes: state.nodes.map((n) => (n.id === action.nodeId ? { ...n, status: 'waiting' } : n)),
      }
    case 'WORKFLOW_COMPLETE':
      return { ...state, status: 'completed', outputs: action.outputs, isConnected: false }
    case 'WORKFLOW_FAILED':
      return { ...state, status: 'failed', error: action.message, isConnected: false }
    case 'SET_ERROR':
      return { ...state, error: action.error, isConnected: false }
    case 'SET_FAILED_NODE':
      return { ...state, failedNode: action.nodeId }
    case 'RESTORE_STATUS':
      return action.status
    default:
      return state
  }
}

function parseSSEEvent(line: string): Partial<PlanLogEvent> | null {
  const trimmed = line.trim()
  if (!trimmed || !trimmed.includes(':')) return null
  const [key, ...rest] = trimmed.split(':')
  const value = rest.join(':').trim()
  if (key === 'id') return { id: Number(value) }
  if (key === 'event') return { event: value }
  if (key === 'data') {
    try {
      const parsed = JSON.parse(value) as Record<string, unknown>
      return {
        runId: parsed.run_id as string,
        nodeId: (parsed.node_id as string) || undefined,
        event: parsed.event as string,
        data: (parsed.data as Record<string, unknown>) || undefined,
        message: (parsed.message as string) || undefined,
      }
    } catch {
      return { message: value }
    }
  }
  return null
}

async function* readSSEStream(stream: ReadableStream<Uint8Array>): AsyncGenerator<PlanLogEvent> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let current: Partial<PlanLogEvent> = {}

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (line.trim() === '') {
          if (current.event && current.runId) {
            yield current as PlanLogEvent
          }
          current = {}
          continue
        }
        const parsed = parseSSEEvent(line)
        if (parsed?.id !== undefined) current.id = parsed.id
        if (parsed?.event !== undefined) current.event = parsed.event
        if (parsed?.runId !== undefined) current.runId = parsed.runId
        if (parsed?.nodeId !== undefined) current.nodeId = parsed.nodeId
        if (parsed?.data !== undefined) current.data = parsed.data
        if (parsed?.message !== undefined) current.message = parsed.message
      }
    }

    if (buffer.trim()) {
      const parsed = parseSSEEvent(buffer)
      if (parsed) Object.assign(current, parsed)
    }
    if (current.event && current.runId) {
      yield current as PlanLogEvent
    }
  } finally {
    reader.releaseLock()
  }
}

export function useWorkflowSSE() {
  const [state, dispatch] = useReducer(sseReducer, {
    runId: null,
    status: 'idle',
    nodes: buildInitialNodes(),
    logs: [],
    outputs: {},
    failedNode: null,
    error: null,
    isConnected: false,
    lastEventId: null,
  })

  const abortRef = useRef<(() => void) | null>(null)
  const runIdRef = useRef<string | null>(null)

  useEffect(() => {
    runIdRef.current = state.runId
  }, [state.runId])

  useEffect(() => {
    return () => {
      abortRef.current?.()
    }
  }, [])

  const processEvent = useCallback((event: PlanLogEvent) => {
    dispatch({ type: 'APPEND_LOG', event })

    switch (event.event) {
      case 'workflow.start':
        dispatch({ type: 'SET_CONNECTED', connected: true })
        break
      case 'node.start':
        if (event.nodeId) dispatch({ type: 'NODE_START', nodeId: event.nodeId })
        break
      case 'node.complete':
        if (event.nodeId) {
          dispatch({
            type: 'NODE_COMPLETE',
            nodeId: event.nodeId,
            data: event.data as Record<string, unknown>,
          })
        }
        break
      case 'node.failed':
        if (event.nodeId) dispatch({ type: 'NODE_FAILED', nodeId: event.nodeId, message: event.message || '节点失败' })
        break
      case 'node.waiting':
        if (event.nodeId) dispatch({ type: 'NODE_WAITING', nodeId: event.nodeId })
        break
      case 'workflow.complete':
        dispatch({ type: 'SET_CONNECTED', connected: false })
        break
      case 'workflow.failed':
        dispatch({ type: 'WORKFLOW_FAILED', message: event.message || '工作流失败' })
        break
    }
  }, [])

  const consumeStream = useCallback(
    async (stream: ReadableStream<Uint8Array>, expectedRunId: string) => {
      try {
        for await (const event of readSSEStream(stream)) {
          if (event.runId && event.runId !== expectedRunId && expectedRunId !== 'unknown') {
            continue
          }
          processEvent(event)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : 'SSE 连接异常'
        dispatch({ type: 'SET_ERROR', error: message })
      } finally {
        dispatch({ type: 'SET_CONNECTED', connected: false })
      }
    },
    [processEvent],
  )

  const start = useCallback(
    async (brandInput: Record<string, unknown>) => {
      abortRef.current?.()
      dispatch({ type: 'RESET' })

      try {
        const { runId, stream } = await startPlanRun(brandInput)
        dispatch({ type: 'SET_RUN_ID', runId })
        dispatch({ type: 'SET_CONNECTED', connected: true })
        await consumeStream(stream, runId)
      } catch (error) {
        const message = error instanceof Error ? error.message : '启动失败'
        dispatch({ type: 'SET_ERROR', error: message })
      }
    },
    [consumeStream],
  )

  const reconnect = useCallback(async () => {
    if (!state.runId || state.lastEventId === null || state.status !== 'running') return
    try {
      const stream = await resumePlanRun(state.runId, state.lastEventId)
      dispatch({ type: 'SET_CONNECTED', connected: true })
      await consumeStream(stream, state.runId)
    } catch (error) {
      const message = error instanceof Error ? error.message : '重连失败'
      dispatch({ type: 'SET_ERROR', error: message })
    }
  }, [state.runId, state.lastEventId, state.status, consumeStream])

  const control = useCallback(
    async (action: WorkflowControlAction, nodeId?: string) => {
      if (!state.runId) return
      try {
        const result = await controlPlanRun(state.runId, action, nodeId)
        dispatch({ type: 'SET_FAILED_NODE', nodeId: result.failed_node })
        if (result.status === 'running') {
          dispatch({ type: 'SET_CONNECTED', connected: true })
          const stream = await resumePlanRun(state.runId, state.lastEventId ?? -1)
          await consumeStream(stream, state.runId)
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : '控制失败'
        dispatch({ type: 'SET_ERROR', error: message })
      }
    },
    [state.runId, state.lastEventId, consumeStream],
  )

  const reset = useCallback(() => {
    abortRef.current?.()
    dispatch({ type: 'RESET' })
  }, [])

  const refreshStatus = useCallback(async () => {
    if (!state.runId) return
    try {
      const result = await getPlanRunStatus(state.runId)
      if (result.status === 'completed') {
        dispatch({ type: 'WORKFLOW_COMPLETE', outputs: result.outputs as PlanOutputs })
      } else if (result.status === 'failed') {
        dispatch({
          type: 'NODE_FAILED',
          nodeId: result.failed_node || 'unknown',
          message: result.error || '工作流失败',
        })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '查询状态失败'
      dispatch({ type: 'SET_ERROR', error: message })
    }
  }, [state.runId])

  return {
    ...state,
    start,
    reconnect,
    control,
    reset,
    refreshStatus,
  }
}

export { PIPELINE_NODES }
export type { PlanNodeStatus }
