export interface BrandInput {
  brand_name: string | null
  category: string | null
  city: string | null
  budget: number | null
  period: number | null
}

export interface ChatRequest {
  message: string
}

export interface ChatResponse {
  reply: string
  brand_input: BrandInput
  is_complete: boolean
}

export interface ChatMessage {
  id: string
  role: 'user' | 'ai'
  content: string
  brandInput?: BrandInput
  intent?: 'generate_plan' | 'query_data' | 'chat' | 'clarify' | 'update_context' | 'generate_video' | 'text_to_video' | 'text_to_image'
  isComplete?: boolean
  isError?: boolean
  isLoading?: boolean
  retryable?: boolean
  canGeneratePlan?: boolean
  reasoning?: string
  missingFields?: string[]
  gate?: string | null
  confirmed?: boolean
  /** 图标生成导航 */
  imageUrls?: string[]
  videoPrompt?: string | null
  generationPrompt?: string | null
  /** 视频生成结果（内嵌播放器用） */
  videoResult?: {
    task_id: string
    video_url: string
    usage?: { resolution?: number; ratio?: string; output_video_duration?: number }
  }
  /** 图片生成结果（内嵌展示用） */
  imageResult?: {
    image_url: string
    prompt_used?: string
    width?: number
    height?: number
  }
}

export type FieldKey = keyof BrandInput
