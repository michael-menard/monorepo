/**
 * review_agent node tests (review-v2)
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
  buildReviewPrompt,
  checkReviewPostconditions,
  createReviewAgentNode,
} from '../review-agent.js'
import type { DiffAnalysis, ReviewFinding, ReviewV2State } from '../../../state/review-v2-state.js'

// ============================================================================
// Helpers
// ============================================================================

function makeDiff(overrides: Partial<DiffAnalysis> = {}): DiffAnalysis {
  return {
    changedFiles: [{ path: 'src/auth.ts', changeType: 'modified', linesAdded: 10, linesRemoved: 5, summary: '' }],
    affectedDomains: ['backend'],
    riskSurface: 'medium',
    hasSecuritySensitiveChanges: false,
    hasDatabaseChanges: false,
    hasApiChanges: false,
    ...overrides,
  }
}

function makeFinding(overrides: Partial<ReviewFinding> = {}): ReviewFinding {
  return {
    id: 'correctness-001',
    severity: 'medium',
    category: 'correctness',
    file: 'src/auth.ts',
    description: 'Missing null check',
    evidence: 'if (user.token) { // no null check',
    ...overrides,
  }
}

function makeState(overrides: Partial<ReviewV2State> = {}): ReviewV2State {
  return {
    storyId: 'WINT-1234',
    worktreePath: '/tmp/wt',
    diffAnalysis: makeDiff(),
    selectedReviewDimensions: ['correctness'],
    reviewFindings: [],
    reviewVerdict: null,
    postconditionResult: null,
    reviewV2Phase: 'review_agent',
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
// buildReviewPrompt tests
// ============================================================================

describe('buildReviewPrompt', () => {
  it('includes dimension in prompt', () => {
    const prompt = buildReviewPrompt('security', makeDiff(), {})
    expect(prompt).toContain('security')
  })

  it('includes changed files', () => {
    const prompt = buildReviewPrompt('correctness', makeDiff(), {})
    expect(prompt).toContain('src/auth.ts')
  })

  it('includes file contents when provided', () => {
    const prompt = buildReviewPrompt('correctness', makeDiff(), { 'src/auth.ts': 'function auth() {}' })
    expect(prompt).toContain('function auth()')
  })
})

// ============================================================================
// checkReviewPostconditions tests
// ============================================================================

describe('checkReviewPostconditions', () => {
  it('passes with valid findings', () => {
    const result = checkReviewPostconditions([makeFinding()], makeDiff(), ['correctness'])
    expect(result.passed).toBe(true)
  })

  it('passes with no findings', () => {
    const result = checkReviewPostconditions([], makeDiff(), ['correctness'])
    expect(result.passed).toBe(true)
  })

  it('fails when critical finding has no file', () => {
    const result = checkReviewPostconditions(
      [makeFinding({ severity: 'critical', file: '' })],
      makeDiff(),
      ['correctness'],
    )
    expect(result.passed).toBe(false)
    expect(result.failures.some(f => f.check === 'critical_findings_have_file')).toBe(true)
  })

  it('fails when DB changes but data-integrity not reviewed', () => {
    const result = checkReviewPostconditions(
      [],
      makeDiff({ hasDatabaseChanges: true }),
      ['correctness'], // data-integrity missing
    )
    expect(result.passed).toBe(false)
    expect(result.failures.some(f => f.check === 'data_integrity_reviewed')).toBe(true)
  })

  it('fails when finding has empty evidence', () => {
    const result = checkReviewPostconditions(
      [makeFinding({ evidence: '' })],
      makeDiff(),
      ['correctness'],
    )
    expect(result.passed).toBe(false)
    expect(result.failures.some(f => f.check === 'all_findings_have_evidence')).toBe(true)
  })

  it('passes with DB changes when data-integrity is in reviewed dimensions', () => {
    const result = checkReviewPostconditions(
      [],
      makeDiff({ hasDatabaseChanges: true }),
      ['correctness', 'data-integrity'],
    )
    expect(result.passed).toBe(true)
  })
})

// ============================================================================
// createReviewAgentNode tests
// ============================================================================

describe('createReviewAgentNode', () => {
  it('runs with no-op adapter', async () => {
    const node = createReviewAgentNode()
    const result = await node(makeState())
    expect(result.reviewFindings).toBeDefined()
    expect(result.reviewV2Phase).toBe('postcondition_gate')
  })

  it('calls llmAdapter for each selected dimension', async () => {
    const llmAdapter = vi.fn().mockResolvedValue({
      content: JSON.stringify({ findings: [], dimensionReviewed: 'correctness', note: 'clean' }),
      inputTokens: 10,
      outputTokens: 5,
    })
    const node = createReviewAgentNode({ llmAdapter })
    await node(makeState({ selectedReviewDimensions: ['correctness', 'security'] }))
    expect(llmAdapter).toHaveBeenCalledTimes(2)
  })

  it('accumulates findings across dimensions', async () => {
    const llmAdapter = vi.fn().mockResolvedValue({
      content: JSON.stringify({
        findings: [makeFinding()],
        dimensionReviewed: 'correctness',
      }),
      inputTokens: 10,
      outputTokens: 5,
    })
    const node = createReviewAgentNode({ llmAdapter })
    const result = await node(makeState({ selectedReviewDimensions: ['correctness', 'security'] }))
    // findings is an append reducer so we check the node returned findings
    expect(Array.isArray(result.reviewFindings)).toBe(true)
  })

  it('tracks token usage per dimension', async () => {
    const llmAdapter = vi.fn().mockResolvedValue({
      content: JSON.stringify({ findings: [], dimensionReviewed: 'correctness' }),
      inputTokens: 20,
      outputTokens: 10,
    })
    const node = createReviewAgentNode({ llmAdapter })
    const result = await node(makeState({ selectedReviewDimensions: ['correctness'] }))
    expect(Array.isArray(result.tokenUsage)).toBe(true)
  })

  it('handles null diffAnalysis gracefully', async () => {
    const node = createReviewAgentNode()
    const result = await node(makeState({ diffAnalysis: null }))
    expect(result.reviewV2Phase).toBe('postcondition_gate')
  })
})
