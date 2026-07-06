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

type ChatAction =
  | { type: 'SET_INPUT'; value: string }
  | { type: 'SEND_MESSAGE'; content: string }
  | { type: 'STREAM_START' }
  | { type: 'STREAM_REASONING'; text: string }
  | { type: 'INTENT_RECEIVED'; intent: string; reply: string; brandInput: BrandInput; missingFields: string[]; gate?: string | null }
  | { type: 'SET_ERROR'; error: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'RETRY_MESSAGE'; messageId: string }
  | { type: 'LOAD_HISTORY'; messages: ChatMessage[] }

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
      const userMessage = createMessage(action.content, 'user')
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
        intent: 'thinking' as ChatMessage['intent'],
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
      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'ai',
        content: action.reply,
        isLoading: false,
        brandInput: action.brandInput,
        intent: action.intent as ChatMessage['intent'],
        canGeneratePlan,
        missingFields: action.missingFields.length > 0 ? action.missingFields : undefined,
        gate: action.gate,
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

    default:
      return state
  }
}

export function useChat() {
  const [state, dispatch] = useReducer(chatReducer, { messages: [], inputValue: '', isLoading: false, error: null })
  const isProcessingRef = useRef(false)
  const messagesRef = useRef(state.messages)
  messagesRef.current = state.messages

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as ChatMessage[]
        dispatch({ type: 'LOAD_HISTORY', messages: parsed })
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state.messages)) } catch { /* ignore */ }
  }, [state.messages])

  const setInputValue = useCallback((value: string) => { dispatch({ type: 'SET_INPUT', value }) }, [])

  const sendMessage = useCallback(async (content: string) => {
    if (isProcessingRef.current || !content.trim()) return
    isProcessingRef.current = true
    dispatch({ type: 'CLEAR_ERROR' })
    dispatch({ type: 'SEND_MESSAGE', content: content.trim() })
    dispatch({ type: 'STREAM_START' })

    // Build full context: conversation history + merged brand_input
    const lastBrand = getLatestBrandInput(messagesRef.current)
    const conversationHistory = messagesRef.current
      .filter(m => !m.id.startsWith('stream-'))
      .map(m => `${m.role === 'user' ? '用户' : 'AI'}: ${m.content}`)
      .slice(-10) // keep last 10 exchanges
    const context: Record<string, unknown> = { conversation_history: conversationHistory }
    if (lastBrand) context.brand_input = lastBrand

    try {
      let intentReceived = false
      for await (const chunk of streamChat(content.trim(), context)) {
        if (chunk.reasoning) {
          dispatch({ type: 'STREAM_REASONING', text: chunk.reasoning })
        }
        if (chunk.intent && !intentReceived) {
          intentReceived = true
          dispatch({
            type: 'INTENT_RECEIVED',
            intent: chunk.intent.intent,
            reply: chunk.intent.reply,
            brandInput: chunk.intent.brand_input,
            missingFields: chunk.intent.missing_fields || [],
            gate: chunk.intent.gate,
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
      for await (const chunk of streamChat(messageToRetry.content, context)) {
        if (chunk.reasoning) {
          dispatch({ type: 'STREAM_REASONING', text: chunk.reasoning })
        }
        if (chunk.intent && !intentReceived) {
          intentReceived = true
          dispatch({
            type: 'INTENT_RECEIVED',
            intent: chunk.intent.intent,
            reply: chunk.intent.reply,
            brandInput: chunk.intent.brand_input,
            missingFields: chunk.intent.missing_fields || [],
            gate: chunk.intent.gate,
          })
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '发送失败，请重试'
      dispatch({ type: 'SET_ERROR', error: message })
    }
  }, [])

  const prefillInput = useCallback((text: string) => { dispatch({ type: 'SET_INPUT', value: text }) }, [])

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
  }
}

export type { ChatMessage }
