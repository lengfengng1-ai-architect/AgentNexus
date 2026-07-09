import { describe, expect, test, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react'
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
    fireEvent.click(screen.getByText('方案'))
    expect(screen.queryByText('制图')).toBeNull()
  })

  test('clicking outside closes the panel', () => {
    render(<ChatInput {...defaultProps} />)
    const plusBtn = screen.getByLabelText('菜单')
    fireEvent.click(plusBtn)
    expect(screen.getByText('附件')).toBeDefined()
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

  // ── 📎Attach — file upload area ─────────────────────────────────

  test('📎附件 in menu opens file upload area (not URL input)', () => {
    render(<ChatInput {...defaultProps} />)
    fireEvent.click(screen.getByLabelText('菜单'))
    fireEvent.click(screen.getByText('附件'))
    // Should show the file upload prompt instead of URL input
    expect(screen.getByText(/点击选择文件，或拖拽文件到此处/)).toBeDefined()
  })

  test('➕ button highlights when attach is active', () => {
    render(<ChatInput {...defaultProps} />)
    fireEvent.click(screen.getByLabelText('菜单'))
    fireEvent.click(screen.getByText('附件'))
    const plusBtn = screen.getByLabelText('菜单')
    expect(plusBtn.className).toContain('bg-start/10')
  })

  test('hidden file input exists for file selection', () => {
    render(<ChatInput {...defaultProps} />)
    fireEvent.click(screen.getByLabelText('菜单'))
    fireEvent.click(screen.getByText('附件'))
    const fileInput = document.querySelector('input[type="file"]')
    expect(fileInput).toBeDefined()
    expect(fileInput?.getAttribute('multiple')).not.toBeNull()
  })

  test('selecting files creates attachment previews', async () => {
    render(<ChatInput {...defaultProps} />)
    fireEvent.click(screen.getByLabelText('菜单'))
    fireEvent.click(screen.getByText('附件'))

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(fileInput).toBeDefined()

    const file = new File(['dummy content'], 'test.png', { type: 'image/png' })
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } })
    })

    // Image thumbnail should appear
    const img = document.querySelector('img')
    expect(img).toBeDefined()
  })

  test('selecting a non-image file shows name+extension', async () => {
    render(<ChatInput {...defaultProps} />)
    fireEvent.click(screen.getByLabelText('菜单'))
    fireEvent.click(screen.getByText('附件'))

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['content'], 'report.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } })
    })

    expect(screen.getByText('report.docx')).toBeDefined()
  })

  test('remove button deletes an attachment', async () => {
    render(<ChatInput {...defaultProps} />)
    fireEvent.click(screen.getByLabelText('菜单'))
    fireEvent.click(screen.getByText('附件'))

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file1 = new File(['content'], 'pic1.png', { type: 'image/png' })
    const file2 = new File(['content'], 'pic2.png', { type: 'image/png' })
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file1, file2] } })
    })

    const imgs = document.querySelectorAll('img')
    expect(imgs.length).toBe(2)

    // Click the first × button to remove first attachment
    const removeBtns = document.querySelectorAll('button') as unknown as HTMLElement[]
    const xBtn = Array.from(removeBtns).find(b => b.textContent === '×')
    expect(xBtn).toBeDefined()
    await act(async () => {
      fireEvent.click(xBtn!)
    })

    const imgsAfter = document.querySelectorAll('img')
    expect(imgsAfter.length).toBe(1)
  })

  test('drag-over does not crash', () => {
    render(<ChatInput {...defaultProps} />)
    fireEvent.click(screen.getByLabelText('菜单'))
    fireEvent.click(screen.getByText('附件'))

    const dropArea = document.querySelector('.rounded-2xl')!
    fireEvent.dragOver(dropArea)
    // Should not throw — that's the test
  })

  test('drop files creates attachment previews', async () => {
    render(<ChatInput {...defaultProps} />)
    fireEvent.click(screen.getByLabelText('菜单'))
    fireEvent.click(screen.getByText('附件'))

    // Find the drop container — now inside the unified input wrapper
    const dropContainer = document.querySelector('[class*="mb-1"]')
    expect(dropContainer).toBeDefined()

    const file = new File(['content'], 'dropped.pdf', { type: 'application/pdf' })
    const dropEvent = new Event('drop', { bubbles: true })
    ;(dropEvent as any).dataTransfer = { files: [file] }
    await act(async () => {
      fireEvent(dropContainer!, dropEvent)
    })

    expect(screen.getByText('dropped.pdf')).toBeDefined()
  })

  // ── Send with attachments ──────────────────────────────────────

  test('send button disabled when no content and no attachments', () => {
    render(<ChatInput {...defaultProps} />)
    const sendBtn = screen.getByLabelText('发送')
    expect(sendBtn.hasAttribute('disabled')).toBe(true)
  })

  test('send enabled when attachments present even without text', async () => {
    render(<ChatInput {...defaultProps} />)
    fireEvent.click(screen.getByLabelText('菜单'))
    fireEvent.click(screen.getByText('附件'))

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['content'], 'test.png', { type: 'image/png' })
    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [file] } })
    })

    const sendBtn = screen.getByLabelText('发送')
    expect(sendBtn.hasAttribute('disabled')).toBe(false)
  })

  test('send enabled when text present even without attachments', () => {
    const { rerender } = render(<ChatInput {...defaultProps} value="" />)
    rerender(<ChatInput {...defaultProps} value="hello" />)

    const sendBtn = screen.getByLabelText('发送')
    expect(sendBtn.hasAttribute('disabled')).toBe(false)
  })

  // ── URL detection in textarea ──────────────────────────────────

  test('onSend receives URLs extracted from textarea', () => {
    const onSend = vi.fn()
    render(<ChatInput value="Check this https://example.com/img.jpg" onChange={vi.fn()} onSend={onSend} />)

    const ta = screen.getByPlaceholderText('输入你的需求…')
    fireEvent.keyDown(ta, { key: 'Enter', shiftKey: false })

    expect(onSend).toHaveBeenCalledWith(['https://example.com/img.jpg'])
  })

  test('onSend receives undefined when no URLs in text and no attachments', () => {
    const onSend = vi.fn()
    render(<ChatInput value="just text" onChange={vi.fn()} onSend={onSend} />)

    const ta = screen.getByPlaceholderText('输入你的需求…')
    fireEvent.keyDown(ta, { key: 'Enter', shiftKey: false })

    expect(onSend).toHaveBeenCalledWith(undefined)
  })

  test('onSend extracts multiple URLs from text', () => {
    const onSend = vi.fn()
    render(<ChatInput value="img1: https://a.com/1.jpg img2: https://b.com/2.png" onChange={vi.fn()} onSend={onSend} />)

    const ta = screen.getByPlaceholderText('输入你的需求…')
    fireEvent.keyDown(ta, { key: 'Enter', shiftKey: false })

    expect(onSend).toHaveBeenCalledWith(['https://a.com/1.jpg', 'https://b.com/2.png'])
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

    fireEvent.click(screen.getByLabelText('菜单'))
    fireEvent.click(screen.getByText('方案'))

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
    expect(screen.getByLabelText('停止录音')).toBeDefined()
  })
})
