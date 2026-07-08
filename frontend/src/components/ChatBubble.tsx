import { useEffect, useRef, useState } from 'react'
import type { ChatMessage } from '../types/chat'

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 py-2" aria-label="正在输入">
      <span className="h-2 w-2 animate-bounce rounded-full bg-track/50 [animation-delay:-0.3s]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-track/50 [animation-delay:-0.15s]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-track/50" />
    </div>
  )
}

function TypingReasoning({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState('')
  const indexRef = useRef(0)

  useEffect(() => {
    if (indexRef.current >= text.length) return
    const id = setInterval(() => {
      if (indexRef.current < text.length) {
        indexRef.current += 1
        setDisplayed(text.slice(0, indexRef.current))
      } else {
        clearInterval(id)
      }
    }, 12)
    return () => clearInterval(id)
  }, [text])

  return (
    <>
      {displayed}
      <span
        className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-current align-middle"
        aria-hidden="true"
      />
    </>
  )
}

interface ChatBubbleProps {
  message: ChatMessage
  onRetry?: (messageId: string) => void
  onGeneratePlan?: () => void
  onNavigateVideo?: (prompt: string, imageUrl?: string | null) => void
  onNavigateImage?: (prompt: string) => void
}

export function ChatBubble({ message, onRetry, onGeneratePlan, onNavigateVideo, onNavigateImage }: ChatBubbleProps) {
  const isUser = message.role === 'user'
  const isStreaming = message.id.startsWith('stream-')

  const handleNavigate = () => {
    if (message.intent === 'generate_video' && onNavigateVideo) {
      onNavigateVideo(message.videoPrompt || message.content, message.imageUrl)
    } else if (message.intent === 'text_to_video' && onNavigateVideo) {
      onNavigateVideo(message.generationPrompt || message.content)
    } else if (message.intent === 'text_to_image' && onNavigateImage) {
      onNavigateImage(message.generationPrompt || message.content)
    }
  }

  const genLabel = message.intent === 'text_to_image' ? '生成图片' : '生成视频'

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
        <div className="whitespace-pre-wrap text-sm leading-relaxed sm:text-base">
          {isStreaming ? (
            message.reasoning ? (
              <TypingReasoning text={message.reasoning} />
            ) : (
              <TypingIndicator />
            )
          ) : (
            message.content
          )}
        </div>
        {!isUser && message.intent && (message.intent === 'generate_video' || message.intent === 'text_to_video' || message.intent === 'text_to_image') && !isStreaming && (
          <button
            type="button"
            onClick={handleNavigate}
            className="mt-3 rounded-lg bg-start px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-start/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-start"
          >
            {genLabel}
          </button>
        )}
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
