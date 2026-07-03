import { useCallback, useState } from 'react'

interface ActionItem {
  title: string
  description: string
  buttonLabel: string
  onClick?: () => void
}

interface PlanActionCardsProps {
  actions?: ActionItem[]
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
