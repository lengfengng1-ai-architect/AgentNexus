import { describe, expect, test, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { BudgetAssessmentEntryCard } from '../components/BudgetAssessmentEntryCard'

const FULL_RESULT = {
  category: '运动鞋',
  city: '上海',
  total_budget: 100,
  period_months: 3,
  allocations: [
    { category: '达人合作', amount: 30, percentage: 30 },
    { category: '内容制作', amount: 15, percentage: 15 },
    { category: '活动执行', amount: 25, percentage: 25 },
    { category: '平台投放', amount: 20, percentage: 20 },
    { category: '运营资源', amount: 10, percentage: 10 },
  ],
  kpis: { 曝光量: '250万+', 互动量: '10万+', 线索数: '5000+', 转化率: '2.8%' },
  timeline: ['第1月（筹备期）：签约', '第2月（爆发期）：投放'],
  suggestion: '达人合作占比最高，建议优先签约运动达人',
}

describe('BudgetAssessmentEntryCard', () => {
  beforeEach(() => vi.clearAllMocks())

  test('渲染标题/分配/KPI/建议/按钮', () => {
    render(<BudgetAssessmentEntryCard result={FULL_RESULT} onOpen={() => {}} />)
    expect(screen.getByText('运动鞋预算评估')).toBeTruthy()
    expect(screen.getByText(/100万 \/ 3个月/)).toBeTruthy()
    expect(screen.getByText('达人合作')).toBeTruthy()
    expect(screen.getByText('250万+')).toBeTruthy()
    expect(screen.getByText(/达人合作占比最高/)).toBeTruthy()
    expect(screen.getByText('查看预算详情')).toBeTruthy()
  })

  test('点击按钮触发 onOpen', () => {
    const onOpen = vi.fn()
    render(<BudgetAssessmentEntryCard result={FULL_RESULT} onOpen={onOpen} />)
    fireEvent.click(screen.getByText('查看预算详情'))
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  test('缺 category 用兜底标题', () => {
    const r = { ...FULL_RESULT, category: '' }
    render(<BudgetAssessmentEntryCard result={r} onOpen={() => {}} />)
    expect(screen.getByText('预算评估')).toBeTruthy()
  })

  test('空 allocations 不 crash', () => {
    render(<BudgetAssessmentEntryCard result={{ ...FULL_RESULT, allocations: [] }} onOpen={() => {}} />)
    expect(screen.getByText('运动鞋预算评估')).toBeTruthy()
  })

  test('最小 result 不 crash', () => {
    render(<BudgetAssessmentEntryCard result={{}} onOpen={() => {}} />)
    expect(screen.getByText('预算评估')).toBeTruthy()
  })
})
