import { describe, expect, test, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import { ScreenDraftList } from '../pages/mobile-workbench/ScreenDraftList'

vi.mock('../api/plan', async () => {
  const actual = await vi.importActual('../api/plan')
  return {
    ...actual,
    listPlanRuns: vi.fn(),
    getPlanRunStatus: vi.fn(),
    exportPlanPdf: vi.fn(),
    exportPlanXlsx: vi.fn(),
  }
})

import { listPlanRuns, getPlanRunStatus } from '../api/plan'
const mockList = vi.mocked(listPlanRuns)
const mockStatus = vi.mocked(getPlanRunStatus)

const COMPLETED_RUN = {
  run_id: 'run-aaa',
  status: 'completed',
  created_at: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
  brand_input: { brand_name: '跑力狮', product_matrix: '运动盟域（旗舰）' },
}

// 直读 checkpoint outputs（非 LLM 摘要）的结构
const RUN_STATUS_OUTPUTS = {
  strategy_generation: { positioning: '以跑步社群驱动品牌增长', key_messages: ['专业', '年轻'] },
  budget_kpi: {
    kpis: { 曝光量: '1000万', 互动量: '80万' },
    allocations: [{ category: '达人合作', percentage: 40, amount: 40 }],
  },
  action_recommendations: { actions: [{ title: '发起挑战赛', description: '联合达人发起' }] },
  execution_planning: { events_plan: '每月一场赛事', leagues_plan: '' },
}

describe('ScreenDraftList — 列表视图', () => {
  beforeEach(() => {
    mockList.mockReset()
    mockStatus.mockReset()
  })

  test('加载中显示骨架屏，完成后渲染草稿项', async () => {
    mockList.mockResolvedValue([COMPLETED_RUN])
    render(<ScreenDraftList onRestorePlan={() => {}} />)
    expect(document.querySelector('.mrd-skeleton-wrap')).toBeTruthy()
    await waitFor(() => expect(screen.getByText('跑力狮')).toBeTruthy())
    expect(screen.getByText('运动盟域')).toBeTruthy()
    expect(screen.queryByText('暂无已完成的方案草稿')).toBeNull()
  })

  test('无已完成草稿显示空态', async () => {
    mockList.mockResolvedValue([{ run_id: 'r1', status: 'running', created_at: new Date().toISOString() }])
    render(<ScreenDraftList onRestorePlan={() => {}} />)
    await waitFor(() => expect(screen.getByText('暂无已完成的方案草稿')).toBeTruthy())
    expect(screen.getByText('完成方案生成后会自动出现在这里')).toBeTruthy()
  })

  test('listPlanRuns 失败显示错误占位', async () => {
    mockList.mockRejectedValue(new Error('network'))
    render(<ScreenDraftList onRestorePlan={() => {}} />)
    await waitFor(() => expect(screen.getByText('草稿列表加载失败，请稍后重试')).toBeTruthy())
  })

  test('点击草稿进入详情并直读 outputs 渲染卡片', async () => {
    mockList.mockResolvedValue([COMPLETED_RUN])
    mockStatus.mockResolvedValue({ run_id: 'run-aaa', status: 'completed', outputs: RUN_STATUS_OUTPUTS } as never)
    render(<ScreenDraftList onRestorePlan={() => {}} />)
    await waitFor(() => expect(screen.getByText('跑力狮')).toBeTruthy())
    fireEvent.click(screen.getByText('跑力狮'))
    await waitFor(() => expect(screen.getByText('以跑步社群驱动品牌增长')).toBeTruthy())
    expect(screen.getByText(/发起挑战赛/)).toBeTruthy()
    // 直读 status，不调 summary
    expect(mockStatus).toHaveBeenCalledWith('run-aaa')
  })
})

describe('ScreenDraftList — 详情视图', () => {
  beforeEach(() => {
    mockList.mockReset()
    mockStatus.mockReset()
    mockList.mockResolvedValue([COMPLETED_RUN])
    mockStatus.mockResolvedValue({ run_id: 'run-aaa', status: 'completed', outputs: RUN_STATUS_OUTPUTS } as never)
  })

  test('点击"查看完整方案"调用 onRestorePlan(runId, preview)', async () => {
    const onRestorePlan = vi.fn()
    render(<ScreenDraftList onRestorePlan={onRestorePlan} />)
    await waitFor(() => expect(screen.getByText('跑力狮')).toBeTruthy())
    fireEvent.click(screen.getByText('跑力狮'))
    await waitFor(() => expect(screen.getByText('查看完整方案')).toBeTruthy())
    fireEvent.click(screen.getByText('查看完整方案'))
    expect(onRestorePlan).toHaveBeenCalledWith('run-aaa', 'preview')
  })

  test('点击"下一步行动建议"调用 onRestorePlan(runId, actions)', async () => {
    const onRestorePlan = vi.fn()
    render(<ScreenDraftList onRestorePlan={onRestorePlan} />)
    await waitFor(() => expect(screen.getByText('跑力狮')).toBeTruthy())
    fireEvent.click(screen.getByText('跑力狮'))
    await waitFor(() => expect(screen.getByText('下一步行动建议')).toBeTruthy())
    fireEvent.click(screen.getByText('下一步行动建议'))
    expect(onRestorePlan).toHaveBeenCalledWith('run-aaa', 'actions')
  })

  test('详情返回切回列表视图', async () => {
    render(<ScreenDraftList onRestorePlan={() => {}} />)
    await waitFor(() => expect(screen.getByText('跑力狮')).toBeTruthy())
    fireEvent.click(screen.getByText('跑力狮'))
    await waitFor(() => expect(screen.getByText('查看完整方案')).toBeTruthy())
    fireEvent.click(screen.getByLabelText('返回列表'))
    await waitFor(() => expect(screen.getByText('方案草稿')).toBeTruthy(), { timeout: 1500 })
  })

  test('getPlanRunStatus 失败显示详情错误占位', async () => {
    mockStatus.mockRejectedValue(new Error('boom'))
    render(<ScreenDraftList onRestorePlan={() => {}} />)
    await waitFor(() => expect(screen.getByText('跑力狮')).toBeTruthy())
    fireEvent.click(screen.getByText('跑力狮'))
    await waitFor(() => expect(screen.getByText('方案详情加载失败，请稍后重试')).toBeTruthy())
  })
})
