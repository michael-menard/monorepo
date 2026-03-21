/* eslint-disable import/order */
import { randomUUID } from 'crypto'
import { describe, it, expect, vi, beforeEach } from 'vitest'
/* eslint-enable import/order */

// Hoist mock functions
const { mockTransaction, mockWarn } = vi.hoisted(() => ({
  mockTransaction: vi.fn(),
  mockWarn: vi.fn(),
}))

vi.mock('@repo/db', () => ({
  db: {
    transaction: mockTransaction,
  },
}))

vi.mock('@repo/knowledge-base/db', () => ({
  stories: { storyId: 'story_id', state: 'state', updatedAt: 'updated_at' },
  storyStateHistory: { storyId: 'story_id' },
  storyArtifacts: { id: 'id', storyId: 'story_id', artifactType: 'artifact_type' },
}))

vi.mock('@repo/logger', () => ({
  logger: {
    warn: mockWarn,
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('drizzle-orm', async () => {
  const actual = await vi.importActual('drizzle-orm')
  return {
    ...actual,
    eq: vi.fn((col, val) => ({ eq: [col, val] })),
    and: vi.fn((...args) => ({ and: args })),
  }
})

import { storyUpdateStatus, MCP_ARTIFACT_GATES } from '../story-update-status'
import type { StoryUpdateStatusInput } from '../__types__/index'

// ============================================================================
// MCP_ARTIFACT_GATES map tests
// ============================================================================

describe('MCP_ARTIFACT_GATES', () => {
  it('should gate needs_code_review on evidence artifact', () => {
    expect(MCP_ARTIFACT_GATES.needs_code_review).toEqual({
      artifactType: 'evidence',
      label: 'Dev proof (evidence)',
    })
  })

  it('should gate ready_for_qa on review artifact', () => {
    expect(MCP_ARTIFACT_GATES.ready_for_qa).toEqual({
      artifactType: 'review',
      label: 'Code review',
    })
  })

  it('should gate in_qa on review artifact', () => {
    expect(MCP_ARTIFACT_GATES.in_qa).toEqual({
      artifactType: 'review',
      label: 'Code review',
    })
  })

  it('should gate completed on qa_verify artifact', () => {
    expect(MCP_ARTIFACT_GATES.completed).toEqual({
      artifactType: 'qa_verify',
      label: 'QA verification',
    })
  })

  it('should not gate ungated states', () => {
    expect(MCP_ARTIFACT_GATES.in_progress).toBeUndefined()
    expect(MCP_ARTIFACT_GATES.ready).toBeUndefined()
    expect(MCP_ARTIFACT_GATES.failed_code_review).toBeUndefined()
    expect(MCP_ARTIFACT_GATES.cancelled).toBeUndefined()
  })
})

// ============================================================================
// storyUpdateStatus — ungated transitions
// ============================================================================

describe('storyUpdateStatus — ungated transitions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should update story state with full transaction (AC-2, AC-3)', async () => {
    const storyUuid = randomUUID()
    const currentStory = {
      storyId: 'WINT-0090',
      state: 'ready' as const,
      updatedAt: new Date('2026-02-15T00:00:00Z'),
    }

    const updatedStory = {
      storyId: 'WINT-0090',
      state: 'in_progress' as const,
      updatedAt: new Date('2026-02-15T12:00:00Z'),
    }

    mockTransaction.mockImplementation(async (callback: any) => {
      const tx = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([currentStory]),
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([updatedStory]),
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockResolvedValue(undefined),
        }),
      }
      return await callback(tx)
    })

    const input: StoryUpdateStatusInput = {
      storyId: 'WINT-0090',
      newState: 'in_progress',
      reason: 'Starting implementation',
      triggeredBy: 'dev-execute-leader',
    }

    const result = await storyUpdateStatus(input)

    expect(result).toEqual({
      storyId: 'WINT-0090',
      state: 'in_progress',
      updatedAt: updatedStory.updatedAt,
    })
    expect(mockTransaction).toHaveBeenCalledTimes(1)
    expect(mockWarn).not.toHaveBeenCalled()
  })

  it('should skip update if state unchanged (AC-2)', async () => {
    const currentStory = {
      storyId: 'WINT-0090',
      state: 'in_progress' as const,
      updatedAt: new Date('2026-02-15T00:00:00Z'),
    }

    mockTransaction.mockImplementation(async (callback: any) => {
      const tx = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([currentStory]),
            }),
          }),
        }),
      }
      return await callback(tx)
    })

    const input: StoryUpdateStatusInput = {
      storyId: 'WINT-0090',
      newState: 'in_progress',
    }

    const result = await storyUpdateStatus(input)

    expect(result).toEqual({
      storyId: 'WINT-0090',
      state: 'in_progress',
      updatedAt: currentStory.updatedAt,
    })
  })

  it('should return null for non-existent story (AC-2)', async () => {
    mockTransaction.mockImplementation(async (callback: any) => {
      const tx = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      }
      return await callback(tx)
    })

    const input: StoryUpdateStatusInput = {
      storyId: 'NOEXIST-001',
      newState: 'in_progress',
    }

    const result = await storyUpdateStatus(input)

    expect(result).toBeNull()
    expect(mockWarn).toHaveBeenCalledWith(
      "[mcp-tools] Story 'NOEXIST-001' not found for status update",
    )
  })

  it('should handle transaction errors gracefully (AC-9)', async () => {
    mockTransaction.mockRejectedValue(new Error('Transaction failed'))

    const input: StoryUpdateStatusInput = {
      storyId: 'WINT-0090',
      newState: 'in_progress',
    }

    const result = await storyUpdateStatus(input)

    expect(result).toBeNull()
    expect(mockWarn).toHaveBeenCalledWith(
      "[mcp-tools] Failed to update status for story 'WINT-0090':",
      'Transaction failed',
    )
  })

  it('should validate input schema (AC-6)', async () => {
    const input = {
      storyId: 'invalid',
      newState: 'invalid_state',
    } as any

    await expect(storyUpdateStatus(input)).rejects.toThrow()
  })
})

// ============================================================================
// storyUpdateStatus — gated transitions blocked (artifact missing)
// ============================================================================

describe('storyUpdateStatus — gated transitions blocked', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  /**
   * Helper to create a tx mock where:
   * - The first select (story lookup) returns currentStory
   * - The second select (artifact lookup) returns [] (no artifact found)
   */
  function mockTxWithNoArtifact(currentStory: any) {
    let selectCallCount = 0
    mockTransaction.mockImplementation(async (callback: any) => {
      const tx = {
        select: vi.fn().mockImplementation(() => {
          selectCallCount++
          if (selectCallCount === 1) {
            // Story lookup
            return {
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([currentStory]),
                }),
              }),
            }
          }
          // Artifact lookup — no artifact
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
          }
        }),
      }
      return await callback(tx)
    })
  }

  /**
   * Helper to create a tx mock where:
   * - The first select (story lookup) returns currentStory
   * - The second select (artifact lookup) returns [artifact] (artifact found)
   */
  function mockTxWithArtifact(currentStory: any, updatedStory: any) {
    let selectCallCount = 0
    mockTransaction.mockImplementation(async (callback: any) => {
      const tx = {
        select: vi.fn().mockImplementation(() => {
          selectCallCount++
          if (selectCallCount === 1) {
            // Story lookup
            return {
              from: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([currentStory]),
                }),
              }),
            }
          }
          // Artifact lookup — found
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([{ id: randomUUID() }]),
              }),
            }),
          }
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([updatedStory]),
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockResolvedValue(undefined),
        }),
      }
      return await callback(tx)
    })
  }

  it('should block transition to needs_code_review when evidence missing', async () => {
    const currentStory = {
      storyId: 'WINT-0090',
      state: 'in_progress' as const,
      updatedAt: new Date('2026-02-15T00:00:00Z'),
    }
    mockTxWithNoArtifact(currentStory)

    const result = await storyUpdateStatus({
      storyId: 'WINT-0090',
      newState: 'needs_code_review',
    })

    expect(result).not.toBeNull()
    expect(result?.gate_blocked).toBe(true)
    expect(result?.missing_artifact).toBe('Dev proof (evidence)')
    expect(result?.state).toBe('in_progress') // state NOT updated
    expect(mockWarn).toHaveBeenCalledWith(
      expect.stringContaining('Gate blocked'),
    )
  })

  it('should block transition to ready_for_qa when review missing', async () => {
    const currentStory = {
      storyId: 'WINT-0090',
      state: 'needs_code_review' as const,
      updatedAt: new Date('2026-02-15T00:00:00Z'),
    }
    mockTxWithNoArtifact(currentStory)

    const result = await storyUpdateStatus({
      storyId: 'WINT-0090',
      newState: 'ready_for_qa',
    })

    expect(result?.gate_blocked).toBe(true)
    expect(result?.missing_artifact).toBe('Code review')
  })

  it('should block transition to in_qa when review missing', async () => {
    const currentStory = {
      storyId: 'WINT-0090',
      state: 'ready_for_qa' as const,
      updatedAt: new Date('2026-02-15T00:00:00Z'),
    }
    mockTxWithNoArtifact(currentStory)

    const result = await storyUpdateStatus({
      storyId: 'WINT-0090',
      newState: 'in_qa',
    })

    expect(result?.gate_blocked).toBe(true)
    expect(result?.missing_artifact).toBe('Code review')
  })

  it('should block transition to completed when qa_verify missing', async () => {
    const currentStory = {
      storyId: 'WINT-0090',
      state: 'in_qa' as const,
      updatedAt: new Date('2026-02-15T00:00:00Z'),
    }
    mockTxWithNoArtifact(currentStory)

    const result = await storyUpdateStatus({
      storyId: 'WINT-0090',
      newState: 'completed',
    })

    expect(result?.gate_blocked).toBe(true)
    expect(result?.missing_artifact).toBe('QA verification')
  })

  it('should allow transition to needs_code_review when evidence present', async () => {
    const currentStory = {
      storyId: 'WINT-0090',
      state: 'in_progress' as const,
      updatedAt: new Date('2026-02-15T00:00:00Z'),
    }
    const updatedStory = {
      storyId: 'WINT-0090',
      state: 'needs_code_review' as const,
      updatedAt: new Date('2026-02-15T12:00:00Z'),
    }
    mockTxWithArtifact(currentStory, updatedStory)

    const result = await storyUpdateStatus({
      storyId: 'WINT-0090',
      newState: 'needs_code_review',
    })

    expect(result?.gate_blocked).toBeUndefined()
    expect(result?.state).toBe('needs_code_review')
  })

  it('should allow transition to completed when qa_verify present', async () => {
    const currentStory = {
      storyId: 'WINT-0090',
      state: 'in_qa' as const,
      updatedAt: new Date('2026-02-15T00:00:00Z'),
    }
    const updatedStory = {
      storyId: 'WINT-0090',
      state: 'completed' as const,
      updatedAt: new Date('2026-02-15T12:00:00Z'),
    }
    mockTxWithArtifact(currentStory, updatedStory)

    const result = await storyUpdateStatus({
      storyId: 'WINT-0090',
      newState: 'completed',
    })

    expect(result?.gate_blocked).toBeUndefined()
    expect(result?.state).toBe('completed')
  })

  it('should allow ungated transitions without artifact check', async () => {
    const currentStory = {
      storyId: 'WINT-0090',
      state: 'ready' as const,
      updatedAt: new Date('2026-02-15T00:00:00Z'),
    }
    const updatedStory = {
      storyId: 'WINT-0090',
      state: 'in_progress' as const,
      updatedAt: new Date('2026-02-15T12:00:00Z'),
    }

    // Single select mock (story lookup only — no artifact lookup for ungated)
    mockTransaction.mockImplementation(async (callback: any) => {
      const tx = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([currentStory]),
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([updatedStory]),
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockResolvedValue(undefined),
        }),
      }
      return await callback(tx)
    })

    const result = await storyUpdateStatus({
      storyId: 'WINT-0090',
      newState: 'in_progress',
    })

    expect(result?.gate_blocked).toBeUndefined()
    expect(result?.state).toBe('in_progress')
    expect(mockWarn).not.toHaveBeenCalled()
  })
})
