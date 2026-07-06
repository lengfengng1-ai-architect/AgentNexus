import { useState } from 'react'

interface WelcomeCardProps {
  onScenarioClick?: (text: string) => void
}

const ALL_SCENARIOS = [
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
  {
    title: '品牌联名企划',
    text: '我们是运动潮牌，想找瑜伽品牌做联名，预算 40 万，周期 2 个月',
  },
  {
    title: 'KOL 种草计划',
    text: '我们是户外装备品牌，想在小红书找达人种草，预算 20 万，周期 1 个月',
  },
  {
    title: '健身房地推活动',
    text: '我们是运动饮料，想在深圳健身房做试饮活动，预算 15 万，周期 1 个月',
  },
  {
    title: '线上挑战赛',
    text: '我们是智能穿戴品牌，想发起线上运动打卡挑战，预算 25 万，周期 2 个月',
  },
  {
    title: '运动社群运营',
    text: '我们是跑鞋品牌，想在成都运营跑团社群，预算 10 万，周期 3 个月',
  },
  {
    title: '校园营销活动',
    text: '我们是体育用品品牌，想在全国大学做篮球赛赞助，预算 60 万，周期 4 个月',
  },
]

function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled.slice(0, n)
}

export function WelcomeCard({ onScenarioClick }: WelcomeCardProps) {
  const [scenarios, setScenarios] = useState(() => pickN(ALL_SCENARIOS, 3))

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

      <div className="mt-8 w-full max-w-2xl">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold text-track/40">试试这些场景</span>
          <button
            type="button"
            onClick={() => setScenarios(pickN(ALL_SCENARIOS, 3))}
            className="flex items-center gap-1 text-xs text-start hover:text-start/80"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="h-3.5 w-3.5"
            >
              <path fillRule="evenodd" d="M4.755 10.059a7.5 7.5 0 0 1 12.548-3.364l1.903 1.903h-3.183a.75.75 0 1 0 0 1.5h4.992a.75.75 0 0 0 .75-.75V4.356a.75.75 0 0 0-1.5 0v3.18l-1.9-1.9A9 9 0 0 0 3.306 9.67a.75.75 0 1 0 1.45.388Zm15.408 3.352a.75.75 0 0 0-.919.53 7.5 7.5 0 0 1-12.548 3.364l-1.902-1.903h3.183a.75.75 0 0 0 0-1.5H2.984a.75.75 0 0 0-.75.75v4.992a.75.75 0 0 0 1.5 0v-3.18l1.9 1.9a9 9 0 0 0 15.059-4.035.75.75 0 0 0-.53-.918Z" clipRule="evenodd" />
            </svg>
            换一批
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {scenarios.map((scenario) => (
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
