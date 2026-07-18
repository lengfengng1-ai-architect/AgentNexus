import { describe, expect, test, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { ScreenBudgetAssessment } from '../pages/mobile-workbench/ScreenBudgetAssessment'

// 不 mock fetchBudgetResult，改 stub 全局 fetch，让真实 fetchBudgetResult 跑：
// 200 → 解析结果；404 → 抛 BudgetResultNotFoundError → 过期态；500 → 错误态。
// 避免 vi.mock 的 rejected-promise 追踪在某些环境误报 unhandled rejection。
const FULL_RESULT = {
  category: '运动鞋',
  city: '上海',
  total_budget: 100,
  period_months: 3,
  allocations: [
    { category: '达人合作', amount: 30, percentage: 30 },
    { category: '内容制作', amount: 15, percentage: 15 },
  ],
  kpis: { 曝光量: '250万+', 转化率: '2.8%' },
  timeline: ['第1月（筹备期）：签约'],
  suggestion: '达人合作占比最高',
}

function stubFetch(response: { ok: boolean; status: number; json: () => Promise<unknown> }) {
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve(response)))
}

describe('ScreenBudgetAssessment', () => {
  beforeEach(() => vi.unstubAllGlobals())

  test('加载中显示骨架屏，200 后渲染详情', async () => {
    stubFetch({ ok: true, status: 200, json: async () => FULL_RESULT })
    render(<ScreenBudgetAssessment budgetId="ba-abc12345" onBack={() => {}} />)
    expect(document.querySelector('.mbu-skeleton-wrap')).toBeTruthy()
    await waitFor(() => expect(screen.getByText('运动鞋预算评估')).toBeTruthy())
    expect(screen.getByText('达人合作')).toBeTruthy()
    expect(screen.getByText('第1月（筹备期）：签约')).toBeTruthy()
    expect(screen.getByText(/达人合作占比最高/)).toBeTruthy()
  })

  test('404 显示过期占位', async () => {
    stubFetch({ ok: false, status: 404, json: async () => ({}) })
    render(<ScreenBudgetAssessment budgetId="ba-deadbeef" onBack={() => {}} />)
    await waitFor(() => expect(screen.getByText('预算评估数据已过期，请重新评估')).toBeTruthy())
  })

  test('网络错误显示通用失败占位', async () => {
    stubFetch({ ok: false, status: 500, json: async () => ({}) })
    render(<ScreenBudgetAssessment budgetId="ba-abc12345" onBack={() => {}} />)
    await waitFor(() => expect(screen.getByText('预算详情加载失败，请稍后重试')).toBeTruthy())
  })

  test('点击返回触发 onBack', async () => {
    stubFetch({ ok: true, status: 200, json: async () => FULL_RESULT })
    const onBack = vi.fn()
    render(<ScreenBudgetAssessment budgetId="ba-abc12345" onBack={onBack} />)
    fireEvent.click(screen.getByLabelText('返回'))
    expect(onBack).toHaveBeenCalledTimes(1)
  })

  test('fallbackTitle 兜底', async () => {
    stubFetch({ ok: true, status: 200, json: async () => ({ ...FULL_RESULT, category: '' }) })
    render(<ScreenBudgetAssessment budgetId="ba-abc12345" fallbackTitle="自定义预算" onBack={() => {}} />)
    await waitFor(() => expect(screen.getByText('自定义预算')).toBeTruthy())
  })
})
