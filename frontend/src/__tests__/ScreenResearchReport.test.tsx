import { describe, expect, test, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { ScreenResearchReport } from '../pages/mobile-workbench/ScreenResearchReport'
import { ResearchResultNotFoundError } from '../api/marketAnalysis'

vi.mock('../api/marketAnalysis', async () => {
  const actual = await vi.importActual('../api/marketAnalysis')
  return {
    ...actual,
    fetchResearchResult: vi.fn(),
  }
})

import { fetchResearchResult } from '../api/marketAnalysis'
const mockFetch = vi.mocked(fetchResearchResult)

const FULL_RESULT = {
  market_name: '智能手表',
  industry: '可穿戴设备',
  category: '消费电子',
  market_size: { tam: { value: 1500, unit: '亿元', year: 2025 } },
  trend_signals: [{ title: '健康监测成为核心卖点', summary: 's', impact: 'positive' }],
  target_users: [{ segment_name: '运动爱好者' }],
  competitors: [{ brand_name: '华为', product_or_service: 'WATCH GT' }],
  opportunity_assessment: { market_attractiveness: 'high' },
  full_report: '# 完整报告\n内容',
}

describe('ScreenResearchReport', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  test('加载中显示骨架屏，200 后渲染板块', async () => {
    mockFetch.mockResolvedValue({ result: FULL_RESULT })
    render(<ScreenResearchReport researchId="mr-abc12345" onBack={() => {}} />)

    // 骨架屏存在
    expect(document.querySelector('.mrr-skeleton-wrap')).toBeTruthy()

    await waitFor(() => expect(screen.getByText('健康监测成为核心卖点')).toBeTruthy())
    expect(screen.getAllByText('智能手表').length).toBeGreaterThan(0)
    expect(screen.getByText('1个趋势 · 1类用户 · 1家竞品')).toBeTruthy()
    // 骨架屏消失
    expect(document.querySelector('.mrr-skeleton-wrap')).toBeNull()
  })

  test('404 显示过期占位', async () => {
    mockFetch.mockRejectedValue(new ResearchResultNotFoundError())
    render(<ScreenResearchReport researchId="mr-deadbeef" onBack={() => {}} />)
    await waitFor(() => expect(screen.getByText('报告数据已过期，请重新调研')).toBeTruthy())
  })

  test('网络错误显示通用失败占位', async () => {
    mockFetch.mockRejectedValue(new Error('network'))
    render(<ScreenResearchReport researchId="mr-abc12345" onBack={() => {}} />)
    await waitFor(() => expect(screen.getByText('报告加载失败，请稍后重试')).toBeTruthy())
  })

  test('点击返回触发 onBack', async () => {
    mockFetch.mockResolvedValue({ result: FULL_RESULT })
    const onBack = vi.fn()
    render(<ScreenResearchReport researchId="mr-abc12345" onBack={onBack} />)
    fireEvent.click(screen.getByLabelText('返回'))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  test('空 result 不 crash', async () => {
    mockFetch.mockResolvedValue({ result: {} })
    render(<ScreenResearchReport researchId="mr-abc12345" fallbackTitle="智能手表" onBack={() => {}} />)
    await waitFor(() => expect(document.querySelector('.mrr-skeleton-wrap')).toBeNull())
    expect(screen.getByText('智能手表')).toBeTruthy()
  })
})
