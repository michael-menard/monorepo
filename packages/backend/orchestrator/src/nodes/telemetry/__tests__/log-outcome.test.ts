/**
 * Tests for log-outcome telemetry node
 *
 * Covers:
 * - HP-2: Success path — adapter called, state updated with outcomeLogged: true
 * - EC-2: Adapter rejects — fire-and-continue verified
 * - ED-3: Optional fields undefined — adapter receives them as undefined, outcomeLogged: true
 *
 * AC-9
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createLogOutcomeNode,
  LogOutcomeInputSchema,
  type OutcomeLoggerFn,
} from '../log-outcome.js'
import type { GraphStateWithTelemetry } from '../log-invocation.js'
import type { GraphState } from '../../../state/index.js'

// Mock @repo/logger
vi.mock('@repo/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}))

// ============================================================================
// Helpers
// ============================================================================

function makeState(overrides: Partial<GraphStateWithTelemetry> = {}): GraphStateWithTelemetry {
  return {
    schemaVersion: '1.0.0',
    epicPrefix: 'wint',
    storyId: 'wint-9100',
    blockedBy: null,
    artifactPaths: {},
    routingFlags: {},
    evidenceRefs: [],
    gateDecisions: {},
    errors: [],
    stateHistory: [],
    verdict: 'pass',
    totalInputTokens: 45000,
    totalOutputTokens: 12000,
    qualityScore: 88,
    durationMs: 180000,
    ...overrides,
  }
}

// ============================================================================
// Unit tests
// ============================================================================

describe('createLogOutcomeNode', () => {
  let mockAdapter: OutcomeLoggerFn

  beforeEach(() => {
    mockAdapter = vi.fn().mockResolvedValue({ logged: true })
    vi.clearAllMocks()
  })

  it('HP-2: success path — adapter called with correct args, outcomeLogged: true', async () => {
    const node = createLogOutcomeNode({ adapter: mockAdapter })
    const state = makeState()

    const result = await node(state)

    expect(mockAdapter).toHaveBeenCalledOnce()
    expect(mockAdapter).toHaveBeenCalledWith({
      story_id: 'wint-9100',
      final_verdict: 'pass',
      quality_score: 88,
      total_input_tokens: 45000,
      total_output_tokens: 12000,
      duration_ms: 180000,
      primary_blocker: undefined,
    })
    expect(result).toMatchObject({ outcomeLogged: true })
  })

  it('EC-2: adapter rejects — fire-and-continue, no throw, logger.warn called', async () => {
    const { logger } = await import('@repo/logger')
    const throwingAdapter: OutcomeLoggerFn = vi.fn().mockRejectedValue(new Error('DB connection failed'))
    const node = createLogOutcomeNode({ adapter: throwingAdapter })
    const state = makeState()

    // Should not throw — fire-and-continue contract
    const result = await node(state)

    expect(result).toEqual({})
    expect(logger.warn).toHaveBeenCalledWith(
      'log_outcome: failed — continuing',
      expect.objectContaining({ err: 'DB connection failed', storyId: 'wint-9100' }),
    )
  })

  it('missing verdict — Zod parse error handled, no throw, adapter not called', async () => {
    const { logger } = await import('@repo/logger')
    const node = createLogOutcomeNode({ adapter: mockAdapter })
    const state = makeState({ verdict: undefined })

    await expect(async () => {
      await node(state)
    }).not.toThrow()

    expect(mockAdapter).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalled()
  })

  it('ED-3: optional fields undefined — adapter receives undefined values, outcomeLogged: true', async () => {
    const node = createLogOutcomeNode({ adapter: mockAdapter })
    const state = makeState({
      qualityScore: undefined,
      primaryBlocker: undefined,
      totalInputTokens: undefined,
      totalOutputTokens: undefined,
    })

    const result = await node(state)

    expect(mockAdapter).toHaveBeenCalledWith(
      expect.objectContaining({
        story_id: 'wint-9100',
        final_verdict: 'pass',
        quality_score: undefined,
        primary_blocker: undefined,
      }),
    )
    expect(result).toMatchObject({ outcomeLogged: true })
  })

  it('uses default no-op adapter when no config provided', async () => {
    const node = createLogOutcomeNode()
    const state = makeState()

    // With default no-op adapter, verdict is required and present — should succeed
    const result = await node(state)

    expect(result).toMatchObject({ outcomeLogged: true })
  })
})

// ============================================================================
// Schema unit tests
// ============================================================================

describe('LogOutcomeInputSchema', () => {
  it('parses valid input', () => {
    const result = LogOutcomeInputSchema.safeParse({
      storyId: 'wint-9100',
      verdict: 'pass',
    })
    expect(result.success).toBe(true)
  })

  it('fails on missing verdict', () => {
    const result = LogOutcomeInputSchema.safeParse({
      storyId: 'wint-9100',
    })
    expect(result.success).toBe(false)
  })

  it('fails on invalid verdict', () => {
    const result = LogOutcomeInputSchema.safeParse({
      storyId: 'wint-9100',
      verdict: 'in_progress',
    })
    expect(result.success).toBe(false)
  })

  it('fails on qualityScore above 100', () => {
    const result = LogOutcomeInputSchema.safeParse({
      storyId: 'wint-9100',
      verdict: 'pass',
      qualityScore: 101,
    })
    expect(result.success).toBe(false)
  })
})
