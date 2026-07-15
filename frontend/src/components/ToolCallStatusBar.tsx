/**
 * ToolCallStatusBar — 实时搜索状态条
 *
 * 显示当前正在进行的 web_search 调用（支持多条并发）。
 *
 * Corresponding OpenSpec: openspec/changes/market-analysis-search-sync/
 * Corresponding in_scope ID: market-analysis
 */

interface ToolCallStatusBarProps {
  searches: { search_id: string; query: string }[]
}

export function ToolCallStatusBar({ searches }: ToolCallStatusBarProps) {
  if (searches.length === 0) return null

  return (
    <div className="rounded-lg border border-blue-100 bg-blue-50 p-2">
      <div className="mb-1 text-xs font-semibold text-blue-600">
        🔍 正在搜索信息
      </div>
      {searches.map(s => (
        <div
          key={s.search_id}
          className="flex items-center gap-2 py-0.5"
        >
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
          <span className="truncate text-xs text-blue-700">
            🌐 {s.query}
          </span>
        </div>
      ))}
    </div>
  )
}
