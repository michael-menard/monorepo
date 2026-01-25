/**
 * Tests for updatePartsList core function
 */

import { describe, it, expect, vi } from 'vitest'
import { updatePartsList, type UpdatePartsListDbClient, type UpdatePartsListSchema } from '../update-parts-list.js'
import type { UpdatePartsListInput } from '../__types__/index.js'

const mockSchema: UpdatePartsListSchema = {
  mocPartsLists: {
    id: 'id',
    mocId: 'moc_id',
    title: 'title',
    description: 'description',
    built: 'built',
    purchased: 'purchased',
    notes: 'notes',
    costEstimate: 'cost_estimate',
    actualCost: 'actual_cost',
    totalPartsCount: 'total_parts_count',
    acquiredPartsCount: 'acquired_parts_count',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
  mocInstructions: {
    id: 'id',
    userId: 'user_id',
  },
}

describe('updatePartsList', () => {
  const mockUserId = 'user-123'
  const mockMocId = '11111111-1111-1111-1111-111111111111'
  const mockPartsListId = '22222222-2222-2222-2222-222222222222'
  const now = new Date()

  function createMockDb(overrides: Partial<{
    mocResult: Array<{ id: string; userId: string }>;
    partsListResult: Array<{ id: string; mocId: string }>;
    updateResult: Record<string, unknown>;
  }> = {}): UpdatePartsListDbClient {
    const mocResult = overrides.mocResult ?? [{ id: mockMocId, userId: mockUserId }]
    const partsListResult = overrides.partsListResult ?? [{ id: mockPartsListId, mocId: mockMocId }]
    const updateResult = overrides.updateResult ?? {
      id: mockPartsListId,
      mocId: mockMocId,
      title: 'Updated Title',
      description: 'Updated description',
      built: false,
      purchased: false,
      notes: 'Updated notes',
      costEstimate: '100.00',
      actualCost: '95.00',
      totalPartsCount: '50',
      acquiredPartsCount: '0',
      createdAt: now,
      updatedAt: now,
    }

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
      update: vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updateResult]),
          }),
        }),
      }),
    }
  }

  it('should update parts list metadata', async () => {
    const mockDb = createMockDb()
    const input: UpdatePartsListInput = {
      title: 'Updated Title',
      description: 'Updated description',
    }

    const result = await updatePartsList(mockDb, mockSchema, mockUserId, mockMocId, mockPartsListId, input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.title).toBe('Updated Title')
    }
  })

  it('should return NOT_FOUND when MOC does not exist', async () => {
    const mockDb = createMockDb({ mocResult: [] })
    const input: UpdatePartsListInput = { title: 'Test' }

    const result = await updatePartsList(mockDb, mockSchema, mockUserId, mockMocId, mockPartsListId, input)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('NOT_FOUND')
      expect(result.message).toBe('MOC not found')
    }
  })

  it('should return NOT_FOUND when parts list does not exist', async () => {
    const mockDb = createMockDb({ partsListResult: [] })
    const input: UpdatePartsListInput = { title: 'Test' }

    const result = await updatePartsList(mockDb, mockSchema, mockUserId, mockMocId, mockPartsListId, input)

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
    const input: UpdatePartsListInput = { title: 'Test' }

    const result = await updatePartsList(mockDb, mockSchema, mockUserId, mockMocId, mockPartsListId, input)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('NOT_FOUND')
    }
  })
})
