/**
 * Unit Tests for detectSyncConflicts
 * KBAR-0030: AC-3, AC-6, AC-7, AC-8
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as fs from 'node:fs/promises'

vi.mock('node:fs/promises')

// TEST-002 fix: Mock crypto module for consistent checksum testing
vi.mock('node:crypto', () => ({
  createHash: vi.fn(() => ({
    update: vi.fn().mockReturnThis(),
    digest: vi.fn(() => 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'),
  })),
}))

// Mock path validation functions to allow test paths
vi.mock('../__types__/index.js', async (importOriginal) => {
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

import { detectSyncConflicts } from '../detect-sync-conflicts.js'
import { db } from '@repo/db'

describe('detectSyncConflicts', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Reset all mock implementations on the db object
    ;(db.insert as any) = vi.fn()
    ;(db.select as any) = vi.fn()
    ;(db.update as any) = vi.fn()
  })

  // TEST-002 fix: Enable skipped test with proper crypto mocking
  it('should detect no conflict when checksums match', async () => {
    const yamlContent = `story_id: KBAR-0030
epic: KBAR
title: Test
story_type: feature
priority: P2
current_phase: setup
status: backlog
`

    vi.mocked(fs.readFile).mockResolvedValue(yamlContent)

    const mockStory = {
      id: '550e8400-e29b-41d4-a716-446655440002',
      storyId: 'KBAR-0030',
      updatedAt: new Date(),
    }

    const filesystemChecksum =
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'

    const mockArtifact = {
      id: '550e8400-e29b-41d4-a716-446655440003',
      checksum: filesystemChecksum, // Same checksum as mocked crypto
    }

    db.insert.mockReturnValueOnce({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: '550e8400-e29b-41d4-a716-446655440001', createdAt: new Date() }]),
      }),
    })

    // PERF-001 fix: Mock the new join query structure
    db.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ story: mockStory, artifact: mockArtifact }]),
          }),
        }),
      }),
    })

    db.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })

    const result = await detectSyncConflicts({
      storyId: 'KBAR-0030',
      filePath: '/path/to/KBAR-0030.md',
    })

    expect(result.success).toBe(true)
    expect(result.hasConflict).toBe(false)
    expect(result.conflictType).toBe('none')
    expect(result.filesystemChecksum).toBe(filesystemChecksum)
    expect(result.databaseChecksum).toBe(filesystemChecksum)
  })

  it('should detect conflict when checksums mismatch', async () => {
    const yamlContent = `story_id: KBAR-0030
epic: KBAR
title: Modified
story_type: feature
priority: P1
current_phase: plan
status: in_progress
`

    vi.mocked(fs.readFile).mockResolvedValue(yamlContent)

    const mockStory = {
      id: '550e8400-e29b-41d4-a716-446655440002',
      storyId: 'KBAR-0030',
      updatedAt: new Date(),
    }

    const mockArtifact = {
      id: '550e8400-e29b-41d4-a716-446655440003',
      checksum: 'different-checksum-value-indicating-change',
    }

    db.insert
      .mockReturnValueOnce({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: '550e8400-e29b-41d4-a716-446655440001', createdAt: new Date() }]),
        }),
      })
      .mockReturnValueOnce({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: '550e8400-e29b-41d4-a716-446655440004' }]),
        }),
      })

    // PERF-001 fix: Mock the new join query structure
    db.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ story: mockStory, artifact: mockArtifact }]),
          }),
        }),
      }),
    })

    db.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })

    const result = await detectSyncConflicts({
      storyId: 'KBAR-0030',
      filePath: '/path/to/KBAR-0030.md',
    })

    expect(result.success).toBe(true)
    expect(result.hasConflict).toBe(true)
    expect(result.conflictType).toBe('checksum_mismatch')
    expect(result.conflictId).toBe('550e8400-e29b-41d4-a716-446655440004')
    expect(result.resolutionOptions).toContain('filesystem_wins')
    expect(result.resolutionOptions).toContain('database_wins')
  })

  it('should detect missing file conflict', async () => {
    vi.mocked(fs.readFile).mockRejectedValue(new Error('ENOENT: File not found'))

    db.insert.mockReturnValueOnce({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: '550e8400-e29b-41d4-a716-446655440001', createdAt: new Date() }]),
      }),
    })

    db.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })

    const result = await detectSyncConflicts({
      storyId: 'KBAR-0030',
      filePath: '/nonexistent/path.md',
    })

    expect(result.success).toBe(true)
    expect(result.hasConflict).toBe(true)
    expect(result.conflictType).toBe('missing_file')
  })

  it('should handle story not in database (no conflict)', async () => {
    const yamlContent = `story_id: KBAR-9999
epic: KBAR
title: New Story
story_type: feature
priority: P2
current_phase: setup
status: backlog
`

    vi.mocked(fs.readFile).mockResolvedValue(yamlContent)

    db.insert.mockReturnValueOnce({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: '550e8400-e29b-41d4-a716-446655440001', createdAt: new Date() }]),
      }),
    })

    // PERF-001 fix: Mock join query returning empty results
    db.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]), // No story in DB
          }),
        }),
      }),
    })

    db.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })

    const result = await detectSyncConflicts({
      storyId: 'KBAR-9999',
      filePath: '/path/to/KBAR-9999.md',
    })

    expect(result.success).toBe(true)
    expect(result.hasConflict).toBe(false)
    expect(result.conflictType).toBe('none')
    expect(result.message).toContain('not in database')
  })

  it('should log conflicts to syncConflicts table', async () => {
    const yamlContent = `story_id: KBAR-0030
epic: KBAR
title: Test
story_type: feature
priority: P2
current_phase: setup
status: backlog
`

    vi.mocked(fs.readFile).mockResolvedValue(yamlContent)

    const mockStory = {
      id: '550e8400-e29b-41d4-a716-446655440002',
      storyId: 'KBAR-0030',
      updatedAt: new Date(),
    }

    const mockArtifact = {
      id: '550e8400-e29b-41d4-a716-446655440003',
      checksum: 'old-checksum',
    }

    const conflictInsertFn = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: '550e8400-e29b-41d4-a716-446655440004' }]),
      }),
    })

    db.insert
      .mockReturnValueOnce({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: '550e8400-e29b-41d4-a716-446655440001', createdAt: new Date() }]),
        }),
      })
      .mockReturnValueOnce(conflictInsertFn() as any)

    // PERF-001 fix: Mock join query structure
    db.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ story: mockStory, artifact: mockArtifact }]),
          }),
        }),
      }),
    })

    db.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })

    const result = await detectSyncConflicts({
      storyId: 'KBAR-0030',
      filePath: '/path/to/KBAR-0030.md',
    })

    expect(result.hasConflict).toBe(true)
    expect(result.conflictId).toBe('550e8400-e29b-41d4-a716-446655440004')
    expect(db.insert).toHaveBeenCalledTimes(2) // sync event + conflict record
  })

  it('should handle validation errors gracefully', async () => {
    const result = await detectSyncConflicts({
      storyId: '',
      filePath: '',
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('validation failed')
  })

  // TEST-002 fix: Add 3 missing error scenario tests for complete coverage

  it('should handle database connection failure gracefully', async () => {
    const yamlContent = `story_id: KBAR-0030
epic: KBAR
title: Test
story_type: feature
priority: P2
current_phase: setup
status: backlog
`

    vi.mocked(fs.readFile).mockResolvedValue(yamlContent)

    db.insert.mockReturnValueOnce({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: '550e8400-e29b-41d4-a716-446655440001' }]),
      }),
    })

    // Simulate database connection failure
    db.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockRejectedValue(new Error('Connection refused')),
          }),
        }),
      }),
    })

    db.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })

    const result = await detectSyncConflicts({
      storyId: 'KBAR-0030',
      filePath: '/path/to/KBAR-0030.md',
    })

    expect(result.success).toBe(false)
    expect(result.hasConflict).toBe(false)
    expect(result.error).toContain('Connection refused')
    // Verify sync event was updated to failed
    expect(db.update).toHaveBeenCalled()
  })

  it('should handle transaction rollback during conflict detection', async () => {
    const yamlContent = `story_id: KBAR-0030
epic: KBAR
title: Test
story_type: feature
priority: P2
current_phase: setup
status: backlog
`

    vi.mocked(fs.readFile).mockResolvedValue(yamlContent)

    const mockStory = {
      id: '550e8400-e29b-41d4-a716-446655440002',
      storyId: 'KBAR-0030',
      updatedAt: new Date(),
    }

    const mockArtifact = {
      id: '550e8400-e29b-41d4-a716-446655440003',
      checksum: 'different-checksum',
    }

    db.insert
      .mockReturnValueOnce({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: '550e8400-e29b-41d4-a716-446655440001' }]),
        }),
      })
      .mockReturnValueOnce({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockRejectedValue(new Error('Transaction rollback')),
        }),
      })

    db.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ story: mockStory, artifact: mockArtifact }]),
          }),
        }),
      }),
    })

    db.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })

    const result = await detectSyncConflicts({
      storyId: 'KBAR-0030',
      filePath: '/path/to/KBAR-0030.md',
    })

    expect(result.success).toBe(false)
    expect(result.error).toContain('Transaction rollback')
  })

  it('should handle partial sync state recovery (missing artifact)', async () => {
    const yamlContent = `story_id: KBAR-0030
epic: KBAR
title: Test
story_type: feature
priority: P2
current_phase: setup
status: backlog
`

    vi.mocked(fs.readFile).mockResolvedValue(yamlContent)

    const mockStory = {
      id: '550e8400-e29b-41d4-a716-446655440002',
      storyId: 'KBAR-0030',
      updatedAt: new Date(),
    }

    db.insert.mockReturnValueOnce({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: '550e8400-e29b-41d4-a716-446655440001' }]),
      }),
    })

    // Story exists but artifact is missing (partial sync state)
    db.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        leftJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ story: mockStory, artifact: null }]),
          }),
        }),
      }),
    })

    db.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })

    const result = await detectSyncConflicts({
      storyId: 'KBAR-0030',
      filePath: '/path/to/KBAR-0030.md',
    })

    expect(result.success).toBe(true)
    expect(result.hasConflict).toBe(false)
    expect(result.conflictType).toBe('none')
    expect(result.message).toContain('No artifact in database')
  })
})
