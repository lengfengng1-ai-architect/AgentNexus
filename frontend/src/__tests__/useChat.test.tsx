import { describe, expect, test, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useChat } from '../hooks/useChat'

// Mock the streamChat API
const mockStreamChat = vi.fn()
vi.mock('../api/workflow', () => ({
  streamChat: (...args: unknown[]) => mockStreamChat(...args),
}))

// Mock localStorage
const store: Record<string, string> = {}
vi.stubGlobal('localStorage', {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value },
  removeItem: (key: string) => { delete store[key] },
})

async function* makeStream(...events: Array<{ reasoning?: string; intent?: Record<string, unknown> }>) {
  for (const e of events) yield e
}

describe('useChat intent handling', () => {
  beforeEach(() => {
    mockStreamChat.mockClear()
  })
  test('sendMessage dispatches STREAM_START then INTENT_RECEIVED on generate_plan', async () => {
    mockStreamChat.mockImplementation(() => makeStream(
      { reasoning: '让我分析一下用户需求' },
      {
        intent: {
          intent: 'generate_plan',
          confidence: 0.95,
          reply: '收到，开始为 Nike 生成上海营销方案。',
          brand_input: { brand_name: 'Nike', category: '运动鞋', city: '上海', budget: 300, period: 3 },
          missing_fields: [],
          updated_fields: {},
          reasoning: '用户提供了完整信息',
        },
      },
    ))

    const { result } = renderHook(() => useChat())

    // Trigger sendMessage
    await act(async () => {
      await result.current.sendMessage('我是 Nike，在上海做推广')
    })

    // Verify the last AI message has the intent
    const lastMsg = result.current.messages[result.current.messages.length - 1]
    expect(lastMsg.role).toBe('ai')
    expect(lastMsg.content).toBe('收到，开始为 Nike 生成上海营销方案。')
    expect(lastMsg.intent).toBe('generate_plan')
    expect(lastMsg.canGeneratePlan).toBe(true)
    expect(lastMsg.brandInput?.brand_name).toBe('Nike')
  })

  test('sendMessage handles clarify intent correctly', async () => {
    mockStreamChat.mockImplementation(() => makeStream(
      { reasoning: '用户信息不完整' },
      {
        intent: {
          intent: 'clarify',
          confidence: 0.8,
          reply: '为了生成营销方案，我还需要了解：brand_name, category',
          brand_input: { brand_name: null, category: null, city: '上海', budget: 300, period: 3 },
          missing_fields: ['brand_name', 'category'],
          updated_fields: {},
          reasoning: '缺少品牌和品类信息',
        },
      },
    ))

    const { result } = renderHook(() => useChat())

    await act(async () => {
      await result.current.sendMessage('我想做方案')
    })

    const lastMsg = result.current.messages[result.current.messages.length - 1]
    expect(lastMsg.role).toBe('ai')
    expect(lastMsg.content).toBe('为了生成营销方案，我还需要了解：brand_name, category')
    expect(lastMsg.intent).toBe('clarify')
    expect(lastMsg.canGeneratePlan).toBe(false)
    expect(lastMsg.missingFields).toContain('brand_name')
  })

  test('sendMessage handles chat intent', async () => {
    mockStreamChat.mockImplementation(() => makeStream(
      { reasoning: '用户打招呼' },
      {
        intent: {
          intent: 'chat',
          confidence: 0.9,
          reply: '你好！我是 AllyGo 营销方案 Agent，可以帮你生成营销方案或查询平台数据。',
          brand_input: {},
          missing_fields: [],
          updated_fields: {},
          reasoning: '',
        },
      },
    ))

    const { result } = renderHook(() => useChat())

    await act(async () => {
      await result.current.sendMessage('你好')
    })

    const lastMsg = result.current.messages[result.current.messages.length - 1]
    expect(lastMsg.role).toBe('ai')
    expect(lastMsg.content).toContain('AllyGo')
    expect(lastMsg.intent).toBe('chat')
  })

  test('streamChat receives context from accumulated brandInput', async () => {
    // First message establishes brand_input
    mockStreamChat.mockImplementationOnce(() => makeStream(
      { reasoning: '分析中' },
      {
        intent: {
          intent: 'generate_plan',
          confidence: 0.95,
          reply: '收到，开始为 Nike 生成方案。',
          brand_input: { brand_name: 'Nike', category: '运动鞋', city: '上海', budget: 300, period: 3 },
          missing_fields: [],
          updated_fields: {},
          reasoning: '',
        },
      },
    ))
    // Second call will verify context was included
    mockStreamChat.mockImplementationOnce(() => makeStream(
      { reasoning: '分析中' },
      {
        intent: {
          intent: 'chat',
          confidence: 0.9,
          reply: '好的。',
          brand_input: { brand_name: 'Nike', category: '运动鞋', city: '上海', budget: 300, period: 3 },
          missing_fields: [],
          updated_fields: {},
          reasoning: '',
        },
      },
    ))

    const { result } = renderHook(() => useChat())

    // First message
    await act(async () => {
      await result.current.sendMessage('我是 Nike')
    })

    await vi.waitFor(() => expect(mockStreamChat).toHaveBeenCalledTimes(1))

    // Second message
    await act(async () => {
      await result.current.sendMessage('好的')
    })

    // streamChat should have been called with context on second call
    expect(mockStreamChat).toHaveBeenCalledTimes(2)
    const secondCallArgs = mockStreamChat.mock.calls[1]
    expect(secondCallArgs[0]).toBe('好的')
    expect(secondCallArgs[1]).toBeDefined()
    expect(secondCallArgs[1].brand_input).toBeDefined()
  })

  test('setInputValue updates input value', () => {
    const { result } = renderHook(() => useChat())
    act(() => result.current.setInputValue('新消息'))
    expect(result.current.inputValue).toBe('新消息')
  })
})
