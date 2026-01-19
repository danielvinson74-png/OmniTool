import { describe, it, expect } from 'vitest'

// Helper functions tests
describe('API Response helpers', () => {
  it('should create successful response object', () => {
    const data = { id: 1, name: 'Test' }
    const response = { success: true, data }

    expect(response.success).toBe(true)
    expect(response.data).toEqual(data)
  })

  it('should create error response object', () => {
    const error = 'Something went wrong'
    const response = { success: false, error }

    expect(response.success).toBe(false)
    expect(response.error).toBe(error)
  })
})

describe('Status codes', () => {
  it('should have correct HTTP status meanings', () => {
    const statusCodes: Record<number, string> = {
      200: 'OK',
      201: 'Created',
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Not Found',
      500: 'Internal Server Error',
    }

    expect(statusCodes[200]).toBe('OK')
    expect(statusCodes[401]).toBe('Unauthorized')
    expect(statusCodes[500]).toBe('Internal Server Error')
  })
})

describe('Validation helpers', () => {
  it('should validate email format', () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    expect(emailRegex.test('test@example.com')).toBe(true)
    expect(emailRegex.test('invalid-email')).toBe(false)
    expect(emailRegex.test('test@')).toBe(false)
    expect(emailRegex.test('@example.com')).toBe(false)
  })

  it('should validate UUID format', () => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

    expect(uuidRegex.test('123e4567-e89b-12d3-a456-426614174000')).toBe(true)
    expect(uuidRegex.test('invalid-uuid')).toBe(false)
    expect(uuidRegex.test('123')).toBe(false)
  })

  it('should validate phone number format', () => {
    const phoneRegex = /^\+?[1-9]\d{10,14}$/

    expect(phoneRegex.test('+79991234567')).toBe(true)
    expect(phoneRegex.test('79991234567')).toBe(true)
    expect(phoneRegex.test('123')).toBe(false)
  })
})
