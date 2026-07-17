import { useCallback, useRef, useState } from 'react'
import { optimizePrompt } from '../api/promptOptimizer'
import type { ChatMessage } from '../types/chat'
import './inline-media-mobile.css'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

const IMAGE_SIZES = [
  { label: '1:1 方图', value: '2048*2048' },
  { label: '16:9 横图', value: '2688*1536' },
  { label: '9:16 竖图', value: '1536*2688' },
]

interface InlineImageCardProps {
  prompt: string
  messageId: string
  imageUrl?: string | null
  variant?: 'mobile'
  existingResult?: ChatMessage['imageResult']
  onImageResult?: (messageId: string, result: NonNullable<ChatMessage['imageResult']>) => void
}

export function InlineImageCard({ prompt: initialPrompt, messageId, imageUrl, variant, existingResult, onImageResult }: InlineImageCardProps) {
  const isMobile = variant === 'mobile'
  const [isLoading, setIsLoading] = useState(false)
  const [optimizing, setOptimizing] = useState(false)
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

  // AI 优化提示词
  const handleOptimize = useCallback(async () => {
    if (!prompt.trim() || optimizing) return
    setOptimizing(true)
    try {
      const result = await optimizePrompt(prompt, 'image')
      setPrompt(result.optimized)
    } catch (err) {
      setError(err instanceof Error ? err.message : '优化失败')
    } finally {
      setOptimizing(false)
    }
  }, [prompt, optimizing])

  const handleGenerate = useCallback(async () => {
    if (isLoading || !prompt.trim()) return
    setIsLoading(true)
    setError(null)

    try {
      const resp = await fetch(`${API_BASE}/image/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: prompt.trim(), size, image_url: imageUrl || undefined }),
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
    // 移动端完成态：去灰底容器，图片大圆角 + 一行 muted 文字链接
    if (isMobile) {
      return (
        <>
          <div className="imc-card">
            <img
              src={result.image_url}
              alt="生成的图片"
              className="imc-result-media"
              style={{ maxHeight: 400, objectFit: 'contain', cursor: 'pointer' }}
              onClick={() => setShowFullscreen(true)}
            />
            <div className="imc-result-actions">
              <button type="button" className="imc-link" onClick={() => setShowFullscreen(true)}>全屏</button>
              <span className="imc-sep">·</span>
              <button type="button" className="imc-link" onClick={() => handleCopyUrl(result.image_url)}>
                {copied ? '已复制' : '复制链接'}
              </button>
              <span className="imc-sep">·</span>
              <button type="button" className="imc-link" onClick={() => { setResult(undefined); setError(null) }}>重新生成</button>
            </div>
          </div>

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
      <>
        <div className={`mt-3 space-y-2 rounded-xl border border-line bg-mist/50 p-3`}>
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
              className="rounded-lg border border-line text-track hover:bg-mist px-3 py-1.5 text-xs font-medium transition-colors"
            >
              {copied ? '已复制' : '复制链接'}
            </button>
            <button
              type="button"
              onClick={() => { setResult(undefined); setError(null) }}
              className="rounded-lg border border-line text-track hover:bg-mist px-3 py-1.5 text-xs font-medium transition-colors"
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

  // 移动端编辑态：纯白卡片 + 标题行 + hairline + chip + 全宽胶囊按钮
  if (isMobile) {
    const [sw, sh] = size.split('*').map(Number)
    return (
      <div className="imc-card">
        {/* 标题行 */}
        <div className="imc-title-row">
          <span className="imc-title-icon">🖼️</span>
          <span className="imc-title">生成图片</span>
          <button
            type="button"
            className="imc-optimize-btn"
            onClick={handleOptimize}
            disabled={optimizing || isLoading || !prompt.trim()}
          >
            {optimizing ? (<><span className="imc-spinner" />优化中</>) : (<>✨ AI 优化</>)}
          </button>
        </div>

        <div className="imc-hairline" />

        {/* 描述输入 */}
        <div>
          <label className="imc-field-label">图片描述</label>
          <textarea
            rows={3}
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            disabled={isLoading}
            placeholder="请描述您希望生成的图片内容，例如场景、主题、风格等"
            className="imc-textarea"
          />
        </div>

        {/* 尺寸选择 */}
        <div>
          <label className="imc-field-label">图片尺寸</label>
          <div className="imc-chip-row">
            {IMAGE_SIZES.map(s => (
              <button
                key={s.value}
                type="button"
                onClick={() => setSize(s.value)}
                disabled={isLoading}
                className={`imc-chip${size === s.value ? ' on' : ''}`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* 生成按钮 / 骨架屏 / 错误 */}
        {!isLoading && !error && (
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!prompt.trim()}
            className="imc-cta"
          >
            生成图片
          </button>
        )}

        {isLoading && (
          <>
            <div className="imc-skeleton" style={{ aspectRatio: `${sw} / ${sh}` }} />
            <div className="imc-status-line">
              <span className="imc-spinner" />
              正在生成图片，请稍候…
            </div>
          </>
        )}

        {error && (
          <>
            <div className="imc-error">{error}</div>
            <button
              type="button"
              onClick={() => { setError(null); handleGenerate() }}
              className="imc-retry-btn"
            >
              重试
            </button>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="mt-3 space-y-3 rounded-xl border border-line bg-mist/50 p-3">
      {/* 提示词输入框 */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block font-medium text-[10px] text-track/50">
            图片描述
          </label>
          <button
            type="button"
            onClick={handleOptimize}
            disabled={optimizing || isLoading || !prompt.trim()}
            className="flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-medium transition-colors disabled:opacity-40 border-line text-track/60 hover:bg-mist"
          >
            {optimizing ? (
              <>
                <span className="inline-block h-2.5 w-2.5 animate-spin rounded-full border border-current border-t-transparent" />
                优化中
              </>
            ) : (
              <>✨ AI 优化</>
            )}
          </button>
        </div>
        <textarea
          rows={3}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          disabled={isLoading}
          placeholder="请描述您希望生成的图片内容，例如场景、主题、风格等"
          className="w-full resize-none rounded-lg border bg-white p-2 outline-none placeholder:text-track/30 focus:ring-1 disabled:bg-mist border-line text-xs focus:border-start focus:ring-start"
        />
      </div>

      {/* 尺寸选择 */}
      <div>
        <label className="mb-1 block font-medium text-[10px] text-track/50">
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
          className="w-full rounded-lg px-4 py-2 font-medium text-white transition-colors disabled:cursor-not-allowed disabled:bg-line disabled:text-track/40 bg-start text-sm hover:bg-start/90"
        >
          生成图片
        </button>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center gap-2 rounded-lg py-6 bg-mist">
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
            className="w-full rounded-lg border px-4 py-2 font-medium transition-colors border-line text-track text-xs hover:bg-mist"
          >
            重试
          </button>
        </div>
      )}
    </div>
  )
}
