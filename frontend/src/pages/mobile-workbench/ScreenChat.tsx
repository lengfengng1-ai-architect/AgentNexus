// ScreenChat — ① 对话入口屏
// OpenSpec: openspec/changes/add-mobile-workbench-preview · tasks 4.1 / 4.2 / 4.3
// 初始气泡与交互映射自设计稿 system-kit.mobile-workbench2.html
import { useEffect, useRef, useState } from 'react'

export type MobileScreen = 'chat' | 'brief' | 'generate' | 'actions' | 'dispatch'

type Msg = { id: number; role: 'agent' | 'user'; text: string; card?: 'brief' }

let seq = 0
const nextId = () => ++seq

const INITIAL: Msg[] = [
  {
    id: nextId(),
    role: 'agent',
    text: '你好，我是营销方案助手。告诉我品牌、产品和目标，我帮你生成集群营销方案。',
  },
  {
    id: nextId(),
    role: 'user',
    text: '娃哈哈魅力系列，三款果汁（蓝莓/石榴/荔枝），想用运动盟域做 3 个月集群营销',
  },
  {
    id: nextId(),
    role: 'agent',
    text: '已理解。按 4M+1C 模型拆解：Motion 运动场景 · Member 会员 · Media 内容 · Merchant 商户 · Community 社群。先填一份简报确认细节：',
    card: 'brief',
  },
  {
    id: nextId(),
    role: 'agent',
    text: '预期 3 个月：曝光 ≥1亿 · 私域会员 ≥50万 · 达人 GMV ≥500万。',
  },
]

const AGENT_REPLY = '收到，正在按 4M+1C 拆解，可点「填写简报」确认细节。'

export function ScreenChat({ onNavigate }: { onNavigate: (s: MobileScreen) => void }) {
  const [messages, setMessages] = useState<Msg[]>(() => INITIAL.map(m => ({ ...m })))
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = () => {
    const v = input.trim()
    if (!v) return
    setMessages(m => [...m, { id: nextId(), role: 'user', text: v }])
    setInput('')
    setTimeout(() => {
      setMessages(m => [...m, { id: nextId(), role: 'agent', text: AGENT_REPLY }])
    }, 400)
  }

  return (
    <>
      <div className="chat">
        {messages.map(m => (
          <div key={m.id} className={`bubble ${m.role}`}>
            {m.role === 'agent' && <div className="who">Agent</div>}
            <div className="msg">{m.text}</div>
            {m.card === 'brief' && (
              <div
                className="chat-card"
                role="button"
                onClick={() => onNavigate('brief')}
              >
                <div>
                  <div className="cc-t">填写方案简报</div>
                  <div className="cc-d">品牌 · 产品线 · 人群 · 周期</div>
                </div>
                <div className="cc-go">去填写 ›</div>
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="inputbar">
        <button className="quick" onClick={() => onNavigate('brief')}>
          填写简报
        </button>
        <input
          type="text"
          placeholder="给 Agent 发消息…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              send()
            }
          }}
        />
        <button className="send" aria-label="发送" onClick={send}>
          ↑
        </button>
      </div>
    </>
  )
}
