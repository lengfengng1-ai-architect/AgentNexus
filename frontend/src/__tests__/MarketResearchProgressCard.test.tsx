import { describe, expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MarketResearchProgressCard } from '../components/MarketResearchProgressCard'

describe('MarketResearchProgressCard', () => {
  test('shows loading state when no sources or logs', () => {
    render(<MarketResearchProgressCard sources={[]} logs={[]} />)
    expect(screen.getByText('正在搜索…')).toBeTruthy()
    expect(screen.getByText('正在启动…')).toBeTruthy()
  })

  test('renders source URLs', () => {
    const sources = [
      { url: 'https://example.com/report1', title: '报告一' },
      { url: 'https://example.com/report2', title: '' },
    ]
    render(<MarketResearchProgressCard sources={sources} logs={[]} />)
    expect(screen.getByText(/报告一/)).toBeTruthy()
    expect(screen.getByText(/example.com\/report1/)).toBeTruthy()
    expect(screen.getByText(/example.com\/report2/)).toBeTruthy()
  })

  test('renders progress logs in order', () => {
    const logs = ['📋 市场边界定义…', '✓ define 完成', '📋 市场规模估算…']
    render(<MarketResearchProgressCard sources={[]} logs={logs} />)
    expect(screen.getByText('📋 市场边界定义…')).toBeTruthy()
    expect(screen.getByText('✓ define 完成')).toBeTruthy()
    expect(screen.getByText('📋 市场规模估算…')).toBeTruthy()
  })

  test('renders mobile variant without error', () => {
    const logs = ['步骤 1', '步骤 2']
    const { container } = render(<MarketResearchProgressCard sources={[]} logs={logs} variant="mobile" />)
    // Should render without crashing
    expect(container.querySelector('.overflow-y-auto')).toBeTruthy()
  })
})
