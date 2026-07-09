// ScreenBrief — ② 简报屏
// OpenSpec: add-mobile-workbench-screens-2-5 · spec mobile-workbench-preview · ADDED Requirement: ② 简报屏
import { useState } from 'react'
import type { MobileScreen } from './ScreenChat'

const CITIES = ['北京', '上海', '广州', '深圳', '成都']

export function ScreenBrief({ onNavigate: _onNavigate }: { onNavigate: (s: MobileScreen) => void }) {
  const [selectedCities, setSelectedCities] = useState<string[]>(['北京', '上海', '广州', '深圳'])
  const toggleCity = (c: string) => {
    setSelectedCities(prev => (prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]))
  }
  return (
    <>
      <div className="wk-head">
        <div className="brand">娃哈哈新产品 · 集群营销全功能方案</div>
        <div className="name">魅力系列 · 运动盟域跨界整合</div>
        <div className="matrix"><span>蓝莓魅力饮</span><span>石榴魅力饮</span><span>荔枝魅力饮</span></div>
        <div className="meta"><div><b>150ml</b> 规格</div><div><b>¥20</b> 中高端</div><div><b>3个月</b> 周期</div></div>
      </div>
      <div className="sec"><h3>方案简报 <span className="more">存草稿</span></h3></div>
      <div className="form">
        <div className="field"><label>品牌 <span className="req">*</span></label><input type="text" defaultValue="娃哈哈" /></div>
        <div className="field"><label>产品线 <span className="req">*</span></label><input type="text" defaultValue="魅力系列（蓝莓/石榴/荔枝）" /></div>
        <div className="field"><label>目标人群</label>
          <select defaultValue="25-35岁 一线白领">
            <option>25-35岁 一线白领</option><option>运动健身爱好者</option><option>新中产人群</option><option>Z 世代</option>
          </select>
        </div>
        <div className="field"><label>营销目标</label><input type="text" defaultValue="认知度 ≥60% · 私域会员 ≥50万" /></div>
        <div className="field"><label>投放周期</label>
          <select defaultValue="3 个月（12 周）">
            <option>3 个月（12 周）</option><option>1 个月</option><option>6 个月</option>
          </select>
        </div>
        <div className="field"><label>首批城市</label>
          <div className="chips-multi">
            {CITIES.map(c => (
              <span key={c} className={'chip' + (selectedCities.includes(c) ? ' on' : '')} onClick={() => toggleCity(c)}>{c}</span>
            ))}
          </div>
        </div>
        <div className="field"><label>核心策略</label>
          <textarea rows={2} defaultValue="以「运动盟域」为载体，4M+1C 集群营销模型，构建产品-场景-人群三位一体闭环。" />
        </div>
      </div>
      <div className="dock">
        <button className="gen" onClick={() => console.log('AI generate')}>✦ AI 生成方案</button>
        <div className="hint">基于简报自动拆解 4M+1C 策略与执行</div>
      </div>
    </>
  )
}
