export type AgentStatus = 'pending' | 'running' | 'complete' | 'failed'

export interface AgentState {
  id: string
  name: string
  icon: string
  status: AgentStatus
  logs: string[]
  data?: Record<string, unknown>
  error?: string
}

export interface AudienceState {
  productName: string
  status: 'idle' | 'running' | 'done' | 'error'
  agents: AgentState[]
  personaData: Record<string, unknown> | null
  error: string | null
}

export const PARALLEL_AGENTS = [
  { id: 'product_research', name: '产品调研', icon: '🔎' },
  { id: 'market_research', name: '市场分析', icon: '📊' },
  { id: 'audience_search', name: '人群调研', icon: '👥' },
]
