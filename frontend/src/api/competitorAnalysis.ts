// 竞品分析 API — 按 competitor_analysis_id 拉取持久化结果（详情页用）
// Corresponding OpenSpec: openspec/changes/competitor-analysis
// in_scope id: competitor-analysis

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

export interface CompetitorItemData {
  name: string
  product_matrix: string[] | null
  price_range: string | null
  positioning: string | null
  marketing_channels: string[] | null
  recent_moves: string | null
  sources: string[]
}

export interface CompetitorAnalysisResult {
  category: string
  brand_name: string | null
  competitors: CompetitorItemData[]
  market_overview: string | null
  suggestion: string | null
}

export class CompetitorResultNotFoundError extends Error {
  constructor() {
    super('竞品分析结果不存在或已过期')
    this.name = 'CompetitorResultNotFoundError'
  }
}

export async function fetchCompetitorResult(caId: string): Promise<CompetitorAnalysisResult> {
  const response = await fetch(`${API_BASE}/competitor-analysis/results/${caId}`)
  if (response.status === 404) throw new CompetitorResultNotFoundError()
  if (!response.ok) throw new Error('竞品分析结果拉取失败')
  return (await response.json()) as CompetitorAnalysisResult
}
