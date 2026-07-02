import { useEffect, useRef, useState } from 'react'
import { useChat } from '../hooks/useChat'
import type { BrandInput, ChatMessage, FieldKey } from '../types/chat'
import { ChatBubble } from './ChatBubble'
import { ChatInput } from './ChatInput'
import { ErrorBar } from './ErrorBar'
import { LoadingBubble } from './LoadingBubble'
import { ProgressTrack, getFieldEditPrompt } from './ProgressTrack'
import { WelcomeCard } from './WelcomeCard'

const PLAN_SESSION_KEY = 'allygo_plan_session'

export function ChatContainer() {
  const {
    messages,
    inputValue,
    isLoading,
    error,
    latestBrandInput,
    isComplete,
    setInputValue,
    sendMessage,
    retryMessage,
    prefillInput,
  } = useChat()

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const hasMessages = messages.length > 0
  const [showConfirm, setShowConfirm] = useState<string | null>(null)

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

  function handleGeneratePlan() {
    if (!latestBrandInput) return
    setShowConfirm('plan')
  }

  function handleConfirmGenerate() {
    if (!latestBrandInput) return
    try {
      localStorage.setItem(PLAN_SESSION_KEY, JSON.stringify({ brandInput: latestBrandInput }))
      window.location.href = '/plan'
    } catch {
      // ignore storage errors
    }
  }

  function handleCancelConfirm() {
    setShowConfirm(null)
  }

  function BrandConfirmCard({ brandInput }: { brandInput: BrandInput }) {
    return (
      <div className="mx-auto w-full max-w-3xl rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-blue-800">确认品牌信息</h3>
        <div className="mb-3 grid grid-cols-2 gap-2 text-sm">
          {brandInput.brand_name && (
            <div><span className="text-gray-500">品牌：</span><span className="font-medium">{brandInput.brand_name}</span></div>
          )}
          {brandInput.category && (
            <div><span className="text-gray-500">品类：</span><span className="font-medium">{brandInput.category}</span></div>
          )}
          {brandInput.city && (
            <div><span className="text-gray-500">城市：</span><span className="font-medium">{brandInput.city}</span></div>
          )}
          {brandInput.budget && (
            <div><span className="text-gray-500">预算：</span><span className="font-medium">{brandInput.budget}万</span></div>
          )}
          {brandInput.period && (
            <div><span className="text-gray-500">周期：</span><span className="font-medium">{brandInput.period}个月</span></div>
          )}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleConfirmGenerate}
            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-800"
          >
            确认，开始生成方案
          </button>
          <button
            type="button"
            onClick={handleCancelConfirm}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
          >
            取消
          </button>
        </div>
      </div>
    )
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
        <a
          href="/plan"
          className="text-sm font-medium text-start hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-start"
        >
          工作台
        </a>
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
                  onGeneratePlan={message.canGeneratePlan ? handleGeneratePlan : undefined}
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
