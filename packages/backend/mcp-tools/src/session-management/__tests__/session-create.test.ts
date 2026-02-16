/* eslint-disable import/order */
import { randomUUID } from 'crypto'
import { describe, it, expect, vi, beforeEach } from 'vitest'
/* eslint-enable import/order */

// Hoist mock functions so vi.mock factory can access them
const { mockReturning, mockValues, mockInsert, mockWarn } = vi.hoisted(() => {
  const mockReturning = vi.fn().mockResolvedValue([
    {
      id: randomUUID(),
      sessionId: randomUUID(),
      agentName: 'test-agent',
      storyId: null,
      phase: null,
      inputTokens: 0,
      outputTokens: 0,
      cachedTokens: 0,
      startedAt: new Date(),
      endedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ])
  const mockValues = vi.fn().mockReturnValue({ returning: mockReturning })
  const mockInsert = vi.fn().mockReturnValue({ values: mockValues })
  const mockWarn = vi.fn()
  return { mockReturning, mockValues, mockInsert, mockWarn }
})

vi.mock('@repo/db', () => ({
  db: {
    insert: mockInsert,
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

import { sessionCreate } from '../session-create'
import type { SessionCreateInput } from '../__types__/index'

describe('sessionCreate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    const defaultSession = {
      id: randomUUID(),
      sessionId: randomUUID(),
      agentName: 'test-agent',
      storyId: null,
      phase: null,
      inputTokens: 0,
      outputTokens: 0,
      cachedTokens: 0,
      startedAt: new Date(),
      endedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    mockReturning.mockResolvedValue([defaultSession])
    mockValues.mockReturnValue({ returning: mockReturning })
    mockInsert.mockReturnValue({ values: mockValues })
    mockWarn.mockClear()
  })

  it('should create session with all fields populated (AC-1)', async () => {
    const sessionId = randomUUID()
    const startedAt = new Date('2026-02-15T12:00:00Z')
    const input: SessionCreateInput = {
      sessionId,
      agentName: 'dev-execute-leader',
      storyId: 'WINT-0110',
      phase: 'execute',
      inputTokens: 100,
      outputTokens: 50,
      cachedTokens: 25,
      startedAt,
    }

    const createdSession = {
      id: randomUUID(),
      sessionId,
      agentName: 'dev-execute-leader',
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
    mockReturning.mockResolvedValue([createdSession])

    const result = await sessionCreate(input)

    expect(mockInsert).toHaveBeenCalledTimes(1)
    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId,
        agentName: 'dev-execute-leader',
        storyId: 'WINT-0110',
        phase: 'execute',
        inputTokens: 100,
        outputTokens: 50,
        cachedTokens: 25,
        startedAt,
      }),
    )
    expect(result).toEqual(createdSession)
  })

  it('should auto-generate sessionId if not provided (AC-1)', async () => {
    const input: SessionCreateInput = {
      agentName: 'test-agent',
    }

    await sessionCreate(input)

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId: expect.stringMatching(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        ),
        agentName: 'test-agent',
      }),
    )
  })

  it('should create minimal session (agentName only)', async () => {
    const input: SessionCreateInput = {
      agentName: 'pm-story-seed',
    }

    const result = await sessionCreate(input)

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        agentName: 'pm-story-seed',
        storyId: null,
        phase: null,
        inputTokens: 0,
        outputTokens: 0,
        cachedTokens: 0,
      }),
    )
    expect(result).toBeTruthy()
  })

  it('should default token counts to 0', async () => {
    const input: SessionCreateInput = {
      agentName: 'test-agent',
    }

    await sessionCreate(input)

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        inputTokens: 0,
        outputTokens: 0,
        cachedTokens: 0,
      }),
    )
  })

  it('should handle NULL optional fields correctly', async () => {
    const input: SessionCreateInput = {
      agentName: 'test-agent',
      storyId: null,
      phase: null,
    }

    await sessionCreate(input)

    expect(mockValues).toHaveBeenCalledWith(
      expect.objectContaining({
        storyId: null,
        phase: null,
      }),
    )
  })

  it('should throw validation error if agentName is missing (AC-6)', async () => {
    await expect(
      // @ts-expect-error - testing missing required field
      sessionCreate({}),
    ).rejects.toThrow()
  })

  it('should throw validation error if agentName is empty string', async () => {
    await expect(
      sessionCreate({
        agentName: '',
      }),
    ).rejects.toThrow()
  })

  it('should throw validation error for invalid UUID format (AC-6)', async () => {
    await expect(
      sessionCreate({
        sessionId: 'not-a-uuid',
        agentName: 'test-agent',
      }),
    ).rejects.toThrow()
  })

  it('should throw validation error for negative token counts (AC-6)', async () => {
    await expect(
      sessionCreate({
        agentName: 'test-agent',
        inputTokens: -100,
      }),
    ).rejects.toThrow()

    await expect(
      sessionCreate({
        agentName: 'test-agent',
        outputTokens: -50,
      }),
    ).rejects.toThrow()

    await expect(
      sessionCreate({
        agentName: 'test-agent',
        cachedTokens: -25,
      }),
    ).rejects.toThrow()
  })

  it('should catch DB errors and log warning instead of throwing', async () => {
    mockReturning.mockRejectedValue(new Error('Connection refused'))

    // Should NOT throw
    const result = await sessionCreate({
      agentName: 'test-agent',
    })

    expect(result).toBeNull()
    expect(mockWarn).toHaveBeenCalledWith(
      expect.stringContaining("[mcp-tools] Failed to create session for agent 'test-agent'"),
      expect.stringContaining('Connection refused'),
    )
  })

  it('should handle duplicate sessionId error gracefully', async () => {
    mockReturning.mockRejectedValue(new Error('duplicate key value violates unique constraint'))

    const sessionId = randomUUID()
    const result = await sessionCreate({
      sessionId,
      agentName: 'test-agent',
    })

    expect(result).toBeNull()
    expect(mockWarn).toHaveBeenCalledWith(
      expect.stringContaining("[mcp-tools] Failed to create session for agent 'test-agent'"),
      expect.any(String),
    )
  })

  it('should accept different agent names', async () => {
    const agentNames = [
      'dev-execute-leader',
      'pm-story-seed',
      'dev-implementation-coder',
      'qa-verify-agent',
      'session-manager',
    ]

    for (const agentName of agentNames) {
      vi.clearAllMocks()
      const session = {
        id: randomUUID(),
        sessionId: randomUUID(),
        agentName,
        storyId: null,
        phase: null,
        inputTokens: 0,
        outputTokens: 0,
        cachedTokens: 0,
        startedAt: new Date(),
        endedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      mockReturning.mockResolvedValue([session])
      mockValues.mockReturnValue({ returning: mockReturning })
      mockInsert.mockReturnValue({ values: mockValues })

      await sessionCreate({ agentName })

      expect(mockInsert).toHaveBeenCalledTimes(1)
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          agentName,
        }),
      )
    }
  })

  it('should accept different phase values', async () => {
    const phases = ['setup', 'plan', 'execute', 'review', 'qa']

    for (const phase of phases) {
      vi.clearAllMocks()
      mockReturning.mockResolvedValue([
        {
          id: randomUUID(),
          sessionId: randomUUID(),
          agentName: 'test-agent',
          storyId: null,
          phase,
          inputTokens: 0,
          outputTokens: 0,
          cachedTokens: 0,
          startedAt: new Date(),
          endedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])
      mockValues.mockReturnValue({ returning: mockReturning })
      mockInsert.mockReturnValue({ values: mockValues })

      await sessionCreate({ agentName: 'test-agent', phase })

      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          phase,
        }),
      )
    }
  })
})
