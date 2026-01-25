/**
 * kb_get_related Tests
 *
 * Tests for related entry lookup functionality.
 *
 * @see KNOW-004 AC5 for acceptance criteria
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ZodError } from 'zod'
import { kb_get_related } from '../kb-get-related.js'

describe('kb_get_related', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('input validation', () => {
    it('should reject invalid UUID format', async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
      } as any

      await expect(
        kb_get_related({ entry_id: 'not-a-uuid' }, { db: mockDb }),
      ).rejects.toThrow(ZodError)

      // Verify the error message mentions UUID
      try {
        await kb_get_related({ entry_id: 'not-a-uuid' }, { db: mockDb })
      } catch (error) {
        expect(error).toBeInstanceOf(ZodError)
        const zodError = error as ZodError
        expect(zodError.issues[0].message).toBe('Invalid UUID format')
      }
    })

    it('should accept valid UUID', async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
        execute: vi.fn().mockResolvedValue({ rows: [] }),
      } as any

      // Should not throw
      const result = await kb_get_related(
        { entry_id: '123e4567-e89b-12d3-a456-426614174000' },
        { db: mockDb },
      )

      expect(result).toBeDefined()
    })

    it('should reject limit greater than max', async () => {
      const mockDb = {} as any

      await expect(
        kb_get_related(
          { entry_id: '123e4567-e89b-12d3-a456-426614174000', limit: 25 },
          { db: mockDb },
        ),
      ).rejects.toThrow(ZodError)
    })

    it('should use default limit when not specified', async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
        execute: vi.fn().mockResolvedValue({ rows: [] }),
      } as any

      const result = await kb_get_related(
        { entry_id: '123e4567-e89b-12d3-a456-426614174000' },
        { db: mockDb },
      )

      expect(result.results).toHaveLength(0)
    })
  })

  describe('entry not found behavior', () => {
    it('should return empty results when entry does not exist', async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]), // No entry found
        execute: vi.fn().mockResolvedValue({ rows: [] }),
      } as any

      const result = await kb_get_related(
        { entry_id: '123e4567-e89b-12d3-a456-426614174000' },
        { db: mockDb },
      )

      expect(result.results).toHaveLength(0)
      expect(result.metadata.total).toBe(0)
      expect(result.metadata.relationship_types).toHaveLength(0)
    })

    it('should not throw error when entry not found', async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
        execute: vi.fn().mockResolvedValue({ rows: [] }),
      } as any

      // Should not throw
      await expect(
        kb_get_related(
          { entry_id: '123e4567-e89b-12d3-a456-426614174000' },
          { db: mockDb },
        ),
      ).resolves.toBeDefined()
    })
  })

  describe('tag overlap relationships', () => {
    it('should find entries with 2+ shared tags', async () => {
      const now = new Date()

      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          {
            id: 'target-id',
            tags: ['typescript', 'best-practice', 'workflow'],
          },
        ]),
        execute: vi.fn().mockResolvedValue({
          rows: [
            {
              id: 'related-1',
              content: 'Related content 1',
              role: 'dev',
              tags: ['typescript', 'best-practice'],
              createdAt: now.toISOString(),
              updatedAt: now.toISOString(),
              overlap_count: 2,
            },
            {
              id: 'related-2',
              content: 'Related content 2',
              role: 'dev',
              tags: ['typescript', 'workflow', 'setup'],
              createdAt: now.toISOString(),
              updatedAt: now.toISOString(),
              overlap_count: 2,
            },
          ],
        }),
      } as any

      const result = await kb_get_related(
        { entry_id: '123e4567-e89b-12d3-a456-426614174000' },
        { db: mockDb },
      )

      expect(result.results).toHaveLength(2)
      expect(result.results[0].relationship).toBe('tag_overlap')
      expect(result.results[0].tag_overlap_count).toBe(2)
      expect(result.metadata.relationship_types).toContain('tag_overlap')
    })

    it('should order by tag overlap count descending', async () => {
      const now = new Date()

      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          {
            id: 'target-id',
            tags: ['a', 'b', 'c', 'd'],
          },
        ]),
        execute: vi.fn().mockResolvedValue({
          rows: [
            {
              id: 'high-overlap',
              content: 'High overlap',
              role: 'dev',
              tags: ['a', 'b', 'c'],
              createdAt: now.toISOString(),
              updatedAt: now.toISOString(),
              overlap_count: 3,
            },
            {
              id: 'low-overlap',
              content: 'Low overlap',
              role: 'dev',
              tags: ['a', 'b'],
              createdAt: now.toISOString(),
              updatedAt: now.toISOString(),
              overlap_count: 2,
            },
          ],
        }),
      } as any

      const result = await kb_get_related(
        { entry_id: '123e4567-e89b-12d3-a456-426614174000' },
        { db: mockDb },
      )

      // Higher overlap count should come first
      expect(result.results[0].id).toBe('high-overlap')
      expect(result.results[0].tag_overlap_count).toBe(3)
      expect(result.results[1].id).toBe('low-overlap')
      expect(result.results[1].tag_overlap_count).toBe(2)
    })

    it('should skip tag overlap query when entry has less than 2 tags', async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          {
            id: 'target-id',
            tags: ['only-one-tag'], // Only 1 tag
          },
        ]),
        execute: vi.fn(),
      } as any

      const result = await kb_get_related(
        { entry_id: '123e4567-e89b-12d3-a456-426614174000' },
        { db: mockDb },
      )

      // Should not execute the tag overlap query
      expect(mockDb.execute).not.toHaveBeenCalled()
      expect(result.results).toHaveLength(0)
    })

    it('should handle null tags', async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          {
            id: 'target-id',
            tags: null, // No tags
          },
        ]),
        execute: vi.fn(),
      } as any

      const result = await kb_get_related(
        { entry_id: '123e4567-e89b-12d3-a456-426614174000' },
        { db: mockDb },
      )

      // Should not execute the tag overlap query
      expect(mockDb.execute).not.toHaveBeenCalled()
      expect(result.results).toHaveLength(0)
    })
  })

  describe('limit enforcement', () => {
    it('should respect limit parameter', async () => {
      const now = new Date()

      const manyResults = Array.from({ length: 10 }, (_, i) => ({
        id: `related-${i}`,
        content: `Related content ${i}`,
        role: 'dev',
        tags: ['tag1', 'tag2'],
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        overlap_count: 2,
      }))

      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          {
            id: 'target-id',
            tags: ['tag1', 'tag2', 'tag3'],
          },
        ]),
        execute: vi.fn().mockResolvedValue({ rows: manyResults }),
      } as any

      const result = await kb_get_related(
        { entry_id: '123e4567-e89b-12d3-a456-426614174000', limit: 3 },
        { db: mockDb },
      )

      expect(result.results.length).toBeLessThanOrEqual(3)
    })
  })

  describe('metadata', () => {
    it('should include relationship_types in metadata', async () => {
      const now = new Date()

      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          {
            id: 'target-id',
            tags: ['tag1', 'tag2'],
          },
        ]),
        execute: vi.fn().mockResolvedValue({
          rows: [
            {
              id: 'related-1',
              content: 'Related',
              role: 'dev',
              tags: ['tag1', 'tag2'],
              createdAt: now.toISOString(),
              updatedAt: now.toISOString(),
              overlap_count: 2,
            },
          ],
        }),
      } as any

      const result = await kb_get_related(
        { entry_id: '123e4567-e89b-12d3-a456-426614174000' },
        { db: mockDb },
      )

      expect(result.metadata.relationship_types).toContain('tag_overlap')
    })

    it('should include total count in metadata', async () => {
      const now = new Date()

      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          {
            id: 'target-id',
            tags: ['tag1', 'tag2'],
          },
        ]),
        execute: vi.fn().mockResolvedValue({
          rows: [
            {
              id: 'related-1',
              content: 'Related 1',
              role: 'dev',
              tags: ['tag1', 'tag2'],
              createdAt: now.toISOString(),
              updatedAt: now.toISOString(),
              overlap_count: 2,
            },
            {
              id: 'related-2',
              content: 'Related 2',
              role: 'dev',
              tags: ['tag1', 'tag2'],
              createdAt: now.toISOString(),
              updatedAt: now.toISOString(),
              overlap_count: 2,
            },
          ],
        }),
      } as any

      const result = await kb_get_related(
        { entry_id: '123e4567-e89b-12d3-a456-426614174000' },
        { db: mockDb },
      )

      expect(result.metadata.total).toBe(2)
    })
  })
})
