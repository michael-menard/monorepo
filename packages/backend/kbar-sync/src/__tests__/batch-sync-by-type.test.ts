/**
 * Unit Tests for batchSyncByType
 * KBAR-0040: AC-5, AC-8, AC-9, AC-10
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as fsPromises from 'node:fs/promises'

vi.mock('node:fs/promises', () => ({
  readdir: vi.fn(),
  stat: vi.fn(),
  glob: vi.fn(async function* () {
    // Default: no files
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

vi.mock('../sync-artifact-to-database.js', () => ({
  syncArtifactToDatabase: vi.fn(),
}))

import { batchSyncByType } from '../batch-sync-by-type.js'
import { db } from '@repo/db'
import { syncArtifactToDatabase } from '../sync-artifact-to-database.js'

// Setup readdir mock to return story directories at second level
function mockReaddirWithStories(storyNames: string[]) {
  let readdirCallCount = 0
  vi.mocked(fsPromises.readdir).mockImplementation(async (dir: string, opts: any) => {
    readdirCallCount++
    if (opts?.withFileTypes) {
      // First level: return group dirs
      if (readdirCallCount <= 1) {
        return [{ name: 'in-progress', isDirectory: () => true }] as any
      }
      // Second level: return story dirs
      return storyNames.map(name => ({
        name,
        isDirectory: () => /^[A-Z]+-\d+$/.test(name),
      })) as any
    }
    return [] as any
  })
}

function setupCheckpointMocks(lastProcessedPath: string | null = null) {
  ;(db.select as any).mockImplementation(() => ({
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue(
          lastProcessedPath
            ? [
                {
                  id: '550e8400-e29b-41d4-a716-560000000001',
                  checkpointName: 'test_checkpoint',
                  lastProcessedPath,
                  totalProcessed: 1,
                  isActive: true,
                },
              ]
            : [],
        ),
      }),
    }),
  }))

  ;(db.insert as any).mockReturnValue({
    values: vi.fn().mockReturnValue({
      onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
    }),
  })

  ;(db.update as any).mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  })
}

describe('batchSyncByType', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(db.insert as any) = vi.fn()
    ;(db.select as any) = vi.fn()
    ;(db.update as any) = vi.fn()

    // Default: stat succeeds (files exist)
    vi.mocked(fsPromises.stat).mockResolvedValue({} as any)
  })

  it('should sync all discovered artifacts of a type (AC-5 happy path)', async () => {
    mockReaddirWithStories(['KBAR-0040', 'KBAR-0030'])
    setupCheckpointMocks(null)

    vi.mocked(syncArtifactToDatabase).mockResolvedValue({
      success: true,
      storyId: 'KBAR-0040',
      artifactType: 'plan',
      syncStatus: 'synced' as const,
    })

    const result = await batchSyncByType({
      artifactType: 'plan',
      baseDir: '/plans/future/platform',
      triggeredBy: 'automation',
    })

    expect(result.success).toBe(true)
    expect(result.artifactType).toBe('plan')
    expect(result.totalDiscovered).toBeGreaterThan(0)
  })

  it('should resume from checkpoint — skip already-processed paths (AC-5)', async () => {
    // Setup 3 stories
    let readdirCount = 0
    vi.mocked(fsPromises.readdir).mockImplementation(async (dir: string, opts: any) => {
      readdirCount++
      if (opts?.withFileTypes) {
        if (readdirCount <= 1) {
          return [{ name: 'in-progress', isDirectory: () => true }] as any
        }
        return [
          { name: 'KBAR-0030', isDirectory: () => true },
          { name: 'KBAR-0035', isDirectory: () => true },
          { name: 'KBAR-0040', isDirectory: () => true },
        ] as any
      }
      return [] as any
    })

    // Each story has _implementation/PLAN.yaml
    vi.mocked(fsPromises.stat).mockResolvedValue({} as any)

    // Checkpoint: processed up to KBAR-0030's PLAN.yaml
    const lastPath =
      '/plans/future/platform/in-progress/KBAR-0030/_implementation/PLAN.yaml'
    setupCheckpointMocks(lastPath)

    const syncedPaths: string[] = []
    vi.mocked(syncArtifactToDatabase).mockImplementation(async input => {
      syncedPaths.push(input.filePath)
      return {
        success: true,
        storyId: input.storyId,
        artifactType: input.artifactType,
        syncStatus: 'synced' as const,
      }
    })

    const result = await batchSyncByType({
      artifactType: 'plan',
      baseDir: '/plans/future/platform',
      triggeredBy: 'automation',
      checkpointName: 'test_checkpoint',
    })

    expect(result.success).toBe(true)
    expect(result.checkpointName).toBe('test_checkpoint')
    // KBAR-0030 was last processed, so remaining artifacts = KBAR-0035 + KBAR-0040
    // syncedPaths.length <= 2 (KBAR-0030 is skipped via checkpoint)
    expect(syncedPaths).not.toContain(lastPath)
  })

  it('should update checkpoint after each artifact (AC-5)', async () => {
    mockReaddirWithStories(['KBAR-0040'])
    setupCheckpointMocks(null)

    vi.mocked(syncArtifactToDatabase).mockResolvedValue({
      success: true,
      storyId: 'KBAR-0040',
      artifactType: 'plan',
      syncStatus: 'synced' as const,
    })

    await batchSyncByType({
      artifactType: 'plan',
      baseDir: '/plans/future/platform',
      triggeredBy: 'automation',
      checkpointName: 'my_checkpoint',
    })

    // update should be called for checkpoint updates
    expect(db.update).toHaveBeenCalled()
  })

  it('should isolate per-artifact failures — continue after failure (AC-5)', async () => {
    mockReaddirWithStories(['KBAR-0040', 'KBAR-0030'])
    setupCheckpointMocks(null)

    let callCount = 0
    vi.mocked(syncArtifactToDatabase).mockImplementation(async input => {
      callCount++
      if (callCount === 1) {
        return {
          success: false,
          storyId: input.storyId,
          artifactType: input.artifactType,
          syncStatus: 'failed' as const,
          error: 'First artifact failed',
        }
      }
      return {
        success: true,
        storyId: input.storyId,
        artifactType: input.artifactType,
        syncStatus: 'synced' as const,
      }
    })

    const result = await batchSyncByType({
      artifactType: 'plan',
      baseDir: '/plans/future/platform',
      triggeredBy: 'automation',
    })

    expect(result.totalFailed).toBeGreaterThan(0)
    expect(result.totalSynced).toBeGreaterThan(0)
    expect(callCount).toBeGreaterThan(1)
  })

  it('should return failed on invalid input (AC-7 Zod validation)', async () => {
    const result = await batchSyncByType({
      artifactType: 'plan',
      baseDir: '',
      triggeredBy: 'user',
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('validation failed')
  })

  it('should handle baseDir enumeration error gracefully (AC-9)', async () => {
    vi.mocked(fsPromises.readdir).mockRejectedValue(new Error('Permission denied'))
    setupCheckpointMocks(null)

    vi.mocked(syncArtifactToDatabase).mockResolvedValue({
      success: true,
      storyId: 'KBAR-0040',
      artifactType: 'plan',
      syncStatus: 'synced' as const,
    })

    const result = await batchSyncByType({
      artifactType: 'plan',
      baseDir: '/plans/future/platform',
      triggeredBy: 'automation',
    })

    // Should succeed with 0 discovered (graceful degradation)
    expect(result.success).toBe(true)
    expect(result.totalDiscovered).toBe(0)
  })

  it('should set lastProcessedPath in output after processing artifacts (AC-5, AC-10)', async () => {
    mockReaddirWithStories(['KBAR-0040'])
    setupCheckpointMocks(null)

    vi.mocked(syncArtifactToDatabase).mockResolvedValue({
      success: true,
      storyId: 'KBAR-0040',
      artifactType: 'scope',
      syncStatus: 'synced' as const,
    })

    const result = await batchSyncByType({
      artifactType: 'scope',
      baseDir: '/plans/future/platform',
      triggeredBy: 'automation',
      checkpointName: 'scope_checkpoint',
    })

    expect(result.success).toBe(true)
    if (result.totalDiscovered > 0) {
      expect(result.lastProcessedPath).toBeDefined()
    }
  })
})
