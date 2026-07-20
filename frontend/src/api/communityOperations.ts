// 社群运营 API — 按 community_operations_id 拉取持久化结果
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

export interface ContentPlanItemData {
  content_type: string
  description: string
  frequency: string
}

export interface OperationActivityData {
  activity_name: string
  goal: string
  description: string
}

export interface CommunityOperationsResult {
  category: string
  city: string
  community_positioning: string
  target_members: string
  content_plan: ContentPlanItemData[]
  operation_activities: OperationActivityData[]
  kpi_targets: Record<string, string>
  suggestion: string
}

export class CommunityResultNotFoundError extends Error {
  constructor() {
    super('社群运营结果不存在或已过期')
    this.name = 'CommunityResultNotFoundError'
  }
}

export async function fetchCommunityResult(coId: string): Promise<CommunityOperationsResult> {
  const response = await fetch(`${API_BASE}/community-operations/results/${coId}`)
  if (response.status === 404) throw new CommunityResultNotFoundError()
  if (!response.ok) throw new Error('社群运营结果拉取失败')
  return (await response.json()) as CommunityOperationsResult
}
