/**
 * Unit Tests for detectArtifactConflicts
 * KBAR-0040: AC-6, AC-8, AC-9
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
    computeChecksum: actual.computeChecksum,
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

import { detectArtifactConflicts } from '../detect-artifact-conflicts.js'
import { db } from '@repo/db'
import { validateFilePath, validateNotSymlink } from '../__types__/index.js'

const STORY_UUID = '550e8400-e29b-41d4-a716-440000000001'
const ARTIFACT_UUID = '550e8400-e29b-41d4-a716-440000000002'
const CONFLICT_UUID = '550e8400-e29b-41d4-a716-440000000003'
const SYNC_EVENT_UUID = '550e8400-e29b-41d4-a716-440000000004'

const FS_CONTENT = 'schema: 1\nstory_id: KBAR-0040\n'
const DB_CHECKSUM_DIFFERENT = 'aaaa'.repeat(16) // Deliberately different from actual content

function mockSyncEventInsertAndUpdate() {
  ;(db.insert as any)
    .mockReturnValueOnce({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: SYNC_EVENT_UUID }]),
      }),
    })
    .mockReturnValueOnce({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: CONFLICT_UUID }]),
      }),
    })

  ;(db.update as any).mockReturnValue({
    set: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  })
}

describe('detectArtifactConflicts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(db.insert as any) = vi.fn()
    ;(db.select as any) = vi.fn()
    ;(db.update as any) = vi.fn()

    vi.mocked(validateFilePath).mockReturnValue(true)
    vi.mocked(validateNotSymlink).mockResolvedValue(true)
  })

  it('should detect no conflict when checksums match (AC-6 no-conflict)', async () => {
    vi.mocked(fs.readFile).mockResolvedValue(FS_CONTENT)

    // SyncEvent insert
    ;(db.insert as any).mockReturnValueOnce({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: SYNC_EVENT_UUID }]),
      }),
    })

    // Compute actual checksum of FS_CONTENT
    const { createHash } = await import('node:crypto')
    const realChecksum = createHash('sha256').update(FS_CONTENT, 'utf8').digest('hex')

    let selectCallCount = 0
    ;(db.select as any).mockImplementation(() => {
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
      // Artifact with matching checksum
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              { id: ARTIFACT_UUID, checksum: realChecksum, artifactType: 'plan' },
            ]),
          }),
        }),
      }
    })

    ;(db.update as any).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })

    const result = await detectArtifactConflicts({
      storyId: 'KBAR-0040',
      artifactType: 'plan',
      filePath: '/plans/future/platform/in-progress/KBAR-0040/_implementation/PLAN.yaml',
    })

    expect(result.success).toBe(true)
    expect(result.hasConflict).toBe(false)
    expect(result.conflictType).toBe('none')
    expect(result.storyId).toBe('KBAR-0040')
    expect(result.artifactType).toBe('plan')
  })

  it('should detect conflict on checksum mismatch and insert syncConflicts (AC-6)', async () => {
    vi.mocked(fs.readFile).mockResolvedValue(FS_CONTENT)

    // SyncEvent insert then conflict insert
    ;(db.insert as any)
      .mockReturnValueOnce({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: SYNC_EVENT_UUID }]),
        }),
      })
      .mockReturnValueOnce({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: CONFLICT_UUID }]),
        }),
      })

    let selectCallCount = 0
    ;(db.select as any).mockImplementation(() => {
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
      // Artifact with DIFFERENT checksum
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              { id: ARTIFACT_UUID, checksum: DB_CHECKSUM_DIFFERENT, artifactType: 'plan' },
            ]),
          }),
        }),
      }
    })

    ;(db.update as any).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })

    const result = await detectArtifactConflicts({
      storyId: 'KBAR-0040',
      artifactType: 'plan',
      filePath: '/plans/future/platform/in-progress/KBAR-0040/_implementation/PLAN.yaml',
    })

    expect(result.success).toBe(true)
    expect(result.hasConflict).toBe(true)
    expect(result.conflictType).toBe('checksum_mismatch')
    expect(result.conflictId).toBe(CONFLICT_UUID)
    expect(result.resolutionOptions).toBeDefined()
    expect(result.resolutionOptions?.length).toBeGreaterThan(0)
  })

  it('should report missing_file when file not on filesystem (AC-6)', async () => {
    vi.mocked(fs.readFile).mockRejectedValue({ code: 'ENOENT', message: 'No such file' })

    ;(db.insert as any).mockReturnValueOnce({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: SYNC_EVENT_UUID }]),
      }),
    })

    ;(db.update as any).mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })

    const result = await detectArtifactConflicts({
      storyId: 'KBAR-0040',
      artifactType: 'plan',
      filePath: '/plans/future/platform/in-progress/KBAR-0040/_implementation/PLAN.yaml',
    })

    expect(result.success).toBe(true)
    expect(result.hasConflict).toBe(true)
    expect(result.conflictType).toBe('missing_file')
    expect(result.resolutionOptions).toBeDefined()
  })

  it('should reject path traversal (AC-8)', async () => {
    vi.mocked(validateFilePath).mockImplementation(() => {
      throw new Error('Path traversal detected: ../../secret is outside allowed directory')
    })

    const result = await detectArtifactConflicts({
      storyId: 'KBAR-0040',
      artifactType: 'plan',
      filePath: '../../secret/file.yaml',
    })

    expect(result.success).toBe(false)
    expect(result.hasConflict).toBe(false)
    expect(result.error).toContain('Security validation failed')
  })

  it('should reject symlinks (AC-8)', async () => {
    vi.mocked(validateNotSymlink).mockRejectedValue(
      new Error('Symlink detected: /plans/symlink is a symbolic link'),
    )

    const result = await detectArtifactConflicts({
      storyId: 'KBAR-0040',
      artifactType: 'plan',
      filePath: '/plans/symlink-artifact',
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('Security validation failed')
  })

  it('should handle story not found in DB — no conflict (AC-9)', async () => {
    vi.mocked(fs.readFile).mockResolvedValue(FS_CONTENT)

    ;(db.insert as any).mockReturnValueOnce({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: SYNC_EVENT_UUID }]),
      }),
    })

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

    const result = await detectArtifactConflicts({
      storyId: 'KBAR-UNKNOWN',
      artifactType: 'plan',
      filePath: '/plans/future/platform/in-progress/KBAR-UNKNOWN/_implementation/PLAN.yaml',
    })

    expect(result.success).toBe(true)
    expect(result.hasConflict).toBe(false)
    expect(result.conflictType).toBe('none')
  })

  it('should handle artifact not found in DB — no conflict (AC-9)', async () => {
    vi.mocked(fs.readFile).mockResolvedValue(FS_CONTENT)

    ;(db.insert as any).mockReturnValueOnce({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: SYNC_EVENT_UUID }]),
      }),
    })

    let selectCallCount = 0
    ;(db.select as any).mockImplementation(() => {
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
      // No artifact
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

    const result = await detectArtifactConflicts({
      storyId: 'KBAR-0040',
      artifactType: 'evidence',
      filePath: '/plans/future/platform/in-progress/KBAR-0040/_implementation/EVIDENCE.yaml',
    })

    expect(result.success).toBe(true)
    expect(result.hasConflict).toBe(false)
    expect(result.conflictType).toBe('none')
  })

  it('should return failed on invalid input (AC-7 Zod validation)', async () => {
    const result = await detectArtifactConflicts({
      storyId: '',
      artifactType: 'plan',
      filePath: '/some/path',
    })

    expect(result.success).toBe(false)
    expect(result.hasConflict).toBe(false)
    expect(result.error).toContain('validation failed')
  })
})
