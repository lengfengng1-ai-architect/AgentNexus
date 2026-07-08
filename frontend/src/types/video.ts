export interface VideoParams {
  prompt?: string | null
  image_urls?: string[]
  resolution?: string
  ratio?: string
  duration?: number
  seed?: number | null
}

export interface VideoResult {
  task_id: string
  video_url: string
  orig_prompt?: string
  usage?: {
    duration?: number
    output_video_duration?: number
    resolution?: number
    ratio?: string
  }
}
