import type { CompetitiveLandscape } from '../types/marketAnalysis'

interface CompetitiveLandscapeCardProps {
  data: CompetitiveLandscape
  variant?: 'mobile'
}

export function CompetitiveLandscapeCard({ data, variant }: CompetitiveLandscapeCardProps) {
  const isMobile = variant === 'mobile'
  return (
    <div className={`rounded-xl border border-line bg-white ${isMobile ? 'p-3' : 'p-4'} shadow-sm sm:p-5`}>
      <div className="mb-3 flex items-center gap-2">
        <span className="text-lg">🏢</span>
        <h3 className="font-semibold text-track">竞争格局</h3>
      </div>
      <div className="space-y-3">
        {data.competitors.map((comp, i) => (
          <div key={i} className="border-b border-line pb-3 last:border-0 last:pb-0">
            <p className="font-medium text-track">{comp.brand_name}</p>
            <p className="mt-0.5 text-xs text-track/70">{comp.product_highlights}</p>
            <div className="mt-1.5 flex items-center gap-2">
              <span className="rounded-full bg-mist px-2 py-0.5 text-[10px] font-medium text-track/60">
                {comp.pricing}
              </span>
              <span className="text-[10px] text-track/40">{comp.source}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
