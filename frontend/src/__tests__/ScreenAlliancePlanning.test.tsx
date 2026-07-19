import { describe, expect, test, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { ScreenAlliancePlanning } from '../pages/mobile-workbench/ScreenAlliancePlanning'

const FULL = { category: '运动鞋', city: '上海', leagues: { count: 342, top_leagues: ['沪跑团'], avg_members: 1280 },
  recruitments: [{ title: '运动盟域代理商招募', type: '代理商招募', target_count: 30, requirements: ['有资源'] }],
  influencers: { count: 568, tiers: { '至尊/大师': 12 }, avg_quote: '1.2万/条' },
  suggestion: '测试建议' }

function stubFetch(r: { ok: boolean; status: number; json: () => Promise<unknown> }) {
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(r)))
}

describe('ScreenAlliancePlanning', () => {
  beforeEach(() => vi.unstubAllGlobals())
  test('加载→详情', async () => {
    stubFetch({ ok: true, status: 200, json: async () => FULL })
    render(<ScreenAlliancePlanning allianceId="al-abc12345" onBack={() => {}} />)
    expect(document.querySelector('.mal-skeleton-wrap')).toBeTruthy()
    await waitFor(() => expect(screen.getByText('运动鞋盟域规划')).toBeTruthy())
    expect(screen.getByText('沪跑团')).toBeTruthy()
    expect(screen.getByText('代理商招募 · 目标 30 个')).toBeTruthy()
  })
  test('404', async () => {
    stubFetch({ ok: false, status: 404, json: async () => ({}) })
    render(<ScreenAlliancePlanning allianceId="al-deadbeef" onBack={() => {}} />)
    await waitFor(() => expect(screen.getByText('盟域规划数据已过期，请重新规划')).toBeTruthy())
  })
  test('500', async () => {
    stubFetch({ ok: false, status: 500, json: async () => ({}) })
    render(<ScreenAlliancePlanning allianceId="al-deadbeef" onBack={() => {}} />)
    await waitFor(() => expect(screen.getByText('盟域详情加载失败，请稍后重试')).toBeTruthy())
  })
  test('onBack', async () => {
    stubFetch({ ok: true, status: 200, json: async () => FULL })
    const onBack = vi.fn(); render(<ScreenAlliancePlanning allianceId="al-abc" onBack={onBack} />)
    fireEvent.click(screen.getByLabelText('返回'))
    expect(onBack).toHaveBeenCalledTimes(1)
  })
  test('fallbackTitle', async () => {
    stubFetch({ ok: true, status: 200, json: async () => ({ ...FULL, category: '' }) })
    render(<ScreenAlliancePlanning allianceId="al-abc" fallbackTitle="自定义盟域" onBack={() => {}} />)
    await waitFor(() => expect(screen.getByText('自定义盟域')).toBeTruthy())
  })
})
