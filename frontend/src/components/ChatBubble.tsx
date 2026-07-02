import { useState } from 'react'
import type { ChatMessage } from '../types/chat'

interface ChatBubbleProps {
  message: ChatMessage
  onRetry?: (messageId: string) => void
  onGeneratePlan?: () => void
}

export function ChatBubble({ message, onRetry, onGeneratePlan }: ChatBubbleProps) {
  const isUser = message.role === 'user'
  const [showReasoning, setShowReasoning] = useState(false)

  return (
    <div className={['flex w-full', isUser ? 'justify-end' : 'justify-start'].join(' ')}>
      <div
        className={[
          'max-w-[85%] rounded-2xl px-4 py-3 sm:max-w-[75%]',
          isUser
            ? 'bg-track text-white'
            : 'bg-white shadow-sm',
          message.isError ? 'ring-2 ring-start/50' : '',
        ].join(' ')}
      >
        {!isUser && message.reasoning && (
          <div className="mb-2">
            <button
              type="button"
              onClick={() => setShowReasoning((v) => !v)}
              className="flex items-center gap-1 text-[11px] font-medium text-amber-600 hover:text-amber-700 transition-colors"
            >
              <svg
                className={`h-3 w-3 transition-transform ${showReasoning ? 'rotate-90' : ''}`}
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
              {showReasoning ? '隐藏思考过程' : '查看思考过程'}
            </button>
            {showReasoning && (
              <div className="mt-1.5 rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-xs leading-relaxed text-amber-800 whitespace-pre-wrap">
                {message.reasoning}
              </div>
            )}
          </div>
        )}
        <p className="whitespace-pre-wrap text-sm leading-relaxed sm:text-base">
          {message.content}
        </p>
        {!isUser && message.canGeneratePlan && onGeneratePlan && (
          <button
            type="button"
            onClick={onGeneratePlan}
            className="mt-3 rounded-lg bg-start px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-start/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-start"
          >
            生成方案
          </button>
        )}
        {message.isError && onRetry && (
          <button
            type="button"
            onClick={() => onRetry(message.id)}
            className="mt-2 text-xs font-medium text-start hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-start"
          >
            重试
          </button>
        )}
      </div>
    </div>
  )
}
