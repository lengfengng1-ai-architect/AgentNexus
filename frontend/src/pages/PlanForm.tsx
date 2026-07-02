import { useState } from 'react'
import type { BrandInput } from '../types/chat'

const FIELDS: { key: keyof BrandInput; label: string; placeholder: string; type?: string }[] = [
  { key: 'brand_name', label: '品牌名称', placeholder: '例如：Nike' },
  { key: 'category', label: '品牌品类', placeholder: '例如：运动服装' },
  { key: 'city', label: '目标城市', placeholder: '例如：上海' },
  { key: 'budget', label: '预算（万元）', placeholder: '例如：200', type: 'number' },
  { key: 'period', label: '执行周期（月）', placeholder: '例如：3', type: 'number' },
]

interface PlanFormProps {
  initial?: BrandInput
  onSubmit: (brandInput: BrandInput) => void
  isLoading?: boolean
}

export function PlanForm({ initial, onSubmit, isLoading }: PlanFormProps) {
  const [values, setValues] = useState<BrandInput>({
    brand_name: initial?.brand_name ?? null,
    category: initial?.category ?? null,
    city: initial?.city ?? null,
    budget: initial?.budget ?? null,
    period: initial?.period ?? null,
  })

  function handleChange(key: keyof BrandInput, value: string) {
    setValues((prev: BrandInput) => ({
      ...prev,
      [key]: value === '' ? null : key === 'budget' || key === 'period' ? Number(value) : value,
    }))
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    onSubmit(values)
  }

  const isComplete = FIELDS.every((f) => values[f.key] !== null && values[f.key] !== '')

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {FIELDS.map((field) => (
        <label key={String(field.key)} className="block">
          <span className="mb-1 block text-xs font-medium text-track/70">{field.label}</span>
          <input
            type={field.type || 'text'}
            value={values[field.key] ?? ''}
            onChange={(e) => handleChange(field.key, e.target.value)}
            placeholder={field.placeholder}
            className="w-full rounded-lg border border-line bg-white px-3 py-2 text-sm outline-none transition-colors focus:border-start focus:ring-1 focus:ring-start"
          />
        </label>
      ))}
      <button
        type="submit"
        disabled={!isComplete || isLoading}
        className="w-full rounded-xl bg-start py-2.5 text-sm font-medium text-white transition-colors hover:bg-start/90 disabled:cursor-not-allowed disabled:bg-line disabled:text-track/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-start"
      >
        {isLoading ? '生成中…' : '开始生成方案'}
      </button>
    </form>
  )
}
