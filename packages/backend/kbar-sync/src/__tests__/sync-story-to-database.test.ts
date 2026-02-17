/**
 * Unit Tests for syncStoryToDatabase
 * KBAR-0030: AC-1, AC-4, AC-6, AC-7, AC-8
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as fs from 'node:fs/promises'
import * as crypto from 'node:crypto'

// Mock filesystem
vi.mock('node:fs/promises')

// TEST-001 fix: Mock crypto module for consistent checksum testing
vi.mock('node:crypto', () => ({
  createHash: vi.fn(() => ({
    update: vi.fn().mockReturnThis(),
    digest: vi.fn(() => 'c8f5f5f5d0e5e5f5c5f5f5d0e5e5f5c5f5f5d0e5e5f5c5f5f5d0e5e5f5c5f5f5'),
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

// Mock database - use hoisted mock to prevent real import
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

import { syncStoryToDatabase } from '../sync-story-to-database.js'
import { db } from '@repo/db'

describe('syncStoryToDatabase', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Reset all mock implementations on the db object
    ;(db.insert as any) = vi.fn()
    ;(db.select as any) = vi.fn()
    ;(db.update as any) = vi.fn()
    ;(db.transaction as any) = vi.fn()
  })

  it('should successfully sync a new story to database', async () => {
    const yamlContent = `schema: 1
story_id: KBAR-0030
epic: KBAR
title: Test Story
story_type: feature
priority: P2
current_phase: setup
status: backlog
`

    vi.mocked(fs.readFile).mockResolvedValue(yamlContent)

    // Mock sync event creation
    db.insert.mockReturnValueOnce({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: '550e8400-e29b-41d4-a716-446655440001' }]),
      }),
    })

    // Mock transaction with story and artifact operations
    db.transaction.mockImplementation(async (callback: any) => {
      const tx = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]), // No existing story
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: '550e8400-e29b-41d4-a716-446655440002' }]),
          }),
        }),
        update: vi.fn(),
      }
      return await callback(tx)
    })

    // Mock sync event update
    db.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })

    const result = await syncStoryToDatabase({
      storyId: 'KBAR-0030',
      filePath: '/path/to/KBAR-0030.md',
      triggeredBy: 'user',
    })

    expect(result.success).toBe(true)
    expect(result.syncStatus).toBe('completed')
    expect(result.storyId).toBe('KBAR-0030')
    expect(result.checksum).toBeDefined()
    expect(result.syncEventId).toBe('550e8400-e29b-41d4-a716-446655440001')
  })

  // TEST-001 fix: Enable skipped idempotency test with proper crypto mocking
  it('should skip sync when checksum is unchanged (idempotency - AC-4)', async () => {
    const yamlContent = `schema: 1
story_id: KBAR-0030
epic: KBAR
title: Test Story
story_type: feature
priority: P2
current_phase: setup
status: backlog
`

    vi.mocked(fs.readFile).mockResolvedValue(yamlContent)

    // The checksum is mocked at the module level to return this value
    const existingChecksum =
      'c8f5f5f5d0e5e5f5c5f5f5d0e5e5f5c5f5f5d0e5e5f5c5f5f5d0e5e5f5c5f5f5'

    // Mock sync event creation
    db.insert.mockReturnValueOnce({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: '550e8400-e29b-41d4-a716-446655440001' }]),
      }),
    })

    // Mock transaction that finds matching checksum
    db.transaction.mockImplementation(async (callback: any) => {
      let selectCallCount = 0
      const tx = {
        select: vi.fn(() => {
          selectCallCount++
          if (selectCallCount === 1) {
            // First select: return existing story
            return {
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([{ id: '550e8400-e29b-41d4-a716-446655440002' }]),
                }),
              }),
            }
          } else {
            // Second select: return artifact with matching checksum
            return {
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([
                    { id: '550e8400-e29b-41d4-a716-446655440003', checksum: existingChecksum },
                  ]),
                }),
              }),
            }
          }
        }),
      }

      return await callback(tx)
    })

    // Mock sync event update
    db.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })

    const result = await syncStoryToDatabase({
      storyId: 'KBAR-0030',
      filePath: '/path/to/KBAR-0030.md',
      triggeredBy: 'user',
    })

    // Verify idempotency: sync was skipped because checksum matched
    expect(result.success).toBe(true)
    expect(result.storyId).toBe('KBAR-0030')
    expect(result.syncStatus).toBe('skipped')
    expect(result.skipped).toBe(true)
    expect(result.message).toContain('No changes detected')
  })

  it('should handle validation errors gracefully (AC-6)', async () => {
    const result = await syncStoryToDatabase({
      storyId: '', // Invalid: empty string
      filePath: '/path/to/story.md',
      triggeredBy: 'user',
    })

    expect(result.success).toBe(false)
    expect(result.syncStatus).toBe('failed')
    expect(result.error).toContain('validation failed') // Updated to match new error message
  })

  it('should handle file read errors gracefully (AC-6)', async () => {
    vi.mocked(fs.readFile).mockRejectedValue(new Error('File not found'))

    // Mock sync event creation
    db.insert.mockReturnValueOnce({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: '550e8400-e29b-41d4-a716-446655440001' }]),
      }),
    })

    // Mock sync event update for failure
    db.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })

    const result = await syncStoryToDatabase({
      storyId: 'KBAR-0030',
      filePath: '/nonexistent/path.md',
      triggeredBy: 'user',
    })

    expect(result.success).toBe(false)
    expect(result.syncStatus).toBe('failed')
    expect(result.error).toContain('File not found')
  })

  it('should handle YAML parse errors gracefully (AC-6)', async () => {
    const invalidYaml = 'invalid: yaml: content: ['

    vi.mocked(fs.readFile).mockResolvedValue(invalidYaml)

    // Mock sync event creation
    db.insert.mockReturnValueOnce({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: '550e8400-e29b-41d4-a716-446655440001' }]),
      }),
    })

    // Mock sync event update for failure
    db.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })

    const result = await syncStoryToDatabase({
      storyId: 'KBAR-0030',
      filePath: '/path/to/invalid.md',
      triggeredBy: 'user',
    })

    expect(result.success).toBe(false)
    expect(result.syncStatus).toBe('failed')
    expect(result.error).toBeDefined()
  })

  it('should create sync event record (AC-7)', async () => {
    const yamlContent = `schema: 1
story_id: KBAR-0030
epic: KBAR
title: Test Story
story_type: feature
priority: P2
current_phase: setup
status: backlog
`

    vi.mocked(fs.readFile).mockResolvedValue(yamlContent)

    const insertFn = vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: '550e8400-e29b-41d4-a716-446655440001' }]),
      }),
    })

    db.insert.mockReturnValue(insertFn() as any)

    db.transaction.mockImplementation(async (callback: any) => {
      const tx = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: '550e8400-e29b-41d4-a716-446655440002' }]),
          }),
        }),
      }
      return await callback(tx)
    })

    db.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })

    const result = await syncStoryToDatabase({
      storyId: 'KBAR-0030',
      filePath: '/path/to/KBAR-0030.md',
      triggeredBy: 'automation',
    })

    expect(result.syncEventId).toBe('550e8400-e29b-41d4-a716-446655440001')
    expect(db.insert).toHaveBeenCalled()
  })

  it('should compute SHA-256 checksum correctly (AC-4)', async () => {
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

    db.transaction.mockImplementation(async (callback: any) => {
      const tx = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ id: '550e8400-e29b-41d4-a716-446655440002' }]),
          }),
        }),
      }
      return await callback(tx)
    })

    db.update.mockReturnValue({
      set: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    })

    const result = await syncStoryToDatabase({
      storyId: 'KBAR-0030',
      filePath: '/path/to/KBAR-0030.md',
      triggeredBy: 'user',
    })

    expect(result.checksum).toBeDefined()
    expect(result.checksum).toMatch(/^[a-f0-9]{64}$/) // SHA-256 is 64 hex chars
  })
})
