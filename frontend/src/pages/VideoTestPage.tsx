import { useState, type KeyboardEvent } from 'react'
import { streamVideoGeneration } from '../api/video'
import type { VideoParams, VideoResult } from '../types/video'

interface ProgressEvent {
  stage: string
  task_id?: string
  status: string
  message: string
}

export function VideoTestPage() {
  const [prompt, setPrompt] = useState('')
  const [resolution, setResolution] = useState('720P')
  const [ratio, setRatio] = useState('16:9')
  const [duration, setDuration] = useState(5)
  const [seed, setSeed] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState<ProgressEvent[]>([])
  const [result, setResult] = useState<VideoResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleGenerate() {
    const trimmed = prompt.trim()
    if (!trimmed || isLoading) return

    setIsLoading(true)
    setProgress([])
    setResult(null)
    setError(null)

    const params: VideoParams = {
      prompt: trimmed,
      resolution,
      ratio,
      duration,
      seed: seed ? parseInt(seed, 10) : null,
    }

    try {
      for await (const event of streamVideoGeneration(params)) {
        if (event.progress) {
          setProgress(prev => [...prev, event.progress!])
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
      {/* 提示词 */}
      <div>
        <label htmlFor="video-prompt" className="mb-2 block text-sm font-medium text-track">
          视频提示词
        </label>
        <textarea
          id="video-prompt"
          rows={4}
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          placeholder="描述你想生成的视频内容，例如：一只毛茸茸的柯基犬在沙滩上奔跑，夕阳西下，海浪拍打岸边"
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
          disabled={isLoading || !prompt.trim()}
          className="rounded-xl bg-start px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-start/90 disabled:cursor-not-allowed disabled:bg-line disabled:text-track/40"
        >
          {isLoading ? '生成中…' : '生成视频'}
        </button>
      </div>

      {/* 进度条 */}
      {progress.length > 0 && (
        <div className="space-y-2 rounded-2xl border border-line bg-white p-4">
          <h3 className="text-sm font-semibold text-track">生成进度</h3>
          <div className="space-y-1.5">
            {progress.map((p, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className={`inline-block h-2 w-2 rounded-full ${
                  p.status === 'SUCCEEDED'
                    ? 'bg-green-500'
                    : p.status === 'FAILED'
                      ? 'bg-red-500'
                      : 'bg-amber-400 animate-pulse'
                }`} />
                <span className="text-track/70">{p.message}</span>
                {p.task_id && (
                  <span className="ml-auto font-mono text-[10px] text-track/40">
                    {p.task_id.slice(0, 8)}…
                  </span>
                )}
              </div>
            ))}
          </div>
          {isLoading && (
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-mist">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-start/50" />
            </div>
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
