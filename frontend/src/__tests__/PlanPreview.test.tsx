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
    expect(screen.getByText(/方案将在这里生成/)).toBeInTheDocument()
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

  test('expand all opens every chapter', () => {
    const many = [
      ...chapters,
      { title: '第三章', subtitle: 'sub3', content: 'content3' },
      { title: '第四章', subtitle: 'sub4', content: 'content4' },
    ]
    render(<PlanPreview chapters={many} />)
    expect(screen.queryByText('content4')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('展开全部'))
    expect(screen.getByText('content4')).toBeVisible()
  })

  test('collapse all closes every chapter', () => {
    render(<PlanPreview chapters={chapters} />)
    expect(screen.getByText('市场内容概述')).toBeVisible()
    fireEvent.click(screen.getByText('折叠全部'))
    expect(screen.queryByText('市场内容概述')).not.toBeInTheDocument()
  })
})
