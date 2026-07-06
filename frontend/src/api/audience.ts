import type { BrandInput } from '../types/chat'
import type { AgentStatus } from '../types/audience'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

export interface SSEEvent {
  runId?: string
  nodeId?: string
  event?: string
  data?: Record<string, unknown>
  message?: string
  label?: string
  error?: string
}

async function* readSSEStream(stream: ReadableStream<Uint8Array>): AsyncGenerator<SSEEvent> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let current: Partial<SSEEvent> & { runId?: string } = {}

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        const trimmed = line.trim()
        if (trimmed === '') {
          if (current.event) {
            yield current as SSEEvent
          }
          current = {}
          continue
        }
        if (trimmed.startsWith('event:')) {
          current.event = trimmed.slice(6).trim()
        } else if (trimmed.startsWith('data:')) {
          const raw = trimmed.slice(5).trim()
          try {
            const parsed = JSON.parse(raw) as Record<string, unknown>
            current.nodeId = (parsed.node_id as string) || current.nodeId
            current.data = (parsed.data as Record<string, unknown>) || current.data
            current.message = (parsed.message as string) || current.message
            current.label = (parsed.label as string) || current.label
            current.error = (parsed.error as string) || current.error
          } catch {
            current.message = raw
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

export async function startAudiencePlanTest(
  brandInput: BrandInput,
  abortSignal?: AbortSignal,
): Promise<AsyncGenerator<SSEEvent>> {
  const url = `${API_BASE}/plan/run`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(brandInput),
    signal: abortSignal,
  })

  if (!response.ok || !response.body) {
    throw new Error(`请求失败（${response.status}）`)
  }

  return readSSEStream(response.body)
}

export function agentStatusFromEvent(event: string): AgentStatus | null {
  switch (event) {
    case 'node.start':
      return 'running'
    case 'node.complete':
      return 'complete'
    case 'node.failed':
      return 'failed'
    default:
      return null
  }
}
