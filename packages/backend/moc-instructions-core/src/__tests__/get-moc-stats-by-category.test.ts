import { describe, it, expect, vi } from 'vitest'
import {
  getMocStatsByCategory,
  type GetMocStatsByCategoryDbClient,
} from '../get-moc-stats-by-category.js'

// Helper to create mock DB client
function createMockDb(
  themeStats: Array<{ category: string | null; count: number }>,
  mocsWithTags: Array<{ tags: string[] | null }>,
): GetMocStatsByCategoryDbClient {
  return {
    getThemeStats: vi.fn().mockResolvedValue(themeStats),
    getMocsWithTags: vi.fn().mockResolvedValue(mocsWithTags),
  }
}

describe('getMocStatsByCategory', () => {
  describe('Happy Path', () => {
    it('returns theme stats for user MOCs', async () => {
      const themeStats = [
        { category: 'Castle', count: 5 },
        { category: 'Space', count: 3 },
      ]
      const mockDb = createMockDb(themeStats, [])

      const result = await getMocStatsByCategory(mockDb, 'test-user-id')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.data).toHaveLength(2)
        expect(result.data.data[0]).toEqual({ category: 'Castle', count: 5 })
        expect(result.data.data[1]).toEqual({ category: 'Space', count: 3 })
      }
    })

    it('returns tag stats for MOCs without themes', async () => {
      const mocsWithTags = [
        { tags: ['medieval', 'castle'] },
        { tags: ['medieval'] },
        { tags: ['space', 'sci-fi'] },
      ]
      const mockDb = createMockDb([], mocsWithTags)

      const result = await getMocStatsByCategory(mockDb, 'test-user-id')

      expect(result.success).toBe(true)
      if (result.success) {
        // medieval: 2, castle: 1, space: 1, sci-fi: 1 (sorted by count)
        expect(result.data.data[0]).toEqual({ category: 'medieval', count: 2 })
        expect(result.data.data.find(s => s.category === 'castle')?.count).toBe(1)
      }
    })

    it('combines theme and tag stats without duplicates', async () => {
      const themeStats = [{ category: 'Castle', count: 5 }]
      const mocsWithTags = [
        { tags: ['castle', 'medieval'] }, // 'castle' should not duplicate 'Castle'
        { tags: ['space'] },
      ]
      const mockDb = createMockDb(themeStats, mocsWithTags)

      const result = await getMocStatsByCategory(mockDb, 'test-user-id')

      expect(result.success).toBe(true)
      if (result.success) {
        // Castle from themes (5), medieval (1), space (1)
        // 'castle' tag should be excluded since 'Castle' theme exists
        const categories = result.data.data.map(s => s.category)
        expect(categories).not.toContain('castle')
        expect(categories).toContain('Castle')
        expect(categories).toContain('medieval')
        expect(categories).toContain('space')
      }
    })

    it('returns top 10 sorted by count descending', async () => {
      const themeStats = Array.from({ length: 15 }, (_, i) => ({
        category: `Theme${i}`,
        count: i + 1,
      }))
      const mockDb = createMockDb(themeStats, [])

      const result = await getMocStatsByCategory(mockDb, 'test-user-id')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.data).toHaveLength(10)
        // Should be sorted by count descending
        expect(result.data.data[0].count).toBe(15)
        expect(result.data.data[9].count).toBe(6)
      }
    })

    it('calculates total correctly', async () => {
      const themeStats = [
        { category: 'Castle', count: 5 },
        { category: 'Space', count: 3 },
      ]
      const mockDb = createMockDb(themeStats, [])

      const result = await getMocStatsByCategory(mockDb, 'test-user-id')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.total).toBe(8)
      }
    })
  })

  describe('Empty Results', () => {
    it('returns empty array when user has no MOCs', async () => {
      const mockDb = createMockDb([], [])

      const result = await getMocStatsByCategory(mockDb, 'test-user-id')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.data).toHaveLength(0)
        expect(result.data.total).toBe(0)
      }
    })

    it('returns empty array when all themes are null', async () => {
      const themeStats = [{ category: null, count: 5 }]
      const mockDb = createMockDb(themeStats, [])

      const result = await getMocStatsByCategory(mockDb, 'test-user-id')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.data).toHaveLength(0)
      }
    })
  })

  describe('Tag Processing', () => {
    it('converts tags to lowercase for aggregation', async () => {
      const mocsWithTags = [
        { tags: ['Castle'] },
        { tags: ['CASTLE'] },
        { tags: ['castle'] },
      ]
      const mockDb = createMockDb([], mocsWithTags)

      const result = await getMocStatsByCategory(mockDb, 'test-user-id')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.data).toHaveLength(1)
        expect(result.data.data[0]).toEqual({ category: 'castle', count: 3 })
      }
    })

    it('handles MOCs with null tags', async () => {
      const mocsWithTags = [{ tags: null }, { tags: ['castle'] }]
      const mockDb = createMockDb([], mocsWithTags)

      const result = await getMocStatsByCategory(mockDb, 'test-user-id')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.data).toHaveLength(1)
        expect(result.data.data[0]).toEqual({ category: 'castle', count: 1 })
      }
    })

    it('handles MOCs with empty tags array', async () => {
      const mocsWithTags = [{ tags: [] }, { tags: ['castle'] }]
      const mockDb = createMockDb([], mocsWithTags)

      const result = await getMocStatsByCategory(mockDb, 'test-user-id')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.data).toHaveLength(1)
        expect(result.data.data[0]).toEqual({ category: 'castle', count: 1 })
      }
    })
  })

  describe('Error Cases', () => {
    it('returns DB_ERROR when getThemeStats throws', async () => {
      const mockDb: GetMocStatsByCategoryDbClient = {
        getThemeStats: vi.fn().mockRejectedValue(new Error('Theme stats failed')),
        getMocsWithTags: vi.fn().mockResolvedValue([]),
      }

      const result = await getMocStatsByCategory(mockDb, 'test-user-id')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('DB_ERROR')
        expect(result.message).toBe('Theme stats failed')
      }
    })

    it('returns DB_ERROR when getMocsWithTags throws', async () => {
      const mockDb: GetMocStatsByCategoryDbClient = {
        getThemeStats: vi.fn().mockResolvedValue([]),
        getMocsWithTags: vi.fn().mockRejectedValue(new Error('Tags query failed')),
      }

      const result = await getMocStatsByCategory(mockDb, 'test-user-id')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('DB_ERROR')
        expect(result.message).toBe('Tags query failed')
      }
    })
  })

  describe('Edge Cases', () => {
    it('filters out zero-count entries', async () => {
      const themeStats = [
        { category: 'Castle', count: 5 },
        { category: 'Space', count: 0 },
      ]
      const mockDb = createMockDb(themeStats, [])

      const result = await getMocStatsByCategory(mockDb, 'test-user-id')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.data).toHaveLength(1)
        expect(result.data.data[0].category).toBe('Castle')
      }
    })

    it('filters out empty string categories', async () => {
      const themeStats = [
        { category: '', count: 5 },
        { category: 'Castle', count: 3 },
      ]
      const mockDb = createMockDb(themeStats, [])

      const result = await getMocStatsByCategory(mockDb, 'test-user-id')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.data).toHaveLength(1)
        expect(result.data.data[0].category).toBe('Castle')
      }
    })

    it('case-insensitive deduplication prefers theme over tag', async () => {
      const themeStats = [{ category: 'Castle', count: 5 }]
      const mocsWithTags = [{ tags: ['CASTLE'] }] // Should not add duplicate
      const mockDb = createMockDb(themeStats, mocsWithTags)

      const result = await getMocStatsByCategory(mockDb, 'test-user-id')

      expect(result.success).toBe(true)
      if (result.success) {
        // Should only have 'Castle' from themes, not 'CASTLE' from tags
        expect(result.data.data).toHaveLength(1)
        expect(result.data.data[0].category).toBe('Castle')
        expect(result.data.data[0].count).toBe(5) // Not merged, themes preserved
      }
    })
  })
})
