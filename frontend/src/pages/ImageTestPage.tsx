import { useEffect, useRef, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

const SIZE_OPTIONS = [
  { value: '2048*2048', label: '2048×2048 (1:1 方图)' },
  { value: '2688*1536', label: '2688×1536 (16:9 横版)' },
  { value: '1536*2688', label: '1536×2688 (9:16 竖版)' },
  { value: '2368*1728', label: '2368×1728 (4:3 通用)' },
]

export function ImageTestPage() {
  const [prompt, setPrompt] = useState('')
  const [size, setSize] = useState('2048*2048')
  const [isLoading, setIsLoading] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const autoTriggered = useRef(false)

  // Auto-trigger from query params
  useEffect(() => {
    if (autoTriggered.current) return
    const params = new URLSearchParams(window.location.search)
    const qPrompt = params.get('prompt')
    if (qPrompt) {
      autoTriggered.current = true
      setPrompt(qPrompt)
      // Wait for state update, then trigger
      setTimeout(() => {
        ;(async () => {
          setIsLoading(true)
          try {
            const resp = await fetch(`${API_BASE}/image/generate`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt: qPrompt, size }),
            })
            const body = await resp.json()
            if (!body.success) throw new Error(body.error?.detail || '生成失败')
            setImageUrl(body.data.image_url)
          } catch (err) {
            setError(err instanceof Error ? err.message : '请求失败')
          } finally {
            setIsLoading(false)
          }
        })()
      }, 0)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleGenerate() {
    const text = prompt.trim()
    if (!text || isLoading) return
    setIsLoading(true)
    setError(null)
    setImageUrl(null)
    try {
      const resp = await fetch(`${API_BASE}/image/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text, size }),
      })
      const body = await resp.json()
      if (!body.success) {
        throw new Error(body.error?.detail || '生成失败')
      }
      setImageUrl(body.data.image_url)
    } catch (err) {
      setError(err instanceof Error ? err.message : '请求失败')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6" style={{ overflowY: 'auto', height: '100%', minHeight: 0, flex: 1 }}>
      <div>
        <label htmlFor="image-prompt" className="mb-2 block text-sm font-medium text-track">
          输入提示词 (Prompt)
        </label>
        <textarea
          id="image-prompt"
          rows={5}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={isLoading}
          placeholder="例如：一张充满运动感的画面，阳光明媚的户外运动场，年轻人在挥洒汗水，背景是现代城市天际线"
          className="w-full resize-none rounded-2xl border border-line bg-white p-4 text-sm outline-none placeholder:text-track/40 focus:border-start focus:ring-1 focus:ring-start disabled:bg-mist"
        />
        <div className="mt-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <label htmlFor="image-size" className="text-sm text-track/60">尺寸:</label>
            <select
              id="image-size"
              value={size}
              onChange={(e) => setSize(e.target.value)}
              disabled={isLoading}
              className="rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-start disabled:bg-mist"
            >
              {SIZE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isLoading || !prompt.trim()}
            className="rounded-xl bg-start px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-start/90 disabled:cursor-not-allowed disabled:bg-line disabled:text-track/40"
          >
            {isLoading ? '生成中…' : '生成图片'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center rounded-2xl border border-line bg-mist/50 p-16">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-start border-t-transparent" />
            <span className="text-sm text-track/50">正在生成图片，请稍候…</span>
          </div>
        </div>
      )}

      {imageUrl && !isLoading && (
        <div className="space-y-3 rounded-2xl border border-line bg-white p-5">
          <h2 className="text-sm font-medium text-track">生成结果</h2>
          <img
            src={imageUrl}
            alt="生成的图片"
            className="w-full rounded-xl border border-line"
            style={{ maxHeight: 600, objectFit: 'contain' }}
          />
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={imageUrl}
              className="flex-1 rounded-lg border border-line bg-mist px-3 py-2 text-xs text-track outline-none"
              onClick={(e) => e.currentTarget.select()}
            />
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(imageUrl)}
              className="rounded-lg border border-line bg-white px-3 py-2 text-xs font-medium text-track hover:bg-mist"
            >
              复制
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
