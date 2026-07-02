import { renderHook, act } from '@testing-library/react'
import { useWorkflowSSE } from '../hooks/useWorkflowSSE'

// Mock the API module
vi.mock('../api/plan', () => ({
  startPlanRun: vi.fn(),
  resumePlanRun: vi.fn(),
  controlPlanRun: vi.fn(),
  getPlanRunStatus: vi.fn(),
}))

import * as planApi from '../api/plan'

describe('useWorkflowSSE reducer', () => {
  test('initial state is idle with all nodes pending', () => {
    const { result } = renderHook(() => useWorkflowSSE())
    expect(result.current.status).toBe('idle')
    expect(result.current.runId).toBeNull()
    expect(result.current.nodes).toHaveLength(10)
    expect(result.current.nodes.every((n) => n.status === 'pending')).toBe(true)
    expect(result.current.logs).toEqual([])
    expect(result.current.isConnected).toBe(false)
  })

  test('start dispatches RESET and calls startPlanRun', async () => {
    const mockStream = new ReadableStream({
      start(controller) {
        controller.close()
      },
    })
    vi.mocked(planApi.startPlanRun).mockResolvedValue({
      runId: 'test-run-1',
      stream: mockStream,
    })

    const { result } = renderHook(() => useWorkflowSSE())
    await act(async () => {
      await result.current.start({ brand_name: 'Nike', category: '运动' })
    })

    expect(planApi.startPlanRun).toHaveBeenCalled()
    expect(result.current.runId).toBe('test-run-1')
  })

  test('reset clears all state', () => {
    const { result } = renderHook(() => useWorkflowSSE())
    act(() => {
      result.current.reset()
    })
    expect(result.current.status).toBe('idle')
    expect(result.current.runId).toBeNull()
  })
})
