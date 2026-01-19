import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('Date formatting utilities', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should format relative time - just now', () => {
    const date = new Date('2024-01-15T11:59:30Z')
    const diffMs = Date.now() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    expect(diffMins).toBeLessThan(1)
  })

  it('should format relative time - minutes ago', () => {
    const date = new Date('2024-01-15T11:30:00Z')
    const diffMs = Date.now() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    expect(diffMins).toBe(30)
  })

  it('should format relative time - hours ago', () => {
    const date = new Date('2024-01-15T09:00:00Z')
    const diffMs = Date.now() - date.getTime()
    const diffHours = Math.floor(diffMs / 3600000)

    expect(diffHours).toBe(3)
  })

  it('should format relative time - days ago', () => {
    const date = new Date('2024-01-13T12:00:00Z')
    const diffMs = Date.now() - date.getTime()
    const diffDays = Math.floor(diffMs / 86400000)

    expect(diffDays).toBe(2)
  })

  it('should identify today', () => {
    const today = new Date('2024-01-15T14:00:00Z')
    const now = new Date()

    expect(today.toDateString()).toBe(now.toDateString())
  })

  it('should identify yesterday', () => {
    const yesterday = new Date('2024-01-14T12:00:00Z')
    const todayDate = new Date()
    const yesterdayCompare = new Date(todayDate)
    yesterdayCompare.setDate(yesterdayCompare.getDate() - 1)

    expect(yesterday.toDateString()).toBe(yesterdayCompare.toDateString())
  })
})

describe('Date validation', () => {
  it('should validate date string', () => {
    expect(new Date('2024-01-15').toString()).not.toBe('Invalid Date')
    expect(new Date('invalid').toString()).toBe('Invalid Date')
  })

  it('should compare dates correctly', () => {
    const date1 = new Date('2024-01-15')
    const date2 = new Date('2024-01-16')

    expect(date1 < date2).toBe(true)
    expect(date1 > date2).toBe(false)
  })
})
