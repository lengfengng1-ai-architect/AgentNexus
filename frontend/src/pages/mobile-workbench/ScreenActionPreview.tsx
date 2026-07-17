// ScreenActionPreview — 行动建议预览屏
// 全屏覆盖层，展示行动建议卡片列表 + 媒体素材 + 底部反馈输入
// 对应后端 action_recommendations 节点输出

import { useCallback, useEffect, useState } from 'react'
import type { MobileScreen } from './ScreenChat'

interface ActionItem {
  title: string
  description: string
  start_date?: string
  end_date?: string
  priority?: string
  category?: string
}

interface ScreenActionPreviewProps {
  onNavigate: (s: MobileScreen) => void
  actions: ActionItem[]
  /** 品牌名称（用于展示） */
  brandName?: string
  /** 品类 */
  category?: string
  /** 总预算 */
  totalBudget?: number
  /** 执行周期（月） */
  periodMonths?: number
  /** 海报状态 */
  posterStatus?: string
  /** 视频状态 */
  videoStatus?: string
  /** 海报图片URL */
  posterUrl?: string
  /** 宣传视频URL */
  videoUrl?: string
  onApprove: () => void
  onReject: (reason: string) => void
  /** 返回按钮回调（父组件处理状态） */
  onBack?: () => void
  /** 是否正在重新生成 */
  loading?: boolean
}

const PRIORITY_LABELS: Record<string, { label: string; cls: string }> = {
  '高': { label: '高优先级', cls: 'ar-priority-high' },
  '中': { label: '中优先级', cls: 'ar-priority-mid' },
  '普通': { label: '普通', cls: 'ar-priority-low' },
}

function priorityLabel(p: string): { label: string; cls: string } {
  return PRIORITY_LABELS[p] || { label: p, cls: 'ar-priority-mid' }
}

export function ScreenActionPreview({
  onNavigate,
  actions,
  brandName = '',
  category: brandCategory = '',
  totalBudget = 0,
  periodMonths = 0,
  posterStatus,
  videoStatus,
  posterUrl,
  videoUrl,
  onApprove,
  onReject,
  onBack,
  loading = false,
}: ScreenActionPreviewProps) {
  const [feedback, setFeedback] = useState('')
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  // 重新生成完成后清除输入框
  useEffect(() => {
    if (!loading) setFeedback('')
  }, [loading])

  const handleSendFeedback = useCallback(() => {
    if (!feedback.trim()) return
    onReject(feedback.trim())
  }, [feedback, onReject])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', position: 'relative' }}>
      <style>{`
        .ar-item { padding: 10px 0; border-bottom: 1px solid var(--line); }
        .ar-item:last-child { border-bottom: none; }
        .ar-num { width: 20px; height: 20px; border-radius: 50%; background: var(--accent); color: #fff; font-size: 10px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px; }
        .ar-priority-high { background: #fef2f2; color: #dc2626; }
        .ar-priority-mid { background: #fffbeb; color: #d97706; }
        .ar-priority-low { background: #f0fdf4; color: #16a34a; }
      `}</style>

      {/* 重新生成 loading 覆盖层 */}
      {loading && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 99,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(255,255,255,0.85)', gap: 12,
        }}>
          <div style={{
            width: 36, height: 36, border: '3px solid var(--border)',
            borderTopColor: 'var(--accent)', borderRadius: '50%',
            animation: 'ar-spin 0.8s linear infinite',
          }} />
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--fg-soft)' }}>正在根据反馈重新生成…</div>
          <style>{`@keyframes ar-spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {/* Top bar */}
      <div style={{
        display: 'flex', alignItems: 'center', padding: '8px 14px',
        borderBottom: '1px solid var(--line)', background: 'var(--bg)', flexShrink: 0,
      }}>
        <button
          type="button"
          onClick={() => onBack ? onBack() : onNavigate('generate')}
          style={{
            width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: 'none', background: 'none', cursor: 'pointer', borderRadius: 8,
            color: 'var(--fg)', fontSize: 18, fontFamily: 'var(--ff)',
          }}
        >‹</button>
        <span style={{ flex: 1, textAlign: 'center', fontSize: 14, fontWeight: 600 }}>行动预览</span>
        <div style={{ width: 32 }} />
      </div>

      {/* Scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '14px 14px 0' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingBottom: 16 }}>

          {/* 品牌概览摘要行（简洁版） */}
          {(brandName || brandCategory || totalBudget > 0) && (
            <div style={{
              display: 'flex', gap: 6, padding: '8px 12px',
              background: 'var(--accent-softer)', borderRadius: 'var(--r-md)',
              border: '1px solid var(--accent-border)',
            }}>
              {brandName && <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)' }}>{brandName}</span>}
              {brandCategory && <span style={{ fontSize: 11, color: 'var(--muted)' }}>·</span>}
              {brandCategory && <span style={{ fontSize: 11, color: 'var(--fg-soft)' }}>{brandCategory}</span>}
              {totalBudget > 0 && <span style={{ fontSize: 11, color: 'var(--muted)' }}>·</span>}
              {totalBudget > 0 && <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg)' }}>{totalBudget}万元</span>}
              {periodMonths > 0 && <span style={{ fontSize: 11, color: 'var(--muted)' }}>/</span>}
              {periodMonths > 0 && <span style={{ fontSize: 11, color: 'var(--fg-soft)' }}>{periodMonths}个月</span>}
            </div>
          )}

          {/* 行动建议卡片列表 */}
          <div style={{
            background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: 'var(--r-md)', overflow: 'hidden',
          }}>
            <div style={{
              padding: '11px 14px', fontSize: 12, fontWeight: 600,
              borderBottom: '1px solid var(--line)', background: 'var(--surface)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              📌 行动建议
              <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--muted)' }}>（{actions.length}项）</span>
            </div>
            <div style={{ padding: '6px 14px' }}>
              {actions.map((action, i) => {
                const pl = priorityLabel(action.priority || '中')
                return (
                  <div key={i} className="ar-item">
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 4 }}>
                      <div className="ar-num">{i + 1}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--fg)', lineHeight: 1.4, flex: 1 }}>
                        {action.title}
                      </div>
                    </div>
                    {/* 日期 + 优先级 + 分类 */}
                    <div style={{ display: 'flex', gap: 6, marginLeft: 28, marginBottom: 4, flexWrap: 'wrap' }}>
                      {(action.start_date || action.end_date) && (
                        <span style={{
                          padding: '1px 6px', borderRadius: 3, fontSize: 9, fontWeight: 500,
                          background: 'var(--accent-softer)', color: 'var(--accent)',
                        }}>
                          📅 {action.start_date || ''}{action.start_date && action.end_date ? ' - ' : ''}{action.end_date || ''}
                        </span>
                      )}
                      <span style={{ padding: '1px 6px', borderRadius: 3, fontSize: 9, fontWeight: 500 }} className={pl.cls}>{pl.label}</span>
                      {action.category && (
                        <span style={{
                          padding: '1px 6px', borderRadius: 3, fontSize: 9, fontWeight: 500,
                          background: 'var(--surface)', color: 'var(--muted)',
                        }}>{action.category}</span>
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--fg-soft)', lineHeight: 1.5, marginLeft: 28 }}>
                      {action.description}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 媒体素材 */}
          <div style={{
            background: 'var(--bg)', border: '1px solid var(--border)',
            borderRadius: 'var(--r-md)', overflow: 'hidden',
          }}>
            <div style={{
              padding: '11px 14px', fontSize: 12, fontWeight: 600,
              borderBottom: '1px solid var(--line)', background: 'var(--surface)',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>🎬 媒体素材</div>
            <div style={{ padding: '12px 14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div style={{
                  padding: 0, borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', textAlign: 'center', overflow: 'hidden',
                  display: 'flex', flexDirection: 'column',
                }}>
                  <div style={{ minHeight: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
                    {(!posterStatus || posterStatus === 'generating') ? (
                      <div style={{
                        width: 20, height: 20, border: '2px solid var(--border)',
                        borderTopColor: 'var(--accent)', borderRadius: '50%',
                        animation: 'ar-spin 0.8s linear infinite',
                        marginBlock: 40,
                      }} />
                    ) : posterUrl ? (
                      <img src={posterUrl} alt="营销海报" style={{ width: '100%', display: 'block', cursor: 'pointer' }} onClick={() => setLightboxUrl(posterUrl)} />
                    ) : <span style={{ fontSize: 20, marginBlock: 40 }}>🖼️</span>}
                  </div>
                  <div style={{ padding: '8px 0', fontSize: 10, fontWeight: 500, color: 'var(--fg-soft)' }}>营销海报</div>
                </div>
                <div style={{
                  padding: 0, borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', textAlign: 'center', overflow: 'hidden',
                  display: 'flex', flexDirection: 'column',
                }}>
                  <div style={{ minHeight: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
                    {(!videoStatus || videoStatus === 'generating') ? (
                      <div style={{
                        width: 20, height: 20, border: '2px solid var(--border)',
                        borderTopColor: 'var(--accent)', borderRadius: '50%',
                        animation: 'ar-spin 0.8s linear infinite',
                        marginBlock: 40,
                      }} />
                    ) : videoUrl ? (
                      <video src={videoUrl} controls style={{ width: '100%', display: 'block' }}>您的浏览器不支持视频播放</video>
                    ) : <span style={{ fontSize: 20, marginBlock: 40 }}>🎥</span>}
                  </div>
                  <div style={{ padding: '8px 0', fontSize: 10, fontWeight: 500, color: 'var(--fg-soft)' }}>宣传视频</div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ height: 8 }} />
        </div>
      </div>

      {/* 批准/驳回操作栏 */}
      <div style={{
        borderTop: '1px solid var(--line)', background: 'var(--bg)',
        padding: '10px 14px 10px', display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0,
      }}>
        <input
          type="text"
          placeholder="输入修改意见后发送，重新生成行动建议…"
          value={feedback}
          disabled={loading}
          onChange={e => setFeedback(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSendFeedback() }}
          style={{
            flex: 1, height: 36, border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
            padding: '0 10px', fontSize: 12, fontFamily: 'var(--ff)', outline: 'none',
            background: loading ? 'var(--surface)' : 'var(--surface)', color: 'var(--fg)',
            opacity: loading ? 0.5 : 1,
          }}
        />
        <button
          type="button"
          disabled={loading || !feedback.trim()}
          onClick={handleSendFeedback}
          style={{
            width: 36, height: 36, border: 'none', borderRadius: 'var(--r-sm)',
            background: loading || !feedback.trim() ? 'var(--border)' : 'var(--accent)',
            color: '#fff', fontSize: 16,
            cursor: loading || !feedback.trim() ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            fontFamily: 'var(--ff)',
          }}
        >↵</button>
      </div>

      {/* 海报大图预览 lightbox */}
      {lightboxUrl && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 99999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(15, 23, 42, 0.85)', padding: 20,
          }}
          onClick={() => setLightboxUrl(null)}
        >
          <div
            style={{ position: 'relative', maxWidth: '90vw', maxHeight: '85vh' }}
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setLightboxUrl(null)}
              style={{
                position: 'absolute', top: -36, right: 0,
                width: 32, height: 32, border: 'none', borderRadius: '50%',
                background: 'rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, fontFamily: 'var(--ff)',
              }}
            >
              ✕
            </button>
            <img
              src={lightboxUrl}
              alt="海报大图预览"
              style={{ maxWidth: '100%', maxHeight: '85vh', borderRadius: 8, objectFit: 'contain', boxShadow: '0 8px 40px rgba(0,0,0,0.3)' }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
