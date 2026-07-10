// ScreenChat — ① 对话入口屏
// OpenSpec: openspec/changes/add-mobile-workbench-preview · tasks 4.1 / 4.2 / 4.3
// 初始气泡与交互映射自设计稿 system-kit.mobile-workbench2.html
import { useEffect, useRef, useState } from 'react'

export type MobileScreen = 'chat' | 'brief' | 'generate' | 'actions' | 'dispatch'

export interface ScreenNavigate {
  (s: MobileScreen, data?: Record<string, unknown>): void
}

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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleVoice = () => {
    const API: new () => SpeechRecognition =
      (window as unknown as { SpeechRecognition: new () => SpeechRecognition }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition: new () => SpeechRecognition }).webkitSpeechRecognition
    if (!API) return
    if (isListening) { recognitionRef.current?.stop(); setIsListening(false); return }
    const recognition = new API()
    recognition.lang = 'zh-CN'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalText = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalText += event.results[i][0].transcript
      }
      if (finalText) setInput(prev => prev + (prev ? ' ' : '') + finalText)
    }
    recognition.onend = () => setIsListening(false)
    recognition.onerror = () => setIsListening(false)
    recognition.start()
    recognitionRef.current = recognition
    setIsListening(true)
  }

  const handlePrefillTemplate = () => {
    setInput('我是 [品牌名]，属于 [品类]，想在 [城市] 做活动，预算 [金额] 万，周期 [时长] 个月')
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      console.log('Selected files:', Array.from(files).map(f => f.name).join(', '))
    }
    e.target.value = ''
  }

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

      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      <div className="inputbar">
        <div className="quick-btns">
          <button className="qb" onClick={() => onNavigate('brief')}>填写简报</button>
          <button className="qb" onClick={handleVoice}>语音输入</button>
          <button className="qb" onClick={() => fileInputRef.current?.click()}>附件</button>
          <button className="qb" onClick={handlePrefillTemplate}>方案模板</button>
        </div>
        <div className="inputbar-row">
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
      </div>
    </>
  )
}
