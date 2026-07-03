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

  return response.json()
}
