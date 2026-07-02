import type { ConsumerInsight } from '../types/marketAnalysis'

interface ConsumerInsightsCardProps {
  data: ConsumerInsight[]
}

export function ConsumerInsightsCard({ data }: ConsumerInsightsCardProps) {
  return (
    <div className="rounded-xl border border-line bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-lg">👥</span>
        <h3 className="font-semibold text-track">消费者洞察</h3>
      </div>
      <div className="space-y-4">
        {data.map((insight, i) => (
          <div key={i} className="border-b border-line pb-4 last:border-0 last:pb-0">
            <p className="text-sm font-medium text-track">{insight.shift}</p>
            <ul className="mt-1.5 space-y-1">
              {insight.changes.map((change, j) => (
                <li key={j} className="flex items-start gap-1.5 text-xs text-track/70">
                  <span className="mt-0.5 text-field">•</span>
                  <span>{change}</span>
                </li>
              ))}
            </ul>
            <span className="mt-1 block text-[10px] text-track/40">{insight.source}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
