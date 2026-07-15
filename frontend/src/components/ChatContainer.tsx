import { useCallback, useEffect, useRef, useState } from 'react'
import { useChat } from '../hooks/useChat'
import type { BrandInput } from '../types/chat'
import { ChatBubble } from './ChatBubble'
import { ChatInput } from './ChatInput'
import { ErrorBar } from './ErrorBar'
import { WelcomeCard } from './WelcomeCard'
import { BrandConfirmCard } from './BrandConfirmCard'

const PLAN_SESSION_KEY = 'allygo_plan_session'
const BRAND_INPUT_KEY = 'allygo_pending_brand_input'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

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
  } = useChat()

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const hasMessages = messages.length > 0
  const [showConfirm, setShowConfirm] = useState<string | null>(null)
  const [pendingBrandInput, setPendingBrandInput] = useState<BrandInput | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const [marketResearchActiveIds, setMarketResearchActiveIds] = useState<Set<string>>(new Set())

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

  // ── 市场分析 ───────────────────────────────────────────────────────────
  const handleStartMarketResearch = useCallback(async (msgId: string) => {
    const msg = messages.find(m => m.id === msgId)
    if (!msg?.marketName) return

    updateMessageContent(msgId, '🔍 正在启动市场分析…')
    setMarketResearchDone(msgId)  // 按钮点击即消失
    setMarketResearchActiveIds(prev => new Set(prev).add(msgId))

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller

    try {
      const resp = await fetch(`${API_BASE}/market-analysis/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ market_name: msg.marketName, category: msg.brandInput?.category || '' }),
        signal: controller.signal,
      })
      if (!resp.ok) throw new Error('市场分析请求失败')
      if (!resp.body) throw new Error('响应体为空')

      const reader = resp.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let progressLines: string[] = []

      while (true) {
        const { done: streamDone, value } = await reader.read()
        if (streamDone) break

        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() || ''

        for (const part of parts) {
          if (!part.trim()) continue
          let event = '', data = ''
          for (const line of part.split('\n')) {
            const s = line.trim()
            if (s.startsWith('event:')) event = s.slice(6).trim()
            else if (s.startsWith('data:')) data = s.slice(5).trim()
          }

          if (event === 'progress' && data) {
            try {
              const p = JSON.parse(data)
              const label = p.stage || p.node || ''
              if (!progressLines.includes(label)) {
                progressLines.push(label)
                updateMessageContent(msgId, progressLines.join('\n'))
              }
            } catch { /* ignore */ }
          }

          if (event === 'node_end' && data) {
            try {
              const p = JSON.parse(data)
              if (p.status === 'completed') {
                const lastIdx = progressLines.length - 1
                if (lastIdx >= 0 && !progressLines[lastIdx].includes('✓')) {
                  progressLines[lastIdx] = progressLines[lastIdx] + '  ✓'
                  updateMessageContent(msgId, progressLines.join('\n'))
                }
              }
            } catch { /* ignore */ }
          }

          if (event === 'log' && data) {
            try {
              const p = JSON.parse(data)
              const logMsg = p.message || ''
              if (logMsg) {
                progressLines.push(logMsg)
                // 截断保留最近 50 条
                if (progressLines.length > 50) {
                  progressLines = progressLines.slice(-50)
                }
                updateMessageContent(msgId, progressLines.join('\n'))
              }
            } catch { /* ignore */ }
          }

          if (event === 'result' && data) {
            try {
              const r = JSON.parse(data)
              const report = r.result?.full_report || r.full_report || ''
              if (report) {
                updateMessageContent(msgId, report)
              }
              setMarketResearchDone(msgId)
              setMarketResearchActiveIds(prev => { const next = new Set(prev); next.delete(msgId); return next })
            } catch { /* ignore */ }
          }
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return
      updateMessageContent(msgId, `❌ 市场分析失败：${err instanceof Error ? err.message : '未知错误'}`)
      setMarketResearchActiveIds(prev => { const next = new Set(prev); next.delete(msgId); return next })
    }
  }, [messages, updateMessageContent])

  // ── 组件卸载时 abort 流 ─────────────────────────────────────────────────
  useEffect(() => {
    return () => { abortRef.current?.abort() }
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
                  isMarketResearchActive={marketResearchActiveIds.has(message.id)}
                  onRetry={message.retryable ? retryMessage : undefined}
                  onGeneratePlan={message.canGeneratePlan ? handleGeneratePlan : undefined}
                  onStartMarketResearch={message.canStartMarketResearch ? handleStartMarketResearch : undefined}
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
