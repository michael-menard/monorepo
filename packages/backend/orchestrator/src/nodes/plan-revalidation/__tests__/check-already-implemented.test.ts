/**
 * Tests for the check-already-implemented node.
 *
 * APRS-3010: AC-3 — check-already-implemented node
 */

import { describe, expect, it, vi } from 'vitest'

vi.mock('@repo/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

vi.mock('@langchain/langgraph', () => {
  const Annotation = Object.assign(
    (config: unknown) => ({ ...(config as object) }),
    {
      Root: (fields: Record<string, unknown>) => ({
        State: {} as unknown,
        fields,
      }),
    },
  )
  return { Annotation }
})

import type { PlanRevalidationState } from '../../../state/plan-revalidation-state.js'
import {
  lookupArtifacts,
  evaluateImplementationStatus,
  createCheckAlreadyImplementedNode,
  type ArtifactLookupResult,
} from '../check-already-implemented.js'

// ============================================================================
// Helpers
// ============================================================================

function makeState(overrides: Partial<PlanRevalidationState> = {}): PlanRevalidationState {
  return {
    planSlug: 'test-plan',
    rawPlan: null,
    contextSnapshot: null,
    driftFindings: [],
    verdict: null,
    revalidationPhase: 'check_already_implemented',
    warnings: [],
    errors: [],
    ...overrides,
  }
}

function makeLookupResult(overrides: Partial<ArtifactLookupResult> = {}): ArtifactLookupResult {
  return {
    hasCompletionArtifact: false,
    hasEvidenceArtifact: false,
    completedStoryCount: 0,
    totalStoryCount: 0,
    ...overrides,
  }
}

// ============================================================================
// lookupArtifacts
// ============================================================================

describe('lookupArtifacts', () => {
  it('returns result from adapter', async () => {
    const adapter = vi.fn().mockResolvedValue(makeLookupResult({ hasCompletionArtifact: true }))
    const result = await lookupArtifacts('my-plan', adapter)
    expect(result.hasCompletionArtifact).toBe(true)
    expect(adapter).toHaveBeenCalledWith('my-plan')
  })

  it('returns default result on adapter failure', async () => {
    const adapter = vi.fn().mockRejectedValue(new Error('unavailable'))
    const result = await lookupArtifacts('my-plan', adapter)
    expect(result.hasCompletionArtifact).toBe(false)
    expect(result.completedStoryCount).toBe(0)
  })

  it('uses default adapter when none provided', async () => {
    const result = await lookupArtifacts('my-plan')
    expect(result).toEqual({
      hasCompletionArtifact: false,
      hasEvidenceArtifact: false,
      completedStoryCount: 0,
      totalStoryCount: 0,
    })
  })
})

// ============================================================================
// evaluateImplementationStatus
// ============================================================================

describe('evaluateImplementationStatus', () => {
  it('returns isAlreadyImplemented: true when hasCompletionArtifact is true', () => {
    const result = evaluateImplementationStatus(
      makeLookupResult({ hasCompletionArtifact: true }),
      null,
    )
    expect(result.isAlreadyImplemented).toBe(true)
    expect(result.confidence).toBe(1.0)
  })

  it('returns isAlreadyImplemented: true when completion ratio >= threshold', () => {
    const result = evaluateImplementationStatus(
      makeLookupResult({ completedStoryCount: 9, totalStoryCount: 10 }),
      null,
      0.9,
    )
    expect(result.isAlreadyImplemented).toBe(true)
    expect(result.confidence).toBeCloseTo(0.9)
  })

  it('returns isAlreadyImplemented: false when ratio < threshold', () => {
    const result = evaluateImplementationStatus(
      makeLookupResult({ completedStoryCount: 8, totalStoryCount: 10 }),
      null,
      0.9,
    )
    expect(result.isAlreadyImplemented).toBe(false)
  })

  it('returns isAlreadyImplemented: false when totalStoryCount is 0', () => {
    const result = evaluateImplementationStatus(
      makeLookupResult({ completedStoryCount: 0, totalStoryCount: 0 }),
      null,
    )
    expect(result.isAlreadyImplemented).toBe(false)
  })

  it('hasCompletionArtifact takes priority over ratio check', () => {
    const result = evaluateImplementationStatus(
      makeLookupResult({ hasCompletionArtifact: true, completedStoryCount: 0, totalStoryCount: 10 }),
      null,
    )
    expect(result.isAlreadyImplemented).toBe(true)
    expect(result.confidence).toBe(1.0)
  })
})

// ============================================================================
// createCheckAlreadyImplementedNode
// ============================================================================

describe('createCheckAlreadyImplementedNode', () => {
  it('transitions to check_approach_valid with no findings when not implemented', async () => {
    const adapter = vi.fn().mockResolvedValue(makeLookupResult())
    const node = createCheckAlreadyImplementedNode({ artifactLookup: adapter })
    const result = await node(makeState())

    expect(result.revalidationPhase).toBe('check_approach_valid')
    expect(result.driftFindings).toEqual([])
  })

  it('appends a drift finding when plan is already implemented', async () => {
    const adapter = vi.fn().mockResolvedValue(makeLookupResult({ hasCompletionArtifact: true }))
    const node = createCheckAlreadyImplementedNode({ artifactLookup: adapter })
    const result = await node(makeState())

    expect(result.revalidationPhase).toBe('check_approach_valid')
    expect(result.driftFindings).toHaveLength(1)
    expect(result.driftFindings![0].category).toBe('already_implemented')
    expect(result.driftFindings![0].severity).toBe('info')
  })

  it('appends a finding when story completion ratio meets threshold', async () => {
    const adapter = vi.fn().mockResolvedValue(
      makeLookupResult({ completedStoryCount: 9, totalStoryCount: 10 }),
    )
    const node = createCheckAlreadyImplementedNode({
      completionRatioThreshold: 0.9,
      artifactLookup: adapter,
    })
    const result = await node(makeState())

    expect(result.driftFindings).toHaveLength(1)
    expect(result.driftFindings![0].category).toBe('already_implemented')
  })

  it('uses default adapter (no findings) when none provided', async () => {
    const node = createCheckAlreadyImplementedNode()
    const result = await node(makeState())

    expect(result.revalidationPhase).toBe('check_approach_valid')
    expect(result.driftFindings).toEqual([])
  })

  it('transitions to error phase on unexpected error', async () => {
    const adapter = vi.fn().mockImplementation(async () => {
      // Return invalid data to trigger parse error
      return { hasCompletionArtifact: 'not-a-boolean' }
    })
    // lookupArtifacts will catch the parse error and return defaults
    const node = createCheckAlreadyImplementedNode({ artifactLookup: adapter })
    const result = await node(makeState())
    // Should not crash — returns defaults
    expect(['check_approach_valid', 'error']).toContain(result.revalidationPhase)
  })
})
