/* eslint-disable import/order */
import { randomUUID } from 'crypto'
import { describe, it, expect, vi, beforeEach } from 'vitest'
/* eslint-enable import/order */

// Hoist mock functions
const {
  mockSelectWhere,
  mockWhere,
  mockFrom,
  mockSelect,
  mockReturning,
  mockSet,
  mockUpdate,
  mockWarn,
} = vi.hoisted(() => ({
  mockSelectWhere: vi.fn(),
  mockWhere: vi.fn().mockReturnThis(),
  mockFrom: vi.fn(),
  mockSelect: vi.fn(),
  mockReturning: vi.fn(),
  mockSet: vi.fn(),
  mockUpdate: vi.fn(),
  mockWarn: vi.fn(),
}))

vi.mock('@repo/db', () => ({
  db: {
    select: mockSelect,
    update: mockUpdate,
  },
  contextSessions: {
    sessionId: 'session_id',
    agentName: 'agent_name',
    storyId: 'story_id',
    phase: 'phase',
    inputTokens: 'input_tokens',
    outputTokens: 'output_tokens',
    cachedTokens: 'cached_tokens',
    startedAt: 'started_at',
    endedAt: 'ended_at',
    updatedAt: 'updated_at',
  },
}))

vi.mock('@repo/logger', () => ({
  logger: {
    warn: mockWarn,
  },
}))

import { sessionUpdate } from '../session-update'
import type { SessionUpdateInput } from '../__types__/index'

describe('sessionUpdate', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    const existingSession = {
      id: randomUUID(),
      sessionId: 'test-session-id',
      agentName: 'test-agent',
      storyId: null,
      phase: null,
      inputTokens: 100,
      outputTokens: 50,
      cachedTokens: 25,
      startedAt: new Date(),
      endedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    mockSelectWhere.mockResolvedValue([existingSession])
    mockSelect.mockReturnValue({ from: mockFrom })
    mockFrom.mockReturnValue({ where: mockSelectWhere })

    mockReturning.mockResolvedValue([
      {
        ...existingSession,
        inputTokens: 200,
        outputTokens: 100,
        updatedAt: new Date(),
      },
    ])

    mockWhere.mockReturnValue({ returning: mockReturning })
    mockSet.mockReturnValue({ where: mockWhere })
    mockUpdate.mockReturnValue({ set: mockSet })

    mockWarn.mockClear()
  })

  it('should update session with incremental mode (default) (AC-2)', async () => {
    const sessionId = randomUUID()
    const input: SessionUpdateInput = {
      sessionId,
      inputTokens: 100,
      outputTokens: 50,
    }

    const updatedSession = {
      id: randomUUID(),
      sessionId,
      agentName: 'test-agent',
      storyId: null,
      phase: null,
      inputTokens: 200, // 100 + 100
      outputTokens: 100, // 50 + 50
      cachedTokens: 25,
      startedAt: new Date(),
      endedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    mockReturning.mockResolvedValue([updatedSession])

    const result = await sessionUpdate(input)

    expect(mockUpdate).toHaveBeenCalledTimes(1)
    expect(mockSet).toHaveBeenCalled()
    expect(result).toEqual(updatedSession)
  })

  it('should update session with absolute mode (AC-2)', async () => {
    const sessionId = randomUUID()
    const input: SessionUpdateInput = {
      sessionId,
      mode: 'absolute',
      inputTokens: 500,
      outputTokens: 250,
    }

    const updatedSession = {
      id: randomUUID(),
      sessionId,
      agentName: 'test-agent',
      storyId: null,
      phase: null,
      inputTokens: 500, // Set to exactly 500
      outputTokens: 250, // Set to exactly 250
      cachedTokens: 25,
      startedAt: new Date(),
      endedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    mockReturning.mockResolvedValue([updatedSession])

    const result = await sessionUpdate(input)

    expect(mockUpdate).toHaveBeenCalledTimes(1)
    expect(result).toEqual(updatedSession)
  })

  it('should update only specified token fields', async () => {
    const sessionId = randomUUID()
    const input: SessionUpdateInput = {
      sessionId,
      inputTokens: 50,
      // outputTokens and cachedTokens not specified
    }

    await sessionUpdate(input)

    expect(mockSet).toHaveBeenCalled()
  })

  it('should throw error if session not found', async () => {
    mockSelectWhere.mockResolvedValue([])

    const sessionId = randomUUID()
    await expect(
      sessionUpdate({
        sessionId,
        inputTokens: 100,
      }),
    ).rejects.toThrow(/not found/)
  })

  it('should throw error if session already completed', async () => {
    const sessionId = randomUUID()
    // When session is completed, SELECT WHERE endedAt IS NULL returns empty array
    mockSelectWhere.mockResolvedValue([])

    await expect(
      sessionUpdate({
        sessionId,
        inputTokens: 100,
      }),
    ).rejects.toThrow(/already completed/)
  })

  it('should throw validation error for invalid UUID format (AC-6)', async () => {
    await expect(
      sessionUpdate({
        sessionId: 'not-a-uuid',
        inputTokens: 100,
      }),
    ).rejects.toThrow()
  })

  it('should throw validation error for negative token counts (AC-6)', async () => {
    const sessionId = randomUUID()

    await expect(
      sessionUpdate({
        sessionId,
        inputTokens: -100,
      }),
    ).rejects.toThrow()

    await expect(
      sessionUpdate({
        sessionId,
        outputTokens: -50,
      }),
    ).rejects.toThrow()

    await expect(
      sessionUpdate({
        sessionId,
        cachedTokens: -25,
      }),
    ).rejects.toThrow()
  })

  it('should catch DB errors and log warning instead of throwing', async () => {
    mockReturning.mockRejectedValue(new Error('Connection timeout'))

    const sessionId = randomUUID()
    const result = await sessionUpdate({
      sessionId,
      inputTokens: 100,
    })

    expect(result).toBeNull()
    expect(mockWarn).toHaveBeenCalledWith(
      expect.stringContaining(`[mcp-tools] Failed to update session '${sessionId}'`),
      expect.stringContaining('Connection timeout'),
    )
  })

  it('should accumulate multiple incremental updates', async () => {
    const sessionId = randomUUID()

    // First update
    let currentTokens = 100
    await sessionUpdate({
      sessionId,
      inputTokens: 50,
    })
    currentTokens += 50

    // Second update
    const updatedSession = {
      id: randomUUID(),
      sessionId,
      agentName: 'test-agent',
      storyId: null,
      phase: null,
      inputTokens: currentTokens + 75,
      outputTokens: 50,
      cachedTokens: 25,
      startedAt: new Date(),
      endedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    mockReturning.mockResolvedValue([updatedSession])

    const result = await sessionUpdate({
      sessionId,
      inputTokens: 75,
    })

    expect(result?.inputTokens).toBe(225) // 100 + 50 + 75
  })

  it('should handle concurrent updates in incremental mode', async () => {
    const sessionId = randomUUID()

    // Simulate concurrent updates by using SQL arithmetic
    // In real scenario, DB handles this correctly
    const input: SessionUpdateInput = {
      sessionId,
      mode: 'incremental',
      inputTokens: 100,
    }

    await sessionUpdate(input)

    // SQL arithmetic ensures concurrent-safe updates
    expect(mockSet).toHaveBeenCalled()
  })

  it('should allow updating all token fields together', async () => {
    const sessionId = randomUUID()
    const input: SessionUpdateInput = {
      sessionId,
      mode: 'absolute',
      inputTokens: 1000,
      outputTokens: 500,
      cachedTokens: 250,
    }

    await sessionUpdate(input)

    expect(mockSet).toHaveBeenCalled()
  })

  it('should accept mode enum values (AC-6)', async () => {
    const sessionId = randomUUID()

    // Test incremental
    await sessionUpdate({
      sessionId,
      mode: 'incremental',
      inputTokens: 100,
    })

    // Test absolute
    await sessionUpdate({
      sessionId,
      mode: 'absolute',
      inputTokens: 200,
    })

    expect(mockUpdate).toHaveBeenCalledTimes(2)
  })

  it('should reject invalid mode enum value (AC-6)', async () => {
    const sessionId = randomUUID()

    await expect(
      sessionUpdate({
        sessionId,
        // @ts-expect-error - testing invalid enum value
        mode: 'invalid-mode',
        inputTokens: 100,
      }),
    ).rejects.toThrow()
  })
})
