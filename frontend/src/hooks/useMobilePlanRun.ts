// useMobilePlanRun — 移动端轻量版流水线状态管理
// OpenSpec: mobile-brief-connect-backend · specs/mobile-brief-connect/spec.md
// 与 PC 端 usePlanRun 独立实现，不关心 checkpoint 暂停审批细节，
// 只关注节点状态、日志和最终结果
import { useCallback, useEffect, useReducer, useRef } from 'react'
import { startPlanRun, approvePlanRun, rejectPlanRun, getPlanRunStatus, getPlanMediaStatus } from '../api/plan'
import type { PlanChapter, PlanLogEvent, PlanNodeStatus, PlanOutputs } from '../types/plan'

// Budget allocation type for passing adjusted data
export interface BudgetAllocation {
  category: string
  percentage: number
  amount: number
}

const PIPELINE_NODES: { id: string; label: string; desc: string }[] = [
  { id: 'product_research', label: '产品调研', desc: '搜索并分析品牌产品信息与市场定位' },
  { id: 'market_research', label: '市场调研', desc: '收集行业趋势、竞品格局、消费洞察' },
  { id: 'audience_insight', label: '人群洞察', desc: '分析目标城市运动人群画像' },
  { id: 'plan_data_query', label: '数据查询', desc: '调取 AllyGo 盟域/赛事/达人/场馆/经营社数据' },
  { id: 'fitness_analysis', label: '适配度分析', desc: '计算品牌品类 × 运动场景适配度' },
  { id: 'strategy_generation', label: '策略生成', desc: '制定营销策略、核心定位、4M+1C框架' },
  { id: 'execution_planning', label: '执行规划', desc: '规划赛事/盟域/达人/内容/运营落地方案' },
  { id: 'budget_kpi', label: '预算与 KPI', desc: '测算预算分配、KPI预测、时间表' },
  { id: 'action_recommendations', label: '行动建议', desc: '生成可执行的系统操作指导' },
  { id: 'plan_generator', label: '方案生成', desc: '汇总上游输出为 9 章 Markdown 方案' },
]

export type MobileRunStatus = 'idle' | 'running' | 'paused' | 'failed' | 'completed'

export interface MobileStep {
  id: string
  label: string
  desc: string
  status: PlanNodeStatus
  logs: string[]
  /** running 时最新一条日志摘要（用于描述短句） */
  summary: string
}

export interface MobilePausedSnapshot {
  node_id: string
  is_after?: boolean
  node_input: Record<string, unknown>
  upstream_outputs: Record<string, unknown>
}

interface MobilePlanRunState {
  runId: string | null
  status: MobileRunStatus
  steps: MobileStep[]
  outputs: PlanOutputs
  chapters: PlanChapter[]
  pausedSnapshot: MobilePausedSnapshot | null
  error: string | null
  isConnected: boolean
  isLoading: boolean
}

type Action =
  | { type: 'RESET' }
  | { type: 'SET_RUN_ID'; runId: string }
  | { type: 'SET_CONNECTED'; connected: boolean }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'NODE_START'; nodeId: string }
  | { type: 'NODE_LOG'; nodeId: string; message: string }
  | { type: 'NODE_COMPLETE'; nodeId: string; output?: Record<string, unknown> }
  | { type: 'NODE_FAILED'; nodeId: string; message: string }
  | { type: 'WORKFLOW_PAUSED'; snapshot: MobilePausedSnapshot }
  | { type: 'WORKFLOW_RESUME'; nodeId: string }
  | { type: 'WORKFLOW_COMPLETE'; outputs: PlanOutputs; chapters: PlanChapter[] }
  | { type: 'UPDATE_MEDIA'; promoVideo: Record<string, unknown> | null | undefined; poster: Record<string, unknown> | null | undefined }
  | { type: 'SET_ERROR'; error: string }

function buildInitialSteps(): MobileStep[] {
  return PIPELINE_NODES.map((n) => ({
    id: n.id,
    label: n.label,
    desc: n.desc,
    status: 'pending',
    logs: [],
    summary: n.desc,
  }))
}

function reducer(state: MobilePlanRunState, action: Action): MobilePlanRunState {
  switch (action.type) {
    case 'RESET':
      return {
        runId: null,
        status: 'idle',
        steps: buildInitialSteps(),
        outputs: {},
        chapters: [],
        pausedSnapshot: null,
        error: null,
        isConnected: false,
        isLoading: false,
      }
    case 'SET_RUN_ID':
      return { ...state, runId: action.runId }
    case 'SET_CONNECTED':
      return { ...state, isConnected: action.connected }
    case 'SET_LOADING':
      return { ...state, isLoading: action.loading }
    case 'NODE_START': {
      const steps = state.steps.map((s) =>
        s.id === action.nodeId
          ? { ...s, status: 'running' as PlanNodeStatus, logs: [], summary: '开始执行…' }
          : s,
      )
      // 并行场景：同步将 product_research/market_research/audience_insight 设为 running
      const parallelIds = ['product_research', 'market_research', 'audience_insight']
      if (parallelIds.includes(action.nodeId)) {
        for (const pid of parallelIds) {
          const idx = steps.findIndex((s) => s.id === pid)
          if (idx >= 0 && steps[idx].status === 'pending') {
            steps[idx] = { ...steps[idx], status: 'running' as PlanNodeStatus, summary: '开始执行…' }
          }
        }
      }
      return { ...state, status: 'running', steps }
    }
    case 'NODE_LOG': {
      const steps = state.steps.map((s) =>
        s.id === action.nodeId
          ? { ...s, logs: [...s.logs, action.message], summary: action.message }
          : s,
      )
      return { ...state, steps }
    }
    case 'NODE_COMPLETE': {
      const steps = state.steps.map((s) =>
        s.id === action.nodeId ? { ...s, status: 'complete' as PlanNodeStatus, summary: s.logs[s.logs.length - 1] || s.desc } : s,
      )
      // 按节点累加输出：node.complete 事件可能携带该节点的输出数据
      const outputs = { ...state.outputs }
      if (action.output) {
        (outputs as Record<string, unknown>)[action.nodeId] = action.output
      }
      return { ...state, steps, outputs: outputs as PlanOutputs }
    }
    case 'NODE_FAILED': {
      const steps = state.steps.map((s) =>
        s.id === action.nodeId
          ? { ...s, status: 'failed' as PlanNodeStatus, logs: [...s.logs, `✗ ${action.message}`], summary: `执行失败：${action.message}` }
          : s,
      )
      return { ...state, status: 'failed', steps, error: action.message, isConnected: false }
    }
    case 'WORKFLOW_PAUSED': {
      // 确认所有前置节点已完成。当 paused 节点为 is_after 时（如 budget_kpi/
      // action_recommendations 执行完毕后的结果弹窗），该节点本身也已完成。
      // 在 SSE 实时流场景下前置节点早已通过 node.complete 标记为 complete，
      // 但在 restoreFromRunId 恢复场景下没有 replay node.complete 事件，
      // 前驱节点仍为 pending，需要向前补齐。
      const pauseIdx = PIPELINE_NODES.findIndex(n => n.id === action.snapshot.node_id)
      return {
        ...state,
        status: 'paused',
        isLoading: false,
        pausedSnapshot: action.snapshot,
        steps: state.steps.map((s) => {
          const idx = PIPELINE_NODES.findIndex(n => n.id === s.id)
          // 前置节点补齐：所有排在暂停节点之前的节点都应已完成
          // 注意：这里用 s.status !== 'complete' 而非 s.status === 'pending'
          // 是因为 SSE replay 可能先发出 node.start 将节点设为 running，
          // 导致条件 s.status === 'pending' 失效，节点卡在 running 状态。
          if (idx >= 0 && pauseIdx >= 0 && idx < pauseIdx && s.status !== 'complete') {
            return { ...s, status: 'complete' as PlanNodeStatus, summary: s.desc }
          }
          if (s.id === action.snapshot.node_id) {
            if (action.snapshot.is_after) {
              return s.status === 'running' || s.status === 'pending' ? { ...s, status: 'complete' as PlanNodeStatus, summary: '执行完成' } : s
            }
            return { ...s, status: 'waiting' as PlanNodeStatus, summary: '等待人工确认' }
          }
          return s
        }),
      }
    }
    case 'WORKFLOW_RESUME':
      return {
        ...state,
        status: 'running',
        isLoading: true,
        pausedSnapshot: null,
        steps: state.steps.map((s) =>
          s.id === action.nodeId || s.status === 'waiting'
            ? { ...s, status: 'running' as PlanNodeStatus, summary: '已采纳反馈，重新执行…' }
            : s,
        ),
      }
    case 'WORKFLOW_COMPLETE': {
      // 所有 pending/waiting 节点标记为 complete
      const steps = state.steps.map((s) =>
        s.status === 'pending' || s.status === 'waiting'
          ? { ...s, status: 'complete' as PlanNodeStatus }
          : s,
      )
      return {
        ...state,
        status: 'completed',
        steps,
        outputs: action.outputs,
        chapters: action.chapters,
        isConnected: false,
        isLoading: false,
        pausedSnapshot: null,
      }
    }
    case 'UPDATE_MEDIA': {
      const nextOutputs: Record<string, unknown> = { ...state.outputs }
      if (action.promoVideo) nextOutputs.promo_video = action.promoVideo
      else delete nextOutputs.promo_video
      if (action.poster) nextOutputs.poster = action.poster
      else delete nextOutputs.poster
      return { ...state, outputs: nextOutputs as unknown as PlanOutputs }
    }
    case 'SET_ERROR':
      return { ...state, error: action.error, isConnected: false, isLoading: false }
    default:
      return state
  }
}

/** Parse a single SSE line into a partial event. */
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

export function useMobilePlanRun() {
  const [state, dispatch] = useReducer(reducer, {
    runId: null,
    status: 'idle',
    steps: buildInitialSteps(),
    outputs: {},
    chapters: [],
    pausedSnapshot: null,
    error: null,
    isConnected: false,
    isLoading: false,
  })

  const runIdRef = useRef<string | null>(null)
  useEffect(() => { runIdRef.current = state.runId }, [state.runId])

  const consumeStream = useCallback(async (stream: ReadableStream<Uint8Array>) => {
    try {
      for await (const event of readSSEStream(stream)) {
        switch (event.event) {
          case 'workflow.start':
            dispatch({ type: 'SET_CONNECTED', connected: true })
            break
          case 'node.start':
            if (event.nodeId) dispatch({ type: 'NODE_START', nodeId: event.nodeId })
            break
          case 'node.log':
            if (event.nodeId && event.message) {
              dispatch({ type: 'NODE_LOG', nodeId: event.nodeId, message: event.message })
            }
            break
          case 'node.complete': {
            // node.complete 事件可能携带该节点的输出数据（output 字段）
            const nodeOutput = event.data?.output as Record<string, unknown> | undefined
            if (event.nodeId) dispatch({ type: 'NODE_COMPLETE', nodeId: event.nodeId, output: nodeOutput?.[event.nodeId] as Record<string, unknown> | undefined })
            break
          }
          case 'node.failed':
            if (event.nodeId) dispatch({ type: 'NODE_FAILED', nodeId: event.nodeId, message: event.message || '节点执行失败' })
            break
          case 'workflow.paused': {
            const snapshot = event.data?.snapshot as MobilePausedSnapshot | undefined
            if (snapshot) {
              dispatch({ type: 'WORKFLOW_PAUSED', snapshot })
            }
            break
          }
          case 'workflow.complete': {
            const output = (event.data?.output || event.data) as Record<string, unknown>
            const chapters: PlanChapter[] = (output as PlanOutputs)?.plan_generator?.chapters || []
            // 从 outputs 中提取各节点数据，供前端展示提炼卡片
            const strategyOutput = (output as PlanOutputs)?.strategy_generation as Record<string, unknown> | undefined
            const executionOutput = (output as PlanOutputs)?.execution_planning as Record<string, unknown> | undefined
            const budgetOutput = (output as PlanOutputs)?.budget_kpi as Record<string, unknown> | undefined
            const actionOutput = (output as PlanOutputs)?.action_recommendations as Record<string, unknown> | undefined
            dispatch({
              type: 'WORKFLOW_COMPLETE',
              outputs: {
                ...(output as PlanOutputs),
                _strategy: strategyOutput,
                _execution: executionOutput,
                _budget: budgetOutput,
                _actions: actionOutput,
              },
              chapters,
            })
            break
          }
          case 'chapter.start':
          case 'chapter.complete':
            // 移动端简单模式：忽略章节级别事件，等 workflow.complete 统一展示
            break
          default:
            break
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'SSE 连接异常'
      dispatch({ type: 'SET_ERROR', error: message })
    } finally {
      dispatch({ type: 'SET_CONNECTED', connected: false })
    }
  }, [])

  const start = useCallback(async (brandInput: Record<string, unknown>) => {
    dispatch({ type: 'RESET' })
    try {
      const { runId, stream } = await startPlanRun(brandInput)
      try { localStorage.setItem('allygo_mobile_plan_run_id', runId) } catch { /* ignore */ }
      dispatch({ type: 'SET_RUN_ID', runId })
      dispatch({ type: 'SET_CONNECTED', connected: true })
      // 并行启动前三个节点
      dispatch({ type: 'NODE_START', nodeId: 'product_research' })
      await consumeStream(stream)
    } catch (error) {
      const message = error instanceof Error ? error.message : '启动失败'
      dispatch({ type: 'SET_ERROR', error: message })
    }
  }, [consumeStream])

  const approve = useCallback(async (budgetAllocations?: BudgetAllocation[]) => {
    const rid = runIdRef.current
    if (!rid) return
    dispatch({ type: 'SET_LOADING', loading: true })
    if (state.pausedSnapshot) {
      // is_after=true: 节点已执行完毕，无需再标记为 running（如 budget_kpi 结果弹窗确认）
      if (!state.pausedSnapshot.is_after) {
        dispatch({ type: 'NODE_START', nodeId: state.pausedSnapshot.node_id })
      }
    }
    try {
      const input = budgetAllocations
        ? { edited_input: { budget_kpi_adjusted: budgetAllocations } as Record<string, unknown> }
        : undefined
      const stream = await approvePlanRun(rid, input)
      dispatch({ type: 'SET_CONNECTED', connected: true })
      await consumeStream(stream)
    } catch (error) {
      const message = error instanceof Error ? error.message : '审批通过失败'
      dispatch({ type: 'SET_ERROR', error: message })
    } finally {
      dispatch({ type: 'SET_LOADING', loading: false })
    }
  }, [consumeStream, state.pausedSnapshot])

  const approveWithBudget = useCallback((allocs: BudgetAllocation[]) => {
    approve(allocs)
  }, [approve])

  const reject = useCallback(async (reason: string) => {
    const rid = runIdRef.current
    if (!rid) return
    // Determine which node to re-run: the paused node
    const redoNodeId = state.pausedSnapshot?.node_id || 'budget_kpi'
    dispatch({ type: 'WORKFLOW_RESUME', nodeId: redoNodeId })
    try {
      const stream = await rejectPlanRun(rid, { reason })
      dispatch({ type: 'SET_CONNECTED', connected: true })
      await consumeStream(stream)
    } catch (error) {
      const message = error instanceof Error ? error.message : '驳回失败'
      dispatch({ type: 'SET_ERROR', error: message })
    } finally {
      dispatch({ type: 'SET_LOADING', loading: false })
    }
  }, [consumeStream])

  const restoreFromRunId = useCallback(async (runId: string) => {
    dispatch({ type: 'SET_RUN_ID', runId })
    try {
      const result = await getPlanRunStatus(runId)
      if (runIdRef.current !== runId) return
      if (result.status === 'completed') {
        const outputs = result.outputs as PlanOutputs
        const chapters: PlanChapter[] = outputs?.plan_generator?.chapters || []
        dispatch({
          type: 'WORKFLOW_COMPLETE',
          outputs: {
            ...outputs,
            _strategy: outputs?.strategy_generation as Record<string, unknown> | undefined,
            _execution: outputs?.execution_planning as Record<string, unknown> | undefined,
            _budget: outputs?.budget_kpi as Record<string, unknown> | undefined,
            _actions: outputs?.action_recommendations as Record<string, unknown> | undefined,
          },
          chapters,
        })
      } else if (result.status === 'paused' && result.paused_snapshot) {
        dispatch({ type: 'WORKFLOW_PAUSED', snapshot: result.paused_snapshot as MobilePausedSnapshot })
      } else if (result.status === 'failed') {
        dispatch({ type: 'SET_ERROR', error: result.error || '工作流失败' })
      }
      // running / canceled: 保持 idle，让用户重新开始
    } catch {
      // run not found — stay idle
    }
  }, [])

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' })
  }, [])

  const checkMediaStatus = useCallback(async () => {
    const rid = runIdRef.current
    if (!rid) return
    try {
      const result = await getPlanMediaStatus(rid)
      dispatch({ type: 'UPDATE_MEDIA', promoVideo: result.promo_video, poster: result.poster })
    } catch {
      // 媒体状态查询失败不影响流水线
    }
  }, [])

  return {
    ...state,
    start,
    approve,
    approveWithBudget,
    reject,
    reset,
    restoreFromRunId,
    checkMediaStatus,
  }
}

export interface MobilePlanRunAPI {
  status: MobileRunStatus
  steps: MobileStep[]
  outputs: PlanOutputs
  chapters: PlanChapter[]
  pausedSnapshot: MobilePausedSnapshot | null
  error: string | null
  isConnected: boolean
  isLoading: boolean
  start: (brandInput: Record<string, unknown>) => Promise<void>
  approve: () => Promise<void>
  approveWithBudget: (allocations: BudgetAllocation[]) => void
  reject: (reason: string) => Promise<void>
  reset: () => void
  restoreFromRunId: (runId: string) => Promise<void>
  checkMediaStatus: () => Promise<void>
}

export { PIPELINE_NODES }