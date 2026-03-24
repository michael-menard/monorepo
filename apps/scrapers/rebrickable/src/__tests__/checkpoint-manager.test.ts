import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock database modules before import
vi.mock('../db/client.js', () => ({
  getDbClient: vi.fn(() => ({
    insert: vi.fn(() => ({
      values: vi.fn(() => Promise.resolve()),
    })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([])),
          })),
        })),
      })),
    })),
  })),
}))

vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// Note: Full checkpoint manager tests require a real database connection.
// These tests verify the module can be imported and constructed.
describe('CheckpointManager', () => {
  it('module imports without error', async () => {
    const mod = await import('../checkpoint/manager.js')
    expect(mod.CheckpointManager).toBeDefined()
  })

  it('constructs with a scrape run ID', async () => {
    const { CheckpointManager } = await import('../checkpoint/manager.js')
    const manager = new CheckpointManager('test-uuid-1234')
    expect(manager).toBeDefined()
  })
})
