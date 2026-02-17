/**
 * Unit Tests for syncStoryFromDatabase
 * KBAR-0030: AC-2, AC-6, AC-7, AC-8
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as fs from 'node:fs/promises'

vi.mock('node:fs/promises')

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

import { syncStoryFromDatabase } from '../sync-story-from-database.js'
import { db } from '@repo/db'

describe('syncStoryFromDatabase', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Reset all mock implementations on the db object
    ;(db.insert as any) = vi.fn()
    ;(db.select as any) = vi.fn()
    ;(db.update as any) = vi.fn()
  })

  it('should successfully sync story from database to filesystem', async () => {
    const mockStory = {
      id: '550e8400-e29b-41d4-a716-446655440002',
      storyId: 'KBAR-0030',
      epic: 'KBAR',
      title: 'Test Story',
      description: 'Test description',
      storyType: 'feature',
      priority: 'P2' as const,
      complexity: 'medium',
      storyPoints: 5,
      currentPhase: 'setup' as const,
      status: 'backlog',
      metadata: { tags: ['test'] },
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-15'),
    }

    db.insert.mockReturnValueOnce({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: '550e8400-e29b-41d4-a716-446655440001', createdAt: new Date() }]),
      }),
    })

    db.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([mockStory]),
        }),
      }),
    })

    db.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })

    vi.mocked(fs.writeFile).mockResolvedValue(undefined)
    vi.mocked(fs.rename).mockResolvedValue(undefined)

    const result = await syncStoryFromDatabase({
      storyId: 'KBAR-0030',
      outputPath: '/path/to/KBAR-0030.md',
      triggeredBy: 'user',
    })

    expect(result.success).toBe(true)
    expect(result.syncStatus).toBe('completed')
    expect(result.filePath).toBe('/path/to/KBAR-0030.md')
    expect(fs.writeFile).toHaveBeenCalledWith(
      '/path/to/KBAR-0030.md.tmp',
      expect.any(String),
      'utf-8',
    )
    expect(fs.rename).toHaveBeenCalledWith('/path/to/KBAR-0030.md.tmp', '/path/to/KBAR-0030.md')
  })

  it('should handle story not found error gracefully', async () => {
    db.insert.mockReturnValueOnce({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: '550e8400-e29b-41d4-a716-446655440001', createdAt: new Date() }]),
      }),
    })

    db.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]), // No story found
        }),
      }),
    })

    db.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })

    const result = await syncStoryFromDatabase({
      storyId: 'NONEXISTENT-001',
      outputPath: '/path/to/output.md',
      triggeredBy: 'user',
    })

    expect(result.success).toBe(false)
    expect(result.syncStatus).toBe('failed')
    expect(result.error).toContain('not found')
  })

  it('should use atomic file write pattern (temp + rename)', async () => {
    const mockStory = {
      id: '550e8400-e29b-41d4-a716-446655440002',
      storyId: 'KBAR-0030',
      epic: 'KBAR',
      title: 'Test',
      storyType: 'feature',
      priority: 'P2' as const,
      currentPhase: 'setup' as const,
      status: 'backlog',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    db.insert.mockReturnValueOnce({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: '550e8400-e29b-41d4-a716-446655440001', createdAt: new Date() }]),
      }),
    })

    db.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([mockStory]),
        }),
      }),
    })

    db.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })

    vi.mocked(fs.writeFile).mockResolvedValue(undefined)
    vi.mocked(fs.rename).mockResolvedValue(undefined)

    await syncStoryFromDatabase({
      storyId: 'KBAR-0030',
      outputPath: '/path/to/story.md',
      triggeredBy: 'user',
    })

    expect(fs.writeFile).toHaveBeenCalledWith('/path/to/story.md.tmp', expect.any(String), 'utf-8')
    expect(fs.rename).toHaveBeenCalledWith('/path/to/story.md.tmp', '/path/to/story.md')
  })

  it('should clean up temp file on write failure', async () => {
    const mockStory = {
      id: '550e8400-e29b-41d4-a716-446655440002',
      storyId: 'KBAR-0030',
      epic: 'KBAR',
      title: 'Test',
      storyType: 'feature',
      priority: 'P2' as const,
      currentPhase: 'setup' as const,
      status: 'backlog',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    db.insert.mockReturnValueOnce({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: '550e8400-e29b-41d4-a716-446655440001', createdAt: new Date() }]),
      }),
    })

    db.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([mockStory]),
        }),
      }),
    })

    db.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })

    vi.mocked(fs.writeFile).mockResolvedValue(undefined)
    vi.mocked(fs.rename).mockRejectedValue(new Error('Rename failed'))
    vi.mocked(fs.unlink).mockResolvedValue(undefined)

    const result = await syncStoryFromDatabase({
      storyId: 'KBAR-0030',
      outputPath: '/path/to/story.md',
      triggeredBy: 'user',
    })

    expect(result.success).toBe(false)
    expect(fs.unlink).toHaveBeenCalledWith('/path/to/story.md.tmp')
  })

  it('should create sync event with correct metadata', async () => {
    const mockStory = {
      id: '550e8400-e29b-41d4-a716-446655440002',
      storyId: 'KBAR-0030',
      epic: 'KBAR',
      title: 'Test',
      storyType: 'feature',
      priority: 'P2' as const,
      currentPhase: 'setup' as const,
      status: 'backlog',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const insertFn = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: '550e8400-e29b-41d4-a716-446655440001', createdAt: new Date() }]),
      }),
    })

    db.insert.mockReturnValue(insertFn() as any)

    db.select.mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([mockStory]),
        }),
      }),
    })

    db.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })

    vi.mocked(fs.writeFile).mockResolvedValue(undefined)
    vi.mocked(fs.rename).mockResolvedValue(undefined)

    const result = await syncStoryFromDatabase({
      storyId: 'KBAR-0030',
      outputPath: '/path/to/story.md',
      triggeredBy: 'agent',
    })

    expect(result.syncEventId).toBe('550e8400-e29b-41d4-a716-446655440001')
    expect(db.insert).toHaveBeenCalled()
  })
})
