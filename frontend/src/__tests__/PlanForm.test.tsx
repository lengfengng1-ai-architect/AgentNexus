import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { PlanForm } from '../pages/PlanForm'
import type { BrandInput } from '../types/chat'

describe('PlanForm', () => {
  test('renders intent textarea and scene chips', () => {
    render(<PlanForm onSubmit={() => {}} />)
    expect(screen.getByPlaceholderText(/我是娃哈哈/)).toBeInTheDocument()
    expect(screen.getByText('新品上市')).toBeInTheDocument()
    expect(screen.getByText('赛事赞助')).toBeInTheDocument()
    expect(screen.getByText('达人推广')).toBeInTheDocument()
    expect(screen.getByText('会员运营')).toBeInTheDocument()
  })

  test('renders required fields', () => {
    render(<PlanForm onSubmit={() => {}} />)
    expect(screen.getByText('品牌信息')).toBeInTheDocument()
  })

  test('submit button is disabled when fields are empty', () => {
    render(<PlanForm onSubmit={() => {}} />)
    expect(screen.getByRole('button', { name: '生成营销方案' })).toBeDisabled()
  })

  test('submit button is disabled during loading', () => {
    render(<PlanForm onSubmit={() => {}} isLoading={true} />)
    expect(screen.getByRole('button', { name: /生成中/ })).toBeDisabled()
  })

  test('fills initial values from BrandInput', () => {
    const initial: BrandInput = {
      brand_name: 'Nike',
      category: '运动服装',
      city: '上海',
      budget: 200,
      period: 6,
    }
    render(<PlanForm initial={initial} onSubmit={() => {}} />)
    expect(screen.getByDisplayValue('Nike')).toBeInTheDocument()
    expect(screen.getByDisplayValue('运动服装')).toBeInTheDocument()
  })

  test('calls onSubmit with PlanFormData when submitted', () => {
    const handleSubmit = vi.fn()
    render(<PlanForm onSubmit={handleSubmit} />)

    // Fill required fields: brandName and category inputs
    // The inputs are text inputs with empty default values
    const textInputs = screen.getAllByRole('textbox') as HTMLInputElement[]
    // textInputs[0] = intent textarea, textInputs[1] = brandName, textInputs[2] = category
    fireEvent.change(textInputs[1], { target: { value: 'Adidas' } })
    fireEvent.change(textInputs[2], { target: { value: '运动鞋' } })

    // Button should now be enabled (city=上海, budget=300, period=3 are defaults)
    fireEvent.click(screen.getByRole('button', { name: '生成营销方案' }))
    expect(handleSubmit).toHaveBeenCalledTimes(1)
  })
})
