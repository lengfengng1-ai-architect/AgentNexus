interface WelcomeCardProps {
  onScenarioClick?: (text: string) => void
}

const SCENARIOS = [
  {
    title: '新品上市 campaign',
    text: '我们是新运动品牌，想在北京做新品发布活动，预算 30 万，周期 2 个月',
  },
  {
    title: '城市快闪活动',
    text: '我们是 Nike，想在上海做跑步主题快闪，预算 50 万，周期 1 个月',
  },
  {
    title: '赛事赞助合作',
    text: '我们是能量饮料品牌，想赞助杭州马拉松相关活动，预算 80 万，周期 3 个月',
  },
]

export function WelcomeCard({ onScenarioClick }: WelcomeCardProps) {
  return (
    <div className="flex flex-col items-center px-4 py-12 text-center sm:py-16">
      <h1 className="font-display text-5xl tracking-wide text-track sm:text-6xl">
        ALLYGO
      </h1>
      <p className="mt-4 text-lg font-medium text-track sm:text-xl">
        告诉我你的品牌需求
      </p>
      <p className="mt-2 max-w-md text-sm text-track/60 sm:text-base">
        说说你的品牌想法，我帮你一步步落地。
      </p>

      <div className="mt-8 grid w-full max-w-2xl gap-3 sm:grid-cols-3">
        {SCENARIOS.map((scenario) => (
          <button
            key={scenario.title}
            type="button"
            onClick={() => onScenarioClick?.(scenario.text)}
            className="rounded-xl border border-line bg-white p-4 text-left shadow-sm transition-all hover:border-start hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-start"
          >
            <span className="text-xs font-semibold uppercase tracking-wide text-start">
              场景
            </span>
            <p className="mt-2 text-sm font-medium text-track">{scenario.title}</p>
            <p className="mt-1 line-clamp-2 text-xs text-track/60">{scenario.text}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
