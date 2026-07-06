import { describe, expect, test, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import { PlanPage } from '../pages/PlanPage'

// Mock the plan hook to render the paused/audit panel state
const mockApprove = vi.fn()
const mockReject = vi.fn()
const mockCancel = vi.fn()
const mockStart = vi.fn()

vi.mock('../hooks/usePlanRun', () => ({
  usePlanRun: () => ({
    status: 'paused',
    nodes: [],
    logs: [],
    outputs: {},
    failedNode: null,
    error: null,
    isConnected: false,
    nodeLogs: {},
    pausedNode: 'strategy_generation',
    pausedSnapshot: {
      node_id: 'strategy_generation',
      node_input: { brand_input: {} },
      upstream_outputs: {},
    },
    chapters: [],
    start: mockStart,
    approve: mockApprove,
    reject: mockReject,
    cancel: mockCancel,
  }),
}))

describe('PlanPage accessibility', () => {
  test('has no automatic a11y violations when audit panel is open', async () => {
    const { container } = render(<PlanPage />)

    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  test('audit buttons are reachable by accessible names and keyboard', async () => {
    const user = userEvent.setup()
    render(<PlanPage />)

    const auditPanel = screen.getByRole('region', { name: /人工审核面板/ })
    expect(auditPanel).toBeInTheDocument()
    expect(within(auditPanel).getByText(/等待人工审核/)).toBeInTheDocument()

    const approveBtn = within(auditPanel).getByRole('button', { name: /确认继续/ })
    const rejectBtn = within(auditPanel).getByRole('button', { name: /驳回重跑/ })
    const cancelBtn = within(auditPanel).getByRole('button', { name: /取消运行/ })
    expect(approveBtn).toBeInTheDocument()
    expect(rejectBtn).toBeInTheDocument()
    expect(cancelBtn).toBeInTheDocument()

    // Tab through the page until the primary audit action receives focus.
    document.body.focus()
    for (let i = 0; i < 30; i++) {
      if (document.activeElement === approveBtn) break
      await user.tab()
    }
    expect(approveBtn).toHaveFocus()
  })
})
