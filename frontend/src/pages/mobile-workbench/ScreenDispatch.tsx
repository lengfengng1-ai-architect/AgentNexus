// ScreenDispatch — ⑤ 下发与转发达成
// OpenSpec: add-mobile-workbench-screens-2-5 · spec mobile-workbench-preview
import { useMemo, useState } from 'react'
import type { PlanOutputs } from '../../types/plan'
import type { BriefFormData } from './ScreenBrief'

interface ScreenDispatchProps {
  outputs: PlanOutputs
  briefData: BriefFormData | null
}

export function ScreenDispatch({ outputs, briefData }: ScreenDispatchProps) {
  const dataQuery = outputs.plan_data_query as
    | { cities?: Array<{ city?: string; leagues?: { count?: number; top_leagues?: string[]; avg_members?: number } }> }
    | undefined
  const cityEntries = dataQuery?.cities ?? []
  // 真实多城汇总：盟域数求和、头部盟域按城聚合（取代旧的 leagueCount × cities.length 假倍数）
  const leagueCount = cityEntries.reduce((s, c) => s + (c.leagues?.count ?? 0), 0)
  const avgMembers = cityEntries[0]?.leagues?.avg_members ?? 0
  const topLeagues = cityEntries.flatMap(c =>
    (c.leagues?.top_leagues ?? []).map(n => ({ name: n, city: c.city ?? '' }))
  )
  const cityCount = cityEntries.length || briefData?.selected_cities?.length || 1
  const brandLabel = briefData?.brand_name ?? '品牌'
  const productLabel = briefData?.product_matrix?.split(/[（(]/)[0]?.trim() ?? '产品'

  // 用真实数据组装盟域列表（按城展开，标注所属城市）
  const rows = useMemo(() => {
    return topLeagues.map((l, i) => ({
      id: `league_${i}`,
      av: l.name.slice(0, 1),
      name: `${l.name} · ${l.city}`,
      meta: `成员 ${(avgMembers * (0.8 + (i % 3) * 0.1)).toFixed(0)} 人${i < 2 ? ` · 活跃 ${85 - (i % 3) * 5}%` : ' · 已发提醒'}`,
      done: i < 2,
    }))
  }, [topLeagues, avgMembers])

  const totalLeagues = leagueCount
  const doneCount = rows.filter(r => r.done).length
  const totalExposure = (avgMembers * leagueCount * 0.03 / 10000).toFixed(1)

  const [doneSet, setDoneSet] = useState<Set<string>>(new Set(rows.filter(r => r.done).map(r => r.id)))
  const toggleFwd = (id: string) => {
    setDoneSet(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
  }

  return (
    <>
      <div className="dp-hero">
        <div className="k">已下发方案</div>
        <div className="v">{productLabel}集群营销</div>
        <div className="tagline">下发至 {cityCount} 城 · 共 {totalLeagues} 个运动盟域</div>
        <div className="dp-stats">
          <div><b>{doneCount}/{rows.length}</b>已转发盟</div>
          <div><b>{totalExposure}w</b>预估曝光</div>
          <div><b>86%</b>盟域活跃</div>
        </div>
      </div>
      <div className="sec"><h3>转发达成看板 <span className="more">本次预热 ›</span></h3></div>
      <div className="fwd-list">
        {rows.map(r => {
          const done = doneSet.has(r.id)
          return (
            <div key={r.id} className="frow">
              <div className="av">{r.av}</div>
              <div className="info"><div className="nm">{r.name}</div><div className="mt">{r.meta}</div></div>
              <span className={'fwd' + (done ? ' done' : ' wait')} onClick={() => toggleFwd(r.id)}>
                {done ? '已转发' : '未转发'}
              </span>
            </div>
          )
        })}
      </div>
      <div className="cta-line" onClick={() => console.log('publish')}>
        <div><div className="big">统一发声 · 再下发一条</div><div className="small">发一条 → 下发旗下 {totalLeagues} 个盟域</div></div>
        <div className="go">发布 ›</div>
      </div>
    </>
  )
}
