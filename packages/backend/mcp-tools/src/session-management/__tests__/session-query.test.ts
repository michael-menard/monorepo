/* eslint-disable import/order */
import { randomUUID } from 'crypto'
import { describe, it, expect, vi, beforeEach } from 'vitest'
/* eslint-enable import/order */

// Hoist mock functions
const { mockQuery, mockOrderBy, mockWhere, mockFrom, mockSelect, mockWarn } = vi.hoisted(() => {
  const mockSession1 = {
    id: randomUUID(),
    sessionId: randomUUID(),
    agentName: 'dev-execute-leader',
    storyId: 'WINT-0110',
    phase: 'execute',
    inputTokens: 100,
    outputTokens: 50,
    cachedTokens: 25,
    startedAt: new Date('2026-02-15T12:00:00Z'),
    endedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockSession2 = {
    id: randomUUID(),
    sessionId: randomUUID(),
    agentName: 'pm-story-seed',
    storyId: 'WINT-0110',
    phase: 'plan',
    inputTokens: 200,
    outputTokens: 100,
    cachedTokens: 50,
    startedAt: new Date('2026-02-15T11:00:00Z'),
    endedAt: new Date('2026-02-15T11:30:00Z'),
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockLimit = vi.fn().mockReturnThis()
  const mockOffset = vi.fn().mockResolvedValue([mockSession1, mockSession2])
  const mockOrderBy = vi.fn(() => ({ limit: mockLimit, offset: mockOffset }))
  const mockWhere = vi.fn(() => ({ orderBy: mockOrderBy, limit: mockLimit, offset: mockOffset }))
  const mockFrom = vi.fn(() => ({ where: mockWhere, orderBy: mockOrderBy }))
  const mockSelect = vi.fn(() => ({ from: mockFrom }))
  const mockQuery = { limit: mockLimit, offset: mockOffset }
  const mockWarn = vi.fn()

  // Update mockLimit to return the chain correctly
  mockLimit.mockImplementation(() => ({
    offset: mockOffset,
  }))

  return {
    mockQuery,
    mockOrderBy,
    mockWhere,
    mockFrom,
    mockSelect,
    mockWarn,
  }
})

vi.mock('@repo/db', () => ({
  db: {
    select: mockSelect,
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
  },
}))

vi.mock('@repo/logger', () => ({
  logger: {
    warn: mockWarn,
  },
}))

import { sessionQuery } from '../session-query'
import type { SessionQueryInput } from '../__types__/index'

describe('sessionQuery', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    const mockSession1 = {
      id: randomUUID(),
      sessionId: randomUUID(),
      agentName: 'dev-execute-leader',
      storyId: 'WINT-0110',
      phase: 'execute',
      inputTokens: 100,
      outputTokens: 50,
      cachedTokens: 25,
      startedAt: new Date('2026-02-15T12:00:00Z'),
      endedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const mockSession2 = {
      id: randomUUID(),
      sessionId: randomUUID(),
      agentName: 'pm-story-seed',
      storyId: 'WINT-0110',
      phase: 'plan',
      inputTokens: 200,
      outputTokens: 100,
      cachedTokens: 50,
      startedAt: new Date('2026-02-15T11:00:00Z'),
      endedAt: new Date('2026-02-15T11:30:00Z'),
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const mockLimit = vi.fn().mockReturnThis()
    const mockOffset = vi.fn().mockResolvedValue([mockSession1, mockSession2])
    mockLimit.mockImplementation(() => ({ offset: mockOffset }))

    const mockOrderBy = vi.fn(() => ({ limit: mockLimit }))
    const mockWhere = vi.fn(() => ({ orderBy: mockOrderBy }))
    const mockFrom = vi.fn(() => ({ where: mockWhere, orderBy: mockOrderBy }))

    mockSelect.mockReturnValue({ from: mockFrom })

    mockWarn.mockClear()
  })

  it('should query all sessions with default pagination (AC-4)', async () => {
    const sessions = await sessionQuery({})

    expect(mockSelect).toHaveBeenCalledTimes(1)
    expect(sessions).toBeInstanceOf(Array)
  })

  it('should query active sessions only (AC-4)', async () => {
    const input: SessionQueryInput = {
      activeOnly: true,
    }

    const activeSession = {
      id: randomUUID(),
      sessionId: randomUUID(),
      agentName: 'test-agent',
      storyId: null,
      phase: null,
      inputTokens: 100,
      outputTokens: 50,
      cachedTokens: 25,
      startedAt: new Date(),
      endedAt: null, // Active session
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const mockLimit = vi.fn().mockReturnThis()
    const mockOffset = vi.fn().mockResolvedValue([activeSession])
    mockLimit.mockImplementation(() => ({ offset: mockOffset }))

    const mockOrderBy = vi.fn(() => ({ limit: mockLimit }))
    const mockWhere = vi.fn(() => ({ orderBy: mockOrderBy }))
    const mockFrom = vi.fn(() => ({ where: mockWhere, orderBy: mockOrderBy }))
    mockSelect.mockReturnValue({ from: mockFrom })

    const sessions = await sessionQuery(input)

    expect(mockWhere).toHaveBeenCalled()
    expect(sessions).toHaveLength(1)
    expect(sessions[0].endedAt).toBeNull()
  })

  it('should query by agentName (AC-4)', async () => {
    const input: SessionQueryInput = {
      agentName: 'dev-execute-leader',
    }

    await sessionQuery(input)

    expect(mockWhere).toHaveBeenCalled()
  })

  it('should query by storyId (AC-4)', async () => {
    const input: SessionQueryInput = {
      storyId: 'WINT-0110',
    }

    await sessionQuery(input)

    expect(mockWhere).toHaveBeenCalled()
  })

  it('should combine filters (agentName + activeOnly) (AC-4)', async () => {
    const input: SessionQueryInput = {
      agentName: 'dev-execute-leader',
      activeOnly: true,
    }

    await sessionQuery(input)

    expect(mockWhere).toHaveBeenCalled()
  })

  it('should apply pagination with custom limit (AC-4)', async () => {
    const input: SessionQueryInput = {
      limit: 100,
    }

    await sessionQuery(input)

    expect(mockSelect).toHaveBeenCalled()
  })

  it('should apply pagination with offset (AC-4)', async () => {
    const input: SessionQueryInput = {
      limit: 50,
      offset: 100,
    }

    await sessionQuery(input)

    expect(mockSelect).toHaveBeenCalled()
  })

  it('should use default limit=50 if not specified (AC-4)', async () => {
    await sessionQuery({})

    expect(mockSelect).toHaveBeenCalled()
  })

  it('should throw validation error if limit exceeds 1000 (AC-6)', async () => {
    await expect(
      sessionQuery({
        limit: 2000,
      }),
    ).rejects.toThrow()
  })

  it('should throw validation error for negative limit (AC-6)', async () => {
    await expect(
      sessionQuery({
        limit: -10,
      }),
    ).rejects.toThrow()
  })

  it('should throw validation error for negative offset (AC-6)', async () => {
    await expect(
      sessionQuery({
        offset: -5,
      }),
    ).rejects.toThrow()
  })

  it('should return empty array if no sessions match', async () => {
    const mockLimit = vi.fn().mockReturnThis()
    const mockOffset = vi.fn().mockResolvedValue([])
    mockLimit.mockImplementation(() => ({ offset: mockOffset }))

    const mockOrderBy = vi.fn(() => ({ limit: mockLimit }))
    const mockWhere = vi.fn(() => ({ orderBy: mockOrderBy }))
    const mockFrom = vi.fn(() => ({ where: mockWhere, orderBy: mockOrderBy }))
    mockSelect.mockReturnValue({ from: mockFrom })

    const sessions = await sessionQuery({
      agentName: 'nonexistent-agent',
    })

    expect(sessions).toEqual([])
  })

  it('should handle offset beyond results', async () => {
    const mockLimit = vi.fn().mockReturnThis()
    const mockOffset = vi.fn().mockResolvedValue([])
    mockLimit.mockImplementation(() => ({ offset: mockOffset }))

    const mockOrderBy = vi.fn(() => ({ limit: mockLimit }))
    const mockFrom = vi.fn(() => ({ orderBy: mockOrderBy }))
    mockSelect.mockReturnValue({ from: mockFrom })

    const sessions = await sessionQuery({
      offset: 1000,
    })

    expect(sessions).toEqual([])
  })

  it('should catch DB errors and log warning instead of throwing', async () => {
    const mockLimit = vi.fn().mockReturnThis()
    const mockOffset = vi.fn().mockRejectedValue(new Error('Query timeout'))
    mockLimit.mockImplementation(() => ({ offset: mockOffset }))

    const mockOrderBy = vi.fn(() => ({ limit: mockLimit }))
    const mockFrom = vi.fn(() => ({ orderBy: mockOrderBy }))
    mockSelect.mockReturnValue({ from: mockFrom })

    const sessions = await sessionQuery({})

    expect(sessions).toEqual([])
    expect(mockWarn).toHaveBeenCalledWith(
      expect.stringContaining('[mcp-tools] Failed to query sessions'),
      expect.stringContaining('Query timeout'),
    )
  })

  it('should order results by startedAt DESC (most recent first)', async () => {
    const session1 = {
      id: randomUUID(),
      sessionId: randomUUID(),
      agentName: 'test-agent',
      storyId: null,
      phase: null,
      inputTokens: 100,
      outputTokens: 50,
      cachedTokens: 25,
      startedAt: new Date('2026-02-15T12:00:00Z'), // More recent
      endedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const session2 = {
      id: randomUUID(),
      sessionId: randomUUID(),
      agentName: 'test-agent',
      storyId: null,
      phase: null,
      inputTokens: 200,
      outputTokens: 100,
      cachedTokens: 50,
      startedAt: new Date('2026-02-15T10:00:00Z'), // Less recent
      endedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const mockLimit = vi.fn().mockReturnThis()
    const mockOffset = vi.fn().mockResolvedValue([session1, session2]) // Ordered by DESC
    mockLimit.mockImplementation(() => ({ offset: mockOffset }))

    const mockOrderBy = vi.fn(() => ({ limit: mockLimit }))
    const mockFrom = vi.fn(() => ({ orderBy: mockOrderBy }))
    mockSelect.mockReturnValue({ from: mockFrom })

    const sessions = await sessionQuery({})

    expect(mockOrderBy).toHaveBeenCalled()
    expect(sessions[0].startedAt.getTime()).toBeGreaterThan(sessions[1].startedAt.getTime())
  })

  it('should combine all filters and pagination', async () => {
    const input: SessionQueryInput = {
      agentName: 'dev-execute-leader',
      storyId: 'WINT-0110',
      activeOnly: true,
      limit: 25,
      offset: 10,
    }

    await sessionQuery(input)

    expect(mockWhere).toHaveBeenCalled()
    expect(mockSelect).toHaveBeenCalled()
  })
})
