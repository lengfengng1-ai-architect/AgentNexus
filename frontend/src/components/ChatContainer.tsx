import { useEffect, useRef } from 'react'
import { useChat } from '../hooks/useChat'
import type { FieldKey } from '../types/chat'
import { ChatBubble } from './ChatBubble'
import { ChatInput } from './ChatInput'
import { ErrorBar } from './ErrorBar'
import { LoadingBubble } from './LoadingBubble'
import { ProgressTrack, getFieldEditPrompt } from './ProgressTrack'
import { WelcomeCard } from './WelcomeCard'

export function ChatContainer() {
  const {
    messages,
    inputValue,
    isLoading,
    error,
    latestBrandInput,
    setInputValue,
    sendMessage,
    retryMessage,
    prefillInput,
  } = useChat()

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const hasMessages = messages.length > 0

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function handleSend() {
    if (inputValue.trim()) {
      sendMessage(inputValue)
    }
  }

  function handleFieldClick(_key: FieldKey, label: string) {
    prefillInput(getFieldEditPrompt(label))
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-line bg-white px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <span className="font-display text-2xl tracking-wide text-track">ALLYGO</span>
          <span className="rounded-full bg-start px-2 py-0.5 text-[10px] font-bold text-white">
            MVP
          </span>
        </div>
        <span className="text-xs text-track/50 sm:text-sm">营销方案 Agent</span>
      </header>

      <ProgressTrack brandInput={latestBrandInput} onFieldClick={handleFieldClick} />

      {error && <ErrorBar message={error} onDismiss={() => setInputValue(inputValue)} />}

      <main className="flex-1 overflow-y-auto">
        {!hasMessages ? (
          <WelcomeCard onScenarioClick={prefillInput} />
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 pb-6 sm:px-6">
            {messages.map((message) =>
              message.isLoading ? (
                <LoadingBubble key={message.id} />
              ) : (
                <ChatBubble
                  key={message.id}
                  message={message}
                  onRetry={message.retryable ? retryMessage : undefined}
                />
              ),
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </main>

      <ChatInput
        value={inputValue}
        onChange={setInputValue}
        onSend={handleSend}
        disabled={isLoading}
      />
    </div>
  )
}
