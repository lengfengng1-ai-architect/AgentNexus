import { useState, type KeyboardEvent } from 'react'
import { runChatPipeline } from '../api/workflow'
import type { IntentRecognitionResult } from '../types/workflow'

export function IntentTestPage() {
  const [input, setInput] = useState('')
  const [result, setResult] = useState<IntentRecognitionResult | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    const message = input.trim()
    if (!message || isLoading) return

    setIsLoading(true)
    setError(null)
    setResult(null)

    try {
      const response = await runChatPipeline(message)
      const intent = response.outputs?.intent
      if (!intent) {
        setError('后端未返回意图识别结果')
        return
      }
      setResult(intent)
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送失败，请重试')
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
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-4 py-6 sm:px-6">
        <div className="mx-auto w-full max-w-3xl">
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
            className="w-full resize-none rounded-2xl border border-line bg-white p-4 text-sm outline-none placeholder:text-track/40 focus:border-start focus:ring-1 focus:ring-start disabled:bg-mist sm:text-base"
          />
          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-track/40">Enter 发送，Shift + Enter 换行</p>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading || !input.trim()}
              className="rounded-xl bg-start px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-start/90 disabled:cursor-not-allowed disabled:bg-line disabled:text-track/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-start"
            >
              {isLoading ? '运行中…' : '运行工作流'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-auto w-full max-w-3xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {result && (
          <div className="mx-auto w-full max-w-3xl space-y-4 rounded-2xl border border-line bg-white p-5">
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
              <h3 className="mb-2 text-sm font-medium text-track">品牌输入 brand_input</h3>
              <div className="overflow-x-auto rounded-xl bg-mist p-3">
                <pre className="font-mono text-xs leading-relaxed text-track">
                  {JSON.stringify(result.brand_input, null, 2)}
                </pre>
              </div>
            </div>

            {result.missing_fields && result.missing_fields.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-medium text-track">缺失字段 missing_fields</h3>
                <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                  {result.missing_fields.join('、')}
                </div>
              </div>
            )}

            {result.updated_fields && Object.keys(result.updated_fields).length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-medium text-track">已更新字段 updated_fields</h3>
                <div className="overflow-x-auto rounded-xl bg-mist p-3">
                  <pre className="font-mono text-xs leading-relaxed text-track">
                    {JSON.stringify(result.updated_fields, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
