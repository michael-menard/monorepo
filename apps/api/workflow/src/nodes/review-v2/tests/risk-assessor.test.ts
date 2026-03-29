/**
 * risk_assessor node tests (review-v2)
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
  buildRiskAssessorPrompt,
  parseSelectedDimensions,
  deriveDimensionsFromDiff,
  createRiskAssessorNode,
} from '../risk-assessor.js'
import type { DiffAnalysis, ReviewV2State } from '../../../state/review-v2-state.js'

// ============================================================================
// Helpers
// ============================================================================

function makeDiff(overrides: Partial<DiffAnalysis> = {}): DiffAnalysis {
  return {
    changedFiles: [{ path: 'src/auth.ts', changeType: 'modified', linesAdded: 20, linesRemoved: 5, summary: '' }],
    affectedDomains: ['backend'],
    riskSurface: 'medium',
    hasSecuritySensitiveChanges: false,
    hasDatabaseChanges: false,
    hasApiChanges: false,
    ...overrides,
  }
}

function makeState(overrides: Partial<ReviewV2State> = {}): ReviewV2State {
  return {
    storyId: 'WINT-1234',
    worktreePath: '/tmp/wt',
    diffAnalysis: makeDiff(),
    selectedReviewDimensions: [],
    reviewFindings: [],
    reviewVerdict: null,
    postconditionResult: null,
    reviewV2Phase: 'risk_assessor',
    retryCount: 0,
    maxRetries: 2,
    tokenUsage: [],
    bakeOffVersion: 'v2-agentic',
    warnings: [],
    errors: [],
    ...overrides,
  }
}

// ============================================================================
// buildRiskAssessorPrompt tests
// ============================================================================

describe('buildRiskAssessorPrompt', () => {
  it('includes risk surface in prompt', () => {
    const prompt = buildRiskAssessorPrompt(makeDiff())
    expect(prompt).toContain('medium')
  })

  it('includes changed files', () => {
    const prompt = buildRiskAssessorPrompt(makeDiff())
    expect(prompt).toContain('src/auth.ts')
  })

  it('mentions security flag when hasSecuritySensitiveChanges', () => {
    const prompt = buildRiskAssessorPrompt(makeDiff({ hasSecuritySensitiveChanges: true }))
    expect(prompt).toContain('true')
  })
})

// ============================================================================
// parseSelectedDimensions tests
// ============================================================================

describe('parseSelectedDimensions', () => {
  it('parses valid JSON response', () => {
    const dims = parseSelectedDimensions(JSON.stringify({ selectedDimensions: ['correctness', 'security'] }))
    expect(dims).toContain('correctness')
    expect(dims).toContain('security')
  })

  it('always includes correctness', () => {
    const dims = parseSelectedDimensions(JSON.stringify({ selectedDimensions: ['security'] }))
    expect(dims).toContain('correctness')
  })

  it('filters invalid dimensions', () => {
    const dims = parseSelectedDimensions(JSON.stringify({ selectedDimensions: ['correctness', 'made-up-dimension'] }))
    expect(dims).not.toContain('made-up-dimension')
  })

  it('returns correctness-only on parse error', () => {
    const dims = parseSelectedDimensions('not json')
    expect(dims).toEqual(['correctness'])
  })

  it('limits to 5 dimensions', () => {
    const dims = parseSelectedDimensions(JSON.stringify({
      selectedDimensions: ['correctness', 'security', 'performance', 'accessibility', 'data-integrity', 'api-contract', 'test-coverage'],
    }))
    expect(dims.length).toBeLessThanOrEqual(5)
  })
})

// ============================================================================
// deriveDimensionsFromDiff tests
// ============================================================================

describe('deriveDimensionsFromDiff', () => {
  it('always includes correctness', () => {
    expect(deriveDimensionsFromDiff(makeDiff())).toContain('correctness')
  })

  it('includes security for security-sensitive changes', () => {
    const dims = deriveDimensionsFromDiff(makeDiff({ hasSecuritySensitiveChanges: true }))
    expect(dims).toContain('security')
  })

  it('includes data-integrity for DB changes', () => {
    const dims = deriveDimensionsFromDiff(makeDiff({ hasDatabaseChanges: true }))
    expect(dims).toContain('data-integrity')
  })

  it('includes api-contract for API changes', () => {
    const dims = deriveDimensionsFromDiff(makeDiff({ hasApiChanges: true }))
    expect(dims).toContain('api-contract')
  })
})

// ============================================================================
// createRiskAssessorNode tests
// ============================================================================

describe('createRiskAssessorNode', () => {
  it('returns at least correctness with no-op adapter', async () => {
    const node = createRiskAssessorNode()
    const result = await node(makeState())
    expect(result.selectedReviewDimensions).toContain('correctness')
  })

  it('calls llmAdapter', async () => {
    const llmAdapter = vi.fn().mockResolvedValue({
      content: JSON.stringify({ selectedDimensions: ['correctness', 'security'] }),
      inputTokens: 10,
      outputTokens: 5,
    })
    const node = createRiskAssessorNode({ llmAdapter })
    await node(makeState())
    expect(llmAdapter).toHaveBeenCalled()
  })

  it('tracks token usage', async () => {
    const llmAdapter = vi.fn().mockResolvedValue({
      content: JSON.stringify({ selectedDimensions: ['correctness'] }),
      inputTokens: 50,
      outputTokens: 20,
    })
    const node = createRiskAssessorNode({ llmAdapter })
    const result = await node(makeState())
    expect(Array.isArray(result.tokenUsage)).toBe(true)
  })

  it('sets phase to review_agent', async () => {
    const node = createRiskAssessorNode()
    const result = await node(makeState())
    expect(result.reviewV2Phase).toBe('review_agent')
  })

  it('degrades gracefully when LLM throws', async () => {
    const llmAdapter = vi.fn().mockRejectedValue(new Error('LLM offline'))
    const node = createRiskAssessorNode({ llmAdapter })
    const result = await node(makeState())
    expect(result.selectedReviewDimensions).toContain('correctness')
  })

  it('handles null diffAnalysis gracefully', async () => {
    const node = createRiskAssessorNode()
    const result = await node(makeState({ diffAnalysis: null }))
    expect(result.selectedReviewDimensions).toContain('correctness')
  })
})
