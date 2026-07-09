import { describe, expect, test, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { ChatInput } from '../components/ChatInput'

describe('ChatInput — ➕ plus menu', () => {
  const defaultProps = {
    value: '',
    onChange: vi.fn(),
    onSend: vi.fn(),
    disabled: false,
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── 3.1 Floating menu open/close ──────────────────────────────

  test('renders ➕ button instead of separate attach button', () => {
    render(<ChatInput {...defaultProps} />)
    const plusBtn = screen.getByLabelText('菜单')
    expect(plusBtn).toBeDefined()
    // No separate attach button
    expect(screen.queryByLabelText('附件')).toBeNull()
  })

  test('click ➕ opens floating menu panel', () => {
    render(<ChatInput {...defaultProps} />)
    const plusBtn = screen.getByLabelText('菜单')
    fireEvent.click(plusBtn)
    expect(screen.getByText('附件')).toBeDefined()
    expect(screen.getByText('制图')).toBeDefined()
    expect(screen.getByText('方案')).toBeDefined()
    expect(screen.getByText('语音')).toBeDefined()
    expect(screen.getByText('数据')).toBeDefined()
  })

  test('clicking menu item closes the panel', () => {
    render(<ChatInput {...defaultProps} />)
    const plusBtn = screen.getByLabelText('菜单')
    fireEvent.click(plusBtn)
    // Click a menu item
    fireEvent.click(screen.getByText('方案'))
    expect(screen.queryByText('制图')).toBeNull()
  })

  test('clicking outside closes the panel', () => {
    render(<ChatInput {...defaultProps} />)
    const plusBtn = screen.getByLabelText('菜单')
    fireEvent.click(plusBtn)
    expect(screen.getByText('附件')).toBeDefined()
    // Click the document body outside the menu area
    fireEvent.mouseDown(document.body)
    expect(screen.queryByText('附件')).toBeNull()
  })

  test('clicking ➕ when menu is open closes it', () => {
    render(<ChatInput {...defaultProps} />)
    const plusBtn = screen.getByLabelText('菜单')
    fireEvent.click(plusBtn)
    expect(screen.getByText('附件')).toBeDefined()
    fireEvent.click(plusBtn)
    expect(screen.queryByText('附件')).toBeNull()
  })

  // ── 📎Attach (moved into menu) ────────────────────────────────

  test('📎附件 in menu toggles attach URL input', () => {
    render(<ChatInput {...defaultProps} />)
    // Open menu and click attach
    fireEvent.click(screen.getByLabelText('菜单'))
    fireEvent.click(screen.getByText('附件'))
    // URL input should be visible
    expect(screen.getByPlaceholderText(/输入或粘贴图片 URL/)).toBeDefined()
  })

  test('➕ button highlights when attach is active', () => {
    render(<ChatInput {...defaultProps} />)
    fireEvent.click(screen.getByLabelText('菜单'))
    fireEvent.click(screen.getByText('附件'))
    const plusBtn = screen.getByLabelText('菜单')
    // Should have the showAttach-active class (bg-start/10 text-start)
    expect(plusBtn.className).toContain('bg-start/10')
  })

  // ── 2.2 Placeholder buttons ───────────────────────────────────

  test('🖼️制图 shows "功能开发中" toast', () => {
    render(<ChatInput {...defaultProps} />)
    fireEvent.click(screen.getByLabelText('菜单'))
    fireEvent.click(screen.getByText('制图'))
    expect(screen.getByText('功能开发中，敬请期待')).toBeDefined()
  })

  test('📈数据 shows "功能开发中" toast', () => {
    render(<ChatInput {...defaultProps} />)
    fireEvent.click(screen.getByLabelText('菜单'))
    fireEvent.click(screen.getByText('数据'))
    expect(screen.getByText('功能开发中，敬请期待')).toBeDefined()
  })

  // ── 3.2 Plan template prefill ─────────────────────────────────

  test('📋方案 calls onChange with brand template and focuses textarea', () => {
    const onChange = vi.fn()
    render(<ChatInput {...defaultProps} onChange={onChange} />)

    fireEvent.click(screen.getByLabelText('菜单'))
    fireEvent.click(screen.getByText('方案'))

    expect(onChange).toHaveBeenCalledWith(
      '我是 [品牌名]，属于 [品类]，想在 [城市] 做活动，预算 [金额] 万，周期 [时长] 个月',
    )
  })

  test('📋方案 prefill — Enter sends pre-filled value', () => {
    const onChange = vi.fn()
    const onSend = vi.fn()
    const { rerender } = render(
      <ChatInput value="" onChange={onChange} onSend={onSend} />,
    )

    // User clicks 方案 which fills template
    fireEvent.click(screen.getByLabelText('菜单'))
    fireEvent.click(screen.getByText('方案'))

    // Re-render with the template as value to simulate parent update
    rerender(
      <ChatInput
        value="我是 [品牌名]，属于 [品类]，想在 [城市] 做活动，预算 [金额] 万，周期 [时长] 个月"
        onChange={onChange}
        onSend={onSend}
      />,
    )
    const ta = screen.getAllByPlaceholderText('输入你的需求…')[0]
    fireEvent.keyDown(ta, { key: 'Enter', shiftKey: false })
    expect(onSend).toHaveBeenCalled()
  })

  // ── 3.3 Speech recognition unsupported ─────────────────────────

  test('💬语音 shows unsupported toast when SpeechRecognition is not available', () => {
    // Ensure no SpeechRecognition API
    vi.stubGlobal('webkitSpeechRecognition', undefined)
    vi.stubGlobal('SpeechRecognition', undefined)

    render(<ChatInput {...defaultProps} />)
    fireEvent.click(screen.getByLabelText('菜单'))
    fireEvent.click(screen.getByText('语音'))

    expect(screen.getByText('当前浏览器不支持语音识别')).toBeDefined()
  })

  test('💬语音 uses webkitSpeechRecognition when available', () => {
    const mockStart = vi.fn()
    class MockSpeechRecognition {
      start = mockStart
      stop = vi.fn()
      lang = ''
      continuous = false
      interimResults = false
      onresult: unknown = null
      onend: unknown = null
      onerror: unknown = null
    }
    vi.stubGlobal('webkitSpeechRecognition', MockSpeechRecognition)
    vi.stubGlobal('SpeechRecognition', undefined)

    render(<ChatInput {...defaultProps} />)
    fireEvent.click(screen.getByLabelText('菜单'))
    fireEvent.click(screen.getByText('语音'))

    expect(mockStart).toHaveBeenCalled()
    // Button should show recording state
    expect(screen.getByLabelText('停止录音')).toBeDefined()
  })
})
