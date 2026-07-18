const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

export interface PlanRunStartResult {
  runId: string
  stream: ReadableStream<Uint8Array>
}

export async function startPlanRun(brandInput: Record<string, unknown>): Promise<PlanRunStartResult> {
  const response = await fetch(`${API_BASE_URL}/plan/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify({ brand_input: brandInput }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '请求失败')
    throw new Error(text)
  }

  const runId = response.headers.get('X-Run-Id') || 'unknown'
  return {
    runId,
    stream: response.body || new ReadableStream(),
  }
}

export interface ApprovePlanRunInput {
  edited_input?: Record<string, unknown>
}

export async function approvePlanRun(
  runId: string,
  input?: ApprovePlanRunInput,
): Promise<ReadableStream<Uint8Array>> {
  const response = await fetch(`${API_BASE_URL}/plan/runs/${runId}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(input ?? {}),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '审批通过失败')
    throw new Error(text)
  }

  return response.body || new ReadableStream()
}

export interface RejectPlanRunInput {
  reason: string
}

export async function rejectPlanRun(
  runId: string,
  input: RejectPlanRunInput,
): Promise<ReadableStream<Uint8Array>> {
  const response = await fetch(`${API_BASE_URL}/plan/runs/${runId}/reject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '驳回失败')
    throw new Error(text)
  }

  return response.body || new ReadableStream()
}

export async function rerunPlanRun(runId: string): Promise<ReadableStream<Uint8Array>> {
  const response = await fetch(`${API_BASE_URL}/plan/runs/${runId}/rerun`, {
    method: 'POST',
    headers: {
      Accept: 'text/event-stream',
    },
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '重新执行失败')
    throw new Error(text)
  }

  return response.body || new ReadableStream()
}

export async function cancelPlanRun(runId: string): Promise<{ run_id: string; status: string }> {
  const response = await fetch(`${API_BASE_URL}/plan/runs/${runId}/cancel`, {
    method: 'POST',
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '取消失败')
    throw new Error(text)
  }

  return response.json()
}

export interface PlanRunStatus {
  run_id: string
  status: 'running' | 'paused' | 'completed' | 'failed' | 'canceled'
  current_node: string | null
  outputs: Record<string, unknown>
  completed_nodes: string[]
  paused_snapshot: {
    node_id: string
    node_input: Record<string, unknown>
    upstream_outputs: Record<string, unknown>
  } | null
  error: string | null
}

export async function getPlanRunStatus(runId: string): Promise<PlanRunStatus> {
  const response = await fetch(`${API_BASE_URL}/plan/runs/${runId}/status`)

  if (!response.ok) {
    const text = await response.text().catch(() => '查询状态失败')
    throw new Error(text)
  }

  const body = await response.json()
  return body.data as PlanRunStatus
}

export interface PosterStatus {
  status: 'generating' | 'completed' | 'failed'
  image_url?: string
  error?: string
  size?: string
  width?: number
  height?: number
}

export async function regeneratePoster(runId: string, size: string, feedback = ''): Promise<PosterStatus> {
  const response = await fetch(`${API_BASE_URL}/plan/runs/${runId}/poster`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ size, feedback }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '海报生成失败')
    throw new Error(text)
  }

  const body = await response.json()
  return body.data as PosterStatus
}

export async function regeneratePromoVideo(runId: string, feedback = '', ratio = '16:9', resolution = '720P', duration = 5): Promise<Record<string, unknown>> {
  const response = await fetch(`${API_BASE_URL}/plan/runs/${runId}/promo-video`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ feedback, ratio, resolution, duration }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '视频生成失败')
    throw new Error(text)
  }

  const body = await response.json()
  return body.data as Record<string, unknown>
}

export interface MediaStatus {
  promo_video: Record<string, unknown> | null
  poster: Record<string, unknown> | null
}

export async function getPlanMediaStatus(runId: string): Promise<MediaStatus> {
  const response = await fetch(`${API_BASE_URL}/plan/runs/${runId}/media-status`)

  if (!response.ok) {
    const text = await response.text().catch(() => '查询媒体状态失败')
    throw new Error(text)
  }

  const body = await response.json()
  return body.data as MediaStatus
}

export interface OptimizeStrategyInput {
  brand_name: string
  category?: string
  product_matrix?: string
  target_audience?: string
  marketing_goal?: string
}

export async function optimizeStrategy(input: OptimizeStrategyInput): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/plan/strategy-optimize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '策略优化失败')
    throw new Error(text)
  }

  const body = await response.json()
  return body.data?.strategy ?? ''
}

export interface PlanRunRecord {
  run_id: string
  status: string
  created_at: string
  /** 后端 list_runs 返回的 brand_input（含 brand_name/category/product_matrix 等）；向后兼容，旧调用方可不读 */
  brand_input?: {
    brand_name?: string
    category?: string
    product_matrix?: string
  }
}

export async function listPlanRuns(limit: number = 5): Promise<PlanRunRecord[]> {
  const response = await fetch(`${API_BASE_URL}/plan/runs?limit=${limit}`)

  if (!response.ok) {
    const text = await response.text().catch(() => '查询批次列表失败')
    throw new Error(text)
  }

  const body = await response.json()
  return (body.data || []) as PlanRunRecord[]
}

export interface PlanSummary {
  strategy: { positioning: string; key_messages: string[] }
  kpis: { name: string; target: string; unit: string }[]
  allocations: { category: string; percentage: number; amount: number }[]
  execution: { label: string; description: string }[]
  actions: { title: string; description: string }[]
}

export async function getPlanSummary(runId: string): Promise<PlanSummary> {
  const response = await fetch(`${API_BASE_URL}/plan/summary`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ run_id: runId }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '获取方案摘要失败')
    throw new Error(text)
  }

  const body = await response.json()
  return body.data as PlanSummary
}

export interface ExportResult {
  download_url: string
  file_path: string
}

export async function exportPlanXlsx(runId: string): Promise<ExportResult> {
  const response = await fetch(`${API_BASE_URL}/plan/runs/${runId}/export-xlsx`, {
    method: 'POST',
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '导出 XLSX 失败')
    throw new Error(text)
  }

  const body = await response.json()
  return body.data as ExportResult
}

export async function exportPlanPdf(runId: string): Promise<ExportResult> {
  const response = await fetch(`${API_BASE_URL}/plan/runs/${runId}/export-pdf`, {
    method: 'POST',
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '导出 PDF 失败')
    throw new Error(text)
  }

  const body = await response.json()
  return body.data as ExportResult
}
