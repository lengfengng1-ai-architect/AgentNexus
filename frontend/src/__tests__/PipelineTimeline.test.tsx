import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { PipelineTimeline } from '../pages/PipelineTimeline'
import type { PlanNode } from '../types/plan'

const sampleNodes: PlanNode[] = [
  { id: 'collect', label: '需求收集 Agent', status: 'pending' },
  { id: 'market', label: '市场调研 Agent', status: 'running', startedAt: Date.now() },
  { id: 'audience', label: '人群洞察 Agent', status: 'complete', startedAt: Date.now(), completedAt: Date.now() },
  { id: 'strategy', label: '策略生成 Agent', status: 'failed', startedAt: Date.now() },
]

describe('PipelineTimeline', () => {
  test('renders pipeline heading', () => {
    render(<PipelineTimeline nodes={[]} failedNode={null} />)
    expect(screen.getByText('Agent 执行流水线')).toBeInTheDocument()
  })

  test('renders all 9 agent names', () => {
    render(<PipelineTimeline nodes={[]} failedNode={null} />)
    expect(screen.getByText('需求收集 Agent')).toBeInTheDocument()
    expect(screen.getByText('市场调研 Agent')).toBeInTheDocument()
    expect(screen.getByText('人群洞察 Agent')).toBeInTheDocument()
    expect(screen.getByText('数据查询 Agent')).toBeInTheDocument()
    expect(screen.getByText('适配度分析 Agent')).toBeInTheDocument()
    expect(screen.getByText('策略生成 Agent')).toBeInTheDocument()
    expect(screen.getByText('执行规划 Agent')).toBeInTheDocument()
    expect(screen.getByText('预算与 KPI Agent')).toBeInTheDocument()
    expect(screen.getByText('行动建议 Agent')).toBeInTheDocument()
  })

  test('shows status labels for running and complete nodes', () => {
    render(<PipelineTimeline nodes={sampleNodes} failedNode={null} />)
    expect(screen.getByText('执行中')).toBeInTheDocument()
    expect(screen.getByText('已完成')).toBeInTheDocument()
  })

  test('shows failed status for failed node', () => {
    render(<PipelineTimeline nodes={sampleNodes} failedNode="strategy" />)
    expect(screen.getByText('失败')).toBeInTheDocument()
  })

  test('shows pending status for untouched nodes', () => {
    render(<PipelineTimeline nodes={[]} failedNode={null} />)
    // All 9 agents show 待执行 when no nodes match
    const pendingLabels = screen.getAllByText('待执行')
    expect(pendingLabels.length).toBe(9)
  })
})
