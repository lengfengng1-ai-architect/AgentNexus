// ScreenChat — ① 对话入口屏（移动端）
// OpenSpec: openspec/changes/mobile-chat-backend-integration
// in_scope: brand-input, mobile-chat-session
// 使用 useChat hook 对接后端 /chat/stream SSE 端点
import { useCallback, useEffect, useRef, useState } from 'react'
import { useChat } from '../../hooks/useChat'
import { ChatBubble } from '../../components/ChatBubble'
import { ErrorBar } from '../../components/ErrorBar'
import type { BrandInput } from '../../types/chat'

export type MobileScreen = 'chat' | 'brief' | 'generate' | 'actions' | 'dispatch' | 'preview'

interface ScreenChatProps {
  onNavigate: (s: MobileScreen, inputText?: string, brandInput?: BrandInput) => void
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'
const BACKEND_ORIGIN = API_BASE.replace(/\/api\/v1\/?$/, '')

export function ScreenChat({ onNavigate }: ScreenChatProps) {
  const {
    messages,
    inputValue,
    isLoading,
    error,
    sendMessage,
    retryMessage,
    setInputValue,
    updateVideoResult,
    updateImageResult,
    addVirtualMessage,
  } = useChat()

  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isListening, setIsListening] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const inputValueRef = useRef<string>(inputValue)
  useEffect(() => { inputValueRef.current = inputValue }, [inputValue])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── 语音输入 ──────────────────────────────────────────────────────────
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
      if (finalText) {
        const cur = inputValueRef.current
        setInputValue(cur + (cur ? ' ' : '') + finalText)
      }
    }
    recognition.onend = () => setIsListening(false)
    recognition.onerror = () => setIsListening(false)
    recognition.start()
    recognitionRef.current = recognition
    setIsListening(true)
  }

  // ── 方案模板快速填充 ───────────────────────────────────────────────────
  const handlePrefillTemplate = () => {
    setInputValue('我是 [品牌名]，属于 [品类]，产品线是 [产品线]，目标人群 [目标人群]，想在 [城市] 做活动，预算 [金额] 万，周期 [时长] 个月')
  }

  // ── 产品海报 virtual message ─────────────────────────────────────────
  const handlePosterTemplate = () => {
    addVirtualMessage('text_to_image', '帮我生成一张产品海报图片')
  }

  // ── 产品视频 virtual message ──────────────────────────────────────────
  const handleVideoTemplate = () => {
    addVirtualMessage('generate_video', '帮我生成一条宣传视频')
  }

  // ── 文件上传 ───────────────────────────────────────────────────────────
  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return
    e.target.value = ''

    setUploading(true)
    try {
      const formData = new FormData()
      Array.from(files).forEach(f => formData.append('files', f))
      const res = await fetch(`${API_BASE}/upload`, { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Upload failed')
      const data = await res.json()
      const urls: string[] = data.files.map((item: { url: string }) =>
        item.url.startsWith('http') ? item.url : `${BACKEND_ORIGIN}${item.url}`
      )
      sendMessage(inputValue.trim(), urls)
    } catch {
      setUploadError('文件上传失败，请重试')
    } finally {
      setUploading(false)
    }
  }, [inputValue, sendMessage])

  // ── 发送文字 ───────────────────────────────────────────────────────────
  const handleSend = () => {
    const v = inputValue.trim()
    if (!v || isLoading || uploading) return
    sendMessage(v)
  }

  // ── ChatBubble 回调 ────────────────────────────────────────────────────
  const handleRetry = useCallback((messageId: string) => {
    retryMessage(messageId)
  }, [retryMessage])

  const handleGeneratePlan = useCallback((msgId: string) => {
    const aiIdx = messages.findIndex(m => m.id === msgId)
    if (aiIdx === -1) { onNavigate('brief'); return }
    const msg = messages[aiIdx]
    // 取 AI 消息前面最近的一条用户消息内容，作为 parseBriefInput 的输入源
    let userContent: string | undefined
    for (let i = aiIdx - 1; i >= 0; i--) {
      if (messages[i].role === 'user') { userContent = messages[i].content; break }
    }
    onNavigate('brief', userContent || msg.content || undefined, msg.brandInput)
  }, [messages, onNavigate])

  return (
    <>
      {error && <ErrorBar message={error} />}
      {uploadError && (
        <ErrorBar message={uploadError} onDismiss={() => setUploadError(null)} />
      )}

      <div className="chat">
        {messages.map(m => (
          <ChatBubble
            key={m.id}
            message={m}
            variant="mobile"
            onRetry={m.retryable ? handleRetry : undefined}
            onGeneratePlan={m.canGeneratePlan ? handleGeneratePlan : undefined}
            onVideoResult={updateVideoResult}
            onImageResult={updateImageResult}
          />
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
          <button className="qb" onClick={() => fileInputRef.current?.click()}>附件上传</button>
          <button className="qb" onClick={handlePrefillTemplate}>方案模版</button>
          <button className="qb" onClick={() => onNavigate('brief')}>方案生成</button>
          <button className="qb" onClick={handlePosterTemplate}>产品海报</button>
          <button className="qb" onClick={handleVideoTemplate}>产品视频</button>
        </div>
        <div className="inputbar-row">
          <input
            type="text"
            placeholder="给 Agent 发消息…"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleSend()
              }
            }}
            disabled={isLoading}
          />
          <button
            className="mic-btn"
            aria-label="语音输入"
            onClick={handleVoice}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="2" width="6" height="11" rx="3" ry="3" />
              <path d="M5 10a7 7 0 0 0 14 0" />
              <line x1="12" y1="19" x2="12" y2="22" />
            </svg>
          </button>
          <button
            className="send"
            aria-label="发送"
            onClick={handleSend}
            disabled={isLoading || uploading || !inputValue.trim()}
          >
            ↑
          </button>
        </div>
      </div>
    </>
  )
}
