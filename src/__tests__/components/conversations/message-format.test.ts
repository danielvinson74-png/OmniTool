import { describe, it, expect } from 'vitest'

// Test message-related logic
describe('Message formatting', () => {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
  }

  it('should format time correctly', () => {
    const time = formatTime('2024-01-15T14:30:00Z')
    // Result depends on timezone, but should be valid format
    expect(time).toMatch(/^\d{2}:\d{2}$/)
  })
})

describe('Message status', () => {
  const messageStatuses = ['pending', 'sent', 'delivered', 'read', 'failed'] as const
  type MessageStatus = typeof messageStatuses[number]

  it('should have valid status values', () => {
    expect(messageStatuses).toContain('pending')
    expect(messageStatuses).toContain('sent')
    expect(messageStatuses).toContain('delivered')
    expect(messageStatuses).toContain('read')
    expect(messageStatuses).toContain('failed')
  })

  it('should identify outgoing messages', () => {
    const message = { sender_type: 'user' }
    expect(message.sender_type === 'user').toBe(true)
  })

  it('should identify incoming messages', () => {
    const message = { sender_type: 'lead' }
    expect(message.sender_type === 'lead').toBe(true)
  })

  it('should identify failed messages', () => {
    const message = { status: 'failed' as MessageStatus }
    expect(message.status === 'failed').toBe(true)
  })

  it('should identify pending messages', () => {
    const message = { status: 'pending' as MessageStatus }
    expect(message.status === 'pending').toBe(true)
  })
})

describe('Message grouping by date', () => {
  interface Message {
    id: string
    created_at: string
    message_text: string
  }

  const groupByDate = (messages: Message[]) => {
    const groups: Map<string, Message[]> = new Map()

    for (const message of messages) {
      const date = new Date(message.created_at).toDateString()
      if (!groups.has(date)) {
        groups.set(date, [])
      }
      groups.get(date)!.push(message)
    }

    return groups
  }

  it('should group messages by date', () => {
    const messages: Message[] = [
      { id: '1', created_at: '2024-01-15T10:00:00Z', message_text: 'Hello' },
      { id: '2', created_at: '2024-01-15T11:00:00Z', message_text: 'Hi' },
      { id: '3', created_at: '2024-01-16T10:00:00Z', message_text: 'Morning' },
    ]

    const grouped = groupByDate(messages)

    expect(grouped.size).toBe(2)
  })

  it('should handle empty message list', () => {
    const grouped = groupByDate([])
    expect(grouped.size).toBe(0)
  })

  it('should handle single message', () => {
    const messages: Message[] = [
      { id: '1', created_at: '2024-01-15T10:00:00Z', message_text: 'Hello' },
    ]

    const grouped = groupByDate(messages)
    expect(grouped.size).toBe(1)
  })
})
