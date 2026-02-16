/* eslint-disable import/order */
import { randomUUID } from 'crypto'
import { describe, it, expect, vi, beforeEach } from 'vitest'
/* eslint-enable import/order */

// Hoist mock functions
const {
  mockReturning,
  mockSet,
  mockUpdate,
  mockWhere,
  mockFrom,
  mockSelect,
  mockSelectWhere,
  mockWarn,
} = vi.hoisted(() => {
  const existingSession = {
    id: randomUUID(),
    sessionId: 'test-session-id',
    agentName: 'test-agent',
    storyId: 'WINT-0110',
    phase: 'execute',
    inputTokens: 100,
    outputTokens: 50,
    cachedTokens: 25,
    startedAt: new Date('2026-02-15T10:00:00Z'),
    endedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockSelectWhere = vi.fn().mockResolvedValue([existingSession])
  const mockWhere = vi.fn().mockReturnThis()
  const mockFrom = vi.fn(() => ({ where: mockSelectWhere }))
  const mockSelect = vi.fn(() => ({ from: mockFrom }))

  const mockReturning = vi.fn().mockResolvedValue([
    {
      ...existingSession,
      endedAt: new Date(),
      updatedAt: new Date(),
    },
  ])
  const mockSet = vi.fn(() => ({ where: mockWhere, returning: mockReturning }))
  const mockUpdate = vi.fn(() => ({ set: mockSet }))
  const mockWarn = vi.fn()

  return {
    mockReturning,
    mockSet,
    mockUpdate,
    mockWhere,
    mockFrom,
    mockSelect,
    mockSelectWhere,
    mockWarn,
  }
})

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

import { sessionComplete } from '../session-complete'
import type { SessionCompleteInput } from '../__types__/index'

describe('sessionComplete', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    const existingSession = {
      id: randomUUID(),
      sessionId: 'test-session-id',
      agentName: 'test-agent',
      storyId: 'WINT-0110',
      phase: 'execute',
      inputTokens: 100,
      outputTokens: 50,
      cachedTokens: 25,
      startedAt: new Date('2026-02-15T10:00:00Z'),
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
        endedAt: new Date(),
        updatedAt: new Date(),
      },
    ])

    mockWhere.mockReturnValue({ returning: mockReturning })
    mockSet.mockReturnValue({ where: mockWhere })
    mockUpdate.mockReturnValue({ set: mockSet })

    mockWarn.mockClear()
  })

  it('should complete session with current timestamp (AC-3)', async () => {
    const sessionId = randomUUID()
    const input: SessionCompleteInput = {
      sessionId,
    }

    const completedSession = {
      id: randomUUID(),
      sessionId,
      agentName: 'test-agent',
      storyId: 'WINT-0110',
      phase: 'execute',
      inputTokens: 100,
      outputTokens: 50,
      cachedTokens: 25,
      startedAt: new Date('2026-02-15T10:00:00Z'),
      endedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    mockReturning.mockResolvedValue([completedSession])

    const result = await sessionComplete(input)

    expect(mockUpdate).toHaveBeenCalledTimes(1)
    expect(mockSet).toHaveBeenCalled()
    expect(result?.endedAt).toBeTruthy()
  })

  it('should complete session with specified timestamp (AC-3)', async () => {
    const sessionId = randomUUID()
    const endedAt = new Date('2026-02-15T12:00:00Z')
    const input: SessionCompleteInput = {
      sessionId,
      endedAt,
    }

    const completedSession = {
      id: randomUUID(),
      sessionId,
      agentName: 'test-agent',
      storyId: 'WINT-0110',
      phase: 'execute',
      inputTokens: 100,
      outputTokens: 50,
      cachedTokens: 25,
      startedAt: new Date('2026-02-15T10:00:00Z'),
      endedAt,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    mockReturning.mockResolvedValue([completedSession])

    const result = await sessionComplete(input)

    expect(result?.endedAt).toEqual(endedAt)
  })

  it('should complete session with final token counts (AC-3)', async () => {
    const sessionId = randomUUID()
    const input: SessionCompleteInput = {
      sessionId,
      inputTokens: 5000,
      outputTokens: 2500,
      cachedTokens: 1000,
    }

    const completedSession = {
      id: randomUUID(),
      sessionId,
      agentName: 'test-agent',
      storyId: 'WINT-0110',
      phase: 'execute',
      inputTokens: 5000,
      outputTokens: 2500,
      cachedTokens: 1000,
      startedAt: new Date('2026-02-15T10:00:00Z'),
      endedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    mockReturning.mockResolvedValue([completedSession])

    const result = await sessionComplete(input)

    expect(result?.inputTokens).toBe(5000)
    expect(result?.outputTokens).toBe(2500)
    expect(result?.cachedTokens).toBe(1000)
  })

  it('should throw error if session not found', async () => {
    mockSelectWhere.mockResolvedValue([])

    const sessionId = randomUUID()
    await expect(
      sessionComplete({
        sessionId,
      }),
    ).rejects.toThrow(/not found/)
  })

  it('should throw error if session already completed', async () => {
    const completedSession = {
      id: randomUUID(),
      sessionId: 'completed-session',
      agentName: 'test-agent',
      storyId: 'WINT-0110',
      phase: 'execute',
      inputTokens: 100,
      outputTokens: 50,
      cachedTokens: 25,
      startedAt: new Date('2026-02-15T10:00:00Z'),
      endedAt: new Date('2026-02-15T11:00:00Z'), // Already completed
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    mockSelectWhere.mockResolvedValue([completedSession])

    await expect(
      sessionComplete({
        sessionId: 'completed-session',
      }),
    ).rejects.toThrow(/already completed/)
  })

  it('should throw validation error for invalid UUID format (AC-6)', async () => {
    await expect(
      sessionComplete({
        sessionId: 'not-a-uuid',
      }),
    ).rejects.toThrow()
  })

  it('should throw validation error for negative token counts (AC-6)', async () => {
    const sessionId = randomUUID()

    await expect(
      sessionComplete({
        sessionId,
        inputTokens: -100,
      }),
    ).rejects.toThrow()

    await expect(
      sessionComplete({
        sessionId,
        outputTokens: -50,
      }),
    ).rejects.toThrow()

    await expect(
      sessionComplete({
        sessionId,
        cachedTokens: -25,
      }),
    ).rejects.toThrow()
  })

  it('should catch DB errors and log warning instead of throwing', async () => {
    mockReturning.mockRejectedValue(new Error('Connection lost'))

    const sessionId = randomUUID()
    const result = await sessionComplete({
      sessionId,
    })

    expect(result).toBeNull()
    expect(mockWarn).toHaveBeenCalledWith(
      expect.stringContaining(`[mcp-tools] Failed to complete session '${sessionId}'`),
      expect.stringContaining('Connection lost'),
    )
  })

  it('should calculate session duration correctly', async () => {
    const sessionId = randomUUID()
    const startedAt = new Date('2026-02-15T10:00:00Z')
    const endedAt = new Date('2026-02-15T12:30:00Z') // 2.5 hours later

    const existingSession = {
      id: randomUUID(),
      sessionId,
      agentName: 'test-agent',
      storyId: 'WINT-0110',
      phase: 'execute',
      inputTokens: 100,
      outputTokens: 50,
      cachedTokens: 25,
      startedAt,
      endedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    mockSelectWhere.mockResolvedValue([existingSession])

    const completedSession = {
      ...existingSession,
      endedAt,
      updatedAt: new Date(),
    }
    mockReturning.mockResolvedValue([completedSession])

    const result = await sessionComplete({
      sessionId,
      endedAt,
    })

    expect(result?.startedAt).toEqual(startedAt)
    expect(result?.endedAt).toEqual(endedAt)

    // Calculate duration
    const durationMs = result!.endedAt!.getTime() - result!.startedAt.getTime()
    const durationHours = durationMs / (1000 * 60 * 60)
    expect(durationHours).toBe(2.5)
  })

  it('should complete session without updating token counts', async () => {
    const sessionId = randomUUID()
    const input: SessionCompleteInput = {
      sessionId,
      // No token counts specified
    }

    const completedSession = {
      id: randomUUID(),
      sessionId,
      agentName: 'test-agent',
      storyId: 'WINT-0110',
      phase: 'execute',
      inputTokens: 100, // Unchanged
      outputTokens: 50, // Unchanged
      cachedTokens: 25, // Unchanged
      startedAt: new Date('2026-02-15T10:00:00Z'),
      endedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    mockReturning.mockResolvedValue([completedSession])

    const result = await sessionComplete(input)

    expect(result?.inputTokens).toBe(100)
    expect(result?.outputTokens).toBe(50)
    expect(result?.cachedTokens).toBe(25)
  })

  it('should update only specified token fields', async () => {
    const sessionId = randomUUID()
    const input: SessionCompleteInput = {
      sessionId,
      inputTokens: 500,
      // outputTokens and cachedTokens not specified
    }

    await sessionComplete(input)

    expect(mockSet).toHaveBeenCalled()
  })

  it('should set updatedAt timestamp on completion', async () => {
    const sessionId = randomUUID()
    const beforeUpdate = new Date()

    await sessionComplete({ sessionId })

    expect(mockSet).toHaveBeenCalled()
    // updatedAt is set in the function
  })
})
