import { describe, expect, test, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ResearchReportEntryCard } from '../components/ResearchReportEntryCard'

const FULL_RESULT = {
  market_name: '智能手表',
  market_size: {
    tam: { value: 1500, unit: '亿元', year: 2025 },
    sam: {},
    som: {},
    cagr: 8.2,
    cagr_period: '2025-2030',
  },
  trend_signals: [{ title: 't1' }],
  target_users: [{ segment_name: 'u1' }],
  competitors: [{ brand: 'b1' }],
  opportunity_assessment: {
    market_attractiveness: 'high',
    competition_intensity: 'medium',
    entry_difficulty: 'low',
  },
  full_report: '# 报告',
}

describe('ResearchReportEntryCard', () => {
  test('完整数据：标题、副标题、TAM/CAGR、badges、按钮全部渲染', () => {
    render(<ResearchReportEntryCard result={FULL_RESULT} onOpen={() => {}} />)
    expect(screen.getByText('智能手表调研报告')).toBeTruthy()
    expect(screen.getByText(/已完成 · \d+ 个板块/)).toBeTruthy()
    expect(screen.getByText('1,500')).toBeTruthy()
    expect(screen.getByText('8.2%')).toBeTruthy()
    expect(screen.getByText('吸引力 高')).toBeTruthy()
    expect(screen.getByText('竞争 中')).toBeTruthy()
    expect(screen.getByText('进入难度 低')).toBeTruthy()
    expect(screen.getByText('查看完整调研报告')).toBeTruthy()
  })

  test('缺 market_size：数字区不渲染，其余正常', () => {
    const { market_size, ...rest } = FULL_RESULT
    const { container } = render(<ResearchReportEntryCard result={rest} onOpen={() => {}} />)
    expect(container.querySelector('.rre-nums')).toBeNull()
    expect(screen.getByText('智能手表调研报告')).toBeTruthy()
    expect(screen.getByText('查看完整调研报告')).toBeTruthy()
  })

  test('缺 opportunity_assessment：badges 不渲染', () => {
    const { opportunity_assessment, ...rest } = FULL_RESULT
    const { container } = render(<ResearchReportEntryCard result={rest} onOpen={() => {}} />)
    expect(container.querySelector('.rre-badges')).toBeNull()
  })

  test('market_name 为空：兜底标题', () => {
    const { market_name, ...rest } = FULL_RESULT
    render(<ResearchReportEntryCard result={rest} onOpen={() => {}} />)
    expect(screen.getByText('市场调研报告')).toBeTruthy()
  })

  test('点击按钮触发 onOpen 回调', () => {
    const onOpen = vi.fn()
    render(<ResearchReportEntryCard result={FULL_RESULT} onOpen={onOpen} />)
    fireEvent.click(screen.getByText('查看完整调研报告'))
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  test('极简数据（{}）：只有标题 + 按钮也成立', () => {
    render(<ResearchReportEntryCard result={{}} onOpen={() => {}} />)
    expect(screen.getByText('市场调研报告')).toBeTruthy()
    expect(screen.getByText('查看完整调研报告')).toBeTruthy()
  })
})
