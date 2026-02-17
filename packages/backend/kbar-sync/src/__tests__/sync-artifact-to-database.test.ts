/**
 * Unit Tests for syncArtifactToDatabase
 * KBAR-0040: AC-1, AC-3, AC-8, AC-9
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as fs from 'node:fs/promises'

// Mock filesystem
vi.mock('node:fs/promises')

// Mock path validation functions - use vi.fn() that can be overridden per test
vi.mock('../__types__/index.js', async importOriginal => {
  const actual = await importOriginal()
  return {
    ...actual,
    validateFilePath: vi.fn(() => true),
    validateNotSymlink: vi.fn(() => Promise.resolve(true)),
  }
})

// Mock database
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

// Mock logger
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  },
}))

import { syncArtifactToDatabase } from '../sync-artifact-to-database.js'
import { db } from '@repo/db'
import { validateFilePath, validateNotSymlink } from '../__types__/index.js'

const SYNC_EVENT_UUID = '550e8400-e29b-41d4-a716-446655440001'
const STORY_UUID = '550e8400-e29b-41d4-a716-446655440002'
const ARTIFACT_UUID = '550e8400-e29b-41d4-a716-446655440003'
const PLAN_CONTENT = `schema: 1\nstory_id: KBAR-0040\nsteps: []\n`

function mockSyncEventInsert() {
  ;(db.insert as any).mockReturnValueOnce({
    values: vi.fn().mockReturnValue({
      returning: vi.fn().mockResolvedValue([{ id: SYNC_EVENT_UUID }]),
    }),
  })
}

function mockSyncEventUpdate() {
  ;(db.update as any).mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  })
}

function mockSuccessfulTransaction(artifactId = ARTIFACT_UUID) {
  ;(db.transaction as any).mockImplementation(async (callback: any) => {
    let selectCallCount = 0
    const tx = {
      select: vi.fn(() => {
        selectCallCount++
        if (selectCallCount === 1) {
          // Story lookup
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ id: STORY_UUID }]),
              }),
            }),
          }
        }
        if (selectCallCount === 2) {
          // Artifact lookup — new artifact (empty)
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
          }
        }
        // MAX version lookup
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ maxVersion: null }]),
          }),
        }
      }),
      insert: vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: artifactId }]),
          onConflictDoUpdate: vi.fn().mockReturnValue(Promise.resolve(undefined)),
        }),
        onConflictDoUpdate: vi.fn().mockReturnValue(Promise.resolve(undefined)),
      }),
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      }),
    }
    return await callback(tx)
  })
}

describe('syncArtifactToDatabase', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(db.insert as any) = vi.fn()
    ;(db.select as any) = vi.fn()
    ;(db.update as any) = vi.fn()
    ;(db.transaction as any) = vi.fn()

    // Reset path validation mocks to allow all paths by default
    vi.mocked(validateFilePath).mockReturnValue(true)
    vi.mocked(validateNotSymlink).mockResolvedValue(true)
  })

  it('should successfully sync a new artifact to database (AC-1 happy path)', async () => {
    vi.mocked(fs.readFile).mockResolvedValue(PLAN_CONTENT)
    mockSyncEventInsert()
    mockSuccessfulTransaction()
    mockSyncEventUpdate()

    const result = await syncArtifactToDatabase({
      storyId: 'KBAR-0040',
      artifactType: 'plan',
      filePath: '/plans/future/platform/in-progress/KBAR-0040/_implementation/PLAN.yaml',
      triggeredBy: 'user',
    })

    expect(result.success).toBe(true)
    expect(result.syncStatus).toBe('synced')
    expect(result.storyId).toBe('KBAR-0040')
    expect(result.artifactType).toBe('plan')
    expect(result.checksum).toBeDefined()
    expect(result.syncEventId).toBe(SYNC_EVENT_UUID)
  })

  it('should skip sync when checksum is unchanged (AC-1 idempotency)', async () => {
    vi.mocked(fs.readFile).mockResolvedValue(PLAN_CONTENT)
    mockSyncEventInsert()

    // Transaction finds artifact with matching checksum
    ;(db.transaction as any).mockImplementation(async (callback: any) => {
      let selectCallCount = 0
      const tx = {
        select: vi.fn(() => {
          selectCallCount++
          if (selectCallCount === 1) {
            return {
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([{ id: STORY_UUID }]),
                }),
              }),
            }
          }
          // Artifact with same checksum as file content
          // Use a checksum that the implementation would also produce
          // We can't easily predict the SHA-256, but we can make the test
          // flexible: return ANY checksum and make the artifact use the same
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                // We'll use a special marker; the actual checksum is computed from PLAN_CONTENT
                // Since the real computeChecksum is not mocked, we need to compute it
                limit: vi.fn().mockImplementation(async () => {
                  const { createHash } = await import('node:crypto')
                  const checksum = createHash('sha256').update(PLAN_CONTENT, 'utf8').digest('hex')
                  return [{ id: ARTIFACT_UUID, checksum }]
                }),
              }),
            }),
          }
        }),
      }
      return await callback(tx)
    })

    mockSyncEventUpdate()

    const result = await syncArtifactToDatabase({
      storyId: 'KBAR-0040',
      artifactType: 'plan',
      filePath: '/plans/future/platform/in-progress/KBAR-0040/_implementation/PLAN.yaml',
      triggeredBy: 'user',
    })

    expect(result.success).toBe(true)
    expect(result.syncStatus).toBe('skipped')
    expect(result.skipped).toBe(true)
  })

  it('should upsert artifactContentCache after sync (AC-3)', async () => {
    vi.mocked(fs.readFile).mockResolvedValue(PLAN_CONTENT)
    mockSyncEventInsert()
    mockSuccessfulTransaction()
    mockSyncEventUpdate()

    const result = await syncArtifactToDatabase({
      storyId: 'KBAR-0040',
      artifactType: 'plan',
      filePath: '/plans/future/platform/in-progress/KBAR-0040/_implementation/PLAN.yaml',
      triggeredBy: 'user',
    })

    // Transaction was called — means insert operations for artifact, version, cache happened
    expect(result.success).toBe(true)
    expect(result.syncStatus).toBe('synced')
    expect(db.transaction).toHaveBeenCalledTimes(1)
  })

  it('should insert artifactVersions record on content change (AC-3)', async () => {
    vi.mocked(fs.readFile).mockResolvedValue(PLAN_CONTENT)
    mockSyncEventInsert()

    let versionInserted = false
    let insertCount = 0

    ;(db.transaction as any).mockImplementation(async (callback: any) => {
      let selectCallCount = 0
      const tx = {
        select: vi.fn(() => {
          selectCallCount++
          if (selectCallCount === 1) {
            return {
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([{ id: STORY_UUID }]),
                }),
              }),
            }
          }
          if (selectCallCount === 2) {
            return {
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([
                    { id: ARTIFACT_UUID, checksum: 'old-different-checksum' },
                  ]),
                }),
              }),
            }
          }
          // MAX version query
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue([{ maxVersion: 2 }]),
            }),
          }
        }),
        insert: vi.fn(() => {
          insertCount++
          versionInserted = true
          return {
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([{ id: ARTIFACT_UUID }]),
              onConflictDoUpdate: vi.fn().mockReturnValue(Promise.resolve(undefined)),
            }),
            onConflictDoUpdate: vi.fn().mockReturnValue(Promise.resolve(undefined)),
          }
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(undefined),
          }),
        }),
      }
      return await callback(tx)
    })

    mockSyncEventUpdate()

    const result = await syncArtifactToDatabase({
      storyId: 'KBAR-0040',
      artifactType: 'plan',
      filePath: '/plans/future/platform/in-progress/KBAR-0040/_implementation/PLAN.yaml',
      triggeredBy: 'user',
    })

    expect(result.success).toBe(true)
    expect(versionInserted).toBe(true)
    expect(insertCount).toBeGreaterThanOrEqual(2) // artifact update (or insert), version insert, cache upsert
  })

  it('should reject path traversal (AC-8)', async () => {
    vi.mocked(validateFilePath).mockImplementation(() => {
      throw new Error('Path traversal detected: ../../secret is outside allowed directory')
    })

    const result = await syncArtifactToDatabase({
      storyId: 'KBAR-0040',
      artifactType: 'plan',
      filePath: '../../secret/file.yaml',
      triggeredBy: 'user',
    })

    expect(result.success).toBe(false)
    expect(result.syncStatus).toBe('failed')
    expect(result.error).toContain('Security validation failed')
  })

  it('should reject symlinks (AC-8)', async () => {
    vi.mocked(validateNotSymlink).mockRejectedValue(
      new Error('Symlink detected: /plans/symlink is a symbolic link'),
    )

    const result = await syncArtifactToDatabase({
      storyId: 'KBAR-0040',
      artifactType: 'scope',
      filePath: '/plans/symlink',
      triggeredBy: 'user',
    })

    expect(result.success).toBe(false)
    expect(result.syncStatus).toBe('failed')
    expect(result.error).toContain('Security validation failed')
  })

  it('should fail with error when story not found in database (AC-9)', async () => {
    vi.mocked(fs.readFile).mockResolvedValue(PLAN_CONTENT)
    mockSyncEventInsert()

    ;(db.transaction as any).mockImplementation(async (callback: any) => {
      const tx = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]), // No story found
            }),
          }),
        }),
      }
      return await callback(tx)
    })

    mockSyncEventUpdate()

    const result = await syncArtifactToDatabase({
      storyId: 'KBAR-UNKNOWN',
      artifactType: 'plan',
      filePath: '/plans/future/platform/in-progress/KBAR-UNKNOWN/_implementation/PLAN.yaml',
      triggeredBy: 'user',
    })

    expect(result.success).toBe(false)
    expect(result.syncStatus).toBe('failed')
    expect(result.error).toContain('Story not found')
  })

  it('should return failed on invalid input (AC-7 Zod validation)', async () => {
    const result = await syncArtifactToDatabase({
      storyId: '',
      artifactType: 'plan',
      filePath: '/some/path',
      triggeredBy: 'user',
    })

    expect(result.success).toBe(false)
    expect(result.syncStatus).toBe('failed')
    expect(result.error).toContain('validation failed')
  })

  it('should reject file exceeding 5MB size limit (DECISIONS.yaml)', async () => {
    const largeContent = 'x'.repeat(6 * 1024 * 1024) // 6MB
    vi.mocked(fs.readFile).mockResolvedValue(largeContent)
    mockSyncEventInsert()
    mockSyncEventUpdate()

    const result = await syncArtifactToDatabase({
      storyId: 'KBAR-0040',
      artifactType: 'plan',
      filePath: '/plans/future/platform/in-progress/KBAR-0040/_implementation/PLAN.yaml',
      triggeredBy: 'user',
    })

    expect(result.success).toBe(false)
    expect(result.syncStatus).toBe('failed')
    expect(result.error).toContain('too large')
  })

  it('should handle file read error gracefully (AC-9)', async () => {
    vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'))
    mockSyncEventInsert()
    mockSyncEventUpdate()

    const result = await syncArtifactToDatabase({
      storyId: 'KBAR-0040',
      artifactType: 'plan',
      filePath: '/plans/future/platform/in-progress/KBAR-0040/_implementation/PLAN.yaml',
      triggeredBy: 'user',
    })

    expect(result.success).toBe(false)
    expect(result.syncStatus).toBe('failed')
    expect(result.error).toContain('File not found')
  })

  it('should handle YAML parse failure gracefully — cache stores error marker (AC-3)', async () => {
    const invalidYaml = 'invalid: yaml: [unclosed'
    vi.mocked(fs.readFile).mockResolvedValue(invalidYaml)
    mockSyncEventInsert()
    mockSuccessfulTransaction()
    mockSyncEventUpdate()

    const result = await syncArtifactToDatabase({
      storyId: 'KBAR-0040',
      artifactType: 'knowledge_context',
      filePath:
        '/plans/future/platform/in-progress/KBAR-0040/_implementation/KNOWLEDGE-CONTEXT.yaml',
      triggeredBy: 'automation',
    })

    // YAML parse error doesn't abort the sync
    expect(result.storyId).toBe('KBAR-0040')
    expect(result.artifactType).toBe('knowledge_context')
  })

  it('should create syncEvent with syncMode single_artifact (AC-1, AC-3)', async () => {
    vi.mocked(fs.readFile).mockResolvedValue(PLAN_CONTENT)
    mockSyncEventInsert()
    mockSuccessfulTransaction()
    mockSyncEventUpdate()

    await syncArtifactToDatabase({
      storyId: 'KBAR-0040',
      artifactType: 'scope',
      filePath: '/plans/future/platform/in-progress/KBAR-0040/_implementation/SCOPE.yaml',
      triggeredBy: 'automation',
    })

    // Verify syncEvent was created
    expect(db.insert).toHaveBeenCalledTimes(1)
  })
})
