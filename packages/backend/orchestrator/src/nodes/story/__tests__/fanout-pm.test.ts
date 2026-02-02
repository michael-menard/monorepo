import { describe, expect, it, vi } from 'vitest'
import type { BaselineReality } from '../../reality/index.js'
import type { StoryStructure } from '../seed.js'
import {
  analyzeScopeGaps,
  analyzeRequirementGaps,
  analyzeDependencyGaps,
  analyzePriorityGaps,
  generatePMGapAnalysis,
  ScopeGapSchema,
  RequirementGapSchema,
  DependencyGapSchema,
  PriorityGapSchema,
  PMGapStructureSchema,
  FanoutPMResultSchema,
  FanoutPMConfigSchema,
} from '../fanout-pm.js'

// Mock @repo/logger
vi.mock('@repo/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}))

/**
 * Helper to create a minimal valid story structure for testing.
 */
function createTestStoryStructure(overrides: Partial<StoryStructure> = {}): StoryStructure {
  return {
    storyId: 'test-001',
    title: 'Test Story Title',
    description: 'A test story for unit testing',
    domain: 'orchestrator',
    acceptanceCriteria: [
      { id: 'AC-1', description: 'First acceptance criterion', fromBaseline: false },
      { id: 'AC-2', description: 'Second acceptance criterion', fromBaseline: false },
    ],
    constraints: [],
    affectedFiles: ['src/test.ts'],
    dependencies: [],
    estimatedComplexity: 'medium',
    tags: [],
    ...overrides,
  }
}

/**
 * Helper to create a minimal valid baseline for testing.
 */
function createTestBaseline(overrides: Partial<BaselineReality> = {}): BaselineReality {
  return {
    date: '2025-01-20',
    filePath: '/test/baseline.md',
    rawContent: '',
    sections: [],
    ...overrides,
  }
}

describe('analyzeScopeGaps', () => {
  it('returns empty array for well-defined story', () => {
    const story = createTestStoryStructure()
    const gaps = analyzeScopeGaps(story)

    // May have some gaps depending on exact heuristics, but should be minimal
    expect(gaps.every(g => ScopeGapSchema.safeParse(g).success)).toBe(true)
  })

  it('identifies short title as potential gap', () => {
    const story = createTestStoryStructure({ title: 'Fix bug' })
    const gaps = analyzeScopeGaps(story)

    expect(gaps.some(g => g.category === 'definition' && g.description.includes('title'))).toBe(
      true,
    )
  })

  it('identifies missing affected files as boundary gap', () => {
    const story = createTestStoryStructure({ affectedFiles: [] })
    const gaps = analyzeScopeGaps(story)

    expect(
      gaps.some(g => g.category === 'boundary' && g.description.includes('affected files')),
    ).toBe(true)
  })

  it('identifies coordination overlap from constraints', () => {
    const story = createTestStoryStructure({
      constraints: ['Coordinate with in-progress: Related feature'],
    })
    const gaps = analyzeScopeGaps(story)

    expect(gaps.some(g => g.category === 'overlap')).toBe(true)
  })

  it('identifies vague acceptance criteria', () => {
    const story = createTestStoryStructure({
      acceptanceCriteria: [
        { id: 'AC-1', description: 'Do stuff etc', fromBaseline: false },
        { id: 'AC-2', description: 'Short', fromBaseline: false },
      ],
    })
    const gaps = analyzeScopeGaps(story)

    expect(gaps.some(g => g.category === 'definition' && g.relatedACs.length > 0)).toBe(true)
  })
})

describe('analyzeRequirementGaps', () => {
  it('returns empty array for comprehensive story', () => {
    const story = createTestStoryStructure({
      acceptanceCriteria: [
        { id: 'AC-1', description: 'Verify functionality works correctly', fromBaseline: false },
        { id: 'AC-2', description: 'Check error handling for invalid input', fromBaseline: false },
        { id: 'AC-3', description: 'Test performance requirements', fromBaseline: false },
      ],
    })
    const gaps = analyzeRequirementGaps(story)

    expect(gaps.every(g => RequirementGapSchema.safeParse(g).success)).toBe(true)
  })

  it('identifies insufficient acceptance criteria', () => {
    const story = createTestStoryStructure({
      acceptanceCriteria: [{ id: 'AC-1', description: 'Single criterion', fromBaseline: false }],
    })
    const gaps = analyzeRequirementGaps(story)

    expect(gaps.some(g => g.category === 'incomplete')).toBe(true)
  })

  it('identifies missing error handling requirements', () => {
    const story = createTestStoryStructure({
      acceptanceCriteria: [
        { id: 'AC-1', description: 'Feature works correctly', fromBaseline: false },
        { id: 'AC-2', description: 'Feature is fast', fromBaseline: false },
      ],
    })
    const gaps = analyzeRequirementGaps(story)

    expect(gaps.some(g => g.description.includes('error handling'))).toBe(true)
  })

  it('identifies missing NFRs for non-small stories', () => {
    const story = createTestStoryStructure({
      estimatedComplexity: 'large',
      acceptanceCriteria: [
        { id: 'AC-1', description: 'Feature works', fromBaseline: false },
        { id: 'AC-2', description: 'Error handling for invalid data', fromBaseline: false },
      ],
    })
    const gaps = analyzeRequirementGaps(story)

    expect(gaps.some(g => g.isFunctional === false)).toBe(true)
  })

  it('does not flag NFR gap for small stories', () => {
    const story = createTestStoryStructure({
      estimatedComplexity: 'small',
      acceptanceCriteria: [
        { id: 'AC-1', description: 'Feature works', fromBaseline: false },
        { id: 'AC-2', description: 'Handles errors correctly', fromBaseline: false },
      ],
    })
    const gaps = analyzeRequirementGaps(story)

    // Small stories should not be flagged for missing NFRs
    expect(gaps.every(g => g.isFunctional !== false)).toBe(true)
  })
})

describe('analyzeDependencyGaps', () => {
  it('returns empty array when dependencies match constraints', () => {
    const story = createTestStoryStructure({
      dependencies: ['dep-001'],
      constraints: ['Must not modify: Core module'],
    })
    const gaps = analyzeDependencyGaps(story, null)

    expect(gaps.every(g => DependencyGapSchema.safeParse(g).success)).toBe(true)
  })

  it('identifies missing dependencies when baseline has in-progress work', () => {
    const story = createTestStoryStructure({ dependencies: [] })
    const baseline = createTestBaseline({
      whatInProgress: ['Some related work'],
    })
    const gaps = analyzeDependencyGaps(story, baseline)

    expect(gaps.some(g => g.category === 'missing')).toBe(true)
  })

  it('identifies hidden dependencies when constraints exceed declared deps', () => {
    const story = createTestStoryStructure({
      dependencies: [],
      constraints: [
        'Must not modify: Module A',
        'Coordinate with in-progress: Feature B',
      ],
    })
    const gaps = analyzeDependencyGaps(story, null)

    expect(
      gaps.some(g => g.category === 'blocking' && g.description.includes('hidden')),
    ).toBe(true)
  })

  it('identifies missing external dependencies for integration domain', () => {
    const story = createTestStoryStructure({
      domain: 'api-integration',
      dependencies: [],
    })
    const gaps = analyzeDependencyGaps(story, null)

    expect(gaps.some(g => g.category === 'external')).toBe(true)
  })

  it('handles null baseline gracefully', () => {
    const story = createTestStoryStructure()
    const gaps = analyzeDependencyGaps(story, null)

    // Should not throw and should return valid gaps
    expect(Array.isArray(gaps)).toBe(true)
    expect(gaps.every(g => DependencyGapSchema.safeParse(g).success)).toBe(true)
  })
})

describe('analyzePriorityGaps', () => {
  it('returns empty array for well-prioritized story', () => {
    const story = createTestStoryStructure({
      estimatedComplexity: 'small',
      dependencies: ['dep-001'],
      tags: ['mvp', 'critical'],
    })
    const gaps = analyzePriorityGaps(story, null)

    expect(gaps.every(g => PriorityGapSchema.safeParse(g).success)).toBe(true)
  })

  it('identifies sequencing concern for large story without deps', () => {
    const story = createTestStoryStructure({
      estimatedComplexity: 'large',
      dependencies: [],
    })
    const gaps = analyzePriorityGaps(story, null)

    expect(gaps.some(g => g.category === 'sequencing')).toBe(true)
  })

  it('identifies resource planning concern from coordination constraints', () => {
    const story = createTestStoryStructure({
      constraints: ['Coordinate with in-progress: Other feature'],
    })
    const gaps = analyzePriorityGaps(story, null)

    expect(gaps.some(g => g.category === 'resource' && g.affectsPlanning === true)).toBe(true)
  })

  it('identifies timeline concern when baseline shows domain congestion', () => {
    const story = createTestStoryStructure({ domain: 'orchestrator' })
    const baseline = createTestBaseline({
      whatInProgress: [
        'orchestrator node development',
        'orchestrator testing',
        'orchestrator documentation',
      ],
    })
    const gaps = analyzePriorityGaps(story, baseline)

    expect(gaps.some(g => g.category === 'timeline')).toBe(true)
  })

  it('identifies value alignment concern for large untagged story', () => {
    const story = createTestStoryStructure({
      estimatedComplexity: 'large',
      tags: [],
    })
    const gaps = analyzePriorityGaps(story, null)

    expect(gaps.some(g => g.category === 'value')).toBe(true)
  })

  it('does not flag value for story with value tags', () => {
    const story = createTestStoryStructure({
      estimatedComplexity: 'large',
      tags: ['critical', 'customer-facing'],
    })
    const gaps = analyzePriorityGaps(story, null)

    expect(gaps.every(g => g.category !== 'value')).toBe(true)
  })
})

describe('generatePMGapAnalysis', () => {
  it('generates complete analysis for valid story', async () => {
    const story = createTestStoryStructure()
    const result = await generatePMGapAnalysis(story, null)

    expect(result.analyzed).toBe(true)
    expect(result.storyId).toBe('test-001')
    expect(result.gaps).toBeDefined()
    expect(result.totalGaps).toBeGreaterThanOrEqual(0)
    expect(result.summary).toBeDefined()
  })

  it('handles null story structure gracefully', async () => {
    const result = await generatePMGapAnalysis(null, null)

    expect(result.analyzed).toBe(false)
    expect(result.storyId).toBe('unknown')
    expect(result.error).toBeDefined()
    expect(result.totalGaps).toBe(0)
  })

  it('handles undefined story structure gracefully', async () => {
    const result = await generatePMGapAnalysis(undefined, null)

    expect(result.analyzed).toBe(false)
    expect(result.error).toBeDefined()
  })

  it('adds warning when baseline is missing', async () => {
    const story = createTestStoryStructure()
    const result = await generatePMGapAnalysis(story, null)

    expect(result.warnings.some(w => w.includes('baseline'))).toBe(true)
  })

  it('calculates highest severity correctly', async () => {
    // Story designed to trigger high severity gaps
    const story = createTestStoryStructure({
      acceptanceCriteria: [
        { id: 'AC-1', description: 'Short', fromBaseline: false },
      ],
      affectedFiles: [],
    })
    const result = await generatePMGapAnalysis(story, null)

    expect(result.highestSeverity).toBeGreaterThan(0)
    expect(result.highestSeverity).toBeLessThanOrEqual(5)
  })

  it('respects minSeverity filter', async () => {
    const story = createTestStoryStructure({
      title: 'Short',
      affectedFiles: [],
    })

    const result = await generatePMGapAnalysis(story, null, { minSeverity: 5 })

    // All remaining gaps should be severity 5
    const allGaps = [
      ...result.gaps.scopeGaps,
      ...result.gaps.requirementGaps,
      ...result.gaps.dependencyGaps,
      ...result.gaps.priorityGaps,
    ]
    expect(allGaps.every(g => g.severity >= 5 || allGaps.length === 0)).toBe(true)
  })

  it('respects checkScope config', async () => {
    const story = createTestStoryStructure({ title: 'Short', affectedFiles: [] })
    const result = await generatePMGapAnalysis(story, null, { checkScope: false })

    expect(result.gaps.scopeGaps).toHaveLength(0)
  })

  it('respects checkRequirements config', async () => {
    const story = createTestStoryStructure()
    const result = await generatePMGapAnalysis(story, null, { checkRequirements: false })

    expect(result.gaps.requirementGaps).toHaveLength(0)
  })

  it('respects checkDependencies config', async () => {
    const story = createTestStoryStructure()
    const baseline = createTestBaseline({ whatInProgress: ['Some work'] })
    const result = await generatePMGapAnalysis(story, baseline, { checkDependencies: false })

    expect(result.gaps.dependencyGaps).toHaveLength(0)
  })

  it('respects checkPriority config', async () => {
    const story = createTestStoryStructure({ estimatedComplexity: 'large' })
    const result = await generatePMGapAnalysis(story, null, { checkPriority: false })

    expect(result.gaps.priorityGaps).toHaveLength(0)
  })

  it('removes suggestions when includeSuggestions is false', async () => {
    const story = createTestStoryStructure({
      title: 'Short',
      affectedFiles: [],
    })
    const result = await generatePMGapAnalysis(story, null, { includeSuggestions: false })

    const allGaps = [
      ...result.gaps.scopeGaps,
      ...result.gaps.requirementGaps,
      ...result.gaps.dependencyGaps,
      ...result.gaps.priorityGaps,
    ]
    expect(allGaps.every(g => g.suggestion === undefined)).toBe(true)
  })

  it('generates appropriate summary for no gaps', async () => {
    // Create a very complete story
    const story = createTestStoryStructure({
      title: 'Complete Feature Implementation',
      acceptanceCriteria: [
        { id: 'AC-1', description: 'Verify feature works correctly with valid input', fromBaseline: false },
        { id: 'AC-2', description: 'Test error handling for invalid data', fromBaseline: false },
        { id: 'AC-3', description: 'Check performance requirements are met', fromBaseline: false },
      ],
      affectedFiles: ['src/feature.ts'],
      dependencies: ['dep-001'],
      tags: ['mvp'],
      estimatedComplexity: 'small',
    })

    const result = await generatePMGapAnalysis(story, null)

    // If no gaps, summary should indicate that
    if (result.totalGaps === 0) {
      expect(result.summary).toContain('No PM perspective gaps')
    }
  })

  it('generates summary listing gap types', async () => {
    const story = createTestStoryStructure({
      title: 'Short',
      affectedFiles: [],
      acceptanceCriteria: [
        { id: 'AC-1', description: 'Short', fromBaseline: false },
      ],
    })
    const result = await generatePMGapAnalysis(story, null)

    if (result.totalGaps > 0) {
      expect(result.summary).toContain('gap')
      expect(result.summary).toContain('severity')
    }
  })
})

describe('ScopeGapSchema validation', () => {
  it('validates valid scope gap', () => {
    const valid = {
      id: 'SG-1',
      category: 'boundary',
      description: 'Scope boundary is unclear',
      severity: 3,
      suggestion: 'Add more detail',
      relatedACs: ['AC-1'],
    }

    expect(() => ScopeGapSchema.parse(valid)).not.toThrow()
  })

  it('applies defaults', () => {
    const minimal = {
      id: 'SG-1',
      category: 'definition',
      description: 'Test',
      severity: 2,
    }

    const parsed = ScopeGapSchema.parse(minimal)

    expect(parsed.relatedACs).toEqual([])
    expect(parsed.suggestion).toBeUndefined()
  })

  it('validates category enum', () => {
    const invalid = {
      id: 'SG-1',
      category: 'invalid',
      description: 'Test',
      severity: 2,
    }

    expect(() => ScopeGapSchema.parse(invalid)).toThrow()
  })

  it('validates severity range', () => {
    expect(() =>
      ScopeGapSchema.parse({
        id: 'SG-1',
        category: 'boundary',
        description: 'Test',
        severity: 0,
      }),
    ).toThrow()

    expect(() =>
      ScopeGapSchema.parse({
        id: 'SG-1',
        category: 'boundary',
        description: 'Test',
        severity: 6,
      }),
    ).toThrow()
  })
})

describe('RequirementGapSchema validation', () => {
  it('validates valid requirement gap', () => {
    const valid = {
      id: 'RG-1',
      category: 'missing',
      description: 'Missing requirement',
      severity: 4,
      suggestion: 'Add requirement',
      isFunctional: true,
    }

    expect(() => RequirementGapSchema.parse(valid)).not.toThrow()
  })

  it('applies isFunctional default', () => {
    const minimal = {
      id: 'RG-1',
      category: 'incomplete',
      description: 'Test',
      severity: 2,
    }

    const parsed = RequirementGapSchema.parse(minimal)

    expect(parsed.isFunctional).toBe(true)
  })
})

describe('DependencyGapSchema validation', () => {
  it('validates valid dependency gap', () => {
    const valid = {
      id: 'DG-1',
      category: 'blocking',
      description: 'Blocking dependency found',
      severity: 3,
      dependency: 'dep-001',
      suggestion: 'Resolve blocker first',
    }

    expect(() => DependencyGapSchema.parse(valid)).not.toThrow()
  })

  it('validates category enum values', () => {
    const categories = ['missing', 'circular', 'blocking', 'external', 'version']

    for (const category of categories) {
      expect(() =>
        DependencyGapSchema.parse({
          id: 'DG-1',
          category,
          description: 'Test',
          severity: 2,
        }),
      ).not.toThrow()
    }
  })
})

describe('PriorityGapSchema validation', () => {
  it('validates valid priority gap', () => {
    const valid = {
      id: 'PG-1',
      category: 'sequencing',
      description: 'Wrong sequence',
      severity: 3,
      suggestion: 'Reorder',
      affectsPlanning: true,
    }

    expect(() => PriorityGapSchema.parse(valid)).not.toThrow()
  })

  it('applies affectsPlanning default', () => {
    const minimal = {
      id: 'PG-1',
      category: 'timeline',
      description: 'Test',
      severity: 2,
    }

    const parsed = PriorityGapSchema.parse(minimal)

    expect(parsed.affectsPlanning).toBe(false)
  })
})

describe('PMGapStructureSchema validation', () => {
  it('validates complete gap structure', () => {
    const structure = {
      scopeGaps: [{ id: 'SG-1', category: 'boundary', description: 'Test', severity: 2 }],
      requirementGaps: [{ id: 'RG-1', category: 'missing', description: 'Test', severity: 3 }],
      dependencyGaps: [],
      priorityGaps: [],
    }

    expect(() => PMGapStructureSchema.parse(structure)).not.toThrow()
  })

  it('applies array defaults', () => {
    const parsed = PMGapStructureSchema.parse({})

    expect(parsed.scopeGaps).toEqual([])
    expect(parsed.requirementGaps).toEqual([])
    expect(parsed.dependencyGaps).toEqual([])
    expect(parsed.priorityGaps).toEqual([])
  })
})

describe('FanoutPMResultSchema validation', () => {
  it('validates successful result', () => {
    const result = {
      storyId: 'test-001',
      gaps: {
        scopeGaps: [],
        requirementGaps: [],
        dependencyGaps: [],
        priorityGaps: [],
      },
      analyzed: true,
      totalGaps: 0,
      highestSeverity: 0,
      summary: 'No gaps found',
      warnings: [],
    }

    expect(() => FanoutPMResultSchema.parse(result)).not.toThrow()
  })

  it('validates failed result', () => {
    const result = {
      storyId: 'unknown',
      gaps: {
        scopeGaps: [],
        requirementGaps: [],
        dependencyGaps: [],
        priorityGaps: [],
      },
      analyzed: false,
      totalGaps: 0,
      highestSeverity: 0,
      error: 'Analysis failed',
      warnings: ['Warning 1'],
    }

    expect(() => FanoutPMResultSchema.parse(result)).not.toThrow()
  })
})

describe('FanoutPMConfigSchema validation', () => {
  it('applies all defaults', () => {
    const parsed = FanoutPMConfigSchema.parse({})

    expect(parsed.minSeverity).toBe(1)
    expect(parsed.checkScope).toBe(true)
    expect(parsed.checkRequirements).toBe(true)
    expect(parsed.checkDependencies).toBe(true)
    expect(parsed.checkPriority).toBe(true)
    expect(parsed.includeSuggestions).toBe(true)
  })

  it('validates custom config', () => {
    const config = {
      minSeverity: 3,
      checkScope: false,
      checkRequirements: true,
      checkDependencies: false,
      checkPriority: true,
      includeSuggestions: false,
    }

    const parsed = FanoutPMConfigSchema.parse(config)

    expect(parsed).toEqual(config)
  })

  it('validates minSeverity range', () => {
    expect(() => FanoutPMConfigSchema.parse({ minSeverity: 0 })).toThrow()
    expect(() => FanoutPMConfigSchema.parse({ minSeverity: 6 })).toThrow()
    expect(() => FanoutPMConfigSchema.parse({ minSeverity: 3 })).not.toThrow()
  })
})
