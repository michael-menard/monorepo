/**
 * Tests for log-invocation telemetry node
 *
 * Covers:
 * - HP-1: Success path — adapter called, state updated with invocationId
 * - EC-1: Adapter throws — no error thrown, logger.warn called, state clean
 * - EC-4: Zod parse error (missing required fields) — handled, no throw
 * - ED-2: ArtifactPhase value in state — mapped to MCP phase correctly
 * - HP-4: Integration — log-invocation wired as START and END of StateGraph
 *
 * AC-9, AC-12
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Annotation, StateGraph, END, START } from '@langchain/langgraph'
import {
  createLogInvocationNode,
  LogInvocationInputSchema,
  type GraphStateWithTelemetry,
  type InvocationLoggerFn,
} from '../log-invocation.js'
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
    agentName: 'dev-implement',
    status: 'success',
    phase: 'implementation',
    inputTokens: 1500,
    outputTokens: 800,
    durationMs: 12000,
    modelName: 'claude-sonnet-4-6',
    ...overrides,
  }
}

// ============================================================================
// Unit tests
// ============================================================================

describe('createLogInvocationNode', () => {
  let mockAdapter: InvocationLoggerFn

  beforeEach(() => {
    mockAdapter = vi.fn().mockResolvedValue({ invocationId: 'inv-abc123' })
    vi.clearAllMocks()
  })

  it('HP-1: success path — adapter called with correct args, state updated with invocationId', async () => {
    const node = createLogInvocationNode({ adapter: mockAdapter })
    const state = makeState()

    const result = await node(state)

    expect(mockAdapter).toHaveBeenCalledOnce()
    expect(mockAdapter).toHaveBeenCalledWith(
      expect.objectContaining({
        agentName: 'dev-implement',
        storyId: 'wint-9100',
        status: 'success',
        inputTokens: 1500,
        outputTokens: 800,
        durationMs: 12000,
        modelName: 'claude-sonnet-4-6',
      }),
    )
    expect(result).toMatchObject({ invocationId: 'inv-abc123' })
  })

  it('HP-1: phase mapped from ArtifactPhase to MCP phase', async () => {
    const node = createLogInvocationNode({ adapter: mockAdapter })
    const state = makeState({ phase: 'implementation' })

    await node(state)

    expect(mockAdapter).toHaveBeenCalledWith(
      expect.objectContaining({ phase: 'execute' }),
    )
  })

  it('EC-1: adapter throws — no error thrown by node, logger.warn called, empty state returned', async () => {
    const { logger } = await import('@repo/logger')
    const throwingAdapter: InvocationLoggerFn = vi.fn().mockRejectedValue(new Error('Network timeout'))
    const node = createLogInvocationNode({ adapter: throwingAdapter })
    const state = makeState()

    // Should not throw — fire-and-continue contract
    const result = await node(state)

    expect(result).toEqual({})
    expect(logger.warn).toHaveBeenCalledWith(
      'log_invocation: failed — continuing',
      expect.objectContaining({ err: 'Network timeout', storyId: 'wint-9100' }),
    )
  })

  it('EC-4: missing agentName — Zod parse error handled, no throw, logger.warn called', async () => {
    const { logger } = await import('@repo/logger')
    const node = createLogInvocationNode({ adapter: mockAdapter })
    // agentName is required in LogInvocationInputSchema — omit it to trigger Zod error
    const state = makeState({ agentName: undefined })

    // Should not throw — fire-and-continue contract
    const result = await node(state)

    expect(result).toEqual({})
    expect(mockAdapter).not.toHaveBeenCalled()
    expect(logger.warn).toHaveBeenCalled()
  })

  it('EC-4: empty storyId — no exception propagates to caller, adapter not called', async () => {
    const node = createLogInvocationNode({ adapter: mockAdapter })
    // Cast to bypass TypeScript strictness — simulates malformed state at runtime
    const state = makeState({ storyId: '' } as unknown as Partial<GraphStateWithTelemetry>)

    // Should not throw — error is captured in state by node-factory or our catch
    const result = await node(state as unknown as GraphState)

    expect(result).toBeDefined()
    expect(mockAdapter).not.toHaveBeenCalled()
  })

  it('ED-2: ArtifactPhase "code_review" mapped to MCP phase "review"', async () => {
    const node = createLogInvocationNode({ adapter: mockAdapter })
    const state = makeState({ phase: 'code_review' })

    await node(state)

    expect(mockAdapter).toHaveBeenCalledWith(
      expect.objectContaining({ phase: 'review' }),
    )
  })

  it('ED-2: MCP phase "execute" passed through unchanged', async () => {
    const node = createLogInvocationNode({ adapter: mockAdapter })
    const state = makeState({ phase: 'execute' })

    await node(state)

    expect(mockAdapter).toHaveBeenCalledWith(
      expect.objectContaining({ phase: 'execute' }),
    )
  })

  it('uses default no-op adapter when no config provided', async () => {
    const node = createLogInvocationNode()
    const state = makeState()

    const result = await node(state)

    // No-op adapter returns empty string — node still returns state update
    expect(result).toMatchObject({ invocationId: '' })
  })
})

// ============================================================================
// Schema unit tests
// ============================================================================

describe('LogInvocationInputSchema', () => {
  it('parses valid input', () => {
    const result = LogInvocationInputSchema.safeParse({
      storyId: 'wint-9100',
      agentName: 'dev-implement',
      status: 'success',
    })
    expect(result.success).toBe(true)
  })

  it('fails on missing agentName', () => {
    const result = LogInvocationInputSchema.safeParse({
      storyId: 'wint-9100',
      status: 'success',
    })
    expect(result.success).toBe(false)
  })

  it('fails on invalid status', () => {
    const result = LogInvocationInputSchema.safeParse({
      storyId: 'wint-9100',
      agentName: 'dev-implement',
      status: 'in_progress',
    })
    expect(result.success).toBe(false)
  })
})

// ============================================================================
// Integration test: log-invocation wired as START and END of StateGraph
// AC-12
// ============================================================================

describe('log-invocation StateGraph integration (AC-12)', () => {
  it('HP-4: node wired as entry and exit — graph completes, both invocations recorded', async () => {
    const calls: string[] = []
    const trackingAdapter: InvocationLoggerFn = vi.fn().mockImplementation(async input => {
      calls.push(input.agentName)
      return { invocationId: `inv-${calls.length}` }
    })

    const entryNode = createLogInvocationNode({ adapter: trackingAdapter })
    const exitNode = createLogInvocationNode({ adapter: trackingAdapter })

    // Define a minimal StateGraph using Annotation.Root
    const TelemetryAnnotation = Annotation.Root({
      storyId: Annotation<string>(),
      epicPrefix: Annotation<string>(),
      agentName: Annotation<string | undefined>({ reducer: (_a, b) => b, default: () => undefined }),
      status: Annotation<'success' | 'failure' | 'partial' | undefined>({
        reducer: (_a, b) => b,
        default: () => undefined,
      }),
      invocationId: Annotation<string | null | undefined>({
        reducer: (_a, b) => b,
        default: () => undefined,
      }),
      // Minimal GraphState fields (node-factory accesses storyId)
      blockedBy: Annotation<string | null>({ reducer: (_a, b) => b, default: () => null }),
      artifactPaths: Annotation<Record<string, string>>({
        reducer: (_a, b) => b,
        default: () => ({}),
      }),
      routingFlags: Annotation<Record<string, boolean>>({
        reducer: (_a, b) => b,
        default: () => ({}),
      }),
      evidenceRefs: Annotation<unknown[]>({ reducer: (_a, b) => b, default: () => [] }),
      gateDecisions: Annotation<Record<string, string>>({
        reducer: (_a, b) => b,
        default: () => ({}),
      }),
      errors: Annotation<unknown[]>({ reducer: (_a, b) => b, default: () => [] }),
      stateHistory: Annotation<unknown[]>({ reducer: (_a, b) => b, default: () => [] }),
      schemaVersion: Annotation<string>({ reducer: (_a, b) => b, default: () => '1.0.0' }),
    })

    const graph = new StateGraph(TelemetryAnnotation)
      .addNode('entry', entryNode)
      .addNode('exit', exitNode)
      .addEdge(START, 'entry')
      .addEdge('entry', 'exit')
      .addEdge('exit', END)
      .compile()

    const initialState = {
      storyId: 'wint-9100',
      epicPrefix: 'wint',
      agentName: 'dev-implement',
      status: 'success' as const,
    }

    const finalState = await graph.invoke(initialState)

    expect(trackingAdapter).toHaveBeenCalledTimes(2)
    expect(finalState.storyId).toBe('wint-9100')
    // Final state has invocationId from exit node
    expect(finalState.invocationId).toBeDefined()
  })
})
