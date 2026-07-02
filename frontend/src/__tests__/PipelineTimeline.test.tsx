import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { PipelineTimeline } from '../pages/PipelineTimeline'
import type { PlanNode } from '../types/plan'

const sampleNodes: PlanNode[] = [
  { id: 'collect', label: '需求确认', status: 'pending' },
  { id: 'market_research', label: '市场研究', status: 'running', startedAt: Date.now() },
  { id: 'audience_insight', label: '人群洞察', status: 'complete', startedAt: Date.now(), completedAt: Date.now() },
  { id: 'plan_generator', label: '方案生成', status: 'failed', startedAt: Date.now() },
]

describe('PipelineTimeline', () => {
  test('renders all node labels', () => {
    render(<PipelineTimeline nodes={sampleNodes} failedNode={null} />)
    expect(screen.getByText('需求确认')).toBeInTheDocument()
    expect(screen.getByText('市场研究')).toBeInTheDocument()
    expect(screen.getByText('人群洞察')).toBeInTheDocument()
    expect(screen.getByText('方案生成')).toBeInTheDocument()
  })

  test('shows status labels for each node', () => {
    render(<PipelineTimeline nodes={sampleNodes} failedNode={null} />)
    expect(screen.getByText('待启动')).toBeInTheDocument()
    expect(screen.getByText('运行中')).toBeInTheDocument()
    expect(screen.getByText('完成')).toBeInTheDocument()
    expect(screen.getByText('失败')).toBeInTheDocument()
  })

  test('shows blocking indicator for failed node', () => {
    render(<PipelineTimeline nodes={sampleNodes} failedNode="plan_generator" />)
    expect(screen.getByText('阻塞中')).toBeInTheDocument()
  })

  test('does not show blocking for non-failed node', () => {
    render(<PipelineTimeline nodes={sampleNodes} failedNode="plan_generator" />)
    expect(screen.queryByText('等待决策')).not.toBeInTheDocument()
  })
})
