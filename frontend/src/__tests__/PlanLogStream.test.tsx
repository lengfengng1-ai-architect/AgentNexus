import { render, screen } from '@testing-library/react'
import { PlanLogStream } from '../pages/PlanLogStream'
import type { PlanLogEvent } from '../types/plan'

const sampleLogs: PlanLogEvent[] = [
  { id: 1, event: 'workflow.start', runId: 'run-1' },
  { id: 2, event: 'node.start', runId: 'run-1', nodeId: 'collect' },
  { id: 3, event: 'node.complete', runId: 'run-1', nodeId: 'collect', message: '完成' },
]

describe('PlanLogStream', () => {
  test('shows placeholder when empty', () => {
    render(<PlanLogStream logs={[]} />)
    expect(screen.getByText('等待流水线启动…')).toBeInTheDocument()
  })

  test('renders log events', () => {
    render(<PlanLogStream logs={sampleLogs} />)
    expect(screen.getByText(/workflow.start/)).toBeInTheDocument()
    expect(screen.getByText(/node.start/)).toBeInTheDocument()
    expect(screen.getByText(/node.complete/)).toBeInTheDocument()
  })

  test('shows nodeId and message in formatted event', () => {
    render(<PlanLogStream logs={sampleLogs} />)
    const collectItems = screen.getAllByText(/\[collect\]/)
    expect(collectItems.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/- 完成/)).toBeInTheDocument()
  })
})
