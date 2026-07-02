import { useCallback, useEffect, useState } from 'react'
import { useWorkflowSSE } from '../hooks/useWorkflowSSE'
import type { BrandInput } from '../types/chat'
import { PlanActionCards } from './PlanActionCards'
import { PlanForm } from './PlanForm'
import { PlanLogStream } from './PlanLogStream'
import { PlanPreview } from './PlanPreview'
import { PipelineTimeline } from './PipelineTimeline'

const STORAGE_KEY = 'allygo_plan_session'

interface PlanSession {
  brandInput: BrandInput
}

function usePlanSession() {
  const [seed, setSeed] = useState<BrandInput | undefined>(undefined)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as PlanSession
        if (parsed.brandInput) setSeed(parsed.brandInput)
      }
    } catch {
      // ignore corrupted storage
    }
  }, [])

  const save = useCallback((brandInput: BrandInput) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ brandInput }))
    } catch {
      // ignore storage errors
    }
  }, [])

  return { seed, save }
}

export function PlanPage() {
  const {
    runId,
    status,
    nodes,
    logs,
    outputs,
    failedNode,
    error,
    isConnected,
    start,
    control,
    reset,
  } = useWorkflowSSE()
  const { seed, save } = usePlanSession()
  const [autoContinue, setAutoContinue] = useState(true)

  const handleStart = useCallback(
    (brandInput: BrandInput) => {
      save(brandInput)
      start({
        brand_name: brandInput.brand_name,
        category: brandInput.category,
        city: brandInput.city,
        budget: brandInput.budget,
        period: brandInput.period,
      })
    },
    [save, start],
  )

  const chapters = outputs.plan_generator?.chapters || []
  const actions = outputs.action_recommendations
  const budgetKpi = outputs.budget_kpi

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center justify-between border-b border-line bg-white px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="font-display text-2xl tracking-wide text-track">ALLYGO</span>
          <span className="rounded-full bg-start px-2 py-0.5 text-[10px] font-bold text-white">
            MVP
          </span>
        </div>
        <span className="text-xs text-track/50 sm:text-sm">方案生成工作台</span>
      </header>

      <main className="flex flex-1 flex-col gap-4 p-4 sm:flex-row sm:p-6">
        <aside className="w-full flex-shrink-0 space-y-4 sm:w-72">
          <div className="rounded-xl border border-line bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-track">需求确认</h2>
            <PlanForm initial={seed} onSubmit={handleStart} isLoading={status === 'running'} />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-line bg-white px-4 py-3">
            <span className="text-sm text-track">自动继续</span>
            <button
              type="button"
              onClick={() => setAutoContinue((v) => !v)}
              aria-pressed={autoContinue}
              className={`relative h-6 w-11 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-start ${
                autoContinue ? 'bg-start' : 'bg-track/20'
              }`}
            >
              <span
                className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                  autoContinue ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>

          {status === 'failed' && failedNode && (
            <div className="rounded-xl border border-start/30 bg-start/5 p-4">
              <p className="text-sm text-track">
                节点 <strong>{failedNode}</strong> 执行失败
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => control('retry')}
                  className="flex-1 rounded-lg bg-start py-2 text-xs font-medium text-white transition-colors hover:bg-start/90"
                >
                  重试
                </button>
                <button
                  type="button"
                  onClick={() => control('skip')}
                  className="flex-1 rounded-lg border border-line bg-white py-2 text-xs font-medium text-track transition-colors hover:bg-mist"
                >
                  跳过
                </button>
                <button
                  type="button"
                  onClick={() => control('abort')}
                  className="flex-1 rounded-lg border border-line bg-white py-2 text-xs font-medium text-track transition-colors hover:bg-mist"
                >
                  终止
                </button>
              </div>
            </div>
          )}

          {status === 'completed' && (
            <div className="rounded-xl border border-field/30 bg-field/5 p-4">
              <p className="text-sm font-medium text-track">方案已生成</p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={reset}
                  className="flex-1 rounded-lg bg-start py-2 text-xs font-medium text-white transition-colors hover:bg-start/90"
                >
                  重新生成
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-start/30 bg-start/5 p-3 text-sm text-start">
              {error}
            </div>
          )}

          <div className="text-xs text-track/40">
            {isConnected && runId && <p>连接中: {runId}</p>}
          </div>
        </aside>

        <section className="flex flex-1 flex-col gap-4">
          <PipelineTimeline nodes={nodes} failedNode={failedNode} />
          <PlanLogStream logs={logs} />
          <PlanPreview chapters={chapters} />
          <PlanActionCards actions={actions} budgetKpi={budgetKpi} />
        </section>
      </main>
    </div>
  )
}
