// 活动规划 API — 按 activity_planning_id 拉取持久化结果
// Corresponding OpenSpec: docs/api/paths/activity-planning.yaml
// in_scope id: activity-planning

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

export interface CandidateTournament {
  name: string
  sport_type: string
  scale: string
  frequency: string
  sponsorship_options: string[]
  exact_match: boolean
}

export interface ActivityPlanningResult {
  sport_type: string
  city: string
  candidates: CandidateTournament[]
  events_summary: { monthly: number; avg_participants: number; categories: string[] } | null
  venues_summary: { count: number; types: string[]; capacity: string } | null
  suggestion: string
}

export class ActivityResultNotFoundError extends Error {
  constructor() {
    super('活动规划结果不存在或已过期')
    this.name = 'ActivityResultNotFoundError'
  }
}

export async function fetchActivityResult(activityId: string): Promise<ActivityPlanningResult> {
  const response = await fetch(`${API_BASE}/activity-planning/results/${activityId}`)
  if (response.status === 404) throw new ActivityResultNotFoundError()
  if (!response.ok) throw new Error('活动规划结果拉取失败')
  return (await response.json()) as ActivityPlanningResult
}
