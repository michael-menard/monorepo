import { describe, expect, it, vi } from 'vitest'
import type { StoryStructure } from '../seed.js'
import type { RankedGap, HygieneResult } from '../gap-hygiene.js'
import type { AttackAnalysis, ChallengeResult, AttackEdgeCase } from '../attack.js'
import type { ReadinessResult } from '../readiness-score.js'
import type { BaselineReality } from '../../reality/load-baseline.js'
import {
  consolidateInputs,
  generateFinalACs,
  generateNonGoals,
  generateTestHints,
  documentKnownUnknowns,
  createCommitmentBaseline,
  synthesizeStory,
  FinalAcceptanceCriterionSchema,
  NonGoalSchema,
  TestHintSchema,
  KnownUnknownSchema,
  CommitmentBaselineSchema,
  SynthesizedStorySchema,
  SynthesizeConfigSchema,
  SynthesizeResultSchema,
  type SynthesizeConfig,
} from '../synthesize.js'

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
  storyId: 'flow-030',
  title: 'Add synthesize node',
  description: 'Create a node that produces final story artifacts',
  domain: 'orchestrator',
  acceptanceCriteria: [
    {
      id: 'AC-1',
      description: 'The system must synthesize story artifacts',
      fromBaseline: false,
    },
    {
      id: 'AC-2',
      description: 'The system must generate non-goals',
      fromBaseline: false,
    },
    {
      id: 'AC-3',
      description: 'The system must document known unknowns',
      fromBaseline: true,
      baselineRef: 'baseline-constraint',
    },
  ],
  constraints: ['Must integrate with readiness node'],
  affectedFiles: ['src/nodes/story/synthesize.ts'],
  dependencies: ['gap-hygiene', 'attack', 'readiness-score'],
  estimatedComplexity: 'medium',
  tags: ['langgraph', 'node'],
  ...overrides,
})

const createTestRankedGap = (overrides: Partial<RankedGap> = {}): RankedGap => ({
  id: 'RG-001',
  originalId: 'SG-1',
  source: 'pm_scope',
  description: 'Test gap',
  score: 12,
  severity: 3,
  likelihood: 4,
  category: 'mvp_important',
  relatedACs: [],
  mergedFrom: [],
  history: [{ action: 'created', timestamp: new Date().toISOString() }],
  resolved: false,
  acknowledged: false,
  ...overrides,
})

const createTestHygieneResult = (overrides: Partial<HygieneResult> = {}): HygieneResult => ({
  storyId: 'flow-030',
  analyzedAt: new Date().toISOString(),
  rankedGaps: [
    createTestRankedGap({ id: 'RG-001', category: 'mvp_blocking', relatedACs: ['AC-1'] }),
    createTestRankedGap({ id: 'RG-002', category: 'mvp_important', source: 'qa_testability' }),
    createTestRankedGap({ id: 'RG-003', category: 'future' }),
    createTestRankedGap({ id: 'RG-004', category: 'deferred', score: 3 }),
  ],
  deduplicationStats: {
    totalBefore: 4,
    totalAfter: 4,
    merged: 0,
    mergeGroups: [],
  },
  categoryCounts: {
    mvp_blocking: 1,
    mvp_important: 1,
    future: 1,
    deferred: 1,
  },
  totalGaps: 4,
  mvpBlockingCount: 1,
  highestScore: 20,
  averageScore: 10,
  summary: 'Test summary',
  actionItems: [],
  ...overrides,
})

const createTestChallengeResult = (overrides: Partial<ChallengeResult> = {}): ChallengeResult => ({
  assumption: {
    id: 'ASM-1',
    description: 'Test assumption',
    source: 'story_description',
    confidence: 'medium',
  },
  challenge: 'What if this assumption is wrong?',
  validity: 'partially_valid',
  evidence: 'The assumption may not hold in all cases',
  iteration: 1,
  remediation: 'Add validation',
  ...overrides,
})

const createTestEdgeCase = (overrides: Partial<AttackEdgeCase> = {}): AttackEdgeCase => ({
  id: 'EDGE-ATK-1',
  description: 'Test edge case',
  category: 'failure',
  likelihood: 'possible',
  impact: 'high',
  riskScore: 12,
  mitigation: 'Handle gracefully',
  ...overrides,
})

const createTestAttackAnalysis = (overrides: Partial<AttackAnalysis> = {}): AttackAnalysis => ({
  storyId: 'flow-030',
  analyzedAt: new Date().toISOString(),
  assumptions: [
    { id: 'ASM-1', description: 'Test assumption', source: 'story_description', confidence: 'medium' },
  ],
  challengeResults: [
    createTestChallengeResult({ validity: 'invalid' }),
    createTestChallengeResult({ validity: 'partially_valid' }),
    createTestChallengeResult({ validity: 'uncertain' }),
    createTestChallengeResult({ validity: 'valid' }),
  ],
  edgeCases: [
    createTestEdgeCase({ id: 'EDGE-1', riskScore: 20, category: 'security' }),
    createTestEdgeCase({ id: 'EDGE-2', riskScore: 15, category: 'performance' }),
    createTestEdgeCase({ id: 'EDGE-3', riskScore: 9, category: 'boundary' }),
  ],
  summary: {
    totalAssumptions: 1,
    totalChallenges: 4,
    weakAssumptions: 2,
    totalEdgeCases: 3,
    highRiskEdgeCases: 2,
    attackReadiness: 'needs_attention',
    narrative: 'Test narrative',
  },
  keyVulnerabilities: ['Test vulnerability'],
  recommendations: ['Test recommendation'],
  ...overrides,
})

const createTestReadinessResult = (overrides: Partial<ReadinessResult> = {}): ReadinessResult => ({
  storyId: 'flow-030',
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
    totalGapsAnalyzed: 4,
  },
  recommendations: [],
  summary: 'Story is ready',
  confidence: 'high',
  ...overrides,
})

const createTestBaseline = (overrides: Partial<BaselineReality> = {}): BaselineReality => ({
  date: '2024-01-01',
  filePath: '/test/BASELINE-REALITY-2024-01-01.md',
  rawContent: '# Baseline',
  sections: [],
  whatExists: ['orchestrator infrastructure'],
  whatInProgress: ['gap hygiene node'],
  noRework: ['state management', 'node factory'],
  ...overrides,
})

describe('consolidateInputs', () => {
  it('identifies all inputs present', () => {
    const seed = createTestStoryStructure()
    const gaps = createTestHygieneResult()
    const attacks = createTestAttackAnalysis()
    const readiness = createTestReadinessResult()

    const result = consolidateInputs(seed, gaps, attacks, readiness)

    expect(result.hasAllInputs).toBe(true)
    expect(result.hasSeed).toBe(true)
    expect(result.hasGaps).toBe(true)
    expect(result.hasAttacks).toBe(true)
    expect(result.hasReadiness).toBe(true)
    expect(result.warnings).toHaveLength(0)
  })

  it('generates warnings for missing inputs', () => {
    const result = consolidateInputs(null, null, null, null)

    expect(result.hasAllInputs).toBe(false)
    expect(result.hasSeed).toBe(false)
    expect(result.warnings.length).toBe(4)
    expect(result.warnings.some(w => w.includes('seed'))).toBe(true)
    expect(result.warnings.some(w => w.includes('gap'))).toBe(true)
    expect(result.warnings.some(w => w.includes('attack'))).toBe(true)
    expect(result.warnings.some(w => w.includes('readiness'))).toBe(true)
  })

  it('handles partial inputs', () => {
    const seed = createTestStoryStructure()

    const result = consolidateInputs(seed, null, null, null)

    expect(result.hasAllInputs).toBe(false)
    expect(result.hasSeed).toBe(true)
    expect(result.warnings.length).toBe(3)
  })
})

describe('generateFinalACs', () => {
  it('converts seed ACs to final ACs', () => {
    const seed = createTestStoryStructure()
    const config = SynthesizeConfigSchema.parse({})

    const finalACs = generateFinalACs(seed, null, config)

    expect(finalACs.length).toBe(seed.acceptanceCriteria.length)
    expect(finalACs[0].id).toBe('AC-1')
    expect(finalACs[0].enhancedFromGaps).toBe(false)
  })

  it('enhances ACs with gap insights', () => {
    const seed = createTestStoryStructure()
    const gaps = createTestHygieneResult()
    const config = SynthesizeConfigSchema.parse({})

    const finalACs = generateFinalACs(seed, gaps, config)

    const enhancedAC = finalACs.find(ac => ac.id === 'AC-1')
    expect(enhancedAC?.enhancedFromGaps).toBe(true)
    expect(enhancedAC?.relatedGapIds).toContain('RG-001')
    expect(enhancedAC?.priority).toBe(1) // High priority due to blocking gap
  })

  it('adds new ACs from orphan blocking gaps', () => {
    const seed = createTestStoryStructure()
    const gaps = createTestHygieneResult({
      rankedGaps: [
        createTestRankedGap({ id: 'RG-100', category: 'mvp_blocking', relatedACs: [] }),
      ],
    })
    const config = SynthesizeConfigSchema.parse({})

    const finalACs = generateFinalACs(seed, gaps, config)

    const newAC = finalACs.find(ac => ac.relatedGapIds.includes('RG-100'))
    expect(newAC).toBeDefined()
    expect(newAC?.enhancedFromGaps).toBe(true)
  })

  it('respects enhanceACs config', () => {
    const seed = createTestStoryStructure()
    const gaps = createTestHygieneResult()
    const config = SynthesizeConfigSchema.parse({ enhanceACs: false })

    const finalACs = generateFinalACs(seed, gaps, config)

    expect(finalACs.every(ac => !ac.enhancedFromGaps)).toBe(true)
  })

  it('preserves baseline refs', () => {
    const seed = createTestStoryStructure()
    const config = SynthesizeConfigSchema.parse({})

    const finalACs = generateFinalACs(seed, null, config)

    const baselineAC = finalACs.find(ac => ac.fromBaseline)
    expect(baselineAC?.baselineRef).toBe('baseline-constraint')
  })
})

describe('generateNonGoals', () => {
  it('generates non-goals from invalid assumptions', () => {
    const seed = createTestStoryStructure()
    const attacks = createTestAttackAnalysis()
    const config = SynthesizeConfigSchema.parse({})

    const nonGoals = generateNonGoals(seed, attacks, null, config)

    expect(nonGoals.length).toBeGreaterThan(0)
    expect(nonGoals.some(ng => ng.source === 'attack_analysis')).toBe(true)
  })

  it('generates non-goals from high-risk edge cases', () => {
    const seed = createTestStoryStructure()
    const attacks = createTestAttackAnalysis({
      challengeResults: [],
      edgeCases: [
        createTestEdgeCase({ id: 'EDGE-1', riskScore: 20, mitigation: 'Test mitigation' }),
      ],
    })
    const config = SynthesizeConfigSchema.parse({})

    const nonGoals = generateNonGoals(seed, attacks, null, config)

    expect(nonGoals.some(ng => ng.relatedId === 'EDGE-1')).toBe(true)
  })

  it('generates non-goals from deferred gaps', () => {
    const seed = createTestStoryStructure()
    const gaps = createTestHygieneResult({
      rankedGaps: [
        createTestRankedGap({ id: 'RG-100', category: 'deferred', description: 'Deferred item' }),
      ],
    })
    const config = SynthesizeConfigSchema.parse({})

    const nonGoals = generateNonGoals(seed, null, gaps, config)

    expect(nonGoals.some(ng => ng.source === 'gap_analysis')).toBe(true)
    expect(nonGoals.some(ng => ng.relatedId === 'RG-100')).toBe(true)
  })

  it('respects maxNonGoals limit', () => {
    const seed = createTestStoryStructure()
    const attacks = createTestAttackAnalysis({
      challengeResults: Array(20).fill(null).map((_, i) =>
        createTestChallengeResult({
          assumption: { id: `ASM-${i}`, description: `Assumption ${i}`, source: 'story_description', confidence: 'low' },
          validity: 'invalid'
        })
      ),
    })
    const config = SynthesizeConfigSchema.parse({ maxNonGoals: 5 })

    const nonGoals = generateNonGoals(seed, attacks, null, config)

    expect(nonGoals.length).toBeLessThanOrEqual(5)
  })
})

describe('generateTestHints', () => {
  it('generates test hints from QA gaps', () => {
    const gaps = createTestHygieneResult({
      rankedGaps: [
        createTestRankedGap({ id: 'RG-1', source: 'qa_testability', score: 15, suggestion: 'Unit test approach' }),
        createTestRankedGap({ id: 'RG-2', source: 'qa_edge_case', score: 12, suggestion: 'Edge case test' }),
      ],
    })
    const config = SynthesizeConfigSchema.parse({})

    const hints = generateTestHints(gaps, null, config)

    expect(hints.length).toBeGreaterThan(0)
    expect(hints.some(h => h.relatedGapId === 'RG-1')).toBe(true)
  })

  it('generates test hints from attack edge cases', () => {
    const attacks = createTestAttackAnalysis({
      edgeCases: [
        createTestEdgeCase({ id: 'EDGE-1', riskScore: 15, category: 'security', mitigation: 'Security test' }),
      ],
    })
    const config = SynthesizeConfigSchema.parse({})

    const hints = generateTestHints(null, attacks, config)

    expect(hints.length).toBeGreaterThan(0)
    expect(hints.some(h => h.category === 'security')).toBe(true)
  })

  it('sorts test hints by priority', () => {
    const gaps = createTestHygieneResult({
      rankedGaps: [
        createTestRankedGap({ id: 'RG-1', source: 'qa_testability', score: 10, category: 'future' }),
        createTestRankedGap({ id: 'RG-2', source: 'qa_edge_case', score: 20, category: 'mvp_blocking' }),
      ],
    })
    const config = SynthesizeConfigSchema.parse({})

    const hints = generateTestHints(gaps, null, config)

    expect(hints[0].priority).toBeLessThanOrEqual(hints[hints.length - 1].priority)
  })

  it('respects minGapScoreForTestHints', () => {
    const gaps = createTestHygieneResult({
      rankedGaps: [
        createTestRankedGap({ id: 'RG-1', source: 'qa_testability', score: 5 }),
        createTestRankedGap({ id: 'RG-2', source: 'qa_edge_case', score: 15 }),
      ],
    })
    const config = SynthesizeConfigSchema.parse({ minGapScoreForTestHints: 10 })

    const hints = generateTestHints(gaps, null, config)

    expect(hints.every(h => h.relatedGapId !== 'RG-1')).toBe(true)
  })

  it('respects maxTestHints limit', () => {
    const gaps = createTestHygieneResult({
      rankedGaps: Array(30).fill(null).map((_, i) =>
        createTestRankedGap({ id: `RG-${i}`, source: 'qa_testability', score: 15 })
      ),
    })
    const config = SynthesizeConfigSchema.parse({ maxTestHints: 10 })

    const hints = generateTestHints(gaps, null, config)

    expect(hints.length).toBeLessThanOrEqual(10)
  })
})

describe('documentKnownUnknowns', () => {
  it('identifies TBD in story description', () => {
    const seed = createTestStoryStructure({
      description: 'Implement feature TBD',
    })
    const config = SynthesizeConfigSchema.parse({})

    const unknowns = documentKnownUnknowns(null, null, null, seed, config)

    expect(unknowns.length).toBeGreaterThan(0)
    expect(unknowns.some(ku => ku.source === 'story_content')).toBe(true)
  })

  it('identifies unknowns in acceptance criteria', () => {
    const seed = createTestStoryStructure({
      acceptanceCriteria: [
        { id: 'AC-1', description: 'Handle unknown edge cases', fromBaseline: false },
      ],
    })
    const config = SynthesizeConfigSchema.parse({})

    const unknowns = documentKnownUnknowns(null, null, null, seed, config)

    expect(unknowns.some(ku => ku.description.includes('AC-1'))).toBe(true)
  })

  it('includes uncertain assumptions from attack analysis', () => {
    const attacks = createTestAttackAnalysis({
      challengeResults: [
        createTestChallengeResult({ validity: 'uncertain', remediation: 'Validate with expert' }),
      ],
    })
    const config = SynthesizeConfigSchema.parse({})

    const unknowns = documentKnownUnknowns(null, attacks, null, null, config)

    expect(unknowns.some(ku => ku.source === 'attack_analysis')).toBe(true)
  })

  it('includes unresolved blocking gaps', () => {
    const gaps = createTestHygieneResult({
      rankedGaps: [
        createTestRankedGap({ id: 'RG-1', category: 'mvp_blocking', resolved: false, acknowledged: false }),
      ],
    })
    const config = SynthesizeConfigSchema.parse({})

    const unknowns = documentKnownUnknowns(null, null, gaps, null, config)

    expect(unknowns.some(ku => ku.source === 'gap_analysis' && ku.impact === 'blocking')).toBe(true)
  })

  it('respects maxKnownUnknowns limit', () => {
    const seed = createTestStoryStructure({
      description: 'TBD TBD TBD',
      acceptanceCriteria: Array(20).fill(null).map((_, i) => ({
        id: `AC-${i}`,
        description: `Unknown requirement ${i}`,
        fromBaseline: false,
      })),
    })
    const config = SynthesizeConfigSchema.parse({ maxKnownUnknowns: 5 })

    const unknowns = documentKnownUnknowns(null, null, null, seed, config)

    expect(unknowns.length).toBeLessThanOrEqual(5)
  })
})

describe('createCommitmentBaseline', () => {
  it('creates commitment baseline from readiness result', () => {
    const readiness = createTestReadinessResult()
    const baseline = createTestBaseline()
    const seed = createTestStoryStructure()
    const gaps = createTestHygieneResult()
    const knownUnknowns = [{ id: 'KU-1', description: 'Test', source: 'story_content' as const, impact: 'medium' as const }]

    const commitment = createCommitmentBaseline(readiness, baseline, seed, gaps, knownUnknowns)

    expect(commitment).toBeDefined()
    expect(commitment?.readinessScore).toBe(85)
    expect(commitment?.wasReady).toBe(true)
    expect(commitment?.baselineConstraints).toEqual(['state management', 'node factory'])
    expect(commitment?.expectedAffectedFiles).toEqual(seed.affectedFiles)
  })

  it('returns undefined without readiness', () => {
    const commitment = createCommitmentBaseline(null, null, null, null, [])

    expect(commitment).toBeUndefined()
  })

  it('includes blocking gaps count', () => {
    const readiness = createTestReadinessResult()
    const gaps = createTestHygieneResult({
      rankedGaps: [
        createTestRankedGap({ id: 'RG-1', category: 'mvp_blocking', resolved: false }),
        createTestRankedGap({ id: 'RG-2', category: 'mvp_blocking', resolved: false }),
      ],
    })

    const commitment = createCommitmentBaseline(readiness, null, null, gaps, [])

    expect(commitment?.blockingGapsCount).toBe(2)
  })

  it('sets appropriate commitment notes', () => {
    const readyResult = createTestReadinessResult({ ready: true, score: 90 })
    const commitment1 = createCommitmentBaseline(readyResult, null, null, null, [])
    expect(commitment1?.commitmentNotes).toContain('at readiness threshold')

    const notReadyResult = createTestReadinessResult({ ready: false, score: 70, threshold: 85 })
    const commitment2 = createCommitmentBaseline(notReadyResult, null, null, null, [])
    expect(commitment2?.commitmentNotes).toContain('below threshold')
    expect(commitment2?.commitmentNotes).toContain('70')
  })
})

describe('synthesizeStory', () => {
  it('synthesizes story with all inputs', async () => {
    const seed = createTestStoryStructure()
    const gaps = createTestHygieneResult()
    const attacks = createTestAttackAnalysis()
    const readiness = createTestReadinessResult()
    const baseline = createTestBaseline()

    const result = await synthesizeStory(seed, gaps, attacks, readiness, baseline)

    expect(result.synthesized).toBe(true)
    expect(result.synthesizedStory).not.toBeNull()
    expect(result.synthesizedStory?.storyId).toBe('flow-030')
    expect(result.synthesizedStory?.acceptanceCriteria.length).toBeGreaterThan(0)
    expect(result.synthesizedStory?.commitmentBaseline).toBeDefined()
  })

  it('requires story seed', async () => {
    const result = await synthesizeStory(null, null, null, null, null)

    expect(result.synthesized).toBe(false)
    expect(result.error).toContain('Story seed is required')
  })

  it('generates warnings for missing inputs', async () => {
    const seed = createTestStoryStructure()

    const result = await synthesizeStory(seed, null, null, null, null)

    expect(result.synthesized).toBe(true)
    expect(result.warnings.length).toBeGreaterThan(0)
  })

  it('includes readiness score in result', async () => {
    const seed = createTestStoryStructure()
    const readiness = createTestReadinessResult({ score: 75, ready: false })

    const result = await synthesizeStory(seed, null, null, readiness, null)

    expect(result.synthesizedStory?.readinessScore).toBe(75)
    expect(result.synthesizedStory?.isReady).toBe(false)
  })

  it('respects configuration options', async () => {
    const seed = createTestStoryStructure()
    const gaps = createTestHygieneResult()
    const attacks = createTestAttackAnalysis()
    const readiness = createTestReadinessResult()
    const config = {
      maxNonGoals: 2,
      maxTestHints: 3,
      maxKnownUnknowns: 1,
      generateCommitmentBaseline: false,
    }

    const result = await synthesizeStory(seed, gaps, attacks, readiness, null, config)

    expect(result.synthesizedStory?.nonGoals.length).toBeLessThanOrEqual(2)
    expect(result.synthesizedStory?.testHints.length).toBeLessThanOrEqual(3)
    expect(result.synthesizedStory?.knownUnknowns.length).toBeLessThanOrEqual(1)
    expect(result.synthesizedStory?.commitmentBaseline).toBeUndefined()
  })

  it('generates synthesis notes', async () => {
    const seed = createTestStoryStructure()
    const gaps = createTestHygieneResult()
    const readiness = createTestReadinessResult()

    const result = await synthesizeStory(seed, gaps, null, readiness, null)

    expect(result.synthesizedStory?.synthesisNotes).toBeTruthy()
    expect(result.synthesizedStory?.synthesisNotes).toContain(seed.title)
  })

  it('preserves story metadata', async () => {
    const seed = createTestStoryStructure({
      domain: 'test-domain',
      tags: ['tag1', 'tag2'],
      estimatedComplexity: 'large',
      constraints: ['constraint1'],
    })

    const result = await synthesizeStory(seed, null, null, null, null)

    expect(result.synthesizedStory?.domain).toBe('test-domain')
    expect(result.synthesizedStory?.tags).toEqual(['tag1', 'tag2'])
    expect(result.synthesizedStory?.estimatedComplexity).toBe('large')
    expect(result.synthesizedStory?.constraints).toEqual(['constraint1'])
  })
})

describe('FinalAcceptanceCriterionSchema validation', () => {
  it('validates complete AC', () => {
    const ac = {
      id: 'AC-1',
      description: 'Test AC',
      fromBaseline: true,
      baselineRef: 'baseline-item',
      enhancedFromGaps: true,
      relatedGapIds: ['RG-001'],
      priority: 1,
      testHint: 'Test hint',
    }

    expect(() => FinalAcceptanceCriterionSchema.parse(ac)).not.toThrow()
  })

  it('validates minimal AC', () => {
    const ac = {
      id: 'AC-1',
      description: 'Test AC',
    }

    const parsed = FinalAcceptanceCriterionSchema.parse(ac)
    expect(parsed.fromBaseline).toBe(false)
    expect(parsed.enhancedFromGaps).toBe(false)
    expect(parsed.priority).toBe(2)
  })

  it('validates priority range', () => {
    expect(() => FinalAcceptanceCriterionSchema.parse({ id: 'AC-1', description: 'Test', priority: 0 })).toThrow()
    expect(() => FinalAcceptanceCriterionSchema.parse({ id: 'AC-1', description: 'Test', priority: 4 })).toThrow()
  })
})

describe('NonGoalSchema validation', () => {
  it('validates complete non-goal', () => {
    const ng = {
      id: 'NG-1',
      description: 'Out of scope item',
      reason: 'Too complex for MVP',
      source: 'attack_analysis',
      relatedId: 'ASM-1',
    }

    expect(() => NonGoalSchema.parse(ng)).not.toThrow()
  })

  it('validates all source types', () => {
    const sources = ['attack_analysis', 'gap_analysis', 'baseline', 'manual'] as const

    for (const source of sources) {
      const ng = {
        id: 'NG-1',
        description: 'Test',
        reason: 'Test reason',
        source,
      }
      expect(() => NonGoalSchema.parse(ng)).not.toThrow()
    }
  })
})

describe('TestHintSchema validation', () => {
  it('validates complete test hint', () => {
    const hint = {
      id: 'TH-1',
      description: 'Test scenario',
      category: 'integration',
      priority: 1,
      relatedAcId: 'AC-1',
      relatedGapId: 'RG-001',
      approach: 'Use mocks',
    }

    expect(() => TestHintSchema.parse(hint)).not.toThrow()
  })

  it('validates all categories', () => {
    const categories = ['unit', 'integration', 'e2e', 'edge_case', 'performance', 'security'] as const

    for (const category of categories) {
      const hint = {
        id: 'TH-1',
        description: 'Test',
        category,
        priority: 2,
      }
      expect(() => TestHintSchema.parse(hint)).not.toThrow()
    }
  })
})

describe('KnownUnknownSchema validation', () => {
  it('validates complete known unknown', () => {
    const ku = {
      id: 'KU-1',
      description: 'Uncertainty about feature',
      source: 'story_content',
      impact: 'high',
      resolution: 'Discuss with stakeholder',
      acknowledged: true,
    }

    expect(() => KnownUnknownSchema.parse(ku)).not.toThrow()
  })

  it('validates all impact levels', () => {
    const impacts = ['blocking', 'high', 'medium', 'low'] as const

    for (const impact of impacts) {
      const ku = {
        id: 'KU-1',
        description: 'Test',
        source: 'story_content',
        impact,
      }
      expect(() => KnownUnknownSchema.parse(ku)).not.toThrow()
    }
  })

  it('validates all sources', () => {
    const sources = ['story_content', 'attack_analysis', 'readiness_analysis', 'gap_analysis'] as const

    for (const source of sources) {
      const ku = {
        id: 'KU-1',
        description: 'Test',
        source,
        impact: 'medium',
      }
      expect(() => KnownUnknownSchema.parse(ku)).not.toThrow()
    }
  })
})

describe('CommitmentBaselineSchema validation', () => {
  it('validates complete commitment baseline', () => {
    const baseline = {
      committedAt: new Date().toISOString(),
      readinessScore: 85,
      wasReady: true,
      blockingGapsCount: 0,
      knownUnknownsCount: 2,
      baselineConstraints: ['constraint1'],
      expectedAffectedFiles: ['file1.ts'],
      dependencies: ['dep1'],
      commitmentNotes: 'Committed at threshold',
    }

    expect(() => CommitmentBaselineSchema.parse(baseline)).not.toThrow()
  })

  it('validates score range', () => {
    const base = {
      committedAt: new Date().toISOString(),
      readinessScore: 50,
      wasReady: false,
      blockingGapsCount: 0,
      knownUnknownsCount: 0,
    }

    expect(() => CommitmentBaselineSchema.parse({ ...base, readinessScore: -1 })).toThrow()
    expect(() => CommitmentBaselineSchema.parse({ ...base, readinessScore: 101 })).toThrow()
    expect(() => CommitmentBaselineSchema.parse({ ...base, readinessScore: 0 })).not.toThrow()
    expect(() => CommitmentBaselineSchema.parse({ ...base, readinessScore: 100 })).not.toThrow()
  })
})

describe('SynthesizedStorySchema validation', () => {
  it('validates complete synthesized story', () => {
    const story = {
      storyId: 'flow-030',
      title: 'Test Story',
      description: 'Test description',
      domain: 'test',
      synthesizedAt: new Date().toISOString(),
      acceptanceCriteria: [
        { id: 'AC-1', description: 'Test AC' },
      ],
      nonGoals: [],
      testHints: [],
      knownUnknowns: [],
      constraints: [],
      affectedFiles: [],
      dependencies: [],
      tags: [],
      readinessScore: 85,
      isReady: true,
      synthesisNotes: 'Test notes',
    }

    expect(() => SynthesizedStorySchema.parse(story)).not.toThrow()
  })

  it('validates story ID format', () => {
    const base = {
      title: 'Test',
      description: 'Test',
      domain: 'test',
      synthesizedAt: new Date().toISOString(),
      acceptanceCriteria: [],
      readinessScore: 85,
      isReady: true,
      synthesisNotes: 'Notes',
    }

    expect(() => SynthesizedStorySchema.parse({ ...base, storyId: 'flow-030' })).not.toThrow()
    expect(() => SynthesizedStorySchema.parse({ ...base, storyId: 'FLOW-001' })).not.toThrow()
    expect(() => SynthesizedStorySchema.parse({ ...base, storyId: 'invalid' })).toThrow()
    expect(() => SynthesizedStorySchema.parse({ ...base, storyId: 'flow030' })).toThrow()
  })
})

describe('SynthesizeConfigSchema validation', () => {
  it('applies default values', () => {
    const config = SynthesizeConfigSchema.parse({})

    expect(config.maxNonGoals).toBe(10)
    expect(config.maxTestHints).toBe(15)
    expect(config.maxKnownUnknowns).toBe(10)
    expect(config.generateCommitmentBaseline).toBe(true)
    expect(config.enhanceACs).toBe(true)
    expect(config.minGapScoreForTestHints).toBe(8)
  })

  it('validates custom config', () => {
    const config = {
      maxNonGoals: 20,
      maxTestHints: 30,
      maxKnownUnknowns: 15,
      generateCommitmentBaseline: false,
      enhanceACs: false,
      minGapScoreForTestHints: 12,
    }

    const parsed = SynthesizeConfigSchema.parse(config)
    expect(parsed.maxNonGoals).toBe(20)
    expect(parsed.generateCommitmentBaseline).toBe(false)
  })
})

describe('SynthesizeResultSchema validation', () => {
  it('validates successful result', () => {
    const result = {
      synthesizedStory: {
        storyId: 'flow-030',
        title: 'Test',
        description: 'Test',
        domain: 'test',
        synthesizedAt: new Date().toISOString(),
        acceptanceCriteria: [],
        readinessScore: 85,
        isReady: true,
        synthesisNotes: 'Notes',
      },
      synthesized: true,
      warnings: [],
    }

    expect(() => SynthesizeResultSchema.parse(result)).not.toThrow()
  })

  it('validates failed result', () => {
    const result = {
      synthesizedStory: null,
      synthesized: false,
      error: 'Story seed is required',
      warnings: ['Warning 1'],
    }

    expect(() => SynthesizeResultSchema.parse(result)).not.toThrow()
  })
})
