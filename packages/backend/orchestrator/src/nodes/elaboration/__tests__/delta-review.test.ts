import { describe, expect, it, vi } from 'vitest'
import type { SynthesizedStory } from '../../story/synthesize.js'
import type { DeltaDetectionResult, SectionChange, SectionName } from '../delta-detect.js'
import {
  reviewSection,
  aggregateFindings,
  performDeltaReview,
  ReviewSeveritySchema,
  ReviewCategorySchema,
  ReviewFindingSchema,
  SectionReviewSummarySchema,
  DeltaReviewResultSchema,
  DeltaReviewConfigSchema,
  DeltaReviewNodeResultSchema,
  type DeltaReviewConfig,
  type ReviewFinding,
  type SectionReviewContext,
} from '../delta-review.js'

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
  storyId: 'flow-032',
  title: 'Test Story',
  description: 'Test description',
  domain: 'orchestrator',
  synthesizedAt: new Date().toISOString(),
  acceptanceCriteria: [
    {
      id: 'AC-1',
      description: 'First acceptance criterion with clear requirements',
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
      description: 'Test hint 1 with detailed description of the test scenario',
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

const createTestDeltaResult = (
  overrides: Partial<DeltaDetectionResult> = {},
): DeltaDetectionResult => ({
  storyId: 'flow-032',
  detectedAt: new Date().toISOString(),
  previousIteration: 0,
  currentIteration: 1,
  changes: [
    {
      itemId: 'AC-1',
      section: 'acceptanceCriteria',
      changeType: 'added',
      oldContent: null,
      newContent: 'First acceptance criterion with clear requirements',
      fieldChanges: [],
      significance: 8,
    },
  ],
  stats: {
    totalChanges: 1,
    addedCount: 1,
    modifiedCount: 0,
    removedCount: 0,
    unchangedCount: 0,
    changesBySection: { acceptanceCriteria: 1 },
    averageSignificance: 8,
    hasSubstantialChanges: false,
  },
  summary: 'Detected 1 change',
  detected: true,
  ...overrides,
})

describe('ReviewSeveritySchema validation', () => {
  it('validates all severity levels', () => {
    const levels = ['critical', 'major', 'minor', 'info']

    for (const level of levels) {
      expect(() => ReviewSeveritySchema.parse(level)).not.toThrow()
    }
  })

  it('rejects invalid severity', () => {
    expect(() => ReviewSeveritySchema.parse('warning')).toThrow()
  })
})

describe('ReviewCategorySchema validation', () => {
  it('validates all categories', () => {
    const categories = [
      'clarity',
      'completeness',
      'consistency',
      'testability',
      'scope',
      'feasibility',
      'dependency',
      'risk',
    ]

    for (const category of categories) {
      expect(() => ReviewCategorySchema.parse(category)).not.toThrow()
    }
  })

  it('rejects invalid category', () => {
    expect(() => ReviewCategorySchema.parse('invalid')).toThrow()
  })
})

describe('ReviewFindingSchema validation', () => {
  it('validates complete finding', () => {
    const finding = {
      id: 'RF-1',
      section: 'acceptanceCriteria',
      itemId: 'AC-1',
      severity: 'major',
      category: 'clarity',
      issue: 'The AC lacks specific criteria',
      recommendation: 'Add measurable criteria',
      deltaRelated: true,
      changeType: 'modified',
      context: 'Some context',
    }

    expect(() => ReviewFindingSchema.parse(finding)).not.toThrow()
  })

  it('validates minimal finding', () => {
    const finding = {
      id: 'RF-1',
      section: 'acceptanceCriteria',
      itemId: 'AC-1',
      severity: 'minor',
      category: 'clarity',
      issue: 'Issue description',
      recommendation: 'Recommendation',
    }

    const parsed = ReviewFindingSchema.parse(finding)
    expect(parsed.deltaRelated).toBe(true)
    expect(parsed.changeType).toBeUndefined()
    expect(parsed.context).toBeUndefined()
  })
})

describe('SectionReviewSummarySchema validation', () => {
  it('validates complete summary', () => {
    const summary = {
      section: 'acceptanceCriteria',
      itemsReviewed: 5,
      findingsCount: 2,
      passed: true,
      note: 'Some notes',
    }

    expect(() => SectionReviewSummarySchema.parse(summary)).not.toThrow()
  })

  it('validates minimal summary', () => {
    const summary = {
      section: 'testHints',
      itemsReviewed: 0,
      findingsCount: 0,
      passed: true,
    }

    const parsed = SectionReviewSummarySchema.parse(summary)
    expect(parsed.note).toBeUndefined()
  })
})

describe('DeltaReviewResultSchema validation', () => {
  it('validates complete result', () => {
    const result = {
      storyId: 'flow-032',
      reviewedAt: new Date().toISOString(),
      findings: [
        {
          id: 'RF-1',
          section: 'acceptanceCriteria',
          itemId: 'AC-1',
          severity: 'minor',
          category: 'clarity',
          issue: 'Issue',
          recommendation: 'Fix it',
        },
      ],
      sectionsReviewed: ['acceptanceCriteria'],
      sectionsSkipped: ['nonGoals', 'testHints'],
      sectionSummaries: [
        {
          section: 'acceptanceCriteria',
          itemsReviewed: 2,
          findingsCount: 1,
          passed: true,
        },
      ],
      passed: true,
      findingsBySeverity: {
        critical: 0,
        major: 0,
        minor: 1,
        info: 0,
      },
      summary: 'Review summary',
      reviewed: true,
    }

    expect(() => DeltaReviewResultSchema.parse(result)).not.toThrow()
  })

  it('validates failed result', () => {
    const result = {
      storyId: 'flow-032',
      reviewedAt: new Date().toISOString(),
      findings: [],
      sectionsReviewed: [],
      sectionsSkipped: [],
      sectionSummaries: [],
      passed: false,
      findingsBySeverity: {
        critical: 0,
        major: 0,
        minor: 0,
        info: 0,
      },
      summary: 'Review failed',
      reviewed: false,
      error: 'Error message',
    }

    expect(() => DeltaReviewResultSchema.parse(result)).not.toThrow()
  })

  it('validates story ID format', () => {
    const base = {
      reviewedAt: new Date().toISOString(),
      findings: [],
      sectionsReviewed: [],
      sectionsSkipped: [],
      sectionSummaries: [],
      passed: true,
      findingsBySeverity: { critical: 0, major: 0, minor: 0, info: 0 },
      summary: 'Test',
      reviewed: true,
    }

    expect(() => DeltaReviewResultSchema.parse({ ...base, storyId: 'flow-032' })).not.toThrow()
    expect(() => DeltaReviewResultSchema.parse({ ...base, storyId: 'FLOW-001' })).not.toThrow()
    expect(() => DeltaReviewResultSchema.parse({ ...base, storyId: 'invalid' })).toThrow()
  })
})

describe('DeltaReviewConfigSchema validation', () => {
  it('applies default values', () => {
    const config = DeltaReviewConfigSchema.parse({})

    expect(config.minSeverity).toBe('info')
    expect(config.reviewAdded).toBe(true)
    expect(config.reviewModified).toBe(true)
    expect(config.reviewRemoved).toBe(true)
    expect(config.maxFindingsPerSection).toBe(10)
    expect(config.failOnCritical).toBe(true)
    expect(config.failOnMajor).toBe(false)
  })

  it('validates custom config', () => {
    const config = {
      minSeverity: 'major',
      reviewAdded: false,
      reviewModified: true,
      reviewRemoved: false,
      maxFindingsPerSection: 5,
      failOnCritical: true,
      failOnMajor: true,
    }

    const parsed = DeltaReviewConfigSchema.parse(config)
    expect(parsed.minSeverity).toBe('major')
    expect(parsed.reviewAdded).toBe(false)
    expect(parsed.failOnMajor).toBe(true)
  })
})

describe('DeltaReviewNodeResultSchema validation', () => {
  it('validates successful result', () => {
    const result = {
      deltaReviewResult: {
        storyId: 'flow-032',
        reviewedAt: new Date().toISOString(),
        findings: [],
        sectionsReviewed: [],
        sectionsSkipped: [],
        sectionSummaries: [],
        passed: true,
        findingsBySeverity: { critical: 0, major: 0, minor: 0, info: 0 },
        summary: 'No issues',
        reviewed: true,
      },
      deltaReviewed: true,
    }

    expect(() => DeltaReviewNodeResultSchema.parse(result)).not.toThrow()
  })

  it('validates failed result', () => {
    const result = {
      deltaReviewResult: null,
      deltaReviewed: false,
      error: 'Missing delta detection result',
    }

    expect(() => DeltaReviewNodeResultSchema.parse(result)).not.toThrow()
  })
})

describe('reviewSection', () => {
  const defaultConfig = DeltaReviewConfigSchema.parse({})

  it('returns empty findings for unchanged sections', () => {
    const story = createTestSynthesizedStory()
    const context: SectionReviewContext = {
      story,
      changes: [
        {
          itemId: 'AC-1',
          section: 'acceptanceCriteria',
          changeType: 'unchanged',
          oldContent: 'Same',
          newContent: 'Same',
          fieldChanges: [],
          significance: 1,
        },
      ],
      config: defaultConfig,
    }

    const findings = reviewSection('acceptanceCriteria', story.acceptanceCriteria, context)

    expect(findings.length).toBe(0)
  })

  it('detects vague language in ACs', () => {
    const story = createTestSynthesizedStory({
      acceptanceCriteria: [
        {
          id: 'AC-1',
          description: 'The system should handle the request appropriately',
          fromBaseline: false,
          enhancedFromGaps: false,
          relatedGapIds: [],
          priority: 1,
        },
      ],
    })
    const context: SectionReviewContext = {
      story,
      changes: [
        {
          itemId: 'AC-1',
          section: 'acceptanceCriteria',
          changeType: 'added',
          oldContent: null,
          newContent: 'The system should handle the request appropriately',
          fieldChanges: [],
          significance: 8,
        },
      ],
      config: defaultConfig,
    }

    const findings = reviewSection('acceptanceCriteria', story.acceptanceCriteria, context)

    expect(findings.some(f => f.category === 'clarity')).toBe(true)
    expect(findings.some(f => f.issue.includes('vague'))).toBe(true)
  })

  it('detects TBD/placeholder content', () => {
    const story = createTestSynthesizedStory({
      acceptanceCriteria: [
        {
          id: 'AC-1',
          description: 'The system handles TBD cases',
          fromBaseline: false,
          enhancedFromGaps: false,
          relatedGapIds: [],
          priority: 1,
        },
      ],
    })
    const context: SectionReviewContext = {
      story,
      changes: [
        {
          itemId: 'AC-1',
          section: 'acceptanceCriteria',
          changeType: 'added',
          oldContent: null,
          newContent: 'The system handles TBD cases',
          fieldChanges: [],
          significance: 8,
        },
      ],
      config: defaultConfig,
    }

    const findings = reviewSection('acceptanceCriteria', story.acceptanceCriteria, context)

    expect(findings.some(f => f.severity === 'critical')).toBe(true)
    expect(findings.some(f => f.issue.includes('placeholder'))).toBe(true)
  })

  it('detects overly long ACs', () => {
    const longDescription = 'A'.repeat(350)
    const story = createTestSynthesizedStory({
      acceptanceCriteria: [
        {
          id: 'AC-1',
          description: longDescription,
          fromBaseline: false,
          enhancedFromGaps: false,
          relatedGapIds: [],
          priority: 1,
        },
      ],
    })
    const context: SectionReviewContext = {
      story,
      changes: [
        {
          itemId: 'AC-1',
          section: 'acceptanceCriteria',
          changeType: 'added',
          oldContent: null,
          newContent: longDescription,
          fieldChanges: [],
          significance: 8,
        },
      ],
      config: defaultConfig,
    }

    const findings = reviewSection('acceptanceCriteria', story.acceptanceCriteria, context)

    expect(findings.some(f => f.issue.includes('long'))).toBe(true)
  })

  it('flags removed ACs for verification', () => {
    const story = createTestSynthesizedStory()
    const context: SectionReviewContext = {
      story,
      changes: [
        {
          itemId: 'AC-1',
          section: 'acceptanceCriteria',
          changeType: 'removed',
          oldContent: 'Removed criterion',
          newContent: null,
          fieldChanges: [],
          significance: 9,
        },
      ],
      config: defaultConfig,
    }

    const findings = reviewSection('acceptanceCriteria', story.acceptanceCriteria, context)

    expect(findings.some(f => f.changeType === 'removed')).toBe(true)
    expect(findings.some(f => f.category === 'scope')).toBe(true)
  })

  it('respects reviewRemoved config option', () => {
    const story = createTestSynthesizedStory()
    const config = DeltaReviewConfigSchema.parse({ reviewRemoved: false })
    const context: SectionReviewContext = {
      story,
      changes: [
        {
          itemId: 'AC-1',
          section: 'acceptanceCriteria',
          changeType: 'removed',
          oldContent: 'Removed criterion',
          newContent: null,
          fieldChanges: [],
          significance: 9,
        },
      ],
      config,
    }

    const findings = reviewSection('acceptanceCriteria', story.acceptanceCriteria, context)

    expect(findings.length).toBe(0)
  })

  it('respects maxFindingsPerSection config', () => {
    const story = createTestSynthesizedStory({
      acceptanceCriteria: Array.from({ length: 5 }, (_, i) => ({
        id: `AC-${i + 1}`,
        description: 'This should be handled appropriately with TBD cases',
        fromBaseline: false,
        enhancedFromGaps: false,
        relatedGapIds: [],
        priority: 1,
      })),
    })
    const config = DeltaReviewConfigSchema.parse({ maxFindingsPerSection: 2 })
    const context: SectionReviewContext = {
      story,
      changes: Array.from({ length: 5 }, (_, i) => ({
        itemId: `AC-${i + 1}`,
        section: 'acceptanceCriteria' as const,
        changeType: 'added' as const,
        oldContent: null,
        newContent: 'This should be handled appropriately with TBD cases',
        fieldChanges: [],
        significance: 8,
      })),
      config,
    }

    const findings = reviewSection('acceptanceCriteria', story.acceptanceCriteria, context)

    expect(findings.length).toBeLessThanOrEqual(2)
  })

  it('reviews test hints for brevity', () => {
    const story = createTestSynthesizedStory({
      testHints: [
        {
          id: 'TH-1',
          description: 'Test',
          category: 'unit',
          priority: 1,
        },
      ],
    })
    const context: SectionReviewContext = {
      story,
      changes: [
        {
          itemId: 'TH-1',
          section: 'testHints',
          changeType: 'added',
          oldContent: null,
          newContent: 'Test',
          fieldChanges: [],
          significance: 5,
        },
      ],
      config: defaultConfig,
    }

    const findings = reviewSection('testHints', story.testHints, context)

    expect(findings.some(f => f.category === 'testability')).toBe(true)
  })

  it('flags blocking known unknowns as critical', () => {
    const story = createTestSynthesizedStory({
      knownUnknowns: [
        {
          id: 'KU-1',
          description: 'Blocking unknown',
          source: 'story_content',
          impact: 'blocking',
        },
      ],
    })
    const context: SectionReviewContext = {
      story,
      changes: [
        {
          itemId: 'KU-1',
          section: 'knownUnknowns',
          changeType: 'added',
          oldContent: null,
          newContent: 'Blocking unknown',
          fieldChanges: [],
          significance: 10,
        },
      ],
      config: defaultConfig,
    }

    const findings = reviewSection('knownUnknowns', story.knownUnknowns, context)

    expect(findings.some(f => f.severity === 'critical')).toBe(true)
    expect(findings.some(f => f.category === 'risk')).toBe(true)
  })

  it('flags removed constraints for verification', () => {
    const story = createTestSynthesizedStory()
    const context: SectionReviewContext = {
      story,
      changes: [
        {
          itemId: 'item-0',
          section: 'constraints',
          changeType: 'removed',
          oldContent: 'Important constraint',
          newContent: null,
          fieldChanges: [],
          significance: 6,
        },
      ],
      config: defaultConfig,
    }

    const findings = reviewSection('constraints', story.constraints, context)

    expect(findings.some(f => f.severity === 'major')).toBe(true)
    expect(findings.some(f => f.category === 'consistency')).toBe(true)
  })

  it('flags removed non-goals for scope creep', () => {
    const story = createTestSynthesizedStory()
    const context: SectionReviewContext = {
      story,
      changes: [
        {
          itemId: 'NG-1',
          section: 'nonGoals',
          changeType: 'removed',
          oldContent: 'Non-goal',
          newContent: null,
          fieldChanges: [],
          significance: 6,
        },
      ],
      config: defaultConfig,
    }

    const findings = reviewSection('nonGoals', story.nonGoals, context)

    expect(findings.some(f => f.category === 'scope')).toBe(true)
  })

  it('returns empty for affectedFiles section', () => {
    const story = createTestSynthesizedStory()
    const context: SectionReviewContext = {
      story,
      changes: [
        {
          itemId: 'item-0',
          section: 'affectedFiles',
          changeType: 'added',
          oldContent: null,
          newContent: 'newfile.ts',
          fieldChanges: [],
          significance: 4,
        },
      ],
      config: defaultConfig,
    }

    const findings = reviewSection('affectedFiles', story.affectedFiles, context)

    expect(findings.length).toBe(0)
  })

  it('returns empty for dependencies section', () => {
    const story = createTestSynthesizedStory()
    const context: SectionReviewContext = {
      story,
      changes: [
        {
          itemId: 'item-0',
          section: 'dependencies',
          changeType: 'added',
          oldContent: null,
          newContent: 'new-dep',
          fieldChanges: [],
          significance: 5,
        },
      ],
      config: defaultConfig,
    }

    const findings = reviewSection('dependencies', story.dependencies, context)

    expect(findings.length).toBe(0)
  })
})

describe('aggregateFindings', () => {
  const defaultConfig = DeltaReviewConfigSchema.parse({})

  it('combines findings from multiple sections', () => {
    const sectionFindings = new Map<SectionName, ReviewFinding[]>([
      [
        'acceptanceCriteria',
        [
          {
            id: 'RF-1',
            section: 'acceptanceCriteria',
            itemId: 'AC-1',
            severity: 'minor',
            category: 'clarity',
            issue: 'Issue 1',
            recommendation: 'Fix 1',
            deltaRelated: true,
          },
        ],
      ],
      [
        'testHints',
        [
          {
            id: 'RF-2',
            section: 'testHints',
            itemId: 'TH-1',
            severity: 'minor',
            category: 'testability',
            issue: 'Issue 2',
            recommendation: 'Fix 2',
            deltaRelated: true,
          },
        ],
      ],
    ])

    const aggregated = aggregateFindings(sectionFindings, defaultConfig)

    expect(aggregated.length).toBe(2)
  })

  it('renumbers findings sequentially', () => {
    const sectionFindings = new Map<SectionName, ReviewFinding[]>([
      [
        'acceptanceCriteria',
        [
          {
            id: 'RF-5',
            section: 'acceptanceCriteria',
            itemId: 'AC-1',
            severity: 'minor',
            category: 'clarity',
            issue: 'Issue 1',
            recommendation: 'Fix 1',
            deltaRelated: true,
          },
          {
            id: 'RF-10',
            section: 'acceptanceCriteria',
            itemId: 'AC-2',
            severity: 'major',
            category: 'completeness',
            issue: 'Issue 2',
            recommendation: 'Fix 2',
            deltaRelated: true,
          },
        ],
      ],
    ])

    const aggregated = aggregateFindings(sectionFindings, defaultConfig)

    expect(aggregated[0].id).toBe('RF-1')
    expect(aggregated[1].id).toBe('RF-2')
  })

  it('filters by minimum severity', () => {
    const config = DeltaReviewConfigSchema.parse({ minSeverity: 'major' })
    const sectionFindings = new Map<SectionName, ReviewFinding[]>([
      [
        'acceptanceCriteria',
        [
          {
            id: 'RF-1',
            section: 'acceptanceCriteria',
            itemId: 'AC-1',
            severity: 'minor',
            category: 'clarity',
            issue: 'Minor issue',
            recommendation: 'Fix minor',
            deltaRelated: true,
          },
          {
            id: 'RF-2',
            section: 'acceptanceCriteria',
            itemId: 'AC-2',
            severity: 'major',
            category: 'completeness',
            issue: 'Major issue',
            recommendation: 'Fix major',
            deltaRelated: true,
          },
          {
            id: 'RF-3',
            section: 'acceptanceCriteria',
            itemId: 'AC-3',
            severity: 'critical',
            category: 'completeness',
            issue: 'Critical issue',
            recommendation: 'Fix critical',
            deltaRelated: true,
          },
        ],
      ],
    ])

    const aggregated = aggregateFindings(sectionFindings, config)

    expect(aggregated.length).toBe(2)
    expect(aggregated.every(f => f.severity === 'major' || f.severity === 'critical')).toBe(true)
  })

  it('handles empty findings', () => {
    const sectionFindings = new Map<SectionName, ReviewFinding[]>()

    const aggregated = aggregateFindings(sectionFindings, defaultConfig)

    expect(aggregated.length).toBe(0)
  })
})

describe('performDeltaReview', () => {
  it('reviews changed sections', async () => {
    const story = createTestSynthesizedStory()
    const deltaResult = createTestDeltaResult()

    const result = await performDeltaReview(deltaResult, story)

    expect(result.reviewed).toBe(true)
    expect(result.sectionsReviewed).toContain('acceptanceCriteria')
  })

  it('skips unchanged sections', async () => {
    const story = createTestSynthesizedStory()
    const deltaResult = createTestDeltaResult({
      changes: [
        {
          itemId: 'AC-1',
          section: 'acceptanceCriteria',
          changeType: 'added',
          oldContent: null,
          newContent: 'Clear AC',
          fieldChanges: [],
          significance: 8,
        },
      ],
    })

    const result = await performDeltaReview(deltaResult, story)

    expect(result.sectionsSkipped).toContain('nonGoals')
    expect(result.sectionsSkipped).toContain('testHints')
  })

  it('passes when no critical/major findings with default config', async () => {
    const story = createTestSynthesizedStory()
    const deltaResult = createTestDeltaResult({
      changes: [
        {
          itemId: 'AC-1',
          section: 'acceptanceCriteria',
          changeType: 'added',
          oldContent: null,
          newContent: 'Clear and specific acceptance criterion',
          fieldChanges: [],
          significance: 8,
        },
      ],
    })

    const result = await performDeltaReview(deltaResult, story)

    expect(result.passed).toBe(true)
  })

  it('fails when critical findings exist', async () => {
    const story = createTestSynthesizedStory({
      acceptanceCriteria: [
        {
          id: 'AC-1',
          description: 'Handle TBD cases',
          fromBaseline: false,
          enhancedFromGaps: false,
          relatedGapIds: [],
          priority: 1,
        },
      ],
    })
    const deltaResult = createTestDeltaResult({
      changes: [
        {
          itemId: 'AC-1',
          section: 'acceptanceCriteria',
          changeType: 'added',
          oldContent: null,
          newContent: 'Handle TBD cases',
          fieldChanges: [],
          significance: 8,
        },
      ],
    })

    const result = await performDeltaReview(deltaResult, story)

    expect(result.passed).toBe(false)
    expect(result.findingsBySeverity.critical).toBeGreaterThan(0)
  })

  it('respects failOnMajor config', async () => {
    const story = createTestSynthesizedStory()
    const deltaResult = createTestDeltaResult({
      changes: [
        {
          itemId: 'AC-1',
          section: 'acceptanceCriteria',
          changeType: 'removed',
          oldContent: 'Removed AC',
          newContent: null,
          fieldChanges: [],
          significance: 9,
        },
      ],
    })
    const config: Partial<DeltaReviewConfig> = { failOnMajor: true }

    const result = await performDeltaReview(deltaResult, story, config)

    expect(result.passed).toBe(false)
    expect(result.findingsBySeverity.major).toBeGreaterThan(0)
  })

  it('calculates findings by severity correctly', async () => {
    const story = createTestSynthesizedStory({
      acceptanceCriteria: [
        {
          id: 'AC-1',
          description: 'TBD placeholder',
          fromBaseline: false,
          enhancedFromGaps: false,
          relatedGapIds: [],
          priority: 1,
        },
      ],
    })
    const deltaResult = createTestDeltaResult({
      changes: [
        {
          itemId: 'AC-1',
          section: 'acceptanceCriteria',
          changeType: 'added',
          oldContent: null,
          newContent: 'TBD placeholder',
          fieldChanges: [],
          significance: 8,
        },
        {
          itemId: 'AC-2',
          section: 'acceptanceCriteria',
          changeType: 'removed',
          oldContent: 'Removed',
          newContent: null,
          fieldChanges: [],
          significance: 9,
        },
      ],
    })

    const result = await performDeltaReview(deltaResult, story)

    expect(result.findingsBySeverity.critical).toBeGreaterThanOrEqual(1)
    expect(result.findingsBySeverity.major).toBeGreaterThanOrEqual(1)
  })

  it('creates section summaries', async () => {
    const story = createTestSynthesizedStory()
    const deltaResult = createTestDeltaResult()

    const result = await performDeltaReview(deltaResult, story)

    expect(result.sectionSummaries.length).toBeGreaterThan(0)
    expect(result.sectionSummaries[0]).toHaveProperty('section')
    expect(result.sectionSummaries[0]).toHaveProperty('itemsReviewed')
    expect(result.sectionSummaries[0]).toHaveProperty('findingsCount')
    expect(result.sectionSummaries[0]).toHaveProperty('passed')
  })

  it('generates meaningful summary', async () => {
    const story = createTestSynthesizedStory()
    const deltaResult = createTestDeltaResult()

    const result = await performDeltaReview(deltaResult, story)

    expect(result.summary).toContain(story.storyId)
    expect(result.summary.length).toBeGreaterThan(0)
  })

  it('handles no changes to review', async () => {
    const story = createTestSynthesizedStory()
    const deltaResult = createTestDeltaResult({
      changes: [],
      stats: {
        totalChanges: 0,
        addedCount: 0,
        modifiedCount: 0,
        removedCount: 0,
        unchangedCount: 5,
        changesBySection: {},
        averageSignificance: 0,
        hasSubstantialChanges: false,
      },
    })

    const result = await performDeltaReview(deltaResult, story)

    expect(result.reviewed).toBe(true)
    expect(result.sectionsReviewed.length).toBe(0)
    expect(result.passed).toBe(true)
  })

  it('validates result against schema', async () => {
    const story = createTestSynthesizedStory()
    const deltaResult = createTestDeltaResult()

    const result = await performDeltaReview(deltaResult, story)

    expect(() => DeltaReviewResultSchema.parse(result)).not.toThrow()
  })

  it('respects config options', async () => {
    const story = createTestSynthesizedStory()
    const deltaResult = createTestDeltaResult({
      changes: [
        {
          itemId: 'AC-1',
          section: 'acceptanceCriteria',
          changeType: 'added',
          oldContent: null,
          newContent: 'Added AC',
          fieldChanges: [],
          significance: 8,
        },
      ],
    })
    const config: Partial<DeltaReviewConfig> = { reviewAdded: false }

    const result = await performDeltaReview(deltaResult, story, config)

    expect(result.findings.length).toBe(0)
  })
})

describe('summary generation', () => {
  it('generates summary for no changes', async () => {
    const story = createTestSynthesizedStory()
    const deltaResult = createTestDeltaResult({
      changes: [],
    })

    const result = await performDeltaReview(deltaResult, story)

    expect(result.summary).toContain('No changed sections')
  })

  it('generates summary with section counts', async () => {
    const story = createTestSynthesizedStory()
    const deltaResult = createTestDeltaResult()

    const result = await performDeltaReview(deltaResult, story)

    expect(result.summary).toContain('Reviewed')
  })

  it('indicates pass/fail in summary', async () => {
    const story = createTestSynthesizedStory()
    const deltaResult = createTestDeltaResult()

    const result = await performDeltaReview(deltaResult, story)

    expect(result.summary).toMatch(/PASSED|FAILED/)
  })

  it('lists finding counts in summary when issues exist', async () => {
    const story = createTestSynthesizedStory({
      acceptanceCriteria: [
        {
          id: 'AC-1',
          description: 'TBD placeholder should be handled',
          fromBaseline: false,
          enhancedFromGaps: false,
          relatedGapIds: [],
          priority: 1,
        },
      ],
    })
    const deltaResult = createTestDeltaResult({
      changes: [
        {
          itemId: 'AC-1',
          section: 'acceptanceCriteria',
          changeType: 'added',
          oldContent: null,
          newContent: 'TBD placeholder should be handled',
          fieldChanges: [],
          significance: 8,
        },
      ],
    })

    const result = await performDeltaReview(deltaResult, story)

    expect(result.summary).toContain('issue')
  })
})
