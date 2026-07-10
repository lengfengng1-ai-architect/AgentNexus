// MobileWorkbenchPage — smoke test
// OpenSpec: openspec/changes/add-mobile-workbench-preview · tasks 6.1
import { describe, expect, test } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MobileWorkbenchPage } from '../pages/mobile-workbench/MobileWorkbenchPage'

describe('MobileWorkbenchPage', () => {
  test('默认渲染手机框 / 5 个 Tab / ① 对话屏', () => {
    render(<MobileWorkbenchPage />)
    expect(document.querySelector('.phone')).not.toBeNull()
    expect(screen.getByText('① 对话入口')).toBeDefined()
    expect(screen.getByText('② 简报')).toBeDefined()
    expect(screen.getByText('③ 方案生成')).toBeDefined()
    expect(screen.getByText('④ 行动建议')).toBeDefined()
    expect(screen.getByText('⑤ 下发转达')).toBeDefined()
    // ① 屏初始 agent 气泡 + 输入栏
    expect(screen.getByText(/你好，我是营销方案助手/)).toBeDefined()
    expect(screen.getByPlaceholderText('给 Agent 发消息…')).toBeDefined()
  })

  test('发送消息追加 user 气泡并收到 agent 回复', async () => {
    render(<MobileWorkbenchPage />)
    const input = screen.getByPlaceholderText('给 Agent 发消息…')
    const send = screen.getByLabelText('发送')
    fireEvent.change(input, { target: { value: '帮我做蓝莓饮品方案' } })
    fireEvent.click(send)
    expect(screen.getByText('帮我做蓝莓饮品方案')).toBeDefined()
    expect((input as HTMLInputElement).value).toBe('')
    await waitFor(() => {
      expect(screen.getByText(/收到，正在按 4M\+1C 拆解/)).toBeDefined()
    })
  })

  test('空消息不可发送', () => {
    render(<MobileWorkbenchPage />)
    const before = document.querySelectorAll('.bubble').length
    fireEvent.click(screen.getByLabelText('发送'))
    expect(document.querySelectorAll('.bubble').length).toBe(before)
  })

  test('点击快捷「填写简报」切到 ② 简报', () => {
    render(<MobileWorkbenchPage />)
    fireEvent.click(screen.getByText('填写简报'))
    expect(screen.getByText('方案简报')).toBeDefined()
    expect(screen.getByText('② 简报').className).toContain('on')
    expect(screen.queryByPlaceholderText('给 Agent 发消息…')).toBeNull()
  })

  test('点击 chat-card「去填写」也切到 ② 简报', () => {
    render(<MobileWorkbenchPage />)
    fireEvent.click(screen.getByText('去填写 ›'))
    expect(screen.getByText('方案简报')).toBeDefined()
    expect(screen.getByText('② 简报').className).toContain('on')
  })
})
