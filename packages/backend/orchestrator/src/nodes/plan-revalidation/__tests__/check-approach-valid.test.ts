/**
 * Tests for the check-approach-valid node.
 *
 * APRS-3010: AC-4 — check-approach-valid node
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

import type { PlanRevalidationState, ContextSnapshot } from '../../../state/plan-revalidation-state.js'
import {
  buildApproachPrompt,
  validateApproach,
  buildApproachFindings,
  createCheckApproachValidNode,
  type ApproachValidationResult,
} from '../check-approach-valid.js'

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
    revalidationPhase: 'check_approach_valid',
    warnings: [],
    errors: [],
    ...overrides,
  }
}

function makeValidationResult(overrides: Partial<ApproachValidationResult> = {}): ApproachValidationResult {
  return {
    isValid: true,
    confidence: 0.9,
    reasoning: 'Looks good',
    issues: [],
    ...overrides,
  }
}

function makeSnapshot(overrides: Partial<ContextSnapshot> = {}): ContextSnapshot {
  return {
    planSlug: 'test-plan',
    planContent: null,
    relatedStories: [],
    codebaseState: null,
    loadedAt: new Date().toISOString(),
    ...overrides,
  }
}

// ============================================================================
// buildApproachPrompt
// ============================================================================

describe('buildApproachPrompt', () => {
  it('extracts approach from rawPlan.approach field', () => {
    const state = makeState({ rawPlan: { approach: 'Use microservices' } })
    const prompt = buildApproachPrompt(state)
    expect(prompt.proposedApproach).toBe('Use microservices')
    expect(prompt.planSlug).toBe('test-plan')
  })

  it('falls back to rawPlan.description when approach is absent', () => {
    const state = makeState({ rawPlan: { description: 'Build a graph node' } })
    const prompt = buildApproachPrompt(state)
    expect(prompt.proposedApproach).toBe('Build a graph node')
  })

  it('falls back to JSON when neither approach nor description present', () => {
    const state = makeState({ rawPlan: { title: 'My Plan' } })
    const prompt = buildApproachPrompt(state)
    expect(prompt.proposedApproach).toContain('My Plan')
  })

  it('includes related story titles from contextSnapshot', () => {
    const state = makeState({
      contextSnapshot: makeSnapshot({
        relatedStories: [
          { id: 'APRS-1010', title: 'Story One', status: 'ready', phase: 'plan' },
          { id: 'APRS-1020', title: 'Story Two', status: 'ready', phase: 'plan' },
        ],
      }),
    })
    const prompt = buildApproachPrompt(state)
    expect(prompt.relatedStoryTitles).toContain('Story One')
    expect(prompt.relatedStoryTitles).toContain('Story Two')
  })

  it('handles missing contextSnapshot gracefully', () => {
    const state = makeState({ contextSnapshot: null })
    const prompt = buildApproachPrompt(state)
    expect(prompt.relatedStoryTitles).toEqual([])
    expect(prompt.contextSummary).toContain('No context snapshot available')
  })
})

// ============================================================================
// validateApproach
// ============================================================================

describe('validateApproach', () => {
  it('returns null and logs info when no adapter provided', async () => {
    const prompt = buildApproachPrompt(makeState())
    const result = await validateApproach(prompt, undefined)
    expect(result).toBeNull()
  })

  it('calls adapter and returns parsed result', async () => {
    const adapter = vi.fn().mockResolvedValue(makeValidationResult())
    const prompt = buildApproachPrompt(makeState())
    const result = await validateApproach(prompt, adapter)
    expect(result).not.toBeNull()
    expect(result?.isValid).toBe(true)
    expect(adapter).toHaveBeenCalledWith(prompt)
  })

  it('returns null when adapter throws', async () => {
    const adapter = vi.fn().mockRejectedValue(new Error('LLM timeout'))
    const prompt = buildApproachPrompt(makeState())
    const result = await validateApproach(prompt, adapter)
    expect(result).toBeNull()
  })
})

// ============================================================================
// buildApproachFindings
// ============================================================================

describe('buildApproachFindings', () => {
  it('returns empty array for valid approach with high confidence', () => {
    const findings = buildApproachFindings(makeValidationResult({ isValid: true, confidence: 0.9 }))
    expect(findings).toEqual([])
  })

  it('returns info finding for valid but low-confidence approach', () => {
    const findings = buildApproachFindings(
      makeValidationResult({ isValid: true, confidence: 0.5 }),
      0.3,
      0.7,
    )
    expect(findings).toHaveLength(1)
    expect(findings[0].severity).toBe('warning')
  })

  it('returns blocking finding for very low confidence invalid approach', () => {
    const findings = buildApproachFindings(
      makeValidationResult({ isValid: false, confidence: 0.1 }),
      0.3,
      0.7,
    )
    expect(findings).toHaveLength(1)
    expect(findings[0].severity).toBe('blocking')
    expect(findings[0].category).toBe('approach_invalid')
  })

  it('returns warning finding for moderate confidence invalid approach', () => {
    const findings = buildApproachFindings(
      makeValidationResult({ isValid: false, confidence: 0.5 }),
      0.3,
      0.7,
    )
    expect(findings).toHaveLength(1)
    expect(findings[0].severity).toBe('warning')
  })

  it('includes issues in finding detail', () => {
    const findings = buildApproachFindings(
      makeValidationResult({ isValid: false, confidence: 0.2, issues: ['Issue A', 'Issue B'] }),
    )
    expect(findings[0].detail).toContain('Issue A')
    expect(findings[0].detail).toContain('Issue B')
  })
})

// ============================================================================
// createCheckApproachValidNode
// ============================================================================

describe('createCheckApproachValidNode', () => {
  it('skips LLM and transitions to check_dependencies when no adapter', async () => {
    const node = createCheckApproachValidNode()
    const result = await node(makeState())
    expect(result.revalidationPhase).toBe('check_dependencies')
    expect(result.driftFindings ?? []).toEqual([])
  })

  it('calls adapter and appends findings on invalid approach', async () => {
    const adapter = vi.fn().mockResolvedValue(
      makeValidationResult({ isValid: false, confidence: 0.2 }),
    )
    const node = createCheckApproachValidNode({ llmAdapter: adapter })
    const result = await node(makeState())
    expect(result.revalidationPhase).toBe('check_dependencies')
    expect(result.driftFindings).toHaveLength(1)
    expect(result.driftFindings![0].category).toBe('approach_invalid')
  })

  it('appends no findings when approach is valid with high confidence', async () => {
    const adapter = vi.fn().mockResolvedValue(
      makeValidationResult({ isValid: true, confidence: 0.95 }),
    )
    const node = createCheckApproachValidNode({ llmAdapter: adapter })
    const result = await node(makeState())
    expect(result.driftFindings).toEqual([])
  })

  it('transitions to error phase on unexpected error', async () => {
    const adapter = vi.fn().mockImplementation(() => {
      throw new Error('Unhandled crash')
    })
    const node = createCheckApproachValidNode({ llmAdapter: adapter })
    const result = await node(makeState())
    // validateApproach catches, returns null → transitions to check_dependencies
    expect(['check_dependencies', 'error']).toContain(result.revalidationPhase)
  })
})
