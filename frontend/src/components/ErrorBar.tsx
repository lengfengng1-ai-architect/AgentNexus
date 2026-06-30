interface ErrorBarProps {
  message: string
  onDismiss?: () => void
}

export function ErrorBar({ message, onDismiss }: ErrorBarProps) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-start/20 bg-start/10 px-4 py-2.5 text-start sm:px-6">
      <span className="text-sm font-medium">{message}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="text-xs font-semibold hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-start"
        >
          关闭
        </button>
      )}
    </div>
  )
}
