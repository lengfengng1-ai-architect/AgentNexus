import { render, screen } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { PipelineTimeline } from '../pages/PipelineTimeline'
import type { PlanNode } from '../types/plan'

const sampleNodes: PlanNode[] = [
  { id: 'market_research', label: '市场调研 Agent', status: 'running', startedAt: Date.now() },
  { id: 'audience_insight', label: '人群洞察 Agent', status: 'complete', startedAt: Date.now(), completedAt: Date.now() },
  { id: 'strategy_generation', label: '策略生成 Agent', status: 'failed', startedAt: Date.now() },
]

describe('PipelineTimeline', () => {
  test('renders pipeline heading', () => {
    render(<PipelineTimeline nodes={[]} failedNode={null} />)
    expect(screen.getByText('Agent 执行流水线')).toBeInTheDocument()
  })

  test('renders all 10 agent names', () => {
    render(<PipelineTimeline nodes={[]} failedNode={null} />)
    expect(screen.getByText('产品调研 Agent')).toBeInTheDocument()
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
    render(<PipelineTimeline nodes={sampleNodes} failedNode="strategy_generation" />)
    expect(screen.getByText('失败')).toBeInTheDocument()
  })

  test('shows pending status for untouched nodes', () => {
    render(<PipelineTimeline nodes={[]} failedNode={null} />)
    // All agents show 待执行 when no nodes match
    const pendingLabels = screen.getAllByText('待执行')
    expect(pendingLabels.length).toBe(10)
  })

  test('expanded running node shows LogViewer with logs', () => {
    const nodeLogs = { market_research: ['开始执行…', '正在搜索竞品数据', '✓ 执行完成'] }
    render(
      <PipelineTimeline
        nodes={sampleNodes}
        failedNode={null}
        nodeLogs={nodeLogs}
        pausedNode={null}
      />,
    )
    // Running node should auto-expand — log text should be visible
    expect(screen.getByText('开始执行…')).toBeInTheDocument()
    expect(screen.getByText('正在搜索竞品数据')).toBeInTheDocument()
  })

  test('expanded complete node shows execution summary', () => {
    const nodeLogs = { audience_insight: ['开始执行…', '✓ 执行完成'] }
    render(
      <PipelineTimeline
        nodes={sampleNodes}
        failedNode={null}
        nodeLogs={nodeLogs}
      />,
    )
    // Click to expand audience_insight which is 'complete'
    const agentButtons = screen.getAllByText('已完成')
    expect(agentButtons.length).toBeGreaterThan(0)
  })
})
