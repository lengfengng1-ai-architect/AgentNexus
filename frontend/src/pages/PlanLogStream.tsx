import { useRef, useEffect } from 'react'
import type { PlanLogEvent } from '../types/plan'

interface PlanLogStreamProps {
  logs: PlanLogEvent[]
}

function formatEvent(event: PlanLogEvent): string {
  const parts = [event.event]
  if (event.nodeId) parts.push(`[${event.nodeId}]`)
  if (event.message) parts.push(`- ${event.message}`)
  return parts.join(' ')
}

export function PlanLogStream({ logs }: PlanLogStreamProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <h3 className="mb-2 text-sm font-semibold text-track">运行日志</h3>
      <div className="h-40 overflow-y-auto rounded-lg bg-mist p-3 text-xs">
        {logs.length === 0 && (
          <p className="text-track/40">等待流水线启动…</p>
        )}
        {logs.map((log) => (
          <div key={log.id} className="mb-1 font-mono text-track/70">
            <span className="text-track/40">#{log.id}</span> {formatEvent(log)}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
