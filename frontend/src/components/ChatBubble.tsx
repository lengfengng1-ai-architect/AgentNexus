import { useEffect, useRef, useState } from 'react'
import { marked } from 'marked'
import type { ChatMessage } from '../types/chat'
import { InlineVideoCard } from './InlineVideoCard'
import { InlineImageCard } from './InlineImageCard'
import { MarketResearchProgressCard } from './MarketResearchProgressCard'
import { ResearchReportEntryCard } from './ResearchReportEntryCard'
import { BudgetAssessmentEntryCard } from './BudgetAssessmentEntryCard'

function isSafeImageUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return ['http:', 'https:', 'oss:'].includes(parsed.protocol)
  } catch {
    // ponytail: 相对路径（如 /uploads/xxx）也允许；升级路径：统一返回绝对 URL
    return url.startsWith('/')
  }
}

function ChatBubbleImage({ url }: { url: string }) {
  if (!isSafeImageUrl(url)) {
    return (
      <span className="max-w-[200px] rounded-lg border border-current/20 px-2 py-1 text-xs opacity-70">
        图片链接不安全
      </span>
    )
  }
  return (
    <img
      src={url}
      alt="上传的图片"
      className="max-w-[200px] rounded-lg object-cover"
      loading="lazy"
    />
  )
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 py-2" aria-label="正在输入">
      <span className="h-2 w-2 animate-bounce rounded-full bg-track/50 [animation-delay:-0.3s]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-track/50 [animation-delay:-0.15s]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-track/50" />
    </div>
  )
}

function TypingReasoning({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState('')
  const indexRef = useRef(0)

  useEffect(() => {
    if (indexRef.current >= text.length) return
    const id = setInterval(() => {
      if (indexRef.current < text.length) {
        indexRef.current += 1
        setDisplayed(text.slice(0, indexRef.current))
      } else {
        clearInterval(id)
      }
    }, 12)
    return () => clearInterval(id)
  }, [text])

  return (
    <>
      {displayed}
      <span
        className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-current align-middle"
        aria-hidden="true"
      />
    </>
  )
}

// 移动端流式思考小卡：固定高度 + 内部滚动跟随，仅存在于流式期间（不持久化）
function ReasoningBox({ text }: { text: string }) {
  const contentRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = contentRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [text])

  return (
    <div className="rb-box">
      <div className="rb-title">💭 思考中…</div>
      <div ref={contentRef} className="rb-content">
        <TypingReasoning text={text} />
        <span className="rb-cursor" aria-hidden="true" />
      </div>
    </div>
  )
}

interface ChatBubbleProps {
  message: ChatMessage
  isMarketResearchActive?: boolean
  activeSearches?: { search_id: string; query: string }[]
  variant?: 'mobile'
  onRetry?: (messageId: string) => void
  onGeneratePlan?: (messageId: string) => void
  onOpenResearchReport?: (messageId: string) => void
  onOpenBudgetAssessment?: (messageId: string) => void
  onVideoResult?: (messageId: string, result: NonNullable<ChatMessage['videoResult']>) => void
  onImageResult?: (messageId: string, result: NonNullable<ChatMessage['imageResult']>) => void
}

export function ChatBubble({ message, isMarketResearchActive = false, activeSearches, variant, onRetry, onGeneratePlan, onOpenResearchReport, onOpenBudgetAssessment, onVideoResult, onImageResult }: ChatBubbleProps) {
  const isUser = message.role === 'user'
  const isStreaming = message.id.startsWith('stream-')
  const isVideoIntent = message.intent === 'generate_video' || message.intent === 'text_to_video'
  const videoPrompt = message.intent === 'generate_video' ? message.videoPrompt : message.generationPrompt
  const isImageIntent = message.intent === 'text_to_image'
  const isMarketResearch = !isUser && message.intent === 'market_research'
  const isBudgetAssessment = !isUser && message.intent === 'budget_assessment'
  // ponytail: isMarketResearchActive 由父级传入但当前组件未使用，保留以保持 props 兼容
  void isMarketResearchActive

  return (
    <div className={['flex w-full', isUser ? 'justify-end' : 'justify-start'].join(' ')}>
      <div
        className={[
          'max-w-[85%] rounded-2xl px-4 py-3 sm:max-w-[75%]',
          isUser
            ? 'bg-track text-white'
            : 'bg-white shadow-sm',
          message.isError ? 'ring-2 ring-start/50' : '',
        ].join(' ')}
      >
        {/* 预算评估：完成态（有 budgetAssessmentId）→ 摘要卡片 + 详情页入口 */}
        {isBudgetAssessment && message.budgetAssessmentResult && variant === 'mobile' && message.budgetAssessmentId && onOpenBudgetAssessment ? (
          <BudgetAssessmentEntryCard
            result={message.budgetAssessmentResult}
            onOpen={() => onOpenBudgetAssessment(message.id)}
          />
        ) : isMarketResearch && message.marketResearchResult ? (
          variant === 'mobile' && message.researchId && onOpenResearchReport ? (
            /* 移动端完成态（有 researchId）：摘要卡片 + 结果页入口 */
            <ResearchReportEntryCard
              result={message.marketResearchResult}
              onOpen={() => onOpenResearchReport(message.id)}
            />
          ) : (
            /* 完成态：渲染 full_report markdown（PC 端统一 / 移动端历史消息无 researchId 兼容） */
            <div
              className={variant === 'mobile' ? 'market-report-mobile' : 'market-report text-sm leading-relaxed sm:text-base'}
              style={{ whiteSpace: 'normal' }}
              dangerouslySetInnerHTML={{
                __html: marked.parse(
                  (message.marketResearchResult as Record<string, unknown>)?.full_report as string ||
                    message.content ||
                    '',
                ),
              }}
            />
          )
        ) : isMarketResearch && (message.marketResearchSources?.length || message.marketResearchProgressLogs?.length) ? (
          /* 进度态：搜索来源 + 进度日志双窗口（可滚动） */
          <MarketResearchProgressCard
            sources={message.marketResearchSources || []}
            logs={message.marketResearchProgressLogs || []}
            activeSearches={activeSearches}
            variant={variant}
          />
        ) : isMarketResearch && message.content ? (
          /* 回退兼容：纯文本报告（防止异常断开时无 UI） */
          <div
            className={variant === 'mobile' ? 'market-report-mobile' : 'market-report text-sm leading-relaxed sm:text-base'}
            style={{ whiteSpace: 'normal' }}
            dangerouslySetInnerHTML={{ __html: marked.parse(message.content) }}
          />
        ) : isStreaming && variant === 'mobile' ? (
          // 移动端流式：reasoning 渲染为独立固定高度小卡，不混在正文容器
          message.reasoning ? (
            <ReasoningBox text={message.reasoning} />
          ) : (
            <div className="whitespace-pre-wrap text-sm leading-relaxed sm:text-base">
              <TypingIndicator />
            </div>
          )
        ) : (
          <div className="whitespace-pre-wrap text-sm leading-relaxed sm:text-base">
            {isStreaming ? (
              message.reasoning ? (
                <TypingReasoning text={message.reasoning} />
              ) : (
                <TypingIndicator />
              )
            ) : (
              message.content
            )}
          </div>
        )}
        {/* InlineVideoCard for video intents */}
        {!isUser && isVideoIntent && !isStreaming && (
          <InlineVideoCard
            variant={variant}
            prompt={videoPrompt}
            imageUrls={message.imageUrls ?? []}
            imageCaption={message.imageCaptions?.[0] || null}
            messageId={message.id}
            existingResult={message.videoResult}
            onVideoResult={onVideoResult}
          />
        )}
        {/* InlineImageCard for image intents */}
        {!isUser && isImageIntent && !isStreaming && (
          <InlineImageCard
            variant={variant}
            prompt={message.generationPrompt ?? ''}
            imageUrl={message.imageUrls?.[0]}
            imageCaption={message.imageCaptions?.[0] || null}
            messageId={message.id}
            existingResult={message.imageResult}
            onImageResult={onImageResult}
          />
        )}
        {/* User uploaded image thumbnails */}
        {isUser && message.imageUrls && message.imageUrls.length > 0 && (
          <div className="mt-2 flex flex-col gap-2">
            {message.imageUrls.map((url, idx) => (
              <ChatBubbleImage key={`${url}-${idx}`} url={url} />
            ))}
          </div>
        )}
        {!isUser && message.canGeneratePlan && onGeneratePlan && (
          <button
            type="button"
            onClick={() => onGeneratePlan(message.id)}
            className={variant === 'mobile'
              ? 'mt-3 w-full rounded-[8px] bg-[#1677ff] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1677ff]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1677ff]'
              : 'mt-3 rounded-lg bg-start px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-start/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-start'}
          >
            生成方案
          </button>
        )}
        {message.isError && onRetry && (
          <button
            type="button"
            onClick={() => onRetry(message.id)}
            className="mt-2 text-xs font-medium text-start hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-start"
          >
            重试
          </button>
        )}
      </div>
    </div>
  )
}

// ponytail: 市场分析报告的 markdown 渲染样式。如果后续需要抽离为全局组件，可移入独立 CSS。
const _reportStyle = document.createElement('style')
_reportStyle.textContent = `
.market-report h1 { font-size: 1.25rem; font-weight: 700; color: #0f172a; margin: 1.25em 0 0.75em; }
.market-report h2 { font-size: 1.1rem; font-weight: 700; color: #0f172a; margin: 1.25em 0 0.75em; }
.market-report h3 { font-size: 1rem; font-weight: 600; color: #1e293b; margin: 1em 0 0.5em; }
.market-report p { margin-bottom: 0.75em; line-height: 1.8; word-break: break-word; }
.market-report strong { font-weight: 600; }
.market-report em { font-style: italic; }
.market-report ul, .market-report ol { margin: 0.5em 0; padding-left: 1.5em; }
.market-report li { margin-bottom: 0.3em; line-height: 1.7; }
.market-report table { width: 100%; border-collapse: collapse; margin: 1em 0; font-size: 0.9em; }
.market-report th, .market-report td { border: 1px solid #d1d5db; padding: 6px 10px; text-align: left; }
.market-report th { background: #f8fafc; font-weight: 600; }
.market-report a { overflow-wrap: break-word; word-break: break-all; color: #1677ff; display: block; margin: 0.3em 0; }
.market-report blockquote { border-left: 3px solid #3b82f6; padding: 8px 16px; margin: 1em 0; background: #f8fafc; color: #475569; }
.market-report code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 0.875em; }
.market-report pre { background: #1e293b; color: #e2e8f0; padding: 12px; border-radius: 6px; overflow-x: auto; margin: 1em 0; }
.market-report pre code { background: transparent; padding: 0; color: inherit; }
.market-report hr { margin: 1.5em 0; border: none; border-top: 1px solid #e2e8f0; }
.market-report-mobile { font-size: 14px; line-height: 1.6; color: #1e293b; word-break: break-word; overflow-wrap: break-word; }
.market-report-mobile h1 { font-size: 17px; font-weight: 700; margin: 1em 0 0.5em; }
.market-report-mobile h2 { font-size: 15px; font-weight: 600; margin: 1em 0 0.5em; }
.market-report-mobile h3 { font-size: 14px; font-weight: 600; margin: 0.75em 0 0.4em; }
.market-report-mobile p { margin-bottom: 0.6em; line-height: 1.6; word-break: break-word; }
.market-report-mobile a { color: #1677ff; overflow-wrap: break-word; word-break: break-all; }
.market-report-mobile table { font-size: 13px; }
.market-report-mobile code { font-size: 13px; }
.market-report-mobile blockquote { font-size: 13px; }
`
_reportStyle.id = 'market-report-style'
if (!document.getElementById('market-report-style')) {
  document.head.appendChild(_reportStyle)
}
