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
            className="mb-2 max-h-24 overflow-y-auto rounded-lg bg-amber-50 border border-amber-200 p-2.5 text-xs leading-relaxed text-amber-800 whitespace-pre-wrap"
          >
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
