import type { PlanActions, PlanBudgetKpi } from '../types/plan'

interface AllocationItem {
  category: string
  amount: number
  percentage: number
}

interface PlanActionCardsProps {
  actions: PlanActions | undefined
  budgetKpi: PlanBudgetKpi | undefined
}

export function PlanActionCards({ actions, budgetKpi }: PlanActionCardsProps) {
  return (
    <div className="space-y-4">
      {budgetKpi && (
        <div className="rounded-xl border border-line bg-white p-4">
          <h3 className="text-sm font-semibold text-track">预算与 KPI</h3>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-mist p-3">
              <p className="text-xs text-track/50">总预算</p>
              <p className="text-lg font-semibold text-track">{budgetKpi.total_budget}万</p>
            </div>
            <div className="rounded-lg bg-mist p-3">
              <p className="text-xs text-track/50">执行周期</p>
              <p className="text-lg font-semibold text-track">{budgetKpi.period_months}个月</p>
            </div>
          </div>
          <div className="mt-3 space-y-2">
            {budgetKpi.allocations.map((item: AllocationItem) => (
              <div key={item.category} className="flex items-center justify-between text-sm">
                <span className="text-track/70">{item.category}</span>
                <span className="font-medium text-track">
                  {item.amount}万（{item.percentage}%）
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {Object.entries(budgetKpi.kpis).map(([key, value]: [string, string]) => (
              <div key={key} className="rounded-lg bg-mist p-2">
                <p className="text-[10px] text-track/50">{key}</p>
                <p className="text-xs font-medium text-track">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {actions && actions.actions.length > 0 && (
        <div className="rounded-xl border border-line bg-white p-4">
          <h3 className="text-sm font-semibold text-track">行动建议</h3>
          <ol className="mt-3 list-decimal space-y-3 pl-4">
            {actions.actions.map((action: { title: string; description: string }, index: number) => (
              <li key={index} className="text-sm text-track/80">
                <span className="font-medium text-track">{action.title}</span>
                <span className="ml-2">{action.description}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}
