import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, test, vi } from 'vitest'
import { PlanForm } from '../pages/PlanForm'
import type { BrandInput } from '../types/chat'

describe('PlanForm', () => {
  test('renders required fields', () => {
    render(<PlanForm onSubmit={() => {}} />)
    expect(screen.getByText('品牌信息')).toBeInTheDocument()
    expect(screen.getByText('品牌名称')).toBeInTheDocument()
    expect(screen.getByText('产品/品类')).toBeInTheDocument()
    expect(screen.getByText('目标城市')).toBeInTheDocument()
    expect(screen.getByText('预算范围（万元）')).toBeInTheDocument()
  })

  test('submit button is disabled when fields are empty', () => {
    render(<PlanForm onSubmit={() => {}} />)
    expect(screen.getByRole('button', { name: '生成营销方案' })).toBeDisabled()
  })

  test('submit button is disabled during loading', () => {
    render(<PlanForm onSubmit={() => {}} isLoading={true} />)
    expect(screen.getByRole('button', { name: /生成中/ })).toBeDisabled()
  })

  test('submit button is disabled when fields are empty', () => {
    render(<PlanForm onSubmit={() => {}} />)
    expect(screen.getByRole('button', { name: '生成营销方案' })).toBeDisabled()
  })

  test('fills initial values from BrandInput', () => {
    const initial: BrandInput = {
      brand_name: 'Nike',
      category: '运动服装',
      city: '北京',
      budget: 200,
      period: 6,
    }
    render(<PlanForm initial={initial} onSubmit={() => {}} />)
    expect(screen.getByDisplayValue('Nike')).toBeInTheDocument()
    expect(screen.getByDisplayValue('运动服装')).toBeInTheDocument()
    expect(screen.getByDisplayValue('200')).toBeInTheDocument()
  })

  test('calls onSubmit with PlanFormData when submitted', () => {
    const handleSubmit = vi.fn()
    render(<PlanForm onSubmit={handleSubmit} />)

    // Fill required fields
    const textInputs = screen.getAllByRole('textbox') as HTMLInputElement[]
    fireEvent.change(textInputs[0], { target: { value: 'Adidas' } })
    fireEvent.change(textInputs[1], { target: { value: '运动鞋' } })

    // Fill budget
    const spinbutton = screen.getByRole('spinbutton') as HTMLInputElement
    fireEvent.change(spinbutton, { target: { value: '500' } })

    // Fill period
    const selects = screen.getAllByRole('combobox')
    fireEvent.change(selects[1], { target: { value: '6' } })

    // Button should now be enabled
    fireEvent.click(screen.getByRole('button', { name: '生成营销方案' }))
    expect(handleSubmit).toHaveBeenCalledTimes(1)
  })

  test('does not show generate button when initial is provided (auto-submit)', () => {
    const initial: BrandInput = {
      brand_name: 'Nike',
      category: '运动鞋',
      city: '上海',
      budget: 300,
      period: 3,
    }
    render(<PlanForm initial={initial} onSubmit={() => {}} />)
    expect(screen.queryByRole('button', { name: '生成营销方案' })).not.toBeInTheDocument()
  })

  test('collapsible advanced section shows on click', () => {
    render(<PlanForm onSubmit={() => {}} />)
    expect(screen.getByText('补充信息（可选）')).toBeInTheDocument()
    fireEvent.click(screen.getByText('补充信息（可选）'))
    expect(screen.getByText('产品矩阵')).toBeInTheDocument()
  })
})
