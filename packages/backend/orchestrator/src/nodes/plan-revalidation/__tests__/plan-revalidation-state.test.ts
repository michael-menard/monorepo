/**
 * Tests for PlanRevalidationStateAnnotation and Zod schemas.
 *
 * APRS-3010: AC-1 — State annotation and Zod schemas
 */

import { describe, expect, it, vi } from 'vitest'
import {
  StoryRefSchema,
  ContextSnapshotSchema,
  DriftFindingSchema,
  RevalidationVerdictSchema,
  RevalidationPhaseSchema,
  PlanRevalidationStateAnnotation,
} from '../../../state/plan-revalidation-state.js'
import type { PlanRevalidationState } from '../../../state/plan-revalidation-state.js'

vi.mock('@repo/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}))

vi.mock('@langchain/langgraph', () => {
  const overwrite = <T>(_: T, b: T): T => b
  const append = <T>(a: T[], b: T[]): T[] => [...a, ...b]

  const Annotation = Object.assign(
    (config: unknown) => ({ ...(config as object) }),
    {
      Root: (fields: Record<string, unknown>) => ({
        State: {} as unknown,
        fields,
      }),
    },
  )

  return { Annotation, overwrite, append }
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
    revalidationPhase: 'load_context',
    warnings: [],
    errors: [],
    ...overrides,
  }
}

// ============================================================================
// StoryRefSchema
// ============================================================================

describe('StoryRefSchema', () => {
  it('parses a valid story ref', () => {
    const result = StoryRefSchema.parse({ id: 'APRS-1010', title: 'Title', status: 'ready', phase: 'plan' })
    expect(result.id).toBe('APRS-1010')
  })

  it('applies defaults for optional fields', () => {
    const result = StoryRefSchema.parse({ id: 'APRS-1010' })
    expect(result.title).toBe('')
    expect(result.status).toBe('')
    expect(result.phase).toBe('')
  })

  it('rejects missing id', () => {
    expect(() => StoryRefSchema.parse({ title: 'Missing ID' })).toThrow()
  })

  it('rejects empty id', () => {
    expect(() => StoryRefSchema.parse({ id: '' })).toThrow()
  })
})

// ============================================================================
// ContextSnapshotSchema
// ============================================================================

describe('ContextSnapshotSchema', () => {
  it('parses a valid context snapshot', () => {
    const result = ContextSnapshotSchema.parse({
      planSlug: 'my-plan',
      planContent: { title: 'Plan' },
      relatedStories: [{ id: 'APRS-1010' }],
      codebaseState: null,
      loadedAt: new Date().toISOString(),
    })
    expect(result.planSlug).toBe('my-plan')
    expect(result.relatedStories).toHaveLength(1)
  })

  it('applies defaults for codebaseState and relatedStories', () => {
    const result = ContextSnapshotSchema.parse({
      planSlug: 'my-plan',
      planContent: null,
      loadedAt: new Date().toISOString(),
    })
    expect(result.codebaseState).toBeNull()
    expect(result.relatedStories).toEqual([])
  })

  it('rejects invalid datetime', () => {
    expect(() =>
      ContextSnapshotSchema.parse({
        planSlug: 'my-plan',
        planContent: null,
        loadedAt: 'not-a-date',
      }),
    ).toThrow()
  })
})

// ============================================================================
// DriftFindingSchema
// ============================================================================

describe('DriftFindingSchema', () => {
  it('parses a valid drift finding', () => {
    const result = DriftFindingSchema.parse({
      nodeId: 'test-node',
      category: 'already_implemented',
      severity: 'info',
      summary: 'Already done',
    })
    expect(result.nodeId).toBe('test-node')
    expect(result.confidence).toBe(1.0)
    expect(result.detail).toBe('')
  })

  it('rejects unknown category', () => {
    expect(() =>
      DriftFindingSchema.parse({
        nodeId: 'test-node',
        category: 'unknown_category',
        severity: 'info',
        summary: 'Test',
      }),
    ).toThrow()
  })

  it('rejects confidence outside 0-1', () => {
    expect(() =>
      DriftFindingSchema.parse({
        nodeId: 'test-node',
        category: 'other',
        severity: 'info',
        summary: 'Test',
        confidence: 1.5,
      }),
    ).toThrow()
  })
})

// ============================================================================
// RevalidationVerdictSchema
// ============================================================================

describe('RevalidationVerdictSchema', () => {
  it('accepts all valid verdicts', () => {
    const verdicts = ['proceed', 'needs_revision', 'already_done', 'blocked', 'error']
    for (const v of verdicts) {
      expect(RevalidationVerdictSchema.parse(v)).toBe(v)
    }
  })

  it('rejects unknown verdict', () => {
    expect(() => RevalidationVerdictSchema.parse('unknown')).toThrow()
  })
})

// ============================================================================
// RevalidationPhaseSchema
// ============================================================================

describe('RevalidationPhaseSchema', () => {
  it('accepts all valid phases', () => {
    const phases = [
      'load_context',
      'check_already_implemented',
      'check_approach_valid',
      'check_dependencies',
      'check_scope_drift',
      'classify_drift',
      'complete',
      'error',
    ]
    for (const p of phases) {
      expect(RevalidationPhaseSchema.parse(p)).toBe(p)
    }
  })

  it('rejects unknown phase', () => {
    expect(() => RevalidationPhaseSchema.parse('unknown_phase')).toThrow()
  })
})

// ============================================================================
// PlanRevalidationStateAnnotation
// ============================================================================

describe('PlanRevalidationStateAnnotation', () => {
  it('is defined', () => {
    expect(PlanRevalidationStateAnnotation).toBeDefined()
  })

  it('has all expected field annotations', () => {
    expect(PlanRevalidationStateAnnotation.fields).toHaveProperty('planSlug')
    expect(PlanRevalidationStateAnnotation.fields).toHaveProperty('rawPlan')
    expect(PlanRevalidationStateAnnotation.fields).toHaveProperty('contextSnapshot')
    expect(PlanRevalidationStateAnnotation.fields).toHaveProperty('driftFindings')
    expect(PlanRevalidationStateAnnotation.fields).toHaveProperty('verdict')
    expect(PlanRevalidationStateAnnotation.fields).toHaveProperty('revalidationPhase')
    expect(PlanRevalidationStateAnnotation.fields).toHaveProperty('warnings')
    expect(PlanRevalidationStateAnnotation.fields).toHaveProperty('errors')
  })
})

// ============================================================================
// makeState helper
// ============================================================================

describe('makeState helper', () => {
  it('produces a valid state with all required fields', () => {
    const state = makeState()
    expect(state.planSlug).toBe('test-plan')
    expect(state.rawPlan).toBeNull()
    expect(state.contextSnapshot).toBeNull()
    expect(state.driftFindings).toEqual([])
    expect(state.verdict).toBeNull()
    expect(state.revalidationPhase).toBe('load_context')
    expect(state.warnings).toEqual([])
    expect(state.errors).toEqual([])
  })

  it('allows overriding any field', () => {
    const state = makeState({ planSlug: 'override-plan', revalidationPhase: 'complete' })
    expect(state.planSlug).toBe('override-plan')
    expect(state.revalidationPhase).toBe('complete')
  })
})
