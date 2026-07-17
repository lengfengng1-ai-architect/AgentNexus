import { useCallback, useEffect, useReducer, useRef } from 'react'
import { streamChat } from '../api/workflow'
import type { BrandInput, ChatMessage } from '../types/chat'

const STORAGE_KEY = 'allygo_chat_history'

// ─── Streaming ID counter ────────────────────────────────────────────
let _streamIdCounter = 0

interface ChatState {
  messages: ChatMessage[]
  inputValue: string
  isLoading: boolean
  error: string | null
}

interface ImageResultData {
  image_url: string
  prompt_used?: string
  width?: number
  height?: number
}

interface VideoResultData {
  task_id: string
  video_url: string
  usage?: { resolution?: number; ratio?: string; output_video_duration?: number }
}

type ChatAction =
  | { type: 'SET_INPUT'; value: string }
  | { type: 'SEND_MESSAGE'; content: string; imageUrls?: string[]; imageCaptions?: string[] }
  | { type: 'STREAM_START' }
  | { type: 'STREAM_REASONING'; text: string }
  | { type: 'INTENT_RECEIVED'; intent: string; reply: string; brandInput: BrandInput; missingFields: string[]; gate?: string | null; imageUrls?: string[]; videoPrompt?: string | null; generationPrompt?: string | null; messageId?: string; marketName?: string | null }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RETRY_MESSAGE'; messageId: string }
  | { type: 'LOAD_HISTORY'; messages: ChatMessage[] }
  | { type: 'VIDEO_RESULT'; messageId: string; videoResult: VideoResultData }
  | { type: 'IMAGE_RESULT'; messageId: string; imageResult: ImageResultData }
  | { type: 'ADD_VIRTUAL_MESSAGE'; intent: ChatMessage['intent']; userContent?: string; imageUrl?: string; imageCaption?: string }
  | { type: 'UPDATE_MESSAGE_CONTENT'; messageId: string; content: string }
  | { type: 'SET_MARKET_RESEARCH_DONE'; messageId: string }
  | { type: 'APPEND_MARKET_RESEARCH_SOURCES'; messageId: string; sources: { url: string; title: string }[] }
  | { type: 'APPEND_MARKET_RESEARCH_LOG'; messageId: string; log: string }
  | { type: 'SET_MARKET_RESEARCH_RESULT'; messageId: string; result: Record<string, unknown> }

function createMessage(content: string, role: ChatMessage['role']): ChatMessage {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    role,
    content,
  }
}

function getLatestBrandInput(messages: ChatMessage[]): BrandInput | undefined {
  let merged: BrandInput | undefined
  for (let i = messages.length - 1; i >= 0; i--) {
    const b = messages[i].brandInput
    if (!b) continue
    if (!merged) {
      merged = { ...b }
    } else {
      // Merge: keep the latest non-null value for each field
      if (b.brand_name != null) merged.brand_name = b.brand_name
      if (b.category != null) merged.category = b.category
      if (b.city != null) merged.city = b.city
      if (b.budget != null) merged.budget = b.budget
      if (b.period != null) merged.period = b.period
    }
  }
  return merged
}

function getLatestImageUrls(messages: ChatMessage[]): string[] {
  for (let i = messages.length - 1; i >= 0; i--) {
    const urls = messages[i].imageUrls
    if (urls && urls.length > 0) return urls
  }
  return []
}

function getLatestImageCaptions(messages: ChatMessage[]): string[] {
  for (let i = messages.length - 1; i >= 0; i--) {
    const captions = messages[i].imageCaptions
    if (captions && captions.some(c => c)) return captions
  }
  return []
}

function getStreamingMsgIndex(msgs: ChatMessage[]): number {
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i].id.startsWith('stream-')) return i
  }
  return -1
}

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_INPUT':
      return { ...state, inputValue: action.value }

    case 'SEND_MESSAGE': {
      const userMessage: ChatMessage = {
        ...createMessage(action.content, 'user'),
        imageUrls: action.imageUrls && action.imageUrls.length > 0 ? action.imageUrls : undefined,
        imageCaptions:
          action.imageCaptions && action.imageCaptions.some(c => c) ? action.imageCaptions : undefined,
      }
      return { ...state, messages: [...state.messages, userMessage], inputValue: '', error: null }
    }

    case 'STREAM_START': {
      const sid = `stream-${++_streamIdCounter}`
      const streamMsg: ChatMessage = {
        id: sid,
        role: 'ai',
        content: '',
        isLoading: false,
        reasoning: '',
      }
      return { ...state, isLoading: true, messages: [...state.messages, streamMsg] }
    }

    case 'STREAM_REASONING': {
      const idx = getStreamingMsgIndex(state.messages)
      if (idx < 0) return state
      const m = { ...state.messages[idx], reasoning: (state.messages[idx].reasoning || '') + action.text }
      const next = [...state.messages]; next[idx] = m
      return { ...state, messages: next }
    }

    case 'INTENT_RECEIVED': {
      const msgs = state.messages.filter(m => !m.id.startsWith('stream-'))
      const canGeneratePlan = action.intent === 'generate_plan' && action.missingFields.length === 0
      const canStartMarketResearch = action.intent === 'market_research' && action.missingFields.length === 0
      const msgId = action.messageId || `ai-${Date.now()}`
      const aiMessage: ChatMessage = {
        id: msgId,
        role: 'ai',
        content: action.reply,
        isLoading: false,
        brandInput: action.brandInput,
        intent: action.intent as ChatMessage['intent'],
        canGeneratePlan,
        canStartMarketResearch,
        marketName: action.marketName ?? undefined,
        missingFields: action.missingFields.length > 0 ? action.missingFields : undefined,
        gate: action.gate,
        imageUrls: action.imageUrls,
        // AI 卡片（InlineImage/Video）从 aiMessage 读 caption；从最近一条带图用户消息延续
        imageCaptions: action.imageUrls?.length ? getLatestImageCaptions(msgs) : undefined,
        videoPrompt: action.videoPrompt,
        generationPrompt: action.generationPrompt,
      }
      return { ...state, isLoading: false, messages: [...msgs, aiMessage] }
    }

    case 'SET_ERROR': {
      const lastUserMsg = [...state.messages].reverse().find(m => m.role === 'user' && !m.isError)
      const updatedMessages = lastUserMsg
        ? state.messages.map(m => (m.id === lastUserMsg.id ? { ...m, isError: true, retryable: true } : m))
        : state.messages
      return { ...state, error: action.error, messages: updatedMessages, isLoading: false }
    }

    case 'CLEAR_ERROR':
      return { ...state, error: null }

    case 'RETRY_MESSAGE': {
      const updatedMessages = state.messages.map(m =>
        m.id === action.messageId ? { ...m, isError: false, retryable: false } : m,
      )
      return { ...state, messages: updatedMessages, isLoading: false }
    }

    case 'LOAD_HISTORY':
      return { ...state, messages: action.messages }

    case 'VIDEO_RESULT': {
      const next = state.messages.map(m =>
        m.id === action.messageId ? { ...m, videoResult: action.videoResult } : m,
      )
      return { ...state, messages: next }
    }

    case 'IMAGE_RESULT': {
      const next = state.messages.map(m =>
        m.id === action.messageId ? { ...m, imageResult: action.imageResult } : m,
      )
      return { ...state, messages: next }
    }

    case 'ADD_VIRTUAL_MESSAGE': {
      const userMsg: ChatMessage = {
        id: `virtual-user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        role: 'user',
        content: action.userContent ?? '',
      }
      const imageUrls = action.imageUrl ? [action.imageUrl] : undefined
      const aiMsg: ChatMessage = {
        id: `virtual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        role: 'ai',
        content: '',
        intent: action.intent,
        imageUrls: imageUrls ?? (action.intent === 'generate_video' || action.intent === 'text_to_video' ? [] : undefined),
        imageCaptions: action.imageCaption ? [action.imageCaption] : undefined,
        videoPrompt: action.intent === 'generate_video' || action.intent === 'text_to_video' ? null : undefined,
        generationPrompt: action.intent === 'text_to_image' ? '' : undefined,
      }
      return { ...state, messages: [...state.messages, userMsg, aiMsg] }
    }

    case 'UPDATE_MESSAGE_CONTENT': {
      const next = state.messages.map(m =>
        m.id === action.messageId ? { ...m, content: action.content } : m,
      )
      return { ...state, messages: next }
    }

    case 'SET_MARKET_RESEARCH_DONE': {
      const next = state.messages.map(m =>
        m.id === action.messageId ? { ...m, canStartMarketResearch: false } : m,
      )
      return { ...state, messages: next }
    }

    case 'APPEND_MARKET_RESEARCH_SOURCES': {
      const next = state.messages.map(m => {
        if (m.id !== action.messageId) return m
        const existing = m.marketResearchSources || []
        const existingUrls = new Set(existing.map(s => s.url))
        const fresh = action.sources.filter(s => s.url && !existingUrls.has(s.url))
        if (fresh.length === 0) return m
        return { ...m, marketResearchSources: [...existing, ...fresh] }
      })
      return { ...state, messages: next }
    }

    case 'APPEND_MARKET_RESEARCH_LOG': {
      const next = state.messages.map(m => {
        if (m.id !== action.messageId) return m
        const existing = m.marketResearchProgressLogs || []
        const updated = [...existing, action.log]
        // 截断保留最近 50 条
        if (updated.length > 50) updated.splice(0, updated.length - 50)
        return { ...m, marketResearchProgressLogs: updated }
      })
      return { ...state, messages: next }
    }

    case 'SET_MARKET_RESEARCH_RESULT': {
      const next = state.messages.map(m =>
        m.id === action.messageId ? { ...m, marketResearchResult: action.result } : m,
      )
      return { ...state, messages: next }
    }

    default:
      return state
  }
}

export function useChat() {
  // ponytail: 用 lazy initializer 同步读取历史，useState 初始值即为历史消息，
  // 避免「mount 时先以空 state 触发持久化 effect 覆盖 localStorage」的竞态。
  // reducer 的 LOAD_HISTORY 仍保留以兼容其他调用方。
  const [state, dispatch] = useReducer(chatReducer, undefined, () => {
    let messages: ChatMessage[] = []
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) messages = JSON.parse(raw) as ChatMessage[]
    } catch { /* ignore */ }
    return { messages, inputValue: '', isLoading: false, error: null }
  })
  const isProcessingRef = useRef(false)
  const messagesRef = useRef(state.messages)
  messagesRef.current = state.messages

  useEffect(() => {
    try {
      const persistable = state.messages.filter(m => !m.id.startsWith('virtual-'))
      localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable))
    } catch { /* ignore */ }
  }, [state.messages])

  const setInputValue = useCallback((value: string) => { dispatch({ type: 'SET_INPUT', value }) }, [])

  const sendMessage = useCallback(async (content: string, imageUrls?: string[], imageCaptions?: string[]) => {
    if (isProcessingRef.current || (!content.trim() && (!imageUrls || imageUrls.length === 0))) return
    isProcessingRef.current = true
    dispatch({ type: 'CLEAR_ERROR' })
    dispatch({ type: 'SEND_MESSAGE', content: content.trim(), imageUrls, imageCaptions })
    dispatch({ type: 'STREAM_START' })

    // Build full context: conversation history + merged brand_input
    const lastBrand = getLatestBrandInput(messagesRef.current)
    const conversationHistory = messagesRef.current
      .filter(m => !m.id.startsWith('stream-') && !m.id.startsWith('virtual-'))
      .map(m => `${m.role === 'user' ? '用户' : 'AI'}: ${m.content}`)
      .slice(-10) // keep last 10 exchanges
    const context: Record<string, unknown> = { conversation_history: conversationHistory }
    if (lastBrand) context.brand_input = lastBrand
    // ponytail: 图片上下文跨轮延续。本轮上传优先，否则沿用最近一条带图消息，
    // 使「先传图→反问→用户说想法」时仍能走以图生图/生视频。
    const effectiveImageUrls =
      imageUrls && imageUrls.length > 0 ? imageUrls : getLatestImageUrls(messagesRef.current)
    if (effectiveImageUrls.length > 0) context.image_urls = effectiveImageUrls
    // 图片描述（VL caption）与 image_urls 同生命周期，供意图识别预填生成描述
    const effectiveCaptions =
      imageCaptions && imageCaptions.some(c => c) ? imageCaptions : getLatestImageCaptions(messagesRef.current)
    if (effectiveCaptions.length > 0) context.image_captions = effectiveCaptions

    // Pass latest market_name for market_research context
    const lastMsgWithMarket = messagesRef.current.slice().reverse().find(m => m.marketName)
    if (lastMsgWithMarket?.marketName) {
      context.market_name = lastMsgWithMarket.marketName
    }

    try {
      let intentReceived = false
      let reasoningBuffer = ''
      for await (const chunk of streamChat(content.trim(), context)) {
        if (chunk.reasoning) {
          reasoningBuffer += chunk.reasoning
          dispatch({ type: 'STREAM_REASONING', text: chunk.reasoning })
        }
        if (chunk.intent && !intentReceived) {
          intentReceived = true
          const waitMs = Math.min(reasoningBuffer.length * 12 + 100, 2500)
          if (waitMs > 0) await new Promise(r => setTimeout(r, waitMs))
          dispatch({
            type: 'INTENT_RECEIVED',
            intent: chunk.intent.intent,
            reply: chunk.intent.reply,
            brandInput: chunk.intent.brand_input,
            missingFields: chunk.intent.missing_fields || [],
            gate: chunk.intent.gate,
            imageUrls: chunk.intent.image_url ? [chunk.intent.image_url] : undefined,
            videoPrompt: chunk.intent.video_prompt,
            generationPrompt: chunk.intent.generation_prompt,
            marketName: chunk.intent.market_name,
          })
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '发送失败，请重试'
      dispatch({ type: 'SET_ERROR', error: message })
    } finally {
      isProcessingRef.current = false
    }
  }, [])

  const retryMessage = useCallback(async (messageId: string) => {
    const msgs = messagesRef.current
    const messageToRetry = msgs.find(m => m.id === messageId)
    if (!messageToRetry || messageToRetry.role !== 'user') return
    dispatch({ type: 'RETRY_MESSAGE', messageId })
    dispatch({ type: 'STREAM_START' })

    const context = getLatestBrandInput(msgs)
      ? { brand_input: getLatestBrandInput(msgs) }
      : undefined

    try {
      let intentReceived = false
      let reasoningBuffer = ''
      for await (const chunk of streamChat(messageToRetry.content, context)) {
        if (chunk.reasoning) {
          reasoningBuffer += chunk.reasoning
          dispatch({ type: 'STREAM_REASONING', text: chunk.reasoning })
        }
        if (chunk.intent && !intentReceived) {
          intentReceived = true
          const waitMs = Math.min(reasoningBuffer.length * 12 + 100, 2500)
          if (waitMs > 0) await new Promise(r => setTimeout(r, waitMs))
          dispatch({
            type: 'INTENT_RECEIVED',
            intent: chunk.intent.intent,
            reply: chunk.intent.reply,
            brandInput: chunk.intent.brand_input,
            missingFields: chunk.intent.missing_fields || [],
            gate: chunk.intent.gate,
            imageUrls: chunk.intent.image_url ? [chunk.intent.image_url] : undefined,
            videoPrompt: chunk.intent.video_prompt,
            generationPrompt: chunk.intent.generation_prompt,
            marketName: chunk.intent.market_name,
          })
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '发送失败，请重试'
      dispatch({ type: 'SET_ERROR', error: message })
    }
  }, [])

  const prefillInput = useCallback((text: string) => { dispatch({ type: 'SET_INPUT', value: text }) }, [])

  const updateVideoResult = useCallback((messageId: string, videoResult: VideoResultData) => {
    dispatch({ type: 'VIDEO_RESULT', messageId, videoResult })
  }, [])

  const updateImageResult = useCallback((messageId: string, imageResult: ImageResultData) => {
    dispatch({ type: 'IMAGE_RESULT', messageId, imageResult })
  }, [])

  const addVirtualMessage = useCallback((intent: ChatMessage['intent'], userContent?: string, imageUrl?: string, imageCaption?: string) => {
    dispatch({ type: 'ADD_VIRTUAL_MESSAGE', intent, userContent, imageUrl, imageCaption })
  }, [])

  const updateMessageContent = useCallback((messageId: string, content: string) => {
    dispatch({ type: 'UPDATE_MESSAGE_CONTENT', messageId, content })
  }, [])

  const setMarketResearchDone = useCallback((messageId: string) => {
    dispatch({ type: 'SET_MARKET_RESEARCH_DONE', messageId })
  }, [])

  const appendMarketResearchSources = useCallback((messageId: string, sources: { url: string; title: string }[]) => {
    dispatch({ type: 'APPEND_MARKET_RESEARCH_SOURCES', messageId, sources })
  }, [])

  const appendMarketResearchLog = useCallback((messageId: string, log: string) => {
    dispatch({ type: 'APPEND_MARKET_RESEARCH_LOG', messageId, log })
  }, [])

  const setMarketResearchResult = useCallback((messageId: string, result: Record<string, unknown>) => {
    dispatch({ type: 'SET_MARKET_RESEARCH_RESULT', messageId, result })
  }, [])

  const latestBrandInput = getLatestBrandInput(state.messages)
  return {
    messages: state.messages,
    inputValue: state.inputValue,
    isLoading: state.isLoading,
    error: state.error,
    latestBrandInput,
    sendMessage,
    retryMessage,
    prefillInput,
    setInputValue,
    updateVideoResult,
    updateImageResult,
    addVirtualMessage,
    updateMessageContent,
    setMarketResearchDone,
    appendMarketResearchSources,
    appendMarketResearchLog,
    setMarketResearchResult,
  }
}

export type { ChatMessage }
