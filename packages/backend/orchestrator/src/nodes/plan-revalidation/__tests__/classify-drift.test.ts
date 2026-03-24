/**
 * Tests for the classify-drift node.
 *
 * APRS-3020: AC-1, AC-2, AC-3, AC-9
 */

import { describe, expect, it, vi } from 'vitest'
import type { PlanRevalidationState, DriftFinding } from '../../../state/plan-revalidation-state.js'
import {
  scoreDriftFindings,
  buildVerdictSummary,
  createClassifyDriftNode,
} from '../classify-drift.js'

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
    verdict: null,
    revalidationPhase: 'classify_drift',
    warnings: [],
    errors: [],
    ...overrides,
  }
}

function makeFinding(
  severity: 'info' | 'warning' | 'blocking',
  category: DriftFinding['category'] = 'other',
  summary = 'test finding',
): DriftFinding {
  return {
    nodeId: 'test-node',
    category,
    severity,
    summary,
    detail: '',
    confidence: 1.0,
  }
}

// ============================================================================
// scoreDriftFindings
// ============================================================================

describe('scoreDriftFindings', () => {
  it('returns "proceed" for empty findings array', () => {
    expect(scoreDriftFindings([])).toBe('proceed')
  })

  it('returns "proceed" for all info findings', () => {
    const findings = [makeFinding('info'), makeFinding('info', 'scope_drift')]
    expect(scoreDriftFindings(findings)).toBe('proceed')
  })

  it('returns "needs_revision" for any warning finding (no blocking)', () => {
    const findings = [makeFinding('warning', 'scope_drift')]
    expect(scoreDriftFindings(findings)).toBe('needs_revision')
  })

  it('returns "needs_revision" for mixed warning and info (no blocking)', () => {
    const findings = [makeFinding('info'), makeFinding('warning')]
    expect(scoreDriftFindings(findings)).toBe('needs_revision')
  })

  it('returns "needs_revision" for multiple warnings', () => {
    const findings = [
      makeFinding('warning', 'scope_drift'),
      makeFinding('warning', 'approach_invalid'),
    ]
    expect(scoreDriftFindings(findings)).toBe('needs_revision')
  })

  it('returns "needs_revision" for blocking finding with non-already_implemented category', () => {
    const findings = [makeFinding('blocking', 'approach_invalid')]
    expect(scoreDriftFindings(findings)).toBe('needs_revision')
  })

  it('returns "needs_revision" for blocking dependency_missing category', () => {
    const findings = [makeFinding('blocking', 'dependency_missing')]
    expect(scoreDriftFindings(findings)).toBe('needs_revision')
  })

  it('returns "needs_revision" for blocking scope_drift category', () => {
    const findings = [makeFinding('blocking', 'scope_drift')]
    expect(scoreDriftFindings(findings)).toBe('needs_revision')
  })

  it('returns "needs_revision" for blocking other category', () => {
    const findings = [makeFinding('blocking', 'other')]
    expect(scoreDriftFindings(findings)).toBe('needs_revision')
  })

  it('returns "already_done" for blocking already_implemented (no other blocking)', () => {
    const findings = [makeFinding('blocking', 'already_implemented')]
    expect(scoreDriftFindings(findings)).toBe('already_done')
  })

  it('returns "already_done" for multiple blocking already_implemented findings', () => {
    const findings = [
      makeFinding('blocking', 'already_implemented', 'finding 1'),
      makeFinding('blocking', 'already_implemented', 'finding 2'),
    ]
    expect(scoreDriftFindings(findings)).toBe('already_done')
  })

  it('returns "needs_revision" when blocking already_implemented mixed with other blocking', () => {
    const findings = [
      makeFinding('blocking', 'already_implemented'),
      makeFinding('blocking', 'approach_invalid'),
    ]
    expect(scoreDriftFindings(findings)).toBe('needs_revision')
  })

  it('returns "needs_revision" for blocking already_implemented + blocking scope_drift', () => {
    const findings = [
      makeFinding('blocking', 'already_implemented'),
      makeFinding('blocking', 'scope_drift'),
    ]
    expect(scoreDriftFindings(findings)).toBe('needs_revision')
  })

  it('ignores info findings when warnings are present', () => {
    const findings = [makeFinding('info'), makeFinding('info'), makeFinding('warning')]
    expect(scoreDriftFindings(findings)).toBe('needs_revision')
  })

  it('blocking takes priority over warning', () => {
    const findings = [makeFinding('warning'), makeFinding('blocking', 'scope_drift')]
    expect(scoreDriftFindings(findings)).toBe('needs_revision')
  })

  it('blocking already_implemented with warning returns already_done (warning alone would be needs_revision)', () => {
    // Only blocking is already_implemented, warning is present but blocking takes priority
    const findings = [makeFinding('blocking', 'already_implemented'), makeFinding('warning')]
    // Mixed: already_implemented blocking but also a warning, no other blocking → already_done
    expect(scoreDriftFindings(findings)).toBe('already_done')
  })

  it('returns "proceed" for single info finding', () => {
    expect(scoreDriftFindings([makeFinding('info')])).toBe('proceed')
  })
})

// ============================================================================
// buildVerdictSummary
// ============================================================================

describe('buildVerdictSummary', () => {
  it('returns "no findings" when empty', () => {
    const summary = buildVerdictSummary([], 'proceed')
    expect(summary).toContain('no findings')
    expect(summary).toContain('proceed')
  })

  it('includes blocking count in summary', () => {
    const findings = [makeFinding('blocking'), makeFinding('blocking')]
    const summary = buildVerdictSummary(findings, 'needs_revision')
    expect(summary).toContain('2 blocking')
  })

  it('includes warning count in summary', () => {
    const findings = [makeFinding('warning')]
    const summary = buildVerdictSummary(findings, 'needs_revision')
    expect(summary).toContain('1 warning')
  })

  it('includes info count in summary', () => {
    const findings = [makeFinding('info'), makeFinding('info')]
    const summary = buildVerdictSummary(findings, 'proceed')
    expect(summary).toContain('2 info')
  })

  it('includes all severity counts when mixed', () => {
    const findings = [makeFinding('blocking'), makeFinding('warning'), makeFinding('info')]
    const summary = buildVerdictSummary(findings, 'needs_revision')
    expect(summary).toContain('1 blocking')
    expect(summary).toContain('1 warning')
    expect(summary).toContain('1 info')
  })

  it('includes the verdict in the summary', () => {
    const summary = buildVerdictSummary([makeFinding('blocking', 'already_implemented')], 'already_done')
    expect(summary).toContain('already_done')
  })
})

// ============================================================================
// createClassifyDriftNode
// ============================================================================

describe('createClassifyDriftNode', () => {
  it('assigns verdict=proceed for empty findings and no errors', async () => {
    const node = createClassifyDriftNode()
    const result = await node(makeState())
    expect(result.verdict).toBe('proceed')
  })

  it('assigns verdict=needs_revision for warning findings', async () => {
    const node = createClassifyDriftNode()
    const result = await node(makeState({ driftFindings: [makeFinding('warning')] }))
    expect(result.verdict).toBe('needs_revision')
  })

  it('assigns verdict=needs_revision for blocking non-already_implemented findings', async () => {
    const node = createClassifyDriftNode()
    const result = await node(makeState({ driftFindings: [makeFinding('blocking', 'scope_drift')] }))
    expect(result.verdict).toBe('needs_revision')
  })

  it('assigns verdict=already_done for blocking already_implemented findings', async () => {
    const node = createClassifyDriftNode()
    const result = await node(
      makeState({ driftFindings: [makeFinding('blocking', 'already_implemented')] }),
    )
    expect(result.verdict).toBe('already_done')
  })

  it('assigns verdict=error when state.errors is non-empty', async () => {
    const node = createClassifyDriftNode()
    const result = await node(makeState({ errors: ['some prior error'] }))
    expect(result.verdict).toBe('error')
  })

  it('assigns verdict=error takes priority over findings', async () => {
    const node = createClassifyDriftNode()
    const result = await node(
      makeState({
        driftFindings: [makeFinding('warning')],
        errors: ['upstream error'],
      }),
    )
    expect(result.verdict).toBe('error')
  })

  it('sets revalidationPhase to classify_drift on success', async () => {
    const node = createClassifyDriftNode()
    const result = await node(makeState())
    expect(result.revalidationPhase).toBe('classify_drift')
  })

  it('does not write to driftFindings (pure classification, no new findings)', async () => {
    const node = createClassifyDriftNode()
    const result = await node(makeState({ driftFindings: [makeFinding('info')] }))
    // Node should not add to driftFindings — only sets verdict
    expect(result.driftFindings).toBeUndefined()
  })

  it('assigns verdict=proceed for all info findings', async () => {
    const node = createClassifyDriftNode()
    const result = await node(
      makeState({
        driftFindings: [makeFinding('info'), makeFinding('info', 'already_implemented')],
      }),
    )
    expect(result.verdict).toBe('proceed')
  })

  it('handles multiple blocking findings with mixed categories → needs_revision', async () => {
    const node = createClassifyDriftNode()
    const result = await node(
      makeState({
        driftFindings: [
          makeFinding('blocking', 'already_implemented'),
          makeFinding('blocking', 'scope_drift'),
        ],
      }),
    )
    expect(result.verdict).toBe('needs_revision')
  })
})
