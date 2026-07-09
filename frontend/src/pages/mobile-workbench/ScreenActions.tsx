// ScreenActions — ④ 行动建议屏
// OpenSpec: add-mobile-workbench-screens-2-5 · spec mobile-workbench-preview · ADDED Requirement: ④ 行动建议屏
import { useState } from 'react'
import type { MobileScreen } from './ScreenChat'

const FILTERS = ['全部', '海报', '短视频', '赛事', '直播']

const CARDS = [
  { id: 'poster', type: '海报', stage: '预热期', thumb: '品牌悬念海报', title: '魅力系列 · 新品悬念海报', meta: '目标 制造期待感 · 渠道 抖音/视频号', time: '第 1-2 周 · 种草类' },
  { id: 'nightrun', type: '主题赛事', stage: '爆发期', thumb: '魅力蓝莓·城市夜跑', title: '魅力蓝莓 · 城市夜跑', meta: '规模 500-1000人 · 城市 北上广深', time: '每月1场 · 娃哈哈冠名' },
  { id: 'yoga', type: '主题赛事', stage: '爆发期', thumb: '石榴魅力·瑜伽嘉年华', title: '石榴魅力 · 瑜伽星空嘉年华', meta: '诉求 美容养颜 · 人群 年轻女性', time: '每月1场 · 跨界活动' },
  { id: 'video', type: '短视频', stage: '预热期', thumb: '工厂溯源短视频', title: '100% 纯天然 · 工厂溯源', meta: '节奏 每周3条 · KPI 曝光≥3000万/月', time: '第 1-2 周 · 种草类' },
  { id: 'live', type: '直播', stage: '爆发期', thumb: '运动达人带货直播', title: '腰部达人 · 运动带练直播', meta: '达人 50-80名 KOL · GMV ≥500万', time: '第 5-9 周 · 内容共创' },
]

export function ScreenActions({ onNavigate }: { onNavigate: (s: MobileScreen) => void }) {
  const [filter, setFilter] = useState('全部')
  const [adopted, setAdopted] = useState<Set<string>>(new Set())
  const toggleAdopt = (id: string) => {
    setAdopted(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n })
  }
  return (
    <>
      <div className="filters">
        {FILTERS.map(f => (
          <span key={f} className={'fchip' + (filter === f ? ' on' : '')} onClick={() => setFilter(f)}>{f}</span>
        ))}
      </div>
      <div className="feed">
        {CARDS.map(c => (
          <div key={c.id} className={'acard' + (adopted.has(c.id) ? ' adopted' : '')}>
            <div className="thumb">
              {c.thumb}
              <span className="type">{c.type}</span>
              <span className="stage">{c.stage}</span>
            </div>
            <div className="ab">
              <div className="at">{c.title}</div>
              <div className="am">
                {c.meta.split('·').map((s, i) => {
                  const parts = s.trim().split(/\s(.+)/)
                  return <span key={i}><b>{parts[0]}</b>{parts[1] || ''}</span>
                })}
              </div>
              <div className="af">
                <div className="meta">{c.time}</div>
                <button className="adopt" onClick={() => toggleAdopt(c.id)}>
                  {adopted.has(c.id) ? '已采纳' : '采纳'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="cta-line" onClick={() => onNavigate('dispatch')}>
        <div><div className="big">采纳并下发至 16 盟域</div><div className="small">统一发声 · 跨盟转发执行</div></div>
        <div className="go">下发 ›</div>
      </div>
    </>
  )
}
