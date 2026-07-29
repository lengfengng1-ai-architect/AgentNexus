// ScreenBrief 多城输入测试
// OpenSpec: openspec/changes/add-multi-city-linked-plan/specs/plan-generation-pipeline/spec.md
import { describe, expect, test, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ScreenBrief } from '../pages/mobile-workbench/ScreenBrief'

describe('ScreenBrief 多城输入', () => {
  test('首批城市含 6 城（含新增杭州）', () => {
    render(<ScreenBrief onNavigate={() => {}} />)
    for (const c of ['北京', '上海', '广州', '深圳', '成都', '杭州']) {
      expect(screen.getByText(c)).toBeDefined()
    }
  })

  test('多选城市可同时点亮（多城）', () => {
    render(<ScreenBrief onNavigate={() => {}} />)
    const sh = screen.getByText('上海')
    const cd = screen.getByText('成都')
    expect(sh.className).not.toContain('on')
    fireEvent.click(sh)
    fireEvent.click(cd)
    // 两座同时选中 → 多城
    expect(sh.className).toContain('on')
    expect(cd.className).toContain('on')
  })

  test('生成方案携带多城 selected_cities', () => {
    const onNavigate = vi.fn()
    const { container } = render(<ScreenBrief onNavigate={onNavigate} />)
    fireEvent.click(screen.getByText('上海'))
    fireEvent.click(screen.getByText('成都'))
    // 填品牌（必填，否则 handleGenerate 拦截）
    const brandInput = container.querySelectorAll('input')[0] as HTMLInputElement
    fireEvent.change(brandInput, { target: { value: '速动' } })
    fireEvent.click(document.querySelector('button.gen') as HTMLButtonElement)
    expect(onNavigate).toHaveBeenCalledWith(
      'generate',
      expect.objectContaining({ selected_cities: ['上海', '成都'] }),
    )
  })
})
