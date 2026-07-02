import { render, screen } from '@testing-library/react'
import { PlanPage } from '../pages/PlanPage'

// Mock the SSE hook to avoid real API calls
vi.mock('../hooks/useWorkflowSSE', () => ({
  useWorkflowSSE: () => ({
    runId: null,
    status: 'idle',
    nodes: [
      { id: 'collect', label: '需求确认', status: 'pending' as const },
      { id: 'market_research', label: '市场研究', status: 'pending' as const },
      { id: 'audience_insight', label: '人群洞察', status: 'pending' as const },
      { id: 'plan_data_query', label: '平台资源', status: 'pending' as const },
      { id: 'fitness_analysis', label: '适配度分析', status: 'pending' as const },
      { id: 'strategy_generation', label: '策略生成', status: 'pending' as const },
      { id: 'execution_planning', label: '执行规划', status: 'pending' as const },
      { id: 'budget_kpi', label: '预算 KPI', status: 'pending' as const },
      { id: 'action_recommendations', label: '行动建议', status: 'pending' as const },
      { id: 'plan_generator', label: '方案生成', status: 'pending' as const },
    ],
    logs: [],
    outputs: {},
    failedNode: null,
    error: null,
    isConnected: false,
    start: vi.fn(),
    control: vi.fn(),
    reset: vi.fn(),
  }),
}))

describe('PlanPage', () => {
  test('renders workbench layout with header and aside', () => {
    render(<PlanPage />)
    expect(screen.getByText('ALLYGO')).toBeInTheDocument()
    expect(screen.getByText('方案生成工作台')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '需求确认' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '方案生成流水线' })).toBeInTheDocument()
  })
})
