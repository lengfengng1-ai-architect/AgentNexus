// OpenSpec: openspec/changes/mobile-chat-ui-redesign
// in_scope: mobile-chat-session
// 移动端聊天输入框：+号、输入框、语音/发送切换 + 浮动面板
import { type ReactNode, useCallback, useState, type ChangeEvent, type KeyboardEvent } from 'react'

interface ChatInputBarProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  onVoice: () => void
  onToggleActionPanel: () => void
  isActionPanelOpen: boolean
  disabled?: boolean
  inputRef?: React.Ref<HTMLInputElement>
  onFocus?: () => void
  onBlur?: () => void
  floatingPanel?: ReactNode
}

export function ChatInputBar({
  value,
  onChange,
  onSend,
  onVoice,
  onToggleActionPanel,
  isActionPanelOpen,
  disabled,
  inputRef,
  onFocus,
  onBlur,
  floatingPanel,
}: ChatInputBarProps) {
  const hasValue = value.trim().length > 0
  const [focused, setFocused] = useState(false)

  const handleFocus = useCallback(() => {
    setFocused(true)
    onFocus?.()
  }, [onFocus])

  const handleBlur = useCallback(() => {
    setFocused(false)
    setTimeout(() => onBlur?.(), 150)
  }, [onBlur])

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value),
    [onChange],
  )

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        onSend()
      }
    },
    [onSend],
  )

  return (
    <div className="chat-input-bar">
      {floatingPanel && (
        <div className="chat-input-floating">
          {floatingPanel}
        </div>
      )}
      <div className={`chat-input-wrap${focused ? ' focused' : ''}`}>
        <button
          type="button"
          className={`plus-btn${isActionPanelOpen ? ' active' : ''}`}
          aria-label={isActionPanelOpen ? '关闭菜单' : '展开菜单'}
          aria-expanded={isActionPanelOpen}
          onMouseDown={e => e.preventDefault()}
          onClick={onToggleActionPanel}
        >
          +
        </button>
        <input
          ref={inputRef}
          type="text"
          placeholder="给 Agent 发消息…"
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
        />
        <div className="input-action">
          {hasValue ? (
            <button
              type="button"
              className="send-btn"
              aria-label="发送"
              onClick={onSend}
              disabled={disabled}
            >
              ↑
            </button>
          ) : (
            <button
              type="button"
              className="mic-btn"
              aria-label="语音输入"
              onClick={onVoice}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="2" width="6" height="11" rx="3" ry="3" />
                <path d="M5 10a7 7 0 0 0 14 0" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
