import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { streamVideoGeneration } from '../api/video'
import type { VideoParams, VideoResult } from '../types/video'

interface ProgressEvent {
  stage: string
  task_id?: string
  status: string
  message: string
  elapsed?: number
  progress_pct?: number
}

export function VideoTestPage() {
  const [prompt, setPrompt] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [resolution, setResolution] = useState('720P')
  const [ratio, setRatio] = useState('16:9')
  const [duration, setDuration] = useState(5)
  const [seed, setSeed] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState<ProgressEvent[]>([])
  const [currentStatus, setCurrentStatus] = useState<ProgressEvent | null>(null)
  const [result, setResult] = useState<VideoResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const autoTriggered = useRef(false)

  // Auto-trigger from query params
  useEffect(() => {
    if (autoTriggered.current) return
    const params = new URLSearchParams(window.location.search)
    const qPrompt = params.get('prompt')
    const qImageUrl = params.get('image_url')
    if (qPrompt || qImageUrl) {
      autoTriggered.current = true
      if (qPrompt) setPrompt(qPrompt)
      if (qImageUrl) setImageUrl(qImageUrl)
      setTimeout(() => {
        ;(async () => {
          setIsLoading(true)
          const p: VideoParams = {
            prompt: qPrompt || null,
            image_url: qImageUrl || null,
            resolution, ratio, duration,
            seed: null,
          }
          try {
            for await (const event of streamVideoGeneration(p)) {
              if (event.progress) {
                setProgress(prev => [...prev, event.progress!])
                setCurrentStatus(event.progress)
              }
              if (event.result) setResult(event.result)
              if (event.error) setError(event.error.detail)
            }
          } catch (err) {
            setError(err instanceof Error ? err.message : '生成失败')
          } finally {
            setIsLoading(false)
          }
        })()
      }, 0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleGenerate() {
    const trimmedPrompt = prompt.trim()
    const hasImage = imageUrl.trim().length > 0
    if (!trimmedPrompt && !hasImage) return
    if (isLoading) return

    setIsLoading(true)
    setProgress([])
    setCurrentStatus(null)
    setResult(null)
    setError(null)

    const params: VideoParams = {
      prompt: trimmedPrompt || null,
      image_url: imageUrl.trim() || null,
      resolution,
      ratio,
      duration,
      seed: seed ? parseInt(seed, 10) : null,
    }

    try {
      for await (const event of streamVideoGeneration(params)) {
        if (event.progress) {
          setProgress(prev => [...prev, event.progress!])
          setCurrentStatus(event.progress)
        }
        if (event.result) {
          setResult(event.result)
        }
        if (event.error) {
          setError(event.error.detail)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成失败')
    } finally {
      setIsLoading(false)
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleGenerate()
    }
  }

  const ratios = ['16:9', '9:16', '1:1', '4:3', '3:4', '4:5', '5:4', '9:21', '21:9']

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 overflow-y-auto px-4 py-6">
      {/* 图片 URL（必填 — 图生视频） */}
      <div>
        <label htmlFor="video-image-url" className="mb-2 block text-sm font-medium text-track">
          图片 URL <span className="text-xs text-track/40">（选填，图生视频用）</span>
        </label>
        <input
          id="video-image-url"
          type="text"
          value={imageUrl}
          onChange={e => setImageUrl(e.target.value)}
          disabled={isLoading}
          placeholder="https://… 输入图片 URL 将图片变为动态视频"
          className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none placeholder:text-track/40 focus:border-start focus:ring-1 focus:ring-start disabled:bg-mist"
        />
      </div>

      {/* 提示词（可选） */}
      <div>
        <label htmlFor="video-prompt" className="mb-2 block text-sm font-medium text-track">
          视频提示词 <span className="text-xs text-track/40">（可选）</span>
        </label>
        <textarea
          id="video-prompt"
          rows={4}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          placeholder="可选：补充描述视频的期望内容，例如：一只毛茸茸的柯基犬在沙滩上奔跑，夕阳西下，海浪拍打岸边"
          className="w-full resize-none rounded-2xl border border-line bg-white p-4 text-sm outline-none placeholder:text-track/40 focus:border-start focus:ring-1 focus:ring-start disabled:bg-mist"
        />
      </div>

      {/* 参数 */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-track/60">分辨率</label>
          <select
            value={resolution}
            onChange={e => setResolution(e.target.value)}
            disabled={isLoading}
            className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-start focus:ring-1 focus:ring-start disabled:bg-mist"
          >
            <option value="720P">720P</option>
            <option value="1080P">1080P</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-track/60">宽高比</label>
          <select
            value={ratio}
            onChange={e => setRatio(e.target.value)}
            disabled={isLoading}
            className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-start focus:ring-1 focus:ring-start disabled:bg-mist"
          >
            {ratios.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-track/60">时长（秒）</label>
          <input
            type="number"
            min={3}
            max={15}
            value={duration}
            onChange={e => setDuration(Number(e.target.value))}
            disabled={isLoading}
            className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none focus:border-start focus:ring-1 focus:ring-start disabled:bg-mist"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-track/60">种子（可选）</label>
          <input
            type="number"
            min={0}
            max={2147483647}
            value={seed}
            onChange={e => setSeed(e.target.value)}
            disabled={isLoading}
            placeholder="留空随机"
            className="w-full rounded-xl border border-line bg-white px-3 py-2 text-sm outline-none placeholder:text-track/40 focus:border-start focus:ring-1 focus:ring-start disabled:bg-mist"
          />
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-track/40">Enter 发送，Shift + Enter 换行</p>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isLoading || (!prompt.trim() && !imageUrl.trim())}
          className="rounded-xl bg-start px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-start/90 disabled:cursor-not-allowed disabled:bg-line disabled:text-track/40"
        >
          {isLoading ? '生成中…' : '生成视频'}
        </button>
      </div>

      {/* 状态面板 */}
      {currentStatus && isLoading && (
        <div className="space-y-3 rounded-2xl border border-line bg-white p-4">
          {/* 单行状态 */}
          <div className="flex items-center gap-2 text-sm">
            <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-amber-400" />
            <span className="font-medium text-track">{currentStatus.message}</span>
            {currentStatus.elapsed != null && (
              <span className="ml-auto whitespace-nowrap font-mono text-xs text-track/50">
                已等 {currentStatus.elapsed}s
              </span>
            )}
          </div>

          {/* 进度条 */}
          <div className="space-y-1">
            <div className="h-2 w-full overflow-hidden rounded-full bg-mist">
              <div
                className="h-full rounded-full bg-start transition-all duration-500 ease-out"
                style={{ width: `${currentStatus.progress_pct ?? 0}%` }}
              />
            </div>
            <p className="text-right text-xs text-track/40">
              约 {currentStatus.progress_pct ?? 0}%
            </p>
          </div>

          {/* 折叠详细日志 */}
          {progress.length > 1 && (
            <details className="group">
              <summary className="cursor-pointer text-xs font-medium text-track/50 transition-colors hover:text-track/70">
                详细日志 ({progress.length - 1} 次轮询)
              </summary>
              <div className="mt-2 max-h-[200px] space-y-1 overflow-y-auto rounded-xl bg-mist p-3">
                {progress.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-track/60">
                    <span className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full ${
                      p.status === 'SUCCEEDED'
                        ? 'bg-green-500'
                        : p.status === 'FAILED'
                          ? 'bg-red-500'
                          : 'bg-amber-400'
                    }`} />
                    <span className="flex-1 truncate">{p.message}</span>
                    {p.progress_pct != null && (
                      <span className="shrink-0 font-mono text-[10px] text-track/40">
                        {p.progress_pct}%
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      )}

      {/* 错误 */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* 结果 — 视频播放 */}
      {result?.video_url && (
        <div className="space-y-4 rounded-2xl border border-line bg-white p-5">
          <h2 className="text-lg font-semibold text-track">生成结果</h2>
          <video
            src={result.video_url}
            controls
            autoPlay
            className="w-full rounded-xl"
            style={{ maxHeight: 480 }}
          >
            您的浏览器不支持视频播放
          </video>
          <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            {result.usage?.resolution && (
              <div className="rounded-xl bg-mist p-3">
                <dt className="text-xs text-track/50">分辨率</dt>
                <dd className="mt-1 font-medium text-track">{result.usage.resolution}P</dd>
              </div>
            )}
            {result.usage?.ratio && (
              <div className="rounded-xl bg-mist p-3">
                <dt className="text-xs text-track/50">宽高比</dt>
                <dd className="mt-1 font-medium text-track">{result.usage.ratio}</dd>
              </div>
            )}
            {result.usage?.output_video_duration != null && (
              <div className="rounded-xl bg-mist p-3">
                <dt className="text-xs text-track/50">时长</dt>
                <dd className="mt-1 font-medium text-track">{result.usage.output_video_duration}s</dd>
              </div>
            )}
            <div className="rounded-xl bg-mist p-3">
              <dt className="text-xs text-track/50">Task ID</dt>
              <dd className="mt-1 font-mono text-[11px] text-track/60 break-all">
                {result.task_id}
              </dd>
            </div>
          </div>
          <div className="flex gap-2">
            <a
              href={result.video_url}
              download
              className="inline-flex items-center rounded-xl bg-start px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-start/90"
            >
              下载视频
            </a>
            <button
              type="button"
              onClick={() => {
                setPrompt(result.orig_prompt || prompt)
                setResult(null)
                setProgress([])
              }}
              className="inline-flex items-center rounded-xl border border-line px-4 py-2 text-sm font-medium text-track transition-colors hover:bg-mist"
            >
              重新生成
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
