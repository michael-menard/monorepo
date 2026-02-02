import { describe, expect, it, vi } from 'vitest'
import type { BaselineReality } from '../../reality/index.js'
import type { StoryStructure, AcceptanceCriterion } from '../seed.js'
import {
  analyzeAcClarity,
  identifyEdgeCases,
  identifyTestabilityGaps,
  identifyCoverageGaps,
  calculateTestabilityScore,
  generateKeyRisks,
  generateRecommendations,
  generateSummary,
  generateQAGapAnalysis,
  TestabilityGapSchema,
  EdgeCaseGapSchema,
  AcClarityGapSchema,
  CoverageGapSchema,
  QAGapAnalysisSchema,
  FanoutQAConfigSchema,
  FanoutQAResultSchema,
  type TestabilityGap,
  type EdgeCaseGap,
  type CoverageGap,
} from '../fanout-qa.js'

// Mock @repo/logger
vi.mock('@repo/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}))

// Test fixtures
const createTestStoryStructure = (overrides: Partial<StoryStructure> = {}): StoryStructure => ({
  storyId: 'flow-026',
  title: 'Add QA gap analysis node',
  description: 'Create a node that analyzes stories from QA perspective',
  domain: 'orchestrator',
  acceptanceCriteria: [
    {
      id: 'AC-1',
      description: 'Implement testability gap detection',
      fromBaseline: false,
    },
    {
      id: 'AC-2',
      description: 'Changes are scoped to the orchestrator domain',
      fromBaseline: false,
    },
  ],
  constraints: [],
  affectedFiles: ['src/nodes/story/fanout-qa.ts'],
  dependencies: [],
  estimatedComplexity: 'medium',
  tags: ['langgraph', 'node'],
  ...overrides,
})

const createTestBaseline = (overrides: Partial<BaselineReality> = {}): BaselineReality => ({
  date: '2025-01-20',
  filePath: '/test/baseline.md',
  rawContent: '',
  sections: [],
  ...overrides,
})

describe('analyzeAcClarity', () => {
  it('detects vague terms in acceptance criteria', () => {
    const ac: AcceptanceCriterion = {
      id: 'AC-1',
      description: 'The feature should work properly',
      fromBaseline: false,
    }

    const gap = analyzeAcClarity(ac, 0)

    expect(gap).not.toBeNull()
    expect(gap?.category).toBe('vague')
    expect(gap?.acId).toBe('AC-1')
    // The function detects the first vague term found, which is "should work"
    expect(gap?.description).toContain('should work')
  })

  it('detects unmeasurable criteria', () => {
    const ac: AcceptanceCriterion = {
      id: 'AC-2',
      description: 'Fast response time',
      fromBaseline: false,
    }

    const gap = analyzeAcClarity(ac, 1)

    expect(gap).not.toBeNull()
    expect(gap?.category).toBe('vague')
  })

  it('detects ambiguous language', () => {
    const ac: AcceptanceCriterion = {
      id: 'AC-3',
      description: 'The user may optionally provide and/or configure settings',
      fromBaseline: false,
    }

    const gap = analyzeAcClarity(ac, 2)

    expect(gap).not.toBeNull()
    expect(gap?.category).toBe('ambiguous')
  })

  it('returns null for clear, measurable criteria', () => {
    const ac: AcceptanceCriterion = {
      id: 'AC-4',
      description: 'The API returns a 200 status code with JSON body containing user ID',
      fromBaseline: false,
    }

    const gap = analyzeAcClarity(ac, 3)

    expect(gap).toBeNull()
  })
})

describe('identifyEdgeCases', () => {
  it('identifies input validation edge cases', () => {
    const story = createTestStoryStructure({
      description: 'Create user input form with validation',
    })

    const gaps = identifyEdgeCases(story)

    expect(gaps.some(g => g.category === 'null_empty')).toBe(true)
  })

  it('identifies collection boundary edge cases', () => {
    const story = createTestStoryStructure({
      description: 'Display list of items with pagination',
    })

    const gaps = identifyEdgeCases(story)

    expect(gaps.some(g => g.category === 'boundary')).toBe(true)
  })

  it('identifies network failure edge cases', () => {
    const story = createTestStoryStructure({
      description: 'Fetch data from API endpoint',
    })

    const gaps = identifyEdgeCases(story)

    expect(gaps.some(g => g.category === 'error')).toBe(true)
  })

  it('identifies authentication edge cases', () => {
    const story = createTestStoryStructure({
      description: 'Implement user authentication flow',
    })

    const gaps = identifyEdgeCases(story)

    expect(gaps.some(g => g.category === 'security')).toBe(true)
  })

  it('identifies concurrent access edge cases', () => {
    const story = createTestStoryStructure({
      description: 'Allow users to edit and save document',
    })

    const gaps = identifyEdgeCases(story)

    expect(gaps.some(g => g.category === 'concurrent')).toBe(true)
  })

  it('identifies orchestrator-specific edge cases', () => {
    const story = createTestStoryStructure({
      domain: 'orchestrator',
      description: 'Process workflow steps',
    })

    const gaps = identifyEdgeCases(story)

    expect(gaps.some(g => g.category === 'error')).toBe(true)
  })
})

describe('identifyTestabilityGaps', () => {
  it('identifies external dependency concerns', () => {
    const story = createTestStoryStructure({
      description: 'Integrate with external payment API',
    })

    const gaps = identifyTestabilityGaps(story, null)

    expect(gaps.some(g => g.category === 'external')).toBe(true)
  })

  it('identifies async timing concerns', () => {
    const story = createTestStoryStructure({
      description: 'Implement async data fetching with timeout handling',
    })

    const gaps = identifyTestabilityGaps(story, null)

    expect(gaps.some(g => g.category === 'timing')).toBe(true)
  })

  it('identifies environment dependency concerns', () => {
    const story = createTestStoryStructure({
      description: 'Read configuration from environment variables',
    })

    const gaps = identifyTestabilityGaps(story, null)

    expect(gaps.some(g => g.category === 'environment')).toBe(true)
  })

  it('identifies non-deterministic concerns', () => {
    const story = createTestStoryStructure({
      description: 'Generate random UUID for each request',
    })

    const gaps = identifyTestabilityGaps(story, null)

    expect(gaps.some(g => g.category === 'deterministic')).toBe(true)
  })

  it('includes baseline in-progress items affecting testing', () => {
    const story = createTestStoryStructure({
      domain: 'orchestrator',
    })
    const baseline = createTestBaseline({
      whatInProgress: ['orchestrator refactoring'],
    })

    const gaps = identifyTestabilityGaps(story, baseline)

    expect(gaps.some(g => g.category === 'isolation')).toBe(true)
  })
})

describe('identifyCoverageGaps', () => {
  it('identifies unit test needs for TypeScript files', () => {
    const story = createTestStoryStructure({
      affectedFiles: ['src/utils/helper.ts'],
    })

    const gaps = identifyCoverageGaps(story)

    expect(gaps.some(g => g.category === 'unit')).toBe(true)
  })

  it('identifies integration test needs for API changes', () => {
    const story = createTestStoryStructure({
      description: 'Add new API endpoint for user data',
    })

    const gaps = identifyCoverageGaps(story)

    expect(gaps.some(g => g.category === 'integration')).toBe(true)
  })

  it('identifies E2E test needs for user workflows', () => {
    const story = createTestStoryStructure({
      description: 'Implement user registration workflow',
    })

    const gaps = identifyCoverageGaps(story)

    expect(gaps.some(g => g.category === 'e2e')).toBe(true)
  })

  it('identifies accessibility test needs for UI', () => {
    const story = createTestStoryStructure({
      description: 'Add modal dialog component',
    })

    const gaps = identifyCoverageGaps(story)

    expect(gaps.some(g => g.category === 'accessibility')).toBe(true)
  })

  it('identifies security test needs', () => {
    const story = createTestStoryStructure({
      description: 'Implement credential storage',
    })

    const gaps = identifyCoverageGaps(story)

    expect(gaps.some(g => g.category === 'security')).toBe(true)
  })
})

describe('calculateTestabilityScore', () => {
  it('returns 100 for no gaps', () => {
    const score = calculateTestabilityScore([], [], [], [])
    expect(score).toBe(100)
  })

  it('deducts more for high severity testability gaps', () => {
    const highSeverityGaps: TestabilityGap[] = [
      {
        id: 'TEST-1',
        description: 'Critical testability issue',
        severity: 'high',
        category: 'external',
        suggestion: 'Mock external service',
      },
    ]

    const lowSeverityGaps: TestabilityGap[] = [
      {
        id: 'TEST-1',
        description: 'Minor testability issue',
        severity: 'low',
        category: 'deterministic',
        suggestion: 'Use deterministic values',
      },
    ]

    const highScore = calculateTestabilityScore(highSeverityGaps, [], [], [])
    const lowScore = calculateTestabilityScore(lowSeverityGaps, [], [], [])

    expect(highScore).toBeLessThan(lowScore)
  })

  it('deducts for edge case gaps', () => {
    const edgeCaseGaps: EdgeCaseGap[] = [
      {
        id: 'EDGE-1',
        description: 'Unhandled edge case',
        severity: 'high',
        category: 'error',
      },
    ]

    const score = calculateTestabilityScore([], edgeCaseGaps, [], [])
    expect(score).toBeLessThan(100)
  })

  it('deducts for AC clarity gaps', () => {
    const score = calculateTestabilityScore(
      [],
      [],
      [
        {
          id: 'AC-CLARITY-1',
          acId: 'AC-1',
          description: 'Vague criteria',
          category: 'vague',
          originalText: 'Should work properly',
        },
      ],
      [],
    )
    expect(score).toBe(95) // 100 - 5
  })

  it('deducts for coverage gaps based on priority', () => {
    const highPriorityCoverage: CoverageGap[] = [
      {
        id: 'COV-1',
        description: 'Missing unit tests',
        category: 'unit',
        priority: 'high',
      },
    ]

    const lowPriorityCoverage: CoverageGap[] = [
      {
        id: 'COV-1',
        description: 'Missing visual tests',
        category: 'visual',
        priority: 'low',
      },
    ]

    const highScore = calculateTestabilityScore([], [], [], highPriorityCoverage)
    const lowScore = calculateTestabilityScore([], [], [], lowPriorityCoverage)

    expect(highScore).toBeLessThan(lowScore)
  })

  it('clamps score to 0-100 range', () => {
    // Create many high severity gaps to potentially go below 0
    const manyGaps: TestabilityGap[] = Array.from({ length: 20 }, (_, i) => ({
      id: `TEST-${i}`,
      description: 'High severity issue',
      severity: 'high' as const,
      category: 'external' as const,
      suggestion: 'Fix it',
    }))

    const score = calculateTestabilityScore(manyGaps, [], [], [])
    expect(score).toBeGreaterThanOrEqual(0)
    expect(score).toBeLessThanOrEqual(100)
  })
})

describe('generateKeyRisks', () => {
  it('includes risk for high severity testability issues', () => {
    const testabilityGaps: TestabilityGap[] = [
      {
        id: 'TEST-1',
        description: 'External API',
        severity: 'high',
        category: 'external',
        suggestion: 'Mock',
      },
    ]

    const risks = generateKeyRisks(testabilityGaps, [], [])

    expect(risks.some(r => r.includes('high-severity testability'))).toBe(true)
  })

  it('includes risk for high impact edge cases', () => {
    const edgeCaseGaps: EdgeCaseGap[] = [
      {
        id: 'EDGE-1',
        description: 'Security edge case',
        severity: 'high',
        category: 'security',
      },
    ]

    const risks = generateKeyRisks([], edgeCaseGaps, [])

    expect(risks.some(r => r.includes('edge cases'))).toBe(true)
  })

  it('includes risk for AC clarity issues', () => {
    const risks = generateKeyRisks(
      [],
      [],
      [
        {
          id: 'AC-CLARITY-1',
          acId: 'AC-1',
          description: 'Vague',
          category: 'vague',
          originalText: 'Should work',
        },
      ],
    )

    expect(risks.some(r => r.includes('acceptance criteria'))).toBe(true)
  })

  it('includes specific risk for external dependencies', () => {
    const testabilityGaps: TestabilityGap[] = [
      {
        id: 'TEST-1',
        description: 'External service',
        severity: 'medium',
        category: 'external',
        suggestion: 'Mock it',
      },
    ]

    const risks = generateKeyRisks(testabilityGaps, [], [])

    expect(risks.some(r => r.includes('mocking strategy'))).toBe(true)
  })
})

describe('generateRecommendations', () => {
  it('recommends critical action for low scores', () => {
    const recommendations = generateRecommendations([], [], [], 40)

    expect(recommendations.some(r => r.includes('CRITICAL'))).toBe(true)
  })

  it('recommends reviewing high-severity gaps for moderate scores', () => {
    const recommendations = generateRecommendations([], [], [], 60)

    expect(recommendations.some(r => r.includes('high-severity'))).toBe(true)
  })

  it('recommends AC rewrites for clarity gaps', () => {
    const recommendations = generateRecommendations(
      [],
      [
        {
          id: 'AC-CLARITY-1',
          acId: 'AC-1',
          description: 'Vague',
          category: 'vague',
          originalText: 'Should work',
        },
      ],
      [],
      80,
    )

    expect(recommendations.some(r => r.includes('Rewrite'))).toBe(true)
  })

  it('recommends test plan for high priority coverage gaps', () => {
    const recommendations = generateRecommendations(
      [],
      [],
      [
        {
          id: 'COV-1',
          description: 'Missing unit tests',
          category: 'unit',
          priority: 'high',
        },
      ],
      80,
    )

    expect(recommendations.some(r => r.includes('test plan'))).toBe(true)
  })
})

describe('generateSummary', () => {
  it('generates summary with score description', () => {
    const story = createTestStoryStructure()

    const summary = generateSummary(story, 90, {
      testability: 1,
      edgeCase: 2,
      acClarity: 0,
      coverage: 1,
    })

    // Summary uses story title, not storyId
    expect(summary).toContain('Add QA gap analysis node')
    expect(summary).toContain('90/100')
    expect(summary).toContain('Good')
    expect(summary).toContain('4 total gaps')
  })

  it('indicates critical issues for low scores', () => {
    const story = createTestStoryStructure()

    const summary = generateSummary(story, 40, {
      testability: 5,
      edgeCase: 3,
      acClarity: 2,
      coverage: 3,
    })

    expect(summary).toContain('Critical issues')
  })
})

describe('generateQAGapAnalysis', () => {
  it('generates analysis from valid story structure', async () => {
    const story = createTestStoryStructure()

    const result = await generateQAGapAnalysis(story, null)

    expect(result.analyzed).toBe(true)
    expect(result.qaGapAnalysis).not.toBeNull()
    expect(result.qaGapAnalysis?.storyId).toBe('flow-026')
  })

  it('includes warning when baseline is missing', async () => {
    const story = createTestStoryStructure()

    const result = await generateQAGapAnalysis(story, null)

    expect(result.warnings).toContain('No baseline reality available - some context-aware checks skipped')
  })

  it('handles missing story structure', async () => {
    const result = await generateQAGapAnalysis(null, null)

    expect(result.analyzed).toBe(false)
    expect(result.error).toContain('No story structure')
  })

  it('respects config for min severity', async () => {
    const story = createTestStoryStructure({
      description: 'Async external API call with random UUID and environment config',
    })

    const allResult = await generateQAGapAnalysis(story, null, { minTestabilitySeverity: 'low' })
    const highOnlyResult = await generateQAGapAnalysis(story, null, { minTestabilitySeverity: 'high' })

    expect(allResult.qaGapAnalysis?.testabilityGaps.length).toBeGreaterThanOrEqual(
      highOnlyResult.qaGapAnalysis?.testabilityGaps.length || 0,
    )
  })

  it('respects config for include examples', async () => {
    const story = createTestStoryStructure({
      description: 'Process list of user inputs',
    })

    const withExamples = await generateQAGapAnalysis(story, null, { includeExamples: true })
    const withoutExamples = await generateQAGapAnalysis(story, null, { includeExamples: false })

    const hasExamplesInWith = withExamples.qaGapAnalysis?.edgeCaseGaps.some(g => g.example)
    const hasExamplesInWithout = withoutExamples.qaGapAnalysis?.edgeCaseGaps.some(g => g.example)

    expect(hasExamplesInWith).toBe(true)
    expect(hasExamplesInWithout).toBe(false)
  })

  it('calculates testability score', async () => {
    const story = createTestStoryStructure()

    const result = await generateQAGapAnalysis(story, null)

    expect(result.qaGapAnalysis?.testabilityScore).toBeGreaterThanOrEqual(0)
    expect(result.qaGapAnalysis?.testabilityScore).toBeLessThanOrEqual(100)
  })

  it('generates key risks and recommendations', async () => {
    const story = createTestStoryStructure({
      description: 'External API integration with async processing',
      acceptanceCriteria: [
        { id: 'AC-1', description: 'Should work properly', fromBaseline: false },
      ],
    })

    const result = await generateQAGapAnalysis(story, null)

    expect(result.qaGapAnalysis?.keyRisks.length).toBeGreaterThan(0)
    expect(result.qaGapAnalysis?.recommendations.length).toBeGreaterThan(0)
  })
})

describe('TestabilityGapSchema validation', () => {
  it('validates complete testability gap', () => {
    const gap = {
      id: 'TEST-1',
      relatedAcId: 'AC-1',
      description: 'External API dependency',
      severity: 'high',
      suggestion: 'Use mock service',
      category: 'external',
    }

    expect(() => TestabilityGapSchema.parse(gap)).not.toThrow()
  })

  it('validates all severity levels', () => {
    const severities = ['high', 'medium', 'low'] as const

    for (const severity of severities) {
      const gap = {
        id: 'TEST-1',
        description: 'Test gap',
        severity,
        suggestion: 'Fix it',
        category: 'external',
      }
      expect(() => TestabilityGapSchema.parse(gap)).not.toThrow()
    }
  })

  it('validates all categories', () => {
    const categories = [
      'observable',
      'deterministic',
      'isolation',
      'environment',
      'data',
      'timing',
      'external',
    ] as const

    for (const category of categories) {
      const gap = {
        id: 'TEST-1',
        description: 'Test gap',
        severity: 'medium',
        suggestion: 'Fix it',
        category,
      }
      expect(() => TestabilityGapSchema.parse(gap)).not.toThrow()
    }
  })
})

describe('EdgeCaseGapSchema validation', () => {
  it('validates complete edge case gap', () => {
    const gap = {
      id: 'EDGE-1',
      relatedAcId: 'AC-1',
      description: 'Empty input handling',
      severity: 'high',
      category: 'null_empty',
      example: 'What happens when user submits empty form?',
    }

    expect(() => EdgeCaseGapSchema.parse(gap)).not.toThrow()
  })

  it('validates all categories', () => {
    const categories = [
      'boundary',
      'null_empty',
      'error',
      'concurrent',
      'performance',
      'security',
      'integration',
      'user_behavior',
    ] as const

    for (const category of categories) {
      const gap = {
        id: 'EDGE-1',
        description: 'Test gap',
        severity: 'medium',
        category,
      }
      expect(() => EdgeCaseGapSchema.parse(gap)).not.toThrow()
    }
  })
})

describe('AcClarityGapSchema validation', () => {
  it('validates complete AC clarity gap', () => {
    const gap = {
      id: 'AC-CLARITY-1',
      acId: 'AC-1',
      description: 'Uses vague term "properly"',
      category: 'vague',
      originalText: 'Feature should work properly',
      suggestedRewrite: 'Feature returns 200 status code',
    }

    expect(() => AcClarityGapSchema.parse(gap)).not.toThrow()
  })

  it('validates all categories', () => {
    const categories = [
      'vague',
      'unmeasurable',
      'incomplete',
      'ambiguous',
      'missing_context',
      'untestable',
    ] as const

    for (const category of categories) {
      const gap = {
        id: 'AC-CLARITY-1',
        acId: 'AC-1',
        description: 'Test gap',
        category,
        originalText: 'Original text',
      }
      expect(() => AcClarityGapSchema.parse(gap)).not.toThrow()
    }
  })
})

describe('CoverageGapSchema validation', () => {
  it('validates complete coverage gap', () => {
    const gap = {
      id: 'COV-1',
      description: 'Missing unit test coverage',
      category: 'unit',
      priority: 'high',
      testApproach: 'Write unit tests with Vitest',
    }

    expect(() => CoverageGapSchema.parse(gap)).not.toThrow()
  })

  it('validates all categories', () => {
    const categories = [
      'unit',
      'integration',
      'e2e',
      'performance',
      'accessibility',
      'security',
      'regression',
      'visual',
    ] as const

    for (const category of categories) {
      const gap = {
        id: 'COV-1',
        description: 'Test gap',
        category,
        priority: 'medium',
      }
      expect(() => CoverageGapSchema.parse(gap)).not.toThrow()
    }
  })
})

describe('QAGapAnalysisSchema validation', () => {
  it('validates complete QA gap analysis', () => {
    const analysis = {
      storyId: 'flow-026',
      analyzedAt: new Date().toISOString(),
      testabilityGaps: [],
      edgeCaseGaps: [],
      acClarityGaps: [],
      coverageGaps: [],
      testabilityScore: 85,
      summary: 'Analysis complete',
      keyRisks: ['Risk 1'],
      recommendations: ['Recommendation 1'],
    }

    expect(() => QAGapAnalysisSchema.parse(analysis)).not.toThrow()
  })

  it('validates score range', () => {
    const validScores = [0, 50, 100]

    for (const score of validScores) {
      const analysis = {
        storyId: 'flow-026',
        analyzedAt: new Date().toISOString(),
        testabilityScore: score,
        summary: 'Test',
      }
      expect(() => QAGapAnalysisSchema.parse(analysis)).not.toThrow()
    }
  })

  it('rejects invalid score range', () => {
    const invalidScores = [-1, 101]

    for (const score of invalidScores) {
      const analysis = {
        storyId: 'flow-026',
        analyzedAt: new Date().toISOString(),
        testabilityScore: score,
        summary: 'Test',
      }
      expect(() => QAGapAnalysisSchema.parse(analysis)).toThrow()
    }
  })
})

describe('FanoutQAConfigSchema validation', () => {
  it('applies default values', () => {
    const config = FanoutQAConfigSchema.parse({})

    expect(config.maxTestabilityGaps).toBe(10)
    expect(config.maxEdgeCaseGaps).toBe(15)
    expect(config.maxAcClarityGaps).toBe(10)
    expect(config.maxCoverageGaps).toBe(10)
    expect(config.minTestabilitySeverity).toBe('low')
    expect(config.includeExamples).toBe(true)
    expect(config.includeRewrites).toBe(true)
  })

  it('validates custom config', () => {
    const config = {
      maxTestabilityGaps: 5,
      maxEdgeCaseGaps: 10,
      minTestabilitySeverity: 'high',
      includeExamples: false,
    }

    const parsed = FanoutQAConfigSchema.parse(config)

    expect(parsed.maxTestabilityGaps).toBe(5)
    expect(parsed.minTestabilitySeverity).toBe('high')
    expect(parsed.includeExamples).toBe(false)
  })
})

describe('FanoutQAResultSchema validation', () => {
  it('validates successful result', () => {
    const result = {
      qaGapAnalysis: {
        storyId: 'flow-026',
        analyzedAt: new Date().toISOString(),
        testabilityGaps: [],
        edgeCaseGaps: [],
        acClarityGaps: [],
        coverageGaps: [],
        testabilityScore: 95,
        summary: 'Good testability',
        keyRisks: [],
        recommendations: [],
      },
      analyzed: true,
      warnings: [],
    }

    expect(() => FanoutQAResultSchema.parse(result)).not.toThrow()
  })

  it('validates failed result', () => {
    const result = {
      qaGapAnalysis: null,
      analyzed: false,
      error: 'No story structure provided',
      warnings: ['Warning message'],
    }

    expect(() => FanoutQAResultSchema.parse(result)).not.toThrow()
  })
})
