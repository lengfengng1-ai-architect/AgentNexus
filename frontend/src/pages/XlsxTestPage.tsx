import { useCallback, useRef, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

interface FormData {
  brandName: string
  category: string
  city: string
  budget: number
  period: number
}

/** SSE 事件类型 */
interface SSEEvent {
  event: string
  data: string
}

/** 解析 SSE 文本片段，返回事件列表 */
function parseSSE(text: string): SSEEvent[] {
  const events: SSEEvent[] = []
  for (const part of text.split('\n\n')) {
    if (!part.trim()) continue
    let event = '', data = ''
    for (const line of part.split('\n')) {
      const s = line.trim()
      if (s.startsWith('event:')) event = s.slice(6).trim()
      else if (s.startsWith('data:')) data = s.slice(5).trim()
    }
    if (event || data) events.push({ event, data })
  }
  return events
}

/** 读取一个 SSE 流，返回所有事件 */
async function readStream(stream: ReadableStream<Uint8Array>): Promise<SSEEvent[]> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  const events: SSEEvent[] = []

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const parts = buffer.split('\n\n')
    buffer = parts.pop() || ''
    for (const part of parts) {
      events.push(...parseSSE(part))
    }
  }
  // Flush remaining buffer
  if (buffer.trim()) {
    events.push(...parseSSE(buffer))
  }
  return events
}

export function XlsxTestPage() {
  const [form, setForm] = useState<FormData>({
    brandName: '',
    category: '',
    city: '上海',
    budget: 0,
    period: 3,
  })
  const [step, setStep] = useState<'form' | 'running' | 'done'>('form')
  const [xlsxUrl, setXlsxUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const cancelledRef = useRef(false)

  const addLog = useCallback((msg: string) => {
    setLogs(prev => [...prev.slice(-50), msg])
  }, [])

  /** 处理事件列表，返回 true=已结束，返回 'paused'=需要继续 */
  function processEvents(events: SSEEvent[], runId: string): boolean | 'paused' {
    for (const { event, data } of events) {
      if (!data) continue
      let parsed: Record<string, unknown>
      try { parsed = JSON.parse(data) } catch { continue }

      if (event === 'node.start') {
        addLog(`⏳ ${parsed.node_id} 开始执行…`)
      } else if (event === 'node.complete') {
        addLog(`✓ ${parsed.node_id} 完成`)
      } else if (event === 'node.log') {
        const msg = String(parsed.message || '')
        if (msg) addLog(`  ${msg}`)
      } else if (event === 'workflow.paused') {
        const snap = parsed.snapshot as Record<string, unknown> | undefined
        const nodeId = snap?.node_id as string || parsed.node_id as string || 'unknown'
        addLog(`⏸ ${nodeId} 暂停，自动继续…`)
        return 'paused'
      } else if (event === 'workflow.complete') {
        addLog('🎉 方案生成完成')
        return true
      } else if (event === 'node.failed') {
        const detail = String(parsed.detail || '未知错误')
        addLog(`❌ ${detail}`)
        setError(detail)
        return true
      }
    }
    return false
  }

  /** 发起 SSE 请求并处理，如果暂停则递归 resume */
  async function doStream(url: string, method: string, runId: string): Promise<void> {
    if (cancelledRef.current) return

    let resp: Response
    try {
      resp = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: method !== 'GET' ? '{}' : undefined,
      })
    } catch {
      addLog('⏳ 等待中…')
      await sleep(2000)
      return doStream(url, method, runId)
    }

    if (!resp.ok) throw new Error(`${url} 请求失败`)

    const events = await readStream(resp.body!)
    if (cancelledRef.current) return

    const result = processEvents(events, runId)
    if (result === 'paused') {
      // 暂停了，用 approve 继续
      await doStream(`${API_BASE}/plan/runs/${runId}/approve`, 'POST', runId)
    }
    // result === true 或 false → 结束或等待轮询
  }

  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

  async function handleSubmit() {
    if (!form.brandName.trim() || !form.category.trim() || form.budget <= 0) return

    setStep('running')
    setXlsxUrl(null)
    setError(null)
    setLogs([])
    cancelledRef.current = false

    const brandInput: Record<string, unknown> = {
      brand_name: form.brandName,
      category: form.category,
      city: form.city,
      budget: form.budget,
      period: form.period,
    }

    try {
      addLog('🚀 开始方案生成…')

      // Step 1: 启动
      const startResp = await fetch(`${API_BASE}/plan/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify({ brand_input: brandInput }),
      })
      if (!startResp.ok) throw new Error('启动方案生成失败')
      const runId = startResp.headers.get('X-Run-Id') || 'unknown'
      addLog(`✅ 运行 ID: ${runId}`)

      // Step 2: 读取初始流
      const events = await readStream(startResp.body!)
      if (cancelledRef.current) return

      const result = processEvents(events, runId)
      if (result === 'paused') {
        addLog('⏳ 继续推进…')
        await doStream(`${API_BASE}/plan/runs/${runId}/approve`, 'POST', runId)
      }

      if (cancelledRef.current) return

      // Step 3: 轮询结果
      addLog('📡 正在获取 XLSX 表格…')
      await pollXlsx(runId)
    } catch (err) {
      const msg = err instanceof Error ? err.message : '请求失败'
      setError(msg)
      addLog(`❌ ${msg}`)
      setStep('form')
    }
  }

  async function pollXlsx(runId: string) {
    while (!cancelledRef.current) {
      await sleep(3000)
      try {
        const resp = await fetch(`${API_BASE}/plan/runs/${runId}/status`)
        const body = await resp.json()
        const outputs = body.data?.outputs || {}
        const planGen = outputs.plan_generator || {}
        const xlsxPath = (planGen as Record<string, unknown>).xlsx_path as string | undefined

        if (xlsxPath && xlsxPath.startsWith('/')) {
          setXlsxUrl(`${API_BASE.replace('/api/v1', '')}${xlsxPath}`)
          addLog('📊 XLSX 表格已生成')
          addLog(`📁 ${xlsxPath}`)
          setStep('done')
          return
        }

        const status = body.data?.status
        if (status === 'completed' || status === 'failed') {
          if (xlsxPath) {
            setXlsxUrl(`${API_BASE.replace('/api/v1', '')}${xlsxPath}`)
            addLog('📊 XLSX 表格已生成')
            setStep('done')
          } else {
            addLog('⚠️ 方案已完成，但未生成 XLSX 文件')
            setStep('done')
          }
          return
        }
      } catch {
        // 网络错误，重试
      }
    }
  }

  const requiredOk = form.brandName.trim() !== '' && form.category.trim() !== '' && form.budget > 0

  function backToForm() {
    cancelledRef.current = true
    setStep('form')
    setLogs([])
    setXlsxUrl(null)
    setError(null)
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-6" style={{ overflowY: 'auto', height: '100%', minHeight: 0, flex: 1 }}>
      {step === 'form' && (
        <form onSubmit={e => { e.preventDefault(); handleSubmit() }} className="space-y-4">
          <h2 className="text-lg font-semibold text-track">XLSX 方案测试</h2>
          <p className="text-sm text-track/50">填写品牌信息，运行完整流水线，自动生成预算流程回报分析 XLSX 表格。</p>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-track/70">品牌名称</label>
            <input type="text" value={form.brandName}
              onChange={e => setForm(f => ({ ...f, brandName: e.target.value }))}
              placeholder="例：娃哈哈"
              className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-start focus:ring-1 focus:ring-start"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-track/70">品类</label>
              <input type="text" value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                placeholder="例：果汁饮料"
                className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-start focus:ring-1 focus:ring-start"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-track/70">目标城市</label>
              <select value={form.city}
                onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-start focus:ring-1 focus:ring-start"
              >
                {['上海', '北京', '成都', '杭州', '广州', '深圳'].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-track/70">预算（万元）</label>
              <input type="number" value={form.budget || ''}
                onChange={e => setForm(f => ({ ...f, budget: Number(e.target.value) || 0 }))}
                placeholder="例：400"
                className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-start focus:ring-1 focus:ring-start"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-track/70">执行周期</label>
              <select value={form.period}
                onChange={e => setForm(f => ({ ...f, period: Number(e.target.value) }))}
                className="w-full rounded-xl border border-line bg-white px-3 py-2.5 text-sm outline-none focus:border-start focus:ring-1 focus:ring-start"
              >
                {[1, 2, 3, 6, 12].map(p => (
                  <option key={p} value={p}>{p} 个月</option>
                ))}
              </select>
            </div>
          </div>

          <button type="submit" disabled={!requiredOk}
            className="w-full rounded-xl bg-start px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-start/90 disabled:cursor-not-allowed disabled:bg-line disabled:text-track/40"
          >
            生成方案 & XLSX 表格
          </button>
        </form>
      )}

      {step === 'running' && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-track">方案生成中…</h2>
            <button type="button" onClick={backToForm}
              className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-medium text-track/60 hover:bg-mist"
            >取消</button>
          </div>
          <div className="space-y-1 rounded-2xl border border-line bg-white p-4" style={{ maxHeight: 500, overflowY: 'auto' }}>
            {logs.length === 0 && (
              <div className="text-sm text-track/40">等待中…</div>
            )}
            {logs.map((msg, i) => (
              <div key={i} className={`font-mono text-xs leading-relaxed ${
                msg.startsWith('❌') ? 'text-red-600' :
                msg.startsWith('✓') || msg.startsWith('🎉') || msg.startsWith('📊') ? 'text-green-600' :
                msg.startsWith('⏳') ? 'text-blue-600' :
                msg.startsWith('🚀') || msg.startsWith('✅') ? 'text-start' :
                'text-track/60'
              }`}>{msg}</div>
            ))}
          </div>
        </div>
      )}

      {step === 'done' && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-track">
            {xlsxUrl ? 'XLSX 表格已生成' : '方案已完成'}
          </h2>
          <div className="space-y-3 rounded-2xl border border-line bg-white p-5">
            {logs.length > 0 && (
              <div className="rounded-xl bg-mist px-4 py-3 text-xs leading-relaxed text-track/60" style={{ maxHeight: 200, overflowY: 'auto' }}>
                {logs.map((msg, i) => (
                  <div key={i} className={`${
                    msg.startsWith('📊') || msg.startsWith('🎉') ? 'text-green-600 font-bold' : ''
                  }`}>{msg}</div>
                ))}
              </div>
            )}

            {xlsxUrl ? (
              <>
                <a href={xlsxUrl} target="_blank" rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-start px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-start/90"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  下载 XLSX 文件
                </a>
                <div className="flex items-center gap-2">
                  <input readOnly value={xlsxUrl}
                    className="flex-1 rounded-lg border border-line bg-mist px-3 py-2 text-xs text-track outline-none"
                    onClick={e => e.currentTarget.select()}
                  />
                  <button type="button"
                    onClick={() => navigator.clipboard.writeText(xlsxUrl)}
                    className="rounded-lg border border-line bg-white px-3 py-2 text-xs font-medium text-track hover:bg-mist"
                  >复制链接</button>
                </div>
              </>
            ) : (
              <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
                ⚠️ 方案已完成，但未生成 XLSX 表格文件（可能是 LLM 结构化输出出错，但方案内容不受影响）
              </div>
            )}

            <button type="button" onClick={backToForm}
              className="w-full rounded-xl border border-line bg-white px-4 py-2.5 text-sm font-medium text-track transition-colors hover:bg-mist"
            >重新生成</button>
          </div>
        </div>
      )}

      {error && step === 'form' && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}
    </div>
  )
}
