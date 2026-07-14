const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

interface OptimizeResult {
  optimized: string
  reason: string
}

export async function optimizePrompt(prompt: string, type: 'video' | 'image' | 'brand'): Promise<OptimizeResult> {
  const resp = await fetch(`${API_BASE}/prompt/optimize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, type }),
  })
  const body = await resp.json()
  if (!body.success) throw new Error(body.error?.detail || '优化失败')
  return body.data as OptimizeResult
}
