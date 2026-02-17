/**
 * Unit Tests for batchSyncArtifactsForStory
 * KBAR-0040: AC-4, AC-8, AC-9
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock filesystem operations
vi.mock('node:fs/promises', () => ({
  stat: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(),
  rename: vi.fn(),
  unlink: vi.fn(),
  mkdir: vi.fn(),
  glob: vi.fn(async function* () {
    // Default: no PROOF files
  }),
}))

vi.mock('../__types__/index.js', async importOriginal => {
  const actual = await importOriginal()
  return {
    ...actual,
    validateFilePath: vi.fn(() => true),
    validateNotSymlink: vi.fn(() => Promise.resolve(true)),
  }
})

vi.mock('@repo/db', () => {
  const mockDb = {
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
    transaction: vi.fn(),
  }
  return {
    db: mockDb,
    getDb: vi.fn(() => mockDb),
  }
})

vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

// Mock syncArtifactToDatabase to control per-artifact outcomes
vi.mock('../sync-artifact-to-database.js', () => ({
  syncArtifactToDatabase: vi.fn(),
}))

import { batchSyncArtifactsForStory } from '../batch-sync-artifacts.js'
import { db } from '@repo/db'
import { syncArtifactToDatabase } from '../sync-artifact-to-database.js'
import * as fsPromises from 'node:fs/promises'

function mockBatchSyncEvent() {
  ;(db.insert as any).mockReturnValue({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id: '550e8400-e29b-41d4-a716-446655440099' }]),
    }),
  })
  ;(db.update as any).mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  })
}

describe('batchSyncArtifactsForStory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(db.insert as any) = vi.fn()
    ;(db.update as any) = vi.fn()

    // Mock stat to return file exists for all paths by default
    vi.mocked(fsPromises.stat).mockResolvedValue({} as any)
  })

  it('should sync all discovered artifacts successfully (AC-4 all-success)', async () => {
    mockBatchSyncEvent()

    vi.mocked(syncArtifactToDatabase).mockResolvedValue({
      success: true,
      storyId: 'KBAR-0040',
      artifactType: 'plan',
      syncStatus: 'synced',
    })

    const result = await batchSyncArtifactsForStory({
      storyId: 'KBAR-0040',
      storyDir: '/plans/future/platform/in-progress/KBAR-0040',
      triggeredBy: 'user',
    })

    expect(result.success).toBe(true)
    expect(result.storyId).toBe('KBAR-0040')
    expect(result.totalDiscovered).toBeGreaterThan(0)
    expect(result.totalFailed).toBe(0)
    expect(result.syncEventId).toBe('550e8400-e29b-41d4-a716-446655440099')
  })

  it('should isolate failures and continue batch (AC-4 partial-failure isolation)', async () => {
    mockBatchSyncEvent()

    let callCount = 0
    vi.mocked(syncArtifactToDatabase).mockImplementation(async input => {
      callCount++
      if (input.artifactType === 'plan') {
        return {
          success: false,
          storyId: input.storyId,
          artifactType: input.artifactType,
          syncStatus: 'failed' as const,
          error: 'Plan sync failed',
        }
      }
      return {
        success: true,
        storyId: input.storyId,
        artifactType: input.artifactType,
        syncStatus: 'synced' as const,
      }
    })

    const result = await batchSyncArtifactsForStory({
      storyId: 'KBAR-0040',
      storyDir: '/plans/future/platform/in-progress/KBAR-0040',
      triggeredBy: 'automation',
    })

    // Batch should continue even with failures
    expect(result.success).toBe(true) // partial success = overall success
    expect(result.totalFailed).toBeGreaterThan(0)
    expect(result.totalSynced).toBeGreaterThan(0)
    expect(callCount).toBeGreaterThan(1) // proved batch continued past failures
  })

  it('should return failed when all artifacts fail (AC-4 all-failure)', async () => {
    mockBatchSyncEvent()

    vi.mocked(syncArtifactToDatabase).mockResolvedValue({
      success: false,
      storyId: 'KBAR-0040',
      artifactType: 'plan',
      syncStatus: 'failed' as const,
      error: 'DB error',
    })

    const result = await batchSyncArtifactsForStory({
      storyId: 'KBAR-0040',
      storyDir: '/plans/future/platform/in-progress/KBAR-0040',
      triggeredBy: 'user',
    })

    expect(result.success).toBe(false)
    expect(result.totalSynced).toBe(0)
    expect(result.totalSkipped).toBe(0)
  })

  it('should count skipped artifacts separately (AC-4)', async () => {
    mockBatchSyncEvent()

    vi.mocked(syncArtifactToDatabase).mockResolvedValue({
      success: true,
      storyId: 'KBAR-0040',
      artifactType: 'plan',
      syncStatus: 'skipped' as const,
      skipped: true,
    })

    const result = await batchSyncArtifactsForStory({
      storyId: 'KBAR-0040',
      storyDir: '/plans/future/platform/in-progress/KBAR-0040',
      triggeredBy: 'user',
    })

    expect(result.success).toBe(true)
    expect(result.totalSkipped).toBeGreaterThan(0)
    expect(result.totalFailed).toBe(0)
  })

  it('should create single syncEvent for entire batch (AC-4)', async () => {
    mockBatchSyncEvent()

    vi.mocked(syncArtifactToDatabase).mockResolvedValue({
      success: true,
      storyId: 'KBAR-0040',
      artifactType: 'plan',
      syncStatus: 'synced' as const,
    })

    await batchSyncArtifactsForStory({
      storyId: 'KBAR-0040',
      storyDir: '/plans/future/platform/in-progress/KBAR-0040',
      triggeredBy: 'user',
    })

    // Only one insert for the batch syncEvent (individual artifact syncEvents created by syncArtifactToDatabase mock)
    expect(db.insert).toHaveBeenCalledTimes(1)
  })

  it('should return failed on invalid input (AC-7 Zod validation)', async () => {
    const result = await batchSyncArtifactsForStory({
      storyId: '',
      storyDir: '/plans',
      triggeredBy: 'user',
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('validation failed')
  })

  it('should handle non-existent files gracefully — skip missing artifacts', async () => {
    mockBatchSyncEvent()

    // stat fails for all files (none exist)
    vi.mocked(fsPromises.stat).mockRejectedValue(new Error('ENOENT: no such file or directory'))

    vi.mocked(syncArtifactToDatabase).mockResolvedValue({
      success: true,
      storyId: 'KBAR-0040',
      artifactType: 'plan',
      syncStatus: 'synced' as const,
    })

    const result = await batchSyncArtifactsForStory({
      storyId: 'KBAR-0040',
      storyDir: '/plans/future/platform/in-progress/KBAR-0040',
      triggeredBy: 'user',
    })

    // No files exist, but batch succeeds with 0 discovered
    expect(result.storyId).toBe('KBAR-0040')
    expect(result.totalDiscovered).toBe(0)
  })
})
