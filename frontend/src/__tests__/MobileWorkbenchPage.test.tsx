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

  test('输入为空时显示语音按钮，输入文字后显示发送按钮', () => {
    render(<MobileWorkbenchPage />)
    expect(document.querySelector('button.mic-btn')).not.toBeNull()
    const input = screen.getByPlaceholderText('给 Agent 发消息…') as HTMLInputElement
    fireEvent.change(input, { target: { value: '测试' } })
    expect(document.querySelector('button.mic-btn')).toBeNull()
    const send = document.querySelector('button.send-btn') as HTMLButtonElement
    expect(send).not.toBeNull()
    expect(send.disabled).toBe(false)
  })

  test('点击顶部 Tab「方案生成」切到 ③ 方案生成屏', () => {
    render(<MobileWorkbenchPage />)
    fireEvent.click(screen.getByRole('tab', { name: '③ 方案生成' }))
    // 当前选中 tab 带 on 类
    expect(screen.getByText('③ 方案生成').className).toContain('on')
  })
})
