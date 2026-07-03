import axios, { isAxiosError } from 'axios'
import type { BrandInput } from '../types/chat'
import type { WorkflowRunRequest, WorkflowRunResponse } from '../types/workflow'

export interface IntentResult {
  intent: 'generate_plan' | 'query_data' | 'chat' | 'clarify' | 'update_context'
  confidence: number
  reply: string
  brand_input: BrandInput
  missing_fields: string[]
  updated_fields: Record<string, unknown>
  reasoning: string
  confirmed: boolean
  gate: string | null
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
  timeout: 180000,
  headers: {
    'Content-Type': 'application/json',
  },
})

function extractErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    if (error.response) {
      const detail = error.response.data?.detail
      if (detail?.code === 'llm_error') return 'AI 服务暂时不可用，请检查配置后重试'
      if (detail?.detail) return '服务器处理失败，请重试'
      return `请求失败（${error.response.status}）`
    }
    if (error.request) {
      return '无法连接到服务器，请确认后端已启动'
    }
  }
  if (error instanceof Error) return error.message
  return '发送失败，请重试'
}

export async function runChatPipeline(
  message: string,
  context?: Record<string, unknown>,
): Promise<WorkflowRunResponse> {
  const payload: WorkflowRunRequest = {
    input: { message, context },
  }
  try {
    const { data } = await api.post<WorkflowRunResponse>('/workflows/chat_pipeline/run', payload)
    return data
  } catch (error) {
    throw new Error(extractErrorMessage(error))
  }
}

export interface StreamChunk {
  reasoning?: string
  reply?: string
  intent?: IntentResult
}

export async function* streamChat(
  message: string,
  context?: Record<string, unknown>,
): AsyncGenerator<StreamChunk> {
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'}/chat/stream`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, context }),
    },
  )
  if (!response.ok || !response.body) {
    throw new Error('流式请求失败')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    const parts = buffer.split('\n\n')
    buffer = parts.pop() ?? ''

    for (const part of parts) {
      const trimmed = part.trim()
      if (!trimmed) continue
      const chunk = parseEventBlock(trimmed)
      if (chunk) yield chunk
    }
  }
}

function parseEventBlock(block: string): StreamChunk | null {
  let event = ''
  let data = ''
  for (const line of block.split('\n')) {
    const s = line.trim()
    if (s.startsWith('event:')) event = s.slice(6).trim()
    else if (s.startsWith('data:')) data = s.slice(5).trim()
  }
  if (!event || !data) return null
  try {
    const parsed = JSON.parse(data)
    if (event === 'reasoning') {
      return { reasoning: parsed.text }
    }
    if (event === 'reply') {
      return { reply: parsed.text }
    }
    if (event === 'intent') {
      return { intent: parsed as IntentResult }
    }
  } catch { /* skip */ }
  return null
}
