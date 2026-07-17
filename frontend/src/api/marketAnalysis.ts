// OpenSpec: openspec/changes/mobile-research-report-page
// in_scope id: market-analysis
const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

/** 调研结果不存在/已过期（404）或格式非法时的错误，供结果页区分"过期占位"与"网络错误" */
export class ResearchResultNotFoundError extends Error {
  constructor() {
    super('调研结果不存在或已过期')
    this.name = 'ResearchResultNotFoundError'
  }
}

export interface ResearchResultPayload {
  result: Record<string, unknown>
  confidence?: string
}

/** 按 research_id 从后端拉取已持久化的调研结果（移动端结果页数据源） */
export async function fetchResearchResult(researchId: string): Promise<ResearchResultPayload> {
  const resp = await fetch(`${API_BASE}/market-analysis/results/${encodeURIComponent(researchId)}`)
  if (resp.status === 404) throw new ResearchResultNotFoundError()
  if (!resp.ok) throw new Error(`拉取调研结果失败（${resp.status}）`)
  return (await resp.json()) as ResearchResultPayload
}
