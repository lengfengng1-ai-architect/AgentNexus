// OpenSpec: openspec/changes/mobile-chat-ui-redesign
// 推荐输入项与 + 号面板共享类型
export interface SuggestedPrompt {
  id: string
  icon: string
  label: string
  action: 'navigate-brief' | 'prefill-brand-template' | 'prefill-market-analysis' | 'send-text' | 'virtual-image' | 'virtual-video'
  payload?: string
}
