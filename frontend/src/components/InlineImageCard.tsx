import { useCallback, useRef, useState } from 'react'
import type { ChatMessage } from '../types/chat'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

interface InlineImageCardProps {
  prompt: string
  messageId: string
  existingResult?: ChatMessage['imageResult']
  onImageResult?: (messageId: string, result: NonNullable<ChatMessage['imageResult']>) => void
}

export function InlineImageCard({ prompt, messageId, existingResult, onImageResult }: InlineImageCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<ChatMessage['imageResult']>(existingResult ?? undefined)
  const [error, setError] = useState<string | null>(null)
  const [showFullscreen, setShowFullscreen] = useState(false)
  const [copied, setCopied] = useState(false)
  const mountedRef = useRef(true)

  const handleCopyUrl = useCallback(async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => { if (mountedRef.current) setCopied(false) }, 800)
    } catch { /* ignore clipboard errors */ }
  }, [])

  // Fullscreen image ref for detecting alt click
  const handleGenerate = useCallback(async () => {
    if (isLoading) return
    setIsLoading(true)
    setError(null)

    try {
      const resp = await fetch(`${API_BASE}/image/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, size: '2048*2048' }),
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
  }, [isLoading, prompt, messageId, onImageResult])

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
      {/* Prompt preview */}
      <details className="group">
        <summary className="cursor-pointer text-[10px] font-medium text-track/50 transition-colors hover:text-track/70">
          图片描述预览
        </summary>
        <div className="mt-1 max-h-[120px] overflow-y-auto whitespace-pre-wrap rounded-lg bg-white/50 p-2 text-[11px] leading-relaxed text-track/70">
          {prompt}
        </div>
      </details>

      {/* Generate button or loading */}
      {!isLoading && !error && (
        <button
          type="button"
          onClick={handleGenerate}
          className="w-full rounded-lg bg-start px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-start/90"
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
