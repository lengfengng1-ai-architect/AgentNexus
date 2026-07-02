import type { PlanNode } from '../types/plan'

interface PipelineTimelineProps {
  nodes: PlanNode[]
  failedNode: string | null
}

function statusDot(status: PlanNode['status']) {
  switch (status) {
    case 'running':
      return 'bg-start animate-pulse'
    case 'complete':
      return 'bg-field'
    case 'failed':
      return 'bg-start'
    case 'waiting':
      return 'bg-yellow-400'
    default:
      return 'bg-track/20'
  }
}

function statusLabel(status: PlanNode['status']) {
  switch (status) {
    case 'running':
      return '运行中'
    case 'complete':
      return '完成'
    case 'failed':
      return '失败'
    case 'waiting':
      return '等待决策'
    default:
      return '待启动'
  }
}

export function PipelineTimeline({ nodes, failedNode }: PipelineTimelineProps) {
  return (
    <div className="rounded-xl border border-line bg-white p-4">
      <h3 className="mb-4 text-sm font-semibold text-track">方案生成流水线</h3>
      <div className="relative space-y-4 pl-3">
        <div className="absolute bottom-2 left-[11px] top-2 w-px bg-line" />
        {nodes.map((node) => (
          <div key={node.id} className="relative flex items-center gap-3">
            <div
              className={`z-10 h-2.5 w-2.5 rounded-full ${statusDot(node.status)}`}
              aria-hidden="true"
            />
            <div className="flex flex-1 items-center justify-between">
              <span className="text-sm text-track">{node.label}</span>
              <span className="text-xs text-track/50">{statusLabel(node.status)}</span>
            </div>
            {node.id === failedNode && (
              <span className="text-xs font-medium text-start">阻塞中</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
