import { render, screen } from '@testing-library/react'
import { PlanActionCards } from '../pages/PlanActionCards'

describe('PlanActionCards', () => {
  test('renders nothing when actions is empty', () => {
    const { container } = render(<PlanActionCards actions={[]} />)
    expect(container.textContent).toBe('')
  })

  test('renders nothing when actions is undefined', () => {
    const { container } = render(<PlanActionCards actions={undefined} />)
    expect(container.textContent).toBe('')
  })

  test('renders action items with title and description', () => {
    const actions = [
      { title: '第一步', description: '确认品牌定位', buttonLabel: '查看详情' },
      { title: '第二步', description: '制定预算方案', buttonLabel: '查看详情' },
    ]
    render(<PlanActionCards actions={actions} />)
    expect(screen.getByText('下一步行动建议')).toBeInTheDocument()
    expect(screen.getByText('第一步')).toBeInTheDocument()
    expect(screen.getByText('第二步')).toBeInTheDocument()
    expect(screen.getByText('确认品牌定位')).toBeInTheDocument()
    expect(screen.getByText('制定预算方案')).toBeInTheDocument()
  })
})
