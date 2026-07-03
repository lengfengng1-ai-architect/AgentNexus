import { test, expect } from '@playwright/test'

const SSE_BODY = [
  'id: 1',
  'event: workflow.start',
  'data: {"run_id":"plan-visual-test"}',
  '',
  'id: 2',
  'event: workflow.paused',
  'data: {"run_id":"plan-visual-test","snapshot":{"node_id":"strategy_generation","node_input":{"brand_input":{}},"upstream_outputs":{}},"reason":"review"}',
  '',
].join('\n')

const BRAND_INPUT = JSON.stringify({
  brand_name: 'Nike',
  category: 'sportswear',
  city: '上海',
  budget: 200,
  period: 3,
})

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Accept',
  'Access-Control-Expose-Headers': 'X-Run-Id',
}

test.describe('PlanPage audit panel visual regression', () => {
  test('renders audit panel and matches screenshot', async ({ page }, testInfo) => {
    page.on('console', (msg) => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        // eslint-disable-next-line no-console
        console.log(`[page ${msg.type()}]`, msg.text())
      }
    })

    await page.route('http://localhost:8000/api/v1/plan/run', (route, request) => {
      // eslint-disable-next-line no-console
      console.log('route intercepted', request.method(), request.url())
      if (request.method() === 'OPTIONS') {
        return route.fulfill({
          status: 204,
          headers: CORS_HEADERS,
        })
      }
      return route.fulfill({
        status: 200,
        headers: {
          ...CORS_HEADERS,
          'Content-Type': 'text/event-stream; charset=utf-8',
          'X-Run-Id': 'plan-visual-test',
        },
        body: SSE_BODY,
      })
    })

    await page.goto('/plan')
    await page.evaluate((session) => {
      sessionStorage.setItem('allygo_pending_brand_input', session)
    }, BRAND_INPUT)
    await page.reload()

    await page.waitForTimeout(2000)
    await page.screenshot({ path: `e2e/__screenshots__/debug-${testInfo.project.name}.png`, fullPage: true })

    const auditPanel = page.getByText(/等待人工审核/)
    await expect(auditPanel).toBeVisible({ timeout: 10000 })

    const breakpoint = testInfo.project.name
    await page.screenshot({
      path: `e2e/__screenshots__/plan-audit-panel-${breakpoint}.png`,
      fullPage: true,
    })
  })
})
