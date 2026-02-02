import { describe, expect, it, vi } from 'vitest'
import type { AttackAnalysis, AttackEdgeCase, ChallengeResult } from '../../story/attack.js'
import type { ReadinessResult } from '../../story/readiness-score.js'
import type { SynthesizedStory } from '../../story/synthesize.js'
import type { DeltaReviewResult, ReviewFinding } from '../delta-review.js'
import {
  evaluateAttackImpact,
  evaluateCrossCuttingChanges,
  evaluateScopeExpansion,
  evaluateConsistencyViolations,
  evaluateEscapeHatch,
  determineStakeholders,
  determineReviewScope,
  EscapeHatchTriggerSchema,
  TriggerEvaluationSchema,
  StakeholderSchema,
  ReviewScopeSchema,
  EscapeHatchResultSchema,
  EscapeHatchConfigSchema,
  EscapeHatchNodeResultSchema,
  type EscapeHatchConfig,
  type TriggerEvaluation,
} from '../escape-hatch.js'

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
const createTestSynthesizedStory = (
  overrides: Partial<SynthesizedStory> = {},
): SynthesizedStory => ({
  storyId: 'flow-033',
  title: 'Test Story',
  description: 'Test description',
  domain: 'orchestrator',
  synthesizedAt: new Date().toISOString(),
  acceptanceCriteria: [
    {
      id: 'AC-1',
      description: 'First acceptance criterion',
      fromBaseline: false,
      enhancedFromGaps: false,
      relatedGapIds: [],
      priority: 1,
    },
    {
      id: 'AC-2',
      description: 'Second acceptance criterion',
      fromBaseline: true,
      baselineRef: 'baseline-item',
      enhancedFromGaps: false,
      relatedGapIds: [],
      priority: 2,
    },
  ],
  nonGoals: [
    {
      id: 'NG-1',
      description: 'First non-goal',
      reason: 'Out of scope',
      source: 'attack_analysis',
    },
  ],
  testHints: [
    {
      id: 'TH-1',
      description: 'Test hint 1',
      category: 'unit',
      priority: 1,
    },
  ],
  knownUnknowns: [
    {
      id: 'KU-1',
      description: 'Unknown 1',
      source: 'story_content',
      impact: 'medium',
    },
  ],
  constraints: ['constraint 1'],
  affectedFiles: ['file1.ts'],
  dependencies: ['dep1'],
  tags: ['test'],
  readinessScore: 85,
  isReady: true,
  synthesisNotes: 'Test notes',
  ...overrides,
})

const createTestDeltaReviewResult = (
  overrides: Partial<DeltaReviewResult> = {},
): DeltaReviewResult => ({
  storyId: 'flow-033',
  reviewedAt: new Date().toISOString(),
  findings: [],
  sectionsReviewed: ['acceptanceCriteria'],
  sectionsSkipped: ['nonGoals', 'testHints', 'knownUnknowns', 'constraints'],
  sectionSummaries: [
    {
      section: 'acceptanceCriteria',
      itemsReviewed: 2,
      findingsCount: 0,
      passed: true,
    },
  ],
  passed: true,
  findingsBySeverity: {
    critical: 0,
    major: 0,
    minor: 0,
    info: 0,
  },
  summary: 'Delta review passed',
  reviewed: true,
  ...overrides,
})

const createTestAttackAnalysis = (
  overrides: Partial<AttackAnalysis> = {},
): AttackAnalysis => ({
  storyId: 'flow-033',
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
  ...overrides,
})

const createTestReadinessResult = (
  overrides: Partial<ReadinessResult> = {},
): ReadinessResult => ({
  storyId: 'flow-033',
  analyzedAt: new Date().toISOString(),
  score: 85,
  breakdown: {
    baseScore: 100,
    deductions: [],
    additions: [],
    totalDeductions: 15,
    totalAdditions: 0,
    finalScore: 85,
  },
  ready: true,
  threshold: 85,
  factors: {
    mvpBlockingCount: 0,
    mvpImportantCount: 1,
    knownUnknownsCount: 0,
    hasStrongContext: true,
    hasBaselineAlignment: true,
    totalGapsAnalyzed: 5,
  },
  recommendations: [],
  summary: 'Story is ready',
  confidence: 'high',
  ...overrides,
})

describe('EscapeHatchTriggerSchema validation', () => {
  it('validates all trigger types', () => {
    const triggers = ['attack_impact', 'cross_cutting', 'scope_expansion', 'consistency_violation']

    for (const trigger of triggers) {
      expect(() => EscapeHatchTriggerSchema.parse(trigger)).not.toThrow()
    }
  })

  it('rejects invalid trigger', () => {
    expect(() => EscapeHatchTriggerSchema.parse('invalid_trigger')).toThrow()
  })
})

describe('TriggerEvaluationSchema validation', () => {
  it('validates complete trigger evaluation', () => {
    const evaluation = {
      trigger: 'attack_impact',
      detected: true,
      confidence: 0.85,
      evidence: ['High risk edge case found'],
      affectedItems: ['AC-1', 'AC-2'],
    }

    expect(() => TriggerEvaluationSchema.parse(evaluation)).not.toThrow()
  })

  it('validates minimal trigger evaluation', () => {
    const evaluation = {
      trigger: 'cross_cutting',
      detected: false,
      confidence: 0,
    }

    const parsed = TriggerEvaluationSchema.parse(evaluation)
    expect(parsed.evidence).toEqual([])
    expect(parsed.affectedItems).toEqual([])
  })

  it('rejects confidence out of range', () => {
    const evaluation = {
      trigger: 'attack_impact',
      detected: true,
      confidence: 1.5,
    }

    expect(() => TriggerEvaluationSchema.parse(evaluation)).toThrow()
  })
})

describe('StakeholderSchema validation', () => {
  it('validates all stakeholder types', () => {
    const stakeholders = ['attacker', 'architect', 'pm', 'uiux', 'qa']

    for (const stakeholder of stakeholders) {
      expect(() => StakeholderSchema.parse(stakeholder)).not.toThrow()
    }
  })

  it('rejects invalid stakeholder', () => {
    expect(() => StakeholderSchema.parse('developer')).toThrow()
  })
})

describe('ReviewScopeSchema validation', () => {
  it('validates complete review scope', () => {
    const scope = {
      sections: ['acceptanceCriteria', 'testHints'],
      items: ['AC-1', 'TH-1'],
      fullReview: false,
      priority: 1,
      reason: 'Targeted review needed',
    }

    expect(() => ReviewScopeSchema.parse(scope)).not.toThrow()
  })

  it('validates minimal review scope', () => {
    const scope = {
      reason: 'No review needed',
    }

    const parsed = ReviewScopeSchema.parse(scope)
    expect(parsed.sections).toEqual([])
    expect(parsed.items).toEqual([])
    expect(parsed.fullReview).toBe(false)
    expect(parsed.priority).toBe(2)
  })

  it('rejects invalid priority', () => {
    const scope = {
      reason: 'Test',
      priority: 5,
    }

    expect(() => ReviewScopeSchema.parse(scope)).toThrow()
  })
})

describe('EscapeHatchResultSchema validation', () => {
  it('validates complete result', () => {
    const result = {
      storyId: 'flow-033',
      evaluatedAt: new Date().toISOString(),
      triggered: true,
      triggersActivated: ['attack_impact'],
      evaluations: [
        {
          trigger: 'attack_impact',
          detected: true,
          confidence: 0.8,
          evidence: ['Test'],
          affectedItems: ['AC-1'],
        },
      ],
      reviewScope: {
        sections: ['acceptanceCriteria'],
        items: ['AC-1'],
        fullReview: false,
        priority: 1,
        reason: 'Test reason',
      },
      stakeholdersToInvolve: ['attacker', 'architect'],
      confidence: 0.8,
      summary: 'Escape hatch triggered',
      evaluated: true,
    }

    expect(() => EscapeHatchResultSchema.parse(result)).not.toThrow()
  })

  it('validates failed result', () => {
    const result = {
      storyId: 'flow-033',
      evaluatedAt: new Date().toISOString(),
      triggered: false,
      triggersActivated: [],
      evaluations: [],
      reviewScope: null,
      stakeholdersToInvolve: [],
      confidence: 0,
      summary: 'Evaluation failed',
      evaluated: false,
      error: 'Missing required data',
    }

    expect(() => EscapeHatchResultSchema.parse(result)).not.toThrow()
  })

  it('validates story ID format', () => {
    const base = {
      evaluatedAt: new Date().toISOString(),
      triggered: false,
      triggersActivated: [],
      evaluations: [],
      reviewScope: null,
      stakeholdersToInvolve: [],
      confidence: 0,
      summary: 'Test',
      evaluated: true,
    }

    expect(() => EscapeHatchResultSchema.parse({ ...base, storyId: 'flow-033' })).not.toThrow()
    expect(() => EscapeHatchResultSchema.parse({ ...base, storyId: 'FLOW-001' })).not.toThrow()
    expect(() => EscapeHatchResultSchema.parse({ ...base, storyId: 'invalid' })).toThrow()
  })
})

describe('EscapeHatchConfigSchema validation', () => {
  it('applies default values', () => {
    const config = EscapeHatchConfigSchema.parse({})

    expect(config.triggerThreshold).toBe(0.7)
    expect(config.minTriggers).toBe(1)
    expect(config.evaluateAttackImpact).toBe(true)
    expect(config.evaluateCrossCutting).toBe(true)
    expect(config.evaluateScopeExpansion).toBe(true)
    expect(config.evaluateConsistency).toBe(true)
    expect(config.readinessDropThreshold).toBe(10)
    expect(config.crossCuttingSectionThreshold).toBe(3)
  })

  it('validates custom config', () => {
    const config = {
      triggerThreshold: 0.5,
      minTriggers: 2,
      evaluateAttackImpact: false,
      crossCuttingSectionThreshold: 4,
    }

    const parsed = EscapeHatchConfigSchema.parse(config)
    expect(parsed.triggerThreshold).toBe(0.5)
    expect(parsed.minTriggers).toBe(2)
    expect(parsed.evaluateAttackImpact).toBe(false)
    expect(parsed.crossCuttingSectionThreshold).toBe(4)
  })
})

describe('EscapeHatchNodeResultSchema validation', () => {
  it('validates successful result', () => {
    const result = {
      escapeHatchResult: {
        storyId: 'flow-033',
        evaluatedAt: new Date().toISOString(),
        triggered: false,
        triggersActivated: [],
        evaluations: [],
        reviewScope: null,
        stakeholdersToInvolve: [],
        confidence: 0,
        summary: 'No triggers',
        evaluated: true,
      },
      escapeHatchEvaluated: true,
    }

    expect(() => EscapeHatchNodeResultSchema.parse(result)).not.toThrow()
  })

  it('validates failed result', () => {
    const result = {
      escapeHatchResult: null,
      escapeHatchEvaluated: false,
      error: 'Missing story',
    }

    expect(() => EscapeHatchNodeResultSchema.parse(result)).not.toThrow()
  })
})

describe('evaluateAttackImpact', () => {
  it('returns not detected when no attack findings', () => {
    const deltaResult = createTestDeltaReviewResult()

    const evaluation = evaluateAttackImpact(null, deltaResult)

    expect(evaluation.detected).toBe(false)
    expect(evaluation.evidence).toContain('No attack analysis available')
  })

  it('detects high-risk edge cases affecting unreviewed sections', () => {
    const attackFindings = createTestAttackAnalysis({
      edgeCases: [
        {
          id: 'EDGE-1',
          description: 'Security vulnerability',
          category: 'security',
          likelihood: 'likely',
          impact: 'critical',
          riskScore: 20,
        },
      ],
    })
    const deltaResult = createTestDeltaReviewResult({
      sectionsReviewed: ['testHints'],
      sectionsSkipped: ['acceptanceCriteria', 'constraints'],
    })

    const evaluation = evaluateAttackImpact(attackFindings, deltaResult)

    expect(evaluation.detected).toBe(true)
    expect(evaluation.confidence).toBeGreaterThan(0)
    expect(evaluation.evidence.some(e => e.includes('high-risk edge case'))).toBe(true)
  })

  it('detects weak assumptions requiring broader review', () => {
    const weakChallengeResults: ChallengeResult[] = [
      {
        assumption: { id: 'ASM-1', description: 'Test', source: 'story_title', confidence: 'low' },
        challenge: 'Challenge',
        validity: 'invalid',
        evidence: 'Evidence',
        iteration: 1,
      },
      {
        assumption: { id: 'ASM-2', description: 'Test 2', source: 'story_title', confidence: 'low' },
        challenge: 'Challenge 2',
        validity: 'partially_valid',
        evidence: 'Evidence 2',
        iteration: 1,
      },
      {
        assumption: { id: 'ASM-3', description: 'Test 3', source: 'story_title', confidence: 'low' },
        challenge: 'Challenge 3',
        validity: 'invalid',
        evidence: 'Evidence 3',
        iteration: 1,
      },
    ]
    const attackFindings = createTestAttackAnalysis({
      challengeResults: weakChallengeResults,
    })
    const deltaResult = createTestDeltaReviewResult()

    const evaluation = evaluateAttackImpact(attackFindings, deltaResult)

    expect(evaluation.detected).toBe(true)
    expect(evaluation.evidence.some(e => e.includes('weak assumption'))).toBe(true)
  })

  it('detects critical attack readiness', () => {
    const attackFindings = createTestAttackAnalysis({
      summary: {
        totalAssumptions: 5,
        totalChallenges: 5,
        weakAssumptions: 4,
        totalEdgeCases: 10,
        highRiskEdgeCases: 5,
        attackReadiness: 'critical',
        narrative: 'Critical issues found',
      },
    })
    const deltaResult = createTestDeltaReviewResult()

    const evaluation = evaluateAttackImpact(attackFindings, deltaResult)

    expect(evaluation.detected).toBe(true)
    expect(evaluation.confidence).toBeGreaterThanOrEqual(0.8)
    expect(evaluation.evidence.some(e => e.includes('critical readiness'))).toBe(true)
  })
})

describe('evaluateCrossCuttingChanges', () => {
  const defaultConfig = EscapeHatchConfigSchema.parse({})

  it('returns not detected when no delta result', () => {
    const story = createTestSynthesizedStory()

    const evaluation = evaluateCrossCuttingChanges(null, story, defaultConfig)

    expect(evaluation.detected).toBe(false)
    expect(evaluation.evidence).toContain('No delta review result available')
  })

  it('detects changes spanning multiple sections', () => {
    const deltaResult = createTestDeltaReviewResult({
      sectionsReviewed: [
        'acceptanceCriteria',
        'testHints',
        'knownUnknowns',
        'constraints',
      ],
    })
    const story = createTestSynthesizedStory()

    const evaluation = evaluateCrossCuttingChanges(deltaResult, story, defaultConfig)

    expect(evaluation.detected).toBe(true)
    expect(evaluation.evidence.some(e => e.includes('span'))).toBe(true)
  })

  it('detects consistency findings', () => {
    const findings: ReviewFinding[] = [
      {
        id: 'RF-1',
        section: 'acceptanceCriteria',
        itemId: 'AC-1',
        severity: 'major',
        category: 'consistency',
        issue: 'Inconsistent with other section',
        recommendation: 'Fix',
        deltaRelated: true,
      },
    ]
    const deltaResult = createTestDeltaReviewResult({
      findings,
    })
    const story = createTestSynthesizedStory()

    const evaluation = evaluateCrossCuttingChanges(deltaResult, story, defaultConfig)

    expect(evaluation.detected).toBe(true)
    expect(evaluation.evidence.some(e => e.includes('cross-section finding'))).toBe(true)
  })

  it('detects AC changes affecting test hints', () => {
    const findings: ReviewFinding[] = [
      {
        id: 'RF-1',
        section: 'acceptanceCriteria',
        itemId: 'AC-1',
        severity: 'critical',
        category: 'completeness',
        issue: 'Missing test coverage',
        recommendation: 'Add tests',
        deltaRelated: true,
      },
    ]
    const deltaResult = createTestDeltaReviewResult({
      findings,
    })
    const story = createTestSynthesizedStory()

    const evaluation = evaluateCrossCuttingChanges(deltaResult, story, defaultConfig)

    expect(evaluation.detected).toBe(true)
    expect(evaluation.evidence.some(e => e.includes('AC finding'))).toBe(true)
  })
})

describe('evaluateScopeExpansion', () => {
  const defaultConfig = EscapeHatchConfigSchema.parse({})

  it('returns not detected when no delta result', () => {
    const evaluation = evaluateScopeExpansion(null, null, null, defaultConfig)

    expect(evaluation.detected).toBe(false)
    expect(evaluation.evidence).toContain('No delta review result available')
  })

  it('detects scope-related findings', () => {
    const findings: ReviewFinding[] = [
      {
        id: 'RF-1',
        section: 'nonGoals',
        itemId: 'NG-1',
        severity: 'minor',
        category: 'scope',
        issue: 'Scope creep detected',
        recommendation: 'Review scope',
        deltaRelated: true,
      },
    ]
    const deltaResult = createTestDeltaReviewResult({
      findings,
    })

    const evaluation = evaluateScopeExpansion(deltaResult, null, null, defaultConfig)

    expect(evaluation.detected).toBe(true)
    expect(evaluation.evidence.some(e => e.includes('scope-related finding'))).toBe(true)
  })

  it('detects readiness score drop', () => {
    const deltaResult = createTestDeltaReviewResult()
    const readiness = createTestReadinessResult({
      score: 70,
    })

    const evaluation = evaluateScopeExpansion(deltaResult, readiness, 85, defaultConfig)

    expect(evaluation.detected).toBe(true)
    expect(evaluation.evidence.some(e => e.includes('dropped by'))).toBe(true)
  })

  it('detects MVP-blocking gaps preventing readiness', () => {
    const deltaResult = createTestDeltaReviewResult()
    const readiness = createTestReadinessResult({
      ready: false,
      factors: {
        mvpBlockingCount: 2,
        mvpImportantCount: 0,
        knownUnknownsCount: 0,
        hasStrongContext: true,
        hasBaselineAlignment: true,
        totalGapsAnalyzed: 5,
      },
      recommendations: [
        {
          id: 'REC-001',
          severity: 'critical',
          description: 'Fix blocking gap',
          expectedPointsGain: 20,
          relatedGapIds: ['GAP-1'],
        },
      ],
    })

    const evaluation = evaluateScopeExpansion(deltaResult, readiness, null, defaultConfig)

    expect(evaluation.detected).toBe(true)
    expect(evaluation.evidence.some(e => e.includes('MVP-blocking gap'))).toBe(true)
  })

  it('detects removed non-goals as scope creep', () => {
    const findings: ReviewFinding[] = [
      {
        id: 'RF-1',
        section: 'nonGoals',
        itemId: 'NG-1',
        severity: 'minor',
        category: 'scope',
        issue: 'Non-goal removed',
        recommendation: 'Review',
        deltaRelated: true,
        changeType: 'removed',
      },
    ]
    const deltaResult = createTestDeltaReviewResult({
      findings,
    })

    const evaluation = evaluateScopeExpansion(deltaResult, null, null, defaultConfig)

    expect(evaluation.detected).toBe(true)
    expect(evaluation.evidence.some(e => e.includes('non-goal'))).toBe(true)
  })
})

describe('evaluateConsistencyViolations', () => {
  it('returns not detected when insufficient data', () => {
    const evaluation = evaluateConsistencyViolations(null, null)

    expect(evaluation.detected).toBe(false)
    expect(evaluation.evidence.some(e => e.includes('Insufficient data'))).toBe(true)
  })

  it('detects explicit consistency findings', () => {
    const findings: ReviewFinding[] = [
      {
        id: 'RF-1',
        section: 'acceptanceCriteria',
        itemId: 'AC-1',
        severity: 'major',
        category: 'consistency',
        issue: 'Inconsistent',
        recommendation: 'Fix',
        deltaRelated: true,
      },
    ]
    const deltaResult = createTestDeltaReviewResult({
      findings,
    })
    const story = createTestSynthesizedStory()

    const evaluation = evaluateConsistencyViolations(deltaResult, story)

    expect(evaluation.detected).toBe(true)
    expect(evaluation.evidence.some(e => e.includes('consistency finding'))).toBe(true)
  })

  it('detects removed constraints', () => {
    const findings: ReviewFinding[] = [
      {
        id: 'RF-1',
        section: 'constraints',
        itemId: 'item-0',
        severity: 'major',
        category: 'consistency',
        issue: 'Constraint removed',
        recommendation: 'Review',
        deltaRelated: true,
        changeType: 'removed',
      },
    ]
    const deltaResult = createTestDeltaReviewResult({
      findings,
    })
    const story = createTestSynthesizedStory()

    const evaluation = evaluateConsistencyViolations(deltaResult, story)

    expect(evaluation.detected).toBe(true)
    expect(evaluation.evidence.some(e => e.includes('constraint'))).toBe(true)
  })

  it('detects AC to test hint imbalance', () => {
    const deltaResult = createTestDeltaReviewResult()
    const story = createTestSynthesizedStory({
      acceptanceCriteria: Array.from({ length: 10 }, (_, i) => ({
        id: `AC-${i + 1}`,
        description: `AC ${i + 1}`,
        fromBaseline: false,
        enhancedFromGaps: false,
        relatedGapIds: [],
        priority: 1,
      })),
      testHints: [
        {
          id: 'TH-1',
          description: 'Single test hint',
          category: 'unit',
          priority: 1,
        },
      ],
    })

    const evaluation = evaluateConsistencyViolations(deltaResult, story)

    expect(evaluation.detected).toBe(true)
    expect(evaluation.evidence.some(e => e.includes('ratio imbalanced'))).toBe(true)
  })

  it('detects blocking unknowns with ready status inconsistency', () => {
    const deltaResult = createTestDeltaReviewResult()
    const story = createTestSynthesizedStory({
      isReady: true,
      knownUnknowns: [
        {
          id: 'KU-1',
          description: 'Blocking unknown',
          source: 'story_content',
          impact: 'blocking',
        },
      ],
    })

    const evaluation = evaluateConsistencyViolations(deltaResult, story)

    expect(evaluation.detected).toBe(true)
    expect(evaluation.evidence.some(e => e.includes('inconsistent state'))).toBe(true)
  })
})

describe('determineStakeholders', () => {
  it('returns empty array for no detected triggers', () => {
    const evaluations: TriggerEvaluation[] = [
      {
        trigger: 'attack_impact',
        detected: false,
        confidence: 0,
        evidence: [],
        affectedItems: [],
      },
    ]

    const stakeholders = determineStakeholders(evaluations, null, null)

    expect(stakeholders).toEqual([])
  })

  it('includes attacker for attack_impact trigger', () => {
    const evaluations: TriggerEvaluation[] = [
      {
        trigger: 'attack_impact',
        detected: true,
        confidence: 0.8,
        evidence: ['Test'],
        affectedItems: [],
      },
    ]

    const stakeholders = determineStakeholders(evaluations, null, null)

    expect(stakeholders).toContain('attacker')
  })

  it('includes architect for cross_cutting trigger', () => {
    const evaluations: TriggerEvaluation[] = [
      {
        trigger: 'cross_cutting',
        detected: true,
        confidence: 0.8,
        evidence: ['Test'],
        affectedItems: [],
      },
    ]

    const stakeholders = determineStakeholders(evaluations, null, null)

    expect(stakeholders).toContain('architect')
  })

  it('includes pm for scope_expansion trigger', () => {
    const evaluations: TriggerEvaluation[] = [
      {
        trigger: 'scope_expansion',
        detected: true,
        confidence: 0.8,
        evidence: ['Test'],
        affectedItems: [],
      },
    ]

    const stakeholders = determineStakeholders(evaluations, null, null)

    expect(stakeholders).toContain('pm')
  })

  it('includes qa for consistency_violation trigger', () => {
    const evaluations: TriggerEvaluation[] = [
      {
        trigger: 'consistency_violation',
        detected: true,
        confidence: 0.8,
        evidence: ['Test'],
        affectedItems: [],
      },
    ]

    const stakeholders = determineStakeholders(evaluations, null, null)

    expect(stakeholders).toContain('qa')
  })

  it('includes architect for security-related attacks', () => {
    const evaluations: TriggerEvaluation[] = [
      {
        trigger: 'attack_impact',
        detected: true,
        confidence: 0.8,
        evidence: ['Test'],
        affectedItems: [],
      },
    ]
    const attackFindings = createTestAttackAnalysis({
      edgeCases: [
        {
          id: 'EDGE-1',
          description: 'Security issue',
          category: 'security',
          likelihood: 'likely',
          impact: 'critical',
          riskScore: 20,
        },
      ],
    })

    const stakeholders = determineStakeholders(evaluations, null, attackFindings)

    expect(stakeholders).toContain('architect')
  })

  it('includes qa for critical/major findings', () => {
    const evaluations: TriggerEvaluation[] = []
    const deltaResult = createTestDeltaReviewResult({
      findingsBySeverity: {
        critical: 1,
        major: 0,
        minor: 0,
        info: 0,
      },
    })

    const stakeholders = determineStakeholders(evaluations, deltaResult, null)

    expect(stakeholders).toContain('qa')
  })
})

describe('determineReviewScope', () => {
  it('returns no review scope when no triggers detected', () => {
    const evaluations: TriggerEvaluation[] = [
      {
        trigger: 'attack_impact',
        detected: false,
        confidence: 0,
        evidence: [],
        affectedItems: [],
      },
    ]

    const scope = determineReviewScope(evaluations)

    expect(scope.fullReview).toBe(false)
    expect(scope.sections).toEqual([])
    expect(scope.priority).toBe(3)
  })

  it('includes affected sections in scope', () => {
    const evaluations: TriggerEvaluation[] = [
      {
        trigger: 'cross_cutting',
        detected: true,
        confidence: 0.7,
        evidence: ['Test'],
        affectedItems: ['acceptanceCriteria', 'testHints'],
      },
    ]

    const scope = determineReviewScope(evaluations)

    expect(scope.sections).toContain('acceptanceCriteria')
    expect(scope.sections).toContain('testHints')
  })

  it('sets high priority for high confidence', () => {
    const evaluations: TriggerEvaluation[] = [
      {
        trigger: 'attack_impact',
        detected: true,
        confidence: 0.9,
        evidence: ['Test'],
        affectedItems: [],
      },
    ]

    const scope = determineReviewScope(evaluations)

    expect(scope.priority).toBe(1)
  })

  it('triggers full review for multiple trigger types', () => {
    const evaluations: TriggerEvaluation[] = [
      {
        trigger: 'attack_impact',
        detected: true,
        confidence: 0.7,
        evidence: [],
        affectedItems: [],
      },
      {
        trigger: 'cross_cutting',
        detected: true,
        confidence: 0.7,
        evidence: [],
        affectedItems: [],
      },
      {
        trigger: 'consistency_violation',
        detected: true,
        confidence: 0.7,
        evidence: [],
        affectedItems: [],
      },
    ]

    const scope = determineReviewScope(evaluations)

    expect(scope.fullReview).toBe(true)
  })

  it('triggers full review for critical combination', () => {
    const evaluations: TriggerEvaluation[] = [
      {
        trigger: 'attack_impact',
        detected: true,
        confidence: 0.7,
        evidence: [],
        affectedItems: [],
      },
      {
        trigger: 'consistency_violation',
        detected: true,
        confidence: 0.7,
        evidence: [],
        affectedItems: [],
      },
    ]

    const scope = determineReviewScope(evaluations)

    expect(scope.fullReview).toBe(true)
  })
})

describe('evaluateEscapeHatch', () => {
  it('fails when no story provided', async () => {
    const result = await evaluateEscapeHatch(null, null, null, null)

    expect(result.evaluated).toBe(false)
    expect(result.error).toContain('Story is required')
  })

  it('returns not triggered when no issues detected', async () => {
    const story = createTestSynthesizedStory()
    const deltaResult = createTestDeltaReviewResult()

    const result = await evaluateEscapeHatch(deltaResult, null, story, null)

    expect(result.evaluated).toBe(true)
    expect(result.triggered).toBe(false)
  })

  it('triggers when threshold exceeded', async () => {
    const story = createTestSynthesizedStory({
      isReady: true,
      knownUnknowns: [
        {
          id: 'KU-1',
          description: 'Blocking',
          source: 'story_content',
          impact: 'blocking',
        },
      ],
    })
    const deltaResult = createTestDeltaReviewResult({
      sectionsReviewed: ['acceptanceCriteria', 'testHints', 'knownUnknowns', 'constraints'],
    })
    const attackFindings = createTestAttackAnalysis({
      summary: {
        totalAssumptions: 5,
        totalChallenges: 5,
        weakAssumptions: 4,
        totalEdgeCases: 10,
        highRiskEdgeCases: 5,
        attackReadiness: 'critical',
        narrative: 'Critical',
      },
    })

    const result = await evaluateEscapeHatch(deltaResult, attackFindings, story, null)

    expect(result.evaluated).toBe(true)
    expect(result.triggered).toBe(true)
    expect(result.triggersActivated.length).toBeGreaterThan(0)
  })

  it('respects configuration options', async () => {
    const story = createTestSynthesizedStory()
    const deltaResult = createTestDeltaReviewResult()
    const config: Partial<EscapeHatchConfig> = {
      evaluateAttackImpact: false,
      evaluateCrossCutting: false,
      evaluateScopeExpansion: false,
      evaluateConsistency: false,
    }

    const result = await evaluateEscapeHatch(deltaResult, null, story, null, null, config)

    expect(result.evaluated).toBe(true)
    expect(result.evaluations.length).toBe(0)
  })

  it('respects minTriggers configuration', async () => {
    const story = createTestSynthesizedStory({
      isReady: true,
      knownUnknowns: [
        {
          id: 'KU-1',
          description: 'Blocking',
          source: 'story_content',
          impact: 'blocking',
        },
      ],
    })
    const deltaResult = createTestDeltaReviewResult()
    const config: Partial<EscapeHatchConfig> = {
      minTriggers: 5,
    }

    const result = await evaluateEscapeHatch(deltaResult, null, story, null, null, config)

    expect(result.evaluated).toBe(true)
    expect(result.triggered).toBe(false)
  })

  it('includes stakeholders when triggered', async () => {
    const story = createTestSynthesizedStory()
    const deltaResult = createTestDeltaReviewResult({
      sectionsReviewed: ['acceptanceCriteria', 'testHints', 'knownUnknowns', 'constraints'],
    })
    const attackFindings = createTestAttackAnalysis({
      summary: {
        totalAssumptions: 5,
        totalChallenges: 5,
        weakAssumptions: 4,
        totalEdgeCases: 10,
        highRiskEdgeCases: 5,
        attackReadiness: 'critical',
        narrative: 'Critical',
      },
    })

    const result = await evaluateEscapeHatch(deltaResult, attackFindings, story, null)

    if (result.triggered) {
      expect(result.stakeholdersToInvolve.length).toBeGreaterThan(0)
    }
  })

  it('includes review scope when triggered', async () => {
    const story = createTestSynthesizedStory()
    const deltaResult = createTestDeltaReviewResult({
      sectionsReviewed: ['acceptanceCriteria', 'testHints', 'knownUnknowns', 'constraints'],
    })
    const attackFindings = createTestAttackAnalysis({
      summary: {
        totalAssumptions: 5,
        totalChallenges: 5,
        weakAssumptions: 4,
        totalEdgeCases: 10,
        highRiskEdgeCases: 5,
        attackReadiness: 'critical',
        narrative: 'Critical',
      },
    })

    const result = await evaluateEscapeHatch(deltaResult, attackFindings, story, null)

    if (result.triggered) {
      expect(result.reviewScope).not.toBeNull()
      expect(result.reviewScope?.reason).toBeTruthy()
    }
  })

  it('validates result against schema', async () => {
    const story = createTestSynthesizedStory()
    const deltaResult = createTestDeltaReviewResult()

    const result = await evaluateEscapeHatch(deltaResult, null, story, null)

    expect(() => EscapeHatchResultSchema.parse(result)).not.toThrow()
  })

  it('generates meaningful summary', async () => {
    const story = createTestSynthesizedStory()
    const deltaResult = createTestDeltaReviewResult()

    const result = await evaluateEscapeHatch(deltaResult, null, story, null)

    expect(result.summary).toContain(story.storyId)
    expect(result.summary.length).toBeGreaterThan(0)
  })
})

describe('summary generation', () => {
  it('generates summary for no triggers', async () => {
    const story = createTestSynthesizedStory()

    const result = await evaluateEscapeHatch(null, null, story, null)

    expect(result.summary).toContain('No triggers detected')
    expect(result.summary).toContain('sufficient')
  })

  it('generates summary with trigger details when triggered', async () => {
    const story = createTestSynthesizedStory()
    const deltaResult = createTestDeltaReviewResult({
      sectionsReviewed: ['acceptanceCriteria', 'testHints', 'knownUnknowns', 'constraints'],
    })
    const attackFindings = createTestAttackAnalysis({
      summary: {
        totalAssumptions: 5,
        totalChallenges: 5,
        weakAssumptions: 4,
        totalEdgeCases: 10,
        highRiskEdgeCases: 5,
        attackReadiness: 'critical',
        narrative: 'Critical',
      },
    })

    const result = await evaluateEscapeHatch(deltaResult, attackFindings, story, null)

    if (result.triggered) {
      expect(result.summary).toContain('TRIGGERED')
    }
  })
})
