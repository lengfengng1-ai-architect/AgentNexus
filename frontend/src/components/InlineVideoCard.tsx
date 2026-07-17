import { useCallback, useEffect, useRef, useState, type ClipboardEvent } from 'react'
import { streamVideoGeneration } from '../api/video'
import { optimizePrompt } from '../api/promptOptimizer'
import type { VideoParams } from '../types/video'
import type { ChatMessage } from '../types/chat'

interface InlineVideoCardProps {
  prompt?: string | null
  imageUrls: string[]
  /** 第一张参考图的 VL 内容描述（AI 优化时传入） */
  imageCaption?: string | null
  messageId: string
  variant?: 'mobile'
  existingResult?: ChatMessage['videoResult']
  onVideoResult?: (messageId: string, result: NonNullable<ChatMessage['videoResult']>) => void
}

interface ProgressData {
  stage: string
  task_id?: string
  status: string
  message: string
  elapsed?: number
  progress_pct?: number
}

const RATIOS = ['16:9', '9:16', '1:1', '4:3', '3:4', '4:5', '5:4', '9:21', '21:9']

export function InlineVideoCard({ prompt, imageUrls, imageCaption, messageId, variant, existingResult, onVideoResult }: InlineVideoCardProps) {
  const isMobile = variant === 'mobile'
  // Generation params
  const [resolution, setResolution] = useState('720P')
  const [ratio, setRatio] = useState('16:9')
  const [duration, setDuration] = useState(5)
  const [seed, setSeed] = useState('')
  const [showParams, setShowParams] = useState(false)

  // Input state (for when props are empty)
  const [urlRows, setUrlRows] = useState<string[]>([''])
  const [descriptionText, setDescriptionText] = useState('')

  // SSE lifecycle
  const [isLoading, setIsLoading] = useState(false)
  const [optimizing, setOptimizing] = useState(false)
  const [progress, setProgress] = useState<ProgressData[]>([])
  const [currentStatus, setCurrentStatus] = useState<ProgressData | null>(null)
  const [result, setResult] = useState<NonNullable<ChatMessage['videoResult']> | null>(existingResult ?? null)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const mountedRef = useRef(true)

  // Prompt input state: initialize from prop, editable thereafter
  const initialPromptInited = useRef(false)
  const [editablePrompt, setEditablePrompt] = useState(prompt ?? '')

  useEffect(() => {
    if (prompt && !initialPromptInited.current) {
      initialPromptInited.current = true
      setEditablePrompt(prompt)
    }
  }, [prompt])

  const effectiveImageUrls = imageUrls.length > 0 ? imageUrls : urlRows.map(normalizeUrl).filter(Boolean)
  const effectivePrompt = (prompt ? editablePrompt : descriptionText) || null

  // URL input handlers
  const handleUrlRowChange = useCallback((index: number, val: string) => {
    setUrlRows(prev => {
      const next = [...prev]
      next[index] = val
      if (index === next.length - 1 && normalizeUrl(val)) {
        if (next.length < 9) next.push('')
      }
      return next
    })
  }, [])

  const removeUrlRow = useCallback((index: number) => {
    setUrlRows(prev => {
      const next = prev.filter((_, i) => i !== index)
      return next.length === 0 ? [''] : next
    })
  }, [])

  const handleUrlRowPaste = useCallback((index: number, e: ClipboardEvent) => {
    const text = e.clipboardData.getData('text')
    if (!text.includes('\n') && !text.includes(',')) return
    const urls = text
      .split(/[\n,]+/)
      .map(s => s.trim())
      .filter(s => s.startsWith('http://') || s.startsWith('https://'))
    if (urls.length <= 1) return
    e.preventDefault()
    setUrlRows(prev => {
      const next = [...prev]
      next[index] = urls[0]
      next.splice(index + 1, 0, ...urls.slice(1), '')
      return next
    })
  }, [])

  // Fullscreen overlay
  const [showFullscreen, setShowFullscreen] = useState(false)

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      abortRef.current?.abort()
    }
  }, [])

  // AI 优化提示词
  const handleOptimize = useCallback(async () => {
    const text = prompt ? editablePrompt : descriptionText
    if (!text?.trim() || optimizing) return
    setOptimizing(true)
    try {
      const result = await optimizePrompt(text, 'video', imageCaption)
      if (prompt) setEditablePrompt(result.optimized)
      else setDescriptionText(result.optimized)
    } catch (err) {
      setError(err instanceof Error ? err.message : '优化失败')
    } finally {
      setOptimizing(false)
    }
  }, [prompt, editablePrompt, descriptionText, optimizing, imageCaption])

  const handleGenerate = useCallback(async () => {
    if (isLoading) return
    setIsLoading(true)
    setProgress([])
    setCurrentStatus(null)
    setResult(null)
    setError(null)

    const controller = new AbortController()
    abortRef.current = controller

    const params: VideoParams = {
      prompt: effectivePrompt,
      image_urls: effectiveImageUrls.length > 0 ? effectiveImageUrls : undefined,
      resolution,
      ratio,
      duration,
      seed: seed ? parseInt(seed, 10) : null,
    }

    try {
      for await (const event of streamVideoGeneration(params)) {
        if (!mountedRef.current) break
        if (event.progress) {
          setProgress(prev => [...prev, event.progress!])
          setCurrentStatus(event.progress)
        }
        if (event.result) {
          const videoResult = {
            task_id: event.result.task_id,
            video_url: event.result.video_url,
            usage: event.result.usage
              ? {
                  resolution: event.result.usage.resolution,
                  ratio: event.result.usage.ratio,
                  output_video_duration: event.result.usage.output_video_duration,
                }
              : undefined,
          }
          setResult(videoResult)
          onVideoResult?.(messageId, videoResult)
        }
        if (event.error) {
          setError(event.error.detail)
        }
      }
    } catch (err) {
      if (!mountedRef.current) return
      setError(err instanceof Error ? err.message : '生成失败')
    } finally {
      if (mountedRef.current) {
        setIsLoading(false)
        abortRef.current = null
      }
    }
  }, [isLoading, effectivePrompt, effectiveImageUrls, resolution, ratio, duration, seed, messageId, onVideoResult])

  // Show player for existing or newly generated result
  if (result?.video_url) {
    const usageLine = [
      result.usage?.resolution ? `${result.usage.resolution}P` : null,
      result.usage?.ratio ?? null,
      result.usage?.output_video_duration != null ? `${result.usage.output_video_duration}s` : null,
    ].filter(Boolean).join(' · ')

    // 移动端完成态：去灰底容器，视频大圆角 + 参数行 + 文字链接行
    if (isMobile) {
      return (
        <>
          <div className="imc-card">
            <video src={result.video_url} controls className="imc-result-media" style={{ maxHeight: 320 }}>
              您的浏览器不支持视频播放
            </video>
            {usageLine && <div className="imc-meta-line">{usageLine}</div>}
            <div className="imc-result-actions">
              <button type="button" className="imc-link" onClick={() => setShowFullscreen(true)}>全屏</button>
              <span className="imc-sep">·</span>
              <button
                type="button"
                className="imc-link"
                onClick={() => { setResult(null); setProgress([]); setCurrentStatus(null) }}
              >
                重新生成
              </button>
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
                <video
                  src={result.video_url}
                  controls
                  autoPlay
                  className="max-h-[85vh] rounded-xl"
                >
                  您的浏览器不支持视频播放
                </video>
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
        <div className="mt-3 space-y-2 rounded-xl border border-line bg-mist/50 p-3">
          <video
            src={result.video_url}
            controls
            className="w-full rounded-lg"
            style={{ maxHeight: 320 }}
          >
            您的浏览器不支持视频播放
          </video>
          {(result.usage?.resolution || result.usage?.ratio || result.usage?.output_video_duration != null) && (
            <div className="flex flex-wrap gap-2 text-[10px] text-track/50">
              {result.usage?.resolution && <span>{result.usage.resolution}P</span>}
              {result.usage?.ratio && <span>{result.usage.ratio}</span>}
              {result.usage?.output_video_duration != null && <span>{result.usage.output_video_duration}s</span>}
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowFullscreen(true)}
              className="rounded-lg bg-start px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-start/90"
            >
              全屏播放
            </button>
            <button
              type="button"
              onClick={() => {
                setResult(null)
                setProgress([])
                setCurrentStatus(null)
              }}
              className="rounded-lg border border-line text-track hover:bg-mist text-xs font-medium transition-colors px-3 py-1.5"
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
              <video
                src={result.video_url}
                controls
                autoPlay
                className="max-h-[85vh] rounded-xl"
              >
                您的浏览器不支持视频播放
              </video>
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

  // 移动端编辑态：纯白卡片 + 标题行 + hairline + 全宽胶囊按钮
  if (isMobile) {
    return (
      <div className="imc-card">
        {/* 标题行 */}
        <div className="imc-title-row">
          <span className="imc-title-icon">🎬</span>
          <span className="imc-title">生成视频</span>
          <button
            type="button"
            className="imc-optimize-btn"
            onClick={handleOptimize}
            disabled={optimizing || isLoading || (!prompt ? !descriptionText.trim() : !editablePrompt.trim())}
          >
            {optimizing ? (<><span className="imc-spinner" />优化中</>) : (<>✨ AI 优化</>)}
          </button>
        </div>

        <div className="imc-hairline" />

        {/* 参考图缩略条 / URL 输入行 */}
        {imageUrls.length > 0 ? (
          <div className="imc-thumbs">
            {imageUrls.map((url, i) => (
              <img key={i} src={url} alt="" loading="eager" />
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {urlRows.map((row, i) => (
              <div key={i} className="imc-url-row">
                <input
                  type="url"
                  value={row}
                  onChange={e => handleUrlRowChange(i, e.target.value)}
                  onPaste={i === urlRows.length - 1 ? e => handleUrlRowPaste(i, e) : undefined}
                  disabled={isLoading}
                  placeholder={i === urlRows.length - 1 ? '输入图片 URL（可选）' : `图片 URL ${i + 1}`}
                  className="imc-url-input"
                />
                {normalizeUrl(row) && <ThumbnailPreview url={normalizeUrl(row)} />}
                {i < urlRows.length - 1 && (
                  <button
                    type="button"
                    onClick={() => removeUrlRow(i)}
                    className="imc-url-remove"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 视频描述 */}
        <div>
          <label className="imc-field-label">视频描述</label>
          <textarea
            value={prompt ? editablePrompt : descriptionText}
            onChange={e => {
              if (prompt) setEditablePrompt(e.target.value)
              else setDescriptionText(e.target.value)
            }}
            disabled={isLoading}
            placeholder="描述希望生成的视频内容…（可选）"
            rows={2}
            className="imc-textarea"
            style={{ maxHeight: 120 }}
          />
        </div>

        {/* 参数折叠面板 */}
        <div>
          <button type="button" onClick={() => setShowParams(p => !p)} className="imc-params-toggle">
            <span>参数：{resolution} · {ratio} · {duration}s{seed ? ` · seed:${seed}` : ''}</span>
            <span>{showParams ? '▲' : '▼'}</span>
          </button>
          {showParams && (
            <div className="imc-params-grid">
              <div>
                <label className="imc-field-label">分辨率</label>
                <select
                  value={resolution}
                  onChange={e => setResolution(e.target.value)}
                  disabled={isLoading}
                  className="imc-select"
                >
                  <option value="720P">720P</option>
                  <option value="1080P">1080P</option>
                </select>
              </div>
              <div>
                <label className="imc-field-label">宽高比</label>
                <select
                  value={ratio}
                  onChange={e => setRatio(e.target.value)}
                  disabled={isLoading}
                  className="imc-select"
                >
                  {RATIOS.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="imc-field-label">时长</label>
                <input
                  type="number"
                  min={3}
                  max={15}
                  value={duration}
                  onChange={e => setDuration(Number(e.target.value))}
                  disabled={isLoading}
                  className="imc-input"
                />
              </div>
              <div>
                <label className="imc-field-label">种子</label>
                <input
                  type="number"
                  min={0}
                  max={2147483647}
                  value={seed}
                  onChange={e => setSeed(e.target.value)}
                  disabled={isLoading}
                  placeholder="随机"
                  className="imc-input"
                />
              </div>
            </div>
          )}
        </div>

        {/* 生成按钮 */}
        {!isLoading && !error && !result && (
          <button type="button" onClick={handleGenerate} className="imc-cta">
            生成视频
          </button>
        )}

        {/* 加载态：状态行 + 进度条 + 可折叠日志 */}
        {isLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="imc-status-line">
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fbbf24', flex: 'none' }} className="animate-pulse" />
              <span style={{ flex: 1 }}>{currentStatus?.message || '正在生成视频…'}</span>
              {currentStatus?.elapsed != null && (
                <span style={{ fontFamily: 'var(--ff-mono)', fontSize: 11 }}>已等 {currentStatus.elapsed}s</span>
              )}
            </div>
            <div className="imc-progress-track">
              <div
                className="imc-progress-fill"
                style={{ width: `${currentStatus?.progress_pct ?? 0}%` }}
              />
            </div>
            <div className="imc-meta-line" style={{ textAlign: 'right' }}>
              约 {currentStatus?.progress_pct ?? 0}%
            </div>

            {progress.length > 1 && (
              <details>
                <summary className="imc-params-toggle" style={{ cursor: 'pointer' }}>
                  详细日志 ({progress.length - 1} 次轮询)
                </summary>
                <div style={{ marginTop: 6, maxHeight: 120, overflowY: 'auto', background: 'var(--surface)', borderRadius: 'var(--r-sm)', padding: 8, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {progress.map((p, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted)' }}>
                      <span style={{
                        width: 5, height: 5, borderRadius: '50%', flex: 'none',
                        background: p.status === 'SUCCEEDED' ? '#22c55e' : p.status === 'FAILED' ? '#ef4444' : '#fbbf24',
                      }} />
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.message}</span>
                      {p.progress_pct != null && (
                        <span style={{ flex: 'none', fontFamily: 'var(--ff-mono)', fontSize: 11 }}>{p.progress_pct}%</span>
                      )}
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}

        {/* 错误态 */}
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
      {/* Image thumbnails (from prop) or URL input (when empty) */}
      {imageUrls.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {imageUrls.map((url, i) => (
            <img
              key={i}
              src={url}
              alt=""
              className="h-12 w-12 rounded-lg object-cover"
              loading="eager"
            />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {urlRows.map((row, i) => (
            <div key={i} className="relative flex items-center gap-2">
              <input
                type="url"
                value={row}
                onChange={e => handleUrlRowChange(i, e.target.value)}
                onPaste={i === urlRows.length - 1 ? e => handleUrlRowPaste(i, e) : undefined}
                disabled={isLoading}
                placeholder={i === urlRows.length - 1 ? '输入图片 URL（可选）' : `图片 URL ${i + 1}`}
                className="w-full rounded-lg border bg-white px-3 py-2 pr-10 outline-none placeholder:text-track/40 disabled:opacity-50 border-line text-xs focus:border-start focus:ring-1 focus:ring-start"
              />
              {normalizeUrl(row) && <ThumbnailPreview url={normalizeUrl(row)} />}
              {i < urlRows.length - 1 && (
                <button
                  type="button"
                  onClick={() => removeUrlRow(i)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line text-track/50 text-sm transition-colors hover:border-red-300 hover:text-red-500"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Prompt textarea: pre-filled from prop when available, editable by user */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block font-medium text-[10px] text-track/50">
            视频描述
          </label>
          <button
            type="button"
            onClick={handleOptimize}
            disabled={optimizing || isLoading || (!prompt ? !descriptionText.trim() : !editablePrompt.trim())}
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
          value={prompt ? editablePrompt : descriptionText}
          onChange={e => {
            if (prompt) setEditablePrompt(e.target.value)
            else setDescriptionText(e.target.value)
          }}
          disabled={isLoading}
          placeholder="描述希望生成的视频内容…（可选）"
          rows={2}
          className="w-full resize-none rounded-lg border bg-white px-3 py-2 outline-none placeholder:text-track/40 disabled:opacity-50 border-line text-xs focus:border-start focus:ring-1 focus:ring-start"
          style={{ maxHeight: 120 }}
        />
      </div>

      {/* Parameter panel (collapsed by default) */}
      <div>
        <button
          type="button"
          onClick={() => setShowParams(p => !p)}
          className="flex w-full items-center justify-between text-xs text-track/50 hover:text-track/70"
        >
          <span>参数：{resolution} · {ratio} · {duration}s{seed ? ` · seed:${seed}` : ''}</span>
          <span className="ml-1">{showParams ? '▲' : '▼'}</span>
        </button>
        {showParams && (
          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div>
              <label className="mb-0.5 block text-[10px] text-track/50">分辨率</label>
              <select
                value={resolution}
                onChange={e => setResolution(e.target.value)}
                disabled={isLoading}
                className="w-full rounded-lg border bg-white px-2 py-1.5 outline-none border-line text-xs focus:border-start"
              >
                <option value="720P">720P</option>
                <option value="1080P">1080P</option>
              </select>
            </div>
            <div>
              <label className="mb-0.5 block text-[10px] text-track/50">宽高比</label>
              <select
                value={ratio}
                onChange={e => setRatio(e.target.value)}
                disabled={isLoading}
                className="w-full rounded-lg border bg-white px-2 py-1.5 outline-none border-line text-xs focus:border-start"
              >
                {RATIOS.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-0.5 block text-[10px] text-track/50">时长</label>
              <input
                type="number"
                min={3}
                max={15}
                value={duration}
                onChange={e => setDuration(Number(e.target.value))}
                disabled={isLoading}
                className="w-full rounded-lg border bg-white px-2 py-1.5 outline-none border-line text-xs focus:border-start"
              />
            </div>
            <div>
              <label className="mb-0.5 block text-[10px] text-track/50">种子</label>
              <input
                type="number"
                min={0}
                max={2147483647}
                value={seed}
                onChange={e => setSeed(e.target.value)}
                disabled={isLoading}
                placeholder="随机"
                className="w-full rounded-lg border bg-white px-2 py-1.5 outline-none placeholder:text-track/30 border-line text-xs focus:border-start"
              />
            </div>
          </div>
        )}
      </div>

      {/* Generate button */}
      {!isLoading && !error && !result && (
        <button
          type="button"
          onClick={handleGenerate}
          className="w-full rounded-lg font-medium text-white transition-colors disabled:cursor-not-allowed disabled:bg-line disabled:text-track/40 bg-start px-4 py-2 text-sm hover:bg-start/90"
        >
          生成视频
        </button>
      )}

      {/* Loading state: status line + progress bar */}
      {isLoading && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-400" />
            <span className="text-xs text-track/80">{currentStatus?.message || '正在生成视频…'}</span>
            {currentStatus?.elapsed != null && (
              <span className="ml-auto whitespace-nowrap font-mono text-[10px] text-track/40">
                已等 {currentStatus.elapsed}s
              </span>
            )}
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-mist">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out bg-start"
              style={{ width: `${currentStatus?.progress_pct ?? 0}%` }}
            />
          </div>
          <p className="text-right text-[10px] text-track/40">
            约 {currentStatus?.progress_pct ?? 0}%
          </p>

          {/* Collapsible detailed log */}
          {progress.length > 1 && (
            <details className="group">
              <summary className="cursor-pointer font-medium transition-colors text-[10px] text-track/40 hover:text-track/60">
                详细日志 ({progress.length - 1} 次轮询)
              </summary>
              <div className="mt-1 max-h-[120px] space-y-0.5 overflow-y-auto rounded-lg bg-white/50 p-2">
                {progress.map((p, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[10px] text-track/50">
                    <span className={`inline-block h-1 w-1 shrink-0 rounded-full ${
                      p.status === 'SUCCEEDED' ? 'bg-green-500'
                      : p.status === 'FAILED' ? 'bg-red-500'
                      : 'bg-amber-400'
                    }`} />
                    <span className="flex-1 truncate">{p.message}</span>
                    {p.progress_pct != null && (
                      <span className="shrink-0 font-mono text-[9px] text-track/30">{p.progress_pct}%</span>
                    )}
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {/* Error state */}
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

/** Normalize a single URL: keep as-is if empty, trim whitespace, validate http/https */
function normalizeUrl(s: string): string {
  const trimmed = s.trim()
  if (!trimmed) return ''
  return trimmed.startsWith('http://') || trimmed.startsWith('https://') ? trimmed : ''
}

/** Small inline thumbnail for a URL input row */
function ThumbnailPreview({ url }: { url: string }) {
  const [loaded, setLoaded] = useState(false)
  const [failed, setFailed] = useState(false)

  return (
    <div className="absolute right-1.5 top-1/2 -translate-y-1/2">
      {!loaded && !failed && (
        <div className="flex h-7 w-7 items-center justify-center rounded bg-mist">
          <span className="text-[8px] text-track/30">…</span>
        </div>
      )}
      {failed && (
        <div className="flex h-7 w-7 items-center justify-center rounded bg-red-50">
          <span className="text-[8px] text-red-400">×</span>
        </div>
      )}
      <img
        src={url}
        alt=""
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={`h-7 w-7 rounded object-cover ${loaded ? 'opacity-100' : 'hidden'}`}
        loading="eager"
      />
    </div>
  )
}
