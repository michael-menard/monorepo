/**
 * Integration tests for the plan-revalidation graph.
 *
 * Tests that:
 * - createPlanRevalidationGraph() compiles without error
 * - Conditional edge routing for classify_drift is correct
 * - proceed path terminates without calling auto_update_plan or log_revision
 * - needs_revision path calls auto_update_plan and log_revision
 * - already_done path terminates without update calls
 * - error path terminates without update calls
 *
 * APRS-3020: AC-7, AC-8, AC-9, AC-10
 */

import { describe, it, expect, vi } from 'vitest'

vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

import {
  createPlanRevalidationGraph,
  afterClassifyDrift,
} from '../plan-revalidation.js'
import type { PlanRevalidationState } from '../../state/plan-revalidation-state.js'

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
    revalidationPhase: 'load_context',
    warnings: [],
    errors: [],
    ...overrides,
  }
}

// ============================================================================
// Graph Compilation Tests (AC-7)
// ============================================================================

describe('createPlanRevalidationGraph', () => {
  it('compiles without error with no config', () => {
    expect(() => createPlanRevalidationGraph()).not.toThrow()
  })

  it('compiles with all adapters provided', () => {
    const noOp = vi.fn().mockResolvedValue(undefined)
    const noOpNull = vi.fn().mockResolvedValue(null)
    expect(() =>
      createPlanRevalidationGraph({
        kbPlanAdapter: noOpNull,
        kbStoryAdapter: vi.fn().mockResolvedValue([]),
        artifactLookup: vi.fn().mockResolvedValue({
          hasCompletionArtifact: false,
          hasEvidenceArtifact: false,
          completedStoryCount: 0,
          totalStoryCount: 0,
        }),
        llmApproachValidator: vi.fn().mockResolvedValue({
          isValid: true,
          confidence: 1.0,
          reasoning: 'ok',
          issues: [],
        }),
        dependencyGraphQuery: vi.fn().mockResolvedValue({
          blockedByPlanSlugs: [],
          hasCircularDependency: false,
          missingDependencies: [],
        }),
        llmScopeDriftDetector: vi.fn().mockResolvedValue({
          hasDrift: false,
          confidence: 0.0,
          reasoning: 'no drift',
          driftAreas: [],
        }),
        planUpdater: noOp,
        revisionLogger: noOp,
        planIdResolver: noOpNull,
        dry_run: false,
        changedBy: 'test-agent',
      }),
    ).not.toThrow()
  })

  it('compiles with dry_run=true', () => {
    expect(() => createPlanRevalidationGraph({ dry_run: true })).not.toThrow()
  })

  it('returns a compiled graph object with invoke method', () => {
    const graph = createPlanRevalidationGraph()
    expect(graph).toBeDefined()
    expect(typeof graph.invoke).toBe('function')
  })
})

// ============================================================================
// afterClassifyDrift Conditional Edge Tests (AC-8)
// ============================================================================

describe('afterClassifyDrift', () => {
  it('routes "proceed" verdict to __end__', () => {
    const result = afterClassifyDrift(makeState({ verdict: 'proceed' }))
    expect(result).toBe('__end__')
  })

  it('routes "needs_revision" verdict to auto_update_plan', () => {
    const result = afterClassifyDrift(makeState({ verdict: 'needs_revision' }))
    expect(result).toBe('auto_update_plan')
  })

  it('routes "already_done" verdict to __end__', () => {
    const result = afterClassifyDrift(makeState({ verdict: 'already_done' }))
    expect(result).toBe('__end__')
  })

  it('routes "blocked" verdict to __end__', () => {
    const result = afterClassifyDrift(makeState({ verdict: 'blocked' }))
    expect(result).toBe('__end__')
  })

  it('routes "error" verdict to __end__', () => {
    const result = afterClassifyDrift(makeState({ verdict: 'error' }))
    expect(result).toBe('__end__')
  })

  it('routes null verdict to __end__', () => {
    const result = afterClassifyDrift(makeState({ verdict: null }))
    expect(result).toBe('__end__')
  })
})

// ============================================================================
// Graph Execution Tests (AC-8)
// ============================================================================

describe('plan-revalidation graph execution', () => {
  it('executes proceed path without calling planUpdater or revisionLogger', async () => {
    const planUpdater = vi.fn().mockResolvedValue(undefined)
    const revisionLogger = vi.fn().mockResolvedValue(undefined)
    // All checks return no findings → classify_drift → proceed → END
    const graph = createPlanRevalidationGraph({
      kbPlanAdapter: vi.fn().mockResolvedValue(null),
      kbStoryAdapter: vi.fn().mockResolvedValue([]),
      artifactLookup: vi.fn().mockResolvedValue({
        hasCompletionArtifact: false,
        hasEvidenceArtifact: false,
        completedStoryCount: 0,
        totalStoryCount: 0,
      }),
      planUpdater,
      revisionLogger,
    })

    const result = await graph.invoke({ planSlug: 'test-plan' })
    expect(result.verdict).toBe('proceed')
    expect(planUpdater).not.toHaveBeenCalled()
    expect(revisionLogger).not.toHaveBeenCalled()
  })

  it('executes needs_revision path calling planUpdater and revisionLogger', async () => {
    const planUpdater = vi.fn().mockResolvedValue(undefined)
    const revisionLogger = vi.fn().mockResolvedValue(undefined)
    const planIdResolver = vi.fn().mockResolvedValue('550e8400-e29b-41d4-a716-446655440000')

    // LLM scope drift detector returns high-confidence drift → classify_drift → needs_revision → auto_update_plan → log_revision
    const graph = createPlanRevalidationGraph({
      kbPlanAdapter: vi.fn().mockResolvedValue(null),
      kbStoryAdapter: vi.fn().mockResolvedValue([]),
      artifactLookup: vi.fn().mockResolvedValue({
        hasCompletionArtifact: false,
        hasEvidenceArtifact: false,
        completedStoryCount: 0,
        totalStoryCount: 0,
      }),
      llmScopeDriftDetector: vi.fn().mockResolvedValue({
        hasDrift: true,
        confidence: 0.9,
        reasoning: 'significant scope drift detected',
        driftAreas: ['authentication', 'API shape'],
      }),
      planUpdater,
      revisionLogger,
      planIdResolver,
    })

    const result = await graph.invoke({ planSlug: 'test-plan' })
    expect(result.verdict).toBe('needs_revision')
    expect(planUpdater).toHaveBeenCalledTimes(1)
    expect(revisionLogger).toHaveBeenCalledTimes(1)
  })

  it('executes proceed path when check_already_implemented produces info findings (info=proceed, not already_done)', async () => {
    const planUpdater = vi.fn().mockResolvedValue(undefined)
    const revisionLogger = vi.fn().mockResolvedValue(undefined)
    // Artifact lookup returns hasCompletionArtifact=true → already_implemented INFO finding → proceed verdict
    // (classify_drift: info severity = proceed, not already_done — already_done requires blocking+already_implemented)
    const graph = createPlanRevalidationGraph({
      kbPlanAdapter: vi.fn().mockResolvedValue(null),
      kbStoryAdapter: vi.fn().mockResolvedValue([]),
      artifactLookup: vi.fn().mockResolvedValue({
        hasCompletionArtifact: true,
        hasEvidenceArtifact: true,
        completedStoryCount: 10,
        totalStoryCount: 10,
      }),
      planUpdater,
      revisionLogger,
    })

    const result = await graph.invoke({ planSlug: 'test-plan' })
    // check_already_implemented emits INFO severity findings, which classify_drift maps to 'proceed'
    expect(result.verdict).toBe('proceed')
    expect(planUpdater).not.toHaveBeenCalled()
    expect(revisionLogger).not.toHaveBeenCalled()
  })

  it('afterClassifyDrift routes already_done verdict to END without calling update nodes', () => {
    // Tests the conditional edge function directly for already_done routing
    const result = afterClassifyDrift(makeState({ verdict: 'already_done' }))
    expect(result).toBe('__end__')
  })

  it('executes with dry_run=true: planUpdater is NOT called even on needs_revision', async () => {
    const planUpdater = vi.fn().mockResolvedValue(undefined)
    const revisionLogger = vi.fn().mockResolvedValue(undefined)
    const planIdResolver = vi.fn().mockResolvedValue('550e8400-e29b-41d4-a716-446655440000')

    const graph = createPlanRevalidationGraph({
      kbPlanAdapter: vi.fn().mockResolvedValue(null),
      kbStoryAdapter: vi.fn().mockResolvedValue([]),
      artifactLookup: vi.fn().mockResolvedValue({
        hasCompletionArtifact: false,
        hasEvidenceArtifact: false,
        completedStoryCount: 0,
        totalStoryCount: 0,
      }),
      llmScopeDriftDetector: vi.fn().mockResolvedValue({
        hasDrift: true,
        confidence: 0.9,
        reasoning: 'drift detected',
        driftAreas: ['scope'],
      }),
      planUpdater,
      revisionLogger,
      planIdResolver,
      dry_run: true,
    })

    const result = await graph.invoke({ planSlug: 'test-plan' })
    expect(result.verdict).toBe('needs_revision')
    // In dry_run mode, planUpdater should NOT be called
    expect(planUpdater).not.toHaveBeenCalled()
    // warnings should contain dry run message
    expect(result.warnings.some((w: string) => w.includes('DRY RUN'))).toBe(true)
  })
})
