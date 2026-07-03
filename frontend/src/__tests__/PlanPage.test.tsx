import { render, screen } from '@testing-library/react'
import { PlanPage } from '../pages/PlanPage'

// Mock the SSE hook to avoid real API calls
vi.mock('../hooks/useWorkflowSSE', () => ({
  useWorkflowSSE: () => ({
    runId: null,
    status: 'idle',
    nodes: [],
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
  test('renders workbench layout with sidebar and main area', () => {
    render(<PlanPage />)
    // Sidebar shows brand title
    expect(screen.getByText('AllyGo 营销方案 Agent')).toBeInTheDocument()
    // Main header
    expect(screen.getByText('营销方案工作台')).toBeInTheDocument()
    // Pipeline heading (appears in both sidebar section header and PipelineTimeline)
    const pipelineHeadings = screen.getAllByText('Agent 执行流水线')
    expect(pipelineHeadings.length).toBeGreaterThanOrEqual(1)
  })
})
