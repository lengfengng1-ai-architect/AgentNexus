// useActivityPlanningStream — 活动规划 SSE 流 Hook
// Corresponding OpenSpec: docs/api/paths/activity-planning.yaml
// in_scope id: activity-planning
import { useCallback, useEffect, useRef, useState } from 'react'

interface DispatchMethods {
  updateMessageContent: (messageId: string, content: string) => void
  setActivityPlanningResult: (messageId: string, result: Record<string, unknown>, activityPlanningId?: string) => void
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

export function useActivityPlanningStream(dispatch: DispatchMethods) {
  const abortRef = useRef<AbortController | null>(null)
  const [activeIds, setActiveIds] = useState<Set<string>>(new Set())

  const startActivityPlanning = useCallback(
    async (msgId: string, sportType: string, city: string) => {
      setActiveIds(prev => new Set(prev).add(msgId))
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      try {
        const resp = await fetch(`${API_BASE}/activity-planning/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sport_type: sportType, city }),
          signal: controller.signal,
        })
        if (!resp.ok) throw new Error('活动规划请求失败')
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
                const activityId = (parsed.activity_planning_id as string) || undefined
                dispatch.setActivityPlanningResult(msgId, parsed, activityId)
                setActiveIds(prev => { const n = new Set(prev); n.delete(msgId); return n })
              } else if (event === 'error') {
                dispatch.updateMessageContent(msgId, `❌ 活动规划失败：${parsed.detail || '未知错误'}`)
                setActiveIds(prev => { const n = new Set(prev); n.delete(msgId); return n })
              }
            } catch { /* ignore malformed */ }
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        const msg = err instanceof Error ? err.message : '未知错误'
        dispatch.updateMessageContent(msgId, `❌ 活动规划失败：${msg}`)
        setActiveIds(prev => { const n = new Set(prev); n.delete(msgId); return n })
      }
    },
    [dispatch],
  )

  useEffect(() => () => { abortRef.current?.abort() }, [])

  return { startActivityPlanning, activeIds }
}
