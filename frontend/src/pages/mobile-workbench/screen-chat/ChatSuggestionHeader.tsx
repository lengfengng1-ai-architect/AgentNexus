// OpenSpec: openspec/changes/mobile-chat-ui-redesign
// in_scope: mobile-chat-session
// 空态聚焦时的沉浸式推荐输入区
import type { SuggestedPrompt } from './types'

interface ChatSuggestionHeaderProps {
  prompts: SuggestedPrompt[]
  onPromptClick: (prompt: SuggestedPrompt) => void
  onRefresh: () => void
}

export function ChatSuggestionHeader({ prompts, onPromptClick, onRefresh }: ChatSuggestionHeaderProps) {
  return (
    <div className="suggestion-header">
      <div className="sh-title">Hi, 老板</div>
      <div className="sh-subtitle">让复杂，变简单</div>
      {prompts.map(prompt => (
        <button
          key={prompt.id}
          type="button"
          className="suggestion-card"
          onClick={() => onPromptClick(prompt)}
        >
          <span className="sc-icon" aria-hidden="true">{prompt.icon}</span>
          <span className="sc-label">{prompt.label}</span>
          <span className="sc-arrow" aria-hidden="true">▸</span>
        </button>
      ))}
      <button type="button" className="suggestion-refresh" onClick={onRefresh}>
        <span aria-hidden="true">🔄</span>
        <span>换一批</span>
      </button>
    </div>
  )
}
