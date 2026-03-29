/**
 * quality-escalation-integration.test.ts
 *
 * Integration test: full Sonnet → Opus → human path with mock LangGraph state.
 * AC-7: Verifies blocked state output and structured log calls.
 *
 * Uses mock model instances following the escalation-integration.test.ts pattern
 * from the pipeline tests.
 *
 * @module runner/__tests__/quality-escalation-integration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { withQualityEscalation } from '../quality-escalation.js'
import { createNode, createLLMNode, type NodeFunction } from '../node-factory.js'
import { NodeRetryExhaustedError } from '../errors.js'
import { BudgetAccumulator } from '../../pipeline/budget-accumulator.js'
import { createInitialState } from '../../state/validators.js'
import type { GraphState } from '../../state/index.js'
import type { HumanEscalationContext } from '../quality-escalation.js'

// ============================================================================
// Test Helpers
// ============================================================================

function createMockState(storyId = 'INTEG-001'): GraphState {
  return createInitialState({ epicPrefix: 'INTEG', storyId })
}

/**
 * Creates a node that always fails with NodeRetryExhaustedError.
 * Simulates a node whose retries are already exhausted by the node-factory wrapper.
 */
function createAlwaysFailNode(nodeName: string): NodeFunction {
  return vi.fn().mockImplementation(async () => {
    throw new NodeRetryExhaustedError(
      nodeName,
      5,
      new Error(`${nodeName} output quality insufficient`),
    )
  })
}

/**
 * Creates a node that succeeds with a marker in the state.
 */
function createMarkedSuccessNode(marker: string): NodeFunction {
  return vi.fn().mockImplementation(async (state: GraphState) => {
    return { currentPhase: 'implementation' as const }
  })
}

// ============================================================================
// Integration Tests
// ============================================================================

describe('Quality Escalation Integration', () => {
  let mockState: GraphState
  let humanEscalationLog: HumanEscalationContext[]

  beforeEach(() => {
    mockState = createMockState()
    humanEscalationLog = []
  })

  const captureHumanEscalation = async (ctx: HumanEscalationContext) => {
    humanEscalationLog.push(ctx)
  }

  // --------------------------------------------------------------------------
  // Full chain: Sonnet fails → Opus fails → human blocked
  // --------------------------------------------------------------------------
  it('exercises full Sonnet → Opus → human path and verifies blocked state', async () => {
    const sonnetNode = createAlwaysFailNode('sonnet-refine-plan')
    const opusNode = createAlwaysFailNode('opus-refine-plan')

    const escalatedNode = withQualityEscalation({
      sonnetNodeFn: sonnetNode,
      opusNodeFn: opusNode,
      onHumanEscalation: captureHumanEscalation,
    })

    const result = await escalatedNode(mockState)

    // Verify blocked state
    expect(result.routingFlags).toEqual(
      expect.objectContaining({ blocked: true }),
    )

    // Verify error code
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'ESCALATION_CHAIN_EXHAUSTED',
          nodeId: 'quality-escalation',
        }),
      ]),
    )

    // Verify both nodes were called
    expect(sonnetNode).toHaveBeenCalledOnce()
    expect(opusNode).toHaveBeenCalledOnce()

    // Verify human escalation context
    expect(humanEscalationLog).toHaveLength(1)
    expect(humanEscalationLog[0]).toEqual(
      expect.objectContaining({
        storyId: 'INTEG-001',
        nodeName: 'quality-escalation',
        modelsTried: ['sonnet', 'opus'],
        reason: 'escalation_chain_exhausted',
      }),
    )
    expect(humanEscalationLog[0].lastError.message).toContain(
      'opus-refine-plan output quality insufficient',
    )
  })

  // --------------------------------------------------------------------------
  // Budget-limited chain: Sonnet fails → budget blocks Opus → human
  // --------------------------------------------------------------------------
  it('skips Opus when budget is exhausted and routes to human', async () => {
    const budgetAccumulator = new BudgetAccumulator()
    budgetAccumulator.record('INTEG-001', 480000) // Near cap

    const sonnetNode = createAlwaysFailNode('sonnet-refine-plan')
    const opusNode = createMarkedSuccessNode('opus')

    const escalatedNode = withQualityEscalation({
      sonnetNodeFn: sonnetNode,
      opusNodeFn: opusNode,
      budgetAccumulator,
      onHumanEscalation: captureHumanEscalation,
      config: { estimatedOpusTokens: 50000, hardBudgetCap: 500000 },
    })

    const result = await escalatedNode(mockState)

    // Opus should NOT be called
    expect(opusNode).not.toHaveBeenCalled()

    // Verify blocked with budget-specific code
    expect(result.routingFlags).toEqual(
      expect.objectContaining({ blocked: true }),
    )
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'ESCALATION_SKIPPED_BUDGET_EXHAUSTED',
        }),
      ]),
    )

    // Verify human escalation context with budget reason
    expect(humanEscalationLog).toHaveLength(1)
    expect(humanEscalationLog[0].reason).toBe('escalation_skipped_budget_exhausted')
    expect(humanEscalationLog[0].modelsTried).toEqual(['sonnet'])
  })

  // --------------------------------------------------------------------------
  // Happy path: Sonnet succeeds on first try
  // --------------------------------------------------------------------------
  it('returns immediately when Sonnet succeeds', async () => {
    const sonnetNode = createMarkedSuccessNode('sonnet')
    const opusNode = createAlwaysFailNode('opus')

    const escalatedNode = withQualityEscalation({
      sonnetNodeFn: sonnetNode,
      opusNodeFn: opusNode,
      onHumanEscalation: captureHumanEscalation,
    })

    const result = await escalatedNode(mockState)

    expect(sonnetNode).toHaveBeenCalledOnce()
    expect(opusNode).not.toHaveBeenCalled()
    expect(humanEscalationLog).toHaveLength(0)
    expect(result.routingFlags).toBeUndefined()
  })

  // --------------------------------------------------------------------------
  // Escalation with successful Opus recovery
  // --------------------------------------------------------------------------
  it('recovers via Opus when Sonnet fails', async () => {
    const sonnetNode = createAlwaysFailNode('sonnet-refine-plan')
    const opusNode = createMarkedSuccessNode('opus')

    const escalatedNode = withQualityEscalation({
      sonnetNodeFn: sonnetNode,
      opusNodeFn: opusNode,
      onHumanEscalation: captureHumanEscalation,
    })

    const result = await escalatedNode(mockState)

    expect(sonnetNode).toHaveBeenCalledOnce()
    expect(opusNode).toHaveBeenCalledOnce()
    expect(humanEscalationLog).toHaveLength(0)
    // No blocked flag
    expect(result.routingFlags).toBeUndefined()
  })

  // --------------------------------------------------------------------------
  // State passed correctly through the chain
  // --------------------------------------------------------------------------
  it('passes the same state to both Sonnet and Opus nodes', async () => {
    const sonnetNode = createAlwaysFailNode('sonnet')
    const opusNode = createMarkedSuccessNode('opus')

    const escalatedNode = withQualityEscalation({
      sonnetNodeFn: sonnetNode,
      opusNodeFn: opusNode,
    })

    await escalatedNode(mockState)

    // Both nodes should receive the same state
    expect(sonnetNode).toHaveBeenCalledWith(mockState, undefined)
    expect(opusNode).toHaveBeenCalledWith(mockState, undefined)
  })
})
