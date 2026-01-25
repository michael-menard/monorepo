/**
 * Tests for getUserSummary core function
 */

import { describe, it, expect, vi } from 'vitest'
import { getUserSummary, type GetUserSummaryDbClient, type GetUserSummarySchema } from '../get-user-summary.js'

const mockSchema: GetUserSummarySchema = {
  mocPartsLists: {
    id: 'id',
    mocId: 'moc_id',
    built: 'built',
    purchased: 'purchased',
    totalPartsCount: 'total_parts_count',
  },
  mocInstructions: {
    id: 'id',
    userId: 'user_id',
  },
}

describe('getUserSummary', () => {
  const mockUserId = 'user-123'

  function createMockDb(partsLists: Array<{
    id: string;
    built: boolean | null;
    purchased: boolean | null;
    totalPartsCount: string | null;
  }> = []): GetUserSummaryDbClient {
    return {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(partsLists),
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(partsLists),
          }),
        }),
      }),
    }
  }

  it('should return correct summary for multiple parts lists', async () => {
    const mockDb = createMockDb([
      { id: '1', built: true, purchased: false, totalPartsCount: '100' },
      { id: '2', built: false, purchased: true, totalPartsCount: '200' },
      { id: '3', built: true, purchased: true, totalPartsCount: '150' },
    ])

    const result = await getUserSummary(mockDb, mockSchema, mockUserId)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.totalLists).toBe(3)
      expect(result.data.totalParts).toBe(450) // 100 + 200 + 150
      expect(result.data.listsBuilt).toBe(2) // lists 1 and 3
      expect(result.data.listsPurchased).toBe(2) // lists 2 and 3
    }
  })

  it('should return zeros when user has no parts lists', async () => {
    const mockDb = createMockDb([])

    const result = await getUserSummary(mockDb, mockSchema, mockUserId)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.totalLists).toBe(0)
      expect(result.data.totalParts).toBe(0)
      expect(result.data.listsBuilt).toBe(0)
      expect(result.data.listsPurchased).toBe(0)
    }
  })

  it('should handle null totalPartsCount', async () => {
    const mockDb = createMockDb([
      { id: '1', built: false, purchased: false, totalPartsCount: null },
      { id: '2', built: false, purchased: false, totalPartsCount: '50' },
    ])

    const result = await getUserSummary(mockDb, mockSchema, mockUserId)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.totalLists).toBe(2)
      expect(result.data.totalParts).toBe(50) // null treated as 0
    }
  })

  it('should handle null built/purchased flags', async () => {
    const mockDb = createMockDb([
      { id: '1', built: null, purchased: null, totalPartsCount: '100' },
    ])

    const result = await getUserSummary(mockDb, mockSchema, mockUserId)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.totalLists).toBe(1)
      expect(result.data.listsBuilt).toBe(0)
      expect(result.data.listsPurchased).toBe(0)
    }
  })
})
