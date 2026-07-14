// ScreenBrief — ② 简报屏
// OpenSpec: mobile-brief-connect-backend · specs/mobile-brief-connect/spec.md
// 表单 controlled state + AI 策略优化 + AI 生成方案跳转
// 支持从 ChatBubble「生成方案」携带 initialInput / initialBrandData 预填
import { useCallback, useMemo, useState } from 'react'
import { optimizeStrategy } from '../../api/plan'
import type { MobileScreen } from './ScreenChat'
import type { BrandInput } from '../../types/chat'

const CITIES = ['北京', '上海', '广州', '深圳', '成都']

export interface BriefFormData {
  brand_name: string
  category: string
  product_matrix: string
  target_audience: string
  marketing_goal: string
  period: string
  selected_cities: string[]
  core_strategy: string
}

interface ScreenBriefProps {
  onNavigate: (s: MobileScreen, data?: BriefFormData) => void
  initialInput?: string
  initialBrandData?: BrandInput
}

/** 从「方案模版」文本中正则提取字段：我是[品牌]，属于[品类]，产品线是[产品线]，目标人群[目标人群]，想在[城市]做活动，预算[金额]万，周期[时长]个月 */
function parseBriefInput(text: string): Partial<BriefFormData> {
  const r: Partial<BriefFormData> = {}
  const mBrand = text.match(/我是(.+?)[，,]/)
  if (mBrand) r.brand_name = mBrand[1].trim()
  const mCat = text.match(/属于(.+?)[，,]/)
  if (mCat) r.category = mCat[1].trim()
  const mProd = text.match(/产品线是(.+?)[，,]/)
  if (mProd) r.product_matrix = mProd[1].trim()
  const mAud = text.match(/目标人群(.+?)[，,]/)
  if (mAud) r.target_audience = mAud[1].trim()
  const mCity = text.match(/想在(.+?)做活动/)
  if (mCity) r.selected_cities = [mCity[1].trim()]
  const mBudget = text.match(/预算(\d+)/)
  if (mBudget) r.marketing_goal = `认知度 ≥80% · 预算 ${mBudget[1]}万`
  const mPeriod = text.match(/周期(\d+)个?月/)
  if (mPeriod) r.period = `${mPeriod[1]} 个月（${parseInt(mPeriod[1]) * 4} 周）`
  return r
}

export function ScreenBrief({ onNavigate, initialInput, initialBrandData }: ScreenBriefProps) {
  const mergedDefaults = useMemo(() => {
    const parsed = initialInput ? parseBriefInput(initialInput) : {}
    return {
      brand_name: initialBrandData?.brand_name ?? parsed.brand_name ?? '娃哈哈',
      category: initialBrandData?.category ?? parsed.category ?? '果汁饮料',
      product_matrix: parsed.product_matrix ?? '魅力系列（蓝莓/石榴/荔枝）',
      target_audience: parsed.target_audience ?? '25-35岁',
      marketing_goal: initialBrandData?.budget != null ? `认知度 ≥80% · 预算 ${initialBrandData.budget}万` : parsed.marketing_goal ?? '认知度 ≥60% · 私域会员 ≥50万',
      period: initialBrandData?.period != null ? `${initialBrandData.period} 个月（${initialBrandData.period * 4} 周）` : parsed.period ?? '3 个月（12 周）',
      selected_cities: initialBrandData?.city ? [initialBrandData.city] : parsed.selected_cities ?? ['北京', '上海', '广州', '深圳'],
      core_strategy: parsed.core_strategy ?? '以「运动盟域」为载体，4M+1C 集群营销模型，构建产品-场景-人群三位一体闭环。',
    }
  }, [initialInput, initialBrandData])

  const [brand, setBrand] = useState(mergedDefaults.brand_name)
  const [category, setCategory] = useState(mergedDefaults.category)
  const [productMatrix, setProductMatrix] = useState(mergedDefaults.product_matrix)
  const [targetAudience, setTargetAudience] = useState(mergedDefaults.target_audience)
  const [marketingGoal, setMarketingGoal] = useState(mergedDefaults.marketing_goal)
  const [period, setPeriod] = useState(mergedDefaults.period)
  const [selectedCities, setSelectedCities] = useState<string[]>(mergedDefaults.selected_cities)
  const [coreStrategy, setCoreStrategy] = useState(mergedDefaults.core_strategy)
  const [optimizing, setOptimizing] = useState(false)
  const [optError, setOptError] = useState<string | null>(null)
  const [genLoading, setGenLoading] = useState(false)

  const toggleCity = (c: string) => {
    setSelectedCities(prev => (prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]))
  }

  const handleOptimize = useCallback(async () => {
    setOptimizing(true)
    setOptError(null)
    try {
      const result = await optimizeStrategy({
        brand_name: brand,
        category,
        product_matrix: productMatrix,
        target_audience: targetAudience,
        marketing_goal: marketingGoal,
      })
      if (result) setCoreStrategy(result)
    } catch (err) {
      setOptError(err instanceof Error ? err.message : '优化失败')
    } finally {
      setOptimizing(false)
    }
  }, [brand, category, productMatrix, targetAudience, marketingGoal])

  const handleGenerate = useCallback(() => {
    if (!brand.trim()) {
      setOptError('请填写品牌名称')
      return
    }
    setGenLoading(true)
    const data: BriefFormData = {
      brand_name: brand,
      category,
      product_matrix: productMatrix,
      target_audience: targetAudience,
      marketing_goal: marketingGoal,
      period,
      selected_cities: selectedCities,
      core_strategy: coreStrategy,
    }
    onNavigate('generate', data)
  }, [brand, category, productMatrix, targetAudience, marketingGoal, period, selectedCities, coreStrategy, onNavigate])

  return (
    <>
      <div className="wk-head">
        <div className="brand">{brand} · {category}</div>
        <div className="name">{productMatrix}</div>
        <div className="matrix">
          {productMatrix.split(/[（(、，,）)]/).filter(s => s.length <= 10 && s.length > 0).slice(0, 3).map((s, i) => (
            <span key={i}>{s}</span>
          ))}
        </div>
        <div className="meta">
          <div><b>{category}</b></div>
          <div>{marketingGoal}</div>
          <div>{period}</div>
        </div>
      </div>
      <div className="sec"><h3>方案简报 <span className="more">存草稿</span></h3></div>
      <div className="form">
        <div className="field">
          <label>品牌 <span className="req">*</span></label>
          <input type="text" value={brand} onChange={e => setBrand(e.target.value)} />
        </div>
        <div className="field">
          <label>品类 <span className="req">*</span></label>
          <input type="text" value={category} onChange={e => setCategory(e.target.value)} />
        </div>
        <div className="field">
          <label>产品线 <span className="req">*</span></label>
          <input type="text" value={productMatrix} onChange={e => setProductMatrix(e.target.value)} />
        </div>
        <div className="field">
          <label>目标人群</label>
          <select value={targetAudience} onChange={e => setTargetAudience(e.target.value)}>
            <option>25-35岁</option>
            <option>运动健身爱好者</option>
            <option>新中产人群</option>
            <option>Z 世代</option>
          </select>
        </div>
        <div className="field">
          <label>营销目标</label>
          <input type="text" value={marketingGoal} onChange={e => setMarketingGoal(e.target.value)} />
        </div>
        <div className="field">
          <label>投放周期</label>
          <select value={period} onChange={e => setPeriod(e.target.value)}>
            <option>3 个月（12 周）</option>
            <option>1 个月</option>
            <option>6 个月</option>
          </select>
        </div>
        <div className="field">
          <label>首批城市</label>
          <div className="chips-multi">
            {CITIES.map(c => (
              <span key={c} className={'chip' + (selectedCities.includes(c) ? ' on' : '')} onClick={() => toggleCity(c)}>{c}</span>
            ))}
          </div>
        </div>
        <div className="field">
          <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            核心策略
            <button
              type="button"
              className="ai-opt-btn"
              disabled={optimizing}
              onClick={handleOptimize}
              style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 10,
                border: '1px solid var(--accent-border)',
                background: optimizing ? 'var(--surface)' : 'var(--accent-soft)',
                color: 'var(--accent)', cursor: 'pointer',
                fontFamily: 'var(--ff)', fontWeight: 600,
                display: 'inline-flex', alignItems: 'center', gap: 3,
              }}
            >
              {optimizing ? '⏳ 优化中…' : '✨ AI 优化'}
            </button>
          </label>
          <textarea
            rows={2}
            value={coreStrategy}
            onChange={e => setCoreStrategy(e.target.value)}
          />
          {optError && (
            <div style={{ fontSize: 11, color: '#dc2626', marginTop: 4 }}>{optError}</div>
          )}
        </div>
      </div>
      <div className="dock">
        <button className="gen" onClick={handleGenerate} disabled={genLoading}>
          {genLoading ? '⏳ 生成中…' : '✦ AI 生成方案'}
        </button>
      </div>
    </>
  )
}
