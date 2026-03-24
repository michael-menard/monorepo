import { describe, it, expect, vi } from 'vitest'
import { RetryHandler } from '../middleware/retry.js'

// Mock @repo/logger
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

describe('RetryHandler', () => {
  it('returns result on success', async () => {
    const handler = new RetryHandler({ maxRetries: 3, baseDelayMs: 10 })
    const result = await handler.execute(async () => 42)
    expect(result).toBe(42)
  })

  it('retries on transient errors', async () => {
    const handler = new RetryHandler({ maxRetries: 3, baseDelayMs: 10 })
    let attempts = 0

    const result = await handler.execute(async () => {
      attempts++
      if (attempts < 3) throw new Error('ECONNRESET')
      return 'success'
    })

    expect(result).toBe('success')
    expect(attempts).toBe(3)
  })

  it('throws after max retries', async () => {
    const handler = new RetryHandler({ maxRetries: 2, baseDelayMs: 10 })

    await expect(
      handler.execute(async () => {
        throw new Error('timeout')
      }),
    ).rejects.toThrow('timeout')
  })

  it('does not retry on 404', async () => {
    const handler = new RetryHandler({ maxRetries: 3, baseDelayMs: 10 })
    let attempts = 0

    await expect(
      handler.execute(async () => {
        attempts++
        throw new Error('404 Not Found')
      }),
    ).rejects.toThrow('404')

    expect(attempts).toBe(1)
  })

  it('does not retry on 400', async () => {
    const handler = new RetryHandler({ maxRetries: 3, baseDelayMs: 10 })
    let attempts = 0

    await expect(
      handler.execute(async () => {
        attempts++
        throw new Error('400 Bad Request')
      }),
    ).rejects.toThrow('400')

    expect(attempts).toBe(1)
  })
})
