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
  intent?: 'generate_plan' | 'query_data' | 'chat' | 'clarify' | 'update_context' | 'generate_video' | 'text_to_video' | 'text_to_image' | 'market_research' | 'budget_assessment' | 'activity_planning' | 'alliance_planning'
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
  /** 上传图片的 VL 内容描述，与 imageUrls 索引对齐（意图识别/AI 优化用） */
  imageCaptions?: string[]
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
  /** 市场调研：字段齐全时可开始分析 */
  canStartMarketResearch?: boolean
  /** 预算评估：字段齐全（category/budget/period/city）时可开始评估 */
  canStartBudgetAssessment?: boolean
  /** 预算评估完成后的结构化结果（allocations/kpis/timeline/suggestion） */
  budgetAssessmentResult?: Record<string, unknown>
  /** 预算评估结果 ID（ba-<8位hex>），详情页按此 ID 从后端拉取，刷新后仍可用 */
  budgetAssessmentId?: string
  /** 活动规划：sport_type+city 齐全时可开始规划 */
  canStartActivityPlanning?: boolean
  /** 活动规划完成后的结构化结果（candidates/events/venues/suggestion） */
  activityPlanningResult?: Record<string, unknown>
  /** 活动规划结果 ID（ap-<8位hex>），详情页按此 ID 拉取，刷新后仍可用 */
  activityPlanningId?: string
  /** 盟域规划：category+city 齐全时可开始规划 */
  canStartAlliancePlanning?: boolean
  /** 盟域规划完成后的结构化结果 */
  alliancePlanningResult?: Record<string, unknown>
  /** 盟域规划结果 ID（al-<8位hex>），详情页按此 ID 拉取 */
  alliancePlanningId?: string
  /** 活动规划的运动类型（多轮间持续） */
  sportType?: string
  /** 市场调研目标名称（品牌名/赛道名） */
  marketName?: string
  /** 市场分析搜索来源 URL 列表（流式进行中实时追加） */
  marketResearchSources?: { url: string; title: string }[]
  /** 市场分析进度日志（流式进行中实时追加） */
  marketResearchProgressLogs?: string[]
  /** 市场分析完成后的完整结构化结果 */
  marketResearchResult?: Record<string, unknown>
  /** 调研结果 ID（mr-<8位hex>），结果页按此 ID 从后端拉取完整报告，刷新后仍可用 */
  researchId?: string
}

export type FieldKey = keyof BrandInput
