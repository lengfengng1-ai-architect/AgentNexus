// ScreenChat — ① 对话入口屏（移动端）
// OpenSpec: openspec/changes/mobile-chat-backend-integration
// in_scope: brand-input, mobile-chat-session
// 使用 useChat hook 对接后端 /chat/stream SSE 端点
import { useCallback, useEffect, useRef, useState } from 'react'
import { useChat } from '../../hooks/useChat'
import { ChatBubble } from '../../components/ChatBubble'
import { ErrorBar } from '../../components/ErrorBar'

export type MobileScreen = 'chat' | 'brief' | 'generate' | 'actions' | 'dispatch'

interface ScreenChatProps {
  onNavigate: (s: MobileScreen) => void
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
    setInputValue('我是 [品牌名]，属于 [品类]，想在 [城市] 做活动，预算 [金额] 万，周期 [时长] 个月')
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

  const handleGeneratePlan = useCallback(() => {
    onNavigate('brief')
  }, [onNavigate])

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
          <button className="qb" onClick={() => onNavigate('brief')}>填写简报</button>
          <button className="qb" onClick={handleVoice}>语音输入</button>
          <button className="qb" onClick={() => fileInputRef.current?.click()}>附件</button>
          <button className="qb" onClick={handlePrefillTemplate}>方案模板</button>
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
