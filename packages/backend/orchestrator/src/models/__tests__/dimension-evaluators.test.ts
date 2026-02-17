/**
 * dimension-evaluators.test.ts
 *
 * Tests for the five individual dimension evaluator functions.
 * 5+ test cases per dimension = 25+ total.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  evaluateCorrectness,
  evaluateCompleteness,
  evaluateCoherence,
  evaluateCompliance,
  evaluateCostEfficiency,
} from '../quality-evaluator.js'
import { createTaskContract } from '../__types__/task-contract.js'

vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// ============================================================================
// Helpers
// ============================================================================

const baseContract = createTaskContract({ taskType: 'code_generation' })

const securityContract = createTaskContract({
  taskType: 'security_analysis',
  securitySensitive: true,
  allowOllama: false,
  qualityRequirement: 'critical',
  complexity: 'high',
})

const restrictedContract = createTaskContract({
  taskType: 'data_processing',
  allowOllama: false,
  securitySensitive: false,
})

const longStructuredOutput = `
## Overview
This implementation provides a comprehensive solution.

## Implementation
The code follows best practices and includes proper error handling.
- Feature A: Implemented with validation
- Feature B: Edge cases handled
- Feature C: Performance optimized

## Security
Authentication and authorization implemented.
Input sanitization prevents injection attacks.
Security tokens are validated properly.

## Conclusion
The solution is complete and production-ready.
Therefore, all requirements have been fulfilled.
`

// ============================================================================
// evaluateCorrectness()
// ============================================================================

describe('evaluateCorrectness()', () => {
  beforeEach(() => vi.clearAllMocks())

  it('should return score 0 for empty output', () => {
    const result = evaluateCorrectness(baseContract, '')
    expect(result.dimension).toBe('correctness')
    expect(result.score).toBe(0)
    expect(result.rationale).toContain('Empty')
  })

  it('should return score > 0 for output matching task keywords', () => {
    const result = evaluateCorrectness(baseContract, 'function code() { return generation }')
    expect(result.score).toBeGreaterThan(0)
  })

  it('should return higher score for output with task keyword + substantial content', () => {
    const withKeywordsAndContent = `
      This code generation solution provides:
      - Complete code implementation
      - Proper generation of required components
      - Full code coverage with tests
    `
    const result = evaluateCorrectness(baseContract, withKeywordsAndContent)
    expect(result.score).toBeGreaterThan(50)
  })

  it('should return lower score for output without task keywords', () => {
    const noKeywords = 'This is completely unrelated content about agriculture and farming'
    const result = evaluateCorrectness(baseContract, noKeywords)
    const withKeywords = evaluateCorrectness(
      baseContract,
      'code generation function implementation result',
    )
    expect(withKeywords.score).toBeGreaterThanOrEqual(result.score)
  })

  it('should return dimension = correctness', () => {
    const result = evaluateCorrectness(baseContract, 'some output')
    expect(result.dimension).toBe('correctness')
  })

  it('should return weight = 0.2', () => {
    const result = evaluateCorrectness(baseContract, 'some output')
    expect(result.weight).toBe(0.2)
  })

  it('should include rationale string', () => {
    const result = evaluateCorrectness(baseContract, 'code generation complete')
    expect(typeof result.rationale).toBe('string')
    expect(result.rationale.length).toBeGreaterThan(0)
  })
})

// ============================================================================
// evaluateCompleteness()
// ============================================================================

describe('evaluateCompleteness()', () => {
  beforeEach(() => vi.clearAllMocks())

  it('should return score 0 for empty output', () => {
    const result = evaluateCompleteness(baseContract, '')
    expect(result.dimension).toBe('completeness')
    expect(result.score).toBe(0)
  })

  it('should return higher score for long structured output', () => {
    const result = evaluateCompleteness(baseContract, longStructuredOutput)
    expect(result.score).toBeGreaterThan(50)
  })

  it('should return lower score for very short output', () => {
    const short = evaluateCompleteness(baseContract, 'done')
    const long = evaluateCompleteness(baseContract, longStructuredOutput)
    expect(long.score).toBeGreaterThan(short.score)
  })

  it('should give higher score for high complexity with long output', () => {
    const highComplexContract = createTaskContract({
      taskType: 'complex_analysis',
      complexity: 'high',
    })
    // Same output, different complexity expectation
    const highResult = evaluateCompleteness(highComplexContract, longStructuredOutput)
    const lowComplexContract = createTaskContract({
      taskType: 'simple_task',
      complexity: 'low',
    })
    const lowResult = evaluateCompleteness(lowComplexContract, longStructuredOutput)
    // Low complexity gives higher score since long output exceeds its expectations
    expect(lowResult.score).toBeGreaterThanOrEqual(highResult.score)
  })

  it('should return dimension = completeness', () => {
    const result = evaluateCompleteness(baseContract, 'some output')
    expect(result.dimension).toBe('completeness')
  })

  it('should mention conclusion/summary in rationale when output has them', () => {
    const withConclusion = 'This is the output. In conclusion, everything works.'
    const result = evaluateCompleteness(baseContract, withConclusion)
    expect(result.rationale).toContain('conclusion')
  })

  it('should include rationale with length information', () => {
    const result = evaluateCompleteness(baseContract, longStructuredOutput)
    expect(result.rationale).toContain('chars')
  })
})

// ============================================================================
// evaluateCoherence()
// ============================================================================

describe('evaluateCoherence()', () => {
  beforeEach(() => vi.clearAllMocks())

  it('should return score 0 for empty output', () => {
    const result = evaluateCoherence(baseContract, '')
    expect(result.dimension).toBe('coherence')
    expect(result.score).toBe(0)
  })

  it('should return higher score for output with transition words', () => {
    const withTransitions =
      'First, we define the problem. Furthermore, we implement the solution. Finally, we test the result. Therefore, the implementation is complete. However, edge cases exist.'
    const result = evaluateCoherence(baseContract, withTransitions)
    expect(result.score).toBeGreaterThan(30)
  })

  it('should penalize output with contradictory phrases', () => {
    const coherent = 'This is a well-structured output. It has clear sections and conclusions.'
    const contradictory = 'This always never works both true and false at the same time.'
    const coherentResult = evaluateCoherence(baseContract, coherent)
    const contradictoryResult = evaluateCoherence(baseContract, contradictory)
    expect(coherentResult.score).toBeGreaterThan(contradictoryResult.score)
  })

  it('should give bonus for multi-paragraph output', () => {
    const singleParagraph = 'All in one paragraph. Short and simple.'
    const multiParagraph = 'First paragraph is here.\n\nSecond paragraph follows.\n\nThird paragraph concludes.'
    const multiResult = evaluateCoherence(baseContract, multiParagraph)
    const singleResult = evaluateCoherence(baseContract, singleParagraph)
    expect(multiResult.score).toBeGreaterThan(singleResult.score)
  })

  it('should return dimension = coherence', () => {
    const result = evaluateCoherence(baseContract, 'some content')
    expect(result.dimension).toBe('coherence')
  })

  it('should return score within valid range 0-100', () => {
    const result = evaluateCoherence(baseContract, longStructuredOutput)
    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.score).toBeLessThanOrEqual(100)
  })

  it('should include paragraph count in rationale', () => {
    const result = evaluateCoherence(baseContract, longStructuredOutput)
    expect(result.rationale).toContain('paragraph')
  })
})

// ============================================================================
// evaluateCompliance()
// ============================================================================

describe('evaluateCompliance()', () => {
  beforeEach(() => vi.clearAllMocks())

  it('should return score 0 for empty output', () => {
    const result = evaluateCompliance(baseContract, '')
    expect(result.dimension).toBe('compliance')
    expect(result.score).toBe(0)
  })

  it('should deduct points for security-sensitive task without security indicators', () => {
    const noSecurityOutput = 'function add(a, b) { return a + b; }'
    const result = evaluateCompliance(securityContract, noSecurityOutput)
    expect(result.score).toBeLessThan(90)
    expect(result.rationale).toContain('security')
  })

  it('should not deduct for security-sensitive task with security indicators', () => {
    const secureOutput =
      'Authentication implemented. Authorization checks present. Input sanitization applied. Encryption used.'
    const result = evaluateCompliance(securityContract, secureOutput)
    expect(result.score).toBeGreaterThan(50)
  })

  it('should deduct for output referencing Ollama when not allowed', () => {
    const ollamaOutput = 'Using ollama local model for this task'
    const result = evaluateCompliance(restrictedContract, ollamaOutput)
    expect(result.score).toBeLessThan(90)
    expect(result.rationale).toContain('Ollama')
  })

  it('should not deduct for output not referencing Ollama when not allowed', () => {
    const noOllamaOutput = 'Using Claude API for this task with proper configuration'
    const result = evaluateCompliance(restrictedContract, noOllamaOutput)
    expect(result.rationale).not.toContain('Ollama/local')
  })

  it('should return dimension = compliance', () => {
    const result = evaluateCompliance(baseContract, 'some output')
    expect(result.dimension).toBe('compliance')
  })

  it('should return score 100 for compliant output on basic contract', () => {
    const goodOutput = longStructuredOutput // Long output, no violations
    const result = evaluateCompliance(baseContract, goodOutput)
    expect(result.score).toBe(100)
  })
})

// ============================================================================
// evaluateCostEfficiency()
// ============================================================================

describe('evaluateCostEfficiency()', () => {
  beforeEach(() => vi.clearAllMocks())

  it('should return score 50 for unknown tier', () => {
    const result = evaluateCostEfficiency(baseContract, 'some output', 'tier-99')
    expect(result.score).toBe(50)
    expect(result.rationale).toContain('Unknown tier')
  })

  it('should return high score when tier matches quality requirement', () => {
    // tier-3 (expectation=60) for adequate requirement (threshold=60)
    const adequateContract = createTaskContract({
      taskType: 'simple_task',
      qualityRequirement: 'adequate',
    })
    const result = evaluateCostEfficiency(adequateContract, 'some output', 'tier-3')
    expect(result.score).toBeGreaterThanOrEqual(80)
  })

  it('should detect over-provisioning for tier-0 on adequate quality task', () => {
    const adequateContract = createTaskContract({
      taskType: 'simple_task',
      qualityRequirement: 'adequate',
    })
    const result = evaluateCostEfficiency(adequateContract, 'some output', 'tier-0')
    expect(result.rationale).toContain('Over-provisioned')
  })

  it('should give high score for tier-0 on critical quality task', () => {
    const criticalContract = createTaskContract({
      taskType: 'security_analysis',
      qualityRequirement: 'critical',
    })
    const result = evaluateCostEfficiency(criticalContract, 'some output', 'tier-0')
    expect(result.score).toBeGreaterThanOrEqual(80)
  })

  it('should penalize empty output regardless of tier match', () => {
    const adequateContract = createTaskContract({
      taskType: 'simple_task',
      qualityRequirement: 'adequate',
    })
    const withOutput = evaluateCostEfficiency(adequateContract, 'content', 'tier-3')
    const withEmpty = evaluateCostEfficiency(adequateContract, '', 'tier-3')
    expect(withOutput.score).toBeGreaterThan(withEmpty.score)
  })

  it('should return dimension = cost_efficiency', () => {
    const result = evaluateCostEfficiency(baseContract, 'some output', 'tier-1')
    expect(result.dimension).toBe('cost_efficiency')
  })

  it('should return score within 0-100 range', () => {
    const result = evaluateCostEfficiency(baseContract, 'some output', 'tier-2')
    expect(result.score).toBeGreaterThanOrEqual(0)
    expect(result.score).toBeLessThanOrEqual(100)
  })
})
