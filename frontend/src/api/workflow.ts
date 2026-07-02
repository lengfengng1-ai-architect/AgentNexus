import axios, { isAxiosError } from 'axios'
import type { WorkflowRunRequest, WorkflowRunResponse } from '../types/workflow'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

function extractErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    if (error.response) {
      const detail = error.response.data?.detail
      if (detail?.code === 'llm_error') return 'AI 服务暂时不可用，请检查配置后重试'
      if (detail?.detail) return '服务器处理失败，请重试'
      return `请求失败（${error.response.status}）`
    }
    if (error.request) {
      return '无法连接到服务器，请确认后端已启动'
    }
  }
  if (error instanceof Error) return error.message
  return '发送失败，请重试'
}

export async function runChatPipeline(
  message: string,
  context?: Record<string, unknown>,
): Promise<WorkflowRunResponse> {
  const payload: WorkflowRunRequest = {
    input: { message, context },
  }
  try {
    const { data } = await api.post<WorkflowRunResponse>('/workflows/chat_pipeline/run', payload)
    return data
  } catch (error) {
    throw new Error(extractErrorMessage(error))
  }
}
