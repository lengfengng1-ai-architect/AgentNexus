import { useEffect, useRef } from 'react'
import { ToolCallStatusBar } from './ToolCallStatusBar'

interface MarketResearchProgressCardProps {
  sources: { url: string; title: string }[]
  logs: string[]
  activeSearches?: { search_id: string; query: string }[]
  variant?: 'mobile'
}

/**
 * 市场分析进度卡片 — 流式进行中的搜索状态 + 进度日志
 *
 * 实时搜索状态：ToolCallStatusBar（蓝色条 + spinner）
 * 节点进度日志：下方滚动窗口
 *
 * Corresponding OpenSpec: openspec/changes/remove-search-source-widget/
 * Corresponding in_scope ID: market-analysis
 */
export function MarketResearchProgressCard({
  logs,
  activeSearches,
  variant,
}: MarketResearchProgressCardProps) {
  const logsEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll logs window to bottom
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const isMobile = variant === 'mobile'

  return (
    <div className="flex flex-col gap-2">
      {/* 实时搜索状态条 */}
      {activeSearches && activeSearches.length > 0 && (
        <ToolCallStatusBar searches={activeSearches} />
      )}

      {/* 进度日志窗口 */}
      <div
        className={`overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-2 ${
          isMobile ? 'max-h-[30vh]' : 'max-h-[20vh]'
        }`}
      >
        <div className="mb-1 text-xs font-semibold text-gray-500">
          📋 分析进度
        </div>
        {logs.length === 0 ? (
          <div className="text-xs text-gray-400">正在启动…</div>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="py-0.5 text-xs text-gray-600">
              {log}
            </div>
          ))
        )}
        <div ref={logsEndRef} />
      </div>
    </div>
  )
}
