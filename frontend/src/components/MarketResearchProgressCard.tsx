import { useEffect, useRef } from 'react'
import { ToolCallStatusBar } from './ToolCallStatusBar'
import { SourceCard } from './SourceCard'

interface MarketResearchProgressCardProps {
  sources: { url: string; title: string }[]
  logs: string[]
  activeSearches?: { search_id: string; query: string }[]
  variant?: 'mobile'
}

/**
 * 市场分析进度卡片 — 流式进行中的搜索来源 + 进度日志双窗口
 *
 * 改造：集成 ToolCallStatusBar 实时搜索状态、SourceCard 动画展示。
 *
 * Corresponding OpenSpec: openspec/changes/market-analysis-search-sync/
 * Corresponding in_scope ID: market-analysis
 *
 * ponytail: 如果后续需要更复杂的交互（如展开/折叠、置顶），
 * 可以改为受控组件并 expose ref。
 */
export function MarketResearchProgressCard({
  sources,
  logs,
  activeSearches,
  variant,
}: MarketResearchProgressCardProps) {
  const sourcesEndRef = useRef<HTMLDivElement>(null)
  const logsEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll sources window to bottom
  useEffect(() => {
    sourcesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [sources])

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

      {/* 搜索来源窗口 */}
      <div
        className={`overflow-y-auto rounded-lg border border-gray-200 bg-gray-50 p-2 ${
          isMobile ? 'max-h-[30vh]' : 'max-h-[20vh]'
        }`}
      >
        <div className="mb-1 text-xs font-semibold text-gray-500">
          🔍 搜索来源
        </div>
        {sources.length === 0 ? (
          <div className="text-xs text-gray-400">正在搜索…</div>
        ) : (
          <div className="space-y-1.5">
            {sources.map((s, i) => (
              <SourceCard
                key={`${s.url}-${i}`}
                title={s.title}
                url={s.url}
              />
            ))}
          </div>
        )}
        <div ref={sourcesEndRef} />
      </div>

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
