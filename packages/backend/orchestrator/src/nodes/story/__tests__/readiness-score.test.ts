import { describe, expect, it, vi } from 'vitest'
import type { StoryStructure } from '../seed.js'
import type { RankedGap, HygieneResult } from '../gap-hygiene.js'
import type { BaselineReality } from '../../reality/load-baseline.js'
import type { RetrievedContext } from '../../reality/retrieve-context.js'
import {
  countBlockingGaps,
  countImportantGaps,
  countUnknowns,
  identifyKnownUnknowns,
  assessContextStrength,
  calculateReadinessScore,
  generateRecommendations,
  generateSummary,
  determineConfidence,
  generateReadinessAnalysis,
  READINESS_THRESHOLD,
  SCORING_DEDUCTIONS,
  SCORING_ADDITIONS,
  ReadinessFactorsSchema,
  ScoreAdjustmentSchema,
  ScoreBreakdownSchema,
  ReadinessRecommendationSchema,
  ReadinessResultSchema,
  ReadinessConfigSchema,
  ReadinessScoreResultSchema,
  type ReadinessFactors,
  type ReadinessConfig,
} from '../readiness-score.js'

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
  storyId: 'flow-029',
  title: 'Add readiness score node',
  description: 'Create a node that calculates readiness from gaps and context',
  domain: 'orchestrator',
  acceptanceCriteria: [
    {
      id: 'AC-1',
      description: 'The system must calculate a readiness score',
      fromBaseline: false,
    },
    {
      id: 'AC-2',
      description: 'The system must identify blockers',
      fromBaseline: false,
    },
  ],
  constraints: ['Must integrate with gap hygiene node'],
  affectedFiles: ['src/nodes/story/readiness-score.ts'],
  dependencies: ['gap-hygiene'],
  estimatedComplexity: 'medium',
  tags: ['langgraph', 'node'],
  ...overrides,
})

const createTestRankedGap = (
  overrides: Partial<RankedGap> = {},
): RankedGap => ({
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

const createTestBaseline = (overrides: Partial<BaselineReality> = {}): BaselineReality => ({
  date: '2024-01-01',
  filePath: '/test/BASELINE-REALITY-2024-01-01.md',
  rawContent: '# Baseline',
  sections: [],
  whatExists: ['orchestrator infrastructure', 'node factory'],
  whatInProgress: ['gap hygiene node'],
  noRework: ['state management'],
  ...overrides,
})

const createTestContext = (overrides: Partial<RetrievedContext> = {}): RetrievedContext => ({
  storyId: 'flow-029',
  retrievedAt: new Date().toISOString(),
  files: [
    {
      filePath: '/test/file1.ts',
      relativePath: 'file1.ts',
      contentLoaded: true,
      content: 'test content',
    },
    {
      filePath: '/test/file2.ts',
      relativePath: 'file2.ts',
      contentLoaded: true,
      content: 'test content',
    },
    {
      filePath: '/test/file3.ts',
      relativePath: 'file3.ts',
      contentLoaded: true,
      content: 'test content',
    },
  ],
  totalFilesFound: 5,
  filesLoaded: 3,
  retrievalErrors: [],
  ...overrides,
})

describe('countBlockingGaps', () => {
  it('counts MVP-blocking gaps correctly', () => {
    const gaps: RankedGap[] = [
      createTestRankedGap({ id: 'RG-001', category: 'mvp_blocking' }),
      createTestRankedGap({ id: 'RG-002', category: 'mvp_blocking' }),
      createTestRankedGap({ id: 'RG-003', category: 'mvp_important' }),
    ]

    expect(countBlockingGaps(gaps)).toBe(2)
  })

  it('excludes resolved gaps', () => {
    const gaps: RankedGap[] = [
      createTestRankedGap({ id: 'RG-001', category: 'mvp_blocking', resolved: false }),
      createTestRankedGap({ id: 'RG-002', category: 'mvp_blocking', resolved: true }),
    ]

    expect(countBlockingGaps(gaps)).toBe(1)
  })

  it('returns 0 for empty or null input', () => {
    expect(countBlockingGaps([])).toBe(0)
    expect(countBlockingGaps(null)).toBe(0)
    expect(countBlockingGaps(undefined)).toBe(0)
  })
})

describe('countImportantGaps', () => {
  it('counts MVP-important gaps correctly', () => {
    const gaps: RankedGap[] = [
      createTestRankedGap({ id: 'RG-001', category: 'mvp_blocking' }),
      createTestRankedGap({ id: 'RG-002', category: 'mvp_important' }),
      createTestRankedGap({ id: 'RG-003', category: 'mvp_important' }),
      createTestRankedGap({ id: 'RG-004', category: 'future' }),
    ]

    expect(countImportantGaps(gaps)).toBe(2)
  })

  it('excludes resolved gaps', () => {
    const gaps: RankedGap[] = [
      createTestRankedGap({ id: 'RG-001', category: 'mvp_important', resolved: false }),
      createTestRankedGap({ id: 'RG-002', category: 'mvp_important', resolved: true }),
    ]

    expect(countImportantGaps(gaps)).toBe(1)
  })
})

describe('identifyKnownUnknowns', () => {
  it('identifies TBD in description', () => {
    const story = createTestStoryStructure({
      description: 'Implement feature TBD for later',
    })

    const unknowns = identifyKnownUnknowns(story)

    expect(unknowns.length).toBeGreaterThan(0)
    expect(unknowns[0]).toContain('Description')
  })

  it('identifies unknown in acceptance criteria', () => {
    const story = createTestStoryStructure({
      acceptanceCriteria: [
        {
          id: 'AC-1',
          description: 'Handle unknown edge cases appropriately',
          fromBaseline: false,
        },
      ],
    })

    const unknowns = identifyKnownUnknowns(story)

    expect(unknowns.length).toBeGreaterThan(0)
    expect(unknowns[0]).toContain('AC-1')
  })

  it('identifies question marks in constraints', () => {
    const story = createTestStoryStructure({
      constraints: ['Performance requirements??'],
    })

    const unknowns = identifyKnownUnknowns(story)

    expect(unknowns.length).toBeGreaterThan(0)
    expect(unknowns[0]).toContain('Constraint')
  })

  it('returns empty array for clear story', () => {
    const story = createTestStoryStructure({
      description: 'Clear description with no ambiguity',
      acceptanceCriteria: [
        { id: 'AC-1', description: 'Specific requirement', fromBaseline: false },
      ],
      constraints: ['Clear constraint'],
    })

    const unknowns = identifyKnownUnknowns(story)

    expect(unknowns.length).toBe(0)
  })

  it('returns empty array for null input', () => {
    expect(identifyKnownUnknowns(null)).toEqual([])
    expect(identifyKnownUnknowns(undefined)).toEqual([])
  })
})

describe('countUnknowns', () => {
  it('counts known unknowns correctly', () => {
    const story = createTestStoryStructure({
      description: 'TBD description',
      acceptanceCriteria: [
        { id: 'AC-1', description: 'Unknown behavior here', fromBaseline: false },
      ],
    })

    expect(countUnknowns(story)).toBeGreaterThanOrEqual(2)
  })
})

describe('assessContextStrength', () => {
  it('identifies strong context with multiple files loaded', () => {
    const context = createTestContext({ filesLoaded: 5 })

    const result = assessContextStrength(null, context)

    expect(result.hasStrongContext).toBe(true)
    expect(result.reasons.some(r => r.toLowerCase().includes('strong') || r.includes('files loaded'))).toBe(true)
  })

  it('identifies weak context with few files', () => {
    const context = createTestContext({ filesLoaded: 1 })

    const result = assessContextStrength(null, context)

    expect(result.hasStrongContext).toBe(false)
  })

  it('identifies baseline alignment when baseline present', () => {
    const baseline = createTestBaseline()

    const result = assessContextStrength(baseline, null)

    expect(result.hasBaselineAlignment).toBe(true)
    expect(result.reasons.some(r => r.toLowerCase().includes('baseline'))).toBe(true)
  })

  it('handles missing inputs gracefully', () => {
    const result = assessContextStrength(null, null)

    expect(result.hasStrongContext).toBe(false)
    expect(result.hasBaselineAlignment).toBe(false)
    expect(result.reasons).toEqual([])
  })

  it('recognizes good file coverage', () => {
    const context = createTestContext({
      filesLoaded: 4,
      totalFilesFound: 5,
    })

    const result = assessContextStrength(null, context)

    // Check for coverage mention or file loaded message
    expect(result.reasons.some(r => r.toLowerCase().includes('coverage') || r.includes('files loaded'))).toBe(true)
  })
})

describe('calculateReadinessScore', () => {
  it('starts with base score of 100', () => {
    const factors: ReadinessFactors = {
      mvpBlockingCount: 0,
      mvpImportantCount: 0,
      knownUnknownsCount: 0,
      hasStrongContext: false,
      hasBaselineAlignment: false,
      totalGapsAnalyzed: 0,
    }
    const config = ReadinessConfigSchema.parse({})

    const breakdown = calculateReadinessScore(factors, config)

    expect(breakdown.baseScore).toBe(100)
  })

  it('deducts points for MVP-blocking gaps', () => {
    const factors: ReadinessFactors = {
      mvpBlockingCount: 2,
      mvpImportantCount: 0,
      knownUnknownsCount: 0,
      hasStrongContext: false,
      hasBaselineAlignment: false,
      totalGapsAnalyzed: 2,
    }
    const config = ReadinessConfigSchema.parse({})

    const breakdown = calculateReadinessScore(factors, config)

    expect(breakdown.totalDeductions).toBe(2 * SCORING_DEDUCTIONS.PER_MVP_BLOCKING_GAP)
    expect(breakdown.finalScore).toBe(100 - 40) // 60
  })

  it('deducts points for MVP-important gaps', () => {
    const factors: ReadinessFactors = {
      mvpBlockingCount: 0,
      mvpImportantCount: 3,
      knownUnknownsCount: 0,
      hasStrongContext: false,
      hasBaselineAlignment: false,
      totalGapsAnalyzed: 3,
    }
    const config = ReadinessConfigSchema.parse({})

    const breakdown = calculateReadinessScore(factors, config)

    expect(breakdown.totalDeductions).toBe(3 * SCORING_DEDUCTIONS.PER_MVP_IMPORTANT_GAP)
    expect(breakdown.finalScore).toBe(100 - 15) // 85
  })

  it('deducts points for known unknowns', () => {
    const factors: ReadinessFactors = {
      mvpBlockingCount: 0,
      mvpImportantCount: 0,
      knownUnknownsCount: 2,
      hasStrongContext: false,
      hasBaselineAlignment: false,
      totalGapsAnalyzed: 0,
    }
    const config = ReadinessConfigSchema.parse({})

    const breakdown = calculateReadinessScore(factors, config)

    expect(breakdown.totalDeductions).toBe(2 * SCORING_DEDUCTIONS.PER_KNOWN_UNKNOWN)
    expect(breakdown.finalScore).toBe(100 - 6) // 94
  })

  it('adds points for strong context', () => {
    const factors: ReadinessFactors = {
      mvpBlockingCount: 0,
      mvpImportantCount: 0,
      knownUnknownsCount: 0,
      hasStrongContext: true,
      hasBaselineAlignment: false,
      totalGapsAnalyzed: 0,
    }
    const config = ReadinessConfigSchema.parse({})

    const breakdown = calculateReadinessScore(factors, config)

    expect(breakdown.totalAdditions).toBe(SCORING_ADDITIONS.STRONG_CONTEXT)
    // Score caps at 100
    expect(breakdown.finalScore).toBe(100)
  })

  it('adds points for baseline alignment', () => {
    const factors: ReadinessFactors = {
      mvpBlockingCount: 0,
      mvpImportantCount: 0,
      knownUnknownsCount: 0,
      hasStrongContext: false,
      hasBaselineAlignment: true,
      totalGapsAnalyzed: 0,
    }
    const config = ReadinessConfigSchema.parse({})

    const breakdown = calculateReadinessScore(factors, config)

    expect(breakdown.totalAdditions).toBe(SCORING_ADDITIONS.BASELINE_ALIGNMENT)
  })

  it('clamps score to 0 minimum', () => {
    const factors: ReadinessFactors = {
      mvpBlockingCount: 10, // 200 points deduction
      mvpImportantCount: 0,
      knownUnknownsCount: 0,
      hasStrongContext: false,
      hasBaselineAlignment: false,
      totalGapsAnalyzed: 10,
    }
    const config = ReadinessConfigSchema.parse({})

    const breakdown = calculateReadinessScore(factors, config)

    expect(breakdown.finalScore).toBe(0)
  })

  it('clamps score to 100 maximum', () => {
    const factors: ReadinessFactors = {
      mvpBlockingCount: 0,
      mvpImportantCount: 0,
      knownUnknownsCount: 0,
      hasStrongContext: true,
      hasBaselineAlignment: true,
      totalGapsAnalyzed: 0,
    }
    const config = ReadinessConfigSchema.parse({})

    const breakdown = calculateReadinessScore(factors, config)

    expect(breakdown.finalScore).toBe(100)
  })

  it('respects custom configuration', () => {
    const factors: ReadinessFactors = {
      mvpBlockingCount: 1,
      mvpImportantCount: 0,
      knownUnknownsCount: 0,
      hasStrongContext: false,
      hasBaselineAlignment: false,
      totalGapsAnalyzed: 1,
    }
    const config = ReadinessConfigSchema.parse({
      mvpBlockingDeduction: 10, // Custom lower deduction
    })

    const breakdown = calculateReadinessScore(factors, config)

    expect(breakdown.totalDeductions).toBe(10)
    expect(breakdown.finalScore).toBe(90)
  })
})

describe('generateRecommendations', () => {
  it('generates critical recommendation for blocking gaps', () => {
    const factors: ReadinessFactors = {
      mvpBlockingCount: 2,
      mvpImportantCount: 0,
      knownUnknownsCount: 0,
      hasStrongContext: true,
      hasBaselineAlignment: true,
      totalGapsAnalyzed: 2,
    }
    const gaps: RankedGap[] = [
      createTestRankedGap({ id: 'RG-001', category: 'mvp_blocking' }),
      createTestRankedGap({ id: 'RG-002', category: 'mvp_blocking' }),
    ]
    const config = ReadinessConfigSchema.parse({})

    const recommendations = generateRecommendations(factors, gaps, config)

    expect(recommendations.length).toBeGreaterThan(0)
    expect(recommendations[0].severity).toBe('critical')
    expect(recommendations[0].relatedGapIds).toContain('RG-001')
    expect(recommendations[0].relatedGapIds).toContain('RG-002')
  })

  it('generates important recommendation for unknowns', () => {
    const factors: ReadinessFactors = {
      mvpBlockingCount: 0,
      mvpImportantCount: 0,
      knownUnknownsCount: 3,
      hasStrongContext: true,
      hasBaselineAlignment: true,
      totalGapsAnalyzed: 0,
    }
    const config = ReadinessConfigSchema.parse({})

    const recommendations = generateRecommendations(factors, null, config)

    const unknownRec = recommendations.find(r => r.description.includes('unknown'))
    expect(unknownRec).toBeDefined()
    expect(unknownRec?.severity).toBe('important')
  })

  it('generates suggestion for missing context', () => {
    const factors: ReadinessFactors = {
      mvpBlockingCount: 0,
      mvpImportantCount: 0,
      knownUnknownsCount: 0,
      hasStrongContext: false,
      hasBaselineAlignment: true,
      totalGapsAnalyzed: 0,
    }
    const config = ReadinessConfigSchema.parse({})

    const recommendations = generateRecommendations(factors, null, config)

    const contextRec = recommendations.find(r => r.description.includes('context'))
    expect(contextRec).toBeDefined()
    expect(contextRec?.severity).toBe('important')
  })

  it('limits recommendations to maxRecommendations', () => {
    const factors: ReadinessFactors = {
      mvpBlockingCount: 3,
      mvpImportantCount: 5,
      knownUnknownsCount: 4,
      hasStrongContext: false,
      hasBaselineAlignment: false,
      totalGapsAnalyzed: 8,
    }
    const config = ReadinessConfigSchema.parse({ maxRecommendations: 3 })

    const recommendations = generateRecommendations(factors, null, config)

    expect(recommendations.length).toBeLessThanOrEqual(3)
  })

  it('sorts recommendations by severity', () => {
    const factors: ReadinessFactors = {
      mvpBlockingCount: 1,
      mvpImportantCount: 2,
      knownUnknownsCount: 1,
      hasStrongContext: false,
      hasBaselineAlignment: false,
      totalGapsAnalyzed: 3,
    }
    const config = ReadinessConfigSchema.parse({})

    const recommendations = generateRecommendations(factors, null, config)

    // Critical should come first
    expect(recommendations[0].severity).toBe('critical')
  })
})

describe('generateSummary', () => {
  it('indicates ready status when score meets threshold', () => {
    const factors: ReadinessFactors = {
      mvpBlockingCount: 0,
      mvpImportantCount: 0,
      knownUnknownsCount: 0,
      hasStrongContext: true,
      hasBaselineAlignment: true,
      totalGapsAnalyzed: 0,
    }

    const summary = generateSummary(90, true, factors)

    expect(summary).toContain('READY')
    expect(summary).toContain('90/100')
  })

  it('indicates not ready when score below threshold', () => {
    const factors: ReadinessFactors = {
      mvpBlockingCount: 2,
      mvpImportantCount: 0,
      knownUnknownsCount: 0,
      hasStrongContext: false,
      hasBaselineAlignment: false,
      totalGapsAnalyzed: 2,
    }

    const summary = generateSummary(60, false, factors)

    expect(summary).toContain('NOT READY')
    expect(summary).toContain('60/100')
  })

  it('mentions blocking gaps when present', () => {
    const factors: ReadinessFactors = {
      mvpBlockingCount: 3,
      mvpImportantCount: 0,
      knownUnknownsCount: 0,
      hasStrongContext: false,
      hasBaselineAlignment: false,
      totalGapsAnalyzed: 3,
    }

    const summary = generateSummary(40, false, factors)

    expect(summary).toContain('3 MVP-blocking')
  })

  it('mentions unknowns when present', () => {
    const factors: ReadinessFactors = {
      mvpBlockingCount: 0,
      mvpImportantCount: 0,
      knownUnknownsCount: 2,
      hasStrongContext: false,
      hasBaselineAlignment: false,
      totalGapsAnalyzed: 0,
    }

    const summary = generateSummary(94, true, factors)

    expect(summary).toContain('2 known unknown')
  })

  it('mentions grounding status', () => {
    const wellGrounded: ReadinessFactors = {
      mvpBlockingCount: 0,
      mvpImportantCount: 0,
      knownUnknownsCount: 0,
      hasStrongContext: true,
      hasBaselineAlignment: true,
      totalGapsAnalyzed: 0,
    }

    const summary = generateSummary(100, true, wellGrounded)

    expect(summary).toContain('well-grounded')
  })
})

describe('determineConfidence', () => {
  it('returns high confidence with full data', () => {
    const factors: ReadinessFactors = {
      mvpBlockingCount: 0,
      mvpImportantCount: 0,
      knownUnknownsCount: 0,
      hasStrongContext: true,
      hasBaselineAlignment: true,
      totalGapsAnalyzed: 10,
    }

    expect(determineConfidence(factors, true)).toBe('high')
  })

  it('returns medium confidence with partial data', () => {
    const factors: ReadinessFactors = {
      mvpBlockingCount: 0,
      mvpImportantCount: 0,
      knownUnknownsCount: 0,
      hasStrongContext: true,
      hasBaselineAlignment: false,
      totalGapsAnalyzed: 2,
    }

    expect(determineConfidence(factors, true)).toBe('medium')
  })

  it('returns low confidence with minimal data', () => {
    const factors: ReadinessFactors = {
      mvpBlockingCount: 0,
      mvpImportantCount: 0,
      knownUnknownsCount: 0,
      hasStrongContext: false,
      hasBaselineAlignment: false,
      totalGapsAnalyzed: 0,
    }

    expect(determineConfidence(factors, false)).toBe('low')
  })
})

describe('generateReadinessAnalysis', () => {
  it('generates analysis from valid story structure', async () => {
    const story = createTestStoryStructure()
    const gaps: RankedGap[] = [
      createTestRankedGap({ id: 'RG-001', category: 'mvp_important' }),
    ]
    const baseline = createTestBaseline()
    const context = createTestContext()

    const result = await generateReadinessAnalysis(story, gaps, baseline, context)

    expect(result.analyzed).toBe(true)
    expect(result.readinessResult).not.toBeNull()
    expect(result.readinessResult?.storyId).toBe('flow-029')
  })

  it('handles missing story structure', async () => {
    const result = await generateReadinessAnalysis(null, null, null, null)

    expect(result.analyzed).toBe(false)
    expect(result.error).toContain('Story structure')
  })

  it('warns when no hygiene result available', async () => {
    const story = createTestStoryStructure()

    const result = await generateReadinessAnalysis(story, null, null, null)

    expect(result.analyzed).toBe(true)
    expect(result.warnings.some(w => w.toLowerCase().includes('gap') || w.toLowerCase().includes('hygiene') || w.toLowerCase().includes('scoring'))).toBe(true)
  })

  it('calculates score correctly with blocking gaps', async () => {
    const story = createTestStoryStructure()
    const gaps: RankedGap[] = [
      createTestRankedGap({ id: 'RG-001', category: 'mvp_blocking' }),
      createTestRankedGap({ id: 'RG-002', category: 'mvp_blocking' }),
    ]

    const result = await generateReadinessAnalysis(story, gaps, null, null)

    expect(result.readinessResult?.score).toBeLessThan(READINESS_THRESHOLD)
    expect(result.readinessResult?.ready).toBe(false)
  })

  it('marks as ready when score meets threshold', async () => {
    const story = createTestStoryStructure()
    const baseline = createTestBaseline()
    const context = createTestContext()

    const result = await generateReadinessAnalysis(story, [], baseline, context)

    expect(result.readinessResult?.score).toBeGreaterThanOrEqual(READINESS_THRESHOLD)
    expect(result.readinessResult?.ready).toBe(true)
  })

  it('respects custom threshold', async () => {
    const story = createTestStoryStructure()
    const gaps: RankedGap[] = [
      createTestRankedGap({ id: 'RG-001', category: 'mvp_important' }),
    ]

    const resultHighThreshold = await generateReadinessAnalysis(story, gaps, null, null, {
      threshold: 99,
    })

    expect(resultHighThreshold.readinessResult?.ready).toBe(false)

    const resultLowThreshold = await generateReadinessAnalysis(story, gaps, null, null, {
      threshold: 50,
    })

    expect(resultLowThreshold.readinessResult?.ready).toBe(true)
  })

  it('generates appropriate recommendations', async () => {
    const story = createTestStoryStructure({
      description: 'TBD feature',
    })
    const gaps: RankedGap[] = [
      createTestRankedGap({ id: 'RG-001', category: 'mvp_blocking' }),
    ]

    const result = await generateReadinessAnalysis(story, gaps, null, null)

    expect(result.readinessResult?.recommendations.length).toBeGreaterThan(0)
    expect(result.readinessResult?.recommendations[0].severity).toBe('critical')
  })

  it('includes factors in result', async () => {
    const story = createTestStoryStructure()
    const gaps: RankedGap[] = [
      createTestRankedGap({ id: 'RG-001', category: 'mvp_blocking' }),
      createTestRankedGap({ id: 'RG-002', category: 'mvp_important' }),
    ]
    const baseline = createTestBaseline()

    const result = await generateReadinessAnalysis(story, gaps, baseline, null)

    expect(result.readinessResult?.factors.mvpBlockingCount).toBe(1)
    expect(result.readinessResult?.factors.mvpImportantCount).toBe(1)
    expect(result.readinessResult?.factors.hasBaselineAlignment).toBe(true)
  })
})

describe('ReadinessFactorsSchema validation', () => {
  it('validates complete factors', () => {
    const factors = {
      mvpBlockingCount: 2,
      mvpImportantCount: 3,
      knownUnknownsCount: 1,
      hasStrongContext: true,
      hasBaselineAlignment: true,
      totalGapsAnalyzed: 5,
      acCoverage: 0.8,
    }

    expect(() => ReadinessFactorsSchema.parse(factors)).not.toThrow()
  })

  it('rejects negative counts', () => {
    const factors = {
      mvpBlockingCount: -1,
      mvpImportantCount: 0,
      knownUnknownsCount: 0,
      hasStrongContext: false,
      hasBaselineAlignment: false,
      totalGapsAnalyzed: 0,
    }

    expect(() => ReadinessFactorsSchema.parse(factors)).toThrow()
  })
})

describe('ScoreAdjustmentSchema validation', () => {
  it('validates deduction', () => {
    const adjustment = {
      reason: 'MVP-blocking gap found',
      points: -20,
      category: 'blocker',
    }

    expect(() => ScoreAdjustmentSchema.parse(adjustment)).not.toThrow()
  })

  it('validates addition', () => {
    const adjustment = {
      reason: 'Strong context',
      points: 5,
      category: 'context',
    }

    expect(() => ScoreAdjustmentSchema.parse(adjustment)).not.toThrow()
  })
})

describe('ScoreBreakdownSchema validation', () => {
  it('validates complete breakdown', () => {
    const breakdown = {
      baseScore: 100,
      deductions: [
        { reason: 'Blocking gap', points: -20, category: 'blocker' },
      ],
      additions: [
        { reason: 'Context bonus', points: 5, category: 'context' },
      ],
      totalDeductions: 20,
      totalAdditions: 5,
      finalScore: 85,
    }

    expect(() => ScoreBreakdownSchema.parse(breakdown)).not.toThrow()
  })

  it('requires baseScore to be 100', () => {
    const breakdown = {
      baseScore: 90,
      deductions: [],
      additions: [],
      totalDeductions: 0,
      totalAdditions: 0,
      finalScore: 90,
    }

    expect(() => ScoreBreakdownSchema.parse(breakdown)).toThrow()
  })
})

describe('ReadinessRecommendationSchema validation', () => {
  it('validates complete recommendation', () => {
    const recommendation = {
      id: 'REC-001',
      severity: 'critical',
      description: 'Address blocking gaps',
      expectedPointsGain: 20,
      relatedGapIds: ['RG-001', 'RG-002'],
    }

    expect(() => ReadinessRecommendationSchema.parse(recommendation)).not.toThrow()
  })

  it('validates all severity levels', () => {
    const severities = ['critical', 'important', 'suggestion'] as const

    for (const severity of severities) {
      const recommendation = {
        id: 'REC-001',
        severity,
        description: 'Test recommendation',
        expectedPointsGain: 5,
      }

      expect(() => ReadinessRecommendationSchema.parse(recommendation)).not.toThrow()
    }
  })
})

describe('ReadinessResultSchema validation', () => {
  it('validates complete result', () => {
    const result = {
      storyId: 'flow-029',
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
        mvpImportantCount: 3,
        knownUnknownsCount: 0,
        hasStrongContext: false,
        hasBaselineAlignment: false,
        totalGapsAnalyzed: 3,
      },
      recommendations: [],
      summary: 'Story is ready',
      confidence: 'high',
    }

    expect(() => ReadinessResultSchema.parse(result)).not.toThrow()
  })

  it('validates score range', () => {
    const validScores = [0, 50, 100]
    const invalidScores = [-1, 101]

    for (const score of validScores) {
      const result = {
        storyId: 'flow-029',
        analyzedAt: new Date().toISOString(),
        score,
        breakdown: {
          baseScore: 100,
          deductions: [],
          additions: [],
          totalDeductions: 100 - score,
          totalAdditions: 0,
          finalScore: score,
        },
        ready: score >= 85,
        threshold: 85,
        factors: {
          mvpBlockingCount: 0,
          mvpImportantCount: 0,
          knownUnknownsCount: 0,
          hasStrongContext: false,
          hasBaselineAlignment: false,
          totalGapsAnalyzed: 0,
        },
        recommendations: [],
        summary: 'Test',
        confidence: 'medium',
      }

      expect(() => ReadinessResultSchema.parse(result)).not.toThrow()
    }

    for (const score of invalidScores) {
      const result = {
        storyId: 'flow-029',
        analyzedAt: new Date().toISOString(),
        score,
        breakdown: {
          baseScore: 100,
          deductions: [],
          additions: [],
          totalDeductions: 0,
          totalAdditions: 0,
          finalScore: score,
        },
        ready: false,
        threshold: 85,
        factors: {
          mvpBlockingCount: 0,
          mvpImportantCount: 0,
          knownUnknownsCount: 0,
          hasStrongContext: false,
          hasBaselineAlignment: false,
          totalGapsAnalyzed: 0,
        },
        recommendations: [],
        summary: 'Test',
        confidence: 'low',
      }

      expect(() => ReadinessResultSchema.parse(result)).toThrow()
    }
  })
})

describe('ReadinessConfigSchema validation', () => {
  it('applies default values', () => {
    const config = ReadinessConfigSchema.parse({})

    expect(config.threshold).toBe(READINESS_THRESHOLD)
    expect(config.mvpBlockingDeduction).toBe(SCORING_DEDUCTIONS.PER_MVP_BLOCKING_GAP)
    expect(config.mvpImportantDeduction).toBe(SCORING_DEDUCTIONS.PER_MVP_IMPORTANT_GAP)
    expect(config.unknownDeduction).toBe(SCORING_DEDUCTIONS.PER_KNOWN_UNKNOWN)
    expect(config.contextBonus).toBe(SCORING_ADDITIONS.STRONG_CONTEXT)
    expect(config.baselineBonus).toBe(SCORING_ADDITIONS.BASELINE_ALIGNMENT)
    expect(config.maxRecommendations).toBe(5)
  })

  it('validates custom config', () => {
    const config = {
      threshold: 90,
      mvpBlockingDeduction: 25,
      mvpImportantDeduction: 10,
      unknownDeduction: 5,
      contextBonus: 10,
      baselineBonus: 10,
      maxRecommendations: 10,
    }

    const parsed = ReadinessConfigSchema.parse(config)

    expect(parsed.threshold).toBe(90)
    expect(parsed.mvpBlockingDeduction).toBe(25)
  })

  it('validates threshold range', () => {
    expect(() => ReadinessConfigSchema.parse({ threshold: -1 })).toThrow()
    expect(() => ReadinessConfigSchema.parse({ threshold: 101 })).toThrow()
    expect(() => ReadinessConfigSchema.parse({ threshold: 0 })).not.toThrow()
    expect(() => ReadinessConfigSchema.parse({ threshold: 100 })).not.toThrow()
  })
})

describe('ReadinessScoreResultSchema validation', () => {
  it('validates successful result', () => {
    const result = {
      readinessResult: {
        storyId: 'flow-029',
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
          mvpImportantCount: 0,
          knownUnknownsCount: 0,
          hasStrongContext: false,
          hasBaselineAlignment: false,
          totalGapsAnalyzed: 0,
        },
        recommendations: [],
        summary: 'Ready',
        confidence: 'high',
      },
      analyzed: true,
      warnings: [],
    }

    expect(() => ReadinessScoreResultSchema.parse(result)).not.toThrow()
  })

  it('validates failed result', () => {
    const result = {
      readinessResult: null,
      analyzed: false,
      error: 'Story structure is required',
      warnings: ['Additional warning'],
    }

    expect(() => ReadinessScoreResultSchema.parse(result)).not.toThrow()
  })
})

describe('Constants', () => {
  it('has correct readiness threshold', () => {
    expect(READINESS_THRESHOLD).toBe(85)
  })

  it('has correct scoring deductions', () => {
    expect(SCORING_DEDUCTIONS.PER_MVP_BLOCKING_GAP).toBe(20)
    expect(SCORING_DEDUCTIONS.PER_MVP_IMPORTANT_GAP).toBe(5)
    expect(SCORING_DEDUCTIONS.PER_KNOWN_UNKNOWN).toBe(3)
  })

  it('has correct scoring additions', () => {
    expect(SCORING_ADDITIONS.STRONG_CONTEXT).toBe(5)
    expect(SCORING_ADDITIONS.BASELINE_ALIGNMENT).toBe(5)
  })
})
