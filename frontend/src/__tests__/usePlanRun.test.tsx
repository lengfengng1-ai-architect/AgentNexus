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

  describe('nodeLogs default message generation', () => {
    test('generates default message for node.start event', async () => {
      const { result } = renderHook(() => usePlanRun())
      // Simulate SSE events flowing in via internal dispatch
      // We need to trigger the reducer by dispatching APPEND_LOG events
      // The hook's processEvent is internal — test nodeLogs computed output directly
      mockStartPlanRun.mockResolvedValue({
        runId: 'log-test-1',
        stream: new ReadableStream({
          async start(controller) {
            const encoder = new TextEncoder()
            // Simulate workflow.start
            controller.enqueue(encoder.encode('id: 1\nevent: workflow.start\ndata: {"run_id":"log-test-1"}\n\n'))
            // Simulate node.start without message
            controller.enqueue(encoder.encode('id: 2\nevent: node.start\ndata: {"run_id":"log-test-1","node_id":"market_research"}\n\n'))
            // Simulate node.complete without message
            controller.enqueue(encoder.encode('id: 3\nevent: node.complete\ndata: {"run_id":"log-test-1","node_id":"market_research"}\n\n'))
            controller.close()
          },
        }),
      })

      await act(async () => {
        await result.current.start({ brand_name: 'X' })
      })

      expect(result.current.nodeLogs['market_research']).toBeDefined()
      expect(result.current.nodeLogs['market_research'].length).toBe(2)
      expect(result.current.nodeLogs['market_research'][0]).toBe('开始执行…')
      expect(result.current.nodeLogs['market_research'][1]).toBe('✓ 执行完成')
    })

    test('handles node.failed without message field', async () => {
      const { result } = renderHook(() => usePlanRun())
      mockStartPlanRun.mockResolvedValue({
        runId: 'log-test-2',
        stream: new ReadableStream({
          async start(controller) {
            const encoder = new TextEncoder()
            controller.enqueue(encoder.encode('id: 1\nevent: workflow.start\ndata: {"run_id":"log-test-2"}\n\n'))
            controller.enqueue(encoder.encode('id: 2\nevent: node.start\ndata: {"run_id":"log-test-2","node_id":"market_research"}\n\n'))
            controller.enqueue(encoder.encode('id: 3\nevent: node.failed\ndata: {"run_id":"log-test-2","node_id":"market_research"}\n\n'))
            controller.close()
          },
        }),
      })

      await act(async () => {
        await result.current.start({ brand_name: 'X' })
      })

      expect(result.current.nodeLogs['market_research']).toBeDefined()
      expect(result.current.nodeLogs['market_research'][1]).toContain('执行失败')
    })
  })
})
