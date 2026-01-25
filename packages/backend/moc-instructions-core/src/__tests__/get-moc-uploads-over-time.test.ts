import { describe, it, expect, vi } from 'vitest'
import {
  getMocUploadsOverTime,
  type GetMocUploadsOverTimeDbClient,
} from '../get-moc-uploads-over-time.js'

// Helper to create mock DB client
function createMockDb(
  uploadsData: Array<{ month: string | null; category: string | null; count: number }>,
): GetMocUploadsOverTimeDbClient {
  return {
    getUploadsOverTime: vi.fn().mockResolvedValue(uploadsData),
  }
}

describe('getMocUploadsOverTime', () => {
  describe('Happy Path', () => {
    it('returns time-series data grouped by month and theme', async () => {
      const uploadsData = [
        { month: '2026-01-01 00:00:00', category: 'Castle', count: 3 },
        { month: '2026-01-01 00:00:00', category: 'Space', count: 2 },
        { month: '2025-12-01 00:00:00', category: 'Castle', count: 1 },
      ]
      const mockDb = createMockDb(uploadsData)

      const result = await getMocUploadsOverTime(mockDb, 'test-user-id')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.data).toHaveLength(3)
        expect(result.data.data[0]).toEqual({
          date: '2026-01',
          category: 'Castle',
          count: 3,
        })
        expect(result.data.data[1]).toEqual({
          date: '2026-01',
          category: 'Space',
          count: 2,
        })
        expect(result.data.data[2]).toEqual({
          date: '2025-12',
          category: 'Castle',
          count: 1,
        })
      }
    })

    it('extracts YYYY-MM format from full date string', async () => {
      const uploadsData = [
        { month: '2025-06-01 00:00:00+00', category: 'City', count: 5 },
      ]
      const mockDb = createMockDb(uploadsData)

      const result = await getMocUploadsOverTime(mockDb, 'test-user-id')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.data[0].date).toBe('2025-06')
      }
    })

    it('sets category to "Unknown" for null theme', async () => {
      const uploadsData = [{ month: '2026-01-01 00:00:00', category: null, count: 2 }]
      const mockDb = createMockDb(uploadsData)

      const result = await getMocUploadsOverTime(mockDb, 'test-user-id')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.data[0].category).toBe('Unknown')
      }
    })

    it('filters to only user MOCs (DB client responsibility)', async () => {
      const mockDb = createMockDb([])

      await getMocUploadsOverTime(mockDb, 'test-user-id')

      expect(mockDb.getUploadsOverTime).toHaveBeenCalledWith('test-user-id')
    })
  })

  describe('Empty Results', () => {
    it('returns empty array when no MOCs in range', async () => {
      const mockDb = createMockDb([])

      const result = await getMocUploadsOverTime(mockDb, 'test-user-id')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.data).toHaveLength(0)
      }
    })

    it('filters out zero-count entries', async () => {
      const uploadsData = [
        { month: '2026-01-01 00:00:00', category: 'Castle', count: 3 },
        { month: '2025-12-01 00:00:00', category: 'Space', count: 0 },
      ]
      const mockDb = createMockDb(uploadsData)

      const result = await getMocUploadsOverTime(mockDb, 'test-user-id')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.data).toHaveLength(1)
        expect(result.data.data[0].category).toBe('Castle')
      }
    })

    it('filters out null month entries', async () => {
      const uploadsData = [
        { month: null, category: 'Castle', count: 3 },
        { month: '2026-01-01 00:00:00', category: 'Space', count: 2 },
      ]
      const mockDb = createMockDb(uploadsData)

      const result = await getMocUploadsOverTime(mockDb, 'test-user-id')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.data).toHaveLength(1)
        expect(result.data.data[0].category).toBe('Space')
      }
    })
  })

  describe('Error Cases', () => {
    it('returns DB_ERROR when getUploadsOverTime throws', async () => {
      const mockDb: GetMocUploadsOverTimeDbClient = {
        getUploadsOverTime: vi.fn().mockRejectedValue(new Error('Query failed')),
      }

      const result = await getMocUploadsOverTime(mockDb, 'test-user-id')

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('DB_ERROR')
        expect(result.message).toBe('Query failed')
      }
    })
  })

  describe('Edge Cases', () => {
    it('handles multiple categories in same month', async () => {
      const uploadsData = [
        { month: '2026-01-01 00:00:00', category: 'Castle', count: 3 },
        { month: '2026-01-01 00:00:00', category: 'Space', count: 2 },
        { month: '2026-01-01 00:00:00', category: 'City', count: 1 },
      ]
      const mockDb = createMockDb(uploadsData)

      const result = await getMocUploadsOverTime(mockDb, 'test-user-id')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.data).toHaveLength(3)
        const januaryData = result.data.data.filter(d => d.date === '2026-01')
        expect(januaryData).toHaveLength(3)
      }
    })

    it('handles single MOC in 12-month range', async () => {
      const uploadsData = [
        { month: '2025-06-01 00:00:00', category: 'Technic', count: 1 },
      ]
      const mockDb = createMockDb(uploadsData)

      const result = await getMocUploadsOverTime(mockDb, 'test-user-id')

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.data).toHaveLength(1)
        expect(result.data.data[0]).toEqual({
          date: '2025-06',
          category: 'Technic',
          count: 1,
        })
      }
    })

    it('handles empty month string', async () => {
      const uploadsData = [
        { month: '', category: 'Castle', count: 3 },
        { month: '2026-01-01 00:00:00', category: 'Space', count: 2 },
      ]
      const mockDb = createMockDb(uploadsData)

      const result = await getMocUploadsOverTime(mockDb, 'test-user-id')

      expect(result.success).toBe(true)
      if (result.success) {
        // Empty month should be filtered out
        expect(result.data.data).toHaveLength(1)
        expect(result.data.data[0].category).toBe('Space')
      }
    })

    it('preserves order from database', async () => {
      const uploadsData = [
        { month: '2025-10-01 00:00:00', category: 'Castle', count: 1 },
        { month: '2025-11-01 00:00:00', category: 'Space', count: 2 },
        { month: '2025-12-01 00:00:00', category: 'City', count: 3 },
        { month: '2026-01-01 00:00:00', category: 'Technic', count: 4 },
      ]
      const mockDb = createMockDb(uploadsData)

      const result = await getMocUploadsOverTime(mockDb, 'test-user-id')

      expect(result.success).toBe(true)
      if (result.success) {
        const dates = result.data.data.map(d => d.date)
        expect(dates).toEqual(['2025-10', '2025-11', '2025-12', '2026-01'])
      }
    })
  })
})
