import { useState } from 'react'
import type { PlanChapter } from '../types/plan'

interface PlanPreviewProps {
  chapters: PlanChapter[]
}

export function PlanPreview({ chapters }: PlanPreviewProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  if (chapters.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-white p-6 text-center text-sm text-track/60">
        方案生成后，这里会显示 9 章完整方案。
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {chapters.map((chapter, index) => {
        const isOpen = openIndex === index
        return (
          <div
            key={chapter.title}
            className="overflow-hidden rounded-xl border border-line bg-white"
          >
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : index)}
              className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-mist focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-start"
            >
              <div>
                <h3 className="text-sm font-semibold text-track">{chapter.title}</h3>
                <p className="text-xs text-track/50">{chapter.subtitle}</p>
              </div>
              <span className="text-xs text-track/50">{isOpen ? '收起' : '展开'}</span>
            </button>
            {isOpen && (
              <div className="border-t border-line px-4 py-4">
                <div className="prose prose-sm max-w-none text-track/80">
                  {chapter.content.split('\n').map((line: string, i: number) => (
                    <p key={i} className="mb-2 leading-relaxed">
                      {line}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
