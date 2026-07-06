import { useState, useRef, useCallback } from 'react'
import type { PlanChapter } from '../types/plan'

interface PlanPreviewProps {
  chapters: PlanChapter[]
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  )
}

export function PlanPreview({ chapters }: PlanPreviewProps) {
  // First 3 chapters open, rest closed
  const [openSet, setOpenSet] = useState<Set<number>>(() => {
    const indices = chapters.slice(0, 3).map((_, i) => i)
    return new Set(indices)
  })
  const chapterRefs = useRef<Map<number, HTMLElement>>(new Map())

  const toggleChapter = useCallback((index: number) => {
    setOpenSet((prev) => {
      const next = new Set(prev)
      next.has(index) ? next.delete(index) : next.add(index)
      return next
    })
  }, [])

  const expandAll = useCallback(() => {
    setOpenSet(new Set(chapters.map((_, i) => i)))
  }, [chapters.length])

  const collapseAll = useCallback(() => {
    setOpenSet(new Set())
  }, [])

  if (chapters.length === 0) {
    return (
      <section className="rounded-xl border border-line bg-white p-6 shadow-sm">
        {/* Section heading */}
        <div className="mb-6 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-base font-bold text-track">
            <span className="text-lg">📋</span>
            营销方案预览
          </h2>
        </div>

        {/* Empty state */}
        <div className="flex flex-col items-center py-16 text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 text-3xl text-blue-700">
            ✨
          </div>
          <h3 className="mb-1.5 text-base font-bold text-track">方案将在这里生成</h3>
          <p className="text-sm text-slate-500">
            填写左侧品牌信息，点击「生成营销方案」即可看到完整 9 章营销方案
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-xl border border-line bg-white p-6 shadow-sm">
      {/* Section heading */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-bold text-track">
          <span className="text-lg">📋</span>
          营销方案预览
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={expandAll}
            className="rounded-md border border-line bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-mist"
          >
            展开全部
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="rounded-md border border-line bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-mist"
          >
            折叠全部
          </button>
        </div>
      </div>

      {/* Chapters */}
      <div>
        {chapters.map((chapter, index) => {
          const isOpen = openSet.has(index)
          const chapterNumber = index + 1

          return (
            <article
              key={chapter.title}
              ref={(el) => {
                if (el) chapterRefs.current.set(index, el)
                else chapterRefs.current.delete(index)
              }}
              className={`border-b border-slate-100 last:border-b-0 ${isOpen ? 'open' : ''}`}
            >
              <button
                type="button"
                onClick={() => toggleChapter(index)}
                className="flex w-full items-center justify-between py-[18px] text-left transition-colors hover:text-blue-700"
              >
                <div className="flex items-center gap-3.5">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md bg-blue-50 text-sm font-bold text-blue-700">
                    {chapterNumber}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-track">{chapter.title}</h3>
                    <p className="text-xs text-slate-500">{chapter.subtitle}</p>
                  </div>
                </div>
                <ChevronIcon open={isOpen} />
              </button>

              {isOpen && (
                <div className="pb-6 pl-[50px]">
                  <div
                    className="chapter-content text-sm leading-relaxed text-slate-600"
                    dangerouslySetInnerHTML={{ __html: chapter.content }}
                  />
                </div>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}
