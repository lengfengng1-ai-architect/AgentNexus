import { describe, expect, test, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CommunityOperationsEntryCard } from '../components/CommunityOperationsEntryCard'

const FULL = {
  category: '瑜伽服',
  city: '上海',
  community_positioning: '专注都市女性瑜伽爱好者的品牌社群',
  content_plan: [{ content_type: '瑜伽技巧', description: '每日瑜伽技巧分享', frequency: '每天' }],
  operation_activities: [{ activity_name: '21天打卡', goal: '拉新200人', description: '瑜伽打卡挑战' }],
  suggestion: '建议以21天瑜伽打卡作为冷启动活动',
}

describe('CommunityOperationsEntryCard', () => {
  test('渲染标题/定位/建议/按钮', () => {
    render(<CommunityOperationsEntryCard result={FULL} onOpen={() => {}} />)
    expect(screen.getByText('瑜伽服社群运营')).toBeTruthy()
    expect(screen.getByText(/专注都市女性/)).toBeTruthy()
    expect(screen.getByText(/冷启动/)).toBeTruthy()
    expect(screen.getByText('查看社群运营详情')).toBeTruthy()
  })

  test('点击按钮触发 onOpen', () => {
    const onOpen = vi.fn()
    render(<CommunityOperationsEntryCard result={FULL} onOpen={onOpen} />)
    fireEvent.click(screen.getByText('查看社群运营详情'))
    expect(onOpen).toHaveBeenCalledTimes(1)
  })
})
