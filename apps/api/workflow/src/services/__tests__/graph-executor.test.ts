import { describe, it, expect, vi } from 'vitest'
import { executeDevImplementV2 } from '../graph-executor.js'

vi.mock('@repo/logger', () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

describe('executeDevImplementV2', () => {
  it('executes graph and returns completed status', async () => {
    const result = await executeDevImplementV2({ storyId: 'TEST-001', enableCheckpointing: true })

    expect(result.storyId).toBe('TEST-001')
    expect(result.threadId).toBeDefined()
    expect(['completed', 'failed']).toContain(result.status)
    expect(result.durationMs).toBeGreaterThan(0)
  })

  it('generates threadId when not provided', async () => {
    const result = await executeDevImplementV2({ storyId: 'TEST-002', enableCheckpointing: true })
    expect(result.threadId).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('uses provided threadId', async () => {
    const threadId = '12345678-1234-1234-1234-123456789012'
    const result = await executeDevImplementV2({
      storyId: 'TEST-003',
      threadId,
      enableCheckpointing: true,
    })
    expect(result.threadId).toBe(threadId)
  })
})
