import { describe, expect, test, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CompetitorAnalysisEntryCard } from '../components/CompetitorAnalysisEntryCard'

const FULL = {
  category: '运动鞋',
  brand_name: '安踏',
  competitors: [
    { name: 'Nike', product_matrix: ['Air Max'], price_range: '400-1500元', positioning: '高端专业运动' },
    { name: 'Adidas', positioning: '时尚运动' },
  ],
  market_overview: '运动鞋市场竞争激烈',
  suggestion: '建议以中端性价比切入',
}

describe('CompetitorAnalysisEntryCard', () => {
  test('渲染标题/竞品/建议/按钮', () => {
    render(<CompetitorAnalysisEntryCard result={FULL} onOpen={() => {}} />)
    expect(screen.getByText(/运动鞋竞品分析/)).toBeTruthy()
    expect(screen.getByText('Nike')).toBeTruthy()
    expect(screen.getByText(/建议以中端/)).toBeTruthy()
    expect(screen.getByText('查看完整竞品分析')).toBeTruthy()
  })

  test('点击按钮触发 onOpen', () => {
    const onOpen = vi.fn()
    render(<CompetitorAnalysisEntryCard result={FULL} onOpen={onOpen} />)
    fireEvent.click(screen.getByText('查看完整竞品分析'))
    expect(onOpen).toHaveBeenCalledTimes(1)
  })
})
