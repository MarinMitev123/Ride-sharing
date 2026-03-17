import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getApiUrl, setGlobalErrorHandler } from './client'

describe('getApiUrl', () => {
  it('builds URL with path', () => {
    const url = getApiUrl('/rides')
    expect(url).toMatch(/\/api\/v1\/rides$/)
  })

  it('handles path without leading slash', () => {
    const url = getApiUrl('rides')
    expect(url).toMatch(/\/api\/v1\/rides$/)
  })
})

describe('setGlobalErrorHandler', () => {
  beforeEach(() => {
    setGlobalErrorHandler(() => {})
  })

  it('accepts a handler', () => {
    const handler = vi.fn()
    setGlobalErrorHandler(handler)
    expect(() => setGlobalErrorHandler(handler)).not.toThrow()
  })
})
