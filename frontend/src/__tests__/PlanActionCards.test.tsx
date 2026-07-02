import { render, screen } from '@testing-library/react'
import { PlanActionCards } from '../pages/PlanActionCards'
import type { PlanActions, PlanBudgetKpi } from '../types/plan'

describe('PlanActionCards', () => {
  test('renders empty state when no data', () => {
    const { container } = render(<PlanActionCards actions={undefined} budgetKpi={undefined} />)
    expect(container.textContent).toBe('')
  })

  test('renders budget and KPI section', () => {
    const budgetKpi: PlanBudgetKpi = {
      total_budget: 500,
      period_months: 6,
      allocations: [{ category: '赛事赞助', amount: 200, percentage: 40 }],
      kpis: { 曝光量: '5000万' },
      timeline: ['第1个月'],
    }
    render(<PlanActionCards actions={undefined} budgetKpi={budgetKpi} />)
    expect(screen.getByText('500万')).toBeInTheDocument()
    expect(screen.getByText('6个月')).toBeInTheDocument()
    expect(screen.getByText('赛事赞助')).toBeInTheDocument()
    expect(screen.getByText('200万（40%）')).toBeInTheDocument()
    expect(screen.getByText('曝光量')).toBeInTheDocument()
    expect(screen.getByText('5000万')).toBeInTheDocument()
  })

  test('renders action recommendations', () => {
    const actions: PlanActions = {
      actions: [
        { title: '第一步', description: '确认品牌定位' },
        { title: '第二步', description: '制定预算方案' },
      ],
    }
    render(<PlanActionCards actions={actions} budgetKpi={undefined} />)
    expect(screen.getByText('第一步')).toBeInTheDocument()
    expect(screen.getByText('第二步')).toBeInTheDocument()
    expect(screen.getByText('确认品牌定位')).toBeInTheDocument()
    expect(screen.getByText('制定预算方案')).toBeInTheDocument()
  })
})
