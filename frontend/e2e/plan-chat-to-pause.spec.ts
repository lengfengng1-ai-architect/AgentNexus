import { test, expect } from '@playwright/test'

test.describe.configure({ mode: 'serial' })

test('chat → plan pauses at strategy_generation for human review', async ({ page }) => {
  if (test.info().project.name !== 'desktop') {
    test.skip('Real-LLM E2E runs only on desktop viewport')
  }
  test.setTimeout(600_000)

  page.on('console', (msg) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      // eslint-disable-next-line no-console
      console.log(`[page ${msg.type()}]`, msg.text())
    }
  })

  await page.goto('/chat')
  await expect(page.getByPlaceholder('输入你的需求…')).toBeVisible()

  await page.getByPlaceholder('输入你的需求…').fill(
    '我们是跑力狮，新运动品牌，专门做运动鞋，想在北京做新品发布活动，预算 30 万，周期 2 个月',
  )
  await page.getByRole('button', { name: '发送' }).click()

  // Wait for assistant response that can generate a plan.
  await expect(page.getByRole('button', { name: '生成方案' })).toBeVisible({ timeout: 120_000 })
  await page.getByRole('button', { name: '生成方案' }).click()

  // Confirm brand info and navigate to plan workbench.
  await expect(page.getByRole('button', { name: '确认，开始生成方案' })).toBeVisible({ timeout: 30_000 })
  await page.getByRole('button', { name: '确认，开始生成方案' }).click()

  await page.waitForURL('**/plan', { timeout: 30_000 })

  // The pipeline should run real agents and pause before strategy_generation.
  const auditPanel = page.getByRole('region', { name: /人工审核面板/ })
  await expect(auditPanel).toBeVisible({ timeout: 480_000 })
  await expect(page.getByText(/等待人工审核/)).toBeVisible()
  await expect(page.getByText(/strategy_generation/)).toBeVisible()

  await page.screenshot({ path: 'e2e/__screenshots__/e2e-plan-first-pause.png', fullPage: true })
})
