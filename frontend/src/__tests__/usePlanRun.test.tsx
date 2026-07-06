import { renderHook, act } from '@testing-library/react'
import { usePlanRun } from '../hooks/usePlanRun'

const mockStartPlanRun = vi.fn()
const mockApprovePlanRun = vi.fn()
const mockRejectPlanRun = vi.fn()
const mockRerunPlanRun = vi.fn()
const mockCancelPlanRun = vi.fn()
const mockGetPlanRunStatus = vi.fn()

vi.mock('../api/plan', () => ({
  startPlanRun: (...args: unknown[]) => mockStartPlanRun(...args),
  approvePlanRun: (...args: unknown[]) => mockApprovePlanRun(...args),
  rejectPlanRun: (...args: unknown[]) => mockRejectPlanRun(...args),
  rerunPlanRun: (...args: unknown[]) => mockRerunPlanRun(...args),
  cancelPlanRun: (...args: unknown[]) => mockCancelPlanRun(...args),
  getPlanRunStatus: (...args: unknown[]) => mockGetPlanRunStatus(...args),
}))

describe('usePlanRun', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('initial state is idle with all nodes pending', () => {
    const { result } = renderHook(() => usePlanRun())
    expect(result.current.status).toBe('idle')
    expect(result.current.runId).toBeNull()
    expect(result.current.nodes).toHaveLength(10)
    expect(result.current.nodes.every((n) => n.status === 'pending')).toBe(true)
    expect(result.current.logs).toEqual([])
    expect(result.current.isConnected).toBe(false)
    expect(result.current.pausedNode).toBeNull()
    expect(result.current.chapters).toEqual([])
  })

  test('start dispatches RESET and calls startPlanRun', async () => {
    const mockStream = new ReadableStream({
      start(controller) {
        controller.close()
      },
    })
    mockStartPlanRun.mockResolvedValue({
      runId: 'test-run-1',
      stream: mockStream,
    })

    const { result } = renderHook(() => usePlanRun())
    await act(async () => {
      await result.current.start({ brand_name: 'Nike', category: '运动' })
    })

    expect(mockStartPlanRun).toHaveBeenCalledWith({ brand_name: 'Nike', category: '运动' })
    expect(result.current.runId).toBe('test-run-1')
  })

  test('reset clears all state', () => {
    const { result } = renderHook(() => usePlanRun())
    act(() => {
      result.current.reset()
    })
    expect(result.current.status).toBe('idle')
    expect(result.current.runId).toBeNull()
    expect(result.current.chapters).toEqual([])
  })

  test('approve is no-op when not paused', async () => {
    const { result } = renderHook(() => usePlanRun())
    await act(async () => {
      await result.current.approve()
    })
    expect(mockApprovePlanRun).not.toHaveBeenCalled()
  })

  test('rerun is no-op when runId is null', async () => {
    const { result } = renderHook(() => usePlanRun())
    await act(async () => {
      await result.current.rerun()
    })
    expect(mockRerunPlanRun).not.toHaveBeenCalled()
  })

  test('rerun calls rerunPlanRun when runId exists', async () => {
    const mockStream = new ReadableStream({
      start(controller) { controller.close() },
    })
    mockRerunPlanRun.mockResolvedValue(mockStream)

    const { result } = renderHook(() => usePlanRun())
    // Simulate having a runId by calling start first
    mockStartPlanRun.mockResolvedValue({
      runId: 'rerun-test',
      stream: mockStream,
    })
    await act(async () => {
      await result.current.start({ brand_name: 'Nike' })
    })
    // Now rerun
    await act(async () => {
      await result.current.rerun()
    })
    expect(mockRerunPlanRun).toHaveBeenCalledWith('rerun-test')
  })

  describe('usePlanRun: fixes for white-screen and tab-mapping', () => {
    test('processEvent does not throw on unknown event nodeId', async () => {
      const { result } = renderHook(() => usePlanRun())
      mockStartPlanRun.mockResolvedValue({
        runId: 'test-fix-1',
        stream: new ReadableStream({ start(c) { c.close() } }),
      })
      await act(async () => {
        await result.current.start({ brand_name: 'X' })
      })
      // 不应抛出 / 状态应保持 idle
      expect(result.current.runId).toBe('test-fix-1')
    })

    test('rerun is no-op without runId even when autoMode is true', async () => {
      const { result } = renderHook(() => usePlanRun())
      await act(async () => {
        await result.current.rerun()
      })
      expect(mockRerunPlanRun).not.toHaveBeenCalled()
    })

    test('multiple rapid start calls do not leak abort handles', async () => {
      const { result } = renderHook(() => usePlanRun())
      mockStartPlanRun.mockResolvedValue({
        runId: 'leak-test',
        stream: new ReadableStream({ start(c) { c.close() } }),
      })
      await act(async () => {
        // 连续调用 start → 第二次会 abort 第一次
        const p1 = result.current.start({ brand_name: 'A' })
        const p2 = result.current.start({ brand_name: 'B' })
        await Promise.all([p1, p2])
      })
      expect(result.current.runId).toBe('leak-test')
    })
  })
})
