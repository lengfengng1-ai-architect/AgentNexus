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
  isComplete?: boolean
  isError?: boolean
  isLoading?: boolean
  retryable?: boolean
}

export type FieldKey = keyof BrandInput
