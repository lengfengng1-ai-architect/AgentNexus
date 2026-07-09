// ScreenDispatch — ⑤ 下发与转发达成
// OpenSpec: add-mobile-workbench-screens-2-5 · spec mobile-workbench-preview · ADDED Requirement: ⑤ 下发转达屏
import { useState } from 'react'

interface FwdRow {
  id: string; av: string; name: string; meta: string; done: boolean
}

const ROWS: FwdRow[] = [
  { id: 'basketball', av: '篮', name: '锐动篮球盟 · 北京', meta: '曝光 5.2w · 互动 1.1k', done: true },
  { id: 'badminton', av: '羽', name: '羽悦盟 · 上海', meta: '曝光 3.1w · 互动 640', done: true },
  { id: 'run', av: '跑', name: '城市跑团 · 广州', meta: '曝光 2.8w · 互动 520', done: true },
  { id: 'swim', av: '泳', name: '泳动生活 · 深圳', meta: '曝光 1.3w · 互动 210', done: true },
  { id: 'street', av: '街', name: '街球俱乐部 · 北京', meta: '待跟进 · 已发提醒', done: false },
]

export function ScreenDispatch() {
  const [doneSet, setDoneSet] = useState<Set<string>>(new Set(ROWS.filter(r => r.done).map(r => r.id)))
  const toggleFwd = (id: string) => {
    setDoneSet(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
  }
  return (
    <>
      <div className="dp-hero">
        <div className="k">已下发方案</div>
        <div className="v">魅力系列集群营销</div>
        <div className="tagline">下发至 4 城 × 4 个运动盟域 · 共 16 个盟域</div>
        <div className="dp-stats">
          <div><b>4/5</b>已转发盟</div>
          <div><b>12.4w</b>累计曝光</div>
          <div><b>86%</b>盟域活跃</div>
        </div>
      </div>
      <div className="sec"><h3>转发达成看板 <span className="more">本次预热 ›</span></h3></div>
      <div className="fwd-list">
        {ROWS.map(r => {
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
      <div className="cta-line" onClick={() => console.log('publish again')}>
        <div><div className="big">统一发声 · 再下发一条</div><div className="small">发一条 → 下发旗下 16 个盟域</div></div>
        <div className="go">发布 ›</div>
      </div>
    </>
  )
}
