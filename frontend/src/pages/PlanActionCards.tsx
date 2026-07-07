import { useCallback, useState } from 'react'

interface SizeOption {
  value: string
  label: string
}

interface ActionItem {
  title: string
  description: string
  buttonLabel: string
  onClick?: () => void
  imageUrl?: string | null
  isGenerating?: boolean
  hasImageLayout?: boolean
  onImageClick?: () => void
  size?: string
  sizeOptions?: SizeOption[]
  onSizeChange?: (size: string) => void
}

interface PlanActionCardsProps {
  actions?: ActionItem[]
}

function ActionCard({ action }: { action: ActionItem }) {
  const handleClick = useCallback(() => {
    action.onClick?.()
  }, [action])

  const showImageRow = action.hasImageLayout

  return (
    <div className="rounded-lg border border-amber-200 bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      {showImageRow ? (
        <div className="flex gap-3">
          <div className="flex min-w-0 flex-1 flex-col">
            <h4 className="mb-1.5 text-[13px] font-bold text-amber-900">{action.title}</h4>
            <p className="mb-2.5 flex-1 text-xs leading-relaxed text-slate-500 line-clamp-6">{action.description}</p>
            <button
              type="button"
              onClick={handleClick}
              disabled={action.isGenerating}
              className="w-full rounded-lg bg-orange-500 py-2 text-xs font-medium text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-orange-300"
            >
              {action.buttonLabel}
            </button>
          </div>
          <div className="flex w-[160px] flex-shrink-0 flex-col gap-2">
            {action.sizeOptions && (
              <select
                value={action.size}
                disabled={action.isGenerating}
                onChange={(e) => action.onSizeChange?.(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] text-slate-600 outline-none focus:border-orange-400 disabled:bg-slate-50"
              >
                {action.sizeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            )}
            <div className="flex flex-1 items-center justify-center">
              {action.isGenerating ? (
                <div className="flex h-[140px] w-full items-center justify-center rounded-lg bg-slate-50">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-400 border-t-transparent" />
                </div>
              ) : action.imageUrl ? (
                <button
                  type="button"
                  onClick={action.onImageClick}
                  className="group relative h-full w-full"
                  title="点击放大查看"
                >
                  <img
                    src={action.imageUrl}
                    alt={action.title}
                    className="max-h-[170px] w-full rounded-lg border border-slate-200 object-contain transition-transform group-hover:scale-[1.02]"
                  />
                  <span className="absolute bottom-1 right-1 rounded bg-black/40 px-1.5 py-0.5 text-[9px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                    🔍 放大
                  </span>
                </button>
              ) : (
                <div className="flex h-[140px] w-full items-center justify-center rounded-lg bg-slate-50 text-[28px] text-slate-300">
                  🖼️
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          <h4 className="mb-1.5 text-[13px] font-bold text-amber-900">{action.title}</h4>
          <p className="mb-2.5 text-xs leading-relaxed text-slate-500">{action.description}</p>
          <button
            type="button"
            onClick={handleClick}
            className="w-full rounded-lg bg-orange-500 py-2 text-xs font-medium text-white transition-colors hover:bg-orange-600"
          >
            {action.buttonLabel}
          </button>
        </>
      )}
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
          {actions.map((action, i) => (
            <ActionCard key={i} action={action} />
          ))}
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
                {actions.map((action, i) => (
                  <ActionCard key={i} action={action} />
                ))}
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
