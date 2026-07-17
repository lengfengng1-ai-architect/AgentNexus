// OpenSpec: openspec/changes/mobile-chat-ui-redesign
// in_scope: mobile-chat-session
// 空态聚焦时的沉浸式推荐输入区 — 药丸网格布局
import type { SuggestedPrompt } from './types'

interface ChatSuggestionHeaderProps {
  prompts: SuggestedPrompt[]
  onPromptClick: (prompt: SuggestedPrompt) => void
  onRefresh: () => void
  refreshing?: boolean
}

// ponytail: 简易 SVG 图标查找。升级路径：迁移到独立图标组件库。
const SVG_ICONS: Record<string, string> = {
  'navigate-brief':
    '<svg viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5z" fill="#1677ff" opacity="0.9"/><path d="M2 17l10 5 10-5" stroke="#1677ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 12l10 5 10-5" stroke="#1677ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  'prefill-brand-template':
    '<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="2" fill="#1677ff" opacity="0.45"/><rect x="14" y="3" width="7" height="7" rx="2" fill="#1677ff" opacity="0.7"/><rect x="3" y="14" width="7" height="7" rx="2" fill="#1677ff" opacity="0.7"/><rect x="14" y="14" width="7" height="7" rx="2" fill="#1677ff"/></svg>',
  'prefill-market-analysis':
    '<svg viewBox="0 0 24 24" fill="none"><path d="M3 20L8.5 12 13 16 21 4" stroke="#1677ff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="8.5" cy="12" r="2.5" fill="#1677ff" opacity="0.2"/><circle cx="13" cy="16" r="2.5" fill="#1677ff" opacity="0.2"/><circle cx="21" cy="4" r="2.5" fill="#1677ff" opacity="0.2"/></svg>',
  'send-text':
    '<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#1677ff" stroke-width="2"/><path d="M12 3a15 15 0 0 1 4 9 15 15 0 0 1-4 9" stroke="#1677ff" stroke-width="1.8" stroke-linecap="round"/><path d="M12 3a15 15 0 0 0-4 9 15 15 0 0 0 4 9" stroke="#1677ff" stroke-width="1.8" stroke-linecap="round"/><line x1="3" y1="12" x2="21" y2="12" stroke="#1677ff" stroke-width="1.8"/></svg>',
  'virtual-image':
    '<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="18" height="18" rx="3" stroke="#1677ff" stroke-width="2"/><circle cx="8.5" cy="8.5" r="2" fill="#1677ff" opacity="0.4"/><polyline points="21 15 16 10 5 21" stroke="#1677ff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  'virtual-video':
    '<svg viewBox="0 0 24 24" fill="none"><polygon points="23 7 16 12 23 17" fill="#1677ff" opacity="0.85"/><rect x="1" y="5" width="15" height="14" rx="3" stroke="#1677ff" stroke-width="2"/></svg>',
}

export function ChatSuggestionHeader({ prompts, onPromptClick, onRefresh, refreshing }: ChatSuggestionHeaderProps) {
  return (
    <div className="suggestion-header">
      <div className="sh-title">Hi, boss</div>
      <div className="sh-subtitle">让复杂，变简单</div>
      <div className="sg-scroll">
        {prompts.map(prompt => (
          <button
            key={prompt.id}
            type="button"
            className="suggestion-card"
            onClick={() => onPromptClick(prompt)}
          >
            <span
              className="sc-icon"
              aria-hidden="true"
              dangerouslySetInnerHTML={{ __html: SVG_ICONS[prompt.action] || '' }}
            />
            <span className="sc-label">{prompt.label}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        className={`suggestion-refresh${refreshing ? ' spinning' : ''}`}
        onClick={onRefresh}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="23 4 23 10 17 10" />
          <polyline points="1 20 1 14 7 14" />
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        </svg>
        <span>换一批</span>
      </button>
    </div>
  )
}
