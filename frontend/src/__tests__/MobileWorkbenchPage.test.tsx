// MobileWorkbenchPage — smoke test
// ScreenChat 已改为 useChat 对接后端，初始无硬编码消息
import { describe, expect, test } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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
  })

  test('空消息时发送按钮禁用', () => {
    render(<MobileWorkbenchPage />)
    const send = screen.getByLabelText('发送')
    expect(send.hasAttribute('disabled')).toBe(true)
  })

  test('点击「填写简报」切到 ② 简报屏', () => {
    render(<MobileWorkbenchPage />)
    fireEvent.click(screen.getByText('填写简报'))
    expect(screen.getByText('方案简报')).toBeDefined()
    expect(screen.getByText('② 简报').className).toContain('on')
  })
})
