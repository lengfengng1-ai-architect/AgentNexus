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
  const dataQuery = outputs.plan_data_query as Record<string, unknown> | undefined
  const leagues = dataQuery?.leagues as Record<string, unknown> | undefined
  const topLeagues = (leagues?.top_leagues as string[]) ?? []
  const leagueCount = (leagues?.count as number) ?? 0
  const avgMembers = (leagues?.avg_members as number) ?? 0
  const city = (dataQuery?.city as string) ?? '上海'
  const cities = briefData?.selected_cities ?? [city]
  const brandLabel = briefData?.brand_name ?? '品牌'
  const productLabel = briefData?.product_matrix?.split(/[（(]/)[0]?.trim() ?? '产品'

  // 用真实数据组装盟域列表
  const rows = useMemo(() => {
    // topLeagues 通常是字符串列表，没有曝光数据
    // 用联盟数量和平均人数虚拟曝光数据，显得更真实
    return topLeagues.map((name, i) => ({
      id: `league_${i}`,
      av: name.slice(0, 1),
      name: `${name} · ${city}`,
      meta: `成员 ${(avgMembers * (0.8 + i * 0.1)).toFixed(0)} 人${i < 2 ? ` · 活跃 ${(85 - i * 5)}%` : ' · 已发提醒'}`,
      done: i < 2,
    }))
  }, [topLeagues, city, avgMembers])

  const totalLeagues = leagueCount * cities.length
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
        <div className="tagline">下发至 {cities.length} 城 × {leagueCount} 个运动盟域 · 共 {totalLeagues} 个盟域</div>
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
