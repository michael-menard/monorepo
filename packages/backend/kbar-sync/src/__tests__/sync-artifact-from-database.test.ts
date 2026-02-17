/**
 * Unit Tests for syncArtifactFromDatabase
 * KBAR-0040: AC-2, AC-3, AC-8, AC-9
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as fs from 'node:fs/promises'

vi.mock('node:fs/promises')

vi.mock('../__types__/index.js', async importOriginal => {
  const actual = await importOriginal()
  return {
    ...actual,
    validateFilePath: vi.fn(() => true),
    validateNotSymlink: vi.fn(() => Promise.resolve(true)),
    normalizeOptionalField: actual.normalizeOptionalField,
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

import { syncArtifactFromDatabase } from '../sync-artifact-from-database.js'
import { db } from '@repo/db'
import { validateFilePath, validateNotSymlink } from '../__types__/index.js'

const STORY_UUID = '550e8400-e29b-41d4-a716-550000000001'
const ARTIFACT_UUID = '550e8400-e29b-41d4-a716-550000000002'
const CACHE_UUID = '550e8400-e29b-41d4-a716-550000000003'
const SYNC_EVENT_UUID = '550e8400-e29b-41d4-a716-550000000004'
const CHECKSUM = 'b'.repeat(64)

const MOCK_ARTIFACT = {
  id: ARTIFACT_UUID,
  storyId: STORY_UUID,
  artifactType: 'plan',
  filePath: '/plans/KBAR-0040/_implementation/PLAN.yaml',
  checksum: CHECKSUM,
  syncStatus: 'completed',
  lastSyncedAt: new Date(),
  metadata: { sizeBytes: 1000 },
  createdAt: new Date(),
  updatedAt: new Date(),
}

function mockSyncEventInsert() {
  ;(db.insert as any).mockReturnValueOnce({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id: SYNC_EVENT_UUID }]),
    }),
  })
}

describe('syncArtifactFromDatabase', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(db.insert as any) = vi.fn()
    ;(db.select as any) = vi.fn()
    ;(db.update as any) = vi.fn()

    // Reset path validation to allow all paths
    vi.mocked(validateFilePath).mockReturnValue(true)
    vi.mocked(validateNotSymlink).mockResolvedValue(true)

    // Default FS mocks
    vi.mocked(fs.mkdir).mockResolvedValue(undefined)
    vi.mocked(fs.writeFile).mockResolvedValue(undefined)
    vi.mocked(fs.rename).mockResolvedValue(undefined)
    vi.mocked(fs.unlink).mockRejectedValue({ code: 'ENOENT' })
  })

  function mockSelectSequence(hasCacheHit = false) {
    let selectCount = 0
    ;(db.select as any).mockImplementation(() => {
      selectCount++

      if (selectCount === 1) {
        // Story lookup
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ id: STORY_UUID }]),
            }),
          }),
        }
      }

      if (selectCount === 2) {
        // Artifact lookup
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([MOCK_ARTIFACT]),
            }),
          }),
        }
      }

      // Cache lookup
      if (hasCacheHit) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([
                {
                  id: CACHE_UUID,
                  artifactId: ARTIFACT_UUID,
                  parsedContent: { schema: 1, steps: [] },
                  checksum: CHECKSUM, // Matches artifact checksum
                  hitCount: 5,
                  lastHitAt: new Date(),
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              ]),
            }),
          }),
        }
      }

      // Cache miss
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      }
    })

    ;(db.update as any).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })
  }

  it('should successfully sync artifact from database to filesystem (AC-2 happy path)', async () => {
    mockSyncEventInsert()
    mockSelectSequence(false)

    const result = await syncArtifactFromDatabase({
      storyId: 'KBAR-0040',
      artifactType: 'plan',
      outputPath: '/plans/future/platform/in-progress/KBAR-0040/_implementation/PLAN.yaml',
      triggeredBy: 'user',
    })

    expect(result.success).toBe(true)
    expect(result.syncStatus).toBe('synced')
    expect(result.storyId).toBe('KBAR-0040')
    expect(result.artifactType).toBe('plan')
    expect(result.filePath).toBeDefined()
    expect(result.syncEventId).toBe(SYNC_EVENT_UUID)
  })

  it('should use cache on cache hit and increment hitCount (AC-3)', async () => {
    mockSyncEventInsert()
    mockSelectSequence(true) // cache hit

    const result = await syncArtifactFromDatabase({
      storyId: 'KBAR-0040',
      artifactType: 'plan',
      outputPath: '/plans/future/platform/in-progress/KBAR-0040/_implementation/PLAN.yaml',
      triggeredBy: 'user',
    })

    expect(result.success).toBe(true)
    expect(result.cacheHit).toBe(true)
    // update called for hitCount + syncEvent
    expect(db.update).toHaveBeenCalled()
  })

  it('should write to temp file then rename (atomic write, AC-2)', async () => {
    mockSyncEventInsert()
    mockSelectSequence(false)

    await syncArtifactFromDatabase({
      storyId: 'KBAR-0040',
      artifactType: 'plan',
      outputPath: '/plans/future/KBAR-0040/_implementation/PLAN.yaml',
      triggeredBy: 'user',
    })

    // Verify atomic write: writeFile to .tmp then rename
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('.tmp'),
      expect.any(String),
      'utf-8',
    )
    expect(fs.rename).toHaveBeenCalled()
  })

  it('should mkdir parent directory before writing (AC-2)', async () => {
    mockSyncEventInsert()
    mockSelectSequence(false)

    await syncArtifactFromDatabase({
      storyId: 'KBAR-0040',
      artifactType: 'plan',
      outputPath: '/plans/future/KBAR-0040/_implementation/PLAN.yaml',
      triggeredBy: 'user',
    })

    expect(fs.mkdir).toHaveBeenCalledWith(expect.any(String), { recursive: true })
  })

  it('should reject path traversal (AC-8)', async () => {
    vi.mocked(validateFilePath).mockImplementation(() => {
      throw new Error('Path traversal detected')
    })

    const result = await syncArtifactFromDatabase({
      storyId: 'KBAR-0040',
      artifactType: 'plan',
      outputPath: '../../etc/passwd',
      triggeredBy: 'user',
    })

    expect(result.success).toBe(false)
    expect(result.syncStatus).toBe('failed')
    expect(result.error).toContain('Security validation failed')
  })

  it('should reject symlinks (AC-8)', async () => {
    vi.mocked(validateNotSymlink).mockRejectedValue(new Error('Symlink detected'))

    const result = await syncArtifactFromDatabase({
      storyId: 'KBAR-0040',
      artifactType: 'plan',
      outputPath: '/plans/symlink-to-secret',
      triggeredBy: 'user',
    })

    expect(result.success).toBe(false)
    expect(result.syncStatus).toBe('failed')
    expect(result.error).toContain('Security validation failed')
  })

  it('should handle story not found in database gracefully (AC-9)', async () => {
    mockSyncEventInsert()

    ;(db.select as any).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]), // No story
        }),
      }),
    })

    ;(db.update as any).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })

    const result = await syncArtifactFromDatabase({
      storyId: 'KBAR-UNKNOWN',
      artifactType: 'plan',
      outputPath: '/plans/future/platform/in-progress/KBAR-UNKNOWN/_implementation/PLAN.yaml',
      triggeredBy: 'user',
    })

    expect(result.success).toBe(false)
    expect(result.syncStatus).toBe('failed')
    expect(result.error).toContain('Story not found')
  })

  it('should handle artifact not found in database gracefully (AC-9)', async () => {
    mockSyncEventInsert()

    let selectCount = 0
    ;(db.select as any).mockImplementation(() => {
      selectCount++
      if (selectCount === 1) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ id: STORY_UUID }]),
            }),
          }),
        }
      }
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]), // No artifact
          }),
        }),
      }
    })

    ;(db.update as any).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })

    const result = await syncArtifactFromDatabase({
      storyId: 'KBAR-0040',
      artifactType: 'evidence',
      outputPath: '/plans/future/KBAR-0040/_implementation/EVIDENCE.yaml',
      triggeredBy: 'user',
    })

    expect(result.success).toBe(false)
    expect(result.syncStatus).toBe('failed')
    expect(result.error).toContain('Artifact not found')
  })

  it('should return failed on invalid input (AC-7 Zod validation)', async () => {
    const result = await syncArtifactFromDatabase({
      storyId: '',
      artifactType: 'plan',
      outputPath: '/some/path',
      triggeredBy: 'user',
    })

    expect(result.success).toBe(false)
    expect(result.syncStatus).toBe('failed')
    expect(result.error).toContain('validation failed')
  })
})
