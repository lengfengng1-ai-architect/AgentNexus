export interface MarketTrend {
  title: string
  description: string
}

export interface CompetitiveItem {
  brand_name: string
  product_highlights: string
  pricing: string
  source: string
}

export interface CompetitiveLandscape {
  competitors: CompetitiveItem[]
}

export interface ConsumerInsight {
  shift: string
  changes: string[]
  source: string
}

export interface MarketAnalysisResult {
  industry_summary: string
  market_trends: MarketTrend[]
  consumer_insights: ConsumerInsight[]
  competitive_landscape: CompetitiveLandscape
}
