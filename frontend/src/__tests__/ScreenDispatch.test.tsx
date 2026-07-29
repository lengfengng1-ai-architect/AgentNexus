// ScreenDispatch 多城汇总测试
// OpenSpec: openspec/changes/add-multi-city-linked-plan/specs/plan-generation-pipeline/spec.md
import { describe, expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ScreenDispatch } from '../pages/mobile-workbench/ScreenDispatch'
import type { PlanOutputs } from '../types/plan'

const multiCityOutputs = {
  plan_data_query: {
    cities: [
      { city: '上海', leagues: { count: 10, top_leagues: ['沪跑团'], avg_members: 1000 } },
      { city: '成都', leagues: { count: 8, top_leagues: ['蓉城跑团'], avg_members: 800 } },
    ],
  },
} as unknown as PlanOutputs

describe('ScreenDispatch 多城汇总', () => {
  test('盟域数真实求和（取代旧 leagueCount × cities.length 假倍数）', () => {
    render(<ScreenDispatch outputs={multiCityOutputs} briefData={null} />)
    // 10 + 8 = 18，而非旧逻辑 10 × 2 = 20
    expect(screen.getByText(/共 18 个运动盟域/)).toBeDefined()
    expect(screen.getByText(/下发至 2 城/)).toBeDefined()
  })

  test('盟域列表按城展开并标注所属城市', () => {
    render(<ScreenDispatch outputs={multiCityOutputs} briefData={null} />)
    expect(screen.getByText(/沪跑团 · 上海/)).toBeDefined()
    expect(screen.getByText(/蓉城跑团 · 成都/)).toBeDefined()
  })
})
