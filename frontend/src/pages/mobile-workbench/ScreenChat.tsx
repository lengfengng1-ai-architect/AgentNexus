// in_scope: brand-input, mobile-chat-session, market-analysis
// OpenSpec: openspec/changes/mobile-chat-ui-redesign
// 移动端聊天屏 — 新版沉浸式输入 + +号面板 + 聚焦chips
import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from 'react'
import { useChat } from '../../hooks/useChat'
import { useMarketResearchStream } from '../../hooks/useMarketResearchStream'
import { useBudgetAssessmentStream } from '../../hooks/useBudgetAssessmentStream'
import { useActivityPlanningStream } from '../../hooks/useActivityPlanningStream'
import { useAlliancePlanningStream } from '../../hooks/useAlliancePlanningStream'
import { useCompetitorAnalysisStream } from '../../hooks/useCompetitorAnalysisStream'
import { useCommunityOperationsStream } from '../../hooks/useCommunityOperationsStream'
import { ChatBubble } from '../../components/ChatBubble'
import { ErrorBar } from '../../components/ErrorBar'
import { ChatSuggestionHeader } from './screen-chat/ChatSuggestionHeader'
import { ChatActionPanel } from './screen-chat/ChatActionPanel'
import { ChatInputBar } from './screen-chat/ChatInputBar'
import type { SuggestedPrompt } from './screen-chat/types'
import './screen-chat/screen-chat.css'
import type { BrandInput } from '../../types/chat'

export type MobileScreen = 'chat' | 'brief' | 'generate' | 'actions' | 'dispatch' | 'preview' | 'budget-preview' | 'action-preview' | 'research-report' | 'draft-list' | 'budget-assessment' | 'activity-planning' | 'alliance-planning' | 'competitor-analysis' | 'community-operations'

interface ScreenChatProps {
  onNavigate: (s: MobileScreen, inputText?: string, brandInput?: BrandInput, researchId?: string, budgetAssessmentId?: string, activityPlanningId?: string, alliancePlanningId?: string) => void
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'
const BACKEND_ORIGIN = API_BASE.replace(/\/api\/v1\/?$/, '')

// ponytail: 推荐方案生成是种子消息 → 意图识别多轮 → 5 字段齐后出按钮 → 跳简报
const PINNED_PROMPT: SuggestedPrompt = { id: 'nav-brief', icon: '📝', label: '推荐方案生成', action: 'send-text', payload: '我需要生成一份营销方案' }

const REFRESHABLE_POOL: SuggestedPrompt[] = [
  { id: 'prefill-brand', icon: '💰', label: '预算评估', action: 'send-text', payload: '帮我做预算评估' },
  { id: 'prefill-market', icon: '📊', label: '市场分析', action: 'prefill-market-analysis' },
  { id: 'send-alliance', icon: '🤝', label: '创建盟域', action: 'send-text', payload: '帮我创建一个盟域' },
  { id: 'send-activity', icon: '🎯', label: '创建活动', action: 'send-text', payload: '帮我规划一个活动' },
  { id: 'competitor-analysis', icon: '🔍', label: '竞品分析', action: 'send-text', payload: '帮我做竞品分析' },
  { id: 'community-operations', icon: '👥', label: '社群运营', action: 'send-text', payload: '帮我规划社群运营' },
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

// ponytail: 聚焦态 chips 的示例开场白。与药丸 displayPrompts 解耦——4 条 send-text 示例，
// 每条带 payload，点击走 sendMessage(payload) → 意图路由（避免旧 chips 对无 payload 胶囊的"填 label"死路）。
// 注意：action 字段在此仅作 FOCUS_CHIP_ICONS 的图标索引，不代表真实动作（真实动作统一是发送 payload）。
const FOCUS_CHIP_EXAMPLES: SuggestedPrompt[] = [
  { id: 'example-market', icon: '', label: '帮我调研一下智能手表', action: 'prefill-market-analysis', payload: '帮我调研一下智能手表' },
  { id: 'example-image', icon: '', label: '帮我生成一张运动产品海报', action: 'virtual-image', payload: '帮我生成一张运动产品海报' },
  { id: 'example-video', icon: '', label: '帮我做一条产品宣传片', action: 'virtual-video', payload: '帮我做一条产品宣传片' },
  { id: 'example-competitor', icon: '', label: '帮我做运动鞋的竞品分析', action: 'send-text', payload: '帮我做运动鞋的竞品分析' },
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
    setBudgetAssessmentResult,
    setActivityPlanningResult,
    setAlliancePlanningResult,
    setCompetitorAnalysisResult,
    setCommunityOperationsResult,
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

  const { startBudgetAssessment, activeIds: budgetActiveIds } = useBudgetAssessmentStream({
    updateMessageContent,
    setBudgetAssessmentResult,
  })

  const { startActivityPlanning, activeIds: activityActiveIds } = useActivityPlanningStream({
    updateMessageContent,
    setActivityPlanningResult,
  })

  const { startAlliancePlanning, activeIds: allianceActiveIds } = useAlliancePlanningStream({
    updateMessageContent,
    setAlliancePlanningResult,
  })

  const { startCompetitorAnalysis, activeIds: competitorActiveIds } = useCompetitorAnalysisStream({
    updateMessageContent,
    setCompetitorAnalysisResult,
  })

  const { startCommunityOperations, activeIds: communityActiveIds } = useCommunityOperationsStream({
    updateMessageContent,
    setCommunityOperationsResult,
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
    const lastImgMsg = messages.slice().reverse().find(m => m.imageUrls?.length)
    addVirtualMessage('text_to_image', '帮我生成一张产品海报图片', lastImgMsg?.imageUrls?.[0], lastImgMsg?.imageCaptions?.[0] || undefined)
  }, [addVirtualMessage, messages])

  const handleCreateVideo = useCallback(() => {
    const lastImgMsg = messages.slice().reverse().find(m => m.imageUrls?.length)
    addVirtualMessage('generate_video', '帮我生成一条宣传视频', lastImgMsg?.imageUrls?.[0], lastImgMsg?.imageCaptions?.[0] || undefined)
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
      // VL 生成的图片描述（失败/非图片为 null），随消息传给意图识别与 AI 优化
      const captions: string[] = data.files.map((item: { caption?: string | null }) => item.caption ?? '')
      sendMessage(inputValue.trim(), urls, captions)
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

  // ── 预算评估：自动触发（字段齐全时） ──────────────────────────────────────
  useEffect(() => {
    for (const m of messages) {
      if (m.canStartBudgetAssessment && !budgetActiveIds.has(m.id) && m.brandInput) {
        const bi = m.brandInput
        if (bi.category && bi.budget && bi.period && bi.city) {
          startBudgetAssessment(m.id, bi.category, bi.budget, bi.period, bi.city)
        }
      }
    }
  }, [messages, budgetActiveIds, startBudgetAssessment])

  // ── 活动规划：自动触发（sport_type + city 齐全时） ────────────────────────
  useEffect(() => {
    for (const m of messages) {
      if (m.canStartActivityPlanning && !activityActiveIds.has(m.id) && m.sportType && m.brandInput?.city) {
        startActivityPlanning(m.id, m.sportType, m.brandInput.city)
      }
    }
  }, [messages, activityActiveIds, startActivityPlanning])

  // ── 盟域规划：自动触发（category + city 齐全时） ──────────────────────────
  useEffect(() => {
    for (const m of messages) {
      if (m.canStartAlliancePlanning && !allianceActiveIds.has(m.id) && m.brandInput?.category && m.brandInput?.city) {
        startAlliancePlanning(m.id, m.brandInput.category, m.brandInput.city)
      }
    }
  }, [messages, allianceActiveIds, startAlliancePlanning])

  // ── 竞品分析：自动触发（category 齐全时） ──────────────────────────────────
  useEffect(() => {
    for (const m of messages) {
      if (m.canStartCompetitorAnalysis && !competitorActiveIds.has(m.id) && m.brandInput?.category) {
        const brandName = m.brandInput?.brand_name || null
        startCompetitorAnalysis(m.id, m.brandInput.category, brandName)
      }
    }
  }, [messages, competitorActiveIds, startCompetitorAnalysis])

  // ── 社群运营：自动触发（category + city 齐全时） ───────────────────────────
  useEffect(() => {
    for (const m of messages) {
      if (m.canStartCommunityOperations && !communityActiveIds.has(m.id) && m.brandInput?.category && m.brandInput?.city) {
        startCommunityOperations(m.id, m.brandInput.category, m.brandInput.city)
      }
    }
  }, [messages, communityActiveIds, startCommunityOperations])

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
          {FOCUS_CHIP_EXAMPLES.map(p => (
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
  }, [showActionPanel, showFocusChips, handleChipClick])

  // ── 调研结果页入口 ──────────────────────────────────────────────────
  const handleOpenResearchReport = useCallback((msgId: string) => {
    const msg = messages.find(m => m.id === msgId)
    if (!msg?.researchId) return  // 兜底：无 researchId 不跳转
    // inputText 位置复用传 marketName 作覆盖屏顶栏兜底标题
    onNavigate('research-report', msg.marketName || '', undefined, msg.researchId)
  }, [messages, onNavigate])

  // ── 预算评估详情页入口 ──────────────────────────────────────────────
  const handleOpenBudgetAssessment = useCallback((msgId: string) => {
    const msg = messages.find(m => m.id === msgId)
    if (!msg?.budgetAssessmentId) return
    const title = msg.brandInput?.category ? `${msg.brandInput.category}预算评估` : '预算评估'
    onNavigate('budget-assessment', title, undefined, undefined, msg.budgetAssessmentId)
  }, [messages, onNavigate])

  // ── 活动规划详情页入口 ──────────────────────────────────────────────
  const handleOpenActivityPlanning = useCallback((msgId: string) => {
    const msg = messages.find(m => m.id === msgId)
    if (!msg?.activityPlanningId) return
    const title = msg.sportType ? `${msg.sportType}活动规划` : '活动规划'
    onNavigate('activity-planning', title, undefined, undefined, undefined, msg.activityPlanningId)
  }, [messages, onNavigate])

  // ── 盟域规划详情页入口 ──────────────────────────────────────────────
  const handleOpenAlliancePlanning = useCallback((msgId: string) => {
    const msg = messages.find(m => m.id === msgId)
    if (!msg?.alliancePlanningId) return
    const title = msg.brandInput?.category ? `${msg.brandInput.category}盟域规划` : '盟域规划'
    onNavigate('alliance-planning', title, undefined, undefined, undefined, undefined, msg.alliancePlanningId)
  }, [messages, onNavigate])

  // ── 竞品分析详情页入口 ──────────────────────────────────────────────
  const handleOpenCompetitorAnalysis = useCallback((msgId: string) => {
    const msg = messages.find(m => m.id === msgId)
    if (!msg?.competitorAnalysisId) return
    const title = msg.brandInput?.category ? `${msg.brandInput.category}竞品分析` : '竞品分析'
    onNavigate('competitor-analysis', title, undefined, undefined, undefined, undefined, undefined, msg.competitorAnalysisId)
  }, [messages, onNavigate])

  // ── 社群运营详情页入口 ──────────────────────────────────────────────
  const handleOpenCommunityOperations = useCallback((msgId: string) => {
    const msg = messages.find(m => m.id === msgId)
    if (!msg?.communityOperationsId) return
    const title = msg.brandInput?.category ? `${msg.brandInput.category}社群运营` : '社群运营'
    onNavigate('community-operations', title, undefined, undefined, undefined, undefined, undefined, undefined, msg.communityOperationsId)
  }, [messages, onNavigate])

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
          onOpenResearchReport={m.researchId ? handleOpenResearchReport : undefined}
          onOpenBudgetAssessment={m.budgetAssessmentId ? handleOpenBudgetAssessment : undefined}
          onOpenActivityPlanning={m.activityPlanningId ? handleOpenActivityPlanning : undefined}
          onOpenAlliancePlanning={m.alliancePlanningId ? handleOpenAlliancePlanning : undefined}
          onOpenCompetitorAnalysis={m.competitorAnalysisId ? handleOpenCompetitorAnalysis : undefined}
          onOpenCommunityOperations={m.communityOperationsId ? handleOpenCommunityOperations : undefined}
          onVideoResult={updateVideoResult}
          onImageResult={updateImageResult}
        />
      ))}
      <div ref={bottomRef} />
    </>
  ), [messages, marketResearchActiveIds, activeSearches, handleRetry, handleGeneratePlan, handleOpenResearchReport, handleOpenBudgetAssessment, handleOpenActivityPlanning, handleOpenAlliancePlanning, handleOpenCompetitorAnalysis, handleOpenCommunityOperations, updateVideoResult, updateImageResult])

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
