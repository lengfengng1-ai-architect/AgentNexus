import { useCallback, useEffect, useReducer, useRef } from 'react'
import { runChatPipeline } from '../api/workflow'
import type { BrandInput, ChatMessage } from '../types/chat'

const STORAGE_KEY = 'allygo_chat_history'

interface ChatState {
  messages: ChatMessage[]
  inputValue: string
  isLoading: boolean
  error: string | null
}

type ChatAction =
  | { type: 'SET_INPUT'; value: string }
  | { type: 'SEND_MESSAGE'; content: string }
  | {
      type: 'RECEIVE_MESSAGE'
      reply: string
      brandInput: BrandInput
      intent?: ChatMessage['intent']
      isComplete: boolean
      canGeneratePlan: boolean
    }
  | { type: 'LOADING_MESSAGE' }
  | { type: 'REMOVE_LOADING' }
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

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_INPUT':
      return { ...state, inputValue: action.value }

    case 'SEND_MESSAGE': {
      const userMessage = createMessage(action.content, 'user')
      return {
        ...state,
        messages: [...state.messages, userMessage],
        inputValue: '',
        error: null,
      }
    }

    case 'LOADING_MESSAGE': {
      const loadingMessage: ChatMessage = {
        id: `loading-${Date.now()}`,
        role: 'ai',
        content: '',
        isLoading: true,
      }
      return { ...state, isLoading: true, messages: [...state.messages, loadingMessage] }
    }

    case 'REMOVE_LOADING': {
      return {
        ...state,
        isLoading: false,
        messages: state.messages.filter((m) => !m.isLoading),
      }
    }

    case 'RECEIVE_MESSAGE': {
      const aiMessage: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: 'ai',
        content: action.reply,
        brandInput: action.brandInput,
        intent: action.intent,
        isComplete: action.isComplete,
        canGeneratePlan: action.canGeneratePlan,
      }
      return {
        ...state,
        isLoading: false,
        messages: [...state.messages.filter((m) => !m.isLoading), aiMessage],
      }
    }

    case 'SET_ERROR': {
      const lastUserMessage = [...state.messages]
        .reverse()
        .find((m) => m.role === 'user' && !m.isError)
      const updatedMessages = lastUserMessage
        ? state.messages.map((m) =>
            m.id === lastUserMessage.id ? { ...m, isError: true, retryable: true } : m,
          )
        : state.messages
      return {
        ...state,
        isLoading: false,
        error: action.error,
        messages: updatedMessages.filter((m) => !m.isLoading),
      }
    }

    case 'CLEAR_ERROR':
      return { ...state, error: null }

    case 'RETRY_MESSAGE': {
      const messageToRetry = state.messages.find((m) => m.id === action.messageId)
      if (!messageToRetry || messageToRetry.role !== 'user') return state
      const cleanedMessages = state.messages
        .filter((m) => m.id !== action.messageId)
        .map((m) => (m.role === 'user' && m.isError ? { ...m, isError: false, retryable: false } : m))
      return {
        ...state,
        error: null,
        messages: [...cleanedMessages, createMessage(messageToRetry.content, 'user')],
      }
    }

    case 'LOAD_HISTORY':
      return { ...state, messages: action.messages }

    default:
      return state
  }
}

function getLatestBrandInput(messages: ChatMessage[]): BrandInput | undefined {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i]
    if (message.role === 'ai' && message.brandInput) {
      return message.brandInput
    }
  }
  return undefined
}

export function useChat() {
  const [state, dispatch] = useReducer(chatReducer, {
    messages: [],
    inputValue: '',
    isLoading: false,
    error: null,
  })

  const isProcessingRef = useRef(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as ChatMessage[]
        dispatch({ type: 'LOAD_HISTORY', messages: parsed })
      }
    } catch {
      // ignore corrupted storage
    }
  }, [])

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.messages))
    } catch {
      // ignore storage errors
    }
  }, [state.messages])

  const setInputValue = useCallback((value: string) => {
    dispatch({ type: 'SET_INPUT', value })
  }, [])

  const sendMessage = useCallback(
    async (content: string) => {
      if (isProcessingRef.current || !content.trim()) return
      isProcessingRef.current = true
      dispatch({ type: 'CLEAR_ERROR' })
      dispatch({ type: 'SEND_MESSAGE', content: content.trim() })
      dispatch({ type: 'LOADING_MESSAGE' })

      try {
        const response = await runChatPipeline(content.trim())
        const intent = response.outputs?.intent
        const reply = response.outputs?.reply_builder?.reply
        if (!reply) {
          throw new Error('后端未返回有效回复')
        }
        dispatch({
          type: 'RECEIVE_MESSAGE',
          reply,
          brandInput: intent?.brand_input ?? {
            brand_name: null,
            category: null,
            city: null,
            budget: null,
            period: null,
          },
          intent: intent?.intent,
          isComplete: intent?.intent === 'generate_plan' && !intent?.missing_fields?.length,
          canGeneratePlan:
            intent?.intent === 'generate_plan' && !intent?.missing_fields?.length,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : '发送失败，请重试'
        dispatch({ type: 'SET_ERROR', error: message })
      } finally {
        isProcessingRef.current = false
      }
    },
    [],
  )

  const retryMessage = useCallback(async (messageId: string) => {
    const messageToRetry = state.messages.find((m) => m.id === messageId)
    if (!messageToRetry || messageToRetry.role !== 'user') return
    dispatch({ type: 'RETRY_MESSAGE', messageId })
    dispatch({ type: 'LOADING_MESSAGE' })

    try {
      const response = await runChatPipeline(messageToRetry.content)
      const intent = response.outputs?.intent
      const reply = response.outputs?.reply_builder?.reply
      if (!reply) {
        throw new Error('后端未返回有效回复')
      }
      dispatch({
        type: 'RECEIVE_MESSAGE',
        reply,
        brandInput: intent?.brand_input ?? {
          brand_name: null,
          category: null,
          city: null,
          budget: null,
          period: null,
        },
        intent: intent?.intent,
        isComplete: intent?.intent === 'generate_plan' && !intent?.missing_fields?.length,
        canGeneratePlan:
          intent?.intent === 'generate_plan' && !intent?.missing_fields?.length,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : '发送失败，请重试'
      dispatch({ type: 'SET_ERROR', error: message })
    }
  }, [state.messages])

  const prefillInput = useCallback((text: string) => {
    dispatch({ type: 'SET_INPUT', value: text })
  }, [])

  const latestBrandInput = getLatestBrandInput(state.messages)

  return {
    messages: state.messages,
    inputValue: state.inputValue,
    isLoading: state.isLoading,
    error: state.error,
    latestBrandInput,
    isComplete: state.messages.some(m => m.canGeneratePlan),
    setInputValue,
    sendMessage,
    retryMessage,
    prefillInput,
  }
}
