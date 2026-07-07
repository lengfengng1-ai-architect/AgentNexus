import { useCallback, useState } from 'react'
import type { PromoVideoStatus } from '../types/plan'

interface ActionItem {
  title: string
  description: string
  buttonLabel: string
  type?: 'normal' | 'video'
  videoUrl?: string
  promoVideo?: PromoVideoStatus
  onClick?: () => void
}

interface PlanActionCardsProps {
  actions?: ActionItem[]
}

function VideoCard({ action }: { action: ActionItem }) {
  const pv = action.promoVideo
  if (!pv) return null

  // 生成中
  if (pv.status === 'generating') {
    return (
      <div className="rounded-lg border border-amber-200 p-4" style={{ background: '#1a1a2e', minHeight: 180 }}>
        <div className="flex h-full flex-col items-center justify-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-amber-400 border-t-transparent" />
          <p className="text-sm font-medium text-amber-400">宣传视频生成中…</p>
          <p className="text-xs text-amber-600/70">约需 1-5 分钟</p>
        </div>
      </div>
    )
  }

  // 失败
  if (pv.status === 'failed') {
    return (
      <div className="rounded-lg border border-amber-200 p-4" style={{ background: '#1a1a2e' }}>
        <div className="flex flex-col items-center justify-center gap-2 py-4">
          <span className="text-2xl">⚠️</span>
          <p className="text-sm font-medium text-amber-400">视频生成失败</p>
          <p className="text-xs text-amber-600/70 text-center">{pv.error || '未知错误'}</p>
        </div>
      </div>
    )
  }

  // 完成
  return (
    <div
      className="rounded-lg border border-amber-200 overflow-hidden"
      style={{ background: '#0f0f23' }}
    >
      <video
        src={action.videoUrl || pv.video_url}
        controls
        autoPlay
        className="w-full"
        style={{ maxHeight: 240 }}
      >
        您的浏览器不支持视频播放
      </video>
      <div className="px-3 py-2">
        <p className="text-xs font-medium text-amber-400">{action.title}</p>
        <p className="text-[10px] text-amber-600/70 mt-0.5">{action.description}</p>
      </div>
    </div>
  )
}

function ActionCard({ action }: { action: ActionItem }) {
  const handleClick = useCallback(() => {
    action.onClick?.()
  }, [action])

  return (
    <div className="rounded-lg border border-amber-200 bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <h4 className="mb-1.5 text-[13px] font-bold text-amber-900">{action.title}</h4>
      <p className="mb-2.5 text-xs leading-relaxed text-slate-500">{action.description}</p>
      <button
        type="button"
        onClick={handleClick}
        className="w-full rounded-lg bg-orange-500 py-2 text-xs font-medium text-white transition-colors hover:bg-orange-600"
      >
        {action.buttonLabel}
      </button>
    </div>
  )
}

export function PlanActionCards({ actions }: PlanActionCardsProps) {
  const [modalOpen, setModalOpen] = useState(false)

  if (!actions || actions.length === 0) return null

  return (
    <>
      {/* Inline action section */}
      <section
        className="rounded-xl border border-amber-200 p-6"
        style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fff7ed 100%)' }}
      >
        <h2 className="mb-4 flex items-center gap-2 text-base font-bold text-amber-900">
          <span>🎯</span> 下一步行动建议
        </h2>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
          {actions.map((action, i) =>
            action.type === 'video' ? (
              <VideoCard key={i} action={action} />
            ) : (
              <ActionCard key={i} action={action} />
            ),
          )}
        </div>
      </section>

      {/* Floating Action Button */}
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        title="查看行动建议"
        className="fixed bottom-7 right-7 z-[200] flex h-14 w-14 items-center justify-center rounded-full bg-orange-500 text-[22px] text-white shadow-[0_6px_20px_rgba(249,115,22,0.35)] transition-all duration-200 hover:scale-105 hover:bg-orange-600"
      >
        🎯
      </button>

      {/* Modal overlay */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="mx-4 w-full max-w-[520px] overflow-hidden rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <h3 className="text-base font-bold text-slate-900">🎯 下一步行动建议</h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition-colors hover:bg-slate-200"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[50vh] overflow-y-auto px-6 py-5">
              <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
                {actions.map((action, i) =>
                  action.type === 'video' ? (
                    <VideoCard key={i} action={action} />
                  ) : (
                    <ActionCard key={i} action={action} />
                  ),
                )}
              </div>
            </div>
            <div className="flex justify-end gap-2.5 border-t border-slate-200 px-6 py-4">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
