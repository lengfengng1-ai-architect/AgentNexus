// ScreenBudgetPreview — 预算预览屏
// 交互式饼图拖拽调整 + KPI 联动 + 里程碑展示 + 底部备注
import { useCallback, useEffect, useRef, useState } from 'react'
import type { MobileScreen } from './ScreenChat'

const COLORS = ['#1677ff', '#52c41a', '#fa8c16', '#eb2f96', '#722ed1']

interface BudgetAllocation {
  category: string
  percentage: number
  amount: number
}

interface ScreenBudgetPreviewProps {
  onNavigate: (s: MobileScreen) => void
  totalBudget: number
  periodMonths: number
  initialAllocations: BudgetAllocation[]
  initialKpis: Record<string, string>
  initialTimeline: string[]
  onBack: (allocations: BudgetAllocation[]) => void
  /** 是否正在重新生成（后端执行中，显示转圈） */
  loading?: boolean
  /** 用户输入反馈后触发重新生成 */
  onRegenerate?: (feedback: string) => void
}

const MS_COLORS = ['#1677ff', '#52c41a', '#fa8c16', '#eb2f96', '#722ed1', '#13c2c2', '#f5222d', '#2f54eb', '#faad14', '#a0d911']

// 里程碑内容模板矩阵：预算类别 → [早期, 中期, 晚期]
// 里程碑阶段定义：预热期、爆发期、收尾期
const STAGE_NAMES = ['预热期', '爆发期', '收尾期']
const STAGE_ICONS = ['📢', '🚀', '📊']

// 里程碑内容模板矩阵：预算类别 → [预热期, 爆发期, 收尾期]
const STAGE_TASKS: Record<string, [string, string, string]> = {
  '达人合作': ['筛选签约核心达人矩阵', '达人内容共创与全渠道发布', '达人效果复盘与长尾二创'],
  '内容制作': ['创意概念打磨与素材批量拍摄', '多版本内容制作与 A/B 测试', '爆款内容二次加工与沉淀'],
  '活动执行': ['活动场地确认与物料筹备预售', '线下活动全面引爆与线上同步', '活动热度延续与案例包装'],
  '平台投放': ['投放策略制定与定向测试', '全渠道精准放量与预算优化', '投放数据回收与ROI分析'],
  '运营资源': ['社群预热招募与种子用户积累', '互动活动持续运营与裂变', '数据复盘与案例沉淀包装'],
}

/** 根据预算分配和阶段自动生成里程碑描述 */
function autoMilestoneDesc(allocations: BudgetAllocation[], stageIdx: number, budget: number): string {
  // 1. 找到占比最高的类别
  const sorted = [...allocations].sort((a, b) => b.percentage - a.percentage)
  const top = sorted[0]
  const top2 = sorted[1]

  // 2. 生成描述
  let desc: string
  if (top.percentage > 40) {
    // 单一主线贯穿全周期
    const tasks = STAGE_TASKS[top.category]
    desc = tasks?.[stageIdx] || `${top.category}相关工作`
  } else if (top.percentage > 25) {
    const tasks = STAGE_TASKS[top.category]
    desc = tasks?.[stageIdx] || `${top.category}相关工作`
  } else {
    const t1 = STAGE_TASKS[top.category]?.[stageIdx] || top.category
    const t2 = STAGE_TASKS[top2.category]?.[stageIdx] || top2.category
    desc = `${t1}与${t2}`
  }

  // 3. 金额高则加力度词
  if (top.amount >= 60) {
    desc = '重点' + desc
  } else if (top.amount >= 30) {
    desc = '持续' + desc
  }

  return desc
}

export function ScreenBudgetPreview({
  onNavigate,
  totalBudget: initialBudget,
  periodMonths: initialPeriod,
  initialAllocations,
  initialKpis,
  initialTimeline,
  onBack,
  loading = false,
  onRegenerate,
}: ScreenBudgetPreviewProps) {
  const [allocations, setAllocations] = useState<BudgetAllocation[]>(initialAllocations)
  const [editableBudget, setEditableBudget] = useState(initialBudget)
  const [editablePeriod, setEditablePeriod] = useState(initialPeriod)
  const [isDragging, setIsDragging] = useState(false)
  const [hoverIdx, setHoverIdx] = useState(-1)
  const [feedback, setFeedback] = useState('')
  const pieRef = useRef<HTMLDivElement>(null)
  const dragIndicatorRef = useRef<HTMLDivElement>(null)
  // Track original budget for KPI scaling
  const originalBudgetRef = useRef(initialBudget)
  // use refs for drag state to avoid closure staleness
  const dragRef = useRef({ idx: -1, origPct: 0, startAngle: 0 })

  // 当 initial 数据变化（重新生成返回新数据时）重置内部状态
  useEffect(() => {
    setAllocations(initialAllocations)
    setEditableBudget(initialBudget)
    setEditablePeriod(initialPeriod)
    originalBudgetRef.current = initialBudget
    setFeedback('')
  }, [initialAllocations, initialBudget, initialPeriod])

  // Update amounts when allocations change — use editableBudget
  const allocsWithAmount = allocations.map(a => ({
    ...a,
    amount: Math.round(editableBudget * a.percentage / 100),
  }))

  // Milestones — three stages, time ranges derived from allocation-based weights
  const stageWeights = (() => {
    const findPct = (name: string) => allocations.find(a => a.category === name)?.percentage || 0
    return [
      findPct('达人合作') + findPct('内容制作'),
      findPct('活动执行') + findPct('平台投放'),
      findPct('运营资源'),
    ].map(w => Math.max(w, 1))
  })()
  const totalW = stageWeights.reduce((s, w) => s + w, 0)
  // Time allocation: each stage gets months proportionally to its weight
  const stageMonths = stageWeights.map(w => Math.max(1, Math.round(editablePeriod * w / totalW)))
  // Normalize to ensure total = editablePeriod
  const stageMonthsSum = stageMonths.reduce((s, m) => s + m, 0)
  let diff = editablePeriod - stageMonthsSum
  if (diff !== 0) {
    // Adjust largest or last to fix rounding
    for (let i = 0; diff !== 0 && i < stageMonths.length; i++) {
      if (diff > 0 && stageMonths[i] < editablePeriod) { stageMonths[i]++; diff--; }
      else if (diff < 0 && stageMonths[i] > 1) { stageMonths[i]--; diff++; }
    }
  }
  let monthCursor = 1
  const monthRanges = stageMonths.map(m => {
    const start = monthCursor
    const end = Math.min(monthCursor + m - 1, editablePeriod)
    monthCursor = end + 1
    return start === end ? `第${start}个月` : `第${start}-${end}个月`
  })
  const milestones = STAGE_NAMES.map((stageName, stageIdx) => {
    const desc = autoMilestoneDesc(allocsWithAmount, stageIdx, editableBudget)
    return {
      icon: STAGE_ICONS[stageIdx],
      stageName,
      range: monthRanges[stageIdx],
      desc,
      budget: 0, // computed below
    }
  })
  // Budget weighted by stage weights (same weights) — 最后一项取余确保总和 = 总预算
  milestones.forEach((m, i) => {
    if (i < milestones.length - 1) {
      m.budget = Math.round(editableBudget * stageWeights[i] / totalW)
    }
  })
  // 最后一项 = 总预算 - 前面各项之和，确保加起来精确等于总预算
  const sumPrev = milestones.slice(0, -1).reduce((s, m) => s + m.budget, 0)
  milestones[milestones.length - 1].budget = Math.max(0, editableBudget - sumPrev)

  // KPI base
  const kpiBase = useRef({ expo: 12000000, click: 800000, conv: 50000, interact: 600000 })

  // Parse initial KPI numeric values
  useEffect(() => {
    const parseKPI = (s: string) => {
      const m = s.match(/[\d.]+/)
      if (!m) return 0
      const n = parseFloat(m[0])
      return s.includes('万') ? n * 10000 : n
    }
    const expo = parseKPI(initialKpis['曝光量'] || '1000万')
    const click = parseKPI(initialKpis['互动量'] || '80万')
    const conv = parseKPI(initialKpis['线索数'] || '15000个')
    const interact = parseKPI(initialKpis['互动量'] || '80万')
    if (expo > 0) kpiBase.current.expo = expo
    if (click > 0) kpiBase.current.click = click
    if (conv > 0) kpiBase.current.conv = conv
    if (interact > 0) kpiBase.current.interact = interact
  }, [initialKpis])

  // ───── Geometry ─────
  function getSvgPoint(e: MouseEvent | Touch) {
    const svg = document.getElementById('pieSvg')
    if (!svg) return null
    const rect = svg.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const x = e.clientX, y = e.clientY
    return {
      cx, cy, x, y,
      dist: Math.sqrt((x - cx) ** 2 + (y - cy) ** 2),
      angle: Math.atan2(y - cy, x - cx),
      width: rect.width,
    }
  }

  function getSegAtAngle(angle: number): number {
    let cur = -Math.PI / 2
    for (let i = 0; i < allocsWithAmount.length; i++) {
      const a = (allocsWithAmount[i].percentage / 100) * 2 * Math.PI
      const end = cur + a
      let a1 = ((cur % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
      let a2 = ((end % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
      let ang = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
      if (a2 < a1) { if (ang >= a1 || ang < a2) return i }
      else { if (ang >= a1 && ang < a2) return i }
      cur = end
    }
    return 0
  }

  // ───── Drag handlers ─────
  const handlePointerDown = useCallback((clientX: number, clientY: number) => {
    const svg = document.getElementById('pieSvg')
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const x = clientX, y = clientY
    const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
    if (dist > rect.width * 0.55 || dist < rect.width * 0.08) return
    const angle = Math.atan2(y - cy, x - cx)
    // find segment at angle
    let cur = -Math.PI / 2
    let idx = 0
    for (let i = 0; i < allocations.length; i++) {
      const a = (allocations[i].percentage / 100) * 2 * Math.PI
      const end = cur + a
      let a1 = ((cur % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
      let a2 = ((end % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
      let ang = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
      if (a2 < a1) { if (ang >= a1 || ang < a2) { idx = i; break } }
      else { if (ang >= a1 && ang < a2) { idx = i; break } }
      cur = end
    }
    dragRef.current = { idx, origPct: allocations[idx].percentage, startAngle: angle }
    setIsDragging(true)
  }, [allocations])

  const handlePointerMove = useCallback((clientX: number, clientY: number) => {
    const svg = document.getElementById('pieSvg')
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const x = clientX, y = clientY
    const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
    const angle = Math.atan2(y - cy, x - cx)

    if (isDragging) {
      const d = dragRef.current
      let delta = angle - d.startAngle
      if (delta > Math.PI) delta -= 2 * Math.PI
      if (delta < -Math.PI) delta += 2 * Math.PI
      let newPct = d.origPct + (delta / (2 * Math.PI)) * 80
      newPct = Math.max(3, Math.min(newPct, 85))

      setAllocations(prev => {
        const next = prev.map(a => ({ ...a }))
        const diff = newPct - next[d.idx].percentage
        next[d.idx].percentage = newPct
        const others = next.filter((_, i) => i !== d.idx)
        const otherTotal = others.reduce((s, a) => s + a.percentage, 0)
        if (otherTotal > 0) {
          others.forEach(a => {
            a.percentage = Math.max(1, a.percentage - diff * (a.percentage / otherTotal))
          })
        }
        const sum = next.reduce((s, a) => s + a.percentage, 0)
        next.forEach(a => { a.percentage = (a.percentage / sum) * 100 })
        return next
      })

      if (dragIndicatorRef.current) {
        dragIndicatorRef.current.textContent = `${allocations[d.idx]?.category || ''} ${Math.round(newPct)}%`
        dragIndicatorRef.current.style.display = 'block'
        dragIndicatorRef.current.style.left = `${clientX}px`
        dragIndicatorRef.current.style.top = `${clientY}px`
      }
    } else {
      if (dist <= rect.width * 0.55 && dist >= rect.width * 0.08) {
        let cur = -Math.PI / 2
        let found = -1
        for (let i = 0; i < allocations.length; i++) {
          const a = (allocations[i].percentage / 100) * 2 * Math.PI
          const end = cur + a
          let a1 = ((cur % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
          let a2 = ((end % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
          let ang = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
          if (a2 < a1) { if (ang >= a1 || ang < a2) { found = i; break } }
          else { if (ang >= a1 && ang < a2) { found = i; break } }
          cur = end
        }
        setHoverIdx(prev => prev !== found ? found : prev)
      } else {
        setHoverIdx(-1)
      }
    }
  }, [isDragging, allocations])

  const handlePointerUp = useCallback(() => {
    if (!isDragging) return
    setIsDragging(false)
    if (dragIndicatorRef.current) {
      dragIndicatorRef.current.style.display = 'none'
    }
    const hint = document.getElementById('pieHint')
    if (hint) {
      hint.classList.add('dim')
      setTimeout(() => hint.classList.remove('dim'), 3000)
    }
  }, [isDragging])

  // ───── Mouse events (only on pie wrap) ─────
  useEffect(() => {
    const wrap = pieRef.current
    if (!wrap) return

    const onDown = (e: MouseEvent) => { handlePointerDown(e.clientX, e.clientY); e.preventDefault() }
    const onMove = (e: MouseEvent) => { handlePointerMove(e.clientX, e.clientY) }
    const onUp = () => { handlePointerUp() }

    wrap.addEventListener('mousedown', onDown)
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)

    return () => {
      wrap.removeEventListener('mousedown', onDown)
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [handlePointerDown, handlePointerMove, handlePointerUp])

  // ───── Touch events (only on pie wrap, no document-level preventDefault) ─────
  useEffect(() => {
    const wrap = pieRef.current
    if (!wrap) return

    const onDown = (e: TouchEvent) => {
      const t = e.touches[0]
      handlePointerDown(t.clientX, t.clientY)
      // 只在确实触碰到饼图区域并开始拖拽时才 preventDefault
      if (isDragging) e.preventDefault()
    }
    const onMove = (e: TouchEvent) => {
      if (!isDragging) return
      const t = e.touches[0]; handlePointerMove(t.clientX, t.clientY); e.preventDefault()
    }
    const onUp = () => { handlePointerUp() }

    wrap.addEventListener('touchstart', onDown, { passive: false })
    document.addEventListener('touchmove', onMove, { passive: false })
    document.addEventListener('touchend', onUp)

    return () => {
      wrap.removeEventListener('touchstart', onDown)
      document.removeEventListener('touchmove', onMove)
      document.removeEventListener('touchend', onUp)
    }
  }, [isDragging, handlePointerDown, handlePointerMove, handlePointerUp])

  // 重新生成完成后清除输入框
  useEffect(() => {
    if (!loading) {
      setFeedback('')
    }
  }, [loading])

  // ───── Pie SVG ─────
  const pieSvg = (() => {
    const cx = 120, cy = 120, r = 92
    let cur = -Math.PI / 2
    let html = ''
    allocsWithAmount.forEach((a, i) => {
      const angle = (a.percentage / 100) * 2 * Math.PI
      const start = cur, end = cur + angle
      const large = angle > Math.PI ? 1 : 0
      const isHov = i === hoverIdx || (isDragging && i === dragRef.current.idx)
      const dr = isHov ? r + 6 : r
      const d = `M ${cx + dr * Math.cos(start)} ${cy + dr * Math.sin(start)} A ${dr} ${dr} 0 ${large} 1 ${cx + dr * Math.cos(end)} ${cy + dr * Math.sin(end)} L ${cx} ${cy} Z`
      html += `<path d="${d}" fill="${COLORS[i]}" stroke="#fff" stroke-width="${isHov ? 3 : 2}" opacity="${isHov ? 1 : 0.9}" style="transition:opacity .1s"/>`
      const mid = start + angle / 2
      const lr = r + 18
      const lx = cx + lr * Math.cos(mid), ly = cy + lr * Math.sin(mid)
      if (a.percentage > 4) {
        html += `<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="central" font-size="10" font-weight="600" fill="${COLORS[i]}" style="pointer-events:none">${Math.round(a.percentage)}%</text>`
      }
      cur = end
    })
    html += `<circle cx="${cx}" cy="${cy}" r="30" fill="#fff" stroke="#eee" stroke-width="1"/>`
    html += `<text x="${cx}" y="${cy - 5}" text-anchor="middle" font-size="10" fill="var(--muted)" style="pointer-events:none">总计</text>`
    html += `<text x="${cx}" y="${cy + 14}" text-anchor="middle" font-size="16" font-weight="700" fill="var(--fg)" style="pointer-events:none">${editableBudget}万</text>`
    return html
  })()

  // ───── KPI (scaled by budget) ─────
  const kpis = (() => {
    const f = (name: string) => (allocations.find(x => x.category === name)?.percentage || 0) / 100
    const daren = f('达人合作'), neirong = f('内容制作'), huodong = f('活动执行'), pingtai = f('平台投放'), yunying = f('运营资源')
    const ratio = editableBudget / (originalBudgetRef.current || 1)
    const expo = Math.round(kpiBase.current.expo * ratio * (0.2 + 0.6 * (pingtai / 0.2) + 0.2 * (huodong / 0.3)))
    const click = Math.round(kpiBase.current.click * ratio * (0.3 + 0.5 * (pingtai / 0.2) + 0.2 * (neirong / 0.2)))
    const conv = Math.round(kpiBase.current.conv * ratio * (0.2 + 0.5 * (neirong / 0.2) + 0.15 * (huodong / 0.3) + 0.15 * (yunying / 0.1)))
    const interact = Math.round(kpiBase.current.interact * ratio * (0.3 + 0.5 * (daren / 0.25) + 0.2 * (huodong / 0.3)))
    const fn = (n: number) => n >= 10000 ? ((n / 10000).toFixed(n % 10000 === 0 ? 0 : 1) + '万') : n.toLocaleString()
    return [
      { label: '曝光量', value: fn(expo) },
      { label: '点击量', value: fn(click) },
      { label: '转化量', value: fn(conv) },
      { label: '互动量', value: fn(interact) },
    ]
  })()

  // ───── Milestone budgets (already computed above) ─────
  // colors derived from MS_COLORS palette

  const handleBack = () => {
    const finalData = allocsWithAmount.map(a => ({
      category: a.category,
      percentage: Math.round(a.percentage * 10) / 10,
      amount: a.amount,
    }))
    onBack(finalData)
  }

  const handleSendFeedback = () => {
    if (!feedback.trim()) return
    onRegenerate?.(feedback.trim())
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', position: 'relative', paddingBottom: 40 }}>
      <style>{`
        .mw .screen { overflow: hidden !important; padding: 0 !important; }
      `}</style>
      {/* 重新生成 loading 覆盖层 */}
      {loading && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 99,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(255,255,255,0.85)',
          gap: 12,
        }}>
          <div style={{
            width: 36, height: 36, border: '3px solid var(--border)',
            borderTopColor: 'var(--accent)', borderRadius: '50%',
            animation: 'mw-spin 0.8s linear infinite',
          }} />
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-soft)' }}>正在根据反馈重新生成…</div>
          <style>{`@keyframes mw-spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}
      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', padding: '8px 14px',
        borderBottom: '1px solid var(--line)', background: 'var(--bg)', flexShrink: 0,
      }}>
        <button
          type="button"
          onClick={handleBack}
          style={{
            width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: 'none', background: 'none', cursor: 'pointer', borderRadius: 8,
            color: 'var(--fg)', fontSize: 18, fontFamily: 'var(--ff)',
          }}
        >‹</button>
        <span style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 600 }}>预算分配与预览</span>
        <div style={{ width: 32 }} />
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '16px 14px 0' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 16 }}>
          {/* 0. 可编辑的总预算和周期 */}
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{
              flex: 1, background: 'var(--accent-softer)', borderRadius: 'var(--r-md)',
              padding: '12px 10px', textAlign: 'center', border: '1px solid var(--accent-border)',
            }}>
              <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 500, marginBottom: 4 }}>总预算</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                <input
                  type="number"
                  min={1}
                  value={editableBudget}
                  onChange={e => {
                    const v = parseInt(e.target.value) || 1
                    setEditableBudget(Math.max(1, v))
                  }}
                  style={{
                    width: 60, height: 28, border: '1px solid var(--accent-border)', borderRadius: 6,
                    padding: '0 4px', fontSize: 14, fontWeight: 700, textAlign: 'center',
                    fontFamily: 'var(--ff)', outline: 'none', background: '#fff',
                    color: 'var(--accent)',
                  }}
                />
                <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--muted)' }}>万元</span>
              </div>
            </div>
            <div style={{
              flex: 1, background: 'var(--surface)', borderRadius: 'var(--r-md)',
              padding: '12px 10px', textAlign: 'center', border: '1px solid var(--border)',
            }}>
              <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 500, marginBottom: 4 }}>执行周期</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
                <input
                  type="number"
                  min={1}
                  max={24}
                  value={editablePeriod}
                  onChange={e => {
                    const v = parseInt(e.target.value) || 1
                    setEditablePeriod(Math.max(1, Math.min(24, v)))
                  }}
                  style={{
                    width: 50, height: 28, border: '1px solid var(--border)', borderRadius: 6,
                    padding: '0 4px', fontSize: 14, fontWeight: 700, textAlign: 'center',
                    fontFamily: 'var(--ff)', outline: 'none', background: '#fff',
                    color: 'var(--fg)',
                  }}
                />
                <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--muted)' }}>个月</span>
              </div>
            </div>
          </div>

          {/* 1. Pie chart */}
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '20px 16px 14px' }}>
            <div style={{ fontSize: 12, fontWeight: 600, textAlign: 'center', marginBottom: 10 }}>预算占比分布</div>
            <div ref={pieRef} style={{ display: 'flex', justifyContent: 'center', touchAction: 'none' }}>
              <svg viewBox="0 0 240 240" id="pieSvg" style={{ width: 200, height: 200 }} dangerouslySetInnerHTML={{ __html: pieSvg }} />
            </div>
            {/* Legend */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 10px', justifyContent: 'center', marginTop: 12, padding: '0 4px' }}>
              {allocsWithAmount.map((a, i) => {
                const active = i === hoverIdx || (isDragging && i === dragRef.current.idx)
                return (
                  <div key={a.category} style={{
                    display: 'flex', alignItems: 'center', gap: 5, fontSize: 10,
                    color: 'var(--fg-soft)', padding: '3px 8px', borderRadius: 'var(--r-sm)',
                    background: active ? 'color-mix(in srgb, var(--accent) 10%, var(--surface))' : 'var(--surface)',
                  }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: COLORS[i], flexShrink: 0 }} />
                    <span style={{ fontWeight: 500, color: 'var(--fg)' }}>{a.category}</span>
                    <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{Math.round(a.percentage)}%</span>
                    <span style={{ color: 'var(--fg)', fontWeight: 600 }}>{a.amount}万</span>
                  </div>
                )
              })}
            </div>
            <div id="pieHint" style={{ textAlign: 'center', fontSize: 10, color: 'var(--muted)', marginTop: 6, transition: 'opacity .3s' }}>↕ 拖拽扇区调整比例</div>
          </div>

          {/* 2. KPI */}
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 12 }}>核心指标</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {kpis.map(k => (
                <div key={k.label} style={{ background: 'var(--surface)', borderRadius: 'var(--r-sm)', padding: '10px 8px', textAlign: 'center' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--fg)', marginBottom: 2 }}>{k.value}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)' }}>{k.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Milestones — three stages */}
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 14 }}>关键里程碑 <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 400 }}>（共{editablePeriod}个月）</span></div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {milestones.map((m, i) => {
                const c = MS_COLORS[i % MS_COLORS.length]
                const bg = `color-mix(in srgb, ${c} 8%, #fff)`
                const tagBg = `color-mix(in srgb, ${c} 15%, #fff)`
                return (
                  <div key={i} style={{ borderRadius: 'var(--r-sm)', overflow: 'hidden', border: `1px solid var(--border)` }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 12px', fontSize: 11, background: bg,
                    }}>
                      <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ fontSize: 14 }}>{m.icon}</span>{m.stageName}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 10 }}>
                        <span style={{ padding: '1px 6px', borderRadius: 4, fontWeight: 500, background: tagBg, color: c }}>{m.range}</span>
                        <span style={{ fontWeight: 700, color: c }}>{m.budget}万元</span>
                      </span>
                    </div>
                    <div style={{ padding: '8px 12px 10px', fontSize: 10, color: 'var(--fg-soft)', lineHeight: 1.5, background: 'var(--surface)' }}>
                      {m.desc}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{
        background: 'var(--bg)', borderTop: '1px solid var(--line)',
        padding: '10px 14px', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0,
      }}>
        <input
          type="text"
          placeholder="输入备注或反馈…"
          value={feedback}
          disabled={loading}
          onChange={e => setFeedback(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSendFeedback() }}
          style={{
            flex: 1, height: 36, border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
            padding: '0 10px', fontSize: 12, fontFamily: 'var(--ff)', outline: 'none',
            background: loading ? 'var(--surface)' : 'var(--surface)', color: 'var(--fg)',
            opacity: loading ? 0.5 : 1,
          }}
        />
        <button
          type="button"
          disabled={loading || !feedback.trim()}
          onClick={handleSendFeedback}
          style={{
            width: 36, height: 36, border: 'none', borderRadius: 'var(--r-sm)',
            background: loading || !feedback.trim() ? 'var(--border)' : 'var(--accent)',
            color: '#fff', fontSize: 16,
            cursor: loading || !feedback.trim() ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            fontFamily: 'var(--ff)',
          }}
        >↵</button>
      </div>

      {/* Drag tooltip */}
      <div ref={dragIndicatorRef} style={{
        display: 'none', position: 'fixed', pointerEvents: 'none', zIndex: 100,
        background: 'rgba(0,0,0,.75)', color: '#fff', padding: '4px 10px', borderRadius: 6,
        fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap',
        transform: 'translate(-50%,-100%)', marginTop: -12,
        fontFamily: 'var(--ff)',
      }} />
    </div>
  )
}

export type { BudgetAllocation }
