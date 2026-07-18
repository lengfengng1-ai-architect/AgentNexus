// OpenSpec: openspec/changes/mobile-plan-draft · in_scope id: plan-generation
// 移动端方案草稿 Tab：列表视图（底层）+ 详情视图（从右滑入覆盖列表）。
// 数据全部直读后端持久化结果，零 LLM 调用：
//   列表：GET /plan/runs（过滤 completed）
//   详情：GET /plan/runs/{run_id}/status（直读 checkpoint outputs，不调 /plan/summary）
//   下载：exportPlanPdf/Xlsx（复用导出 API）
import { useEffect, useRef, useState } from 'react'
import { listPlanRuns, getPlanRunStatus, exportPlanPdf, exportPlanXlsx } from '../../api/plan'
import type { PlanRunRecord } from '../../api/plan'

type RestoreTarget = 'preview' | 'actions'

interface ScreenDraftListProps {
  /** 恢复草稿运行状态并跳转目标屏（preview/actions） */
  onRestorePlan: (runId: string, target: RestoreTarget) => void
}

// ponytail: 手写相对时间，不引入 dayjs/date-fns。
// 天花板：无时区/国际化；升级路径：按需替换为 Intl.RelativeTimeFormat。
export function relativeTime(iso: string): string {
  const ts = new Date(iso).getTime()
  if (!ts) return ''
  const diff = Date.now() - ts
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min}分钟前`
  const hour = Math.floor(min / 60)
  if (hour < 24) return `${hour}小时前`
  const day = Math.floor(hour / 24)
  if (day === 1) return '昨天'
  if (day < 7) return `${day}天前`
  const d = new Date(ts)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

// 执行规划字段 → 标签映射
const EXEC_LABELS: Record<string, string> = {
  leagues_plan: '盟域规划',
  events_plan: '赛事活动',
  influencer_plan: '达人合作',
  content_plan: '内容规划',
  store_plan: '门店规划',
}

export function ScreenDraftList({ onRestorePlan }: ScreenDraftListProps) {
  // 列表视图状态
  const [drafts, setDrafts] = useState<PlanRunRecord[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState(false)

  // 视图切换：detail 滑入覆盖 list；返回时滑出露出 list
  const [view, setView] = useState<'list' | 'detail'>('list')
  const [isDetailAnimatingOut, setIsDetailAnimatingOut] = useState(false)
  const [selectedDraft, setSelectedDraft] = useState<PlanRunRecord | null>(null)

  // 详情 outputs（直读 checkpoint，非 LLM 摘要）
  const [outputs, setOutputs] = useState<Record<string, unknown> | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailError, setDetailError] = useState(false)

  // 详情顶栏3点导出菜单
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [exporting, setExporting] = useState<'pdf' | 'xlsx' | null>(null)
  const exportRef = useRef<HTMLDivElement>(null)

  // 列表数据加载
  useEffect(() => {
    let cancelled = false
    setListLoading(true)
    listPlanRuns(20)
      .then(records => {
        if (cancelled) return
        setDrafts(records.filter(r => r.status === 'completed'))
        setListLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setListError(true)
        setListLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  // 点击草稿 → 进入详情视图并直读 outputs
  const handleSelectDraft = (draft: PlanRunRecord) => {
    setSelectedDraft(draft)
    setView('detail')
    setOutputs(null)
    setDetailError(false)
    setDetailLoading(true)
    getPlanRunStatus(draft.run_id)
      .then(s => {
        setOutputs(s.outputs as Record<string, unknown>)
        setDetailLoading(false)
      })
      .catch(() => { setDetailError(true); setDetailLoading(false) })
  }

  // 详情返回列表：触发滑出动画 → 300ms 后切回 list
  const handleDetailBack = () => {
    setIsDetailAnimatingOut(true)
    setShowExportMenu(false)
    setTimeout(() => {
      setIsDetailAnimatingOut(false)
      setView('list')
      setSelectedDraft(null)
      setOutputs(null)
      setDetailError(false)
    }, 300)
  }

  // 点外部关闭详情导出菜单
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setShowExportMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // 详情导出（使用选中草稿的 run_id）
  const handleExport = async (fmt: 'pdf' | 'xlsx') => {
    if (!selectedDraft) return
    setExporting(fmt)
    setShowExportMenu(false)
    try {
      const result = fmt === 'pdf'
        ? await exportPlanPdf(selectedDraft.run_id)
        : await exportPlanXlsx(selectedDraft.run_id)
      const apiOrigin = typeof import.meta.env.VITE_API_BASE_URL === 'string'
        ? new URL(import.meta.env.VITE_API_BASE_URL).origin
        : 'http://localhost:8000'
      const a = document.createElement('a')
      a.href = new URL(result.download_url, apiOrigin).toString()
      a.download = ''
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (err) {
      alert(`导出 ${fmt.toUpperCase()} 失败: ${err instanceof Error ? err.message : '未知错误'}`)
    } finally {
      setExporting(null)
    }
  }

  const showDetail = view === 'detail' || isDetailAnimatingOut
  const detailBrand = selectedDraft?.brand_input?.brand_name || '方案草稿'
  const detailProduct = selectedDraft?.brand_input?.product_matrix?.split(/[（(]/)[0] || selectedDraft?.brand_input?.product_matrix || ''

  // 直读 outputs 映射为卡片数据（无 LLM）
  const strategy = (outputs?.strategy_generation || {}) as { positioning?: string; key_messages?: string[] }
  const budget = (outputs?.budget_kpi || {}) as {
    kpis?: Record<string, string>
    allocations?: { category: string; percentage: number; amount: number }[]
  }
  const actions = ((outputs?.action_recommendations || {}) as { actions?: { title: string; description?: string }[] }).actions
  const execution = (outputs?.execution_planning || {}) as Record<string, string>
  const execItems = Object.entries(EXEC_LABELS)
    .map(([key, label]) => ({ label, description: execution[key] || '' }))
    .filter(it => it.description)
  const kpiItems = budget.kpis ? Object.entries(budget.kpis).map(([name, target]) => ({ name, target })) : []

  return (
    <div className="mrd-screen">
      {/* ── 列表视图（底层，始终挂载保持滚动位置） ── */}
      <div className="mrd-topbar">
        <span className="mrd-topbar-spacer" />
        <div className="mrd-topbar-text">
          <div className="mrd-topbar-title">方案草稿</div>
          <div className="mrd-topbar-sub">已完成的历史方案</div>
        </div>
        <span className="mrd-topbar-spacer" />
      </div>
      <div className="mrd-body">
        {listLoading && (
          <div className="mrd-skeleton-wrap" aria-label="加载中">
            <div className="mrd-skeleton" style={{ height: 72 }} />
            <div className="mrd-skeleton" style={{ height: 72 }} />
            <div className="mrd-skeleton" style={{ height: 72 }} />
          </div>
        )}
        {listError && (
          <div className="mrd-empty">
            <span className="mrd-empty-icon">⚠</span>
            <p className="mrd-empty-text">草稿列表加载失败，请稍后重试</p>
          </div>
        )}
        {!listLoading && !listError && drafts.length === 0 && (
          <div className="mrd-empty">
            <span className="mrd-empty-icon">📝</span>
            <p className="mrd-empty-text">暂无已完成的方案草稿</p>
            <p className="mrd-empty-hint">完成方案生成后会自动出现在这里</p>
          </div>
        )}
        {!listLoading && !listError && drafts.length > 0 && (
          <div className="mrd-list">
            {drafts.map(d => {
              const brand = d.brand_input?.brand_name || '未命名方案'
              const product = d.brand_input?.product_matrix?.split(/[（(]/)[0] || d.brand_input?.product_matrix || ''
              const t = relativeTime(d.created_at)
              return (
                <button
                  key={d.run_id}
                  type="button"
                  className="mrd-item"
                  onClick={() => handleSelectDraft(d)}
                >
                  <div className="mrd-item-main">
                    <div className="mrd-item-brand">{brand}</div>
                    {product && <div className="mrd-item-product">{product}</div>}
                  </div>
                  {t && <div className="mrd-item-time">{t}</div>}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── 详情视图（滑入覆盖列表） ── */}
      {showDetail && selectedDraft && (
        <div className={isDetailAnimatingOut ? 'mrd-detail mrd-slide-out' : 'mrd-detail mrd-slide-in'}>
          <div className="mrd-topbar">
            <button type="button" className="mrd-back" onClick={handleDetailBack} aria-label="返回列表">‹</button>
            <div className="mrd-topbar-text">
              <div className="mrd-topbar-title">{detailBrand}</div>
              {detailProduct && <div className="mrd-topbar-sub">{detailProduct}</div>}
            </div>
            <div ref={exportRef} className="mrd-more-wrap">
              <span
                className="mrd-more"
                onClick={() => setShowExportMenu(v => !v)}
                role="button"
                tabIndex={0}
                aria-label="导出"
              >⋯</span>
              {showExportMenu && (
                <div className="mrd-export-menu">
                  <button
                    type="button"
                    disabled={exporting !== null}
                    onClick={() => handleExport('pdf')}
                  >📄 {exporting === 'pdf' ? '生成中…' : '导出 PDF'}</button>
                  <button
                    type="button"
                    disabled={exporting !== null}
                    onClick={() => handleExport('xlsx')}
                  >📊 {exporting === 'xlsx' ? '生成中…' : '导出 XLSX'}</button>
                </div>
              )}
            </div>
          </div>
          <div className="mrd-body">
            {detailLoading && (
              <div className="mrd-skeleton-wrap" aria-label="加载中">
                <div className="mrd-skeleton" style={{ height: 96 }} />
                <div className="mrd-skeleton" style={{ height: 120 }} />
                <div className="mrd-skeleton" style={{ height: 110 }} />
              </div>
            )}
            {detailError && (
              <div className="mrd-empty">
                <span className="mrd-empty-icon">⚠</span>
                <p className="mrd-empty-text">方案详情加载失败，请稍后重试</p>
              </div>
            )}
            {!detailLoading && !detailError && outputs && (
              <div className="mrd-detail-body">
                {/* 策略定位 */}
                {strategy.positioning && (
                  <div className="plancard">
                    <div className="ph">策略定位 <span className="tag">已生成</span></div>
                    <div className="pb">
                      <p>{strategy.positioning}</p>
                      {strategy.key_messages?.length ? (
                        <div className="model" style={{ marginTop: 8 }}>
                          {strategy.key_messages.map((m, i) => (<span key={i}>{m}</span>))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}

                {/* 执行规划 */}
                {execItems.length > 0 && (
                  <div className="plancard">
                    <div className="ph">执行规划 <span className="tag">已生成</span></div>
                    <div className="pb">
                      {execItems.slice(0, 4).map((item, i) => (
                        <p key={i} style={{ marginBottom: 4 }}><b>{item.label}：</b>{item.description}</p>
                      ))}
                    </div>
                  </div>
                )}

                {/* 核心 KPI */}
                {kpiItems.length > 0 && (
                  <div className="plancard">
                    <div className="ph">核心 KPI <span className="tag">目标</span></div>
                    <div className="pb">
                      <div className="kpi-row" style={{ gridTemplateColumns: kpiItems.length <= 3 ? '1fr 1fr 1fr' : '1fr 1fr' }}>
                        {kpiItems.map((k, i) => (
                          <div key={i} className="k">
                            <div className="n">{k.target}</div>
                            <div className="l">{k.name}</div>
                          </div>
                        ))}
                      </div>
                      {budget.allocations?.length ? (
                        <div style={{ marginTop: 12 }}>
                          <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', marginBottom: 6 }}>预算分配</div>
                          {budget.allocations.map((a, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                              <span style={{ fontSize: 10, color: 'var(--muted)', width: 48, flexShrink: 0 }}>{a.category}</span>
                              <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'var(--surface)', overflow: 'hidden' }}>
                                <div style={{ width: `${a.percentage}%`, height: '100%', borderRadius: 4, background: 'var(--accent)' }} />
                              </div>
                              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--accent)', width: 40, textAlign: 'right' }}>{a.percentage}%</span>
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}

                {/* 行动建议 */}
                {actions?.length ? (
                  <div className="plancard">
                    <div className="ph">行动建议 <span className="tag">{actions.length}项</span></div>
                    <div className="pb">
                      {actions.slice(0, 4).map((a, i) => (
                        <p key={i} style={{ marginBottom: 3, fontSize: 12 }}>• {a.title}：{a.description?.slice(0, 60)}</p>
                      ))}
                    </div>
                  </div>
                ) : null}

                {/* CTA：查看完整方案 / 下一步行动建议 */}
                <div
                  className="cta-line"
                  onClick={() => onRestorePlan(selectedDraft.run_id, 'preview')}
                  role="button"
                  tabIndex={0}
                >
                  <div>
                    <div className="big">查看完整方案</div>
                    <div className="small">查看 9 章完整营销方案</div>
                  </div>
                  <div className="go">查看 ›</div>
                </div>
                <div
                  className="cta-line"
                  onClick={() => onRestorePlan(selectedDraft.run_id, 'actions')}
                  role="button"
                  tabIndex={0}
                >
                  <div>
                    <div className="big">下一步行动建议</div>
                    <div className="small">基于方案生成的可执行动作</div>
                  </div>
                  <div className="go">查看 ›</div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
