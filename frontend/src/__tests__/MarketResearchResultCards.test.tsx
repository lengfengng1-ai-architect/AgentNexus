import { describe, expect, test } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MarketResearchResultCards } from '../components/MarketResearchResultCards'

describe('MarketResearchResultCards', () => {
  test('renders summary card when market_name is provided', () => {
    const result = {
      market_name: '智能运动穿戴',
      industry: '消费电子',
      category: '智能穿戴',
      geo_scope: '中国大陆',
      focus_period: '近3年',
    }
    render(<MarketResearchResultCards result={result} />)
    expect(screen.getByText('智能运动穿戴')).toBeTruthy()
    expect(screen.getByText('消费电子')).toBeTruthy()
    expect(screen.getByText('智能穿戴')).toBeTruthy()
    expect(screen.getByText('中国大陆')).toBeTruthy()
  })

  test('renders market size card with TAM/SAM/SOM', () => {
    const result = {
      market_size: {
        tam: { value: 1000, unit: '亿元人民币', year: 2024 },
        sam: { value: 500, unit: '亿元人民币', year: 2024 },
        som: { value: 100, unit: '亿元人民币', year: 2024 },
        cagr: 15.5,
        cagr_period: '2024-2029',
      },
    }
    render(<MarketResearchResultCards result={result} />)
    expect(screen.getByText('市场规模')).toBeTruthy()
    expect(screen.getByText(/1,000/)).toBeTruthy()
    expect(screen.getByText(/500/)).toBeTruthy()
    expect(screen.getByText(/100/)).toBeTruthy()
    expect(screen.getByText(/15.5/)).toBeTruthy()
  })

  test('renders trend signals with impact badges', () => {
    const result = {
      trend_signals: [
        { title: 'AI 健身趋势', summary: '越来越多用户使用 AI 健身教练', signal_type: '消费行为', impact: 'positive' },
        { title: '运动社交化', summary: '运动+社交成为新方向', signal_type: '技术', impact: 'neutral' },
      ],
    }
    render(<MarketResearchResultCards result={result} />)
    expect(screen.getByText('AI 健身趋势')).toBeTruthy()
    expect(screen.getByText('运动社交化')).toBeTruthy()
    expect(screen.getByText('利好')).toBeTruthy()
    expect(screen.getByText('中性')).toBeTruthy()
  })

  test('renders target users', () => {
    const result = {
      target_users: [
        {
          segment_name: '年轻白领',
          user_profile: '25-35 岁，一线城市上班族',
          core_scenarios: ['健身房', '户外跑步'],
          pain_points: ['缺乏专业指导', '时间碎片化'],
        },
      ],
    }
    render(<MarketResearchResultCards result={result} />)
    expect(screen.getByText('年轻白领')).toBeTruthy()
    expect(screen.getByText('25-35 岁，一线城市上班族')).toBeTruthy()
    expect(screen.getByText('健身房')).toBeTruthy()
    expect(screen.getByText('缺乏专业指导')).toBeTruthy()
  })

  test('renders competitive landscape via existing component', () => {
    const result = {
      competitors: [
        { brand_name: '品牌A', product_or_service: '运动鞋', pricing: '500-800元', company_name: '公司A' },
      ],
    }
    render(<MarketResearchResultCards result={result} />)
    expect(screen.getByText('竞争格局')).toBeTruthy()
    expect(screen.getByText('品牌A')).toBeTruthy()
    expect(screen.getByText('500-800元')).toBeTruthy()
  })

  test('renders opportunity assessment', () => {
    const result = {
      opportunity_assessment: {
        market_attractiveness: 'high',
        competition_intensity: 'medium',
        entry_difficulty: 'low',
        key_opportunities: ['市场增长快', '政策支持'],
        key_risks: ['竞争加剧'],
      },
    }
    render(<MarketResearchResultCards result={result} />)
    expect(screen.getByText('机会评估')).toBeTruthy()
    expect(screen.getByText('高')).toBeTruthy()
    expect(screen.getByText('中')).toBeTruthy()
    expect(screen.getByText('低')).toBeTruthy()
    expect(screen.getByText('市场增长快')).toBeTruthy()
    expect(screen.getByText('竞争加剧')).toBeTruthy()
  })

  test('renders evidence list with expand/collapse', () => {
    const evidence = [
      { source_url: 'https://example.com/1', source_name: '报告1', claim: '市场规模持续增长' },
      { source_url: 'https://example.com/2', source_name: '报告2', claim: '用户需求多样化' },
      { source_url: 'https://example.com/3', source_name: '报告3', claim: '新进入者增多' },
      { source_url: 'https://example.com/4', source_name: '报告4', claim: '技术门槛降低' },
    ]
    render(<MarketResearchResultCards result={{ evidence }} />)
    expect(screen.getByText(/报告1/)).toBeTruthy()
    expect(screen.getByText('展开全部 4 条')).toBeTruthy()
  })

  test('renders nothing when no data', () => {
    const { container } = render(<MarketResearchResultCards result={{}} />)
    // Should not crash, and should have no card divs
    expect(container.querySelectorAll('.rounded-xl')).toHaveLength(0)
  })
})
