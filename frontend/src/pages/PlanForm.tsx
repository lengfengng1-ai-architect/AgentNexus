import { useState, useCallback } from 'react'
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
  status?: 'idle' | 'running' | 'failed' | 'completed'
}

// ─── Scene templates ─────────────────────────────────────────────────────────

interface SceneTemplate {
  label: string
  intent: string
  values: PlanFormData
}

const SCENE_TEMPLATES: SceneTemplate[] = [
  {
    label: '新品上市',
    intent:
      '我是娃哈哈，新推出魅力系列100%果汁，想在上海做新品上市营销，预算300万，周期3个月',
    values: {
      brandName: '娃哈哈',
      category: '魅力系列果汁',
      city: '上海',
      budget: 300,
      period: 3,
      marketingGoal: 'brand-awareness',
      positioning: '健康活力，全家共享的天然果汁',
      targetAudience: '18-40岁都市白领及家庭用户',
      productMatrix: '魅力100%果汁系列：橙汁/苹果汁/葡萄汁，1L家庭装，定价12-15元',
      history: '曾在抖音与健身达人合作推广营养快线，单条曝光超500万',
      constraints: '希望重点覆盖周末运动场景，避免深夜时段投放',
    },
  },
  {
    label: '赛事赞助',
    intent:
      '我们是某运动饮料品牌，想赞助北京马拉松相关赛事活动，预算500万，周期6个月',
    values: {
      brandName: '某运动饮料品牌',
      category: '运动饮料',
      city: '北京',
      budget: 500,
      period: 6,
      marketingGoal: 'brand-awareness',
      positioning: '专业运动补给，激发更好表现',
      targetAudience: '18-35岁跑步、健身人群',
      productMatrix: '电解质饮料/蛋白粉/能量胶，单瓶8-15元',
      history: '曾赞助多场校园篮球赛',
      constraints: '需要绑定至少3场大型赛事',
    },
  },
  {
    label: '达人推广',
    intent:
      '我们是瑜伽服饰品牌，想通过达人推广进入杭州市场，预算150万，周期3个月',
    values: {
      brandName: '某瑜伽服饰品牌',
      category: '瑜伽运动服饰',
      city: '杭州',
      budget: 150,
      period: 3,
      marketingGoal: 'sales-conversion',
      positioning: '柔软亲肤，陪伴每一次呼吸',
      targetAudience: '22-40岁女性瑜伽爱好者',
      productMatrix: '瑜伽裤/运动文胸/罩衫，单价200-500元',
      history: '在小红书有过小规模种草',
      constraints: '要求达人真实体验，禁止硬广',
    },
  },
  {
    label: '会员运营',
    intent:
      '我们是健身房连锁品牌，想在成都做会员拉新活动，预算200万，周期6个月',
    values: {
      brandName: '某健身连锁品牌',
      category: '健身服务',
      city: '成都',
      budget: 200,
      period: 6,
      marketingGoal: 'membership',
      positioning: '让运动成为生活习惯',
      targetAudience: '20-35岁都市白领',
      productMatrix: '月卡/季卡/私教课程，月卡299元起',
      history: '曾通过盟域活动获客',
      constraints: '需与盟域活动深度绑定',
    },
  },
]

// ─── Intent parsing (keyword-based, single-pass) ─────────────────────────────

function parseIntent(text: string): Partial<PlanFormData> {
  // 品牌名称: "我是XX，"
  const brandPatterns = [/我是(.+?)[，,]/]
  // 产品/品类: "新推出/推出/推广/做XX，"
  // ponytail: simple regex cascade; cover only common form variations
  const productPatterns = [
    /(?:品牌|公司).*?(?:新推出|推出|推广|做|策划)(.+?)[，,]/,
    /(?:推|做)(?:一个|一款|)(.+?)(?:营销|推广|市场|活动)/,
  ]
  // 城市: "在XX做/推广/市场/营销/活动"
  const cityPatterns = [/在(.+?)(?:做|推广|市场|做营销|做活动)/]
  // 预算: "预算XXX万/万元"
  const budgetPatterns = [/预算(\d+)(?:万|万元)/]
  // 周期: "周期X个月/月"
  const periodPatterns = [/周期(\d+)(?:个?月|个月)/]

  const parsed: Partial<PlanFormData> = {}

  for (const r of brandPatterns) {
    const m = text.match(r)
    if (m) {
      parsed.brandName = m[1].trim()
      break
    }
  }

  for (const r of productPatterns) {
    const m = text.match(r)
    if (m) {
      parsed.category = m[1].trim()
      break
    }
  }

  for (const r of cityPatterns) {
    const m = text.match(r)
    if (m) {
      const candidate = m[1].trim()
      if (['上海', '北京', '成都', '杭州', '广州'].includes(candidate)) {
        parsed.city = candidate
      }
      break
    }
  }

  for (const r of budgetPatterns) {
    const m = text.match(r)
    if (m) {
      parsed.budget = parseInt(m[1], 10)
      break
    }
  }

  for (const r of periodPatterns) {
    const m = text.match(r)
    if (m) {
      parsed.period = parseInt(m[1], 10)
      break
    }
  }

  // marketingGoal from keyword hints
  if (text.includes('拉新') || text.includes('获客')) parsed.marketingGoal = 'user-acquisition'
  else if (text.includes('转化') || text.includes('销售')) parsed.marketingGoal = 'sales-conversion'
  else if (text.includes('会员')) parsed.marketingGoal = 'membership'

  return parsed
}

// ─── Defaults ────────────────────────────────────────────────────────────────

const DEFAULT_FORM: PlanFormData = {
  brandName: '',
  category: '',
  city: '上海',
  budget: 300,
  period: 3,
  productMatrix: '',
  positioning: '',
  marketingGoal: 'brand-awareness',
  targetAudience: '',
  history: '',
  constraints: '',
}

// ─── Component ───────────────────────────────────────────────────────────────

export function PlanForm({ initial, onSubmit, isLoading, status }: PlanFormProps) {
  const [intent, setIntent] = useState('')
  const [form, setForm] = useState<PlanFormData>(() => ({
    ...DEFAULT_FORM,
    brandName: initial?.brand_name ?? '',
    category: initial?.category ?? '',
    city: initial?.city ?? DEFAULT_FORM.city,
    budget: initial?.budget ?? DEFAULT_FORM.budget,
    period: initial?.period ?? DEFAULT_FORM.period,
  }))
  const [advancedOpen, setAdvancedOpen] = useState(false)

  // ── Handlers ───────────────────────────────────────────────────────────

  const updateField = useCallback(
    <K extends keyof PlanFormData>(key: K, value: PlanFormData[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }))
    },
    [],
  )

  const applyScene = useCallback((template: SceneTemplate) => {
    setIntent(template.intent)
    setForm((prev) => ({ ...prev, ...template.values }))
  }, [])

  const handleIntentParse = useCallback(() => {
    const trimmed = intent.trim()
    if (!trimmed) return
    const parsed = parseIntent(trimmed)
    setForm((prev) => ({ ...prev, ...parsed }))
  }, [intent])

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
      {/* ── Intent input ── */}
      {!isRunning && (
      <div>
        <div className="mb-1.5 text-xs font-semibold uppercase tracking-[0.5px] text-slate-600">
          用一句话描述需求
        </div>
        <div className="relative">
          <textarea
            className="min-h-[52px] w-full resize-none rounded-[10px] border border-slate-200 bg-white px-3 py-2 pr-[42px] text-sm leading-snug text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-blue-800 focus:ring-[3px] focus:ring-blue-100"
            placeholder="例如：我是娃哈哈，想在上海推广一款新果汁，预算300万，周期3个月…"
            rows={2}
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
          />
          <button
            type="button"
            disabled={!intent.trim()}
            className="absolute bottom-2 right-2 flex h-[30px] w-[30px] items-center justify-center rounded-md border-none bg-blue-900 text-white transition-colors hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleIntentParse}
            aria-label="解析需求"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>

        {/* Scene chips */}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {SCENE_TEMPLATES.map((tpl) => (
            <button
              key={tpl.label}
              type="button"
              className="whitespace-nowrap rounded-[20px] border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-600 transition-colors hover:border-blue-800 hover:bg-blue-50 hover:text-blue-900"
              onClick={() => applyScene(tpl)}
            >
              {tpl.label}
            </button>
          ))}
        </div>
      </div>
      )}

      {/* ── Required fields ── */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[13px] font-bold text-slate-900">品牌信息</span>
          {isRunning && <span className="text-xs text-slate-400">（方案生成中）</span>}
          {!isRunning && <span className="text-[11px] text-orange-500">* 必填</span>}
        </div>

        <div className="space-y-2.5">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              品牌名称 <span className="text-orange-500">*</span>
            </label>
            <input
              type="text"
              className="w-full rounded-md border border-slate-200 px-3 py-2.5 text-[13px] text-slate-900 outline-none transition-colors focus:border-blue-800 focus:ring-[3px] focus:ring-blue-100"
              value={form.brandName}
              onChange={(e) => updateField('brandName', e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              产品/品类 <span className="text-orange-500">*</span>
            </label>
            <input
              type="text"
              className="w-full rounded-md border border-slate-200 px-3 py-2.5 text-[13px] text-slate-900 outline-none transition-colors focus:border-blue-800 focus:ring-[3px] focus:ring-blue-100"
              value={form.category}
              onChange={(e) => updateField('category', e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                目标城市 <span className="text-orange-500">*</span>
              </label>
              <select
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
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                执行周期 <span className="text-orange-500">*</span>
              </label>
              <select
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2.5 text-[13px] text-slate-900 outline-none transition-colors focus:border-blue-800 focus:ring-[3px] focus:ring-blue-100"
                value={form.period}
                onChange={(e) => updateField('period', Number(e.target.value))}
              >
                <option value={3}>3 个月</option>
                <option value={6}>6 个月</option>
                <option value={12}>12 个月</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              预算范围（万元） <span className="text-orange-500">*</span>
            </label>
            <input
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
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">产品矩阵</label>
              <textarea
                className="min-h-[64px] w-full resize-y rounded-md border border-slate-200 px-3 py-2.5 text-[13px] leading-relaxed text-slate-900 outline-none transition-colors focus:border-blue-800 focus:ring-[3px] focus:ring-blue-100"
                placeholder="产品线、规格、价位…"
                rows={2}
                value={form.productMatrix ?? ''}
                onChange={(e) => updateField('productMatrix', e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                品牌定位 / Slogan
              </label>
              <input
                type="text"
                className="w-full rounded-md border border-slate-200 px-3 py-2.5 text-[13px] text-slate-900 outline-none transition-colors focus:border-blue-800 focus:ring-[3px] focus:ring-blue-100"
                value={form.positioning ?? ''}
                onChange={(e) => updateField('positioning', e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                核心营销目标
              </label>
              <select
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
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">目标人群</label>
              <input
                type="text"
                className="w-full rounded-md border border-slate-200 px-3 py-2.5 text-[13px] text-slate-900 outline-none transition-colors focus:border-blue-800 focus:ring-[3px] focus:ring-blue-100"
                value={form.targetAudience ?? ''}
                onChange={(e) => updateField('targetAudience', e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                历史活动经验
              </label>
              <textarea
                className="min-h-[64px] w-full resize-y rounded-md border border-slate-200 px-3 py-2.5 text-[13px] leading-relaxed text-slate-900 outline-none transition-colors focus:border-blue-800 focus:ring-[3px] focus:ring-blue-100"
                placeholder="过往做过的营销活动、合作达人、效果…"
                rows={2}
                value={form.history ?? ''}
                onChange={(e) => updateField('history', e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-600">
                特殊限制 / 备注
              </label>
              <textarea
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

      {/* ── Generate button ── */}
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
    </form>
  )
}
