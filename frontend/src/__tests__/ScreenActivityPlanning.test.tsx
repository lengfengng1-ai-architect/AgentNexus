import { describe, expect, test, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { ScreenActivityPlanning } from '../pages/mobile-workbench/ScreenActivityPlanning'

// 不 mock fetchActivityResult，改 stub 全局 fetch（避免 vi.mock rejection 追踪问题）
const FULL_RESULT = {
  sport_type: '羽毛球',
  city: '上海',
  candidates: [
    { name: '与你争锋·羽毛球公开赛', sport_type: '羽毛球', scale: '200人/场', frequency: '月度', sponsorship_options: ['冠名权（30万/场）'], exact_match: true },
  ],
  events_summary: { monthly: 156, avg_participants: 86, categories: ['城市马拉松', '趣味跑'] },
  venues_summary: { count: 234, types: ['综合体育馆'], capacity: '平均420人/场' },
  suggestion: '推荐冠名月度赛事',
}

function stubFetch(response: { ok: boolean; status: number; json: () => Promise<unknown> }) {
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(response)))
}

describe('ScreenActivityPlanning', () => {
  beforeEach(() => vi.unstubAllGlobals())

  test('加载中显示骨架屏，200 后渲染详情', async () => {
    stubFetch({ ok: true, status: 200, json: async () => FULL_RESULT })
    render(<ScreenActivityPlanning activityId="ap-abc12345" onBack={() => {}} />)
    expect(document.querySelector('.map-skeleton-wrap')).toBeTruthy()
    await waitFor(() => expect(screen.getByText('羽毛球活动规划')).toBeTruthy())
    expect(screen.getByText('与你争锋·羽毛球公开赛')).toBeTruthy()
    expect(screen.getByText('冠名权（30万/场）')).toBeTruthy()
    expect(screen.getByText(/推荐冠名/)).toBeTruthy()
  })

  test('404 显示过期占位', async () => {
    stubFetch({ ok: false, status: 404, json: async () => ({}) })
    render(<ScreenActivityPlanning activityId="ap-deadbeef" onBack={() => {}} />)
    await waitFor(() => expect(screen.getByText('活动规划数据已过期，请重新规划')).toBeTruthy())
  })

  test('500 显示失败占位', async () => {
    stubFetch({ ok: false, status: 500, json: async () => ({}) })
    render(<ScreenActivityPlanning activityId="ap-abc12345" onBack={() => {}} />)
    await waitFor(() => expect(screen.getByText('活动详情加载失败，请稍后重试')).toBeTruthy())
  })

  test('点击返回触发 onBack', async () => {
    stubFetch({ ok: true, status: 200, json: async () => FULL_RESULT })
    const onBack = vi.fn()
    render(<ScreenActivityPlanning activityId="ap-abc12345" onBack={onBack} />)
    fireEvent.click(screen.getByLabelText('返回'))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  test('fallbackTitle 兜底', async () => {
    stubFetch({ ok: true, status: 200, json: async () => ({ ...FULL_RESULT, sport_type: '' }) })
    render(<ScreenActivityPlanning activityId="ap-abc12345" fallbackTitle="自定义活动" onBack={() => {}} />)
    await waitFor(() => expect(screen.getByText('自定义活动')).toBeTruthy())
  })
})
