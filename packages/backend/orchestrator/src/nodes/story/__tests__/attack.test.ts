import { describe, expect, it, vi } from 'vitest'
import type { StoryStructure } from '../seed.js'
import type { PMGapStructure } from '../fanout-pm.js'
import type { QAGapAnalysis } from '../fanout-qa.js'
import {
  extractAssumptions,
  challengeAssumption,
  identifyEdgeCases as identifyAttackEdgeCases,
  rateRisk,
  generateAttackAnalysis,
  AssumptionSchema,
  ChallengeResultSchema,
  AttackEdgeCaseSchema,
  AttackAnalysisSchema,
  AttackConfigSchema,
  AttackResultSchema,
  type Assumption,
  type ChallengeResult,
  type AttackEdgeCase,
} from '../attack.js'

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
  storyId: 'flow-027',
  title: 'Add attack analysis node',
  description: 'Create a node that challenges assumptions and identifies edge cases',
  domain: 'orchestrator',
  acceptanceCriteria: [
    {
      id: 'AC-1',
      description: 'The system must always validate inputs',
      fromBaseline: false,
    },
    {
      id: 'AC-2',
      description: 'Changes are scoped to the orchestrator domain',
      fromBaseline: false,
    },
  ],
  constraints: ['Must not break existing nodes'],
  affectedFiles: ['src/nodes/story/attack.ts'],
  dependencies: ['fanout-pm', 'fanout-ux', 'fanout-qa'],
  estimatedComplexity: 'medium',
  tags: ['langgraph', 'node'],
  ...overrides,
})

const createTestPMGaps = (overrides: Partial<PMGapStructure> = {}): PMGapStructure => ({
  scopeGaps: [],
  requirementGaps: [],
  dependencyGaps: [],
  priorityGaps: [],
  ...overrides,
})

const createTestQAGaps = (overrides: Partial<QAGapAnalysis> = {}): QAGapAnalysis => ({
  storyId: 'flow-027',
  analyzedAt: new Date().toISOString(),
  testabilityGaps: [],
  edgeCaseGaps: [],
  acClarityGaps: [],
  coverageGaps: [],
  testabilityScore: 85,
  summary: 'Test summary',
  keyRisks: [],
  recommendations: [],
  ...overrides,
})

describe('extractAssumptions', () => {
  it('extracts assumptions from story title and description', () => {
    const story = createTestStoryStructure({
      title: 'Always process data quickly',
      description: 'The system will never fail under load',
    })

    const assumptions = extractAssumptions(story)

    expect(assumptions.length).toBeGreaterThan(0)
    expect(assumptions.some(a => a.source === 'story_title')).toBe(true)
    expect(assumptions.some(a => a.source === 'story_description')).toBe(true)
  })

  it('extracts assumptions from acceptance criteria with universal language', () => {
    const story = createTestStoryStructure({
      acceptanceCriteria: [
        {
          id: 'AC-1',
          description: 'All users must be authenticated',
          fromBaseline: false,
        },
      ],
    })

    const assumptions = extractAssumptions(story)

    expect(assumptions.some(a => a.source === 'acceptance_criteria')).toBe(true)
  })

  it('extracts assumptions from constraints', () => {
    const story = createTestStoryStructure({
      constraints: ['Must maintain backward compatibility', 'Must not break existing APIs'],
    })

    const assumptions = extractAssumptions(story)

    const constraintAssumptions = assumptions.filter(a => a.source === 'constraints')
    expect(constraintAssumptions.length).toBe(2)
  })

  it('extracts dependency availability assumption', () => {
    const story = createTestStoryStructure({
      dependencies: ['dep-1', 'dep-2', 'dep-3'],
    })

    const assumptions = extractAssumptions(story)

    expect(
      assumptions.some(
        a => a.source === 'dependencies' && a.description.includes('dependencies'),
      ),
    ).toBe(true)
  })

  it('extracts affected files scope assumption', () => {
    const story = createTestStoryStructure({
      affectedFiles: ['file1.ts', 'file2.ts', 'file3.ts'],
    })

    const assumptions = extractAssumptions(story)

    expect(
      assumptions.some(a => a.source === 'affected_files' && a.description.includes('contained')),
    ).toBe(true)
  })

  it('extracts domain-specific assumptions', () => {
    const story = createTestStoryStructure({
      domain: 'orchestrator',
    })

    const assumptions = extractAssumptions(story)

    expect(assumptions.some(a => a.source === 'domain_knowledge')).toBe(true)
  })

  it('includes gap analysis insights when provided', () => {
    const story = createTestStoryStructure()
    const pmGaps = createTestPMGaps({ dependencyGaps: [] })
    const qaGaps = createTestQAGaps({ testabilityScore: 90 })

    const assumptions = extractAssumptions(story, pmGaps, null, qaGaps)

    expect(assumptions.some(a => a.source === 'gap_analysis')).toBe(true)
  })

  it('detects performance-related assumptions', () => {
    const story = createTestStoryStructure({
      description: 'The API must respond quickly and be fast under load',
    })

    const assumptions = extractAssumptions(story)

    expect(assumptions.some(a => a.description.includes('performance'))).toBe(true)
  })

  it('detects security-related assumptions', () => {
    const story = createTestStoryStructure({
      description: 'The system must be secure and protected from attacks',
    })

    const assumptions = extractAssumptions(story)

    expect(assumptions.some(a => a.description.includes('security'))).toBe(true)
  })
})

describe('challengeAssumption', () => {
  it('challenges universal claims', () => {
    const assumption: Assumption = {
      id: 'ASM-1',
      description: 'Assumes universal applicability: "all users must..."',
      source: 'acceptance_criteria',
      confidence: 'medium',
      sourceRef: 'AC-1',
    }

    const result = challengeAssumption(assumption, 1)

    expect(result.validity).toBe('partially_valid')
    expect(result.challenge).toBeTruthy()
    expect(result.evidence).toBeTruthy()
    expect(result.remediation).toBeTruthy()
  })

  it('challenges absolute negations', () => {
    const assumption: Assumption = {
      id: 'ASM-2',
      description: 'Assumes absolute negation: "never fails..."',
      source: 'story_description',
      confidence: 'low',
    }

    const result = challengeAssumption(assumption, 1)

    expect(result.validity).toBe('partially_valid')
    expect(result.remediation).toContain('violated')
  })

  it('challenges performance assumptions', () => {
    const assumption: Assumption = {
      id: 'ASM-3',
      description: 'Assumes performance characteristic: "fast response"',
      source: 'story_description',
      confidence: 'medium',
    }

    const result = challengeAssumption(assumption, 1)

    expect(result.validity).toBe('partially_valid')
    expect(result.remediation).toContain('measurable')
  })

  it('challenges security assumptions', () => {
    const assumption: Assumption = {
      id: 'ASM-4',
      description: 'Assumes security property: "secure authentication"',
      source: 'acceptance_criteria',
      confidence: 'medium',
    }

    const result = challengeAssumption(assumption, 1)

    expect(result.validity).toBe('uncertain')
    expect(result.remediation).toContain('security')
  })

  it('challenges dependency assumptions', () => {
    const assumption: Assumption = {
      id: 'ASM-5',
      description: 'External dependencies will be available when needed',
      source: 'dependencies',
      confidence: 'medium',
    }

    const result = challengeAssumption(assumption, 1)

    expect(result.validity).toBe('partially_valid')
    // The dependency challenge matches on "dependencies" or "available" keywords
    expect(result.remediation).toContain('circuit breaker')
  })

  it('includes iteration number in result', () => {
    const assumption: Assumption = {
      id: 'ASM-1',
      description: 'Test assumption',
      source: 'story_description',
      confidence: 'medium',
    }

    const result1 = challengeAssumption(assumption, 1)
    const result2 = challengeAssumption(assumption, 2)
    const result3 = challengeAssumption(assumption, 3)

    expect(result1.iteration).toBe(1)
    expect(result2.iteration).toBe(2)
    expect(result3.iteration).toBe(3)
  })
})

describe('identifyAttackEdgeCases', () => {
  it('identifies edge cases from challenged assumptions', () => {
    const story = createTestStoryStructure()
    const challengeResults: ChallengeResult[] = [
      {
        assumption: {
          id: 'ASM-1',
          description: 'Always validates input',
          source: 'acceptance_criteria',
          confidence: 'medium',
        },
        challenge: 'What if validation is bypassed?',
        validity: 'partially_valid',
        evidence: 'Validation can be bypassed',
        iteration: 1,
        remediation: 'Add server-side validation',
      },
    ]

    const edgeCases = identifyAttackEdgeCases(story, challengeResults)

    expect(edgeCases.some(ec => ec.relatedAssumptionId === 'ASM-1')).toBe(true)
  })

  it('identifies input handling edge cases', () => {
    const story = createTestStoryStructure({
      description: 'Process user input data from form',
    })

    const edgeCases = identifyAttackEdgeCases(story, [])

    expect(edgeCases.some(ec => ec.category === 'security')).toBe(true)
  })

  it('identifies concurrent access edge cases', () => {
    const story = createTestStoryStructure({
      description: 'Update records in parallel',
    })

    const edgeCases = identifyAttackEdgeCases(story, [])

    expect(edgeCases.some(ec => ec.category === 'concurrency')).toBe(true)
  })

  it('identifies network integration edge cases', () => {
    const story = createTestStoryStructure({
      description: 'Fetch data from external API endpoint',
    })

    const edgeCases = identifyAttackEdgeCases(story, [])

    expect(edgeCases.some(ec => ec.category === 'integration')).toBe(true)
  })

  it('identifies state management edge cases', () => {
    const story = createTestStoryStructure({
      description: 'Manage workflow state transitions',
    })

    const edgeCases = identifyAttackEdgeCases(story, [])

    expect(edgeCases.some(ec => ec.category === 'failure')).toBe(true)
  })

  it('identifies authentication edge cases', () => {
    const story = createTestStoryStructure({
      description: 'Implement user authentication with token refresh',
    })

    const edgeCases = identifyAttackEdgeCases(story, [])

    expect(edgeCases.some(ec => ec.category === 'security')).toBe(true)
  })

  it('identifies timing edge cases', () => {
    const story = createTestStoryStructure({
      description: 'Handle async operations with timeout',
    })

    const edgeCases = identifyAttackEdgeCases(story, [])

    expect(edgeCases.some(ec => ec.category === 'timing')).toBe(true)
  })

  it('includes mitigation suggestions', () => {
    const story = createTestStoryStructure({
      description: 'Process API requests',
    })

    const edgeCases = identifyAttackEdgeCases(story, [])

    expect(edgeCases.some(ec => ec.mitigation !== undefined)).toBe(true)
  })
})

describe('rateRisk', () => {
  it('calculates risk score correctly', () => {
    expect(rateRisk('certain', 'critical')).toBe(25) // 5 * 5
    expect(rateRisk('likely', 'high')).toBe(16) // 4 * 4
    expect(rateRisk('possible', 'medium')).toBe(9) // 3 * 3
    expect(rateRisk('unlikely', 'low')).toBe(4) // 2 * 2
    expect(rateRisk('rare', 'negligible')).toBe(1) // 1 * 1
  })

  it('handles mixed likelihood and impact', () => {
    expect(rateRisk('certain', 'negligible')).toBe(5) // 5 * 1
    expect(rateRisk('rare', 'critical')).toBe(5) // 1 * 5
    expect(rateRisk('possible', 'high')).toBe(12) // 3 * 4
  })

  it('returns values in valid range (1-25)', () => {
    const likelihoods = ['certain', 'likely', 'possible', 'unlikely', 'rare'] as const
    const impacts = ['critical', 'high', 'medium', 'low', 'negligible'] as const

    for (const likelihood of likelihoods) {
      for (const impact of impacts) {
        const score = rateRisk(likelihood, impact)
        expect(score).toBeGreaterThanOrEqual(1)
        expect(score).toBeLessThanOrEqual(25)
      }
    }
  })
})

describe('generateAttackAnalysis', () => {
  it('generates analysis from valid story structure', async () => {
    const story = createTestStoryStructure()

    const result = await generateAttackAnalysis(story)

    expect(result.analyzed).toBe(true)
    expect(result.attackAnalysis).not.toBeNull()
    expect(result.attackAnalysis?.storyId).toBe('flow-027')
  })

  it('handles missing story structure', async () => {
    const result = await generateAttackAnalysis(null)

    expect(result.analyzed).toBe(false)
    expect(result.error).toContain('No story structure')
  })

  it('respects maxAssumptionChallenges config', async () => {
    const story = createTestStoryStructure({
      title: 'Always do everything correctly',
      description: 'Must never fail and always succeed quickly',
      acceptanceCriteria: [
        { id: 'AC-1', description: 'All inputs must be valid', fromBaseline: false },
        { id: 'AC-2', description: 'Every request must succeed', fromBaseline: false },
        { id: 'AC-3', description: 'System must always respond fast', fromBaseline: false },
      ],
      constraints: ['Must not ever fail', 'Must always work'],
    })

    const limitedResult = await generateAttackAnalysis(story, null, null, null, {
      maxAssumptionChallenges: 2,
    })

    // Should have warnings about limiting assumptions
    expect(
      limitedResult.warnings.some(w => w.includes('Limited assumptions')),
    ).toBe(true)
  })

  it('respects maxEdgeCases config', async () => {
    const story = createTestStoryStructure({
      description:
        'Process user input from API, update database, handle auth, manage state with async operations and load config from environment',
    })

    const result = await generateAttackAnalysis(story, null, null, null, {
      maxEdgeCases: 3,
    })

    expect(result.attackAnalysis?.edgeCases.length).toBeLessThanOrEqual(3)
  })

  it('respects minRiskScore config', async () => {
    const story = createTestStoryStructure({
      description: 'Handle API requests with authentication',
    })

    const allResult = await generateAttackAnalysis(story, null, null, null, {
      minRiskScore: 1,
    })

    const highOnlyResult = await generateAttackAnalysis(story, null, null, null, {
      minRiskScore: 15,
    })

    expect(allResult.attackAnalysis?.edgeCases.length).toBeGreaterThanOrEqual(
      highOnlyResult.attackAnalysis?.edgeCases.length || 0,
    )
  })

  it('includes gap analysis insights when configured', async () => {
    const story = createTestStoryStructure()
    const pmGaps = createTestPMGaps()
    const qaGaps = createTestQAGaps({ testabilityScore: 95 })

    const withGaps = await generateAttackAnalysis(story, pmGaps, null, qaGaps, {
      includeGapInsights: true,
    })

    const withoutGaps = await generateAttackAnalysis(story, pmGaps, null, qaGaps, {
      includeGapInsights: false,
    })

    const gapAssumptionsWithGaps =
      withGaps.attackAnalysis?.assumptions.filter(a => a.source === 'gap_analysis') || []
    const gapAssumptionsWithoutGaps =
      withoutGaps.attackAnalysis?.assumptions.filter(a => a.source === 'gap_analysis') || []

    expect(gapAssumptionsWithGaps.length).toBeGreaterThan(gapAssumptionsWithoutGaps.length)
  })

  it('calculates summary correctly', async () => {
    const story = createTestStoryStructure()

    const result = await generateAttackAnalysis(story)

    expect(result.attackAnalysis?.summary).toBeDefined()
    expect(result.attackAnalysis?.summary.totalAssumptions).toBeGreaterThanOrEqual(0)
    expect(result.attackAnalysis?.summary.totalChallenges).toBeGreaterThanOrEqual(0)
    expect(result.attackAnalysis?.summary.attackReadiness).toMatch(/^(ready|needs_attention|critical)$/)
  })

  it('generates key vulnerabilities', async () => {
    const story = createTestStoryStructure({
      title: 'Always process securely',
      description: 'The secure API must never fail',
    })

    const result = await generateAttackAnalysis(story)

    expect(Array.isArray(result.attackAnalysis?.keyVulnerabilities)).toBe(true)
  })

  it('generates recommendations', async () => {
    const story = createTestStoryStructure({
      description: 'Handle concurrent API requests with authentication',
    })

    const result = await generateAttackAnalysis(story)

    expect(result.attackAnalysis?.recommendations.length).toBeGreaterThan(0)
  })

  it('determines attack readiness correctly', async () => {
    // Story with many issues should be critical
    const riskyStory = createTestStoryStructure({
      title: 'Always secure everything',
      description: 'Never fail on concurrent API requests with sensitive data',
    })

    const result = await generateAttackAnalysis(riskyStory)

    expect(['needs_attention', 'critical']).toContain(result.attackAnalysis?.summary.attackReadiness)
  })
})

describe('AssumptionSchema validation', () => {
  it('validates complete assumption', () => {
    const assumption = {
      id: 'ASM-1',
      description: 'Universal applicability assumption',
      source: 'acceptance_criteria',
      confidence: 'medium',
      sourceRef: 'AC-1',
    }

    expect(() => AssumptionSchema.parse(assumption)).not.toThrow()
  })

  it('validates all source types', () => {
    const sources = [
      'story_title',
      'story_description',
      'acceptance_criteria',
      'constraints',
      'dependencies',
      'affected_files',
      'domain_knowledge',
      'gap_analysis',
    ] as const

    for (const source of sources) {
      const assumption = {
        id: 'ASM-1',
        description: 'Test assumption',
        source,
        confidence: 'medium',
      }
      expect(() => AssumptionSchema.parse(assumption)).not.toThrow()
    }
  })

  it('validates all confidence levels', () => {
    const levels = ['high', 'medium', 'low', 'unknown'] as const

    for (const confidence of levels) {
      const assumption = {
        id: 'ASM-1',
        description: 'Test assumption',
        source: 'story_description',
        confidence,
      }
      expect(() => AssumptionSchema.parse(assumption)).not.toThrow()
    }
  })
})

describe('ChallengeResultSchema validation', () => {
  it('validates complete challenge result', () => {
    const result = {
      assumption: {
        id: 'ASM-1',
        description: 'Test assumption',
        source: 'story_description',
        confidence: 'medium',
      },
      challenge: 'What if this assumption is wrong?',
      validity: 'partially_valid',
      evidence: 'The assumption may not hold in edge cases',
      iteration: 1,
      remediation: 'Add validation',
    }

    expect(() => ChallengeResultSchema.parse(result)).not.toThrow()
  })

  it('validates all validity assessments', () => {
    const assessments = ['valid', 'partially_valid', 'invalid', 'uncertain'] as const

    for (const validity of assessments) {
      const result = {
        assumption: {
          id: 'ASM-1',
          description: 'Test',
          source: 'story_description',
          confidence: 'medium',
        },
        challenge: 'Challenge',
        validity,
        evidence: 'Evidence',
        iteration: 1,
      }
      expect(() => ChallengeResultSchema.parse(result)).not.toThrow()
    }
  })
})

describe('AttackEdgeCaseSchema validation', () => {
  it('validates complete edge case', () => {
    const edgeCase = {
      id: 'EDGE-ATK-1',
      description: 'Malformed input data',
      category: 'security',
      likelihood: 'likely',
      impact: 'high',
      riskScore: 16,
      relatedAssumptionId: 'ASM-1',
      mitigation: 'Validate all inputs',
    }

    expect(() => AttackEdgeCaseSchema.parse(edgeCase)).not.toThrow()
  })

  it('validates all categories', () => {
    const categories = [
      'boundary',
      'concurrency',
      'failure',
      'security',
      'performance',
      'integration',
      'data',
      'user_behavior',
      'environment',
      'timing',
    ] as const

    for (const category of categories) {
      const edgeCase = {
        id: 'EDGE-ATK-1',
        description: 'Test edge case',
        category,
        likelihood: 'possible',
        impact: 'medium',
        riskScore: 9,
      }
      expect(() => AttackEdgeCaseSchema.parse(edgeCase)).not.toThrow()
    }
  })

  it('validates all likelihood levels', () => {
    const levels = ['certain', 'likely', 'possible', 'unlikely', 'rare'] as const

    for (const likelihood of levels) {
      const edgeCase = {
        id: 'EDGE-ATK-1',
        description: 'Test',
        category: 'failure',
        likelihood,
        impact: 'medium',
        riskScore: 9,
      }
      expect(() => AttackEdgeCaseSchema.parse(edgeCase)).not.toThrow()
    }
  })

  it('validates all impact levels', () => {
    const levels = ['critical', 'high', 'medium', 'low', 'negligible'] as const

    for (const impact of levels) {
      const edgeCase = {
        id: 'EDGE-ATK-1',
        description: 'Test',
        category: 'failure',
        likelihood: 'possible',
        impact,
        riskScore: 9,
      }
      expect(() => AttackEdgeCaseSchema.parse(edgeCase)).not.toThrow()
    }
  })

  it('validates risk score range', () => {
    const validScores = [1, 9, 16, 25]

    for (const riskScore of validScores) {
      const edgeCase = {
        id: 'EDGE-ATK-1',
        description: 'Test',
        category: 'failure',
        likelihood: 'possible',
        impact: 'medium',
        riskScore,
      }
      expect(() => AttackEdgeCaseSchema.parse(edgeCase)).not.toThrow()
    }
  })

  it('rejects invalid risk score range', () => {
    const invalidScores = [0, 26, -1, 100]

    for (const riskScore of invalidScores) {
      const edgeCase = {
        id: 'EDGE-ATK-1',
        description: 'Test',
        category: 'failure',
        likelihood: 'possible',
        impact: 'medium',
        riskScore,
      }
      expect(() => AttackEdgeCaseSchema.parse(edgeCase)).toThrow()
    }
  })
})

describe('AttackAnalysisSchema validation', () => {
  it('validates complete attack analysis', () => {
    const analysis = {
      storyId: 'flow-027',
      analyzedAt: new Date().toISOString(),
      assumptions: [],
      challengeResults: [],
      edgeCases: [],
      summary: {
        totalAssumptions: 5,
        totalChallenges: 5,
        weakAssumptions: 2,
        totalEdgeCases: 8,
        highRiskEdgeCases: 1,
        attackReadiness: 'needs_attention',
        narrative: 'Analysis complete',
      },
      keyVulnerabilities: ['Vulnerability 1'],
      recommendations: ['Recommendation 1'],
    }

    expect(() => AttackAnalysisSchema.parse(analysis)).not.toThrow()
  })

  it('validates attack readiness values', () => {
    const readinessValues = ['ready', 'needs_attention', 'critical'] as const

    for (const attackReadiness of readinessValues) {
      const analysis = {
        storyId: 'flow-027',
        analyzedAt: new Date().toISOString(),
        summary: {
          totalAssumptions: 0,
          totalChallenges: 0,
          weakAssumptions: 0,
          totalEdgeCases: 0,
          highRiskEdgeCases: 0,
          attackReadiness,
          narrative: 'Test',
        },
      }
      expect(() => AttackAnalysisSchema.parse(analysis)).not.toThrow()
    }
  })
})

describe('AttackConfigSchema validation', () => {
  it('applies default values', () => {
    const config = AttackConfigSchema.parse({})

    expect(config.maxAssumptionChallenges).toBe(5)
    expect(config.maxEdgeCases).toBe(10)
    expect(config.maxIterationsPerAssumption).toBe(3)
    expect(config.minConfidenceLevel).toBe('unknown')
    expect(config.includeGapInsights).toBe(true)
    expect(config.minRiskScore).toBe(1)
  })

  it('validates custom config', () => {
    const config = {
      maxAssumptionChallenges: 10,
      maxEdgeCases: 20,
      maxIterationsPerAssumption: 5,
      minConfidenceLevel: 'high',
      includeGapInsights: false,
      minRiskScore: 10,
    }

    const parsed = AttackConfigSchema.parse(config)

    expect(parsed.maxAssumptionChallenges).toBe(10)
    expect(parsed.maxEdgeCases).toBe(20)
    expect(parsed.maxIterationsPerAssumption).toBe(5)
    expect(parsed.minConfidenceLevel).toBe('high')
    expect(parsed.includeGapInsights).toBe(false)
    expect(parsed.minRiskScore).toBe(10)
  })
})

describe('AttackResultSchema validation', () => {
  it('validates successful result', () => {
    const result = {
      attackAnalysis: {
        storyId: 'flow-027',
        analyzedAt: new Date().toISOString(),
        assumptions: [],
        challengeResults: [],
        edgeCases: [],
        summary: {
          totalAssumptions: 0,
          totalChallenges: 0,
          weakAssumptions: 0,
          totalEdgeCases: 0,
          highRiskEdgeCases: 0,
          attackReadiness: 'ready',
          narrative: 'No issues found',
        },
        keyVulnerabilities: [],
        recommendations: [],
      },
      analyzed: true,
      warnings: [],
    }

    expect(() => AttackResultSchema.parse(result)).not.toThrow()
  })

  it('validates failed result', () => {
    const result = {
      attackAnalysis: null,
      analyzed: false,
      error: 'No story structure provided',
      warnings: ['Warning message'],
    }

    expect(() => AttackResultSchema.parse(result)).not.toThrow()
  })
})
