import { describe, expect, it, vi } from 'vitest'
import type { SynthesizedStory } from '../../story/synthesize.js'
import {
  classifyChange,
  diffSections,
  detectDeltas,
  ChangeTypeSchema,
  SectionNameSchema,
  SectionChangeSchema,
  DeltaSummaryStatsSchema,
  DeltaDetectionResultSchema,
  DeltaDetectionConfigSchema,
  DeltaDetectionNodeResultSchema,
  type SectionName,
  type DeltaDetectionConfig,
} from '../delta-detect.js'

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
  storyId: 'flow-031',
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

describe('ChangeTypeSchema validation', () => {
  it('validates all change types', () => {
    const types = ['added', 'modified', 'removed', 'unchanged']

    for (const type of types) {
      expect(() => ChangeTypeSchema.parse(type)).not.toThrow()
    }
  })

  it('rejects invalid change type', () => {
    expect(() => ChangeTypeSchema.parse('invalid')).toThrow()
  })
})

describe('SectionNameSchema validation', () => {
  it('validates all section names', () => {
    const sections = [
      'acceptanceCriteria',
      'nonGoals',
      'testHints',
      'knownUnknowns',
      'constraints',
      'affectedFiles',
      'dependencies',
    ]

    for (const section of sections) {
      expect(() => SectionNameSchema.parse(section)).not.toThrow()
    }
  })

  it('rejects invalid section name', () => {
    expect(() => SectionNameSchema.parse('invalid')).toThrow()
  })
})

describe('SectionChangeSchema validation', () => {
  it('validates complete section change', () => {
    const change = {
      itemId: 'AC-1',
      section: 'acceptanceCriteria',
      changeType: 'modified',
      oldContent: 'Old content',
      newContent: 'New content',
      fieldChanges: [{ field: 'priority', oldValue: 1, newValue: 2 }],
      significance: 8,
    }

    expect(() => SectionChangeSchema.parse(change)).not.toThrow()
  })

  it('validates minimal section change', () => {
    const change = {
      itemId: 'AC-1',
      section: 'acceptanceCriteria',
      changeType: 'added',
      oldContent: null,
      newContent: 'New content',
    }

    const parsed = SectionChangeSchema.parse(change)
    expect(parsed.fieldChanges).toEqual([])
    expect(parsed.significance).toBe(5)
  })

  it('validates significance range', () => {
    const base = {
      itemId: 'AC-1',
      section: 'acceptanceCriteria' as const,
      changeType: 'modified' as const,
      oldContent: 'Old',
      newContent: 'New',
    }

    expect(() => SectionChangeSchema.parse({ ...base, significance: 0 })).toThrow()
    expect(() => SectionChangeSchema.parse({ ...base, significance: 11 })).toThrow()
    expect(() => SectionChangeSchema.parse({ ...base, significance: 1 })).not.toThrow()
    expect(() => SectionChangeSchema.parse({ ...base, significance: 10 })).not.toThrow()
  })
})

describe('DeltaSummaryStatsSchema validation', () => {
  it('validates complete stats', () => {
    const stats = {
      totalChanges: 5,
      addedCount: 2,
      modifiedCount: 2,
      removedCount: 1,
      unchangedCount: 3,
      changesBySection: {
        acceptanceCriteria: 2,
        nonGoals: 1,
      },
      averageSignificance: 7.5,
      hasSubstantialChanges: true,
    }

    expect(() => DeltaSummaryStatsSchema.parse(stats)).not.toThrow()
  })

  it('validates minimal stats', () => {
    const stats = {
      totalChanges: 0,
      addedCount: 0,
      modifiedCount: 0,
      removedCount: 0,
      unchangedCount: 0,
      averageSignificance: 0,
      hasSubstantialChanges: false,
    }

    const parsed = DeltaSummaryStatsSchema.parse(stats)
    expect(parsed.changesBySection).toEqual({})
  })

  it('rejects negative counts', () => {
    const stats = {
      totalChanges: -1,
      addedCount: 0,
      modifiedCount: 0,
      removedCount: 0,
      unchangedCount: 0,
      averageSignificance: 0,
      hasSubstantialChanges: false,
    }

    expect(() => DeltaSummaryStatsSchema.parse(stats)).toThrow()
  })
})

describe('DeltaDetectionResultSchema validation', () => {
  it('validates complete result', () => {
    const result = {
      storyId: 'flow-031',
      detectedAt: new Date().toISOString(),
      previousIteration: 0,
      currentIteration: 1,
      changes: [
        {
          itemId: 'AC-1',
          section: 'acceptanceCriteria',
          changeType: 'added',
          oldContent: null,
          newContent: 'New AC',
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
      summary: 'Test summary',
      detected: true,
    }

    expect(() => DeltaDetectionResultSchema.parse(result)).not.toThrow()
  })

  it('validates failed result', () => {
    const result = {
      storyId: 'flow-031',
      detectedAt: new Date().toISOString(),
      previousIteration: 0,
      currentIteration: 1,
      changes: [],
      stats: {
        totalChanges: 0,
        addedCount: 0,
        modifiedCount: 0,
        removedCount: 0,
        unchangedCount: 0,
        averageSignificance: 0,
        hasSubstantialChanges: false,
      },
      summary: 'Detection failed',
      detected: false,
      error: 'Error message',
    }

    expect(() => DeltaDetectionResultSchema.parse(result)).not.toThrow()
  })

  it('validates story ID format', () => {
    const base = {
      detectedAt: new Date().toISOString(),
      previousIteration: 0,
      currentIteration: 1,
      changes: [],
      stats: {
        totalChanges: 0,
        addedCount: 0,
        modifiedCount: 0,
        removedCount: 0,
        unchangedCount: 0,
        averageSignificance: 0,
        hasSubstantialChanges: false,
      },
      summary: 'Test',
      detected: true,
    }

    expect(() => DeltaDetectionResultSchema.parse({ ...base, storyId: 'flow-031' })).not.toThrow()
    expect(() => DeltaDetectionResultSchema.parse({ ...base, storyId: 'FLOW-001' })).not.toThrow()
    expect(() => DeltaDetectionResultSchema.parse({ ...base, storyId: 'invalid' })).toThrow()
  })
})

describe('DeltaDetectionConfigSchema validation', () => {
  it('applies default values', () => {
    const config = DeltaDetectionConfigSchema.parse({})

    expect(config.minSignificance).toBe(1)
    expect(config.substantialChangeThreshold).toBe(3)
    expect(config.trackFieldChanges).toBe(true)
    expect(config.sectionsToCompare).toEqual([])
  })

  it('validates custom config', () => {
    const config = {
      minSignificance: 5,
      substantialChangeThreshold: 10,
      trackFieldChanges: false,
      sectionsToCompare: ['acceptanceCriteria', 'nonGoals'],
    }

    const parsed = DeltaDetectionConfigSchema.parse(config)
    expect(parsed.minSignificance).toBe(5)
    expect(parsed.trackFieldChanges).toBe(false)
  })

  it('validates significance range', () => {
    expect(() => DeltaDetectionConfigSchema.parse({ minSignificance: 0 })).toThrow()
    expect(() => DeltaDetectionConfigSchema.parse({ minSignificance: 11 })).toThrow()
  })
})

describe('DeltaDetectionNodeResultSchema validation', () => {
  it('validates successful result', () => {
    const result = {
      deltaResult: {
        storyId: 'flow-031',
        detectedAt: new Date().toISOString(),
        previousIteration: 0,
        currentIteration: 1,
        changes: [],
        stats: {
          totalChanges: 0,
          addedCount: 0,
          modifiedCount: 0,
          removedCount: 0,
          unchangedCount: 0,
          averageSignificance: 0,
          hasSubstantialChanges: false,
        },
        summary: 'No changes',
        detected: true,
      },
      deltaDetected: true,
    }

    expect(() => DeltaDetectionNodeResultSchema.parse(result)).not.toThrow()
  })

  it('validates failed result', () => {
    const result = {
      deltaResult: null,
      deltaDetected: false,
      error: 'No story available',
    }

    expect(() => DeltaDetectionNodeResultSchema.parse(result)).not.toThrow()
  })
})

describe('classifyChange', () => {
  it('detects added items', () => {
    expect(classifyChange(null, { id: 'AC-1', description: 'New' })).toBe('added')
    expect(classifyChange(undefined, { id: 'AC-1', description: 'New' })).toBe('added')
  })

  it('detects removed items', () => {
    expect(classifyChange({ id: 'AC-1', description: 'Old' }, null)).toBe('removed')
    expect(classifyChange({ id: 'AC-1', description: 'Old' }, undefined)).toBe('removed')
  })

  it('detects unchanged items', () => {
    const item = { id: 'AC-1', description: 'Same', priority: 1 }
    expect(classifyChange(item, { ...item })).toBe('unchanged')
  })

  it('detects modified content', () => {
    const old = { id: 'AC-1', description: 'Old content' }
    const newItem = { id: 'AC-1', description: 'New content' }
    expect(classifyChange(old, newItem)).toBe('modified')
  })

  it('detects modified fields', () => {
    const old = { id: 'AC-1', description: 'Same', priority: 1 }
    const newItem = { id: 'AC-1', description: 'Same', priority: 2 }
    expect(classifyChange(old, newItem)).toBe('modified')
  })

  it('handles string items', () => {
    expect(classifyChange('old', 'new')).toBe('modified')
    expect(classifyChange('same', 'same')).toBe('unchanged')
    expect(classifyChange(null, 'new')).toBe('added')
    expect(classifyChange('old', null)).toBe('removed')
  })
})

describe('diffSections', () => {
  const defaultConfig = DeltaDetectionConfigSchema.parse({})

  it('detects added items', () => {
    const oldSection = [{ id: 'AC-1', description: 'First' }]
    const newSection = [
      { id: 'AC-1', description: 'First' },
      { id: 'AC-2', description: 'Second' },
    ]

    const changes = diffSections(oldSection, newSection, 'acceptanceCriteria', defaultConfig)

    expect(changes.length).toBe(2)
    const addedChange = changes.find(c => c.itemId === 'AC-2')
    expect(addedChange?.changeType).toBe('added')
    expect(addedChange?.newContent).toBe('Second')
  })

  it('detects removed items', () => {
    const oldSection = [
      { id: 'AC-1', description: 'First' },
      { id: 'AC-2', description: 'Second' },
    ]
    const newSection = [{ id: 'AC-1', description: 'First' }]

    const changes = diffSections(oldSection, newSection, 'acceptanceCriteria', defaultConfig)

    const removedChange = changes.find(c => c.itemId === 'AC-2')
    expect(removedChange?.changeType).toBe('removed')
    expect(removedChange?.oldContent).toBe('Second')
  })

  it('detects modified items', () => {
    const oldSection = [{ id: 'AC-1', description: 'Old description', priority: 1 }]
    const newSection = [{ id: 'AC-1', description: 'New description', priority: 1 }]

    const changes = diffSections(oldSection, newSection, 'acceptanceCriteria', defaultConfig)

    const modifiedChange = changes.find(c => c.itemId === 'AC-1')
    expect(modifiedChange?.changeType).toBe('modified')
    expect(modifiedChange?.oldContent).toBe('Old description')
    expect(modifiedChange?.newContent).toBe('New description')
  })

  it('tracks field changes when enabled', () => {
    const oldSection = [{ id: 'AC-1', description: 'Same', priority: 1 }]
    const newSection = [{ id: 'AC-1', description: 'Same', priority: 2 }]
    const config = DeltaDetectionConfigSchema.parse({ trackFieldChanges: true })

    const changes = diffSections(oldSection, newSection, 'acceptanceCriteria', config)

    const change = changes.find(c => c.itemId === 'AC-1')
    expect(change?.changeType).toBe('modified')
    expect(change?.fieldChanges.length).toBeGreaterThan(0)
    expect(change?.fieldChanges.some(fc => fc.field === 'priority')).toBe(true)
  })

  it('does not track field changes when disabled', () => {
    const oldSection = [{ id: 'AC-1', description: 'Same', priority: 1 }]
    const newSection = [{ id: 'AC-1', description: 'Same', priority: 2 }]
    const config = DeltaDetectionConfigSchema.parse({ trackFieldChanges: false })

    const changes = diffSections(oldSection, newSection, 'acceptanceCriteria', config)

    const change = changes.find(c => c.itemId === 'AC-1')
    expect(change?.fieldChanges).toEqual([])
  })

  it('handles empty old section', () => {
    const newSection = [{ id: 'AC-1', description: 'First' }]

    const changes = diffSections(undefined, newSection, 'acceptanceCriteria', defaultConfig)

    expect(changes.length).toBe(1)
    expect(changes[0].changeType).toBe('added')
  })

  it('handles empty new section', () => {
    const oldSection = [{ id: 'AC-1', description: 'First' }]

    const changes = diffSections(oldSection, undefined, 'acceptanceCriteria', defaultConfig)

    expect(changes.length).toBe(1)
    expect(changes[0].changeType).toBe('removed')
  })

  it('handles both sections empty', () => {
    const changes = diffSections(undefined, undefined, 'acceptanceCriteria', defaultConfig)

    expect(changes.length).toBe(0)
  })

  it('handles string arrays', () => {
    const oldSection = ['constraint 1', 'constraint 2']
    const newSection = ['constraint 1', 'constraint 3']

    const changes = diffSections(oldSection, newSection, 'constraints', defaultConfig)

    // Both are keyed by index since strings don't have IDs
    expect(changes.some(c => c.changeType === 'modified' || c.changeType === 'added')).toBe(true)
  })

  it('respects minimum significance filter', () => {
    const oldSection = [{ id: 'AC-1', description: 'Same' }]
    const newSection = [{ id: 'AC-1', description: 'Same' }]
    const config = DeltaDetectionConfigSchema.parse({ minSignificance: 3 })

    const changes = diffSections(oldSection, newSection, 'affectedFiles', config)

    // Unchanged items have significance 1, which is below threshold
    const unchangedChanges = changes.filter(c => c.changeType === 'unchanged')
    expect(unchangedChanges.length).toBe(0)
  })

  it('calculates higher significance for ACs', () => {
    const newSection = [{ id: 'AC-1', description: 'New AC', priority: 1, fromBaseline: true }]

    const changes = diffSections(undefined, newSection, 'acceptanceCriteria', defaultConfig)

    const change = changes.find(c => c.itemId === 'AC-1')
    expect(change?.significance).toBeGreaterThanOrEqual(8)
  })

  it('calculates higher significance for blocking known unknowns', () => {
    const newSection = [{ id: 'KU-1', description: 'Blocking unknown', impact: 'blocking' }]

    const changes = diffSections(undefined, newSection, 'knownUnknowns', defaultConfig)

    const change = changes.find(c => c.itemId === 'KU-1')
    expect(change?.significance).toBeGreaterThanOrEqual(8)
  })
})

describe('detectDeltas', () => {
  it('detects changes between story versions', async () => {
    const previousStory = createTestSynthesizedStory()
    const currentStory = createTestSynthesizedStory({
      acceptanceCriteria: [
        ...previousStory.acceptanceCriteria,
        {
          id: 'AC-3',
          description: 'New acceptance criterion',
          fromBaseline: false,
          enhancedFromGaps: false,
          relatedGapIds: [],
          priority: 2,
        },
      ],
    })

    const result = await detectDeltas(previousStory, currentStory, 0, 1)

    expect(result.detected).toBe(true)
    expect(result.stats.addedCount).toBeGreaterThan(0)
    expect(result.changes.some(c => c.itemId === 'AC-3')).toBe(true)
  })

  it('handles initial detection (no previous story)', async () => {
    const currentStory = createTestSynthesizedStory()

    const result = await detectDeltas(null, currentStory, 0, 1)

    expect(result.detected).toBe(true)
    expect(result.stats.addedCount).toBeGreaterThan(0)
    // All items should be marked as added
    expect(result.changes.every(c => c.changeType === 'added')).toBe(true)
  })

  it('returns no changes for identical stories', async () => {
    const story = createTestSynthesizedStory()

    const result = await detectDeltas(story, story, 0, 1)

    expect(result.detected).toBe(true)
    expect(result.stats.totalChanges).toBe(0)
  })

  it('includes iteration numbers', async () => {
    const previousStory = createTestSynthesizedStory()
    const currentStory = createTestSynthesizedStory()

    const result = await detectDeltas(previousStory, currentStory, 2, 3)

    expect(result.previousIteration).toBe(2)
    expect(result.currentIteration).toBe(3)
  })

  it('generates meaningful summary', async () => {
    const previousStory = createTestSynthesizedStory()
    const currentStory = createTestSynthesizedStory({
      nonGoals: [
        ...previousStory.nonGoals,
        {
          id: 'NG-2',
          description: 'New non-goal',
          reason: 'Added',
          source: 'manual',
        },
      ],
    })

    const result = await detectDeltas(previousStory, currentStory, 0, 1)

    expect(result.summary).toContain(currentStory.storyId)
    expect(result.summary.length).toBeGreaterThan(0)
  })

  it('calculates statistics correctly', async () => {
    const previousStory = createTestSynthesizedStory()
    const currentStory = createTestSynthesizedStory({
      acceptanceCriteria: [
        {
          id: 'AC-1',
          description: 'Modified first criterion',
          fromBaseline: false,
          enhancedFromGaps: false,
          relatedGapIds: [],
          priority: 1,
        },
        // AC-2 removed
        {
          id: 'AC-3',
          description: 'New third criterion',
          fromBaseline: false,
          enhancedFromGaps: false,
          relatedGapIds: [],
          priority: 2,
        },
      ],
    })

    const result = await detectDeltas(previousStory, currentStory, 0, 1)

    expect(result.stats.addedCount).toBeGreaterThanOrEqual(1)
    expect(result.stats.removedCount).toBeGreaterThanOrEqual(1)
    expect(result.stats.modifiedCount).toBeGreaterThanOrEqual(1)
  })

  it('respects configuration options', async () => {
    const previousStory = createTestSynthesizedStory()
    const currentStory = createTestSynthesizedStory({
      acceptanceCriteria: [...previousStory.acceptanceCriteria],
      nonGoals: [
        ...previousStory.nonGoals,
        { id: 'NG-2', description: 'Added', reason: 'Test', source: 'manual' },
      ],
    })
    const config: Partial<DeltaDetectionConfig> = {
      sectionsToCompare: ['acceptanceCriteria'],
    }

    const result = await detectDeltas(previousStory, currentStory, 0, 1, config)

    // Should only show AC changes (none in this case)
    expect(result.changes.some(c => c.section === 'nonGoals')).toBe(false)
  })

  it('identifies substantial changes', async () => {
    const previousStory = createTestSynthesizedStory()
    const currentStory = createTestSynthesizedStory({
      acceptanceCriteria: [
        ...previousStory.acceptanceCriteria,
        { id: 'AC-3', description: 'New 1', fromBaseline: false, enhancedFromGaps: false, relatedGapIds: [], priority: 2 },
        { id: 'AC-4', description: 'New 2', fromBaseline: false, enhancedFromGaps: false, relatedGapIds: [], priority: 2 },
        { id: 'AC-5', description: 'New 3', fromBaseline: false, enhancedFromGaps: false, relatedGapIds: [], priority: 2 },
      ],
    })
    const config: Partial<DeltaDetectionConfig> = {
      substantialChangeThreshold: 3,
    }

    const result = await detectDeltas(previousStory, currentStory, 0, 1, config)

    expect(result.stats.hasSubstantialChanges).toBe(true)
  })

  it('excludes unchanged items from changes array', async () => {
    const story = createTestSynthesizedStory()

    const result = await detectDeltas(story, story, 0, 1)

    // Changes array should not include unchanged items
    expect(result.changes.every(c => c.changeType !== 'unchanged')).toBe(true)
  })

  it('validates result against schema', async () => {
    const currentStory = createTestSynthesizedStory()

    const result = await detectDeltas(null, currentStory, 0, 1)

    // Should not throw if result is valid
    expect(() => DeltaDetectionResultSchema.parse(result)).not.toThrow()
  })

  it('handles detection errors gracefully', async () => {
    // This test verifies error handling - would need a way to trigger an error
    // For now, just verify the structure handles null gracefully
    const currentStory = createTestSynthesizedStory()

    const result = await detectDeltas(undefined, currentStory, 0, 1)

    expect(result.detected).toBe(true)
    expect(result.error).toBeUndefined()
  })
})

describe('detectDeltas with all section types', () => {
  it('detects changes in constraints (string array)', async () => {
    const previousStory = createTestSynthesizedStory({
      constraints: ['constraint 1'],
    })
    const currentStory = createTestSynthesizedStory({
      constraints: ['constraint 1', 'constraint 2'],
    })

    const result = await detectDeltas(previousStory, currentStory, 0, 1)

    expect(result.stats.changesBySection.constraints).toBeGreaterThan(0)
  })

  it('detects changes in affectedFiles (string array)', async () => {
    const previousStory = createTestSynthesizedStory({
      affectedFiles: ['file1.ts'],
    })
    const currentStory = createTestSynthesizedStory({
      affectedFiles: ['file1.ts', 'file2.ts'],
    })

    const result = await detectDeltas(previousStory, currentStory, 0, 1)

    expect(result.stats.changesBySection.affectedFiles).toBeGreaterThan(0)
  })

  it('detects changes in dependencies (string array)', async () => {
    const previousStory = createTestSynthesizedStory({
      dependencies: ['dep1'],
    })
    const currentStory = createTestSynthesizedStory({
      dependencies: ['dep1', 'dep2'],
    })

    const result = await detectDeltas(previousStory, currentStory, 0, 1)

    expect(result.stats.changesBySection.dependencies).toBeGreaterThan(0)
  })

  it('detects changes in testHints', async () => {
    const previousStory = createTestSynthesizedStory()
    const currentStory = createTestSynthesizedStory({
      testHints: [
        ...previousStory.testHints,
        { id: 'TH-2', description: 'New hint', category: 'integration', priority: 2 },
      ],
    })

    const result = await detectDeltas(previousStory, currentStory, 0, 1)

    expect(result.changes.some(c => c.section === 'testHints')).toBe(true)
  })

  it('detects changes in knownUnknowns', async () => {
    const previousStory = createTestSynthesizedStory()
    const currentStory = createTestSynthesizedStory({
      knownUnknowns: [
        { id: 'KU-1', description: 'Modified unknown', source: 'story_content', impact: 'high' },
      ],
    })

    const result = await detectDeltas(previousStory, currentStory, 0, 1)

    expect(result.changes.some(c => c.section === 'knownUnknowns')).toBe(true)
  })
})

describe('summary generation', () => {
  it('generates summary for no changes', async () => {
    const story = createTestSynthesizedStory()

    const result = await detectDeltas(story, story, 0, 1)

    expect(result.summary).toContain('No changes')
  })

  it('generates summary mentioning change counts', async () => {
    const previousStory = createTestSynthesizedStory()
    const currentStory = createTestSynthesizedStory({
      acceptanceCriteria: [
        ...previousStory.acceptanceCriteria,
        { id: 'AC-3', description: 'New', fromBaseline: false, enhancedFromGaps: false, relatedGapIds: [], priority: 2 },
      ],
    })

    const result = await detectDeltas(previousStory, currentStory, 0, 1)

    expect(result.summary).toContain('added')
  })

  it('highlights substantial changes in summary', async () => {
    const previousStory = createTestSynthesizedStory()
    const currentStory = createTestSynthesizedStory({
      acceptanceCriteria: [
        { id: 'AC-3', description: 'New 1', fromBaseline: false, enhancedFromGaps: false, relatedGapIds: [], priority: 2 },
        { id: 'AC-4', description: 'New 2', fromBaseline: false, enhancedFromGaps: false, relatedGapIds: [], priority: 2 },
        { id: 'AC-5', description: 'New 3', fromBaseline: false, enhancedFromGaps: false, relatedGapIds: [], priority: 2 },
        { id: 'AC-6', description: 'New 4', fromBaseline: false, enhancedFromGaps: false, relatedGapIds: [], priority: 2 },
      ],
    })

    const result = await detectDeltas(previousStory, currentStory, 0, 1)

    expect(result.stats.hasSubstantialChanges).toBe(true)
    expect(result.summary).toContain('substantial')
  })
})
