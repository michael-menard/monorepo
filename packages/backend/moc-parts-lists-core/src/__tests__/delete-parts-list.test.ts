/**
 * Tests for deletePartsList core function
 */

import { describe, it, expect, vi } from 'vitest'
import { deletePartsList, type DeletePartsListDbClient, type DeletePartsListSchema } from '../delete-parts-list.js'

const mockSchema: DeletePartsListSchema = {
  mocPartsLists: {
    id: 'id',
    mocId: 'moc_id',
  },
  mocInstructions: {
    id: 'id',
    userId: 'user_id',
  },
}

describe('deletePartsList', () => {
  const mockUserId = 'user-123'
  const mockMocId = '11111111-1111-1111-1111-111111111111'
  const mockPartsListId = '22222222-2222-2222-2222-222222222222'

  function createMockDb(overrides: Partial<{
    mocResult: Array<{ id: string; userId: string }>;
    partsListResult: Array<{ id: string; mocId: string }>;
  }> = {}): DeletePartsListDbClient {
    const mocResult = overrides.mocResult ?? [{ id: mockMocId, userId: mockUserId }]
    const partsListResult = overrides.partsListResult ?? [{ id: mockPartsListId, mocId: mockMocId }]

    let selectCallCount = 0
    return {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockImplementation(() => {
            selectCallCount++
            if (selectCallCount === 1) return Promise.resolve(mocResult)
            return Promise.resolve(partsListResult)
          }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      }),
    }
  }

  it('should delete parts list successfully', async () => {
    const mockDb = createMockDb()

    const result = await deletePartsList(mockDb, mockSchema, mockUserId, mockMocId, mockPartsListId)

    expect(result.success).toBe(true)
    expect(mockDb.delete).toHaveBeenCalled()
  })

  it('should return NOT_FOUND when MOC does not exist', async () => {
    const mockDb = createMockDb({ mocResult: [] })

    const result = await deletePartsList(mockDb, mockSchema, mockUserId, mockMocId, mockPartsListId)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('NOT_FOUND')
      expect(result.message).toBe('MOC not found')
    }
  })

  it('should return NOT_FOUND when MOC belongs to different user', async () => {
    const mockDb = createMockDb({
      mocResult: [{ id: mockMocId, userId: 'different-user' }],
    })

    const result = await deletePartsList(mockDb, mockSchema, mockUserId, mockMocId, mockPartsListId)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('NOT_FOUND')
    }
  })

  it('should return NOT_FOUND when parts list does not exist', async () => {
    const mockDb = createMockDb({ partsListResult: [] })

    const result = await deletePartsList(mockDb, mockSchema, mockUserId, mockMocId, mockPartsListId)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('NOT_FOUND')
      expect(result.message).toBe('Parts list not found')
    }
  })

  it('should return NOT_FOUND when parts list belongs to different MOC', async () => {
    const mockDb = createMockDb({
      partsListResult: [{ id: mockPartsListId, mocId: 'different-moc' }],
    })

    const result = await deletePartsList(mockDb, mockSchema, mockUserId, mockMocId, mockPartsListId)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('NOT_FOUND')
    }
  })
})
