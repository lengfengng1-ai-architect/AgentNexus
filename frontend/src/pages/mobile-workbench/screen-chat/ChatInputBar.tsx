// OpenSpec: openspec/changes/mobile-chat-ui-redesign
// in_scope: mobile-chat-session
// 移动端聊天输入框：+ 号、输入框、语音/发送切换
interface ChatInputBarProps {
  value: string
  onChange: (value: string) => void
  onSend: () => void
  onVoice: () => void
  onToggleActionPanel: () => void
  isActionPanelOpen: boolean
  disabled?: boolean
  inputRef?: React.Ref<HTMLInputElement>
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
}: ChatInputBarProps) {
  const hasValue = value.trim().length > 0

  return (
    <div className="chat-input-bar">
      <div className="chat-input-bar-inner">
        <button
          type="button"
          className={`plus-btn${isActionPanelOpen ? ' active' : ''}`}
          aria-label={isActionPanelOpen ? '关闭菜单' : '展开菜单'}
          aria-expanded={isActionPanelOpen}
          // 用 onMouseDown 替代 onPointerDown 阻止 + 号按钮抢焦点
          // ponytail: onPointerDown 的 preventDefault 会阻止 click 事件冒泡，
          // 改用 onMouseDown 只阻止 focus 不影响 click
          onMouseDown={e => e.preventDefault()}
          onClick={onToggleActionPanel}
        >
          +
        </button>
        <div className="input-wrap">
          <input
            ref={inputRef}
            type="text"
            placeholder="给 Agent 发消息…"
            value={value}
            onChange={e => onChange(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                onSend()
              }
            }}
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
    </div>
  )
}
