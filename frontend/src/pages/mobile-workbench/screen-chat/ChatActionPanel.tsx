// OpenSpec: openspec/changes/mobile-chat-ui-redesign
// in_scope: mobile-chat-session
// + 号底部操作面板：上传附件、创作图片、创作视频
import { useEffect, useRef, useState } from 'react'

interface ChatActionPanelProps {
  isOpen: boolean
  onClose: () => void
  onUpload: () => void
  onCreateImage: () => void
  onCreateVideo: () => void
}

const ITEMS = [
  { id: 'upload', icon: '📎', title: '上传附件', subtitle: '支持图片、文档等', onClick: 'onUpload' as const },
  { id: 'image', icon: '🖼️', title: '创作图片', subtitle: '一句话生成产品海报', onClick: 'onCreateImage' as const },
  { id: 'video', icon: '🎬', title: '创作视频', subtitle: '快速生成宣传视频', onClick: 'onCreateVideo' as const },
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
              style={{ animationDelay: `${i * 30}ms` }}
              onClick={() => {
                handlers[item.onClick]()
                onClose()
              }}
            >
              <span className="cap-icon" aria-hidden="true">{item.icon}</span>
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
