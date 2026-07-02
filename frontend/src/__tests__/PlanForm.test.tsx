import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, test } from 'vitest'
import { PlanForm } from '../pages/PlanForm'
import type { BrandInput } from '../types/chat'

describe('PlanForm', () => {
  test('renders all fields with empty initial values', () => {
    render(<PlanForm onSubmit={() => {}} />)
    expect(screen.getByPlaceholderText('例如：Nike')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('例如：运动服装')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('例如：上海')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('例如：200')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('例如：3')).toBeInTheDocument()
  })

  test('submit button is disabled when fields are empty', () => {
    render(<PlanForm onSubmit={() => {}} />)
    expect(screen.getByRole('button', { name: '开始生成方案' })).toBeDisabled()
  })

  test('submit button is disabled during loading', () => {
    render(<PlanForm onSubmit={() => {}} isLoading={true} />)
    expect(screen.getByRole('button', { name: /生成中/ })).toBeDisabled()
  })

  test('fills initial values when provided', () => {
    const initial: BrandInput = {
      brand_name: 'Nike',
      category: '运动服装',
      city: '上海',
      budget: 2000000,
      period: 6,
    }
    render(<PlanForm initial={initial} onSubmit={() => {}} />)
    const inputs = screen.getAllByRole('textbox') as HTMLInputElement[]
    const numberInputs = screen.getAllByDisplayValue('2000000') as HTMLInputElement[]
    expect(screen.getByDisplayValue('Nike')).toBeInTheDocument()
    expect(screen.getByDisplayValue('运动服装')).toBeInTheDocument()
    expect(screen.getByDisplayValue('上海')).toBeInTheDocument()
    expect(numberInputs.length).toBeGreaterThan(0)
  })

  test('calls onSubmit with values when submitted', () => {
    const handleSubmit = vi.fn()
    render(<PlanForm onSubmit={handleSubmit} />)
    fireEvent.change(screen.getByPlaceholderText('例如：Nike'), { target: { value: 'Adidas' } })
    fireEvent.change(screen.getByPlaceholderText('例如：运动服装'), { target: { value: '运动鞋' } })
    fireEvent.change(screen.getByPlaceholderText('例如：上海'), { target: { value: '北京' } })
    fireEvent.change(screen.getByPlaceholderText('例如：200'), { target: { value: '300' } })
    fireEvent.change(screen.getByPlaceholderText('例如：3'), { target: { value: '6' } })
    fireEvent.click(screen.getByRole('button', { name: '开始生成方案' }))
    expect(handleSubmit).toHaveBeenCalledWith({
      brand_name: 'Adidas',
      category: '运动鞋',
      city: '北京',
      budget: 300,
      period: 6,
    })
  })
})
