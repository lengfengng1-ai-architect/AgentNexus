import { render, screen } from '@testing-library/react'
import { PlanLogStream } from '../pages/PlanLogStream'
import type { PlanLogEvent } from '../types/plan'

const sampleLogs: PlanLogEvent[] = [
  { id: 1, event: 'workflow.start', runId: 'run-1' },
  { id: 2, event: 'node.start', runId: 'run-1', nodeId: 'market_research' },
  { id: 3, event: 'node.complete', runId: 'run-1', nodeId: 'market_research', message: '完成' },
]

describe('PlanLogStream', () => {
  test('shows placeholder when empty', () => {
    render(<PlanLogStream logs={[]} />)
    expect(screen.getByText(/等待输入品牌信息/)).toBeInTheDocument()
    expect(screen.getByText(/生成营销方案/)).toBeInTheDocument()
  })

  test('renders formatted log event when logs present', () => {
    render(<PlanLogStream logs={sampleLogs} />)
    // The latest log event (index 2) is node.complete for market_research agent
    expect(screen.getByText(/市场调研/)).toBeInTheDocument()
  })
})
