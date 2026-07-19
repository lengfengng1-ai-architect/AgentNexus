// 盟域规划 API — 按 alliance_planning_id 拉取持久化结果
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

export interface RecruitmentItem { title: string; type: string; target_count: number; requirements: string[] }
export interface LeaguesSummary { count: number; top_leagues: string[]; avg_members: number }
export interface InfluencerSummary { count: number; tiers: Record<string, number>; avg_quote: string }

export interface AlliancePlanningResult {
  category: string; city: string;
  leagues: LeaguesSummary | null;
  recruitments: RecruitmentItem[];
  influencers: InfluencerSummary | null;
  suggestion: string;
}

export class AllianceResultNotFoundError extends Error {
  constructor() { super('盟域规划结果不存在或已过期'); this.name = 'AllianceResultNotFoundError' }
}

export async function fetchAllianceResult(allianceId: string): Promise<AlliancePlanningResult> {
  const response = await fetch(`${API_BASE}/alliance-planning/results/${allianceId}`)
  if (response.status === 404) throw new AllianceResultNotFoundError()
  if (!response.ok) throw new Error('盟域规划结果拉取失败')
  return (await response.json()) as AlliancePlanningResult
}
