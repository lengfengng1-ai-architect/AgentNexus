// ScreenGenerate — ③ 方案生成屏
// OpenSpec: add-mobile-workbench-screens-2-5 · spec mobile-workbench-preview · ADDED Requirement: ③ 方案生成屏
import type { MobileScreen } from './ScreenChat'

const STEPS = [
  { done: true, now: false, dot: '✓', title: '理解需求', desc: '解析简报：娃哈哈魅力系列 · 三款果汁 · 3个月周期' },
  { done: true, now: false, dot: '✓', title: '拆解策略', desc: '匹配 4M+1C 集群营销模型，锁定运动盟域载体' },
  { done: false, now: true, dot: '◉', title: '生成方案', desc: '输出策略定位、赛事体系、KPI…' },
  { done: false, now: false, dot: '4', title: '优化', desc: '内容模型与转化链路调优' },
  { done: false, now: false, dot: '5', title: '下发盟域', desc: '下发至 4 城 × 4 个运动盟域' },
]

export function ScreenGenerate({ onNavigate }: { onNavigate: (s: MobileScreen) => void }) {
  return (
    <>
      <div className="sec"><h3>Agent 生成流水线 <span className="more">日志 ›</span></h3></div>
      <div className="pipe">
        {STEPS.map((s, i) => (
          <div key={i} className={'step' + (s.done ? ' done' : '') + (s.now ? ' now' : '')}>
            <div className="dot">{s.dot}</div>
            <div className="body"><div className="st">{s.title}</div><div className="sd">{s.desc}</div></div>
          </div>
        ))}
      </div>
      <div className="sec"><h3>生成结果</h3></div>
      <div className="plancard">
        <div className="ph">策略定位 <span className="tag">已生成</span></div>
        <div className="pb">
          <p>以<b>「运动盟域」</b>为核心载体，整合一线城市代理商、运动场馆、健身达人、社群领袖，通过<b>「全民赛事定制 + 合作加盟代理」</b>跨界模式，构建产品-场景-人群三位一体闭环。</p>
          <div className="model"><span>Motion 运动场景</span><span>Member 会员</span><span>Media 内容</span><span>Merchant 商户</span><span>Community 社群</span></div>
        </div>
      </div>
      <div className="plancard">
        <div className="ph">三级赛事体系 <span className="tag">已生成</span></div>
        <div className="pb">
          <p><b>主题赛事</b>（每月1场）：魅力蓝莓·城市夜跑、石榴魅力·瑜伽星空嘉年华，单场 500-1000 人。</p>
          <p style={{ marginTop: 6 }}><b>联盟赛事</b>（每季1场）：城市马拉松、斯巴达勇士赛，官方指定饮品。</p>
          <p style={{ marginTop: 6 }}><b>跨界活动</b>（每月2-3场）：健身房品鉴会、打卡挑战。</p>
        </div>
      </div>
      <div className="plancard">
        <div className="ph">核心 KPI <span className="tag">3个月</span></div>
        <div className="pb">
          <div className="kpi-row">
            <div className="k"><div className="n">≥1亿</div><div className="l">短视频曝光</div></div>
            <div className="k"><div className="n">≥50万</div><div className="l">私域会员</div></div>
            <div className="k"><div className="n">≥500万</div><div className="l">达人 GMV</div></div>
          </div>
        </div>
      </div>
      <div className="cta-line" onClick={() => onNavigate('actions')}>
        <div><div className="big">下一步行动建议</div><div className="small">基于方案生成 6 项可执行动作</div></div>
        <div className="go">查看 ›</div>
      </div>
    </>
  )
}
