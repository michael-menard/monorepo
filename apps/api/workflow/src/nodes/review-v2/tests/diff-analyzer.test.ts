/**
 * diff_analyzer node tests (review-v2)
 */

import { describe, it, expect, vi } from 'vitest'

vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

import {
  classifyFiles,
  detectRiskSurface,
  createDiffAnalyzerNode,
} from '../diff-analyzer.js'
import type { ReviewV2State } from '../../../state/review-v2-state.js'

// ============================================================================
// Helpers
// ============================================================================

function makeState(overrides: Partial<ReviewV2State> = {}): ReviewV2State {
  return {
    storyId: 'WINT-1234',
    worktreePath: '/tmp/worktrees/wint-1234',
    diffAnalysis: null,
    selectedReviewDimensions: [],
    reviewFindings: [],
    reviewVerdict: null,
    postconditionResult: null,
    reviewV2Phase: 'diff_analyzer',
    retryCount: 0,
    maxRetries: 2,
    tokenUsage: [],
    bakeOffVersion: 'v2-agentic',
    warnings: [],
    errors: [],
    ...overrides,
  }
}

// ============================================================================
// classifyFiles tests
// ============================================================================

describe('classifyFiles', () => {
  it('classifies frontend files', () => {
    const domains = classifyFiles(['apps/web/main-app/src/components/Button.tsx'])
    expect(domains).toContain('frontend')
  })

  it('classifies test files', () => {
    const domains = classifyFiles(['src/auth.test.ts'])
    expect(domains).toContain('tests')
  })

  it('classifies database files', () => {
    const domains = classifyFiles(['src/db/migrations/0001_init.sql'])
    expect(domains).toContain('database')
  })

  it('classifies config files', () => {
    const domains = classifyFiles(['vitest.config.ts'])
    expect(domains).toContain('config')
  })

  it('classifies type files', () => {
    const domains = classifyFiles(['src/__types__/index.ts'])
    expect(domains).toContain('types')
  })

  it('returns empty array for empty input', () => {
    expect(classifyFiles([])).toEqual([])
  })

  it('can assign multiple domains', () => {
    const domains = classifyFiles(['src/auth.ts', 'src/auth.test.ts', 'apps/web/Button.tsx'])
    expect(domains.length).toBeGreaterThan(1)
  })
})

// ============================================================================
// detectRiskSurface tests
// ============================================================================

describe('detectRiskSurface', () => {
  it('returns high for security-sensitive changes', () => {
    const result = detectRiskSurface([], true, false)
    expect(result).toBe('high')
  })

  it('returns high for database changes', () => {
    const result = detectRiskSurface([], false, true)
    expect(result).toBe('high')
  })

  it('returns high for large diffs', () => {
    const files = Array.from({ length: 15 }, (_, i) => ({
      path: `src/file${i}.ts`,
      changeType: 'modified' as const,
      linesAdded: 20,
      linesRemoved: 10,
      summary: '',
    }))
    const result = detectRiskSurface(files, false, false)
    expect(result).toBe('high')
  })

  it('returns medium for moderate diffs', () => {
    const files = [
      { path: 'src/a.ts', changeType: 'modified' as const, linesAdded: 30, linesRemoved: 10, summary: '' },
      { path: 'src/b.ts', changeType: 'modified' as const, linesAdded: 30, linesRemoved: 10, summary: '' },
    ]
    const result = detectRiskSurface(files, false, false)
    expect(result).toBe('medium')
  })

  it('returns low for small diffs', () => {
    const files = [
      { path: 'src/a.ts', changeType: 'modified' as const, linesAdded: 5, linesRemoved: 2, summary: '' },
    ]
    const result = detectRiskSurface(files, false, false)
    expect(result).toBe('low')
  })
})

// ============================================================================
// createDiffAnalyzerNode tests
// ============================================================================

describe('createDiffAnalyzerNode', () => {
  it('returns empty diff analysis when no reader', async () => {
    const node = createDiffAnalyzerNode()
    const result = await node(makeState())
    expect(result.diffAnalysis).not.toBeNull()
    expect(result.diffAnalysis?.changedFiles).toEqual([])
  })

  it('calls diffReader with worktreePath', async () => {
    const diffReader = vi.fn().mockResolvedValue([])
    const node = createDiffAnalyzerNode({ diffReader })
    await node(makeState())
    expect(diffReader).toHaveBeenCalledWith('/tmp/worktrees/wint-1234')
  })

  it('classifies changed files into domains', async () => {
    const diffReader = vi.fn().mockResolvedValue([
      { path: 'apps/web/Button.tsx', changeType: 'modified', linesAdded: 10, linesRemoved: 5 },
    ])
    const node = createDiffAnalyzerNode({ diffReader })
    const result = await node(makeState())
    expect(result.diffAnalysis?.affectedDomains).toContain('frontend')
  })

  it('detects security-sensitive changes', async () => {
    const diffReader = vi.fn().mockResolvedValue([
      { path: 'src/auth/token.ts', changeType: 'modified', linesAdded: 5, linesRemoved: 0 },
    ])
    const node = createDiffAnalyzerNode({ diffReader })
    const result = await node(makeState())
    expect(result.diffAnalysis?.hasSecuritySensitiveChanges).toBe(true)
  })

  it('detects database changes', async () => {
    const diffReader = vi.fn().mockResolvedValue([
      { path: 'src/db/migrations/0001.sql', changeType: 'created', linesAdded: 20, linesRemoved: 0 },
    ])
    const node = createDiffAnalyzerNode({ diffReader })
    const result = await node(makeState())
    expect(result.diffAnalysis?.hasDatabaseChanges).toBe(true)
  })

  it('sets phase to risk_assessor', async () => {
    const node = createDiffAnalyzerNode()
    const result = await node(makeState())
    expect(result.reviewV2Phase).toBe('risk_assessor')
  })

  it('degrades gracefully when diffReader throws', async () => {
    const diffReader = vi.fn().mockRejectedValue(new Error('git error'))
    const node = createDiffAnalyzerNode({ diffReader })
    const result = await node(makeState())
    expect(result.diffAnalysis).not.toBeNull()
    expect(result.diffAnalysis?.changedFiles).toEqual([])
  })
})
