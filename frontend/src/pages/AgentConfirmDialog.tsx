import type { PlanNode } from '../types/plan'

interface AgentConfirmDialogProps {
  node: PlanNode | null
  pausedNodeId: string | null
  isOpen: boolean
  isLoading: boolean
  isConnected: boolean
  autoMode: boolean
  onApprove: () => void
  onRerun: () => void
  onToggleAuto: () => void
  onClose: () => void
}

const AGENT_LABELS: Record<string, string> = {
  product_research: '产品调研',
  market_research: '市场研究',
  audience_insight: '人群洞察',
  plan_data_query: '平台资源',
  fitness_analysis: '适配度分析',
  strategy_generation: '策略生成',
  execution_planning: '执行规划',
  budget_kpi: '预算KPI',
  action_recommendations: '行动建议',
  plan_generator: '方案生成',
}

export function AgentConfirmDialog({
  node,
  pausedNodeId,
  isOpen,
  isLoading,
  isConnected,
  autoMode,
  onApprove,
  onRerun,
  onToggleAuto,
  onClose,
}: AgentConfirmDialogProps) {
  if (!isOpen || !node) return null

  const label = pausedNodeId ? AGENT_LABELS[pausedNodeId] || pausedNodeId : ''

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 400, backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 14, width: '90%', maxWidth: 460,
          overflow: 'hidden', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.08)',
        }}
      >
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid #e2e8f0',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
            {label} Agent 执行完成
          </h3>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: '50%', border: 'none',
              background: '#f1f5f9', color: '#475569', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14,
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: '20px 24px' }}>
          <div style={{
            padding: 14, borderRadius: 8, background: '#f8fafc',
            border: '1px solid #e2e8f0', marginBottom: 16, fontSize: 13,
            color: '#475569', lineHeight: 1.6, maxHeight: 200, overflowY: 'auto',
          }}>
            <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: 6 }}>执行结果摘要</div>
            {node.status === 'complete' && <p>当前节点已完成执行，请确认后继续后续流程。</p>}
            {node.status === 'failed' && <p style={{ color: '#dc2626' }}>执行失败。</p>}
            {node.status === 'waiting' || node.status === 'running' ? (
              <p>正在执行中...</p>
            ) : null}
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onToggleAuto}
              style={{
                padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                cursor: 'pointer', border: '1px solid #d1d5db',
                background: autoMode ? '#059669' : '#fff',
                color: autoMode ? '#fff' : '#374151',
                display: 'inline-flex', alignItems: 'center', gap: 6,
                opacity: isConnected ? 0.6 : 1,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              {autoMode ? '自动确认中' : '自动确认'}
            </button>
            <button
              type="button"
              onClick={onRerun}
              disabled={isLoading || isConnected}
              style={{
                padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                cursor: 'pointer', border: '1px solid #d1d5db',
                background: '#fff', color: '#374151',
                display: 'inline-flex', alignItems: 'center', gap: 6,
                opacity: isConnected ? 0.6 : 1,
              }}
            >
              ↻ 重新执行
            </button>
            <button
              type="button"
              onClick={onApprove}
              disabled={isLoading || isConnected}
              style={{
                padding: '9px 18px', borderRadius: 8, fontSize: 13, fontWeight: 600,
                cursor: 'pointer', border: 'none',
                background: '#1e40af', color: '#fff',
                display: 'inline-flex', alignItems: 'center', gap: 6,
                opacity: isConnected ? 0.6 : 1,
              }}
            >
              ✓ 确认继续
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
