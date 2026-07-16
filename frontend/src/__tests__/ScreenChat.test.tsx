// OpenSpec: openspec/changes/mobile-chat-ui-redesign
// in_scope: mobile-chat-session
import { describe, expect, test, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MobileWorkbenchPage } from '../pages/mobile-workbench/MobileWorkbenchPage'

// 禁用 useChat 的 localStorage 加载与语音识别真实行为
describe('Mobile chat UI redesign', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // @ts-expect-error jsdom 没有 SpeechRecognition，测试中直接禁用语音识别
    globalThis.SpeechRecognition = undefined
    // @ts-expect-error jsdom 没有 webkitSpeechRecognition
    globalThis.webkitSpeechRecognition = undefined
  })

  test('空态默认显示推荐区', () => {
    render(<MobileWorkbenchPage />)
    // 无需聚焦，初始即显示推荐区
    expect(screen.getByText('Hi, 老板')).toBeDefined()
    expect(screen.getByText('让复杂，变简单')).toBeDefined()
    // 推荐卡片至少显示 4 个
    expect(document.querySelectorAll('.suggestion-card').length).toBe(4)
  })

  test('推荐区文案覆盖 7 个能力', () => {
    render(<MobileWorkbenchPage />)
    const labels = ['推荐方案生成', '预算评估', '市场分析', '创建盟域', '创建活动', '产品海报', '产品视频']
    // 每次随机展示 4 个；通过多刷新几次确保都能看到
    let seen = new Set<string>()
    for (let i = 0; i < 20 && seen.size < labels.length; i++) {
      fireEvent.click(screen.getByText('换一批'))
      for (const label of labels) {
        if (screen.queryByText(label)) seen.add(label)
      }
    }
    for (const label of labels) {
      expect(seen.has(label)).toBe(true)
    }
  })

  test('空输入时显示语音按钮，有文字时显示发送按钮', () => {
    render(<MobileWorkbenchPage />)
    expect(screen.getByLabelText('语音输入')).toBeDefined()
    const input = screen.getByPlaceholderText('给 Agent 发消息…') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'hello' } })
    expect(screen.queryByLabelText('语音输入')).toBeNull()
    expect(screen.getByLabelText('发送')).toBeDefined()
  })

  test('点击 + 号展开底部面板', () => {
    render(<MobileWorkbenchPage />)
    const plusBtn = screen.getByLabelText('展开菜单')
    fireEvent.click(plusBtn)
    expect(screen.getByText('上传附件')).toBeDefined()
    expect(screen.getByText('创作图片')).toBeDefined()
    expect(screen.getByText('创作视频')).toBeDefined()
    expect(screen.getByText('一句话生成产品海报')).toBeDefined()
    expect(screen.getByText('快速生成宣传视频')).toBeDefined()
  })

  test('再次点击 + 号关闭面板', async () => {
    render(<MobileWorkbenchPage />)
    const plusBtn = screen.getByLabelText('展开菜单')
    fireEvent.click(plusBtn)
    expect(screen.getByText('上传附件')).toBeDefined()
    fireEvent.click(plusBtn)
    await waitFor(() => {
      expect(screen.queryByText('上传附件')).toBeNull()
    })
  })

  test('点击面板外部关闭面板', async () => {
    render(<MobileWorkbenchPage />)
    fireEvent.click(screen.getByLabelText('展开菜单'))
    expect(screen.getByText('上传附件')).toBeDefined()
    fireEvent.click(document.querySelector('.cap-backdrop')!)
    await waitFor(() => {
      expect(screen.queryByText('上传附件')).toBeNull()
    })
  })

  test('发送消息后推荐区消失', async () => {
    render(<MobileWorkbenchPage />)
    // 初始显示推荐区
    expect(screen.getByText('Hi, 老板')).toBeDefined()
    const input = screen.getByPlaceholderText('给 Agent 发消息…') as HTMLInputElement
    fireEvent.change(input, { target: { value: '测试消息' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    // 等待消息加入 DOM
    await waitFor(() => {
      expect(screen.queryByText('测试消息')).not.toBeNull()
    })
    expect(screen.queryByText('Hi, 老板')).toBeNull()
  })
})
