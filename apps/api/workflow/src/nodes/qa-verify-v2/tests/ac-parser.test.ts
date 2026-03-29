/**
 * ac_parser node tests (qa-verify-v2)
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
  classifyAC,
  extractTestableAssertion,
  extractTestHints,
  createAcParserNode,
} from '../ac-parser.js'
import type { QAVerifyV2State } from '../../../state/qa-verify-v2-state.js'

// ============================================================================
// Helpers
// ============================================================================

function makeState(overrides: Partial<QAVerifyV2State> = {}): QAVerifyV2State {
  return {
    storyId: 'WINT-1234',
    parsedACs: [],
    testStrategy: null,
    unitTestResult: null,
    e2eTestResult: null,
    acVerificationResults: [],
    qaVerdict: null,
    postconditionResult: null,
    qaVerifyV2Phase: 'ac_parser',
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
// classifyAC tests
// ============================================================================

describe('classifyAC', () => {
  it('classifies e2e AC by "click"', () => {
    expect(classifyAC('When user clicks Submit button')).toBe('e2e')
  })

  it('classifies e2e AC by "navigate"', () => {
    expect(classifyAC('When user navigates to /login page')).toBe('e2e')
  })

  it('classifies unit AC by "returns"', () => {
    expect(classifyAC('function returns correct value')).toBe('unit')
  })

  it('classifies unit AC by "throws"', () => {
    expect(classifyAC('createUser throws ValidationError for invalid input')).toBe('unit')
  })

  it('classifies integration AC by "API"', () => {
    expect(classifyAC('When API endpoint is called with valid token')).toBe('integration')
  })

  it('classifies manual AC by "looks like"', () => {
    expect(classifyAC('Page looks like the design mockup')).toBe('manual')
  })

  it('classifies manual AC by "color"', () => {
    expect(classifyAC('Button color matches brand guidelines')).toBe('manual')
  })

  it('defaults to unit for unclassified AC', () => {
    expect(classifyAC('Something unspecified')).toBe('unit')
  })
})

// ============================================================================
// extractTestableAssertion tests
// ============================================================================

describe('extractTestableAssertion', () => {
  it('passes through "when...then" assertions', () => {
    const text = 'When user logs in, then dashboard is shown'
    expect(extractTestableAssertion(text)).toBe(text)
  })

  it('transforms "X should Y" pattern', () => {
    const result = extractTestableAssertion('Login form should validate email')
    expect(result).toContain('should validate')
  })

  it('returns original text as fallback', () => {
    const text = 'Some unstructured AC text'
    expect(extractTestableAssertion(text)).toBe(text)
  })
})

// ============================================================================
// extractTestHints tests
// ============================================================================

describe('extractTestHints', () => {
  it('extracts camelCase function names', () => {
    const hints = extractTestHints('calls createUserProfile with valid data')
    expect(hints).toContain('createUserProfile')
  })

  it('returns empty array for simple text', () => {
    const hints = extractTestHints('A B C')
    expect(hints).toEqual([])
  })

  it('limits to 5 hints', () => {
    const hints = extractTestHints('callOne callTwo callThree callFour callFive callSix callSeven')
    expect(hints.length).toBeLessThanOrEqual(5)
  })
})

// ============================================================================
// createAcParserNode tests
// ============================================================================

describe('createAcParserNode', () => {
  it('returns empty parsedACs when no KB adapter', async () => {
    const node = createAcParserNode()
    const result = await node(makeState())
    expect(result.parsedACs).toEqual([])
  })

  it('calls kbAdapter with storyId', async () => {
    const kbAdapter = vi.fn().mockResolvedValue({ acceptanceCriteria: [] })
    const node = createAcParserNode({ kbAdapter })
    await node(makeState())
    expect(kbAdapter).toHaveBeenCalledWith('WINT-1234')
  })

  it('parses ACs from KB response', async () => {
    const kbAdapter = vi.fn().mockResolvedValue({
      acceptanceCriteria: ['When user clicks Login, then dashboard appears', 'function returns 200'],
    })
    const node = createAcParserNode({ kbAdapter })
    const result = await node(makeState())
    expect(result.parsedACs).toHaveLength(2)
  })

  it('classifies ACs by type', async () => {
    const kbAdapter = vi.fn().mockResolvedValue({
      acceptanceCriteria: ['When user clicks button', 'function returns value'],
    })
    const node = createAcParserNode({ kbAdapter })
    const result = await node(makeState())
    const types = (result.parsedACs as Array<{ testType: string }>).map(a => a.testType)
    expect(types).toContain('e2e')
    expect(types).toContain('unit')
  })

  it('sets phase to test_strategy_agent', async () => {
    const node = createAcParserNode()
    const result = await node(makeState())
    expect(result.qaVerifyV2Phase).toBe('test_strategy_agent')
  })

  it('degrades gracefully when KB adapter throws', async () => {
    const kbAdapter = vi.fn().mockRejectedValue(new Error('KB offline'))
    const node = createAcParserNode({ kbAdapter })
    const result = await node(makeState())
    expect(result.parsedACs).toEqual([])
  })

  it('includes original AC text', async () => {
    const kbAdapter = vi.fn().mockResolvedValue({
      acceptanceCriteria: ['User should see success message'],
    })
    const node = createAcParserNode({ kbAdapter })
    const result = await node(makeState())
    const parsedACs = result.parsedACs as Array<{ original: string }>
    expect(parsedACs[0].original).toBe('User should see success message')
  })
})
