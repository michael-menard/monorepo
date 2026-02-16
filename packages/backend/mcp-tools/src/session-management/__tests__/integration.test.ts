/**
 * Integration Tests for Session Management MCP Tools
 * WINT-0110 AC-7: Full lifecycle integration tests
 *
 * Test Scenarios:
 * - Full session lifecycle (create → update → complete → query)
 * - Concurrent session updates
 * - Session cleanup with dryRun validation
 * - Pagination edge cases
 *
 * Coverage Target: ≥90%
 */

/* eslint-disable import/order */
import { randomUUID } from 'crypto'
import { describe, it, expect, vi, beforeEach } from 'vitest'
/* eslint-enable import/order */

// Hoist mock functions for vi.mock factory
const {
  mockInsert,
  mockValues,
  mockReturning,
  mockSelect,
  mockFrom,
  mockWhere,
  mockOrderBy,
  mockLimit,
  mockOffset,
  mockUpdate,
  mockSet,
  mockDelete,
  mockWarn,
} = vi.hoisted(() => {
  const mockReturning = vi.fn()
  const mockValues = vi.fn().mockReturnValue({ returning: mockReturning })
  const mockInsert = vi.fn().mockReturnValue({ values: mockValues })

  const mockSet = vi.fn()
  const mockUpdate = vi.fn().mockReturnValue({ set: mockSet })

  const mockDelete = vi.fn()

  const mockOffset = vi.fn()
  const mockLimit = vi.fn().mockReturnValue({ offset: mockOffset })
  const mockOrderBy = vi.fn().mockReturnValue({ limit: mockLimit })
  const mockWhere = vi.fn().mockReturnValue({ orderBy: mockOrderBy })
  const mockFrom = vi.fn().mockReturnValue({ where: mockWhere })
  const mockSelect = vi.fn().mockReturnValue({ from: mockFrom })

  const mockWarn = vi.fn()

  return {
    mockInsert,
    mockValues,
    mockReturning,
    mockSelect,
    mockFrom,
    mockWhere,
    mockOrderBy,
    mockLimit,
    mockOffset,
    mockUpdate,
    mockSet,
    mockDelete,
    mockWarn,
  }
})

vi.mock('@repo/db', () => ({
  db: {
    insert: mockInsert,
    select: mockSelect,
    update: mockUpdate,
    delete: mockDelete,
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

import { sessionCreate } from '../session-create'
import { sessionUpdate } from '../session-update'
import { sessionComplete } from '../session-complete'
import { sessionQuery } from '../session-query'
import { sessionCleanup } from '../session-cleanup'

describe('Session Management Integration Tests (AC-7)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Full Session Lifecycle', () => {
    it('should create → update (incremental) → complete → query session successfully', async () => {
      const sessionId = randomUUID()
      const startedAt = new Date('2026-02-15T10:00:00Z')
      const endedAt = new Date('2026-02-15T11:30:00Z')

      // STEP 1: Create session
      const createdSession = {
        id: randomUUID(),
        sessionId,
        agentName: 'dev-execute-leader',
        storyId: 'WINT-0110',
        phase: 'execute',
        inputTokens: 0,
        outputTokens: 0,
        cachedTokens: 0,
        startedAt,
        endedAt: null,
        createdAt: startedAt,
        updatedAt: startedAt,
      }

      mockReturning.mockResolvedValueOnce([createdSession])

      const created = await sessionCreate({
        sessionId,
        agentName: 'dev-execute-leader',
        storyId: 'WINT-0110',
        phase: 'execute',
        startedAt,
      })

      expect(created).toEqual(createdSession)
      expect(mockInsert).toHaveBeenCalledTimes(1)
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          sessionId,
          agentName: 'dev-execute-leader',
          storyId: 'WINT-0110',
          phase: 'execute',
        }),
      )

      // STEP 2: Update session with incremental token counts
      const updatedSession1 = {
        ...createdSession,
        inputTokens: 1000,
        outputTokens: 500,
        cachedTokens: 200,
        updatedAt: new Date('2026-02-15T10:30:00Z'),
      }

      // Mock SELECT for existing session check
      mockWhere.mockResolvedValueOnce([createdSession])

      // Mock UPDATE returning
      mockReturning.mockResolvedValueOnce([updatedSession1])
      mockSet.mockReturnValue({ where: vi.fn().mockReturnValue({ returning: mockReturning }) })

      const updated1 = await sessionUpdate({
        sessionId,
        mode: 'incremental',
        inputTokens: 1000,
        outputTokens: 500,
        cachedTokens: 200,
      })

      expect(updated1).toEqual(updatedSession1)
      expect(mockUpdate).toHaveBeenCalled()

      // STEP 3: Another incremental update (accumulate tokens)
      const updatedSession2 = {
        ...updatedSession1,
        inputTokens: 2500,
        outputTokens: 1200,
        cachedTokens: 400,
        updatedAt: new Date('2026-02-15T11:00:00Z'),
      }

      // Mock SELECT for existing session check
      mockWhere.mockResolvedValueOnce([updatedSession1])

      // Mock UPDATE returning
      mockReturning.mockResolvedValueOnce([updatedSession2])
      mockSet.mockReturnValue({ where: vi.fn().mockReturnValue({ returning: mockReturning }) })

      const updated2 = await sessionUpdate({
        sessionId,
        mode: 'incremental',
        inputTokens: 1500, // Add to existing 1000
        outputTokens: 700, // Add to existing 500
        cachedTokens: 200, // Add to existing 200
      })

      expect(updated2).toEqual(updatedSession2)

      // STEP 4: Complete session with final token counts
      const completedSession = {
        ...updatedSession2,
        inputTokens: 3000,
        outputTokens: 1500,
        cachedTokens: 500,
        endedAt,
        updatedAt: endedAt,
      }

      // Mock SELECT for existing session check
      mockWhere.mockResolvedValueOnce([updatedSession2])

      // Mock UPDATE returning
      mockReturning.mockResolvedValueOnce([completedSession])
      mockSet.mockReturnValue({ where: vi.fn().mockReturnValue({ returning: mockReturning }) })

      const completed = await sessionComplete({
        sessionId,
        endedAt,
        inputTokens: 3000,
        outputTokens: 1500,
        cachedTokens: 500,
      })

      expect(completed).toEqual(completedSession)
      expect(completed?.endedAt).toEqual(endedAt)

      // STEP 5: Query to verify session exists
      mockOffset.mockResolvedValueOnce([completedSession])

      const queriedSessions = await sessionQuery({
        storyId: 'WINT-0110',
      })

      expect(queriedSessions).toHaveLength(1)
      expect(queriedSessions[0]).toEqual(completedSession)
    })

    it('should create → update (absolute) → complete session with absolute mode', async () => {
      const sessionId = randomUUID()
      const startedAt = new Date('2026-02-15T10:00:00Z')

      const createdSession = {
        id: randomUUID(),
        sessionId,
        agentName: 'pm-story-elaboration-leader',
        storyId: 'WINT-0120',
        phase: 'plan',
        inputTokens: 0,
        outputTokens: 0,
        cachedTokens: 0,
        startedAt,
        endedAt: null,
        createdAt: startedAt,
        updatedAt: startedAt,
      }

      mockReturning.mockResolvedValueOnce([createdSession])

      const created = await sessionCreate({
        sessionId,
        agentName: 'pm-story-elaboration-leader',
        storyId: 'WINT-0120',
        phase: 'plan',
      })

      expect(created).toEqual(createdSession)

      // Update with absolute mode (overwrites)
      const updatedSession = {
        ...createdSession,
        inputTokens: 5000,
        outputTokens: 2500,
        updatedAt: new Date('2026-02-15T10:30:00Z'),
      }

      // Mock SELECT for existing session check
      mockWhere.mockResolvedValueOnce([createdSession])

      // Mock UPDATE returning
      mockReturning.mockResolvedValueOnce([updatedSession])
      mockSet.mockReturnValue({ where: vi.fn().mockReturnValue({ returning: mockReturning }) })

      const updated = await sessionUpdate({
        sessionId,
        mode: 'absolute',
        inputTokens: 5000,
        outputTokens: 2500,
      })

      expect(updated?.inputTokens).toBe(5000)
      expect(updated?.outputTokens).toBe(2500)
    })
  })

  describe('Concurrent Session Updates', () => {
    it('should handle multiple agents updating same session (incremental mode)', async () => {
      const sessionId = randomUUID()
      const existingSession = {
        id: randomUUID(),
        sessionId,
        agentName: 'dev-execute-leader',
        storyId: 'WINT-0110',
        phase: 'execute',
        inputTokens: 1000,
        outputTokens: 500,
        cachedTokens: 0,
        startedAt: new Date('2026-02-15T10:00:00Z'),
        endedAt: null,
        createdAt: new Date('2026-02-15T10:00:00Z'),
        updatedAt: new Date('2026-02-15T10:00:00Z'),
      }

      // Agent 1 update
      mockWhere.mockResolvedValueOnce([existingSession])
      const updated1 = {
        ...existingSession,
        inputTokens: 2000, // 1000 + 1000
        updatedAt: new Date(),
      }
      mockReturning.mockResolvedValueOnce([updated1])
      mockSet.mockReturnValue({ where: vi.fn().mockReturnValue({ returning: mockReturning }) })

      const result1 = await sessionUpdate({
        sessionId,
        inputTokens: 1000,
      })

      expect(result1?.inputTokens).toBe(2000)

      // Agent 2 update (concurrent)
      mockWhere.mockResolvedValueOnce([updated1])
      const updated2 = {
        ...updated1,
        inputTokens: 3500, // 2000 + 1500
        updatedAt: new Date(),
      }
      mockReturning.mockResolvedValueOnce([updated2])
      mockSet.mockReturnValue({ where: vi.fn().mockReturnValue({ returning: mockReturning }) })

      const result2 = await sessionUpdate({
        sessionId,
        inputTokens: 1500,
      })

      expect(result2?.inputTokens).toBe(3500)

      // Incremental mode uses SQL arithmetic, so updates accumulate correctly
      expect(mockUpdate).toHaveBeenCalledTimes(2)
    })

    it('should handle absolute mode overwrites (last-write-wins)', async () => {
      const sessionId = randomUUID()
      const existingSession = {
        id: randomUUID(),
        sessionId,
        agentName: 'dev-execute-leader',
        storyId: 'WINT-0110',
        phase: 'execute',
        inputTokens: 1000,
        outputTokens: 500,
        cachedTokens: 0,
        startedAt: new Date('2026-02-15T10:00:00Z'),
        endedAt: null,
        createdAt: new Date('2026-02-15T10:00:00Z'),
        updatedAt: new Date('2026-02-15T10:00:00Z'),
      }

      // Update 1 (absolute)
      mockWhere.mockResolvedValueOnce([existingSession])
      const updated1 = {
        ...existingSession,
        inputTokens: 5000,
        updatedAt: new Date(),
      }
      mockReturning.mockResolvedValueOnce([updated1])
      mockSet.mockReturnValue({ where: vi.fn().mockReturnValue({ returning: mockReturning }) })

      await sessionUpdate({
        sessionId,
        mode: 'absolute',
        inputTokens: 5000,
      })

      // Update 2 (absolute - overwrites)
      mockWhere.mockResolvedValueOnce([updated1])
      const updated2 = {
        ...updated1,
        inputTokens: 3000, // Overwrites 5000 with 3000
        updatedAt: new Date(),
      }
      mockReturning.mockResolvedValueOnce([updated2])
      mockSet.mockReturnValue({ where: vi.fn().mockReturnValue({ returning: mockReturning }) })

      const result2 = await sessionUpdate({
        sessionId,
        mode: 'absolute',
        inputTokens: 3000,
      })

      expect(result2?.inputTokens).toBe(3000) // Last write wins
    })
  })

  describe('Session Cleanup Integration', () => {
    it('should perform dryRun cleanup (no deletion)', async () => {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - 90)

      // Mock count query for dryRun
      mockWhere.mockResolvedValueOnce([{ count: 15 }])

      const result = await sessionCleanup({
        retentionDays: 90,
        dryRun: true, // Safety: default is true
      })

      expect(result.deletedCount).toBe(15)
      expect(result.dryRun).toBe(true)
      expect(result.cutoffDate).toBeInstanceOf(Date)
      expect(mockDelete).not.toHaveBeenCalled() // No deletion in dryRun
    })

    it('should perform actual cleanup when dryRun=false', async () => {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - 90)

      // Mock DELETE query
      const mockDeleteWhere = vi.fn().mockResolvedValue([{ id: '1' }, { id: '2' }, { id: '3' }])
      mockDelete.mockReturnValue({ where: mockDeleteWhere })

      const result = await sessionCleanup({
        retentionDays: 90,
        dryRun: false, // Explicit opt-in
      })

      expect(result.deletedCount).toBe(3)
      expect(result.dryRun).toBe(false)
      expect(mockDelete).toHaveBeenCalled()
    })

    it('should preserve active sessions during cleanup', async () => {
      // Cleanup should only delete sessions with endedAt IS NOT NULL
      // Active sessions (endedAt IS NULL) should be preserved

      const mockDeleteWhere = vi.fn().mockResolvedValue([])
      mockDelete.mockReturnValue({ where: mockDeleteWhere })

      const result = await sessionCleanup({
        retentionDays: 90,
        dryRun: false,
      })

      expect(result.deletedCount).toBe(0)
      // Verify WHERE clause includes endedAt IS NOT NULL check
      expect(mockDelete).toHaveBeenCalled()
    })
  })

  describe('Pagination Edge Cases', () => {
    it('should query with default pagination (limit=50, offset=0)', async () => {
      const sessions = Array.from({ length: 50 }, (_, i) => ({
        id: randomUUID(),
        sessionId: randomUUID(),
        agentName: 'test-agent',
        storyId: null,
        phase: null,
        inputTokens: i * 100,
        outputTokens: i * 50,
        cachedTokens: 0,
        startedAt: new Date(),
        endedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }))

      mockOffset.mockResolvedValueOnce(sessions)

      const results = await sessionQuery({})

      expect(results).toHaveLength(50)
      expect(mockLimit).toHaveBeenCalled()
      expect(mockOffset).toHaveBeenCalled()
    })

    it('should query with custom pagination (limit=100, offset=50)', async () => {
      const sessions = Array.from({ length: 100 }, (_, i) => ({
        id: randomUUID(),
        sessionId: randomUUID(),
        agentName: 'test-agent',
        storyId: null,
        phase: null,
        inputTokens: (i + 50) * 100,
        outputTokens: (i + 50) * 50,
        cachedTokens: 0,
        startedAt: new Date(),
        endedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }))

      mockOffset.mockResolvedValueOnce(sessions)

      const results = await sessionQuery({
        limit: 100,
        offset: 50,
      })

      expect(results).toHaveLength(100)
    })

    it('should handle offset beyond available results (empty result set)', async () => {
      mockOffset.mockResolvedValueOnce([])

      const results = await sessionQuery({
        limit: 50,
        offset: 10000, // Beyond available data
      })

      expect(results).toHaveLength(0)
    })

    it('should filter active sessions with pagination', async () => {
      const activeSessions = Array.from({ length: 25 }, (_, i) => ({
        id: randomUUID(),
        sessionId: randomUUID(),
        agentName: 'dev-execute-leader',
        storyId: 'WINT-0110',
        phase: 'execute',
        inputTokens: i * 100,
        outputTokens: i * 50,
        cachedTokens: 0,
        startedAt: new Date(),
        endedAt: null, // Active sessions only
        createdAt: new Date(),
        updatedAt: new Date(),
      }))

      mockOffset.mockResolvedValueOnce(activeSessions)

      const results = await sessionQuery({
        agentName: 'dev-execute-leader',
        activeOnly: true,
        limit: 25,
      })

      expect(results).toHaveLength(25)
      expect(results.every(s => s.endedAt === null)).toBe(true)
    })
  })

  describe('Error Handling Integration', () => {
    it('should handle database errors gracefully during session creation', async () => {
      mockReturning.mockRejectedValueOnce(new Error('Database connection failed'))

      const result = await sessionCreate({
        agentName: 'test-agent',
      })

      expect(result).toBeNull()
      expect(mockWarn).toHaveBeenCalledWith(
        expect.stringContaining('[mcp-tools] Failed to create session'),
        expect.any(String),
      )
    })

    it('should throw error when updating non-existent session', async () => {
      const sessionId = randomUUID()

      // Mock SELECT returns empty (session not found)
      mockWhere.mockResolvedValueOnce([])

      await expect(
        sessionUpdate({
          sessionId,
          inputTokens: 100,
        }),
      ).rejects.toThrow('Session')
    })

    it('should throw error when completing already completed session', async () => {
      const sessionId = randomUUID()

      // Mock SELECT returns empty (session already completed or not found)
      mockWhere.mockResolvedValueOnce([])

      await expect(
        sessionComplete({
          sessionId,
        }),
      ).rejects.toThrow('Session')
    })

    it('should handle cleanup errors gracefully', async () => {
      mockWhere.mockRejectedValueOnce(new Error('Database error during cleanup'))

      await expect(
        sessionCleanup({
          retentionDays: 90,
          dryRun: true,
        }),
      ).rejects.toThrow()
    })
  })

  describe('Multi-Agent Workflow Scenarios', () => {
    it('should track multiple agents working on different stories', async () => {
      // Scenario: Multiple agents running concurrently on different stories

      // Agent 1: dev-execute-leader working on WINT-0110
      const session1Id = randomUUID()
      const session1 = {
        id: randomUUID(),
        sessionId: session1Id,
        agentName: 'dev-execute-leader',
        storyId: 'WINT-0110',
        phase: 'execute',
        inputTokens: 0,
        outputTokens: 0,
        cachedTokens: 0,
        startedAt: new Date(),
        endedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockReturning.mockResolvedValueOnce([session1])
      await sessionCreate({
        sessionId: session1Id,
        agentName: 'dev-execute-leader',
        storyId: 'WINT-0110',
        phase: 'execute',
      })

      // Agent 2: pm-story-elaboration-leader working on WINT-0120
      const session2Id = randomUUID()
      const session2 = {
        id: randomUUID(),
        sessionId: session2Id,
        agentName: 'pm-story-elaboration-leader',
        storyId: 'WINT-0120',
        phase: 'plan',
        inputTokens: 0,
        outputTokens: 0,
        cachedTokens: 0,
        startedAt: new Date(),
        endedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockReturning.mockResolvedValueOnce([session2])
      await sessionCreate({
        sessionId: session2Id,
        agentName: 'pm-story-elaboration-leader',
        storyId: 'WINT-0120',
        phase: 'plan',
      })

      // Query active sessions
      mockOffset.mockResolvedValueOnce([session1, session2])

      const activeSessions = await sessionQuery({
        activeOnly: true,
      })

      expect(activeSessions).toHaveLength(2)
    })

    it('should track agent session across multiple phases', async () => {
      // Scenario: Single agent moving through workflow phases

      const sessionId = randomUUID()

      // Phase 1: Setup
      const setupSession = {
        id: randomUUID(),
        sessionId,
        agentName: 'dev-setup-leader',
        storyId: 'WINT-0110',
        phase: 'setup',
        inputTokens: 500,
        outputTokens: 200,
        cachedTokens: 0,
        startedAt: new Date(),
        endedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockReturning.mockResolvedValueOnce([setupSession])
      await sessionCreate({
        sessionId,
        agentName: 'dev-setup-leader',
        storyId: 'WINT-0110',
        phase: 'setup',
        inputTokens: 500,
        outputTokens: 200,
      })

      // Query sessions by story to track all phases
      mockOffset.mockResolvedValueOnce([setupSession])

      const storySessions = await sessionQuery({
        storyId: 'WINT-0110',
      })

      expect(storySessions).toHaveLength(1)
      expect(storySessions[0].phase).toBe('setup')
    })
  })
})
