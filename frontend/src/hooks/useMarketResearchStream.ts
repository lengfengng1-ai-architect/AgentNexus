/**
 * useMarketResearchStream — 公共 SSE 市场分析流 Hook
 *
 * 封装 SSE fetch + ReadableStream 解析 + 9 种事件类型分发。
 * 消除 ChatContainer 和 ScreenChat 之间约 120 行重复的 SSE 处理代码。
 *
 * Corresponding OpenSpec: openspec/changes/market-analysis-search-sync/
 * Corresponding in_scope ID: market-analysis
 */

import { useCallback, useEffect, useRef, useState } from 'react'

// ── Type definitions ──

export interface SearchState {
  search_id: string
  query: string
}

interface DispatchMethods {
  updateMessageContent: (messageId: string, content: string) => void
  setMarketResearchDone: (messageId: string) => void
  appendMarketResearchSources: (messageId: string, sources: { url: string; title: string }[]) => void
  appendMarketResearchLog: (messageId: string, log: string) => void
  setMarketResearchResult: (messageId: string, result: Record<string, unknown>) => void
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

// ── Hook ──

export function useMarketResearchStream(dispatch: DispatchMethods) {
  const abortRef = useRef<AbortController | null>(null)
  const [activeIds, setActiveIds] = useState<Set<string>>(new Set())
  const [activeSearches, setActiveSearches] = useState<SearchState[]>([])

  // ── 核心方法：启动市场分析 SSE 流 ──
  const startMarketResearch = useCallback(
    async (msgId: string, marketName: string, category: string) => {
      // 标记启动
      dispatch.setMarketResearchDone(msgId) // 按钮点击即消失
      setActiveIds(prev => new Set(prev).add(msgId))

      // Abort 上一个请求（如果有）
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      try {
        const resp = await fetch(`${API_BASE}/market-analysis/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ market_name: marketName, category }),
          signal: controller.signal,
        })
        if (!resp.ok) throw new Error('市场分析请求失败')
        if (!resp.body) throw new Error('响应体为空')

        const reader = resp.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let nodeOrder: string[] = []

        while (true) {
          const { done: streamDone, value } = await reader.read()
          if (streamDone) break

          buffer += decoder.decode(value, { stream: true })
          const parts = buffer.split('\n\n')
          buffer = parts.pop() || ''

          for (const part of parts) {
            if (!part.trim()) continue
            let event = '',
              data = ''
            for (const line of part.split('\n')) {
              const s = line.trim()
              if (s.startsWith('event:')) event = s.slice(6).trim()
              else if (s.startsWith('data:')) data = s.slice(5).trim()
            }
            if (!event || !data) continue

            try {
              const parsed = JSON.parse(data)

              switch (event) {
                // ── 节点开始 ──
                case 'progress': {
                  const label = parsed.stage || parsed.node || ''
                  if (!nodeOrder.includes(label)) {
                    nodeOrder.push(label)
                    dispatch.appendMarketResearchLog(msgId, `📋 ${label}…`)
                  }
                  break
                }

                // ── 工具调用开始 ──
                case 'tool_call_start': {
                  const searchState: SearchState = {
                    search_id: parsed.search_id,
                    query: parsed.query || '',
                  }
                  setActiveSearches(prev => [...prev, searchState])
                  dispatch.appendMarketResearchLog(
                    msgId,
                    `🌐 网页搜索：${searchState.query}`,
                  )
                  break
                }

                // ── 搜索结果 ──
                case 'search_result': {
                  const source = {
                    url: parsed.url || '',
                    title: parsed.title || '',
                  }
                  if (source.url) {
                    dispatch.appendMarketResearchSources(msgId, [source])
                  }
                  break
                }

                // ── 工具调用结束 ──
                case 'tool_call_end': {
                  setActiveSearches(prev =>
                    prev.filter(s => s.search_id !== parsed.search_id),
                  )
                  break
                }

                // ── LLM 逐段输出 ──
                case 'content_delta': {
                  const text = parsed.text || ''
                  if (text) {
                    dispatch.updateMessageContent(msgId, text)
                  }
                  break
                }

                // ── 节点数据（用于提取 evidence 来源） ──
                case 'data': {
                  const nodeResult = parsed.result || {}
                  // 从结构化 evidence 提取
                  const evidence: Array<{
                    source_url?: string
                    source_name?: string
                  }> =
                    nodeResult.evidence ||
                    nodeResult.result?.evidence ||
                    []
                  const sources = evidence
                    .filter((e: { source_url?: string }) => e.source_url)
                    .map(
                      (e: {
                        source_url?: string
                        source_name?: string
                      }) => ({
                        url: e.source_url!,
                        title: e.source_name || '',
                      }),
                    )
                  if (sources.length > 0) {
                    dispatch.appendMarketResearchSources(msgId, sources)
                  }

                  // 从文本字段正则提取（兜底）
                  const textFields: string[] = [
                    nodeResult.definition_notes,
                    nodeResult.conflict_notes,
                    nodeResult.calculation_method,
                  ]
                  for (const arrKey of [
                    'trend_signals',
                    'target_users',
                    'competitors',
                  ]) {
                    const arr = nodeResult[arrKey]
                    if (Array.isArray(arr)) {
                      for (const item of arr) {
                        if (typeof item === 'object' && item) {
                          for (const v of Object.values(item)) {
                            if (typeof v === 'string') textFields.push(v)
                            else if (Array.isArray(v))
                              textFields.push(
                                ...v.filter(
                                  (x: unknown) => typeof x === 'string',
                                ),
                              )
                          }
                        }
                      }
                    }
                  }
                  const urlRe =
                    /(?:[—\-]{1,2}\s*来源:\s*|\[来源:\s*)(\S+?)(?:[\]\s]|$)/g
                  const urlSources: { url: string; title: string }[] = []
                  for (const tf of textFields) {
                    if (!tf || typeof tf !== 'string') continue
                    urlRe.lastIndex = 0
                    let match: RegExpExecArray | null
                    while ((match = urlRe.exec(tf)) !== null) {
                      const url = match[1]
                      if (
                        url &&
                        url !== 'AI总结' &&
                        !urlSources.some(s => s.url === url)
                      ) {
                        urlSources.push({ url, title: '' })
                      }
                    }
                  }
                  if (urlSources.length > 0) {
                    dispatch.appendMarketResearchSources(msgId, urlSources)
                  }
                  break
                }

                // ── 节点结束 ──
                case 'node_end': {
                  if (parsed.status === 'completed') {
                    const label = parsed.node || ''
                    dispatch.appendMarketResearchLog(msgId, `✓ ${label} 完成`)
                  }
                  break
                }

                // ── 文本日志 — 只展示结构化进度日志，忽略搜索失败的原始信息 ──
                case 'log': {
                  const logMsg = parsed.message || ''
                  if (logMsg && !logMsg.startsWith('⚠️')) {
                    dispatch.appendMarketResearchLog(msgId, logMsg)
                  }
                  break
                }

                // ── 最终结果 ──
                case 'result': {
                  const resultData = parsed.result || parsed
                  dispatch.setMarketResearchResult(msgId, resultData)
                  const report = resultData.full_report || ''
                  if (report) {
                    dispatch.updateMessageContent(msgId, report)
                  }
                  dispatch.setMarketResearchDone(msgId)
                  setActiveIds(prev => {
                    const next = new Set(prev)
                    next.delete(msgId)
                    return next
                  })
                  break
                }
              }
            } catch {
              /* ignore parse errors for malformed events */
            }
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return
        const msg =
          err instanceof Error ? err.message : '未知错误'
        dispatch.updateMessageContent(msgId, `❌ 市场分析失败：${msg}`)
        setActiveIds(prev => {
          const next = new Set(prev)
          next.delete(msgId)
          return next
        })
      }
    },
    [dispatch],
  )

  // ── 组件卸载时 abort 流 ──
  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  return {
    startMarketResearch,
    activeIds,
    activeSearches,
  }
}
