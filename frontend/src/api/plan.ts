import type { WorkflowControlAction } from '../types/plan'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'

export interface PlanRunStartResult {
  runId: string
  stream: ReadableStream<Uint8Array>
}

export async function startPlanRun(brandInput: Record<string, unknown>): Promise<PlanRunStartResult> {
  const response = await fetch(
    `${API_BASE_URL}/plan/run`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
      },
      body: JSON.stringify({ input: { brand_input: brandInput } }),
    },
  )

  if (!response.ok) {
    const text = await response.text().catch(() => '请求失败')
    throw new Error(text)
  }

  const runId = response.headers.get('X-Run-Id') || extractRunIdFromStream(response.body)
  return {
    runId: runId || 'unknown',
    stream: response.body || new ReadableStream(),
  }
}

export async function resumePlanRun(_runId: string, lastEventId: number): Promise<ReadableStream<Uint8Array>> {
  const response = await fetch(
    `${API_BASE_URL}/workflows/plan_generation_pipeline/run?stream=true`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        'Last-Event-ID': String(lastEventId),
      },
      body: JSON.stringify({ input: {} }),
    },
  )

  if (!response.ok) {
    const text = await response.text().catch(() => '重连失败')
    throw new Error(text)
  }

  return response.body || new ReadableStream()
}

export async function controlPlanRun(
  runId: string,
  action: WorkflowControlAction,
  nodeId?: string,
): Promise<{ status: string; failed_node: string | null; outputs: Record<string, unknown> }> {
  const response = await fetch(`${API_BASE_URL}/workflows/runs/${runId}/control`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action, node_id: nodeId ?? null }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '控制操作失败')
    throw new Error(text)
  }

  return response.json()
}

export async function getPlanRunStatus(
  runId: string,
): Promise<{
  run_id: string
  workflow_id: string
  status: string
  outputs: Record<string, unknown>
  failed_node: string | null
  error: string | null
}> {
  const response = await fetch(`${API_BASE_URL}/workflows/runs/${runId}/status`)

  if (!response.ok) {
    const text = await response.text().catch(() => '查询状态失败')
    throw new Error(text)
  }

  return response.json()
}

function extractRunIdFromStream(_body: ReadableStream<Uint8Array> | null): string | null {
  // The first SSE event carries run_id; callers should parse it from the stream.
  return null
}
