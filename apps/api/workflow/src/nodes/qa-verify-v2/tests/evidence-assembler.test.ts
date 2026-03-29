/**
 * evidence_assembler node tests (qa-verify-v2)
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

import { assignQaVerdict, createEvidenceAssemblerNode } from '../evidence-assembler.js'
import type {
  ACVerificationResult,
  ParsedAC,
  QAVerifyV2State,
} from '../../../state/qa-verify-v2-state.js'

// ============================================================================
// Helpers
// ============================================================================

function makeParsedAC(index: number, testType: ParsedAC['testType'] = 'unit'): ParsedAC {
  return {
    index,
    original: `AC ${index}`,
    testableAssertion: `When X, then Y (${index})`,
    testType,
    testHints: [],
  }
}

function makeResult(
  acIndex: number,
  verdict: ACVerificationResult['verdict'],
): ACVerificationResult {
  return {
    acIndex,
    acText: `AC ${acIndex}`,
    verdict,
    evidence: verdict === 'pass' ? 'test passed' : verdict === 'fail' ? 'test failed' : '',
  }
}

function makeState(overrides: Partial<QAVerifyV2State> = {}): QAVerifyV2State {
  return {
    storyId: 'WINT-1234',
    parsedACs: [makeParsedAC(0), makeParsedAC(1)],
    testStrategy: null,
    unitTestResult: null,
    e2eTestResult: null,
    acVerificationResults: [makeResult(0, 'pass'), makeResult(1, 'pass')],
    qaVerdict: null,
    postconditionResult: null,
    qaVerifyV2Phase: 'evidence_assembler',
    retryCount: 0,
    maxRetries: 1,
    tokenUsage: [],
    bakeOffVersion: 'v2-agentic',
    warnings: [],
    errors: [],
    ...overrides,
  }
}

// ============================================================================
// assignQaVerdict tests
// ============================================================================

describe('assignQaVerdict', () => {
  it('returns pass when all automated ACs pass', () => {
    const results = [makeResult(0, 'pass'), makeResult(1, 'pass')]
    const parsedACs = [makeParsedAC(0), makeParsedAC(1)]
    expect(assignQaVerdict(results, parsedACs)).toBe('pass')
  })

  it('returns fail when AC index 0 (critical) fails', () => {
    const results = [makeResult(0, 'fail'), makeResult(1, 'pass')]
    const parsedACs = [makeParsedAC(0), makeParsedAC(1)]
    expect(assignQaVerdict(results, parsedACs)).toBe('fail')
  })

  it('returns conditional_pass when non-critical AC fails', () => {
    const results = [makeResult(0, 'pass'), makeResult(1, 'fail')]
    const parsedACs = [makeParsedAC(0), makeParsedAC(1)]
    expect(assignQaVerdict(results, parsedACs)).toBe('conditional_pass')
  })

  it('returns conditional_pass when all are manual', () => {
    const results = [makeResult(0, 'manual'), makeResult(1, 'manual')]
    const parsedACs = [makeParsedAC(0, 'manual'), makeParsedAC(1, 'manual')]
    expect(assignQaVerdict(results, parsedACs)).toBe('conditional_pass')
  })

  it('returns conditional_pass for empty results', () => {
    expect(assignQaVerdict([], [])).toBe('conditional_pass')
  })

  it('returns conditional_pass when some skip but no critical fail', () => {
    const results = [makeResult(0, 'pass'), makeResult(1, 'skip')]
    const parsedACs = [makeParsedAC(0), makeParsedAC(1)]
    expect(assignQaVerdict(results, parsedACs)).toBe('conditional_pass')
  })
})

// ============================================================================
// createEvidenceAssemblerNode tests
// ============================================================================

describe('createEvidenceAssemblerNode', () => {
  it('sets qaVerdict', async () => {
    const node = createEvidenceAssemblerNode()
    const result = await node(makeState())
    expect(result.qaVerdict).not.toBeNull()
    expect(result.qaVerdict).toBe('pass')
  })

  it('sets phase to postcondition_gate', async () => {
    const node = createEvidenceAssemblerNode()
    const result = await node(makeState())
    expect(result.qaVerifyV2Phase).toBe('postcondition_gate')
  })

  it('assigns fail verdict when critical AC fails', async () => {
    const node = createEvidenceAssemblerNode()
    const result = await node(makeState({
      acVerificationResults: [makeResult(0, 'fail'), makeResult(1, 'pass')],
    }))
    expect(result.qaVerdict).toBe('fail')
  })

  it('assigns conditional_pass when non-critical fails', async () => {
    const node = createEvidenceAssemblerNode()
    const result = await node(makeState({
      acVerificationResults: [makeResult(0, 'pass'), makeResult(1, 'fail')],
    }))
    expect(result.qaVerdict).toBe('conditional_pass')
  })
})
