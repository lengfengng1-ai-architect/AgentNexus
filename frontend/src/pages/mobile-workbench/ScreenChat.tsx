// in_scope: brand-input, mobile-chat-session, market-analysis
// OpenSpec: openspec/changes/mobile-chat-ui-redesign
// 移动端聊天屏 — 新版沉浸式输入 + +号面板
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useChat } from '../../hooks/useChat'
import { useMarketResearchStream } from '../../hooks/useMarketResearchStream'
import { ChatBubble } from '../../components/ChatBubble'
import { ErrorBar } from '../../components/ErrorBar'
import { ChatSuggestionHeader } from './screen-chat/ChatSuggestionHeader'
import { ChatActionPanel } from './screen-chat/ChatActionPanel'
import { ChatInputBar } from './screen-chat/ChatInputBar'
import type { SuggestedPrompt } from './screen-chat/types'
import './screen-chat/screen-chat.css'
import type { BrandInput } from '../../types/chat'

export type MobileScreen = 'chat' | 'brief' | 'generate' | 'actions' | 'dispatch' | 'preview' | 'budget-preview' | 'action-preview'

interface ScreenChatProps {
  onNavigate: (s: MobileScreen, inputText?: string, brandInput?: BrandInput) => void
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'
const BACKEND_ORIGIN = API_BASE.replace(/\/api\/v1\/?$/, '')

const SUGGESTION_POOL: SuggestedPrompt[] = [
  { id: 'nav-brief', icon: '📝', label: '推荐方案生成', action: 'navigate-brief' },
  { id: 'prefill-brand', icon: '💰', label: '预算评估', action: 'prefill-brand-template' },
  { id: 'prefill-market', icon: '📊', label: '市场分析', action: 'prefill-market-analysis' },
  { id: 'send-alliance', icon: '🤝', label: '创建盟域', action: 'send-text', payload: '帮我创建一个盟域活动方案' },
  { id: 'send-activity', icon: '🎯', label: '创建活动', action: 'send-text', payload: '帮我策划一个品牌营销活动' },
  { id: 'virtual-image', icon: '🖼️', label: '产品海报', action: 'virtual-image' },
  { id: 'virtual-video', icon: '🎬', label: '产品视频', action: 'virtual-video' },
]

// ponytail: 简单随机打乱；天花板是伪随机分布不均，升级路径可引入加权或后端推荐
function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5)
}

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
    updateMessageContent,
    setMarketResearchDone,
    appendMarketResearchSources,
    appendMarketResearchLog,
    setMarketResearchResult,
  } = useChat()

  const {
    startMarketResearch,
    activeIds: marketResearchActiveIds,
    activeSearches,
  } = useMarketResearchStream({
    updateMessageContent,
    setMarketResearchDone,
    appendMarketResearchSources,
    appendMarketResearchLog,
    setMarketResearchResult,
  })

  const bottomRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textInputRef = useRef<HTMLInputElement>(null)
  const [isListening, setIsListening] = useState(false)
  // @ts-expect-error SpeechRecognition 浏览器类型未在 lib.dom.d.ts 中定义，运行时从 window 获取
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const inputValueRef = useRef<string>(inputValue)
  useEffect(() => { inputValueRef.current = inputValue }, [inputValue])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const [showActionPanel, setShowActionPanel] = useState(false)
  const [suggestedPrompts, setSuggestedPrompts] = useState<SuggestedPrompt[]>(() =>
    shuffle(SUGGESTION_POOL).slice(0, 4)
  )

  const hasSentMessage = messages.length > 0
  const showSuggestions = !hasSentMessage && !showActionPanel

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── 换一批 ─────────────────────────────────────────────────────────────
  const handleRefreshSuggestions = useCallback(() => {
    setSuggestedPrompts(shuffle(SUGGESTION_POOL).slice(0, 4))
  }, [])

  // ── 推荐卡片点击 ───────────────────────────────────────────────────────
  const handlePromptClick = useCallback((prompt: SuggestedPrompt) => {
    switch (prompt.action) {
      case 'navigate-brief':
        onNavigate('brief')
        break
      case 'prefill-brand-template':
        setInputValue('我是 [品牌名]，属于 [品类]，产品线是 [产品线]，目标人群 [目标人群]，想在 [城市] 做活动，预算 [金额] 万，周期 [时长] 个月')
        setTimeout(() => textInputRef.current?.focus(), 0)
        break
      case 'prefill-market-analysis':
        setInputValue('我要对[产品名]进行市场分析')
        setTimeout(() => textInputRef.current?.focus(), 0)
        break
      case 'send-text':
        if (prompt.payload) sendMessage(prompt.payload)
        break
      case 'virtual-image':
        addVirtualMessage('text_to_image', '帮我生成一张产品海报图片')
        break
      case 'virtual-video':
        addVirtualMessage('generate_video', '帮我生成一条宣传视频')
        break
    }
  }, [onNavigate, setInputValue, sendMessage, addVirtualMessage])

  // ── + 号面板 ───────────────────────────────────────────────────────────
  const handleToggleActionPanel = useCallback(() => {
    setShowActionPanel(prev => !prev)
  }, [])

  const handleCloseActionPanel = useCallback(() => {
    setShowActionPanel(false)
  }, [])

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleCreateImage = useCallback(() => {
    addVirtualMessage('text_to_image', '帮我生成一张产品海报图片')
  }, [addVirtualMessage])

  const handleCreateVideo = useCallback(() => {
    addVirtualMessage('generate_video', '帮我生成一条宣传视频')
  }, [addVirtualMessage])

  // ── 语音输入 ───────────────────────────────────────────────────────────
  const handleVoice = useCallback(() => {
    const Win = window as unknown as {
      // @ts-expect-error SpeechRecognition 为浏览器 Web Speech API，lib.dom.d.ts 未声明
      SpeechRecognition?: new () => SpeechRecognition
      // @ts-expect-error 同上
      webkitSpeechRecognition?: new () => SpeechRecognition
    }
    const API = Win.SpeechRecognition ?? Win.webkitSpeechRecognition
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
  }, [isListening, setInputValue])

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
  const handleSend = useCallback(() => {
    const v = inputValue.trim()
    if (!v || isLoading || uploading) return
    sendMessage(v)
  }, [inputValue, isLoading, uploading, sendMessage])

  // ── ChatBubble 回调 ────────────────────────────────────────────────────
  const handleRetry = useCallback((messageId: string) => {
    retryMessage(messageId)
  }, [retryMessage])

  const handleGeneratePlan = useCallback((msgId: string) => {
    const aiIdx = messages.findIndex(m => m.id === msgId)
    if (aiIdx === -1) { onNavigate('brief'); return }
    const msg = messages[aiIdx]
    let userContent: string | undefined
    for (let i = aiIdx - 1; i >= 0; i--) {
      if (messages[i].role === 'user') { userContent = messages[i].content; break }
    }
    onNavigate('brief', userContent || msg.content || undefined, msg.brandInput)
  }, [messages, onNavigate])

  // ── 市场分析：自动触发 ──────────────────────────────────────────────────
  useEffect(() => {
    for (const m of messages) {
      if (m.canStartMarketResearch && !marketResearchActiveIds.has(m.id) && m.marketName) {
        startMarketResearch(m.id, m.marketName, m.brandInput?.category || '')
      }
    }
  }, [messages, marketResearchActiveIds, startMarketResearch])

  // 清理语音识别
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop()
    }
  }, [])

  const chatContent = useMemo(() => (
    <>
      {messages.map(m => (
        <ChatBubble
          key={m.id}
          message={m}
          variant="mobile"
          isMarketResearchActive={marketResearchActiveIds.has(m.id)}
          activeSearches={
            marketResearchActiveIds.has(m.id) ? activeSearches : undefined
          }
          onRetry={m.retryable ? handleRetry : undefined}
          onGeneratePlan={m.canGeneratePlan ? handleGeneratePlan : undefined}
          onVideoResult={updateVideoResult}
          onImageResult={updateImageResult}
        />
      ))}
      <div ref={bottomRef} />
    </>
  ), [messages, marketResearchActiveIds, activeSearches, handleRetry, handleGeneratePlan, updateVideoResult, updateImageResult])

  return (
    <div className="chat-screen">
      {error && <ErrorBar message={error} />}
      {uploadError && (
        <ErrorBar message={uploadError} onDismiss={() => setUploadError(null)} />
      )}

      <div className="chat-messages">
        {showSuggestions ? (
          <ChatSuggestionHeader
            prompts={suggestedPrompts}
            onPromptClick={handlePromptClick}
            onRefresh={handleRefreshSuggestions}
          />
        ) : (
          chatContent
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      <ChatActionPanel
        isOpen={showActionPanel}
        onClose={handleCloseActionPanel}
        onUpload={handleUploadClick}
        onCreateImage={handleCreateImage}
        onCreateVideo={handleCreateVideo}
      />

      <ChatInputBar
        value={inputValue}
        onChange={setInputValue}
        onSend={handleSend}
        onVoice={handleVoice}
        onToggleActionPanel={handleToggleActionPanel}
        isActionPanelOpen={showActionPanel}
        disabled={isLoading || uploading}
        inputRef={textInputRef}
      />
    </div>
  )
}
