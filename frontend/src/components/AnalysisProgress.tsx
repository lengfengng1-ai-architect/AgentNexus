interface AnalysisProgressProps {
  stages: { stage: string; label: string; progress: number }[]
  currentStage: string
  currentProgress: number
  getStageLabel: (stage: string) => string
}

export function AnalysisProgress({
  stages,
  currentStage,
  currentProgress,
  getStageLabel,
}: AnalysisProgressProps) {
  const currentIndex = stages.findIndex(s => s.stage === currentStage)

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-sm font-medium text-track">分析进度</span>
        <span className="font-mono text-sm text-start">{currentProgress}%</span>
      </div>

      <div className="flex h-3 overflow-hidden rounded-full bg-line">
        {stages.map((s, i) => {
          const isActive = i === currentIndex
          const isPast = i < currentIndex
          return (
            <div
              key={s.stage}
              className={`flex-1 transition-all duration-500 ${
                isPast
                  ? 'bg-field'
                  : isActive
                    ? 'bg-start'
                    : 'bg-transparent'
              } ${i > 0 ? 'ml-0.5' : ''}`}
              title={s.label}
            />
          )
        })}
      </div>

      <div className="mt-3 flex justify-between">
        {stages.map((s, i) => {
          const isActive = i === currentIndex
          const isPast = i < currentIndex
          return (
            <span
              key={s.stage}
              className={`text-[10px] font-medium transition-colors sm:text-xs ${
                isPast
                  ? 'text-field'
                  : isActive
                    ? 'text-start'
                    : 'text-track/30'
              }`}
            >
              {s.label}
            </span>
          )
        })}
      </div>

      <p className="mt-4 text-center text-sm text-track/60">
        正在分析：{getStageLabel(currentStage)}…
      </p>
    </div>
  )
}
