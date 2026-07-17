// OpenSpec: openspec/changes/mobile-chat-ui-redesign
// in_scope: mobile-chat-session
// + 号底部操作面板：上传附件、创作图片、创作视频
import type { JSX } from 'react'

interface ChatActionPanelProps {
  isOpen: boolean
  onClose: () => void
  onUpload: () => void
  onCreateImage: () => void
  onCreateVideo: () => void
}

// ponytail: 内联 SVG 图标；升级路径可抽为独立图标组件
function UploadIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
    </svg>
  )
}

function ImageIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  )
}

function VideoIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="23 7 16 12 23 17 23 7" />
      <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
    </svg>
  )
}

const ITEMS: { id: string; icon: () => JSX.Element; title: string; subtitle: string; onClick: keyof Omit<ChatActionPanelProps, 'isOpen' | 'onClose'> }[] = [
  { id: 'upload', icon: UploadIcon, title: '上传附件', subtitle: '支持图片、文档等', onClick: 'onUpload' },
  { id: 'image', icon: ImageIcon, title: '创作图片', subtitle: '一句话生成产品海报', onClick: 'onCreateImage' },
  { id: 'video', icon: VideoIcon, title: '创作视频', subtitle: '快速生成宣传视频', onClick: 'onCreateVideo' },
]

export function ChatActionPanel({ isOpen, onClose, onUpload, onCreateImage, onCreateVideo }: ChatActionPanelProps) {
  if (!isOpen) return null

  const handlers = { onUpload, onCreateImage, onCreateVideo }

  return (
    <>
      <div className="cap-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="chat-action-panel" role="dialog" aria-label="快捷操作" aria-modal="true">
        <div className="cap-handle" />
        <div className="cap-list">
          {ITEMS.map((item, i) => (
            <button
              key={item.id}
              type="button"
              className="cap-item"
              style={{ animationDelay: `${i * 30 + 30}ms` }}
              onClick={() => {
                handlers[item.onClick]()
                onClose()
              }}
            >
              <span className="cap-icon" aria-hidden="true">
                <item.icon />
              </span>
              <span className="cap-text">
                <span className="cap-title">{item.title}</span>
                <span className="cap-subtitle">{item.subtitle}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
