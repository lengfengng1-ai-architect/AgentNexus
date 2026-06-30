import type { FieldKey, BrandInput } from '../types/chat'

const FIELD_CONFIG: { key: FieldKey; icon: string; label: string }[] = [
  { key: 'brand_name', icon: '🏷', label: '品牌' },
  { key: 'category', icon: '🏃', label: '品类' },
  { key: 'city', icon: '📍', label: '城市' },
  { key: 'budget', icon: '💰', label: '预算' },
  { key: 'period', icon: '📅', label: '周期' },
]

function formatFieldValue(key: FieldKey, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  if (key === 'budget') return `${value}万`
  if (key === 'period') return `${value}月`
  return String(value)
}

interface ProgressTrackProps {
  brandInput?: BrandInput
  onFieldClick?: (key: FieldKey, label: string) => void
}

export function ProgressTrack({ brandInput, onFieldClick }: ProgressTrackProps) {
  return (
    <div className="w-full overflow-x-auto py-4">
      <div className="flex min-w-[320px] items-stretch justify-center gap-2 sm:gap-3">
        {FIELD_CONFIG.map(({ key, icon, label }) => {
          const value = brandInput?.[key]
          const isConfirmed = value !== null && value !== undefined && value !== ''
          const displayValue = formatFieldValue(key, value)

          return (
            <button
              key={key}
              type="button"
              onClick={() => onFieldClick?.(key, label)}
              disabled={!onFieldClick}
              className={[
                'flex flex-1 min-w-[56px] max-w-[120px] flex-col items-center rounded-lg border px-2 py-3 transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-start',
                isConfirmed
                  ? 'border-field bg-white shadow-sm'
                  : 'border-line border-dashed bg-white/60',
                onFieldClick ? 'cursor-pointer hover:border-start' : 'cursor-default',
              ].join(' ')}
            >
              <span className="text-base sm:text-lg">{icon}</span>
              <span className="mt-1 text-[10px] font-medium uppercase tracking-wide text-track/60 sm:text-xs">
                {label}
              </span>
              <span
                className={[
                  'mt-1 font-mono text-xs font-medium sm:text-sm',
                  isConfirmed ? 'text-track' : 'text-track/30',
                ].join(' ')}
              >
                {displayValue}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function getFieldEditPrompt(label: string): string {
  return `把${label}改成 `
}

export { FIELD_CONFIG }
export type { FieldKey }
