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

  test('renders markdown headers with correct hierarchy', () => {
    const mdChapters: PlanChapter[] = [
      { title: '测试章节', subtitle: '测试副标题', content: '## 二级标题\n\n### 三级标题\n\n正文段落' },
    ]
    render(<PlanPreview chapters={mdChapters} />)
    expect(screen.getByText('二级标题')).toBeInTheDocument()
    expect(screen.getByText('三级标题')).toBeInTheDocument()
    expect(screen.getByText('正文段落')).toBeInTheDocument()
  })

  test('renders markdown lists', () => {
    const mdChapters: PlanChapter[] = [
      { title: '列表章节', subtitle: 'sub', content: '- 第一项\n- 第二项\n- 第三项' },
    ]
    render(<PlanPreview chapters={mdChapters} />)
    expect(screen.getByText('第一项')).toBeInTheDocument()
    expect(screen.getByText('第二项')).toBeInTheDocument()
    expect(screen.getByText('第三项')).toBeInTheDocument()
  })

  test('renders markdown bold text', () => {
    const mdChapters: PlanChapter[] = [
      { title: '粗体章节', subtitle: 'sub', content: '这是**重要**内容' },
    ]
    render(<PlanPreview chapters={mdChapters} />)
    expect(screen.getByText('重要')).toBeInTheDocument()
  })
})
