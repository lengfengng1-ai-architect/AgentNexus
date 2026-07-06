import { useState, type KeyboardEvent } from 'react'
import type { BrandInput } from '../types/chat'

interface IntentResult {
  intent: string
  confidence: number
  reply: string
  brand_input: BrandInput
  missing_fields: string[]
  reasoning: string
}

async function testIntent(message: string): Promise<IntentResult> {
  const resp = await fetch(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'}/chat/stream`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }) },
  )
  if (!resp.ok || !resp.body) throw new Error('请求失败')

  const reader = resp.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    for (const part of buffer.split('\n\n')) {
      if (!part.trim()) continue
      let event = '', data = ''
      for (const line of part.split('\n')) {
        const s = line.trim()
        if (s.startsWith('event:')) event = s.slice(6).trim()
        else if (s.startsWith('data:')) data = s.slice(5).trim()
      }
      if (event === 'intent' && data) {
        return JSON.parse(data)
      }
    }
  }
  throw new Error('未收到意图识别结果')
}

export function IntentTestPage() {
  const [input, setInput] = useState('')
  const [result, setResult] = useState<IntentResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    const message = input.trim()
    if (!message || isLoading) return
    setIsLoading(true)
    setError(null)
    setResult(null)
    try {
      const intent = await testIntent(message)
      setResult(intent)
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送失败')
    } finally {
      setIsLoading(false)
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6">
      <div>
        <label htmlFor="intent-input" className="mb-2 block text-sm font-medium text-track">
          输入测试消息
        </label>
        <textarea
          id="intent-input"
          rows={3}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          placeholder="例如：我们是 Nike，想在上海做跑步推广，预算 50 万，周期 3 个月"
          className="w-full resize-none rounded-2xl border border-line bg-white p-4 text-sm outline-none placeholder:text-track/40 focus:border-start focus:ring-1 focus:ring-start disabled:bg-mist"
        />
        <div className="mt-3 flex items-center justify-between">
          <p className="text-xs text-track/40">Enter 发送，Shift + Enter 换行</p>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading || !input.trim()}
            className="rounded-xl bg-start px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-start/90 disabled:cursor-not-allowed disabled:bg-line disabled:text-track/40"
          >
            {isLoading ? '识别中…' : '测试意图识别'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {result && (
        <div className="space-y-4 rounded-2xl border border-line bg-white p-5">
          <h2 className="text-lg font-semibold text-track">意图识别结果</h2>
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div className="rounded-xl bg-mist p-3">
              <dt className="text-xs text-track/50">意图 intent</dt>
              <dd className="mt-1 font-mono font-medium text-start">{result.intent}</dd>
            </div>
            <div className="rounded-xl bg-mist p-3">
              <dt className="text-xs text-track/50">置信度 confidence</dt>
              <dd className="mt-1 font-mono font-medium text-track">{result.confidence.toFixed(2)}</dd>
            </div>
            <div className="col-span-full rounded-xl bg-mist p-3">
              <dt className="text-xs text-track/50">回复 reply</dt>
              <dd className="mt-1 text-track">{result.reply}</dd>
            </div>
          </dl>

          <div>
            <h3 className="mb-2 text-sm font-medium text-track">品牌输入</h3>
            <pre className="overflow-x-auto rounded-xl bg-mist p-3 font-mono text-xs leading-relaxed text-track">
              {JSON.stringify(result.brand_input, null, 2)}
            </pre>
          </div>

          {result.missing_fields?.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-medium text-track">缺失字段</h3>
              <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                {result.missing_fields.join('、')}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
