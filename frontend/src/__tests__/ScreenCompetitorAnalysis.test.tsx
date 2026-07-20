import { describe, expect, test, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { ScreenCompetitorAnalysis } from '../pages/mobile-workbench/ScreenCompetitorAnalysis'

const FULL = {
  category: '运动鞋',
  brand_name: '安踏',
  competitors: [
    { name: 'Nike', product_matrix: ['Air Max'], price_range: '400-1500元', positioning: '高端专业运动', sources: ['https://example.com'] },
  ],
  market_overview: '运动鞋市场竞争激烈',
  suggestion: '建议以中端性价比切入',
}

function stubFetch(r: { ok: boolean; status: number; json: () => Promise<unknown> }) {
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(r)))
}

describe('ScreenCompetitorAnalysis', () => {
  beforeEach(() => vi.unstubAllGlobals())

  test('加载→详情', async () => {
    stubFetch({ ok: true, status: 200, json: async () => FULL })
    render(<ScreenCompetitorAnalysis caId="ca-abc12345" onBack={() => {}} />)
    expect(document.querySelector('.mbu-skeleton-wrap')).toBeTruthy()
    await waitFor(() => expect(screen.getByText('运动鞋竞品分析 - 安踏')).toBeTruthy())
    expect(screen.getByText('Nike')).toBeTruthy()
    expect(screen.getByText('建议以中端性价比切入')).toBeTruthy()
  })

  test('404', async () => {
    stubFetch({ ok: false, status: 404, json: async () => ({}) })
    render(<ScreenCompetitorAnalysis caId="ca-deadbeef" onBack={() => {}} />)
    await waitFor(() => expect(screen.getByText('竞品分析数据已过期，请重新分析')).toBeTruthy())
  })

  test('500', async () => {
    stubFetch({ ok: false, status: 500, json: async () => ({}) })
    render(<ScreenCompetitorAnalysis caId="ca-deadbeef" onBack={() => {}} />)
    await waitFor(() => expect(screen.getByText('竞品详情加载失败，请稍后重试')).toBeTruthy())
  })

  test('onBack', async () => {
    stubFetch({ ok: true, status: 200, json: async () => FULL })
    const onBack = vi.fn()
    render(<ScreenCompetitorAnalysis caId="ca-abc" onBack={onBack} />)
    fireEvent.click(screen.getByLabelText('返回'))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  test('fallbackTitle', async () => {
    stubFetch({ ok: true, status: 200, json: async () => ({ ...FULL, category: '' }) })
    render(<ScreenCompetitorAnalysis caId="ca-abc" fallbackTitle="自定义分析" onBack={() => {}} />)
    await waitFor(() => expect(screen.getByText('自定义分析')).toBeTruthy())
  })
})
