/**
 * SourceCard — 单条搜索来源卡片
 *
 * 展示来自 web_search 的单个结果：favicon + title + url + snippet。
 * 带 slideIn 动画。
 *
 * Corresponding OpenSpec: openspec/changes/market-analysis-search-sync/
 * Corresponding in_scope ID: market-analysis
 */

import { useEffect, useRef } from 'react'

interface SourceCardProps {
  title: string
  url: string
  snippet?: string
}

export function SourceCard({ title, url, snippet }: SourceCardProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // 新卡片触发 slideIn 动画
    if (ref.current) {
      ref.current.style.animation = 'none'
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      ref.current.offsetHeight // trigger reflow
      ref.current.style.animation = 'sourceCardSlideIn 0.3s ease'
    }
  }, [])

  const hostname = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, '')
    } catch {
      return ''
    }
  })()

  return (
    <div
      ref={ref}
      className="truncate rounded-md border border-gray-100 bg-white px-2 py-1.5 text-xs shadow-sm transition-colors hover:border-blue-200"
    >
      <div className="flex items-center gap-1.5">
        {hostname && (
          <img
            src={`https://www.google.com/s2/favicons?domain=${hostname}&sz=16`}
            alt=""
            className="h-4 w-4 shrink-0 rounded"
            onError={e => {
              (e.target as HTMLImageElement).style.display = 'none'
            }}
          />
        )}
        <span className="min-w-0 flex-1 truncate font-medium text-gray-800">
          {title || url}
        </span>
      </div>
      <div className="mt-0.5 flex items-center gap-1">
        <span className="truncate text-gray-400">{hostname}</span>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-blue-500 underline hover:text-blue-700"
        >
          ↗
        </a>
      </div>
      {snippet && (
        <p className="mt-0.5 line-clamp-2 text-gray-500">{snippet}</p>
      )}
    </div>
  )
}

// ── Global animation keyframes ──

const _style = document.createElement('style')
_style.textContent = `
@keyframes sourceCardSlideIn {
  from {
    opacity: 0;
    transform: translateY(-8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
`
_style.id = 'source-card-keyframes'
if (!document.getElementById('source-card-keyframes')) {
  document.head.appendChild(_style)
}
