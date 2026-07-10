import type { BrandInput } from './chat'

export type PlanNodeStatus = 'pending' | 'running' | 'complete' | 'completed' | 'failed' | 'waiting'

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

export interface PromoVideoStatus {
  status: 'generating' | 'completed' | 'failed'
  video_url?: string
  error?: string
  task_id?: string
  usage?: {
    resolution?: number
    ratio?: string
    duration?: number
  }
}

export interface PosterStatus {
  status: 'generating' | 'completed' | 'failed'
  image_url?: string
  error?: string
  size?: string
  width?: number
  height?: number
}

export interface PlanActionItem {
  title: string
  description: string
  buttonLabel: string
  type?: 'normal' | 'video'
  videoUrl?: string
  promoVideo?: PromoVideoStatus
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
  promo_video?: PromoVideoStatus
  poster?: PosterStatus
  /** 后端 plan_node_status 表,供前端轮询驱动节点显示 */
  node_statuses?: { node_id: string; status: string; started_at?: string; completed_at?: string }[]
}
