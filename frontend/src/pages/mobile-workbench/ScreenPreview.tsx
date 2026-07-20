// ScreenPreview — 方案全屏预览屏
// OpenSpec: mobile-plan-preview · specs/mobile-plan-preview/spec.md
// 在 PhoneFrame 内展示完整的方案章节（与工作台 PlanPreview 一致的折叠式 Markdown 渲染）
import { useCallback, useState } from 'react'
import { marked } from 'marked'
import type { PlanChapter } from '../../types/plan'
import type { MobileScreen } from './ScreenChat'

interface ScreenPreviewProps {
  onNavigate: (s: MobileScreen) => void
  chapters: PlanChapter[]
}

export function ScreenPreview({ onNavigate, chapters }: ScreenPreviewProps) {
  const [openSet, setOpenSet] = useState<Set<number>>(() => {
    const indices = chapters.slice(0, 3).map((_, i) => i)
    return new Set(indices)
  })

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
      <div className="mw-placeholder">
        <div className="ph-title">📋 方案预览</div>
        <div>暂无方案内容</div>
      </div>
    )
  }

  return (
    <div className="mw-generate-scroll" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', paddingBottom: 20 }}>
      <div className="sec">
        <h3>📋 营销方案预览
          <span className="pv-actions">
            <button type="button" className="pv-act" onClick={expandAll}>展开全部</button>
            <button type="button" className="pv-act" onClick={collapseAll}>折叠全部</button>
          </span>
        </h3>
      </div>

      <div className="pv-list">
        {chapters.map((chapter, index) => {
          const isOpen = openSet.has(index)
          return (
            <div key={chapter.title} className={`pv-item${isOpen ? ' open' : ''}`}>
              <button
                type="button"
                className="pv-head"
                onClick={() => toggleChapter(index)}
              >
                <span className="pv-num">{index + 1}</span>
                <span className="pv-info">
                  <span className="pv-title">{chapter.title}</span>
                  <span className="pv-sub">{chapter.subtitle}</span>
                </span>
                <svg
                  className="pv-arrow"
                  width="16" height="16" viewBox="0 0 24 24"
                  fill="none" stroke="currentColor" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {isOpen && (
                  <div
                    className="mobile-chapter-content"
                    dangerouslySetInnerHTML={{
                      __html: marked.parse(stripDuplicateTitleHeading(chapter.content, chapter.title)).replace(/^<p>(.*?)<\/p>/, '$1'),
                    }}
                  />
              )}
            </div>
          )
        })}
      </div>

      <div className="pv-footer">
        <button type="button" className="pv-back" onClick={() => onNavigate('generate')}>
          ‹ 返回方案
        </button>
      </div>
    </div>
  )
}

/** 剥离开头与章节标题重复的 Markdown ATX 标题或 **粗体标题** */
function stripDuplicateTitleHeading(content: string, title: string): string {
  if (!title) return content
  // 去除开头的 **粗体标题**
  const boldRe = new RegExp('^\\*\\*' + escapeRegex(title) + '\\*\\*[\\s\\n]*(?:——?[\\s\\S]*?)?[\\r?\\n]+')
  if (boldRe.test(content)) return content.replace(boldRe, '')
  // 去除 ATX # 标题
  const m = content.match(/^#{1,6}\s+(.+?)[ \t#]*(?:\r?\n)+/)
  if (!m) return content
  const headingText = m[1].replace(/[*_`]/g, '').trim()
  if (headingText === title) return content.slice(m[0].length)
  if (headingText.startsWith(title) && /[：:—\-\s]/.test(headingText[title.length] ?? '')) {
    return content.slice(m[0].length)
  }
  return content
}
function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
