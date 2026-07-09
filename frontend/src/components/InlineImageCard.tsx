import { useCallback, useRef, useState } from 'react'
import type { ChatMessage } from '../types/chat'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

const IMAGE_SIZES = [
  { label: '1:1 方图', value: '2048*2048' },
  { label: '16:9 横图', value: '2688*1536' },
  { label: '9:16 竖图', value: '1536*2688' },
]

interface InlineImageCardProps {
  prompt: string
  messageId: string
  existingResult?: ChatMessage['imageResult']
  onImageResult?: (messageId: string, result: NonNullable<ChatMessage['imageResult']>) => void
}

export function InlineImageCard({ prompt: initialPrompt, messageId, existingResult, onImageResult }: InlineImageCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<ChatMessage['imageResult']>(existingResult ?? undefined)
  const [error, setError] = useState<string | null>(null)
  const [showFullscreen, setShowFullscreen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [prompt, setPrompt] = useState(initialPrompt)
  const [size, setSize] = useState('2048*2048')
  const mountedRef = useRef(true)

  const handleCopyUrl = useCallback(async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => { if (mountedRef.current) setCopied(false) }, 800)
    } catch { /* ignore clipboard errors */ }
  }, [])

  const handleGenerate = useCallback(async () => {
    if (isLoading || !prompt.trim()) return
    setIsLoading(true)
    setError(null)

    try {
      const resp = await fetch(`${API_BASE}/image/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), size }),
      })
      if (!mountedRef.current) return
      const body = await resp.json()
      if (!body.success) throw new Error(body.error?.detail || '生成失败')
      const imageResult = { image_url: body.data.image_url, width: body.data.width, height: body.data.height }
      setResult(imageResult)
      onImageResult?.(messageId, imageResult)
    } catch (err) {
      if (!mountedRef.current) return
      setError(err instanceof Error ? err.message : '生成失败')
    } finally {
      if (mountedRef.current) setIsLoading(false)
    }
  }, [isLoading, prompt, size, messageId, onImageResult])

  if (result?.image_url) {
    return (
      <>
        <div className="mt-3 space-y-2 rounded-xl border border-line bg-mist/50 p-3">
          <img
            src={result.image_url}
            alt="生成的图片"
            className="w-full cursor-pointer rounded-lg border border-line/50"
            style={{ maxHeight: 400, objectFit: 'contain' }}
            onClick={() => setShowFullscreen(true)}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowFullscreen(true)}
              className="rounded-lg bg-start px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-start/90"
            >
              全屏查看
            </button>
            <button
              type="button"
              onClick={() => handleCopyUrl(result.image_url)}
              className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-track transition-colors hover:bg-mist"
            >
              {copied ? '已复制' : '复制链接'}
            </button>
            <button
              type="button"
              onClick={() => { setResult(undefined); setError(null) }}
              className="rounded-lg border border-line px-3 py-1.5 text-xs font-medium text-track transition-colors hover:bg-mist"
            >
              重新生成
            </button>
          </div>
        </div>

        {/* Fullscreen overlay */}
        {showFullscreen && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
            onClick={() => setShowFullscreen(false)}
          >
            <div
              className="relative max-h-[90vh] max-w-[90vw]"
              onClick={e => e.stopPropagation()}
            >
              <img
                src={result.image_url}
                alt="生成的图片"
                className="max-h-[85vh] max-w-full rounded-xl"
              />
              <button
                type="button"
                onClick={() => setShowFullscreen(false)}
                className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white text-sm text-track shadow-md hover:bg-mist"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-line bg-mist/50 p-3">
      {/* 提示词输入框 */}
      <div>
        <label className="mb-1 block text-[10px] font-medium text-track/50">
          图片描述
        </label>
        <textarea
          rows={3}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          disabled={isLoading}
          placeholder="请描述您希望生成的图片内容，例如场景、主题、风格等"
          className="w-full resize-none rounded-lg border border-line bg-white p-2 text-xs outline-none placeholder:text-track/30 focus:border-start focus:ring-1 focus:ring-start disabled:bg-mist"
        />
      </div>

      {/* 尺寸选择 */}
      <div>
        <label className="mb-1 block text-[10px] font-medium text-track/50">
          图片尺寸
        </label>
        <div className="flex flex-wrap gap-1.5">
          {IMAGE_SIZES.map(s => (
            <button
              key={s.value}
              type="button"
              onClick={() => setSize(s.value)}
              disabled={isLoading}
              className={`rounded-lg border px-3 py-1 text-[11px] transition-colors ${
                size === s.value
                  ? 'border-start bg-start/10 text-start font-medium'
                  : 'border-line text-track/60 hover:border-track/30'
              } disabled:opacity-50`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Generate button or loading */}
      {!isLoading && !error && (
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!prompt.trim()}
          className="w-full rounded-lg bg-start px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-start/90 disabled:cursor-not-allowed disabled:bg-line disabled:text-track/40"
        >
          生成图片
        </button>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center gap-2 rounded-lg bg-mist py-6">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-start border-t-transparent" />
          <span className="text-sm text-track/50">正在生成图片，请稍候…</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="space-y-2">
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {error}
          </div>
          <button
            type="button"
            onClick={() => { setError(null); handleGenerate() }}
            className="w-full rounded-lg border border-line px-4 py-2 text-xs font-medium text-track transition-colors hover:bg-mist"
          >
            重试
          </button>
        </div>
      )}
    </div>
  )
}
