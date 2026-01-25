/**
 * Tests for updatePartsListStatus core function
 */

import { describe, it, expect, vi } from 'vitest'
import { updatePartsListStatus, type UpdatePartsListStatusDbClient, type UpdatePartsListStatusSchema } from '../update-parts-list-status.js'
import type { UpdatePartsListStatusInput } from '../__types__/index.js'

const mockSchema: UpdatePartsListStatusSchema = {
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

describe('updatePartsListStatus', () => {
  const mockUserId = 'user-123'
  const mockMocId = '11111111-1111-1111-1111-111111111111'
  const mockPartsListId = '22222222-2222-2222-2222-222222222222'
  const now = new Date()

  function createMockDb(overrides: Partial<{
    mocResult: Array<{ id: string; userId: string }>;
    partsListResult: Array<{ id: string; mocId: string }>;
    updateResult: Record<string, unknown>;
  }> = {}): UpdatePartsListStatusDbClient {
    const mocResult = overrides.mocResult ?? [{ id: mockMocId, userId: mockUserId }]
    const partsListResult = overrides.partsListResult ?? [{ id: mockPartsListId, mocId: mockMocId }]
    const updateResult = overrides.updateResult ?? {
      id: mockPartsListId,
      mocId: mockMocId,
      title: 'Test Parts List',
      description: null,
      built: true,
      purchased: true,
      notes: null,
      costEstimate: null,
      actualCost: null,
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

  it('should update built flag', async () => {
    const mockDb = createMockDb()
    const input: UpdatePartsListStatusInput = { built: true }

    const result = await updatePartsListStatus(mockDb, mockSchema, mockUserId, mockMocId, mockPartsListId, input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.built).toBe(true)
    }
  })

  it('should update purchased flag', async () => {
    const mockDb = createMockDb()
    const input: UpdatePartsListStatusInput = { purchased: true }

    const result = await updatePartsListStatus(mockDb, mockSchema, mockUserId, mockMocId, mockPartsListId, input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.purchased).toBe(true)
    }
  })

  it('should update both flags at once', async () => {
    const mockDb = createMockDb()
    const input: UpdatePartsListStatusInput = { built: true, purchased: true }

    const result = await updatePartsListStatus(mockDb, mockSchema, mockUserId, mockMocId, mockPartsListId, input)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.built).toBe(true)
      expect(result.data.purchased).toBe(true)
    }
  })

  it('should return NOT_FOUND when MOC does not exist', async () => {
    const mockDb = createMockDb({ mocResult: [] })
    const input: UpdatePartsListStatusInput = { built: true }

    const result = await updatePartsListStatus(mockDb, mockSchema, mockUserId, mockMocId, mockPartsListId, input)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error).toBe('NOT_FOUND')
    }
  })
})
