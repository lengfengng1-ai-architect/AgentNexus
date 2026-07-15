import { useCallback, useEffect, useRef, useState } from 'react'
import { useChat } from '../hooks/useChat'
import { useMarketResearchStream } from '../hooks/useMarketResearchStream'
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
    updateVideoResult,
    updateImageResult,
    updateMessageContent,
    setMarketResearchDone,
    appendMarketResearchSources,
    appendMarketResearchLog,
    setMarketResearchResult,
  } = useChat()

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const hasMessages = messages.length > 0
  const [showConfirm, setShowConfirm] = useState<string | null>(null)
  const [pendingBrandInput, setPendingBrandInput] = useState<BrandInput | null>(null)

  const {
    startMarketResearch,
    activeIds: marketResearchActiveIds,
    activeSearches,
  } = useMarketResearchStream({
    updateMessageContent,
    setMarketResearchDone,
    appendMarketResearchSources,
    appendMarketResearchLog,
    setMarketResearchResult,
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = useCallback((imageUrls?: string[]) => {
    if (inputValue.trim() || (imageUrls && imageUrls.length > 0)) {
      sendMessage(inputValue.trim(), imageUrls)
    }
  }, [inputValue, sendMessage])

  const handleGeneratePlan = useCallback((msgId: string) => {
    const msg = messages.find(m => m.id === msgId)
    if (!msg?.brandInput) return
    setPendingBrandInput(msg.brandInput)
    setShowConfirm('plan')
  }, [messages])

  const handleConfirmGenerate = useCallback(() => {
    if (!pendingBrandInput) return
    try {
      sessionStorage.setItem(BRAND_INPUT_KEY, JSON.stringify(pendingBrandInput))
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

  // ── 市场分析：自动触发 ─────────────────────────────────────────────────────
  useEffect(() => {
    for (const m of messages) {
      if (m.canStartMarketResearch && !marketResearchActiveIds.has(m.id) && m.marketName) {
        startMarketResearch(m.id, m.marketName, m.brandInput?.category || '')
      }
    }
  }, [messages, marketResearchActiveIds, startMarketResearch])

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
                  isMarketResearchActive={marketResearchActiveIds.has(message.id)}
                  activeSearches={
                    marketResearchActiveIds.has(message.id) ? activeSearches : undefined
                  }
                  onRetry={message.retryable ? retryMessage : undefined}
                  onGeneratePlan={message.canGeneratePlan ? handleGeneratePlan : undefined}
                  onVideoResult={updateVideoResult}
                  onImageResult={updateImageResult}
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
