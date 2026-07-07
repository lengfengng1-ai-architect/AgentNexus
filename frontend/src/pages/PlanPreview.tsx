import { useState, useRef, useCallback } from 'react'
import { marked } from 'marked'
import type { PlanChapter } from '../types/plan'

/**
 * 剥离开头与章节标题重复的 Markdown ATX 标题。
 *
 * LLM 生成的 content 常以 `# {title}` 或 `# {title}：{subtitle}` 开头，
 * 而 UI 已单独渲染了 title/subtitle，会导致标题重复显示。在 marked.parse 之前调用本函数去重。
 *
 * ponytail: 仅处理 ATX（#）标题；Setext（title\n===）LLM 输出罕见，不支持。
 *           多行「目录块」（1. xxx；2. yyy）属内容质量问题，留给 prompt 端根治。
 */
export function stripDuplicateTitleHeading(content: string, title: string): string {
  // 空 title 直接返回，避免「以空串开头」恒真导致误剥任意标题
  if (!title) return content
  const m = content.match(/^#{1,6}\s+(.+?)[ \t#]*(?:\r?\n)+/)
  if (!m) return content
  // 去掉行内 markdown 标记（* _ `）和首尾空白后再比对
  const headingText = m[1].replace(/[*_`]/g, '').trim()
  if (headingText === title) return content.slice(m[0].length)
  // 以 title 开头时，仅当紧随其后是分隔符才视为重复，避免误剥「title深度报告」这类合法标题
  if (headingText.startsWith(title) && /[：:—\-\s]/.test(headingText[title.length] ?? '')) {
    return content.slice(m[0].length)
  }
  return content
}

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
                    dangerouslySetInnerHTML={{ __html: marked.parse(stripDuplicateTitleHeading(chapter.content, chapter.title)) }}
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

// ponytail: 组件级样式注入，仅影响 .chapter-content 内的 Markdown 渲染
const _previewStyle = document.createElement('style')
_previewStyle.textContent = `
.chapter-content h2 {
  font-size: 1.25rem;
  font-weight: 700;
  color: #0f172a;
  margin-top: 1.5em;
  margin-bottom: 0.75em;
}
.chapter-content h3 {
  font-size: 1.1rem;
  font-weight: 600;
  color: #1e293b;
  margin-top: 1.25em;
  margin-bottom: 0.5em;
}
.chapter-content h4 {
  font-size: 1rem;
  font-weight: 600;
  color: #334155;
  margin-top: 1em;
  margin-bottom: 0.5em;
}
.chapter-content p {
  margin-bottom: 0.75em;
  line-height: 1.8;
}
.chapter-content strong {
  font-weight: 600;
}
.chapter-content em {
  font-style: italic;
}
.chapter-content ul,
.chapter-content ol {
  margin: 0.5em 0;
  padding-left: 1.5em;
}
.chapter-content li {
  margin-bottom: 0.3em;
  line-height: 1.7;
}
.chapter-content table {
  width: 100%;
  border-collapse: collapse;
  margin: 1em 0;
}
.chapter-content th,
.chapter-content td {
  border: 1px solid #e2e8f0;
  padding: 8px 12px;
  text-align: left;
}
.chapter-content th {
  background: #f8fafc;
  font-weight: 600;
}
.chapter-content blockquote {
  border-left: 3px solid #3b82f6;
  padding: 8px 16px;
  margin: 1em 0;
  background: #f8fafc;
  color: #475569;
}
.chapter-content code {
  background: #f1f5f9;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.875em;
}
.chapter-content pre {
  background: #1e293b;
  color: #e2e8f0;
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 1em 0;
}
.chapter-content pre code {
  background: transparent;
  padding: 0;
  color: inherit;
}
.chapter-content hr {
  margin: 1.5em 0;
  border: none;
  border-top: 1px solid #e2e8f0;
}
`
document.head.appendChild(_previewStyle)