// in_scope: brand-input, mobile-chat-session, market-analysis
// OpenSpec: openspec/changes/mobile-chat-ui-redesign
// 移动端聊天屏 — 新版沉浸式输入 + +号面板 + 聚焦chips
import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from 'react'
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

// ponytail: 推荐方案生成固定显示，其余 4 个胶囊从池中随机刷新
const PINNED_PROMPT: SuggestedPrompt = { id: 'nav-brief', icon: '📝', label: '推荐方案生成', action: 'navigate-brief' }

const REFRESHABLE_POOL: SuggestedPrompt[] = [
  { id: 'prefill-brand', icon: '💰', label: '预算评估', action: 'prefill-brand-template' },
  { id: 'prefill-market', icon: '📊', label: '市场分析', action: 'prefill-market-analysis' },
  { id: 'send-alliance', icon: '🤝', label: '创建盟域', action: 'send-text', payload: '帮我创建一个盟域活动方案' },
  { id: 'send-activity', icon: '🎯', label: '创建活动', action: 'send-text', payload: '帮我策划一个品牌营销活动' },
  { id: 'virtual-image', icon: '🖼️', label: '产品海报', action: 'virtual-image' },
  { id: 'virtual-video', icon: '🎬', label: '产品视频', action: 'virtual-video' },
]

// ponytail: 聚焦 chips 的 SVG 图标（与药丸网格一致但使用描边风格）
const FOCUS_CHIP_ICONS: Record<string, () => JSX.Element> = {
  'navigate-brief': () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" />
    </svg>
  ),
  'prefill-brand-template': () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  'prefill-market-analysis': () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 20V10" /><path d="M12 20V4" /><path d="M6 20v-6" />
    </svg>
  ),
  'send-text': () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
  'virtual-image': () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  'virtual-video': () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
    </svg>
  ),
}

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
  const [isInputFocused, setIsInputFocused] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [suggestedPrompts, setSuggestedPrompts] = useState<SuggestedPrompt[]>(() =>
    shuffle(REFRESHABLE_POOL).slice(0, 4)
  )

  // ponytail: 其余按短到长排列，推荐方案生成（最长的 6 字）放在最后
  const displayPrompts = [[...suggestedPrompts].sort((a, b) => a.label.length - b.label.length), PINNED_PROMPT].flat()

  const hasSentMessage = messages.length > 0
  const showSuggestions = !hasSentMessage && !showActionPanel && !isInputFocused
  const showFocusChips = !hasSentMessage && isInputFocused && inputValue.trim().length === 0 && !showActionPanel

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ── 换一批（带旋转动画） ───────────────────────────────────────────────
  const handleRefreshSuggestions = useCallback(() => {
    if (refreshing) return
    setRefreshing(true)
    // ponytail: 简单延时模拟换一批动画。升级路径：可考虑 CSSTransition 或 Framer Motion
    setTimeout(() => {
      setSuggestedPrompts(shuffle(REFRESHABLE_POOL).slice(0, 4))
      setRefreshing(false)
    }, 250)
  }, [refreshing])

  // ── 输入框聚焦/失焦 ────────────────────────────────────────────────────
  const handleInputFocus = useCallback(() => {
    setIsInputFocused(true)
  }, [])

  const handleInputBlur = useCallback(() => {
    setIsInputFocused(false)
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
    // ponytail: 自动获取最新上传的图片 URL 传入 virtual message，支持以图生图
    const lastImgUrl = messages.slice().reverse().find(m => m.imageUrls?.length)?.imageUrls?.[0]
    addVirtualMessage('text_to_image', '帮我生成一张产品海报图片', lastImgUrl)
  }, [addVirtualMessage, messages])

  const handleCreateVideo = useCallback(() => {
    const lastImgUrl = messages.slice().reverse().find(m => m.imageUrls?.length)?.imageUrls?.[0]
    addVirtualMessage('generate_video', '帮我生成一条宣传视频', lastImgUrl)
  }, [addVirtualMessage, messages])

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
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    // ponytail: 先复制文件再重置 input，因为 input.files 返回的 FileList 是实时的，
    // 重置 value 会清空它，导致后续 FormData 拿不到文件
    e.target.value = ''

    setUploading(true)
    try {
      const formData = new FormData()
      files.forEach(f => formData.append('files', f))
      const res = await fetch(`${API_BASE}/upload`, { method: 'POST', body: formData })
      if (!res.ok) throw new Error('Upload failed')
      const data = await res.json()
      // ponytail: 统一用本地上传 URL（同域），气泡展示与模型推理共用；
      // 后端以图生图/生视频时会读取本地文件转 Base64 内联，无需公网图床
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

  // ── 聚焦 chips 点击：填充输入框 ─────────────────────────────────────────
  const handleChipClick = useCallback((prompt: SuggestedPrompt) => {
    if (prompt.payload) {
      sendMessage(prompt.payload)
    } else {
      setInputValue(prompt.label)
      setTimeout(() => textInputRef.current?.focus(), 0)
    }
  }, [sendMessage, setInputValue])

  const floatingContent = useMemo(() => {
    if (showActionPanel) {
      return (
        <ChatActionPanel
          isOpen={showActionPanel}
          onClose={handleCloseActionPanel}
          onUpload={handleUploadClick}
          onCreateImage={handleCreateImage}
          onCreateVideo={handleCreateVideo}
        />
      )
    }
    if (showFocusChips) {
      return (
        <div className="focus-chips visible">
          {displayPrompts.map(p => (
            <button
              key={p.id}
              type="button"
              className="focus-chip"
              onMouseDown={e => {
                e.preventDefault()
                handleChipClick(p)
              }}
            >
              {FOCUS_CHIP_ICONS[p.action]?.()}
              <span>{p.label}</span>
            </button>
          ))}
        </div>
      )
    }
    return null
  }, [showActionPanel, showFocusChips, suggestedPrompts, handleChipClick])

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

      <div className={`chat-messages${showSuggestions ? ' suggestions-showing' : ''}${!hasSentMessage && isInputFocused ? ' input-focused' : ''}`}>
        {showSuggestions ? (
          <ChatSuggestionHeader
            prompts={displayPrompts}
            onPromptClick={handlePromptClick}
            onRefresh={handleRefreshSuggestions}
            refreshing={refreshing}
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

      <ChatInputBar
        value={inputValue}
        onChange={setInputValue}
        onSend={handleSend}
        onVoice={handleVoice}
        onToggleActionPanel={handleToggleActionPanel}
        isActionPanelOpen={showActionPanel}
        disabled={isLoading || uploading}
        inputRef={textInputRef}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        floatingPanel={floatingContent}
      />
    </div>
  )
}
