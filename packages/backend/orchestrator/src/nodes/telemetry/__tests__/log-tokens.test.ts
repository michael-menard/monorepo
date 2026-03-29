/**
 * Tests for log-tokens telemetry node
 *
 * Covers:
 * - HP-3: Success path — adapter called, state updated with tokensLogged: true
 * - EC-3: Adapter throws — fire-and-continue verified
 * - ED-1: Zero token counts — adapter called with zeros, tokensLogged: true
 *
 * AC-9
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createLogTokensNode,
  LogTokensInputSchema,
  type TokenLoggerFn,
} from '../log-tokens.js'
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
    inputTokens: 2000,
    outputTokens: 600,
    phase: 'execute',
    agentName: 'dev-implement',
    ...overrides,
  }
}

// ============================================================================
// Unit tests
// ============================================================================

describe('createLogTokensNode', () => {
  let mockAdapter: TokenLoggerFn

  beforeEach(() => {
    mockAdapter = vi.fn().mockResolvedValue({ logged: true })
    vi.clearAllMocks()
  })

  it('HP-3: success path — adapter called with correct args, tokensLogged: true', async () => {
    const node = createLogTokensNode({ adapter: mockAdapter })
    const state = makeState()

    const result = await node(state)

    expect(mockAdapter).toHaveBeenCalledOnce()
    expect(mockAdapter).toHaveBeenCalledWith({
      story_id: 'wint-9100',
      input_tokens: 2000,
      output_tokens: 600,
      phase: 'execute',
      agent: 'dev-implement',
    })
    expect(result).toMatchObject({ tokensLogged: true })
  })

  it('EC-3: adapter throws — fire-and-continue, no throw, logger.warn called', async () => {
    const { logger } = await import('@repo/logger')
    const throwingAdapter: TokenLoggerFn = vi.fn().mockRejectedValue(new Error('Timeout'))
    const node = createLogTokensNode({ adapter: throwingAdapter })
    const state = makeState()

    // Should not throw — fire-and-continue contract
    const result = await node(state)

    expect(result).toEqual({})
    expect(logger.warn).toHaveBeenCalledWith(
      'log_tokens: failed — continuing',
      expect.objectContaining({ err: 'Timeout', storyId: 'wint-9100' }),
    )
  })

  it('ED-1: inputTokens: 0, outputTokens: 0 — adapter called with zeros, tokensLogged: true', async () => {
    const node = createLogTokensNode({ adapter: mockAdapter })
    const state = makeState({ inputTokens: 0, outputTokens: 0 })

    const result = await node(state)

    expect(mockAdapter).toHaveBeenCalledWith(
      expect.objectContaining({
        input_tokens: 0,
        output_tokens: 0,
      }),
    )
    expect(result).toMatchObject({ tokensLogged: true })
  })

  it('inputTokens and outputTokens undefined — defaults to 0', async () => {
    const node = createLogTokensNode({ adapter: mockAdapter })
    const state = makeState({ inputTokens: undefined, outputTokens: undefined })

    const result = await node(state)

    expect(mockAdapter).toHaveBeenCalledWith(
      expect.objectContaining({
        input_tokens: 0,
        output_tokens: 0,
      }),
    )
    expect(result).toMatchObject({ tokensLogged: true })
  })

  it('phase and agentName absent — adapter called without them', async () => {
    const node = createLogTokensNode({ adapter: mockAdapter })
    const state = makeState({ phase: undefined, agentName: undefined })

    const result = await node(state)

    expect(mockAdapter).toHaveBeenCalledWith(
      expect.objectContaining({
        phase: undefined,
        agent: undefined,
      }),
    )
    expect(result).toMatchObject({ tokensLogged: true })
  })

  it('uses default no-op adapter when no config provided', async () => {
    const node = createLogTokensNode()
    const state = makeState()

    const result = await node(state)

    expect(result).toMatchObject({ tokensLogged: true })
  })
})

// ============================================================================
// Schema unit tests
// ============================================================================

describe('LogTokensInputSchema', () => {
  it('parses valid input', () => {
    const result = LogTokensInputSchema.safeParse({
      storyId: 'wint-9100',
      inputTokens: 1000,
      outputTokens: 300,
    })
    expect(result.success).toBe(true)
  })

  it('parses zero token counts', () => {
    const result = LogTokensInputSchema.safeParse({
      storyId: 'wint-9100',
      inputTokens: 0,
      outputTokens: 0,
    })
    expect(result.success).toBe(true)
  })

  it('fails on negative inputTokens', () => {
    const result = LogTokensInputSchema.safeParse({
      storyId: 'wint-9100',
      inputTokens: -1,
      outputTokens: 0,
    })
    expect(result.success).toBe(false)
  })

  it('fails on missing storyId', () => {
    const result = LogTokensInputSchema.safeParse({
      inputTokens: 100,
      outputTokens: 50,
    })
    expect(result.success).toBe(false)
  })
})
