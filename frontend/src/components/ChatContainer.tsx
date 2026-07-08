import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useChat } from '../hooks/useChat'
import type { BrandInput } from '../types/chat'
import { ChatBubble } from './ChatBubble'
import { ChatInput } from './ChatInput'
import { ErrorBar } from './ErrorBar'
import { WelcomeCard } from './WelcomeCard'
import { BrandConfirmCard } from './BrandConfirmCard'

const PLAN_SESSION_KEY = 'allygo_plan_session'
const BRAND_INPUT_KEY = 'allygo_pending_brand_input'

export function ChatContainer() {
  const {
    messages,
    inputValue,
    isLoading,
    error,
    sendMessage,
    retryMessage,
    prefillInput,
    setInputValue,
  } = useChat()

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const hasMessages = messages.length > 0
  const [showConfirm, setShowConfirm] = useState<string | null>(null)
  const [pendingBrandInput, setPendingBrandInput] = useState<BrandInput | null>(null)

  // Find the latest brand input from any message that carries one
  const latestBrandInput = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].brandInput) return messages[i].brandInput
    }
    return null
  }, [messages])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = useCallback(() => {
    if (inputValue.trim()) {
      sendMessage(inputValue.trim())
    }
  }, [inputValue, sendMessage])

  const handleGeneratePlan = useCallback((brandInput?: BrandInput) => {
    if (!brandInput) return
    setPendingBrandInput(brandInput)
    setShowConfirm('plan')
  }, [])

  const handleNavigateVideo = useCallback((prompt: string, imageUrl?: string | null) => {
    const params = new URLSearchParams()
    params.set('prompt', prompt)
    if (imageUrl) params.set('image_url', imageUrl)
    window.location.href = `/video-test?${params.toString()}`
  }, [])

  const handleNavigateImage = useCallback((prompt: string) => {
    window.location.href = `/image-test?prompt=${encodeURIComponent(prompt)}`
  }, [])

  const handleConfirmGenerate = useCallback(() => {
    if (!pendingBrandInput) return
    try {
      sessionStorage.setItem(BRAND_INPUT_KEY, JSON.stringify(pendingBrandInput))
      // Also save to localStorage for PlanPage fallback
      localStorage.setItem(PLAN_SESSION_KEY, JSON.stringify({ brandInput: pendingBrandInput }))
      window.location.href = '/plan'
    } catch {
      // ignore storage errors
    }
  }, [pendingBrandInput])

  const handleCancelConfirm = useCallback(() => {
    setShowConfirm(null)
    setPendingBrandInput(null)
  }, [])

  return (
    <div className="flex h-full flex-col">

      {error && <ErrorBar message={error} onDismiss={() => setInputValue(inputValue)} />}

      <main className="flex-1 overflow-y-auto">
        {!hasMessages ? (
          <WelcomeCard onScenarioClick={prefillInput} />
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 pb-6 sm:px-6">
            {messages.map((message) => (
                <ChatBubble
                  key={message.id}
                  message={message}
                  onRetry={message.retryable ? retryMessage : undefined}
                  onGeneratePlan={latestBrandInput ? () => handleGeneratePlan(latestBrandInput) : undefined}
                  onNavigateVideo={handleNavigateVideo}
                  onNavigateImage={handleNavigateImage}
                />
              ),
            )}
            {showConfirm === 'plan' && pendingBrandInput && (
              <BrandConfirmCard
                brandInput={pendingBrandInput}
                onConfirm={handleConfirmGenerate}
                onCancel={handleCancelConfirm}
              />
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
