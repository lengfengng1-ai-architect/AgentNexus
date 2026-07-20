import { describe, expect, test, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { ScreenCommunityOperations } from '../pages/mobile-workbench/ScreenCommunityOperations'

const FULL = {
  category: '瑜伽服', city: '上海',
  community_positioning: '专注都市女性瑜伽爱好者的品牌社群',
  target_members: '25-35岁女性',
  content_plan: [{ content_type: '瑜伽技巧', description: '每日瑜伽技巧分享', frequency: '每天' }],
  operation_activities: [{ activity_name: '21天打卡', goal: '拉新200人', description: '瑜伽打卡挑战' }],
  kpi_targets: { active_rate: '40%', retention_30d: '65%' },
  suggestion: '建议以21天瑜伽打卡作为冷启动活动',
}

function stubFetch(r: { ok: boolean; status: number; json: () => Promise<unknown> }) {
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(r)))
}

describe('ScreenCommunityOperations', () => {
  beforeEach(() => vi.unstubAllGlobals())

  test('加载→详情', async () => {
    stubFetch({ ok: true, status: 200, json: async () => FULL })
    render(<ScreenCommunityOperations coId="co-abc12345" onBack={() => {}} />)
    expect(document.querySelector('.mbu-skeleton-wrap')).toBeTruthy()
    await waitFor(() => expect(screen.getByText('瑜伽服社群运营（上海）')).toBeTruthy())
    expect(screen.getByText('21天打卡')).toBeTruthy()
    expect(screen.getByText(/冷启动/)).toBeTruthy()
  })

  test('404', async () => {
    stubFetch({ ok: false, status: 404, json: async () => ({}) })
    render(<ScreenCommunityOperations coId="co-deadbeef" onBack={() => {}} />)
    await waitFor(() => expect(screen.getByText('社群运营数据已过期，请重新规划')).toBeTruthy())
  })

  test('500', async () => {
    stubFetch({ ok: false, status: 500, json: async () => ({}) })
    render(<ScreenCommunityOperations coId="co-deadbeef" onBack={() => {}} />)
    await waitFor(() => expect(screen.getByText('社群详情加载失败，请稍后重试')).toBeTruthy())
  })

  test('onBack', async () => {
    stubFetch({ ok: true, status: 200, json: async () => FULL })
    const onBack = vi.fn()
    render(<ScreenCommunityOperations coId="co-abc" onBack={onBack} />)
    fireEvent.click(screen.getByLabelText('返回'))
    expect(onBack).toHaveBeenCalledTimes(1)
  })
})
