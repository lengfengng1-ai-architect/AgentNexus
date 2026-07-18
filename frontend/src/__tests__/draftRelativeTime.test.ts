import { describe, expect, test } from 'vitest'
import { relativeTime } from '../pages/mobile-workbench/ScreenDraftList'

const now = Date.now()

function isoFromOffsetMs(ms: number): string {
  return new Date(now + ms).toISOString()
}

describe('relativeTime', () => {
  test('几分钟内显示"刚刚"', () => {
    expect(relativeTime(isoFromOffsetMs(-30 * 1000))).toBe('刚刚')
    expect(relativeTime(isoFromOffsetMs(-59 * 1000))).toBe('刚刚')
  })

  test('分钟级显示 N分钟前', () => {
    expect(relativeTime(isoFromOffsetMs(-5 * 60 * 1000))).toBe('5分钟前')
  })

  test('小时级显示 N小时前', () => {
    expect(relativeTime(isoFromOffsetMs(-3 * 3600 * 1000))).toBe('3小时前')
  })

  test('满 24 小时显示"昨天"', () => {
    expect(relativeTime(isoFromOffsetMs(-26 * 3600 * 1000))).toBe('昨天')
  })

  test('2-6 天显示 N天前', () => {
    expect(relativeTime(isoFromOffsetMs(-3 * 24 * 3600 * 1000))).toBe('3天前')
  })

  test('超过一周回退到日期', () => {
    const past = new Date(now - 10 * 24 * 3600 * 1000)
    const result = relativeTime(past.toISOString())
    expect(result).toMatch(/月/)
  })

  test('非法输入返回空串', () => {
    expect(relativeTime('')).toBe('')
    expect(relativeTime('not-a-date')).toBe('')
  })
})
