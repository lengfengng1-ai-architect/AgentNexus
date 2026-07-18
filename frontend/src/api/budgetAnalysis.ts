// 预算评估 API — 按 budget_assessment_id 拉取持久化结果（详情页用）
// Corresponding OpenSpec: docs/api/paths/budget-analysis.yaml
// in_scope id: budget-analysis

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

export interface BudgetAllocation {
  category: string
  amount: number
  percentage: number
}

export interface BudgetAssessmentResult {
  category: string
  city: string
  total_budget: number
  period_months: number
  allocations: BudgetAllocation[]
  kpis: Record<string, string>
  timeline: string[]
  suggestion: string
}

export class BudgetResultNotFoundError extends Error {
  constructor() {
    super('预算评估结果不存在或已过期')
    this.name = 'BudgetResultNotFoundError'
  }
}

export async function fetchBudgetResult(budgetId: string): Promise<BudgetAssessmentResult> {
  const response = await fetch(`${API_BASE}/budget-analysis/results/${budgetId}`)
  if (response.status === 404) throw new BudgetResultNotFoundError()
  if (!response.ok) throw new Error('预算评估结果拉取失败')
  return (await response.json()) as BudgetAssessmentResult
}
