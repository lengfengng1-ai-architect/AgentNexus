// MobileWorkbenchPage — smoke test（对接后端 /chat/stream 后）：
//   初始无硬编码消息，消息通过 useChat 驱动，发送调用 sendMessage
// OpenSpec: openspec/changes/mobile-chat-backend-integration
import { describe, expect, test } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MobileWorkbenchPage } from '../pages/mobile-workbench/MobileWorkbenchPage'

describe('MobileWorkbenchPage', () => {
  test('默认渲染手机框 / 5 个 Tab / ① 对话屏 / 输入框', () => {
    render(<MobileWorkbenchPage />)
    expect(document.querySelector('.phone')).not.toBeNull()
    expect(screen.getByText('① 对话入口')).toBeDefined()
    expect(screen.getByText('② 简报')).toBeDefined()
    expect(screen.getByText('③ 方案生成')).toBeDefined()
    expect(screen.getByText('④ 行动建议')).toBeDefined()
    expect(screen.getByText('⑤ 下发转达')).toBeDefined()
    // 初始无消息，输入框存在
    expect(screen.queryByPlaceholderText('给 Agent 发消息…')).toBeDefined()
  })

  test('输入框可输入文字', () => {
    render(<MobileWorkbenchPage />)
    const input = screen.getByPlaceholderText('给 Agent 发消息…') as HTMLInputElement
    fireEvent.change(input, { target: { value: '帮我做蓝莓饮品方案' } })
    expect(input.value).toBe('帮我做蓝莓饮品方案')
  })

  test('空消息时发送按钮禁用', () => {
    render(<MobileWorkbenchPage />)
    const send = screen.getByLabelText('发送')
    expect(send.hasAttribute('disabled')).toBe(true)
  })

  test('非空消息发送按钮可点击', () => {
    render(<MobileWorkbenchPage />)
    const input = screen.getByPlaceholderText('给 Agent 发消息…') as HTMLInputElement
    fireEvent.change(input, { target: { value: '测试' } })
    const send = screen.getByLabelText('发送')
    expect(send.hasAttribute('disabled')).toBe(false)
  })

  test('点击快捷「方案生成」切到 ② 简报屏', () => {
    render(<MobileWorkbenchPage />)
    fireEvent.click(screen.getByRole('button', { name: '方案生成' }))
    // ScreenBrief 渲染表单而非占位
    expect(screen.getByText('方案简报')).toBeDefined()
    expect(screen.getByText('② 简报').className).toContain('on')
    // ScreenChat 仅 display:none 隐藏，不 unmount，所以输入框 DOM 仍存在
    expect(screen.getByPlaceholderText('给 Agent 发消息…')).not.toBeVisible()
  })
})
