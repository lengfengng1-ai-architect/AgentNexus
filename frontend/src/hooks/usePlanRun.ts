import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react'
import {
  approvePlanRun,
  cancelPlanRun,
  getPlanRunStatus,
  rejectPlanRun,
  rerunPlanRun,
  startPlanRun,
} from '../api/plan'
import type { PlanChapter, PlanLogEvent, PlanNode, PlanNodeStatus, PlanOutputs } from '../types/plan'

const PIPELINE_NODES: { id: string; label: string }[] = [
  { id: 'product_research', label: '产品调研' },
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

export type PlanRunStatus = 'idle' | 'running' | 'paused' | 'failed' | 'completed'

interface PlanRunState {
  runId: string | null
  status: PlanRunStatus
  nodes: PlanNode[]
  logs: PlanLogEvent[]
  outputs: PlanOutputs
  failedNode: string | null
  error: string | null
  isConnected: boolean
  isLoading: boolean
  pausedNode: string | null
  pausedSnapshot: {
    node_id: string
    node_input: Record<string, unknown>
    upstream_outputs: Record<string, unknown>
  } | null
  chapters: PlanChapter[]
}

type PlanRunAction =
  | { type: 'RESET' }
  | { type: 'SET_RUN_ID'; runId: string }
  | { type: 'SET_CONNECTED'; connected: boolean }
  | { type: 'APPEND_LOG'; event: PlanLogEvent }
  | { type: 'NODE_START'; nodeId: string }
  | { type: 'NODE_COMPLETE'; nodeId: string; data?: Record<string, unknown> }
  | { type: 'NODE_FAILED'; nodeId: string; message: string }
  | { type: 'WORKFLOW_PAUSED'; snapshot: PlanRunState['pausedSnapshot'] }
  | { type: 'WORKFLOW_COMPLETE'; outputs: PlanOutputs }
  | { type: 'WORKFLOW_CANCELED' }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'CHAPTER_START'; index: number; title: string; subtitle: string }
  | { type: 'CHAPTER_COMPLETE'; chapter: PlanChapter }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'RESTORE_STATUS'; status: PlanRunStatus; outputs: PlanOutputs; failedNode: string | null; error: string | null; completedNodes: string[]; pausedNode: string | null; pausedSnapshot: PlanRunState['pausedSnapshot'] }
  | { type: 'SYNC_NODE_STATUSES'; nodeStatuses: { node_id: string; status: string; started_at?: string; completed_at?: string }[] }

function buildInitialNodes(): PlanNode[] {
  return PIPELINE_NODES.map((node) => ({
    ...node,
    status: 'pending',
  }))
}

function planRunReducer(state: PlanRunState, action: PlanRunAction): PlanRunState {
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
        isLoading: false,
        pausedNode: null,
        pausedSnapshot: null,
        chapters: [],
      }
    case 'SET_RUN_ID':
      return { ...state, runId: action.runId }
    case 'SET_CONNECTED':
      return { ...state, isConnected: action.connected }
    case 'SET_LOADING':
      return { ...state, isLoading: action.loading }
    case 'APPEND_LOG':
      return { ...state, logs: [...state.logs, action.event] }
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
        status: 'failed',
        isConnected: false,
      }
    case 'WORKFLOW_PAUSED':
      return {
        ...state,
        status: 'paused',
        isConnected: false,
        isLoading: false,
        pausedNode: action.snapshot?.node_id ?? null,
        pausedSnapshot: action.snapshot,
        nodes: state.nodes.map((n) =>
          n.id === action.snapshot?.node_id ? { ...n, status: 'waiting' as const } : n
        ),
      }
    case 'WORKFLOW_COMPLETE':
      // 方案完成时清理暂停态,避免 plan_generator 残留「等待确认」徽章/按钮
      return {
        ...state,
        status: 'completed',
        outputs: action.outputs,
        isConnected: false,
        isLoading: false,
        pausedNode: null,
        pausedSnapshot: null,
      }
    case 'WORKFLOW_CANCELED':
      return { ...state, status: 'idle', runId: null, isConnected: false, isLoading: false, pausedNode: null, pausedSnapshot: null }
    case 'SET_ERROR':
      return { ...state, error: action.error, isConnected: false, isLoading: false }
    case 'CHAPTER_START':
      return {
        ...state,
        chapters: [
          ...state.chapters,
          { title: action.title, subtitle: action.subtitle, content: '' },
        ],
      }
    case 'CHAPTER_COMPLETE': {
      const nextChapters = [...state.chapters]
      const index = nextChapters.findIndex(
        (c) => c.title === action.chapter.title && c.subtitle === action.chapter.subtitle,
      )
      if (index >= 0) {
        nextChapters[index] = action.chapter
      } else {
        nextChapters.push(action.chapter)
      }
      return { ...state, chapters: nextChapters }
    }
    case 'SET_LOADING':
      return { ...state, isLoading: action.loading }
    case 'RESTORE_STATUS': {
      const nextNodes = buildInitialNodes()
      for (const nid of action.completedNodes) {
        const idx = nextNodes.findIndex(n => n.id === nid)
        if (idx >= 0) nextNodes[idx] = { ...nextNodes[idx], status: 'complete' }
      }
      if (action.failedNode) {
        const idx = nextNodes.findIndex(n => n.id === action.failedNode)
        if (idx >= 0) nextNodes[idx] = { ...nextNodes[idx], status: 'failed' }
      }
      if (action.pausedNode) {
        const idx = nextNodes.findIndex(n => n.id === action.pausedNode)
        if (idx >= 0) nextNodes[idx] = { ...nextNodes[idx], status: 'waiting' }
      }
      // 如果 outputs 中有 node_statuses,用它覆盖节点状态(更精准)
      const ns = (action.outputs?.node_statuses || []) as { node_id: string; status: string }[]
      for (const n of ns) {
        const idx = nextNodes.findIndex(x => x.id === n.node_id)
        if (idx >= 0) {
          const map: Record<string, PlanNodeStatus> = { running: 'running', complete: 'complete', failed: 'failed', pending: 'pending' }
          nextNodes[idx] = { ...nextNodes[idx], status: map[n.status] || 'pending' }
        }
      }
      return {
        ...state,
        status: action.status,
        runId: state.runId,
        outputs: action.outputs,
        nodes: nextNodes,
        failedNode: action.failedNode,
        error: action.error,
        pausedNode: action.pausedNode,
        pausedSnapshot: action.pausedSnapshot,
        isConnected: false,
        isLoading: false,
      }
    }
    case 'SYNC_NODE_STATUSES': {
      const ns = action.nodeStatuses
      return {
        ...state,
        nodes: state.nodes.map(n => {
          const found = ns.find(x => x.node_id === n.id)
          if (!found) return n
          const map: Record<string, PlanNodeStatus> = { running: 'running', complete: 'complete', failed: 'failed', pending: 'pending' }
          const newStatus = map[found.status]
          if (!newStatus || newStatus === n.status) return n
          return { ...n, status: newStatus, startedAt: found.started_at ? Date.now() : n.startedAt, completedAt: found.completed_at ? Date.now() : n.completedAt }
        }),
      }
    }
    default:
      return state
  }
}

function parseSSELine(line: string): Partial<PlanLogEvent> | null {
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
        runId: (parsed.run_id as string) || '',
        nodeId: (parsed.node_id as string) || undefined,
        data: parsed,
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
          if (current.event) {
            yield current as PlanLogEvent
          }
          current = {}
          continue
        }
        const parsed = parseSSELine(line)
        if (parsed?.id !== undefined) current.id = parsed.id
        if (parsed?.event !== undefined) current.event = parsed.event
        if (parsed?.runId !== undefined) current.runId = parsed.runId
        if (parsed?.nodeId !== undefined) current.nodeId = parsed.nodeId
        if (parsed?.data !== undefined) current.data = parsed.data
        if (parsed?.message !== undefined) current.message = parsed.message
      }
    }

    if (buffer.trim()) {
      const parsed = parseSSELine(buffer)
      if (parsed) Object.assign(current, parsed)
    }
    if (current.event) {
      yield current as PlanLogEvent
    }
  } finally {
    reader.releaseLock()
  }
}

export function usePlanRun() {
  const [state, dispatch] = useReducer(planRunReducer, {
    runId: null,
    status: 'idle',
    nodes: buildInitialNodes(),
    logs: [],
    outputs: {},
    failedNode: null,
    error: null,
    isConnected: false,
    isLoading: false,
    pausedNode: null,
    pausedSnapshot: null,
    chapters: [],
  })

  const abortRef = useRef<(() => void) | null>(null)
  const runIdRef = useRef<string | null>(null)
  const statusRef = useRef<PlanRunStatus>('idle')

  useEffect(() => {
    runIdRef.current = state.runId
  }, [state.runId])

  useEffect(() => {
    statusRef.current = state.status
  }, [state.status])

  useEffect(() => {
    const abort = abortRef.current
    return () => {
      abort?.()
    }
  }, [])

  const processEvent = useCallback((event: PlanLogEvent) => {
    dispatch({ type: 'APPEND_LOG', event })

    try {
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
              data: (event.data?.output || event.data) as Record<string, unknown> | undefined,
            })
          }
          break
        case 'node.failed':
          if (event.nodeId) dispatch({ type: 'NODE_FAILED', nodeId: event.nodeId, message: event.message || '节点失败' })
          break
        case 'workflow.paused':
          dispatch({
            type: 'WORKFLOW_PAUSED',
            snapshot: event.data?.snapshot as PlanRunState['pausedSnapshot'],
          })
          break
        case 'workflow.complete': {
          const eventOutputs = (event.data?.output || event.data) as Record<string, unknown>
          dispatch({ type: 'WORKFLOW_COMPLETE', outputs: eventOutputs as PlanOutputs })
          break
        }
        case 'chapter.start': {
          const data = event.data ?? {}
          dispatch({
            type: 'CHAPTER_START',
            index: Number(data.index ?? 0),
            title: String(data.title ?? ''),
            subtitle: String(data.subtitle ?? ''),
          })
          break
        }
        case 'chapter.complete': {
          const data = event.data ?? {}
          dispatch({
            type: 'CHAPTER_COMPLETE',
            chapter: {
              title: String(data.title ?? ''),
              subtitle: String(data.subtitle ?? ''),
              content: String(data.content ?? ''),
            },
          })
          break
        }
        default:
          break
      }
    } catch (err) {
      // 单条 event dispatch 异常不能让整流中断，否则 PlanPage 卸载 → 白屏
      console.error('processEvent error:', err, event)
      dispatch({
        type: 'SET_ERROR',
        error: err instanceof Error ? err.message : '事件处理异常',
      })
    }
  }, [])

  const consumeStream = useCallback(
    async (stream: ReadableStream<Uint8Array>) => {
      try {
        for await (const event of readSSEStream(stream)) {
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
      try { localStorage.removeItem('allygo_plan_run_id') } catch { /* ignore */ }

      try {
        const { runId, stream } = await startPlanRun(brandInput)
        try { localStorage.setItem('allygo_plan_run_id', runId) } catch { /* ignore */ }
        dispatch({ type: 'SET_RUN_ID', runId })
        dispatch({ type: 'SET_CONNECTED', connected: true })
        // 并行启动三个 agent：产品调研、市场调研、人群洞察
        dispatch({ type: 'NODE_START', nodeId: PIPELINE_NODES[0].id })
        dispatch({ type: 'NODE_START', nodeId: PIPELINE_NODES[1].id })
        dispatch({ type: 'NODE_START', nodeId: PIPELINE_NODES[2].id })
        await consumeStream(stream)
      } catch (error) {
        const message = error instanceof Error ? error.message : '启动失败'
        dispatch({ type: 'SET_ERROR', error: message })
      }
    },
    [consumeStream],
  )

  const approve = useCallback(
    async (editedInput?: Record<string, unknown>) => {
      const rid = runIdRef.current
      if (!rid) return
      // 立即将暂停中的节点标记为 running，不等 SSE 响应
      dispatch({ type: 'SET_LOADING', loading: true })
      if (statusRef.current === 'paused') {
        dispatch({ type: 'SET_CONNECTED', connected: true })
        const pn = state.pausedNode
        if (pn) dispatch({ type: 'NODE_START', nodeId: pn })
      }
      try {
        if (statusRef.current !== 'paused') {
          const result = await getPlanRunStatus(rid)
          if (result.status !== 'paused') {
            dispatch({ type: 'SET_LOADING', loading: false })
            return
          }
        }
        const stream = await approvePlanRun(rid, editedInput ? { edited_input: editedInput } : undefined)
        dispatch({ type: 'SET_CONNECTED', connected: true })
        await consumeStream(stream)
      } catch (error) {
        const message = error instanceof Error ? error.message : '审批通过失败'
        dispatch({ type: 'SET_ERROR', error: message })
      } finally {
        dispatch({ type: 'SET_LOADING', loading: false })
      }
    },
    [consumeStream, state.pausedNode],
  )

  const reject = useCallback(
    async (reason: string) => {
      const rid = runIdRef.current
      if (!rid) return
      dispatch({ type: 'SET_LOADING', loading: true })
      try {
        if (statusRef.current !== 'paused') {
          const result = await getPlanRunStatus(rid)
          if (result.status !== 'paused') {
            dispatch({ type: 'SET_LOADING', loading: false })
            return
          }
        }
        const stream = await rejectPlanRun(rid, { reason })
        dispatch({ type: 'SET_CONNECTED', connected: true })
        await consumeStream(stream)
      } catch (error) {
        const message = error instanceof Error ? error.message : '驳回失败'
        dispatch({ type: 'SET_ERROR', error: message })
      } finally {
        dispatch({ type: 'SET_LOADING', loading: false })
      }
    },
    [consumeStream],
  )

  const cancel = useCallback(async () => {
    if (!state.runId) return
    try {
      await cancelPlanRun(state.runId)
      try { localStorage.removeItem('allygo_plan_run_id') } catch { /* ignore */ }
      dispatch({ type: 'WORKFLOW_CANCELED' })
    } catch (error) {
      const message = error instanceof Error ? error.message : '取消失败'
      dispatch({ type: 'SET_ERROR', error: message })
    }
  }, [state.runId])

  const rerun = useCallback(async () => {
    const rid = runIdRef.current
    if (!rid) return
    dispatch({ type: 'SET_LOADING', loading: true })
    try {
      const stream = await rerunPlanRun(rid)
      dispatch({ type: 'SET_CONNECTED', connected: true })
      await consumeStream(stream)
    } catch (error) {
      const message = error instanceof Error ? error.message : '重新执行失败'
      dispatch({ type: 'SET_ERROR', error: message })
    } finally {
      dispatch({ type: 'SET_LOADING', loading: false })
    }
  }, [consumeStream])

  const reset = useCallback(() => {
    abortRef.current?.()
    dispatch({ type: 'RESET' })
  }, [])

  const refreshStatus = useCallback(async () => {
    if (!state.runId) return
    try {
      const result = await getPlanRunStatus(state.runId)
      const ns = (result.outputs?.node_statuses || []) as { node_id: string; status: string }[]
      if (result.status === 'completed') {
        dispatch({ type: 'WORKFLOW_COMPLETE', outputs: result.outputs as PlanOutputs })
      } else if (result.status === 'failed') {
        dispatch({
          type: 'NODE_FAILED',
          nodeId: 'unknown',
          message: result.error || '工作流失败',
        })
      } else if (result.status === 'paused') {
        dispatch({
          type: 'RESTORE_STATUS',
          status: 'paused',
          outputs: result.outputs as PlanOutputs,
          failedNode: null,
          error: null,
          completedNodes: result.completed_nodes ?? [],
          pausedNode: result.paused_snapshot?.node_id ?? null,
          pausedSnapshot: result.paused_snapshot,
        })
      } else if (result.status === 'running') {
        // running:仅同步节点状态,不做全量 RESTORE_STATUS(避免 clobber)
        if (ns.length > 0) dispatch({ type: 'SYNC_NODE_STATUSES', nodeStatuses: ns })
      }
      // paused / completed 时 RESTORE_STATUS 内部已读 node_statuses
      if (ns.length > 0 && (result.status === 'paused' || result.status === 'completed')) {
        dispatch({ type: 'SYNC_NODE_STATUSES', nodeStatuses: ns })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '查询状态失败'
      dispatch({ type: 'SET_ERROR', error: message })
    }
  }, [state.runId])

  const restoreFromRunId = useCallback(async (runId: string) => {
    dispatch({ type: 'SET_RUN_ID', runId })
    try {
      const result = await getPlanRunStatus(runId)
      // 防止竞态:fetch 期间用户若发起了新 run,不再用旧 run 的状态覆盖新 run。
      if (runIdRef.current !== runId) return
      dispatch({
        type: 'RESTORE_STATUS',
        status: result.status === 'canceled' ? 'idle' : result.status,
        outputs: result.outputs as PlanOutputs,
        failedNode: null,
        error: result.error || null,
        completedNodes: result.completed_nodes ?? [],
        pausedNode: result.paused_snapshot?.node_id ?? null,
        pausedSnapshot: result.paused_snapshot,
      })
    } catch {
      // run not found or expired — stay idle
    }
  }, [])

  const nodeLogs = useMemo(() => {
    const logsByNode: Record<string, string[]> = {}
    for (const log of state.logs) {
      if (!log.nodeId) continue
      const list = logsByNode[log.nodeId] ?? []
      let msg = log.message
      if (!msg) {
        switch (log.event) {
          case 'node.start': msg = '开始执行…'; break
          case 'node.complete': msg = '✓ 执行完成'; break
          case 'node.failed': msg = '✗ 执行失败: ' + ((log.data?.message as string) ?? '未知错误'); break
          case 'workflow.paused': msg = '⏸ 等待人工确认'; break
          default: msg = log.event; break
        }
      }
      list.push(msg)
      logsByNode[log.nodeId] = list
    }
    return logsByNode
  }, [state.logs])

  return {
    ...state,
    nodeLogs,
    start,
    approve,
    reject,
    cancel,
    rerun,
    reset,
    refreshStatus,
    restoreFromRunId,
  }
}

export { PIPELINE_NODES }
export type { PlanNode }
