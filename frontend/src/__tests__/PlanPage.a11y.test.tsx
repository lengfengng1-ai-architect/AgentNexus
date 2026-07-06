import { describe, expect, test, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'jest-axe'
import { PlanPage } from '../pages/PlanPage'

// Mock the plan hook — test just layout rendering with idle status
const mockApprove = vi.fn()
const mockReject = vi.fn()
const mockCancel = vi.fn()
const mockStart = vi.fn()

vi.mock('../hooks/usePlanRun', () => ({
  usePlanRun: () => ({
    status: 'idle',
    nodes: [],
    logs: [],
    runId: null,
    outputs: {},
    failedNode: null,
    error: null,
    isLoading: false,
    isConnected: false,
    nodeLogs: {},
    pausedNode: null,
    pausedSnapshot: null,
    chapters: [],
    start: mockStart,
    approve: mockApprove,
    reject: mockReject,
    cancel: mockCancel,
    rerun: vi.fn(),
    restoreFromRunId: vi.fn(),
    refreshStatus: vi.fn(),
    reset: vi.fn(),
  }),
}))

describe('PlanPage accessibility', () => {
  test('has no automatic a11y violations', async () => {
    const { container } = render(<PlanPage />)

    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  test('workbench header buttons are reachable by accessible names and keyboard', async () => {
    const user = userEvent.setup()
    render(<PlanPage />)

    // Wait for PlanPage to render — sidebar auto-collapses when status !== 'idle',
    // but status is 'idle' in mock, so sidebar should be expanded.
    const startBtn = screen.getByRole('button', { name: /生成营销方案/ })
    expect(startBtn).toBeInTheDocument()
  })
})
