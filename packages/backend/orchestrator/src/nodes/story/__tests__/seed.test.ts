import { describe, expect, it, vi } from 'vitest'
import { createInitialState } from '../../../state/index.js'
import type { BaselineReality } from '../../reality/index.js'
import type { RetrievedContext } from '../../reality/index.js'
import {
  extractAffectedFiles,
  extractConstraintsFromBaseline,
  estimateComplexity,
  generateInitialACs,
  generateStoryId,
  generateStorySeed,
  StoryRequestSchema,
  AcceptanceCriterionSchema,
  StoryStructureSchema,
  SeedConfigSchema,
  SeedResultSchema,
  type StoryRequest,
} from '../seed.js'

// Mock @repo/logger
vi.mock('@repo/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}))

describe('generateStoryId', () => {
  it('generates story ID with 3-digit padding', () => {
    expect(generateStoryId('flow', 1)).toBe('flow-001')
    expect(generateStoryId('flow', 23)).toBe('flow-023')
    expect(generateStoryId('flow', 999)).toBe('flow-999')
  })

  it('handles numbers over 3 digits', () => {
    expect(generateStoryId('flow', 1234)).toBe('flow-1234')
  })

  it('converts prefix to lowercase', () => {
    expect(generateStoryId('FLOW', 42)).toBe('flow-042')
    expect(generateStoryId('Flow', 42)).toBe('flow-042')
  })
})

describe('extractConstraintsFromBaseline', () => {
  it('returns empty array when baseline is null', () => {
    const constraints = extractConstraintsFromBaseline(null, 'test')
    expect(constraints).toEqual([])
  })

  it('returns empty array when baseline is undefined', () => {
    const constraints = extractConstraintsFromBaseline(undefined, 'test')
    expect(constraints).toEqual([])
  })

  it('extracts no-rework items as constraints', () => {
    const baseline: BaselineReality = {
      date: '2025-01-20',
      filePath: '/test/baseline.md',
      rawContent: '',
      sections: [],
      noRework: ['Module A is stable', 'Package B should not change'],
    }

    const constraints = extractConstraintsFromBaseline(baseline, 'test')

    expect(constraints).toContainEqual('Must not modify: Module A is stable')
    expect(constraints).toContainEqual('Must not modify: Package B should not change')
  })

  it('extracts domain-relevant invalid assumptions', () => {
    const baseline: BaselineReality = {
      date: '2025-01-20',
      filePath: '/test/baseline.md',
      rawContent: '',
      sections: [],
      invalidAssumptions: [
        'orchestrator was assumed to be sync',
        'unrelated assumption about UI',
      ],
    }

    const constraints = extractConstraintsFromBaseline(baseline, 'orchestrator')

    expect(constraints).toContainEqual('Avoid assumption: orchestrator was assumed to be sync')
    expect(constraints).not.toContainEqual(expect.stringContaining('UI'))
  })

  it('extracts domain-relevant in-progress items', () => {
    const baseline: BaselineReality = {
      date: '2025-01-20',
      filePath: '/test/baseline.md',
      rawContent: '',
      sections: [],
      whatInProgress: ['story node is being developed', 'unrelated API work'],
    }

    const constraints = extractConstraintsFromBaseline(baseline, 'story')

    expect(constraints).toContainEqual('Coordinate with in-progress: story node is being developed')
    expect(constraints).not.toContainEqual(expect.stringContaining('API'))
  })
})

describe('extractAffectedFiles', () => {
  it('returns empty array when context is null', () => {
    const files = extractAffectedFiles(null)
    expect(files).toEqual([])
  })

  it('returns empty array when context is undefined', () => {
    const files = extractAffectedFiles(undefined)
    expect(files).toEqual([])
  })

  it('returns relative paths of loaded files', () => {
    const context: RetrievedContext = {
      storyId: 'flow-023',
      retrievedAt: new Date().toISOString(),
      files: [
        {
          filePath: '/project/src/a.ts',
          relativePath: 'src/a.ts',
          contentLoaded: true,
          truncated: false,
        },
        {
          filePath: '/project/src/b.ts',
          relativePath: 'src/b.ts',
          contentLoaded: true,
          truncated: false,
        },
        {
          filePath: '/project/src/c.ts',
          relativePath: 'src/c.ts',
          contentLoaded: false,
          truncated: false,
        },
      ],
      totalFilesFound: 3,
      filesLoaded: 2,
      retrievalErrors: [],
    }

    const files = extractAffectedFiles(context)

    expect(files).toEqual(['src/a.ts', 'src/b.ts'])
    expect(files).not.toContain('src/c.ts')
  })

  it('respects maxFiles limit', () => {
    const context: RetrievedContext = {
      storyId: 'flow-023',
      retrievedAt: new Date().toISOString(),
      files: [
        { filePath: '/a.ts', relativePath: 'a.ts', contentLoaded: true, truncated: false },
        { filePath: '/b.ts', relativePath: 'b.ts', contentLoaded: true, truncated: false },
        { filePath: '/c.ts', relativePath: 'c.ts', contentLoaded: true, truncated: false },
        { filePath: '/d.ts', relativePath: 'd.ts', contentLoaded: true, truncated: false },
      ],
      totalFilesFound: 4,
      filesLoaded: 4,
      retrievalErrors: [],
    }

    const files = extractAffectedFiles(context, 2)

    expect(files).toHaveLength(2)
    expect(files).toEqual(['a.ts', 'b.ts'])
  })
})

describe('generateInitialACs', () => {
  it('generates core functionality AC from request', () => {
    const request: StoryRequest = {
      title: 'Add story seed node',
      description: 'Create a node that generates story structure',
      domain: 'orchestrator',
      tags: [],
    }

    const acs = generateInitialACs(request, [])

    expect(acs[0]).toMatchObject({
      id: 'AC-1',
      description: expect.stringContaining('Add story seed node'),
      fromBaseline: false,
    })
  })

  it('generates domain validation AC', () => {
    const request: StoryRequest = {
      title: 'Test feature',
      description: 'Test description',
      domain: 'backend',
      tags: [],
    }

    const acs = generateInitialACs(request, [])

    expect(acs[1]).toMatchObject({
      id: 'AC-2',
      description: expect.stringContaining('backend domain'),
      fromBaseline: false,
    })
  })

  it('generates ACs from no-modify constraints', () => {
    const request: StoryRequest = {
      title: 'Test',
      description: 'Test',
      domain: 'test',
      tags: [],
    }
    const constraints = ['Must not modify: Core module', 'Must not modify: Utils package']

    const acs = generateInitialACs(request, constraints, 5)

    expect(acs).toContainEqual(
      expect.objectContaining({
        id: 'AC-3',
        description: 'Verify Core module remains unchanged',
        fromBaseline: true,
        baselineRef: 'Core module',
      }),
    )
  })

  it('generates ACs from coordinate constraints', () => {
    const request: StoryRequest = {
      title: 'Test',
      description: 'Test',
      domain: 'test',
      tags: [],
    }
    const constraints = ['Coordinate with in-progress: Related feature']

    const acs = generateInitialACs(request, constraints, 5)

    expect(acs).toContainEqual(
      expect.objectContaining({
        description: 'Coordinate implementation with Related feature',
        fromBaseline: true,
      }),
    )
  })

  it('respects maxACs limit', () => {
    const request: StoryRequest = {
      title: 'Test',
      description: 'Test',
      domain: 'test',
      tags: [],
    }
    const constraints = [
      'Must not modify: A',
      'Must not modify: B',
      'Must not modify: C',
      'Must not modify: D',
    ]

    const acs = generateInitialACs(request, constraints, 3)

    expect(acs).toHaveLength(3)
  })
})

describe('estimateComplexity', () => {
  it('returns small for few files and constraints', () => {
    const context: RetrievedContext = {
      storyId: 'flow-023',
      retrievedAt: new Date().toISOString(),
      files: [
        { filePath: '/a.ts', relativePath: 'a.ts', contentLoaded: true, truncated: false },
        { filePath: '/b.ts', relativePath: 'b.ts', contentLoaded: true, truncated: false },
      ],
      totalFilesFound: 2,
      filesLoaded: 2,
      retrievalErrors: [],
    }

    expect(estimateComplexity(context, 1)).toBe('small')
  })

  it('returns medium for moderate files and constraints', () => {
    const files = Array.from({ length: 8 }, (_, i) => ({
      filePath: `/${i}.ts`,
      relativePath: `${i}.ts`,
      contentLoaded: true,
      truncated: false,
    }))

    const context: RetrievedContext = {
      storyId: 'flow-023',
      retrievedAt: new Date().toISOString(),
      files,
      totalFilesFound: 8,
      filesLoaded: 8,
      retrievalErrors: [],
    }

    expect(estimateComplexity(context, 3)).toBe('medium')
  })

  it('returns large for many files or constraints', () => {
    const files = Array.from({ length: 15 }, (_, i) => ({
      filePath: `/${i}.ts`,
      relativePath: `${i}.ts`,
      contentLoaded: true,
      truncated: false,
    }))

    const context: RetrievedContext = {
      storyId: 'flow-023',
      retrievedAt: new Date().toISOString(),
      files,
      totalFilesFound: 15,
      filesLoaded: 15,
      retrievalErrors: [],
    }

    expect(estimateComplexity(context, 6)).toBe('large')
  })

  it('handles null context', () => {
    expect(estimateComplexity(null, 0)).toBe('small')
    expect(estimateComplexity(null, 6)).toBe('large')
  })
})

describe('generateStorySeed', () => {
  const validRequest: StoryRequest = {
    title: 'Add story seed node',
    description: 'Create a node that generates initial story structure',
    domain: 'orchestrator',
    tags: ['langgraph', 'node'],
  }

  it('generates story structure from valid request', async () => {
    const result = await generateStorySeed(null, null, validRequest, {
      storyIdPrefix: 'flow',
      startingNumber: 23,
    })

    expect(result.seeded).toBe(true)
    expect(result.storyStructure).not.toBeNull()
    expect(result.storyStructure?.storyId).toBe('flow-023')
    expect(result.storyStructure?.title).toBe('Add story seed node')
    expect(result.storyStructure?.domain).toBe('orchestrator')
    expect(result.storyStructure?.tags).toEqual(['langgraph', 'node'])
  })

  it('includes warnings when baseline is missing', async () => {
    const result = await generateStorySeed(null, null, validRequest)

    expect(result.warnings).toContainEqual(
      'No baseline reality available - constraints may be incomplete',
    )
  })

  it('includes warnings when context is missing', async () => {
    const result = await generateStorySeed(null, null, validRequest)

    expect(result.warnings).toContainEqual(
      'No retrieved context available - file impact analysis skipped',
    )
  })

  it('extracts constraints from baseline', async () => {
    const baseline: BaselineReality = {
      date: '2025-01-20',
      filePath: '/test/baseline.md',
      rawContent: '',
      sections: [],
      noRework: ['Core orchestrator module'],
    }

    const result = await generateStorySeed(baseline, null, validRequest)

    expect(result.storyStructure?.constraints).toContainEqual(
      'Must not modify: Core orchestrator module',
    )
  })

  it('extracts affected files from context', async () => {
    const context: RetrievedContext = {
      storyId: 'flow-023',
      retrievedAt: new Date().toISOString(),
      files: [
        {
          filePath: '/project/src/seed.ts',
          relativePath: 'src/seed.ts',
          contentLoaded: true,
          truncated: false,
        },
      ],
      totalFilesFound: 1,
      filesLoaded: 1,
      retrievalErrors: [],
    }

    const result = await generateStorySeed(null, context, validRequest)

    expect(result.storyStructure?.affectedFiles).toContain('src/seed.ts')
  })

  it('handles invalid request gracefully', async () => {
    const invalidRequest = {
      title: '',
      description: 'Missing title',
      domain: 'test',
    } as StoryRequest

    const result = await generateStorySeed(null, null, invalidRequest)

    expect(result.seeded).toBe(false)
    expect(result.error).toBeDefined()
    expect(result.storyStructure).toBeNull()
  })

  it('uses default config values', async () => {
    const result = await generateStorySeed(null, null, validRequest)

    expect(result.seeded).toBe(true)
    expect(result.storyStructure?.storyId).toBe('story-001')
  })

  it('respects deriveConstraints config', async () => {
    const baseline: BaselineReality = {
      date: '2025-01-20',
      filePath: '/test/baseline.md',
      rawContent: '',
      sections: [],
      noRework: ['Some module'],
    }

    const result = await generateStorySeed(baseline, null, validRequest, {
      deriveConstraints: false,
    })

    expect(result.storyStructure?.constraints).toEqual([])
  })

  it('respects includeFileImpact config', async () => {
    const context: RetrievedContext = {
      storyId: 'flow-023',
      retrievedAt: new Date().toISOString(),
      files: [
        {
          filePath: '/project/src/file.ts',
          relativePath: 'src/file.ts',
          contentLoaded: true,
          truncated: false,
        },
      ],
      totalFilesFound: 1,
      filesLoaded: 1,
      retrievalErrors: [],
    }

    const result = await generateStorySeed(null, context, validRequest, {
      includeFileImpact: false,
    })

    expect(result.storyStructure?.affectedFiles).toEqual([])
  })
})

describe('StoryRequestSchema validation', () => {
  it('validates valid story request', () => {
    const validRequest = {
      title: 'Feature Title',
      description: 'Feature description',
      domain: 'backend',
      tags: ['api', 'feature'],
      priority: 2,
      requestedBy: 'user@example.com',
    }

    expect(() => StoryRequestSchema.parse(validRequest)).not.toThrow()
  })

  it('applies defaults for optional fields', () => {
    const minimalRequest = {
      title: 'Feature',
      description: 'Description',
      domain: 'test',
    }

    const parsed = StoryRequestSchema.parse(minimalRequest)

    expect(parsed.tags).toEqual([])
    expect(parsed.priority).toBeUndefined()
    expect(parsed.requestedBy).toBeUndefined()
  })

  it('rejects empty required fields', () => {
    const invalidRequests = [
      { title: '', description: 'desc', domain: 'test' },
      { title: 'title', description: '', domain: 'test' },
      { title: 'title', description: 'desc', domain: '' },
    ]

    for (const request of invalidRequests) {
      expect(() => StoryRequestSchema.parse(request)).toThrow()
    }
  })

  it('validates priority range', () => {
    expect(() =>
      StoryRequestSchema.parse({
        title: 'T',
        description: 'D',
        domain: 'd',
        priority: 0,
      }),
    ).toThrow()

    expect(() =>
      StoryRequestSchema.parse({
        title: 'T',
        description: 'D',
        domain: 'd',
        priority: 6,
      }),
    ).toThrow()

    expect(() =>
      StoryRequestSchema.parse({
        title: 'T',
        description: 'D',
        domain: 'd',
        priority: 3,
      }),
    ).not.toThrow()
  })
})

describe('AcceptanceCriterionSchema validation', () => {
  it('validates valid acceptance criterion', () => {
    const valid = {
      id: 'AC-1',
      description: 'Feature works as expected',
      fromBaseline: true,
      baselineRef: 'Module X',
    }

    expect(() => AcceptanceCriterionSchema.parse(valid)).not.toThrow()
  })

  it('applies defaults', () => {
    const minimal = {
      id: 'AC-1',
      description: 'Test',
    }

    const parsed = AcceptanceCriterionSchema.parse(minimal)

    expect(parsed.fromBaseline).toBe(false)
    expect(parsed.baselineRef).toBeUndefined()
  })
})

describe('StoryStructureSchema validation', () => {
  it('validates complete story structure', () => {
    const structure = {
      storyId: 'flow-023',
      title: 'Story Title',
      description: 'Story description',
      domain: 'orchestrator',
      acceptanceCriteria: [{ id: 'AC-1', description: 'Works', fromBaseline: false }],
      constraints: ['Constraint 1'],
      affectedFiles: ['src/a.ts'],
      dependencies: ['flow-022'],
      estimatedComplexity: 'medium' as const,
      tags: ['tag1'],
    }

    expect(() => StoryStructureSchema.parse(structure)).not.toThrow()
  })

  it('validates story ID format', () => {
    const validIds = ['flow-001', 'FLOW-123', 'story-9999', 'wrkf-1']

    for (const storyId of validIds) {
      const structure = {
        storyId,
        title: 'T',
        description: 'D',
        domain: 'd',
        acceptanceCriteria: [],
      }
      expect(() => StoryStructureSchema.parse(structure)).not.toThrow()
    }
  })

  it('rejects invalid story ID format', () => {
    const invalidIds = ['flow', '123', 'flow_001', 'flow-', '-001']

    for (const storyId of invalidIds) {
      const structure = {
        storyId,
        title: 'T',
        description: 'D',
        domain: 'd',
        acceptanceCriteria: [],
      }
      expect(() => StoryStructureSchema.parse(structure)).toThrow()
    }
  })
})

describe('SeedConfigSchema validation', () => {
  it('applies all defaults', () => {
    const parsed = SeedConfigSchema.parse({})

    expect(parsed.storyIdPrefix).toBe('story')
    expect(parsed.startingNumber).toBe(1)
    expect(parsed.maxInitialACs).toBe(5)
    expect(parsed.includeFileImpact).toBe(true)
    expect(parsed.deriveConstraints).toBe(true)
  })

  it('validates custom config', () => {
    const config = {
      storyIdPrefix: 'flow',
      startingNumber: 100,
      maxInitialACs: 10,
      includeFileImpact: false,
      deriveConstraints: false,
    }

    const parsed = SeedConfigSchema.parse(config)

    expect(parsed).toEqual(config)
  })
})

describe('SeedResultSchema validation', () => {
  it('validates successful result', () => {
    const result = {
      storyStructure: {
        storyId: 'flow-023',
        title: 'T',
        description: 'D',
        domain: 'd',
        acceptanceCriteria: [],
        constraints: [],
        affectedFiles: [],
        dependencies: [],
        tags: [],
      },
      seeded: true,
      warnings: [],
    }

    expect(() => SeedResultSchema.parse(result)).not.toThrow()
  })

  it('validates failed result', () => {
    const result = {
      storyStructure: null,
      seeded: false,
      error: 'Something went wrong',
      warnings: ['Warning 1'],
    }

    expect(() => SeedResultSchema.parse(result)).not.toThrow()
  })
})

describe('storySeedNode integration', () => {
  it('creates valid initial state for testing', () => {
    const state = createInitialState({ epicPrefix: 'flow', storyId: 'flow-023' })

    expect(state.epicPrefix).toBe('flow')
    expect(state.storyId).toBe('flow-023')
  })
})
