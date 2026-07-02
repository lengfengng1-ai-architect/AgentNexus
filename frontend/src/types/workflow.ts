import type { BrandInput } from './chat'

export interface WorkflowRunRequest {
  input: {
    message: string
    context?: Record<string, unknown>
  }
}

export interface IntentRecognitionResult {
  intent: 'generate_plan' | 'query_data' | 'chat' | 'clarify' | 'update_context'
  confidence: number
  reply: string
  brand_input: BrandInput
  missing_fields?: string[] | null
  updated_fields?: Record<string, unknown> | null
}

export interface WorkflowRunResponse {
  workflow_id: string
  status: 'completed' | 'failed'
  outputs: {
    intent: IntentRecognitionResult
    reply_builder?: {
      reply: string
    }
    [key: string]: unknown
  }
}
