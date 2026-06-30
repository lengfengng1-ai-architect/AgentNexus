export function LoadingBubble() {
  return (
    <div className="flex w-full justify-start">
      <div className="max-w-[85%] rounded-2xl bg-white px-4 py-3 shadow-sm sm:max-w-[75%]">
        <div className="space-y-2">
          <div className="h-3 w-32 animate-pulse rounded bg-line" />
          <div className="h-3 w-48 animate-pulse rounded bg-line" />
          <div className="h-3 w-24 animate-pulse rounded bg-line" />
        </div>
        <p className="mt-3 text-xs text-track/50">AllyGo 正在整理需求…</p>
      </div>
    </div>
  )
}
