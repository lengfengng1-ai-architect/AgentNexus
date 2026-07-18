// useBudgetAssessmentStream — 预算评估 SSE 流 Hook
// Corresponding OpenSpec: docs/api/paths/budget-analysis.yaml
// in_scope id: budget-analysis
import { useCallback, useEffect, useRef, useState } from 'react'

interface DispatchMethods {
  updateMessageContent: (messageId: string, content: string) => void
  setBudgetAssessmentResult: (messageId: string, result: Record<string, unknown>, budgetAssessmentId?: string) => void
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

export function useBudgetAssessmentStream(dispatch: DispatchMethods) {
  const abortRef = useRef<AbortController | null>(null)
  const [activeIds, setActiveIds] = useState<Set<string>>(new Set())

  const startBudgetAssessment = useCallback(
    async (msgId: string, category: string, budget: number, period: number, city: string) => {
      setActiveIds(prev => new Set(prev).add(msgId))
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      try {
        const resp = await fetch(`${API_BASE}/budget-analysis/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ category, budget, period, city }),
          signal: controller.signal,
        })
        if (!resp.ok) throw new Error('预算评估请求失败')
        if (!resp.body) throw new Error('响应体为空')

        const reader = resp.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

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
            if (!event || !data) continue
            try {
              const parsed = JSON.parse(data)
              if (event === 'progress') {
                const stage = parsed.stage || ''
                if (stage) dispatch.updateMessageContent(msgId, `⏳ ${stage}…`)
              } else if (event === 'result') {
                const budgetId = (parsed.budget_assessment_id as string) || undefined
                dispatch.setBudgetAssessmentResult(msgId, parsed, budgetId)
                setActiveIds(prev => { const n = new Set(prev); n.delete(msgId); return n })
              } else if (event === 'error') {
                dispatch.updateMessageContent(msgId, `❌ 预算评估失败：${parsed.detail || '未知错误'}`)
                setActiveIds(prev => { const n = new Set(prev); n.delete(msgId); return n })
              }
            } catch { /* ignore malformed */ }
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        const msg = err instanceof Error ? err.message : '未知错误'
        dispatch.updateMessageContent(msgId, `❌ 预算评估失败：${msg}`)
        setActiveIds(prev => { const n = new Set(prev); n.delete(msgId); return n })
      }
    },
    [dispatch],
  )

  useEffect(() => () => { abortRef.current?.abort() }, [])

  return { startBudgetAssessment, activeIds }
}
