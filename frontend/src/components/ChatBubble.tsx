import { useRef, useEffect } from 'react'
import type { ChatMessage } from '../types/chat'

interface ChatBubbleProps {
  message: ChatMessage
  onRetry?: (messageId: string) => void
  onGeneratePlan?: () => void
}

export function ChatBubble({ message, onRetry, onGeneratePlan }: ChatBubbleProps) {
  const isUser = message.role === 'user'
  const reasoningRef = useRef<HTMLDivElement>(null)

  // Auto-scroll reasoning box
  useEffect(() => {
    if (reasoningRef.current) {
      reasoningRef.current.scrollTop = reasoningRef.current.scrollHeight
    }
  })

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
        {!isUser && message.reasoning && !message.content && (
          <div
            ref={reasoningRef}
            className="mb-3 max-h-28 overflow-y-auto rounded-lg border border-gray-200 bg-white p-3 text-xs leading-relaxed text-gray-500 whitespace-pre-wrap"
          >
            <div className="mb-2 flex items-center gap-2 text-gray-400">
              <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-[11px] font-medium text-gray-400">思考中</span>
            </div>
            {message.reasoning}
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
