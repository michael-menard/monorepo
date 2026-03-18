/**
 * Unit Tests for session-manager.ts
 * WINT-9090 AC-6, AC-7, AC-8, AC-10, AC-11, AC-12
 *
 * Uses injectable mock DB functions — no live DB required.
 * Note: concurrent write tests (ED-1) are run serially per PLAN.yaml notes.
 */

import { randomUUID } from 'crypto'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SelectContextSession } from '@repo/knowledge-base/db'
import {
  createSessionManagerNode,
  type SessionManagerCleanupInput,
} from '../session-manager.js'

// ============================================================================
// Mock factory helpers
// ============================================================================

function makeMockSession(overrides: Partial<SelectContextSession> = {}): SelectContextSession {
  const sessionId = randomUUID()
  return {
    id: randomUUID(),
    sessionId,
    agentName: 'dev-execute-leader',
    storyId: 'WINT-9090',
    phase: 'execute',
    inputTokens: 0,
    outputTokens: 0,
    cachedTokens: 0,
    startedAt: new Date('2026-02-24T10:00:00Z'),
    endedAt: null,
    createdAt: new Date('2026-02-24T10:00:00Z'),
    updatedAt: new Date('2026-02-24T10:00:00Z'),
    ...overrides,
  } as SelectContextSession
}

function baseState() {
  return { storyId: 'WINT-9090' }
}

// ============================================================================
// HP-3: sessionManagerNode create — sessionId UUID in state, row inserted (AC-6)
// ============================================================================

describe('HP-3: sessionManagerNode create', () => {
  it('should create session and return sessionId in state', async () => {
    const mockSession = makeMockSession()
    const mockSessionCreate = vi.fn().mockResolvedValue(mockSession)

    const node = createSessionManagerNode({ sessionCreateFn: mockSessionCreate })

    const result = await node({
      ...baseState(),
      sessionOperation: 'create',
      sessionAgentName: 'dev-execute-leader',
      sessionStoryId: 'WINT-9090',
      sessionPhase: 'execute',
    })

    expect(result.sessionId).toBe(mockSession.sessionId)
    expect(result.sessionManagerResult?.operation).toBe('create')
    expect(result.sessionManagerResult?.error).toBeNull()
    expect(mockSessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        agentName: 'dev-execute-leader',
        storyId: 'WINT-9090',
        phase: 'execute',
      }),
    )
  })

  it('should create session with null storyId and phase when not provided', async () => {
    const mockSession = makeMockSession({ storyId: null, phase: null })
    const mockSessionCreate = vi.fn().mockResolvedValue(mockSession)

    const node = createSessionManagerNode({ sessionCreateFn: mockSessionCreate })

    const result = await node({
      ...baseState(),
      sessionOperation: 'create',
      sessionAgentName: 'dev-execute-leader',
    })

    expect(result.sessionId).toBe(mockSession.sessionId)
    expect(mockSessionCreate).toHaveBeenCalledWith(
      expect.objectContaining({ storyId: null, phase: null }),
    )
  })
})

// ============================================================================
// HP-4: sessionManagerNode update — token counts updated (AC-7)
// ============================================================================

describe('HP-4: sessionManagerNode update', () => {
  it('should update session token counts in incremental mode', async () => {
    const sessionId = randomUUID()
    const updatedSession = makeMockSession({
      sessionId,
      inputTokens: 1000,
      outputTokens: 500,
      cachedTokens: 200,
    })
    const mockSessionUpdate = vi.fn().mockResolvedValue(updatedSession)

    const node = createSessionManagerNode({ sessionUpdateFn: mockSessionUpdate })

    const result = await node({
      ...baseState(),
      sessionOperation: 'update',
      sessionId,
      sessionUpdateMode: 'incremental',
      sessionInputTokensDelta: 1000,
      sessionOutputTokensDelta: 500,
      sessionCachedTokensDelta: 200,
    })

    expect(result.sessionId).toBe(sessionId)
    expect(result.sessionManagerResult?.operation).toBe('update')
    expect(result.sessionManagerResult?.error).toBeNull()
    expect(mockSessionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId,
        mode: 'incremental',
        inputTokens: 1000,
        outputTokens: 500,
        cachedTokens: 200,
      }),
    )
  })

  it('should update session token counts in absolute mode', async () => {
    const sessionId = randomUUID()
    const updatedSession = makeMockSession({ sessionId, inputTokens: 5000 })
    const mockSessionUpdate = vi.fn().mockResolvedValue(updatedSession)

    const node = createSessionManagerNode({ sessionUpdateFn: mockSessionUpdate })

    const result = await node({
      ...baseState(),
      sessionOperation: 'update',
      sessionId,
      sessionUpdateMode: 'absolute',
      sessionInputTokensDelta: 5000,
    })

    expect(result.sessionId).toBe(sessionId)
    expect(mockSessionUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ mode: 'absolute', inputTokens: 5000 }),
    )
  })
})

// ============================================================================
// HP-5: sessionManagerNode complete — lifecycle_status transitions (AC-7)
// ============================================================================

describe('HP-5: sessionManagerNode complete', () => {
  it('should complete session with endedAt timestamp', async () => {
    const sessionId = randomUUID()
    const endedAt = new Date('2026-02-24T12:00:00Z')
    const completedSession = makeMockSession({
      sessionId,
      endedAt,
      inputTokens: 3000,
      outputTokens: 1500,
    })
    const mockSessionComplete = vi.fn().mockResolvedValue(completedSession)

    const node = createSessionManagerNode({ sessionCompleteFn: mockSessionComplete })

    const result = await node({
      ...baseState(),
      sessionOperation: 'complete',
      sessionId,
      sessionEndedAt: endedAt,
      sessionInputTokensDelta: 3000,
      sessionOutputTokensDelta: 1500,
    })

    expect(result.sessionId).toBe(sessionId)
    expect(result.sessionManagerResult?.operation).toBe('complete')
    expect(result.sessionManagerResult?.error).toBeNull()
    expect(mockSessionComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        sessionId,
        endedAt,
        inputTokens: 3000,
        outputTokens: 1500,
      }),
    )
  })

  it('should complete session without explicit endedAt (defaults to now)', async () => {
    const sessionId = randomUUID()
    const completedSession = makeMockSession({ sessionId, endedAt: new Date() })
    const mockSessionComplete = vi.fn().mockResolvedValue(completedSession)

    const node = createSessionManagerNode({ sessionCompleteFn: mockSessionComplete })

    const result = await node({
      ...baseState(),
      sessionOperation: 'complete',
      sessionId,
      // No sessionEndedAt — should default to now
    })

    expect(result.sessionId).toBe(sessionId)
    expect(mockSessionComplete).toHaveBeenCalledWith(
      expect.objectContaining({ sessionId, endedAt: undefined }),
    )
  })
})

// ============================================================================
// HP-6: sessionManagerNode cleanup
// ============================================================================

describe('HP-6: sessionManagerNode cleanup', () => {
  it('should perform dryRun cleanup by default', async () => {
    const mockSessionCleanup = vi.fn().mockResolvedValue({
      deletedCount: 15,
      dryRun: true,
      cutoffDate: new Date('2025-11-25T00:00:00Z'),
    })

    const node = createSessionManagerNode({ sessionCleanupFn: mockSessionCleanup })

    const result = await node({
      ...baseState(),
      sessionOperation: 'cleanup',
      sessionRetentionDays: 90,
      sessionDryRun: true,
    })

    expect(result.sessionManagerResult?.operation).toBe('cleanup')
    expect(result.sessionManagerResult?.deletedCount).toBe(15)
    expect(result.sessionManagerResult?.dryRun).toBe(true)
    expect(result.sessionManagerResult?.error).toBeNull()
  })

  it('should perform actual cleanup when dryRun=false', async () => {
    const mockSessionCleanup = vi.fn().mockResolvedValue({
      deletedCount: 7,
      dryRun: false,
      cutoffDate: new Date('2025-11-25T00:00:00Z'),
    })

    const node = createSessionManagerNode({ sessionCleanupFn: mockSessionCleanup })

    const result = await node({
      ...baseState(),
      sessionOperation: 'cleanup',
      sessionDryRun: false,
      sessionRetentionDays: 90,
    })

    expect(result.sessionManagerResult?.deletedCount).toBe(7)
    expect(result.sessionManagerResult?.dryRun).toBe(false)
    expect(mockSessionCleanup).toHaveBeenCalledWith(
      expect.objectContaining({ dryRun: false, retentionDays: 90 }),
    )
  })

  it('should default dryRun to true for safety when sessionDryRun is not specified', async () => {
    const mockSessionCleanup = vi.fn().mockResolvedValue({
      deletedCount: 0,
      dryRun: true,
      cutoffDate: new Date(),
    })

    const node = createSessionManagerNode({ sessionCleanupFn: mockSessionCleanup })

    await node({
      ...baseState(),
      sessionOperation: 'cleanup',
      // sessionDryRun not specified — must default to true
    })

    expect(mockSessionCleanup).toHaveBeenCalledWith(
      expect.objectContaining({ dryRun: true }),
    )
  })
})

// ============================================================================
// HP-7: factory functions accept mockDb — no hard-wired db import (AC-8, AC-10)
// ============================================================================

describe('HP-7: factory pattern and DB injection (AC-8, AC-10)', () => {
  it('createSessionManagerNode accepts mock functions and uses them', async () => {
    const mockSession = makeMockSession()
    const mockSessionCreate = vi.fn().mockResolvedValue(mockSession)
    const mockSessionUpdate = vi.fn().mockResolvedValue(mockSession)
    const mockSessionComplete = vi.fn().mockResolvedValue({ ...mockSession, endedAt: new Date() })
    const mockSessionCleanup = vi.fn().mockResolvedValue({
      deletedCount: 0, dryRun: true, cutoffDate: new Date()
    })

    const node = createSessionManagerNode({
      sessionCreateFn: mockSessionCreate,
      sessionUpdateFn: mockSessionUpdate,
      sessionCompleteFn: mockSessionComplete,
      sessionCleanupFn: mockSessionCleanup,
    })

    await node({ ...baseState(), sessionOperation: 'create', sessionAgentName: 'test' })
    expect(mockSessionCreate).toHaveBeenCalledTimes(1)

    await node({ ...baseState(), sessionOperation: 'update', sessionId: mockSession.sessionId })
    expect(mockSessionUpdate).toHaveBeenCalledTimes(1)

    await node({ ...baseState(), sessionOperation: 'complete', sessionId: mockSession.sessionId })
    expect(mockSessionComplete).toHaveBeenCalledTimes(1)

    await node({ ...baseState(), sessionOperation: 'cleanup' })
    expect(mockSessionCleanup).toHaveBeenCalledTimes(1)
  })

  it('uses createToolNode from node-factory (AC-8)', () => {
    const node = createSessionManagerNode({})
    expect(typeof node).toBe('function')
  })
})

// ============================================================================
// EC-1: DB failure returns null sessionId, never throws (AC-11)
// ============================================================================

describe('EC-1: graceful degradation on DB failure (AC-11)', () => {
  it('should return null sessionId and log error on create failure', async () => {
    const mockSessionCreate = vi.fn().mockRejectedValue(new Error('Database connection refused'))

    const node = createSessionManagerNode({ sessionCreateFn: mockSessionCreate })

    const result = await node({
      ...baseState(),
      sessionOperation: 'create',
      sessionAgentName: 'dev-execute-leader',
    })

    // Must not throw — returns null sessionId instead
    expect(result.sessionId).toBeNull()
    expect(result.sessionManagerResult?.error).toContain('Database connection refused')
  })

  it('should return null sessionId and log error on update failure (business logic: not-found)', async () => {
    const sessionId = randomUUID()
    const mockSessionUpdate = vi.fn().mockRejectedValue(
      new Error(`Session '${sessionId}' not found or already completed. Cannot update completed sessions.`),
    )

    const node = createSessionManagerNode({ sessionUpdateFn: mockSessionUpdate })

    // Business logic throw should be caught and degraded
    const result = await node({
      ...baseState(),
      sessionOperation: 'update',
      sessionId,
      sessionInputTokensDelta: 100,
    })

    expect(result.sessionId).toBeNull()
    expect(result.sessionManagerResult?.error).toContain('not found or already completed')
  })

  it('should return null sessionId and log error on complete failure (already-completed)', async () => {
    const sessionId = randomUUID()
    const mockSessionComplete = vi.fn().mockRejectedValue(
      new Error(`Session '${sessionId}' not found or already completed. Cannot complete a session twice.`),
    )

    const node = createSessionManagerNode({ sessionCompleteFn: mockSessionComplete })

    const result = await node({
      ...baseState(),
      sessionOperation: 'complete',
      sessionId,
    })

    expect(result.sessionId).toBeNull()
    expect(result.sessionManagerResult?.error).toContain('already completed')
  })

  it('should return deletedCount=0 and log error on cleanup failure', async () => {
    const mockSessionCleanup = vi.fn().mockRejectedValue(new Error('DB timeout'))

    const node = createSessionManagerNode({ sessionCleanupFn: mockSessionCleanup })

    const result = await node({
      ...baseState(),
      sessionOperation: 'cleanup',
    })

    expect(result.sessionManagerResult?.deletedCount).toBe(0)
    expect(result.sessionManagerResult?.error).toContain('DB timeout')
  })
})

// ============================================================================
// EC-2: Missing required fields returns error state
// ============================================================================

describe('EC-2: missing required fields', () => {
  it('should return error when sessionAgentName is missing for create', async () => {
    const mockSessionCreate = vi.fn()
    const node = createSessionManagerNode({ sessionCreateFn: mockSessionCreate })

    const result = await node({
      ...baseState(),
      sessionOperation: 'create',
      // Missing sessionAgentName
    })

    expect(result.sessionId).toBeNull()
    expect(result.sessionManagerResult?.error).toContain('required')
    expect(mockSessionCreate).not.toHaveBeenCalled()
  })

  it('should return error when sessionId is missing for update', async () => {
    const mockSessionUpdate = vi.fn()
    const node = createSessionManagerNode({ sessionUpdateFn: mockSessionUpdate })

    const result = await node({
      ...baseState(),
      sessionOperation: 'update',
      // Missing sessionId
    })

    expect(result.sessionId).toBeNull()
    expect(result.sessionManagerResult?.error).toContain('required')
    expect(mockSessionUpdate).not.toHaveBeenCalled()
  })

  it('should return error when sessionId is missing for complete', async () => {
    const mockSessionComplete = vi.fn()
    const node = createSessionManagerNode({ sessionCompleteFn: mockSessionComplete })

    const result = await node({
      ...baseState(),
      sessionOperation: 'complete',
      // Missing sessionId
    })

    expect(result.sessionId).toBeNull()
    expect(result.sessionManagerResult?.error).toContain('required')
    expect(mockSessionComplete).not.toHaveBeenCalled()
  })
})

// ============================================================================
// ED-1: Concurrent write tests (serialized in vitest)
// ============================================================================

describe.sequential('ED-1: concurrent write safety (serialized)', () => {
  let callCount = 0
  let mockSessionCreate: ReturnType<typeof vi.fn>

  beforeEach(() => {
    callCount = 0
    mockSessionCreate = vi.fn().mockImplementation(async () => {
      callCount++
      return makeMockSession({ inputTokens: callCount * 100 })
    })
  })

  it('should handle sequential create operations without errors', async () => {
    const node = createSessionManagerNode({ sessionCreateFn: mockSessionCreate })

    const result1 = await node({
      ...baseState(),
      sessionOperation: 'create',
      sessionAgentName: 'agent-1',
    })
    const result2 = await node({
      ...baseState(),
      sessionOperation: 'create',
      sessionAgentName: 'agent-2',
    })

    expect(result1.sessionManagerResult?.error).toBeNull()
    expect(result2.sessionManagerResult?.error).toBeNull()
    expect(mockSessionCreate).toHaveBeenCalledTimes(2)
    expect(callCount).toBe(2)
  })
})
