import type { BrandInput } from './chat'

export type PlanNodeStatus = 'pending' | 'running' | 'complete' | 'failed' | 'waiting'

export interface PlanNode {
  id: string
  label: string
  status: PlanNodeStatus
  startedAt?: number
  completedAt?: number
}

export interface PlanLogEvent {
  id: number
  event: string
  runId: string
  nodeId?: string
  message?: string
  data?: Record<string, unknown>
}

export interface PlanChapter {
  title: string
  subtitle: string
  content: string
}

export interface PlanActionItem {
  title: string
  description: string
  buttonLabel: string
}

export interface PlanOutputs {
  collect?: { is_complete: boolean; missing_fields: string[]; brand_input: BrandInput }
  market_research?: Record<string, unknown>
  audience_insight?: Record<string, unknown>
  plan_data_query?: Record<string, unknown>
  fitness_analysis?: Record<string, unknown>
  strategy_generation?: Record<string, unknown>
  execution_planning?: Record<string, unknown>
  budget_kpi?: Record<string, unknown>
  action_recommendations?: { actions: Pick<PlanActionItem, 'title' | 'description'>[] }
  plan_generator?: { chapters: PlanChapter[] }
}

export interface PlanSession {
  id: string
  brandInput: BrandInput
  summary?: string
}

export interface WorkflowSSEState {
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

export type WorkflowControlAction = 'retry' | 'skip' | 'abort'
