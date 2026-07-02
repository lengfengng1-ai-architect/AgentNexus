import { render, screen, fireEvent } from '@testing-library/react'
import { PlanPreview } from '../pages/PlanPreview'
import type { PlanChapter } from '../types/plan'

const chapters: PlanChapter[] = [
  { title: '第一章 市场概述', subtitle: '市场规模与趋势', content: '市场内容概述' },
  { title: '第二章 策略定位', subtitle: '核心定位与策略', content: '策略内容详情' },
]

describe('PlanPreview', () => {
  test('shows placeholder when empty', () => {
    render(<PlanPreview chapters={[]} />)
    expect(screen.getByText(/方案生成后/)).toBeInTheDocument()
  })

  test('renders chapter titles', () => {
    render(<PlanPreview chapters={chapters} />)
    expect(screen.getByText('第一章 市场概述')).toBeInTheDocument()
    expect(screen.getByText('第二章 策略定位')).toBeInTheDocument()
  })

  test('toggles chapter content on click', () => {
    render(<PlanPreview chapters={chapters} />)
    expect(screen.getByText('市场内容概述')).toBeVisible()
    fireEvent.click(screen.getByText('第一章 市场概述'))
    expect(screen.queryByText('市场内容概述')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('第一章 市场概述'))
    expect(screen.getByText('市场内容概述')).toBeVisible()
  })
})
