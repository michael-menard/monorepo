/**
 * Tests for the auto-update-plan node.
 *
 * APRS-3020: AC-4, AC-5, AC-9
 */

import { describe, expect, it, vi } from 'vitest'
import type { PlanRevalidationState, DriftFinding } from '../../../state/plan-revalidation-state.js'
import {
  buildRevisedSummary,
  buildRevisedTags,
  extractExistingTags,
  createAutoUpdatePlanNode,
  type PlanUpdatePayload,
} from '../auto-update-plan.js'

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
    summary: `${severity} ${category} finding`,
    detail: '',
    confidence: 1.0,
  }
}

// ============================================================================
// buildRevisedSummary
// ============================================================================

describe('buildRevisedSummary', () => {
  it('returns generic message when no blocking/warning findings', () => {
    const summary = buildRevisedSummary('my-plan', [makeFinding('info')])
    expect(summary).toContain('my-plan')
    expect(summary).toContain('minor revision')
  })

  it('includes finding count in summary', () => {
    const findings = [makeFinding('blocking'), makeFinding('warning')]
    const summary = buildRevisedSummary('my-plan', findings)
    expect(summary).toContain('2')
  })

  it('includes category names in summary', () => {
    const findings = [makeFinding('blocking', 'scope_drift')]
    const summary = buildRevisedSummary('my-plan', findings)
    expect(summary).toContain('scope_drift')
  })

  it('includes planSlug in summary', () => {
    const summary = buildRevisedSummary('cool-plan', [makeFinding('blocking')])
    expect(summary).toContain('cool-plan')
  })

  it('uses singular "finding" for single finding', () => {
    const summary = buildRevisedSummary('my-plan', [makeFinding('blocking')])
    expect(summary).not.toContain('findings')
    expect(summary).toContain('finding')
  })

  it('uses plural "findings" for multiple findings', () => {
    const summary = buildRevisedSummary('my-plan', [makeFinding('blocking'), makeFinding('warning')])
    expect(summary).toContain('findings')
  })

  it('handles empty findings array', () => {
    const summary = buildRevisedSummary('my-plan', [])
    expect(summary).toContain('minor revision')
  })
})

// ============================================================================
// buildRevisedTags
// ============================================================================

describe('buildRevisedTags', () => {
  it('always includes "needs-revision" tag', () => {
    const tags = buildRevisedTags([], [])
    expect(tags).toContain('needs-revision')
  })

  it('preserves existing tags', () => {
    const tags = buildRevisedTags(['existing-tag', 'another'], [])
    expect(tags).toContain('existing-tag')
    expect(tags).toContain('another')
  })

  it('adds drift category tag for blocking findings', () => {
    const tags = buildRevisedTags([], [makeFinding('blocking', 'scope_drift')])
    expect(tags).toContain('drift:scope-drift')
  })

  it('adds drift category tag for warning findings', () => {
    const tags = buildRevisedTags([], [makeFinding('warning', 'approach_invalid')])
    expect(tags).toContain('drift:approach-invalid')
  })

  it('does not add drift tag for info findings', () => {
    const tags = buildRevisedTags([], [makeFinding('info', 'scope_drift')])
    expect(tags).not.toContain('drift:scope-drift')
  })

  it('deduplicates tags', () => {
    const tags = buildRevisedTags(
      ['needs-revision'],
      [makeFinding('blocking', 'scope_drift'), makeFinding('blocking', 'scope_drift')],
    )
    const needsRevisionCount = tags.filter(t => t === 'needs-revision').length
    expect(needsRevisionCount).toBe(1)
  })

  it('converts underscores to dashes in category tags', () => {
    const tags = buildRevisedTags([], [makeFinding('blocking', 'already_implemented')])
    expect(tags).toContain('drift:already-implemented')
  })

  it('handles multiple categories', () => {
    const findings = [
      makeFinding('blocking', 'scope_drift'),
      makeFinding('warning', 'dependency_missing'),
    ]
    const tags = buildRevisedTags([], findings)
    expect(tags).toContain('drift:scope-drift')
    expect(tags).toContain('drift:dependency-missing')
  })
})

// ============================================================================
// extractExistingTags
// ============================================================================

describe('extractExistingTags', () => {
  it('returns empty array for null rawPlan', () => {
    expect(extractExistingTags(null)).toEqual([])
  })

  it('returns empty array when no tags field', () => {
    expect(extractExistingTags({ name: 'foo' })).toEqual([])
  })

  it('returns tags from rawPlan.tags array', () => {
    const result = extractExistingTags({ tags: ['a', 'b', 'c'] })
    expect(result).toEqual(['a', 'b', 'c'])
  })

  it('converts non-string tags to strings', () => {
    const result = extractExistingTags({ tags: [1, 2, 3] })
    expect(result).toEqual(['1', '2', '3'])
  })

  it('returns empty array when tags is not an array', () => {
    expect(extractExistingTags({ tags: 'not-an-array' })).toEqual([])
  })
})

// ============================================================================
// createAutoUpdatePlanNode
// ============================================================================

describe('createAutoUpdatePlanNode', () => {
  it('calls planUpdater with only summary and tags when verdict=needs_revision', async () => {
    const planUpdater = vi.fn().mockResolvedValue(undefined)
    const node = createAutoUpdatePlanNode({ planUpdater })
    await node(makeState({ verdict: 'needs_revision' }))
    expect(planUpdater).toHaveBeenCalledTimes(1)
    const payload = planUpdater.mock.calls[0][0] as PlanUpdatePayload
    expect(payload).toHaveProperty('planSlug')
    expect(payload).toHaveProperty('summary')
    expect(payload).toHaveProperty('tags')
    // Ensure no other fields are passed
    expect(Object.keys(payload)).toHaveLength(3)
  })

  it('skips planUpdater call when verdict is not needs_revision', async () => {
    const planUpdater = vi.fn().mockResolvedValue(undefined)
    const node = createAutoUpdatePlanNode({ planUpdater })
    const result = await node(makeState({ verdict: 'proceed' }))
    expect(planUpdater).not.toHaveBeenCalled()
    expect(result.warnings).toBeDefined()
    expect(result.warnings![0]).toContain('skipped')
  })

  it('skips planUpdater call when verdict is already_done', async () => {
    const planUpdater = vi.fn().mockResolvedValue(undefined)
    const node = createAutoUpdatePlanNode({ planUpdater })
    await node(makeState({ verdict: 'already_done' }))
    expect(planUpdater).not.toHaveBeenCalled()
  })

  it('skips planUpdater call when verdict is error', async () => {
    const planUpdater = vi.fn().mockResolvedValue(undefined)
    const node = createAutoUpdatePlanNode({ planUpdater })
    await node(makeState({ verdict: 'error' }))
    expect(planUpdater).not.toHaveBeenCalled()
  })

  it('skips planUpdater call when verdict is null', async () => {
    const planUpdater = vi.fn().mockResolvedValue(undefined)
    const node = createAutoUpdatePlanNode({ planUpdater })
    await node(makeState({ verdict: null }))
    expect(planUpdater).not.toHaveBeenCalled()
  })

  it('does NOT call planUpdater in dry_run mode', async () => {
    const planUpdater = vi.fn().mockResolvedValue(undefined)
    const node = createAutoUpdatePlanNode({ planUpdater, dry_run: true })
    const result = await node(makeState({ verdict: 'needs_revision' }))
    expect(planUpdater).not.toHaveBeenCalled()
    expect(result.warnings).toBeDefined()
    expect(result.warnings!.some(w => w.includes('DRY RUN'))).toBe(true)
  })

  it('dry_run mode includes proposed summary in warning', async () => {
    const node = createAutoUpdatePlanNode({ dry_run: true })
    const result = await node(makeState({ verdict: 'needs_revision' }))
    const warning = result.warnings?.find(w => w.includes('DRY RUN'))
    expect(warning).toBeDefined()
    expect(warning).toContain('summary=')
  })

  it('dry_run mode includes proposed tags in warning', async () => {
    const node = createAutoUpdatePlanNode({ dry_run: true })
    const result = await node(makeState({ verdict: 'needs_revision' }))
    const warning = result.warnings?.find(w => w.includes('DRY RUN'))
    expect(warning).toContain('tags=')
  })

  it('uses existing tags from rawPlan when building updated tags', async () => {
    let capturedPayload: PlanUpdatePayload | null = null
    const planUpdater = vi.fn().mockImplementation(async (p: PlanUpdatePayload) => {
      capturedPayload = p
    })
    const node = createAutoUpdatePlanNode({ planUpdater })
    await node(
      makeState({
        verdict: 'needs_revision',
        rawPlan: { tags: ['existing-tag'] },
      }),
    )
    expect(capturedPayload).not.toBeNull()
    expect(capturedPayload!.tags).toContain('existing-tag')
  })

  it('handles planUpdater error gracefully (no throw, returns warning)', async () => {
    const planUpdater = vi.fn().mockRejectedValue(new Error('DB connection failed'))
    const node = createAutoUpdatePlanNode({ planUpdater })
    const result = await node(makeState({ verdict: 'needs_revision' }))
    expect(result.warnings).toBeDefined()
    expect(result.warnings!.some(w => w.includes('DB connection failed'))).toBe(true)
  })

  it('uses default no-op adapter when none provided', async () => {
    const node = createAutoUpdatePlanNode()
    // Should not throw, default adapter does nothing
    const result = await node(makeState({ verdict: 'needs_revision' }))
    expect(result).toBeDefined()
  })

  it('always includes needs-revision tag in updated tags', async () => {
    let capturedPayload: PlanUpdatePayload | null = null
    const planUpdater = vi.fn().mockImplementation(async (p: PlanUpdatePayload) => {
      capturedPayload = p
    })
    const node = createAutoUpdatePlanNode({ planUpdater })
    await node(makeState({ verdict: 'needs_revision' }))
    expect(capturedPayload!.tags).toContain('needs-revision')
  })
})
