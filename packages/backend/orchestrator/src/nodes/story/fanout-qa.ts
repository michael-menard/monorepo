/**
 * Story Fanout QA Node
 *
 * Generates QA/testing perspective gap analysis for a story structure.
 * Analyzes testability concerns, edge cases, AC clarity, and coverage gaps
 * to surface quality assurance considerations during story creation.
 *
 * FLOW-026: LangGraph Story Node - Fanout QA
 */

import { z } from 'zod'
import { createToolNode } from '../../runner/node-factory.js'
import type { GraphState } from '../../state/index.js'
import { updateState } from '../../runner/state-helpers.js'
import type { BaselineReality } from '../reality/index.js'
import type { GraphStateWithStorySeed, StoryStructure, AcceptanceCriterion } from './seed.js'

/**
 * Schema for a testability gap - issues that make the story hard to test.
 */
export const TestabilityGapSchema = z.object({
  /** Unique ID for the gap */
  id: z.string().min(1),
  /** Related AC ID, if applicable */
  relatedAcId: z.string().optional(),
  /** Description of the testability concern */
  description: z.string().min(1),
  /** Severity of the gap (high, medium, low) */
  severity: z.enum(['high', 'medium', 'low']),
  /** Suggestion for addressing the gap */
  suggestion: z.string().min(1),
  /** Category of testability issue */
  category: z.enum([
    'observable', // Behavior not easily observable/verifiable
    'deterministic', // Non-deterministic behavior
    'isolation', // Hard to test in isolation
    'environment', // Environment dependencies
    'data', // Test data requirements unclear
    'timing', // Timing/async concerns
    'external', // External system dependencies
  ]),
})

export type TestabilityGap = z.infer<typeof TestabilityGapSchema>

/**
 * Schema for an edge case gap - scenarios not covered by ACs.
 */
export const EdgeCaseGapSchema = z.object({
  /** Unique ID for the gap */
  id: z.string().min(1),
  /** Related AC ID, if applicable */
  relatedAcId: z.string().optional(),
  /** Description of the edge case */
  description: z.string().min(1),
  /** Severity/impact if not handled (high, medium, low) */
  severity: z.enum(['high', 'medium', 'low']),
  /** Type of edge case */
  category: z.enum([
    'boundary', // Boundary value cases
    'null_empty', // Null/empty/undefined inputs
    'error', // Error conditions
    'concurrent', // Concurrent access/race conditions
    'performance', // Performance edge cases (large data, slow network)
    'security', // Security-related edge cases
    'integration', // Integration failure scenarios
    'user_behavior', // Unexpected user behaviors
  ]),
  /** Example scenario illustrating the edge case */
  example: z.string().optional(),
})

export type EdgeCaseGap = z.infer<typeof EdgeCaseGapSchema>

/**
 * Schema for an AC clarity gap - issues with acceptance criteria clarity/measurability.
 */
export const AcClarityGapSchema = z.object({
  /** Unique ID for the gap */
  id: z.string().min(1),
  /** The AC ID being analyzed */
  acId: z.string().min(1),
  /** Description of the clarity issue */
  description: z.string().min(1),
  /** Type of clarity issue */
  category: z.enum([
    'vague', // Subjective or vague language
    'unmeasurable', // No measurable success criteria
    'incomplete', // Missing expected behavior details
    'ambiguous', // Multiple interpretations possible
    'missing_context', // Missing prerequisite context
    'untestable', // Cannot be verified through testing
  ]),
  /** Original AC text for reference */
  originalText: z.string().min(1),
  /** Suggested improvement */
  suggestedRewrite: z.string().optional(),
})

export type AcClarityGap = z.infer<typeof AcClarityGapSchema>

/**
 * Schema for a coverage gap - areas of testing not addressed.
 */
export const CoverageGapSchema = z.object({
  /** Unique ID for the gap */
  id: z.string().min(1),
  /** Description of what coverage is missing */
  description: z.string().min(1),
  /** Type of coverage gap */
  category: z.enum([
    'unit', // Unit test coverage needed
    'integration', // Integration test coverage needed
    'e2e', // End-to-end test coverage needed
    'performance', // Performance test coverage needed
    'accessibility', // Accessibility test coverage needed
    'security', // Security test coverage needed
    'regression', // Regression test coverage needed
    'visual', // Visual/snapshot test coverage needed
  ]),
  /** Priority for addressing (high, medium, low) */
  priority: z.enum(['high', 'medium', 'low']),
  /** Suggested test approach */
  testApproach: z.string().optional(),
})

export type CoverageGap = z.infer<typeof CoverageGapSchema>

/**
 * Schema for the QA gap analysis result.
 */
export const QAGapAnalysisSchema = z.object({
  /** Story ID being analyzed */
  storyId: z.string().min(1),
  /** Timestamp of analysis */
  analyzedAt: z.string().datetime(),
  /** Testability gaps found */
  testabilityGaps: z.array(TestabilityGapSchema).default([]),
  /** Edge case gaps found */
  edgeCaseGaps: z.array(EdgeCaseGapSchema).default([]),
  /** AC clarity gaps found */
  acClarityGaps: z.array(AcClarityGapSchema).default([]),
  /** Coverage gaps found */
  coverageGaps: z.array(CoverageGapSchema).default([]),
  /** Overall testability score (0-100) */
  testabilityScore: z.number().int().min(0).max(100),
  /** Summary of QA perspective analysis */
  summary: z.string().min(1),
  /** Key risks from QA perspective */
  keyRisks: z.array(z.string()).default([]),
  /** Recommendations for improving testability */
  recommendations: z.array(z.string()).default([]),
})

export type QAGapAnalysis = z.infer<typeof QAGapAnalysisSchema>

/**
 * Schema for fanout QA configuration.
 */
export const FanoutQAConfigSchema = z.object({
  /** Maximum testability gaps to report */
  maxTestabilityGaps: z.number().int().positive().default(10),
  /** Maximum edge case gaps to report */
  maxEdgeCaseGaps: z.number().int().positive().default(15),
  /** Maximum AC clarity gaps to report */
  maxAcClarityGaps: z.number().int().positive().default(10),
  /** Maximum coverage gaps to report */
  maxCoverageGaps: z.number().int().positive().default(10),
  /** Minimum severity to report for testability gaps */
  minTestabilitySeverity: z.enum(['high', 'medium', 'low']).default('low'),
  /** Include edge case examples in output */
  includeExamples: z.boolean().default(true),
  /** Include suggested AC rewrites */
  includeRewrites: z.boolean().default(true),
})

export type FanoutQAConfig = z.infer<typeof FanoutQAConfigSchema>

/**
 * Schema for fanout QA result.
 */
export const FanoutQAResultSchema = z.object({
  /** The QA gap analysis */
  qaGapAnalysis: QAGapAnalysisSchema.nullable(),
  /** Whether analysis was successful */
  analyzed: z.boolean(),
  /** Error message if analysis failed */
  error: z.string().optional(),
  /** Warnings encountered during analysis */
  warnings: z.array(z.string()).default([]),
})

export type FanoutQAResult = z.infer<typeof FanoutQAResultSchema>

/**
 * Vague/subjective terms that indicate clarity issues in ACs.
 */
const VAGUE_TERMS = [
  'should work',
  'properly',
  'correctly',
  'appropriate',
  'reasonable',
  'good',
  'nice',
  'fast',
  'slow',
  'easy',
  'simple',
  'user-friendly',
  'intuitive',
  'performant',
  'efficient',
  'optimal',
  'better',
  'improved',
  'enhanced',
  'quickly',
  'smoothly',
]

/**
 * Analyzes an acceptance criterion for clarity and measurability.
 *
 * @param ac - The acceptance criterion to analyze
 * @param index - Index for generating gap IDs
 * @returns AC clarity gap if issues found, null otherwise
 */
export function analyzeAcClarity(ac: AcceptanceCriterion, index: number): AcClarityGap | null {
  const description = ac.description.toLowerCase()

  // Check for vague terms
  for (const term of VAGUE_TERMS) {
    if (description.includes(term)) {
      return {
        id: `AC-CLARITY-${index + 1}`,
        acId: ac.id,
        description: `AC uses vague term "${term}" which is subjective and hard to verify`,
        category: 'vague',
        originalText: ac.description,
        suggestedRewrite: `Consider replacing "${term}" with specific, measurable criteria`,
      }
    }
  }

  // Check for missing measurable criteria
  const hasNumbers = /\d/.test(description)
  const hasSpecificVerb =
    /(displays?|shows?|returns?|creates?|deletes?|updates?|sends?|receives?)/i.test(description)

  if (!hasNumbers && !hasSpecificVerb && description.length < 50) {
    return {
      id: `AC-CLARITY-${index + 1}`,
      acId: ac.id,
      description: 'AC lacks specific, measurable success criteria',
      category: 'unmeasurable',
      originalText: ac.description,
      suggestedRewrite: 'Add specific expected outcomes, values, or behaviors that can be verified',
    }
  }

  // Check for ambiguous language
  if (/(and\/or|optionally|may|might|could|possibly)/i.test(description)) {
    return {
      id: `AC-CLARITY-${index + 1}`,
      acId: ac.id,
      description: 'AC contains ambiguous language that allows multiple interpretations',
      category: 'ambiguous',
      originalText: ac.description,
      suggestedRewrite: 'Make the requirement explicit and deterministic',
    }
  }

  return null
}

/**
 * Identifies potential edge cases based on story domain and description.
 *
 * @param storyStructure - The story structure to analyze
 * @returns Array of potential edge case gaps
 */
export function identifyEdgeCases(storyStructure: StoryStructure): EdgeCaseGap[] {
  const gaps: EdgeCaseGap[] = []
  const description = storyStructure.description.toLowerCase()
  const domain = storyStructure.domain.toLowerCase()
  let gapIndex = 1

  // Check for common edge case categories based on keywords

  // Input validation edge cases
  if (/(input|form|field|data|user|submit)/i.test(description)) {
    gaps.push({
      id: `EDGE-${gapIndex++}`,
      description: 'Consider empty/null input handling',
      severity: 'high',
      category: 'null_empty',
      example: 'What happens when user submits empty form or null values?',
    })
  }

  // List/collection edge cases
  if (/(list|array|collection|items|multiple)/i.test(description)) {
    gaps.push({
      id: `EDGE-${gapIndex++}`,
      description: 'Consider boundary cases for collections',
      severity: 'medium',
      category: 'boundary',
      example: 'What happens with 0 items, 1 item, or very large collections?',
    })
  }

  // API/network edge cases
  if (/(api|request|fetch|network|server|endpoint)/i.test(description)) {
    gaps.push({
      id: `EDGE-${gapIndex++}`,
      description: 'Consider network failure scenarios',
      severity: 'high',
      category: 'error',
      example: 'What happens on timeout, 500 error, or network disconnection?',
    })
  }

  // Authentication/authorization edge cases
  if (/(auth|login|permission|role|access)/i.test(description)) {
    gaps.push({
      id: `EDGE-${gapIndex++}`,
      description: 'Consider session expiry and token refresh scenarios',
      severity: 'high',
      category: 'security',
      example: 'What happens when session expires mid-operation?',
    })
  }

  // Concurrent access edge cases
  if (/(update|edit|modify|save|concurrent)/i.test(description)) {
    gaps.push({
      id: `EDGE-${gapIndex++}`,
      description: 'Consider concurrent modification scenarios',
      severity: 'medium',
      category: 'concurrent',
      example: 'What happens when two users edit the same resource simultaneously?',
    })
  }

  // Performance edge cases
  if (/(load|display|render|process|large|many)/i.test(description)) {
    gaps.push({
      id: `EDGE-${gapIndex++}`,
      description: 'Consider performance with large data sets',
      severity: 'medium',
      category: 'performance',
      example: 'How does the feature perform with 10x expected data volume?',
    })
  }

  // Backend/orchestrator specific
  if (domain === 'orchestrator' || domain === 'backend') {
    gaps.push({
      id: `EDGE-${gapIndex++}`,
      description: 'Consider partial failure scenarios',
      severity: 'high',
      category: 'error',
      example: 'What happens if the process fails midway? Is state recoverable?',
    })
  }

  return gaps
}

/**
 * Identifies testability concerns for a story.
 *
 * @param storyStructure - The story structure to analyze
 * @param baseline - Optional baseline reality for context
 * @returns Array of testability gaps
 */
export function identifyTestabilityGaps(
  storyStructure: StoryStructure,
  baseline: BaselineReality | null | undefined,
): TestabilityGap[] {
  const gaps: TestabilityGap[] = []
  const description = storyStructure.description.toLowerCase()
  let gapIndex = 1

  // Check for external dependencies
  if (/(external|third.?party|api|service)/i.test(description)) {
    gaps.push({
      id: `TEST-${gapIndex++}`,
      description: 'External service dependencies may require mocking strategy',
      severity: 'medium',
      category: 'external',
      suggestion: 'Define mock/stub strategy for external services in test plan',
    })
  }

  // Check for async/timing concerns
  if (/(async|await|timeout|delay|interval|schedule)/i.test(description)) {
    gaps.push({
      id: `TEST-${gapIndex++}`,
      description: 'Asynchronous behavior may be difficult to test deterministically',
      severity: 'medium',
      category: 'timing',
      suggestion: 'Use fake timers or deterministic async patterns in tests',
    })
  }

  // Check for environment dependencies
  if (/(environment|config|env|secret|credential)/i.test(description)) {
    gaps.push({
      id: `TEST-${gapIndex++}`,
      description: 'Environment-specific behavior may be hard to test consistently',
      severity: 'medium',
      category: 'environment',
      suggestion: 'Use dependency injection or test-specific configuration',
    })
  }

  // Check for non-deterministic behavior
  if (/(random|uuid|timestamp|now|date)/i.test(description)) {
    gaps.push({
      id: `TEST-${gapIndex++}`,
      description: 'Non-deterministic values may cause flaky tests',
      severity: 'low',
      category: 'deterministic',
      suggestion: 'Use deterministic mocks for random/time-based values',
    })
  }

  // Check for UI/visual testing needs
  if (/(ui|visual|display|render|component)/i.test(description)) {
    gaps.push({
      id: `TEST-${gapIndex++}`,
      description: 'Visual behavior may require screenshot/snapshot testing',
      severity: 'low',
      category: 'observable',
      suggestion: 'Consider visual regression testing for UI components',
    })
  }

  // Check baseline for in-progress items that may affect testing
  baseline?.whatInProgress?.forEach(item => {
    if (item.toLowerCase().includes(storyStructure.domain.toLowerCase())) {
      gaps.push({
        id: `TEST-${gapIndex++}`,
        description: `In-progress work may affect test stability: ${item}`,
        severity: 'medium',
        category: 'isolation',
        suggestion: 'Coordinate testing strategy with in-progress work',
      })
    }
  })

  return gaps
}

/**
 * Identifies coverage gaps for a story.
 *
 * @param storyStructure - The story structure to analyze
 * @returns Array of coverage gaps
 */
export function identifyCoverageGaps(storyStructure: StoryStructure): CoverageGap[] {
  const gaps: CoverageGap[] = []
  const description = storyStructure.description.toLowerCase()
  const affectedFiles = storyStructure.affectedFiles.join(' ').toLowerCase()
  let gapIndex = 1

  // Check for unit test needs
  if (storyStructure.affectedFiles.some(f => /\.(ts|tsx|js|jsx)$/.test(f))) {
    gaps.push({
      id: `COV-${gapIndex++}`,
      description: 'New/modified code requires unit test coverage',
      category: 'unit',
      priority: 'high',
      testApproach: 'Write unit tests for new functions and classes with Vitest',
    })
  }

  // Check for integration test needs
  if (/(api|endpoint|route|handler|service)/i.test(description + affectedFiles)) {
    gaps.push({
      id: `COV-${gapIndex++}`,
      description: 'API/service changes require integration test coverage',
      category: 'integration',
      priority: 'high',
      testApproach: 'Write integration tests for API endpoints and service interactions',
    })
  }

  // Check for E2E test needs
  if (/(user|workflow|flow|journey|feature)/i.test(description)) {
    gaps.push({
      id: `COV-${gapIndex++}`,
      description: 'User-facing changes may require E2E test coverage',
      category: 'e2e',
      priority: 'medium',
      testApproach: 'Write Playwright tests for critical user journeys',
    })
  }

  // Check for accessibility test needs
  if (/(ui|component|form|button|input|modal|dialog)/i.test(description)) {
    gaps.push({
      id: `COV-${gapIndex++}`,
      description: 'UI changes should include accessibility testing',
      category: 'accessibility',
      priority: 'medium',
      testApproach: 'Use axe-core or similar for automated a11y checks',
    })
  }

  // Check for performance test needs
  if (/(performance|load|scale|large|many|batch)/i.test(description)) {
    gaps.push({
      id: `COV-${gapIndex++}`,
      description: 'Performance-sensitive changes need performance testing',
      category: 'performance',
      priority: 'medium',
      testApproach: 'Add performance benchmarks or load tests',
    })
  }

  // Check for security test needs
  if (/(auth|permission|credential|sensitive|secure)/i.test(description)) {
    gaps.push({
      id: `COV-${gapIndex++}`,
      description: 'Security-related changes require security testing',
      category: 'security',
      priority: 'high',
      testApproach: 'Include security-focused test cases for auth and data protection',
    })
  }

  return gaps
}

/**
 * Calculates overall testability score based on gaps.
 *
 * @param testabilityGaps - Testability gaps found
 * @param edgeCaseGaps - Edge case gaps found
 * @param acClarityGaps - AC clarity gaps found
 * @param coverageGaps - Coverage gaps found
 * @returns Score from 0-100
 */
export function calculateTestabilityScore(
  testabilityGaps: TestabilityGap[],
  edgeCaseGaps: EdgeCaseGap[],
  acClarityGaps: AcClarityGap[],
  coverageGaps: CoverageGap[],
): number {
  // Start with perfect score
  let score = 100

  // Deduct for testability gaps (weighted by severity)
  testabilityGaps.forEach(gap => {
    switch (gap.severity) {
      case 'high':
        score -= 8
        break
      case 'medium':
        score -= 5
        break
      case 'low':
        score -= 2
        break
    }
  })

  // Deduct for edge case gaps (weighted by severity)
  edgeCaseGaps.forEach(gap => {
    switch (gap.severity) {
      case 'high':
        score -= 6
        break
      case 'medium':
        score -= 3
        break
      case 'low':
        score -= 1
        break
    }
  })

  // Deduct for AC clarity gaps (flat rate - all are important)
  score -= acClarityGaps.length * 5

  // Deduct for coverage gaps (weighted by priority)
  coverageGaps.forEach(gap => {
    switch (gap.priority) {
      case 'high':
        score -= 4
        break
      case 'medium':
        score -= 2
        break
      case 'low':
        score -= 1
        break
    }
  })

  // Ensure score stays in valid range
  return Math.max(0, Math.min(100, score))
}

/**
 * Generates key risks from QA perspective based on gaps.
 *
 * @param testabilityGaps - Testability gaps found
 * @param edgeCaseGaps - Edge case gaps found
 * @param acClarityGaps - AC clarity gaps found
 * @returns Array of key risk statements
 */
export function generateKeyRisks(
  testabilityGaps: TestabilityGap[],
  edgeCaseGaps: EdgeCaseGap[],
  acClarityGaps: AcClarityGap[],
): string[] {
  const risks: string[] = []

  // High severity testability issues
  const highTestability = testabilityGaps.filter(g => g.severity === 'high')
  if (highTestability.length > 0) {
    risks.push(
      `${highTestability.length} high-severity testability concerns may block effective testing`,
    )
  }

  // High severity edge cases
  const highEdgeCases = edgeCaseGaps.filter(g => g.severity === 'high')
  if (highEdgeCases.length > 0) {
    risks.push(
      `${highEdgeCases.length} high-impact edge cases not addressed in acceptance criteria`,
    )
  }

  // AC clarity issues
  if (acClarityGaps.length > 0) {
    risks.push(
      `${acClarityGaps.length} acceptance criteria have clarity issues that may cause ambiguous test results`,
    )
  }

  // Specific category risks
  if (testabilityGaps.some(g => g.category === 'external')) {
    risks.push('External dependencies require mocking strategy to prevent flaky tests')
  }

  if (edgeCaseGaps.some(g => g.category === 'concurrent')) {
    risks.push('Concurrent access scenarios may cause race conditions if not handled')
  }

  if (edgeCaseGaps.some(g => g.category === 'security')) {
    risks.push('Security edge cases require explicit handling to prevent vulnerabilities')
  }

  return risks
}

/**
 * Generates recommendations based on QA analysis.
 *
 * @param qaGapAnalysis - The complete QA gap analysis
 * @returns Array of recommendations
 */
export function generateRecommendations(
  testabilityGaps: TestabilityGap[],
  acClarityGaps: AcClarityGap[],
  coverageGaps: CoverageGap[],
  testabilityScore: number,
): string[] {
  const recommendations: string[] = []

  // Score-based recommendations
  if (testabilityScore < 50) {
    recommendations.push(
      'CRITICAL: Address testability concerns before development to avoid major rework',
    )
  } else if (testabilityScore < 70) {
    recommendations.push('Review and address high-severity gaps before development begins')
  } else if (testabilityScore < 85) {
    recommendations.push('Consider addressing medium-severity gaps during development')
  }

  // AC clarity recommendations
  if (acClarityGaps.length > 0) {
    recommendations.push(
      'Rewrite vague or ambiguous acceptance criteria with specific, measurable outcomes',
    )
  }

  // Coverage recommendations
  const highPriorityCoverage = coverageGaps.filter(g => g.priority === 'high')
  if (highPriorityCoverage.length > 0) {
    const categories = [...new Set(highPriorityCoverage.map(g => g.category))]
    recommendations.push(`Ensure test plan includes: ${categories.join(', ')} testing`)
  }

  // Testability-specific recommendations
  if (testabilityGaps.some(g => g.category === 'timing')) {
    recommendations.push(
      'Document async testing strategy using fake timers or controlled async patterns',
    )
  }

  if (testabilityGaps.some(g => g.category === 'external')) {
    recommendations.push('Define mock/stub approach for external service dependencies')
  }

  return recommendations
}

/**
 * Generates a summary of the QA gap analysis.
 *
 * @param storyStructure - The story structure
 * @param testabilityScore - Calculated testability score
 * @param gapCounts - Counts of each gap type
 * @returns Summary string
 */
export function generateSummary(
  storyStructure: StoryStructure,
  testabilityScore: number,
  gapCounts: {
    testability: number
    edgeCase: number
    acClarity: number
    coverage: number
  },
): string {
  const totalGaps =
    gapCounts.testability + gapCounts.edgeCase + gapCounts.acClarity + gapCounts.coverage

  let scoreDescription: string
  if (testabilityScore >= 85) {
    scoreDescription = 'Good'
  } else if (testabilityScore >= 70) {
    scoreDescription = 'Acceptable with concerns'
  } else if (testabilityScore >= 50) {
    scoreDescription = 'Needs improvement'
  } else {
    scoreDescription = 'Critical issues'
  }

  return `QA Analysis for "${storyStructure.title}": Testability score ${testabilityScore}/100 (${scoreDescription}). Found ${totalGaps} total gaps: ${gapCounts.testability} testability, ${gapCounts.edgeCase} edge cases, ${gapCounts.acClarity} AC clarity, ${gapCounts.coverage} coverage.`
}

/**
 * Generates QA gap analysis for a story structure.
 *
 * @param storyStructure - The story structure to analyze
 * @param baseline - Optional baseline reality for context
 * @param config - Configuration options
 * @returns Fanout QA result with gap analysis
 */
export async function generateQAGapAnalysis(
  storyStructure: StoryStructure | null | undefined,
  baseline: BaselineReality | null | undefined,
  config: Partial<FanoutQAConfig> = {},
): Promise<FanoutQAResult> {
  const fullConfig = FanoutQAConfigSchema.parse(config)
  const warnings: string[] = []

  try {
    // Require story structure
    if (!storyStructure) {
      return {
        qaGapAnalysis: null,
        analyzed: false,
        error: 'No story structure provided for QA analysis',
        warnings,
      }
    }

    // Analyze AC clarity
    const acClarityGaps: AcClarityGap[] = []
    storyStructure.acceptanceCriteria.forEach((ac, index) => {
      const gap = analyzeAcClarity(ac, index)
      if (gap) {
        if (!fullConfig.includeRewrites) {
          delete gap.suggestedRewrite
        }
        acClarityGaps.push(gap)
      }
    })

    // Identify edge cases
    let edgeCaseGaps = identifyEdgeCases(storyStructure)
    if (!fullConfig.includeExamples) {
      edgeCaseGaps = edgeCaseGaps.map(gap => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { example: _example, ...rest } = gap
        return rest as EdgeCaseGap
      })
    }

    // Identify testability concerns
    let testabilityGaps = identifyTestabilityGaps(storyStructure, baseline)

    // Filter by severity if configured
    if (fullConfig.minTestabilitySeverity !== 'low') {
      const severityOrder = { high: 3, medium: 2, low: 1 }
      const minSeverity = severityOrder[fullConfig.minTestabilitySeverity]
      testabilityGaps = testabilityGaps.filter(g => severityOrder[g.severity] >= minSeverity)
    }

    // Identify coverage gaps
    const coverageGaps = identifyCoverageGaps(storyStructure)

    // Apply limits
    const limitedTestabilityGaps = testabilityGaps.slice(0, fullConfig.maxTestabilityGaps)
    const limitedEdgeCaseGaps = edgeCaseGaps.slice(0, fullConfig.maxEdgeCaseGaps)
    const limitedAcClarityGaps = acClarityGaps.slice(0, fullConfig.maxAcClarityGaps)
    const limitedCoverageGaps = coverageGaps.slice(0, fullConfig.maxCoverageGaps)

    // Add warnings for truncated results
    if (testabilityGaps.length > fullConfig.maxTestabilityGaps) {
      warnings.push(
        `Truncated testability gaps from ${testabilityGaps.length} to ${fullConfig.maxTestabilityGaps}`,
      )
    }
    if (edgeCaseGaps.length > fullConfig.maxEdgeCaseGaps) {
      warnings.push(
        `Truncated edge case gaps from ${edgeCaseGaps.length} to ${fullConfig.maxEdgeCaseGaps}`,
      )
    }
    if (acClarityGaps.length > fullConfig.maxAcClarityGaps) {
      warnings.push(
        `Truncated AC clarity gaps from ${acClarityGaps.length} to ${fullConfig.maxAcClarityGaps}`,
      )
    }
    if (coverageGaps.length > fullConfig.maxCoverageGaps) {
      warnings.push(
        `Truncated coverage gaps from ${coverageGaps.length} to ${fullConfig.maxCoverageGaps}`,
      )
    }

    if (!baseline) {
      warnings.push('No baseline reality available - some context-aware checks skipped')
    }

    // Calculate score and generate insights
    const testabilityScore = calculateTestabilityScore(
      limitedTestabilityGaps,
      limitedEdgeCaseGaps,
      limitedAcClarityGaps,
      limitedCoverageGaps,
    )

    const keyRisks = generateKeyRisks(
      limitedTestabilityGaps,
      limitedEdgeCaseGaps,
      limitedAcClarityGaps,
    )

    const recommendations = generateRecommendations(
      limitedTestabilityGaps,
      limitedAcClarityGaps,
      limitedCoverageGaps,
      testabilityScore,
    )

    const summary = generateSummary(storyStructure, testabilityScore, {
      testability: limitedTestabilityGaps.length,
      edgeCase: limitedEdgeCaseGaps.length,
      acClarity: limitedAcClarityGaps.length,
      coverage: limitedCoverageGaps.length,
    })

    // Build result
    const qaGapAnalysis: QAGapAnalysis = {
      storyId: storyStructure.storyId,
      analyzedAt: new Date().toISOString(),
      testabilityGaps: limitedTestabilityGaps,
      edgeCaseGaps: limitedEdgeCaseGaps,
      acClarityGaps: limitedAcClarityGaps,
      coverageGaps: limitedCoverageGaps,
      testabilityScore,
      summary,
      keyRisks,
      recommendations,
    }

    // Validate against schema
    const validated = QAGapAnalysisSchema.parse(qaGapAnalysis)

    return {
      qaGapAnalysis: validated,
      analyzed: true,
      warnings,
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during QA analysis'
    return {
      qaGapAnalysis: null,
      analyzed: false,
      error: errorMessage,
      warnings,
    }
  }
}

/**
 * Extended graph state with QA gap analysis.
 * Used by downstream nodes that consume the QA perspective.
 */
export interface GraphStateWithQAGaps extends GraphStateWithStorySeed {
  /** QA gap analysis result */
  qaGapAnalysis?: QAGapAnalysis | null
  /** Whether QA analysis was successful */
  qaAnalyzed?: boolean
  /** Warnings from QA analysis */
  qaWarnings?: string[]
}

/**
 * Story Fanout QA node implementation.
 *
 * Generates QA/testing perspective gap analysis based on story structure
 * and baseline reality. Uses the tool preset (lower retries, shorter timeout)
 * since this is primarily computation with no external calls.
 *
 * @param state - Current graph state (must have storyStructure from seed node)
 * @returns Partial state update with QA gap analysis
 */
export const storyFanoutQANode = createToolNode(
  'story_fanout_qa',
  async (state: GraphState): Promise<Partial<GraphStateWithQAGaps>> => {
    const stateWithStory = state as GraphStateWithQAGaps

    // Require story structure from seed node
    if (!stateWithStory.storyStructure) {
      return updateState({
        qaGapAnalysis: null,
        qaAnalyzed: false,
        qaWarnings: ['No story structure available - run seed node first'],
      } as Partial<GraphStateWithQAGaps>)
    }

    const result = await generateQAGapAnalysis(
      stateWithStory.storyStructure,
      stateWithStory.baselineReality,
    )

    if (!result.analyzed) {
      return updateState({
        qaGapAnalysis: null,
        qaAnalyzed: false,
        qaWarnings: result.warnings,
      } as Partial<GraphStateWithQAGaps>)
    }

    return updateState({
      qaGapAnalysis: result.qaGapAnalysis,
      qaAnalyzed: true,
      qaWarnings: result.warnings,
    } as Partial<GraphStateWithQAGaps>)
  },
)

/**
 * Creates a fanout QA node with custom configuration.
 *
 * @param config - Configuration options
 * @returns Configured node function
 */
export function createFanoutQANode(config: Partial<FanoutQAConfig> = {}) {
  return createToolNode(
    'story_fanout_qa',
    async (state: GraphState): Promise<Partial<GraphStateWithQAGaps>> => {
      const stateWithStory = state as GraphStateWithQAGaps

      // Require story structure
      if (!stateWithStory.storyStructure) {
        throw new Error('Story structure is required for QA analysis')
      }

      const result = await generateQAGapAnalysis(
        stateWithStory.storyStructure,
        stateWithStory.baselineReality,
        config,
      )

      if (!result.analyzed) {
        if (result.error) {
          throw new Error(result.error)
        }

        return updateState({
          qaGapAnalysis: null,
          qaAnalyzed: false,
          qaWarnings: result.warnings,
        } as Partial<GraphStateWithQAGaps>)
      }

      return updateState({
        qaGapAnalysis: result.qaGapAnalysis,
        qaAnalyzed: true,
        qaWarnings: result.warnings,
      } as Partial<GraphStateWithQAGaps>)
    },
  )
}
