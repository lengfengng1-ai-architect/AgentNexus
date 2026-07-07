import type { VideoParams, VideoResult } from '../types/video'

export interface VideoStreamEvent {
  progress?: { stage: string; task_id?: string; status: string; message: string }
  result?: VideoResult
  error?: { detail: string; code: string }
}

export async function* streamVideoGeneration(
  params: VideoParams,
): AsyncGenerator<VideoStreamEvent> {
  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'}/video/generate`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
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
      const event = parseEventBlock(trimmed)
      if (event) yield event
    }
  }
}

function parseEventBlock(block: string): VideoStreamEvent | null {
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
    if (event === 'progress') return { progress: parsed }
    if (event === 'result') return { result: parsed }
    if (event === 'error') return { error: parsed }
  } catch { /* skip */ }
  return null
}
