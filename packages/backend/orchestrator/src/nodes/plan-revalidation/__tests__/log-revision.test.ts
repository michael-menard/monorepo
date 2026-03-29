/**
 * Tests for the log-revision node.
 *
 * APRS-3020: AC-6, AC-9
 */

import { describe, expect, it, vi } from 'vitest'
import type { PlanRevalidationState, DriftFinding } from '../../../state/plan-revalidation-state.js'
import {
  buildRevisionEntry,
  buildDriftSummaryForRevision,
  createLogRevisionNode,
  type RevisionLogEntry,
} from '../log-revision.js'

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

// ============================================================================
// Helpers
// ============================================================================

function makeState(overrides: Partial<PlanRevalidationState> = {}): PlanRevalidationState {
  return {
    planSlug: 'test-plan',
    rawPlan: null,
    contextSnapshot: null,
    driftFindings: [],
    verdict: 'needs_revision',
    revalidationPhase: 'classify_drift',
    warnings: [],
    errors: [],
    ...overrides,
  }
}

function makeFinding(
  severity: 'info' | 'warning' | 'blocking',
  category: DriftFinding['category'] = 'scope_drift',
): DriftFinding {
  return {
    nodeId: 'test-node',
    category,
    severity,
    summary: `${severity} ${category}`,
    detail: '',
    confidence: 1.0,
  }
}

const validUUID = '550e8400-e29b-41d4-a716-446655440000'

// ============================================================================
// buildRevisionEntry
// ============================================================================

describe('buildRevisionEntry', () => {
  it('sets changeReason to "minor_drift_auto_update"', () => {
    const entry = buildRevisionEntry('my-plan', validUUID, 'plan-revalidation-graph', 'some drift')
    expect(entry.changeReason).toBe('minor_drift_auto_update')
  })

  it('includes planSlug in entry', () => {
    const entry = buildRevisionEntry('my-plan', validUUID, 'plan-revalidation-graph', 'drift')
    expect(entry.planSlug).toBe('my-plan')
  })

  it('includes planId in entry', () => {
    const entry = buildRevisionEntry('my-plan', validUUID, 'plan-revalidation-graph', 'drift')
    expect(entry.planId).toBe(validUUID)
  })

  it('accepts null planId', () => {
    const entry = buildRevisionEntry('my-plan', null, 'plan-revalidation-graph', 'drift')
    expect(entry.planId).toBeNull()
  })

  it('includes changedBy in entry', () => {
    const entry = buildRevisionEntry('my-plan', validUUID, 'my-agent', 'drift')
    expect(entry.changedBy).toBe('my-agent')
  })

  it('includes summary in entry', () => {
    const entry = buildRevisionEntry('my-plan', validUUID, 'agent', 'some drift summary')
    expect(entry.summary).toBe('some drift summary')
  })

  it('throws on invalid UUID when non-null', () => {
    expect(() =>
      buildRevisionEntry('my-plan', 'not-a-uuid', 'agent', 'summary'),
    ).toThrow()
  })
})

// ============================================================================
// buildDriftSummaryForRevision
// ============================================================================

describe('buildDriftSummaryForRevision', () => {
  it('includes blocking count in summary', () => {
    const state = makeState({
      driftFindings: [makeFinding('blocking'), makeFinding('blocking')],
    })
    const summary = buildDriftSummaryForRevision(state)
    expect(summary).toContain('2 blocking finding')
  })

  it('includes warning count in summary', () => {
    const state = makeState({
      driftFindings: [makeFinding('warning')],
    })
    const summary = buildDriftSummaryForRevision(state)
    expect(summary).toContain('1 warning')
  })

  it('includes category names in summary', () => {
    const state = makeState({
      driftFindings: [makeFinding('blocking', 'scope_drift')],
    })
    const summary = buildDriftSummaryForRevision(state)
    expect(summary).toContain('scope_drift')
  })

  it('mentions auto-update in summary', () => {
    const state = makeState()
    const summary = buildDriftSummaryForRevision(state)
    expect(summary.toLowerCase()).toContain('auto')
  })

  it('uses singular "finding" for one blocking finding', () => {
    const state = makeState({ driftFindings: [makeFinding('blocking')] })
    const summary = buildDriftSummaryForRevision(state)
    expect(summary).toContain('1 blocking finding')
  })

  it('uses plural "findings" for multiple blocking findings', () => {
    const state = makeState({
      driftFindings: [makeFinding('blocking'), makeFinding('blocking')],
    })
    const summary = buildDriftSummaryForRevision(state)
    expect(summary).toContain('findings')
  })

  it('handles empty driftFindings', () => {
    const state = makeState({ driftFindings: [] })
    const summary = buildDriftSummaryForRevision(state)
    expect(summary).toBeTruthy()
    expect(summary.length).toBeGreaterThan(0)
  })

  it('deduplicates categories', () => {
    const state = makeState({
      driftFindings: [
        makeFinding('blocking', 'scope_drift'),
        makeFinding('blocking', 'scope_drift'),
      ],
    })
    const summary = buildDriftSummaryForRevision(state)
    // scope_drift should appear only once in categories list
    const occurrences = (summary.match(/scope_drift/g) || []).length
    expect(occurrences).toBe(1)
  })
})

// ============================================================================
// createLogRevisionNode
// ============================================================================

describe('createLogRevisionNode', () => {
  it('calls revisionLogger when planId resolves successfully', async () => {
    const revisionLogger = vi.fn().mockResolvedValue(undefined)
    const planIdResolver = vi.fn().mockResolvedValue(validUUID)
    const node = createLogRevisionNode({ revisionLogger, planIdResolver })
    await node(makeState())
    expect(revisionLogger).toHaveBeenCalledTimes(1)
  })

  it('passes changeReason=minor_drift_auto_update to revisionLogger', async () => {
    let capturedEntry: RevisionLogEntry | null = null
    const revisionLogger = vi.fn().mockImplementation(async (e: RevisionLogEntry) => {
      capturedEntry = e
    })
    const planIdResolver = vi.fn().mockResolvedValue(validUUID)
    const node = createLogRevisionNode({ revisionLogger, planIdResolver })
    await node(makeState())
    expect(capturedEntry!.changeReason).toBe('minor_drift_auto_update')
  })

  it('passes correct planSlug to revisionLogger', async () => {
    let capturedEntry: RevisionLogEntry | null = null
    const revisionLogger = vi.fn().mockImplementation(async (e: RevisionLogEntry) => {
      capturedEntry = e
    })
    const planIdResolver = vi.fn().mockResolvedValue(validUUID)
    const node = createLogRevisionNode({ revisionLogger, planIdResolver })
    await node(makeState({ planSlug: 'special-plan' }))
    expect(capturedEntry!.planSlug).toBe('special-plan')
  })

  it('passes correct planId to revisionLogger', async () => {
    let capturedEntry: RevisionLogEntry | null = null
    const revisionLogger = vi.fn().mockImplementation(async (e: RevisionLogEntry) => {
      capturedEntry = e
    })
    const planIdResolver = vi.fn().mockResolvedValue(validUUID)
    const node = createLogRevisionNode({ revisionLogger, planIdResolver })
    await node(makeState())
    expect(capturedEntry!.planId).toBe(validUUID)
  })

  it('uses default changedBy "plan-revalidation-graph" when not configured', async () => {
    let capturedEntry: RevisionLogEntry | null = null
    const revisionLogger = vi.fn().mockImplementation(async (e: RevisionLogEntry) => {
      capturedEntry = e
    })
    const planIdResolver = vi.fn().mockResolvedValue(validUUID)
    const node = createLogRevisionNode({ revisionLogger, planIdResolver })
    await node(makeState())
    expect(capturedEntry!.changedBy).toBe('plan-revalidation-graph')
  })

  it('uses custom changedBy when configured', async () => {
    let capturedEntry: RevisionLogEntry | null = null
    const revisionLogger = vi.fn().mockImplementation(async (e: RevisionLogEntry) => {
      capturedEntry = e
    })
    const planIdResolver = vi.fn().mockResolvedValue(validUUID)
    const node = createLogRevisionNode({
      revisionLogger,
      planIdResolver,
      changedBy: 'custom-agent',
    })
    await node(makeState())
    expect(capturedEntry!.changedBy).toBe('custom-agent')
  })

  it('skips revisionLogger and returns warning when planId is null', async () => {
    const revisionLogger = vi.fn().mockResolvedValue(undefined)
    const planIdResolver = vi.fn().mockResolvedValue(null)
    const node = createLogRevisionNode({ revisionLogger, planIdResolver })
    const result = await node(makeState())
    expect(revisionLogger).not.toHaveBeenCalled()
    expect(result.warnings).toBeDefined()
    expect(result.warnings!.some(w => w.includes('could not resolve plan UUID'))).toBe(true)
  })

  it('uses default no-op revisionLogger when none provided', async () => {
    const planIdResolver = vi.fn().mockResolvedValue(validUUID)
    const node = createLogRevisionNode({ planIdResolver })
    // Should not throw
    const result = await node(makeState())
    expect(result).toBeDefined()
  })

  it('uses default no-op planIdResolver (returns null) when none provided', async () => {
    const revisionLogger = vi.fn().mockResolvedValue(undefined)
    const node = createLogRevisionNode({ revisionLogger })
    const result = await node(makeState())
    // Default resolver returns null → should skip with warning
    expect(revisionLogger).not.toHaveBeenCalled()
    expect(result.warnings!.length).toBeGreaterThan(0)
  })

  it('handles revisionLogger error gracefully (no throw, returns warning)', async () => {
    const revisionLogger = vi.fn().mockRejectedValue(new Error('DB write failed'))
    const planIdResolver = vi.fn().mockResolvedValue(validUUID)
    const node = createLogRevisionNode({ revisionLogger, planIdResolver })
    const result = await node(makeState())
    expect(result.warnings!.some(w => w.includes('DB write failed'))).toBe(true)
  })

  it('handles planIdResolver error gracefully (no throw, returns warning)', async () => {
    const revisionLogger = vi.fn().mockResolvedValue(undefined)
    const planIdResolver = vi.fn().mockRejectedValue(new Error('resolver failed'))
    const node = createLogRevisionNode({ revisionLogger, planIdResolver })
    const result = await node(makeState())
    expect(revisionLogger).not.toHaveBeenCalled()
    expect(result.warnings!.some(w => w.includes('resolver failed'))).toBe(true)
  })

  it('passes drift summary to revisionLogger', async () => {
    let capturedEntry: RevisionLogEntry | null = null
    const revisionLogger = vi.fn().mockImplementation(async (e: RevisionLogEntry) => {
      capturedEntry = e
    })
    const planIdResolver = vi.fn().mockResolvedValue(validUUID)
    const node = createLogRevisionNode({ revisionLogger, planIdResolver })
    await node(
      makeState({ driftFindings: [makeFinding('blocking', 'scope_drift')] }),
    )
    expect(capturedEntry!.summary).toBeTruthy()
    expect(capturedEntry!.summary.length).toBeGreaterThan(0)
  })
})
