import { describe, expect, test, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ActivityPlanningEntryCard } from '../components/ActivityPlanningEntryCard'

const FULL_RESULT = {
  sport_type: '羽毛球',
  city: '上海',
  candidates: [
    { name: '与你争锋·羽毛球公开赛', sport_type: '羽毛球', scale: '200人/场', frequency: '月度', sponsorship_options: ['冠名权'], exact_match: true },
  ],
  events_summary: { monthly: 156, avg_participants: 86, categories: ['城市马拉松'] },
  venues_summary: { count: 234, types: ['综合体育馆'], capacity: '平均420人/场' },
  suggestion: '推荐冠名月度羽毛球公开赛',
}

describe('ActivityPlanningEntryCard', () => {
  test('渲染标题/候选赛事/建议/按钮', () => {
    render(<ActivityPlanningEntryCard result={FULL_RESULT} onOpen={() => {}} />)
    expect(screen.getByText('羽毛球活动规划')).toBeTruthy()
    expect(screen.getByText('与你争锋·羽毛球公开赛')).toBeTruthy()
    expect(screen.getByText(/推荐冠名/)).toBeTruthy()
    expect(screen.getByText('查看活动详情')).toBeTruthy()
  })

  test('点击按钮触发 onOpen', () => {
    const onOpen = vi.fn()
    render(<ActivityPlanningEntryCard result={FULL_RESULT} onOpen={onOpen} />)
    fireEvent.click(screen.getByText('查看活动详情'))
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  test('缺 sport_type 用兜底标题', () => {
    render(<ActivityPlanningEntryCard result={{ ...FULL_RESULT, sport_type: '' }} onOpen={() => {}} />)
    expect(screen.getByText('活动规划')).toBeTruthy()
  })

  test('空 candidates 不 crash', () => {
    render(<ActivityPlanningEntryCard result={{ ...FULL_RESULT, candidates: [] }} onOpen={() => {}} />)
    expect(screen.getByText('羽毛球活动规划')).toBeTruthy()
  })
})
