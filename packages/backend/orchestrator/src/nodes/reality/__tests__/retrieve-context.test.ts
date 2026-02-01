import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createInitialState } from '../../../state/index.js'
import type { BaselineReality } from '../load-baseline.js'
import {
  determineRelevantPatterns,
  loadFileContent,
  matchesIncludePattern,
  retrieveContextForScope,
  shouldExcludeFile,
  ScopePatternSchema,
  StoryScopeSchema,
  RetrievedContextSchema,
  type ScopePattern,
  type StoryScope,
} from '../retrieve-context.js'

// Mock @repo/logger
vi.mock('@repo/logger', () => ({
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}))

// Mock fs module
vi.mock('node:fs/promises')

describe('determineRelevantPatterns', () => {
  it('returns include patterns from scope when no baseline', () => {
    const scope: StoryScope = {
      storyId: 'flow-022',
      domain: 'orchestrator',
      includePatterns: [{ type: 'glob', value: 'packages/backend/**', reason: 'Backend packages' }],
      excludePatterns: [],
      keywords: [],
      maxDepth: 5,
    }

    const patterns = determineRelevantPatterns(null, scope)

    expect(patterns).toContainEqual({
      type: 'glob',
      value: 'packages/backend/**',
      reason: 'Backend packages',
    })
  })

  it('adds baseline-derived patterns matching domain', () => {
    const baseline: BaselineReality = {
      date: '2025-01-20',
      filePath: '/test/BASELINE-REALITY-2025-01-20.md',
      rawContent: '',
      sections: [],
      whatExists: ['orchestrator package is implemented', 'api package is stable'],
      whatInProgress: ['orchestrator node factory'],
      noRework: [],
    }

    const scope: StoryScope = {
      storyId: 'flow-022',
      domain: 'orchestrator',
      includePatterns: [],
      excludePatterns: [],
      keywords: [],
      maxDepth: 5,
    }

    const patterns = determineRelevantPatterns(baseline, scope)

    // Should include patterns from whatExists and whatInProgress that match domain
    expect(patterns.some(p => p.value.includes('orchestrator'))).toBe(true)
  })

  it('adds domain-based glob pattern if not present', () => {
    const scope: StoryScope = {
      storyId: 'flow-022',
      domain: 'reality',
      includePatterns: [],
      excludePatterns: [],
      keywords: [],
      maxDepth: 5,
    }

    const patterns = determineRelevantPatterns(null, scope)

    expect(patterns.some(p => p.type === 'glob' && p.value.includes('reality'))).toBe(true)
  })
})

describe('shouldExcludeFile', () => {
  it('excludes files in excluded directories', () => {
    const excludeDirs = ['node_modules', 'dist']

    expect(shouldExcludeFile('/project/node_modules/package/index.js', [], excludeDirs)).toBe(true)
    expect(shouldExcludeFile('/project/dist/bundle.js', [], excludeDirs)).toBe(true)
    expect(shouldExcludeFile('/project/src/index.js', [], excludeDirs)).toBe(false)
  })

  it('excludes files matching exclude patterns', () => {
    const excludePatterns: ScopePattern[] = [
      { type: 'glob', value: '**/*.test.ts' },
      { type: 'path', value: '__mocks__' },
      { type: 'keyword', value: 'deprecated' },
    ]

    expect(shouldExcludeFile('/project/src/utils.test.ts', excludePatterns, [])).toBe(true)
    expect(shouldExcludeFile('/project/src/__mocks__/api.ts', excludePatterns, [])).toBe(true)
    expect(shouldExcludeFile('/project/src/deprecated-utils.ts', excludePatterns, [])).toBe(true)
    expect(shouldExcludeFile('/project/src/utils.ts', excludePatterns, [])).toBe(false)
  })
})

describe('matchesIncludePattern', () => {
  it('matches glob patterns', () => {
    const patterns: ScopePattern[] = [
      { type: 'glob', value: 'packages/backend/**/*.ts' },
    ]

    const result = matchesIncludePattern(
      '/project/packages/backend/orchestrator/index.ts',
      patterns,
      [],
    )

    expect(result.matches).toBe(true)
  })

  it('matches path patterns', () => {
    const patterns: ScopePattern[] = [{ type: 'path', value: 'nodes/reality' }]

    const result = matchesIncludePattern(
      '/project/packages/backend/orchestrator/nodes/reality/load-baseline.ts',
      patterns,
      [],
    )

    expect(result.matches).toBe(true)
  })

  it('matches keyword patterns', () => {
    const patterns: ScopePattern[] = [{ type: 'keyword', value: 'baseline' }]

    const result = matchesIncludePattern('/project/src/load-baseline.ts', patterns, [])

    expect(result.matches).toBe(true)
  })

  it('matches keywords from array', () => {
    const keywords = ['context', 'retrieval']

    const result = matchesIncludePattern('/project/src/retrieve-context.ts', [], keywords)

    expect(result.matches).toBe(true)
  })

  it('returns false when no patterns match', () => {
    const patterns: ScopePattern[] = [{ type: 'path', value: 'unrelated' }]

    const result = matchesIncludePattern('/project/src/utils.ts', patterns, [])

    expect(result.matches).toBe(false)
  })
})

describe('loadFileContent', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('loads file content without truncation', async () => {
    const content = 'export const hello = "world"'
    vi.mocked(fs.stat).mockResolvedValue({ size: content.length } as Awaited<
      ReturnType<typeof fs.stat>
    >)
    vi.mocked(fs.readFile).mockResolvedValue(content)

    const result = await loadFileContent('/test/file.ts', 1000)

    expect(result.content).toBe(content)
    expect(result.size).toBe(content.length)
    expect(result.truncated).toBe(false)
  })

  it('truncates content exceeding max length', async () => {
    const content = 'a'.repeat(200)
    vi.mocked(fs.stat).mockResolvedValue({ size: content.length } as Awaited<
      ReturnType<typeof fs.stat>
    >)
    vi.mocked(fs.readFile).mockResolvedValue(content)

    const result = await loadFileContent('/test/file.ts', 100)

    expect(result.content).toHaveLength(100 + '\n... [truncated]'.length)
    expect(result.content).toContain('[truncated]')
    expect(result.truncated).toBe(true)
  })
})

describe('retrieveContextForScope', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('returns context with baseline summary', async () => {
    // Mock an empty directory (no files found)
    vi.mocked(fs.readdir).mockResolvedValue([] as unknown as ReturnType<typeof fs.readdir>)

    const baseline: BaselineReality = {
      date: '2025-01-20',
      filePath: '/test/baseline.md',
      rawContent: '',
      sections: [],
      whatExists: ['Package A exists'],
      whatInProgress: ['Feature B in progress'],
      noRework: ['Module C stable'],
    }

    const scope: StoryScope = {
      storyId: 'flow-022',
      domain: 'test',
      includePatterns: [],
      excludePatterns: [],
      keywords: [],
      maxDepth: 3,
    }

    const result = await retrieveContextForScope(baseline, scope, {
      projectRoot: '/test/project',
      maxFiles: 10,
    })

    expect(result.retrieved).toBe(true)
    expect(result.context).not.toBeNull()
    expect(result.context?.baselineSummary).toEqual({
      whatExists: ['Package A exists'],
      whatInProgress: ['Feature B in progress'],
      noRework: ['Module C stable'],
    })
  })

  it('returns context without baseline when baseline is null', async () => {
    vi.mocked(fs.readdir).mockResolvedValue([] as unknown as ReturnType<typeof fs.readdir>)

    const scope: StoryScope = {
      storyId: 'flow-022',
      domain: 'test',
      includePatterns: [],
      excludePatterns: [],
      keywords: [],
      maxDepth: 3,
    }

    const result = await retrieveContextForScope(null, scope, {
      projectRoot: '/test/project',
    })

    expect(result.retrieved).toBe(true)
    expect(result.context?.baselineSummary).toBeUndefined()
  })

  it('retrieves files matching scope patterns', async () => {
    // Mock directory structure with matching files
    vi.mocked(fs.readdir).mockImplementation(async (dirPath: unknown) => {
      const dir = dirPath as string
      if (dir.endsWith('/project')) {
        return [
          { name: 'src', isFile: () => false, isDirectory: () => true },
        ] as unknown as ReturnType<typeof fs.readdir>
      }
      if (dir.endsWith('/src')) {
        return [
          { name: 'context-utils.ts', isFile: () => true, isDirectory: () => false },
          { name: 'unrelated.ts', isFile: () => true, isDirectory: () => false },
        ] as unknown as ReturnType<typeof fs.readdir>
      }
      return [] as unknown as ReturnType<typeof fs.readdir>
    })

    vi.mocked(fs.stat).mockResolvedValue({ size: 100 } as Awaited<ReturnType<typeof fs.stat>>)
    vi.mocked(fs.readFile).mockResolvedValue('const context = {}')

    const scope: StoryScope = {
      storyId: 'flow-022',
      domain: 'context',
      includePatterns: [],
      excludePatterns: [],
      keywords: ['context'],
      maxDepth: 3,
    }

    const result = await retrieveContextForScope(null, scope, {
      projectRoot: '/test/project',
      loadContent: true,
    })

    expect(result.retrieved).toBe(true)
    expect(result.context?.files.some(f => f.relativePath.includes('context-utils'))).toBe(true)
  })

  it('handles retrieval errors gracefully', async () => {
    vi.mocked(fs.readdir).mockRejectedValue(new Error('Permission denied'))

    const scope: StoryScope = {
      storyId: 'flow-022',
      domain: 'test',
      includePatterns: [],
      excludePatterns: [],
      keywords: [],
      maxDepth: 3,
    }

    const result = await retrieveContextForScope(null, scope, {
      projectRoot: '/forbidden/project',
    })

    // Should still return a valid result, possibly with empty files
    expect(result.retrieved).toBe(true)
    expect(result.context?.totalFilesFound).toBe(0)
  })
})

describe('retrieveContextNode integration', () => {
  it('creates valid initial state for testing', () => {
    const state = createInitialState({ epicPrefix: 'flow', storyId: 'flow-022' })

    expect(state.epicPrefix).toBe('flow')
    expect(state.storyId).toBe('flow-022')
  })
})

describe('ScopePatternSchema validation', () => {
  it('validates valid scope patterns', () => {
    const validPatterns = [
      { type: 'glob', value: '**/*.ts' },
      { type: 'path', value: 'src/utils' },
      { type: 'keyword', value: 'context', reason: 'Related to context retrieval' },
    ]

    for (const pattern of validPatterns) {
      expect(() => ScopePatternSchema.parse(pattern)).not.toThrow()
    }
  })

  it('rejects invalid scope patterns', () => {
    const invalidPatterns = [
      { type: 'invalid', value: 'test' },
      { type: 'glob', value: '' },
      { value: 'missing-type' },
    ]

    for (const pattern of invalidPatterns) {
      expect(() => ScopePatternSchema.parse(pattern)).toThrow()
    }
  })
})

describe('StoryScopeSchema validation', () => {
  it('validates valid story scope', () => {
    const validScope = {
      storyId: 'flow-022',
      domain: 'orchestrator',
      includePatterns: [{ type: 'glob', value: '**/*.ts' }],
      keywords: ['context', 'baseline'],
    }

    const parsed = StoryScopeSchema.parse(validScope)

    expect(parsed.storyId).toBe('flow-022')
    expect(parsed.domain).toBe('orchestrator')
    expect(parsed.maxDepth).toBe(5) // default
    expect(parsed.excludePatterns).toEqual([]) // default
  })

  it('applies defaults correctly', () => {
    const minimalScope = {
      storyId: 'flow-022',
      domain: 'test',
    }

    const parsed = StoryScopeSchema.parse(minimalScope)

    expect(parsed.includePatterns).toEqual([])
    expect(parsed.excludePatterns).toEqual([])
    expect(parsed.keywords).toEqual([])
    expect(parsed.maxDepth).toBe(5)
  })
})

describe('RetrievedContextSchema validation', () => {
  it('validates complete retrieved context', () => {
    const context = {
      storyId: 'flow-022',
      retrievedAt: new Date().toISOString(),
      files: [
        {
          filePath: '/test/file.ts',
          relativePath: 'file.ts',
          contentLoaded: true,
          content: 'const x = 1',
          size: 11,
          relevanceReason: 'Matches keyword',
          truncated: false,
        },
      ],
      baselineSummary: {
        whatExists: ['Item A'],
        whatInProgress: [],
        noRework: [],
      },
      totalFilesFound: 1,
      filesLoaded: 1,
      retrievalErrors: [],
    }

    expect(() => RetrievedContextSchema.parse(context)).not.toThrow()
  })
})
