import { useCallback, useEffect, useState } from 'react'
import type { BrandInput } from '../types/chat'

// ─── Types ───────────────────────────────────────────────────────────────────

interface PlanFormData {
  brandName: string
  category: string
  city: string
  budget: number
  period: number
  productMatrix?: string
  positioning?: string
  marketingGoal?: string
  targetAudience?: string
  history?: string
  constraints?: string
}

interface PlanFormProps {
  initial?: BrandInput
  onSubmit: (data: PlanFormData) => void
  isLoading?: boolean
  status?: 'idle' | 'running' | 'paused' | 'failed' | 'completed'
}

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_FORM: PlanFormData = {
  brandName: '',
  category: '',
  city: '上海',
  budget: 0,
  period: 0,
  productMatrix: '',
  positioning: '',
  marketingGoal: 'brand-awareness',
  targetAudience: '',
  history: '',
  constraints: '',
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PlanForm({ initial, onSubmit, isLoading, status }: PlanFormProps) {
  const [form, setForm] = useState<PlanFormData>(DEFAULT_FORM)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [autoSubmitted, setAutoSubmitted] = useState(false)

  // Sync form when initial changes from chat
  useEffect(() => {
    if (initial) {
      setForm({
        ...DEFAULT_FORM,
        brandName: initial.brand_name ?? '',
        category: initial.category ?? '',
        city: initial.city ?? DEFAULT_FORM.city,
        budget: initial.budget ?? DEFAULT_FORM.budget,
        period: initial.period ?? DEFAULT_FORM.period,
      })
    }
  }, [initial])

  // Auto-submit when initial is received from chat
  useEffect(() => {
    if (initial && status === 'idle' && !autoSubmitted) {
      setAutoSubmitted(true)
      const data: PlanFormData = {
        brandName: initial.brand_name ?? '',
        category: initial.category ?? '',
        city: initial.city ?? DEFAULT_FORM.city,
        budget: initial.budget ?? DEFAULT_FORM.budget,
        period: initial.period ?? DEFAULT_FORM.period,
      }
      onSubmit(data)
    }
  }, [initial, status, onSubmit, autoSubmitted])

  // ── Handlers ───────────────────────────────────────────────────────────

  const updateField = useCallback(
    <K extends keyof PlanFormData>(key: K, value: PlanFormData[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }))
    },
    [],
  )

  const handleSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault()
      onSubmit(form)
    },
    [form, onSubmit],
  )

  // ── Derived ────────────────────────────────────────────────────────────

  const isRunning = status !== 'idle' && status !== undefined

  const requiredOk =
    form.brandName.trim() !== '' &&
    form.category.trim() !== '' &&
    form.city !== '' &&
    form.budget > 0 &&
    form.period > 0

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* ── Required fields ── */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[13px] font-bold text-slate-900">品牌信息</span>
          {isRunning && <span className="text-xs text-slate-400">（方案生成中）</span>}
          {!isRunning && <span className="text-[11px] text-orange-500">* 必填</span>}
        </div>

        <div className="space-y-2.5">
          <div>
            <label htmlFor="plan-brand-name" className="mb-1.5 block text-xs font-semibold text-slate-600">
              品牌名称 <span className="text-orange-500">*</span>
            </label>
            <input
              id="plan-brand-name"
              type="text"
              className="w-full rounded-md border border-slate-200 px-3 py-2.5 text-[13px] text-slate-900 outline-none transition-colors focus:border-blue-800 focus:ring-[3px] focus:ring-blue-100"
              value={form.brandName}
              onChange={(e) => updateField('brandName', e.target.value)}
            />
          </div>

          <div>
            <label htmlFor="plan-category" className="mb-1.5 block text-xs font-semibold text-slate-600">
              产品/品类 <span className="text-orange-500">*</span>
            </label>
            <input
              id="plan-category"
              type="text"
              className="w-full rounded-md border border-slate-200 px-3 py-2.5 text-[13px] text-slate-900 outline-none transition-colors focus:border-blue-800 focus:ring-[3px] focus:ring-blue-100"
              value={form.category}
              onChange={(e) => updateField('category', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="plan-city" className="mb-1.5 block text-xs font-semibold text-slate-600">
                目标城市 <span className="text-orange-500">*</span>
              </label>
              <select
                id="plan-city"
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-slate-900 outline-none transition-colors focus:border-blue-800 focus:ring-[3px] focus:ring-blue-100"
                value={form.city}
                onChange={(e) => updateField('city', e.target.value)}
              >
                <option value="上海">上海</option>
                <option value="北京">北京</option>
                <option value="成都">成都</option>
                <option value="杭州">杭州</option>
                <option value="广州">广州</option>
              </select>
            </div>
            <div>
              <label htmlFor="plan-period" className="mb-1.5 block text-xs font-semibold text-slate-600">
                执行周期 <span className="text-orange-500">*</span>
              </label>
              <select
                id="plan-period"
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-slate-900 outline-none transition-colors focus:border-blue-800 focus:ring-[3px] focus:ring-blue-100"
                value={form.period}
                onChange={(e) => updateField('period', Number(e.target.value))}
              >
                <option value={0}>请选择周期</option>
                <option value={1}>1 个月</option>
                <option value={2}>2 个月</option>
                <option value={3}>3 个月</option>
                <option value={6}>6 个月</option>
                <option value={12}>12 个月</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="plan-budget" className="mb-1.5 block text-xs font-semibold text-slate-600">
              预算范围（万元） <span className="text-orange-500">*</span>
            </label>
            <input
              id="plan-budget"
              type="number"
              className="w-full rounded-md border border-slate-200 px-3 py-2.5 text-[13px] text-slate-900 outline-none transition-colors focus:border-blue-800 focus:ring-[3px] focus:ring-blue-100"
              value={form.budget}
              onChange={(e) => updateField('budget', Number(e.target.value) || 0)}
            />
          </div>
        </div>
      </div>

      {/* ── Optional section (collapsible) ── */}
      <div>
        <button
          type="button"
          className="flex w-full cursor-pointer items-center justify-between border-b border-slate-100 py-1.5 hover:text-blue-900"
          onClick={() => setAdvancedOpen((o) => !o)}
        >
          <span className="text-[13px] font-bold text-slate-900">补充信息（可选）</span>
          <svg
            className={`text-slate-400 transition-transform ${advancedOpen ? 'rotate-180' : ''}`}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {(!isRunning && advancedOpen) && (
          <div className="space-y-2.5 pt-2.5">
            <div>
              <label htmlFor="plan-product-matrix" className="mb-1.5 block text-xs font-semibold text-slate-600">产品矩阵</label>
              <textarea
                id="plan-product-matrix"
                className="min-h-[64px] w-full resize-y rounded-md border border-slate-200 px-3 py-2.5 text-[13px] leading-relaxed text-slate-900 outline-none transition-colors focus:border-blue-800 focus:ring-[3px] focus:ring-blue-100"
                placeholder="产品线、规格、价位…"
                rows={2}
                value={form.productMatrix ?? ''}
                onChange={(e) => updateField('productMatrix', e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="plan-positioning" className="mb-1.5 block text-xs font-semibold text-slate-600">
                品牌定位 / Slogan
              </label>
              <input
                id="plan-positioning"
                type="text"
                className="w-full rounded-md border border-slate-200 px-3 py-2.5 text-[13px] text-slate-900 outline-none transition-colors focus:border-blue-800 focus:ring-[3px] focus:ring-blue-100"
                value={form.positioning ?? ''}
                onChange={(e) => updateField('positioning', e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="plan-marketing-goal" className="mb-1.5 block text-xs font-semibold text-slate-600">
                核心营销目标
              </label>
              <select
                id="plan-marketing-goal"
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-slate-900 outline-none transition-colors focus:border-blue-800 focus:ring-[3px] focus:ring-blue-100"
                value={form.marketingGoal ?? 'brand-awareness'}
                onChange={(e) => updateField('marketingGoal', e.target.value)}
              >
                <option value="brand-awareness">品牌曝光</option>
                <option value="user-acquisition">用户拉新</option>
                <option value="sales-conversion">销售转化</option>
                <option value="membership">会员沉淀</option>
              </select>
            </div>

            <div>
              <label htmlFor="plan-target-audience" className="mb-1.5 block text-xs font-semibold text-slate-600">目标人群</label>
              <input
                id="plan-target-audience"
                type="text"
                className="w-full rounded-md border border-slate-200 px-3 py-2.5 text-[13px] text-slate-900 outline-none transition-colors focus:border-blue-800 focus:ring-[3px] focus:ring-blue-100"
                value={form.targetAudience ?? ''}
                onChange={(e) => updateField('targetAudience', e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="plan-history" className="mb-1.5 block text-xs font-semibold text-slate-600">
                历史活动经验
              </label>
              <textarea
                id="plan-history"
                className="min-h-[64px] w-full resize-y rounded-md border border-slate-200 px-3 py-2.5 text-[13px] leading-relaxed text-slate-900 outline-none transition-colors focus:border-blue-800 focus:ring-[3px] focus:ring-blue-100"
                placeholder="过往做过的营销活动、合作达人、效果…"
                rows={2}
                value={form.history ?? ''}
                onChange={(e) => updateField('history', e.target.value)}
              />
            </div>

            <div>
              <label htmlFor="plan-constraints" className="mb-1.5 block text-xs font-semibold text-slate-600">
                特殊限制 / 备注
              </label>
              <textarea
                id="plan-constraints"
                className="min-h-[64px] w-full resize-y rounded-md border border-slate-200 px-3 py-2.5 text-[13px] leading-relaxed text-slate-900 outline-none transition-colors focus:border-blue-800 focus:ring-[3px] focus:ring-blue-100"
                placeholder="禁投渠道、时间窗口、特殊要求…"
                rows={2}
                value={form.constraints ?? ''}
                onChange={(e) => updateField('constraints', e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Generate button (only show when form can be manually edited) ── */}
      {!isRunning && !initial && (
        <button
          type="submit"
          disabled={!requiredOk || isLoading}
          className="flex w-full items-center justify-center gap-2 rounded-[10px] border-none bg-orange-500 px-4 py-2.5 text-[15px] font-bold text-white shadow-[0_4px_12px_rgba(249,115,22,0.25)] transition-all hover:-translate-y-px hover:bg-orange-600 hover:shadow-[0_6px_16px_rgba(249,115,22,0.3)] disabled:translate-y-0 cursor-not-allowed disabled:opacity-60 disabled:shadow-none"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
          {isLoading ? '生成中…' : '生成营销方案'}
        </button>
      )}
    </form>
  )
}
