import { describe, expect, test, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { AlliancePlanningEntryCard } from '../components/AlliancePlanningEntryCard'

const FULL = { category: '运动鞋', city: '上海', leagues: { count: 342, top_leagues: ['沪跑团', '上海瑜伽联盟'] },
  recruitments: [{ title: '运动盟域代理商招募', type: '代理商招募', target_count: 30, requirements: ['有资源'] }],
  influencers: { count: 568, tiers: { '至尊/大师': 12 }, avg_quote: '1.2万/条' },
  suggestion: '建议优先合作沪跑团等头部盟域' }

describe('AlliancePlanningEntryCard', () => {
  test('渲染标题/盟域/招募/建议/按钮', () => {
    render(<AlliancePlanningEntryCard result={FULL} onOpen={() => {}} />)
    expect(screen.getByText('运动鞋盟域规划')).toBeTruthy()
    expect(screen.getByText('沪跑团')).toBeTruthy()
    expect(screen.getByText(/建议优先/)).toBeTruthy()
    expect(screen.getByText('查看盟域详情')).toBeTruthy()
  })
  test('点击按钮触发 onOpen', () => {
    const onOpen = vi.fn(); render(<AlliancePlanningEntryCard result={FULL} onOpen={onOpen} />)
    fireEvent.click(screen.getByText('查看盟域详情')); expect(onOpen).toHaveBeenCalledTimes(1)
  })
})
