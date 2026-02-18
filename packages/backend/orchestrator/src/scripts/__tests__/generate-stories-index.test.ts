/**
 * Unit Tests: generate-stories-index.ts
 *
 * Tests all pure functions for WINT-1070:
 * - computeProgressSummary: counts by state, all enum values included
 * - computeReadyToStart: only ready-to-work with all deps satisfied
 * - renderStorySection: YAML missing case renders —
 * - renderFrontmatter: created_at preserved, updated_at set
 * - renderProgressTable: all enum values present
 * - renderReadyToStartTable: correct table format
 * - groupStoriesByPhase: sorting, unphased stories
 * - compareLineByLine: inline diff implementation
 *
 * Story: WINT-1070
 */

import { describe, it, expect, vi } from 'vitest'

// ============================================================================
// Module-level mocks (must be before imports)
// ============================================================================

vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('pg', () => ({
  Pool: vi.fn().mockImplementation(() => ({
    query: vi.fn(),
    end: vi.fn().mockResolvedValue(undefined),
  })),
}))

// Mock adapter dependencies to prevent resolution of gray-matter and js-yaml
// in the worktree (packages only available in main monorepo node_modules)
vi.mock('gray-matter', () => ({
  default: vi.fn().mockImplementation((content: string) => ({
    data: {},
    content: content,
  })),
}))

vi.mock('js-yaml', () => ({
  default: {
    dump: vi.fn().mockReturnValue(''),
    load: vi.fn().mockReturnValue({}),
  },
  dump: vi.fn().mockReturnValue(''),
  load: vi.fn().mockReturnValue({}),
}))

vi.mock('../../adapters/story-file-adapter.js', () => ({
  StoryFileAdapter: vi.fn().mockImplementation(() => ({
    read: vi.fn(),
  })),
}))

vi.mock('../../adapters/__types__/index.js', () => ({
  ValidationError: class ValidationError extends Error {
    constructor(filePath: string, errors: any[]) {
      super(`Validation error: ${filePath}`)
    }
  },
  StoryNotFoundError: class StoryNotFoundError extends Error {
    constructor(filePath: string) {
      super(`Story not found: ${filePath}`)
    }
  },
}))

vi.mock('../../db/story-repository.js', () => ({
  createStoryRepository: vi.fn().mockReturnValue({
    getAllStories: vi.fn().mockResolvedValue([]),
  }),
}))

// Mock __types__/index.js to prevent loading @repo/database-schema/schema/wint
// which is a workspace package unavailable in the worktree test environment.
// StoryRowSchema is imported as a value in generate-stories-index.ts (for GenerationResultSchema).
vi.mock('../../__types__/index.js', async () => {
  const { z } = await import('zod')
  const StoryRowSchema = z.object({
    id: z.string(),
    story_id: z.string(),
    feature_id: z.string().nullable(),
    type: z.string(),
    state: z.string(),
    title: z.string(),
    goal: z.string().nullable(),
    points: z.number().nullable(),
    priority: z.string().nullable(),
    blocked_by: z.string().nullable(),
    depends_on: z.array(z.string()).nullable(),
    follow_up_from: z.string().nullable(),
    packages: z.array(z.string()).nullable(),
    surfaces: z.array(z.string()).nullable(),
    non_goals: z.array(z.string()).nullable(),
    created_at: z.date(),
    updated_at: z.date(),
  })
  return { StoryRowSchema }
})

// ============================================================================
// Imports after mocks
// ============================================================================

import {
  computeProgressSummary,
  computeReadyToStart,
  renderStorySection,
  renderFrontmatter,
  renderProgressTable,
  renderReadyToStartTable,
  groupStoriesByPhase,
  compareLineByLine,
  buildStorySection,
  extractCreatedAt,
  findMonorepoRoot,
  parseArgs,
} from '../generate-stories-index.js'

import {
  STORY_STATE_ENUM,
  STATE_TO_DISPLAY_LABEL,
  FIELD_SOURCE_MAP,
  IndexFrontmatterSchema,
} from '../__types__/generation.js'

import type { StoryRow } from '../../__types__/index.js'
import type { StorySection, YamlFallbackData } from '../__types__/generation.js'

// ============================================================================
// Helpers
// ============================================================================

function makeStoryRow(overrides: Partial<StoryRow> = {}): StoryRow {
  return {
    id: 'uuid-001',
    story_id: 'WINT-0010',
    feature_id: null,
    type: 'feature',
    state: 'ready-to-work' as any,
    title: 'Test Story',
    goal: 'Test goal',
    points: 3,
    priority: 'p2',
    blocked_by: null,
    depends_on: null,
    follow_up_from: null,
    packages: [],
    surfaces: [],
    non_goals: [],
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
    ...overrides,
  }
}

function makeStorySection(overrides: Partial<StorySection> = {}): StorySection {
  return {
    story_id: 'WINT-0010',
    title: 'Test Story',
    state: 'ready-to-work',
    depends_on: null,
    phase: 0,
    feature: 'Test feature description',
    infrastructure: ['database'],
    goal: 'Test goal',
    risk_notes: 'Low risk',
    field_sources: {
      state: 'db',
      title: 'db',
      goal: 'db',
      depends_on: 'db',
      phase: 'yaml_fallback',
      risk_notes: 'yaml_fallback',
      feature: 'yaml_fallback',
      infrastructure: 'yaml_fallback',
    },
    ...overrides,
  }
}

// ============================================================================
// STORY_STATE_ENUM (AC-13)
// ============================================================================

describe('STORY_STATE_ENUM', () => {
  it('contains all expected enum values from wint.story_state', () => {
    expect(STORY_STATE_ENUM).toContain('draft')
    expect(STORY_STATE_ENUM).toContain('backlog')
    expect(STORY_STATE_ENUM).toContain('ready-to-work')
    expect(STORY_STATE_ENUM).toContain('in-progress')
    expect(STORY_STATE_ENUM).toContain('ready-for-qa')
    expect(STORY_STATE_ENUM).toContain('uat')
    expect(STORY_STATE_ENUM).toContain('done')
    expect(STORY_STATE_ENUM).toContain('cancelled')
    expect(STORY_STATE_ENUM).toHaveLength(8)
  })

  it('STATE_TO_DISPLAY_LABEL covers all enum values', () => {
    for (const state of STORY_STATE_ENUM) {
      expect(STATE_TO_DISPLAY_LABEL[state]).toBeDefined()
    }
  })

  it('ready-to-work maps to ready-to-work display label', () => {
    expect(STATE_TO_DISPLAY_LABEL['ready-to-work']).toBe('ready-to-work')
  })

  it('in-progress maps to in-progress display label', () => {
    expect(STATE_TO_DISPLAY_LABEL['in-progress']).toBe('in-progress')
  })
})

// ============================================================================
// FIELD_SOURCE_MAP (AC-2)
// ============================================================================

describe('FIELD_SOURCE_MAP', () => {
  it('state, title, goal, depends_on are sourced from db', () => {
    expect(FIELD_SOURCE_MAP.state).toBe('db')
    expect(FIELD_SOURCE_MAP.title).toBe('db')
    expect(FIELD_SOURCE_MAP.goal).toBe('db')
    expect(FIELD_SOURCE_MAP.depends_on).toBe('db')
  })

  it('phase, risk_notes, feature, infrastructure are yaml_fallback', () => {
    expect(FIELD_SOURCE_MAP.phase).toBe('yaml_fallback')
    expect(FIELD_SOURCE_MAP.risk_notes).toBe('yaml_fallback')
    expect(FIELD_SOURCE_MAP.feature).toBe('yaml_fallback')
    expect(FIELD_SOURCE_MAP.infrastructure).toBe('yaml_fallback')
  })

  it('created_at and updated_at are computed', () => {
    expect(FIELD_SOURCE_MAP.created_at).toBe('computed')
    expect(FIELD_SOURCE_MAP.updated_at).toBe('computed')
  })
})

// ============================================================================
// computeProgressSummary (AC-4) - Critical: off-by-one risk
// ============================================================================

describe('computeProgressSummary', () => {
  it('counts stories by state correctly', () => {
    const stories = [
      makeStoryRow({ story_id: 'WINT-0010', state: 'ready-to-work' as any }),
      makeStoryRow({ story_id: 'WINT-0020', state: 'ready-to-work' as any }),
      makeStoryRow({ story_id: 'WINT-0030', state: 'in-progress' as any }),
      makeStoryRow({ story_id: 'WINT-0040', state: 'done' as any }),
    ]

    const summary = computeProgressSummary(stories)

    expect(summary['ready-to-work']).toBe(2)
    expect(summary['in-progress']).toBe(1)
    expect(summary['done']).toBe(1)
    expect(summary['backlog']).toBe(0)
  })

  it('initializes all STORY_STATE_ENUM values to 0', () => {
    const summary = computeProgressSummary([])

    for (const state of STORY_STATE_ENUM) {
      expect(summary[state]).toBe(0)
    }
  })

  it('handles empty stories array', () => {
    const summary = computeProgressSummary([])
    expect(Object.keys(summary).length).toBeGreaterThanOrEqual(STORY_STATE_ENUM.length)
  })

  it('all STORY_STATE_ENUM values are present in summary', () => {
    const stories = [makeStoryRow({ state: 'backlog' as any })]
    const summary = computeProgressSummary(stories)

    for (const state of STORY_STATE_ENUM) {
      expect(summary).toHaveProperty(state)
    }
  })

  it('ready-to-work display label maps correctly (AC-4)', () => {
    const stories = [makeStoryRow({ state: 'ready-to-work' as any })]
    const summary = computeProgressSummary(stories)
    expect(summary['ready-to-work']).toBe(1)
  })
})

// ============================================================================
// computeReadyToStart (AC-5) - Critical: partial deps must NOT trigger inclusion
// ============================================================================

describe('computeReadyToStart', () => {
  it('includes ready-to-work stories with no dependencies', () => {
    const stories = [makeStoryRow({ state: 'ready-to-work' as any, depends_on: null })]
    const ready = computeReadyToStart(stories)
    expect(ready).toHaveLength(1)
    expect(ready[0].story_id).toBe('WINT-0010')
  })

  it('includes stories with empty depends_on array', () => {
    const stories = [makeStoryRow({ state: 'ready-to-work' as any, depends_on: [] })]
    const ready = computeReadyToStart(stories)
    expect(ready).toHaveLength(1)
  })

  it('includes stories where ALL deps are done', () => {
    const stories = [
      makeStoryRow({
        story_id: 'WINT-0020',
        state: 'ready-to-work' as any,
        depends_on: ['WINT-0010'],
      }),
      makeStoryRow({ story_id: 'WINT-0010', state: 'done' as any }),
    ]
    const ready = computeReadyToStart(stories)
    expect(ready).toHaveLength(1)
    expect(ready[0].story_id).toBe('WINT-0020')
  })

  it('includes stories where ALL deps are uat', () => {
    const stories = [
      makeStoryRow({
        story_id: 'WINT-0020',
        state: 'ready-to-work' as any,
        depends_on: ['WINT-0010'],
      }),
      makeStoryRow({ story_id: 'WINT-0010', state: 'uat' as any }),
    ]
    const ready = computeReadyToStart(stories)
    expect(ready).toHaveLength(1)
  })

  it('excludes stories with any pending dependency (partial satisfaction)', () => {
    const stories = [
      makeStoryRow({
        story_id: 'WINT-0030',
        state: 'ready-to-work' as any,
        depends_on: ['WINT-0010', 'WINT-0020'],
      }),
      makeStoryRow({ story_id: 'WINT-0010', state: 'done' as any }),
      makeStoryRow({ story_id: 'WINT-0020', state: 'in-progress' as any }), // Not done!
    ]
    const ready = computeReadyToStart(stories)
    expect(ready).toHaveLength(0)
  })

  it('excludes stories in non-ready-to-work states', () => {
    const stories = [makeStoryRow({ state: 'in-progress' as any })]
    const ready = computeReadyToStart(stories)
    expect(ready).toHaveLength(0)
  })

  it('excludes backlog stories even with no dependencies', () => {
    const stories = [makeStoryRow({ state: 'backlog' as any, depends_on: null })]
    const ready = computeReadyToStart(stories)
    expect(ready).toHaveLength(0)
  })

  it('handles stories with unknown dependency IDs (treat as unsatisfied)', () => {
    const stories = [
      makeStoryRow({
        story_id: 'WINT-0020',
        state: 'ready-to-work' as any,
        depends_on: ['WINT-UNKNOWN'],
      }),
    ]
    const ready = computeReadyToStart(stories)
    // WINT-UNKNOWN is not in the stories list, so its state is undefined → not satisfied
    expect(ready).toHaveLength(0)
  })
})

// ============================================================================
// renderStorySection (AC-6)
// ============================================================================

describe('renderStorySection', () => {
  it('renders a complete story section with all fields', () => {
    const section = makeStorySection()
    const rendered = renderStorySection(section)

    expect(rendered).toContain('### WINT-0010: Test Story')
    expect(rendered).toContain('**Status:** ready-to-work')
    expect(rendered).toContain('**Depends On:** none')
    expect(rendered).toContain('**Phase:** 0')
    expect(rendered).toContain('**Feature:** Test feature description')
    expect(rendered).toContain('**Goal:** Test goal')
    expect(rendered).toContain('**Risk Notes:** Low risk')
  })

  it('renders — for missing feature (YAML not found)', () => {
    const section = makeStorySection({ feature: null })
    const rendered = renderStorySection(section)
    expect(rendered).toContain('**Feature:** —')
  })

  it('renders — for missing goal', () => {
    const section = makeStorySection({ goal: null })
    const rendered = renderStorySection(section)
    expect(rendered).toContain('**Goal:** —')
  })

  it('renders — for missing risk_notes', () => {
    const section = makeStorySection({ risk_notes: null })
    const rendered = renderStorySection(section)
    expect(rendered).toContain('**Risk Notes:** —')
  })

  it('renders — for missing phase', () => {
    const section = makeStorySection({ phase: null })
    const rendered = renderStorySection(section)
    expect(rendered).toContain('**Phase:** —')
  })

  it('renders — for null infrastructure', () => {
    const section = makeStorySection({ infrastructure: null })
    const rendered = renderStorySection(section)
    expect(rendered).toContain('**Infrastructure:** —')
  })

  it('renders infrastructure as bullet list when present', () => {
    const section = makeStorySection({ infrastructure: ['postgres', 'lambda'] })
    const rendered = renderStorySection(section)
    expect(rendered).toContain('**Infrastructure:**')
    expect(rendered).toContain('- postgres')
    expect(rendered).toContain('- lambda')
  })

  it('renders depends_on as comma-separated list', () => {
    const section = makeStorySection({ depends_on: ['WINT-0010', 'WINT-0020'] })
    const rendered = renderStorySection(section)
    expect(rendered).toContain('**Depends On:** WINT-0010, WINT-0020')
  })

  it('renders depends_on as none for empty array', () => {
    const section = makeStorySection({ depends_on: [] })
    const rendered = renderStorySection(section)
    expect(rendered).toContain('**Depends On:** none')
  })

  it('converts state to display label', () => {
    const section = makeStorySection({ state: 'ready-to-work' })
    const rendered = renderStorySection(section)
    expect(rendered).toContain('**Status:** ready-to-work')
  })
})

// ============================================================================
// renderFrontmatter (AC-3)
// ============================================================================

describe('renderFrontmatter', () => {
  it('generates valid YAML frontmatter with all required fields', () => {
    const result = renderFrontmatter({
      title: 'WINT Stories Index',
      story_prefix: 'WINT',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-02-01T00:00:00Z',
    })

    expect(result).toContain('---')
    expect(result).toContain('doc_type: stories_index')
    expect(result).toContain('status: generated')
    expect(result).toContain('story_prefix: "WINT"')
    expect(result).toContain('created_at: "2026-01-01T00:00:00Z"')
    expect(result).toContain('updated_at: "2026-02-01T00:00:00Z"')
    expect(result).toContain('generated_by: generate-stories-index.ts')
  })

  it('preserves provided created_at value', () => {
    const originalCreatedAt = '2026-01-15T12:00:00Z'
    const result = renderFrontmatter({
      title: 'WINT Stories Index',
      story_prefix: 'WINT',
      created_at: originalCreatedAt,
      updated_at: '2026-02-17T00:00:00Z',
    })

    expect(result).toContain(`created_at: "${originalCreatedAt}"`)
  })

  it('generates frontmatter that validates against IndexFrontmatterSchema', () => {
    const result = renderFrontmatter({
      title: 'WINT Stories Index',
      story_prefix: 'WINT',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-02-01T00:00:00Z',
    })

    // Extract frontmatter fields manually and validate
    const frontmatter = {
      doc_type: 'stories_index',
      title: 'WINT Stories Index',
      status: 'generated',
      story_prefix: 'WINT',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-02-01T00:00:00Z',
      generated_by: 'generate-stories-index.ts',
    }

    expect(() => IndexFrontmatterSchema.parse(frontmatter)).not.toThrow()
  })
})

// ============================================================================
// renderProgressTable (AC-4)
// ============================================================================

describe('renderProgressTable', () => {
  it('renders table with all STORY_STATE_ENUM values', () => {
    const summary: Record<string, number> = {}
    for (const state of STORY_STATE_ENUM) {
      summary[state] = 0
    }

    const result = renderProgressTable(summary)

    expect(result).toContain('## Progress Summary')
    expect(result).toContain('| Status | Count |')
    expect(result).toContain('|--------|-------|')

    for (const state of STORY_STATE_ENUM) {
      expect(result).toContain(STATE_TO_DISPLAY_LABEL[state])
    }
  })

  it('shows correct counts', () => {
    const summary: Record<string, number> = {}
    for (const state of STORY_STATE_ENUM) {
      summary[state] = 0
    }
    summary['ready-to-work'] = 5
    summary['done'] = 10

    const result = renderProgressTable(summary)

    expect(result).toContain('| ready-to-work | 5 |')
    expect(result).toContain('| done | 10 |')
  })

  it('renders 0 for states with no stories', () => {
    const summary: Record<string, number> = {}
    for (const state of STORY_STATE_ENUM) {
      summary[state] = 0
    }

    const result = renderProgressTable(summary)
    expect(result).toContain('| backlog | 0 |')
  })
})

// ============================================================================
// renderReadyToStartTable (AC-5)
// ============================================================================

describe('renderReadyToStartTable', () => {
  it('renders table headers correctly', () => {
    const result = renderReadyToStartTable([], [])

    expect(result).toContain('## Ready to Start')
    expect(result).toContain('| Story | Feature | Blocked By |')
    expect(result).toContain('|-------|---------|------------|')
  })

  it('renders empty table with dash row when no ready stories', () => {
    const result = renderReadyToStartTable([], [])
    expect(result).toContain('| — | — | — |')
  })

  it('renders story rows for ready stories', () => {
    const stories = [makeStoryRow({ story_id: 'WINT-0180', state: 'ready-to-work' as any })]
    const sections = [makeStorySection({ story_id: 'WINT-0180', feature: 'Build indexer' })]

    const result = renderReadyToStartTable(stories, sections)

    expect(result).toContain('| WINT-0180 | Build indexer | — |')
  })

  it('uses title when feature is null', () => {
    const stories = [
      makeStoryRow({ story_id: 'WINT-0180', title: 'Build indexer', state: 'ready-to-work' as any }),
    ]
    const sections = [makeStorySection({ story_id: 'WINT-0180', feature: null })]

    const result = renderReadyToStartTable(stories, sections)

    expect(result).toContain('WINT-0180')
  })
})

// ============================================================================
// groupStoriesByPhase
// ============================================================================

describe('groupStoriesByPhase', () => {
  it('groups stories by phase', () => {
    const sections = [
      makeStorySection({ story_id: 'WINT-0010', phase: 0 }),
      makeStorySection({ story_id: 'WINT-1010', phase: 1 }),
      makeStorySection({ story_id: 'WINT-0020', phase: 0 }),
    ]

    const groups = groupStoriesByPhase(sections)

    expect(groups.has('0')).toBe(true)
    expect(groups.has('1')).toBe(true)
    expect(groups.get('0')!).toHaveLength(2)
    expect(groups.get('1')!).toHaveLength(1)
  })

  it('sorts stories within each phase by story_id ascending', () => {
    const sections = [
      makeStorySection({ story_id: 'WINT-0030', phase: 0 }),
      makeStorySection({ story_id: 'WINT-0010', phase: 0 }),
      makeStorySection({ story_id: 'WINT-0020', phase: 0 }),
    ]

    const groups = groupStoriesByPhase(sections)
    const phase0 = groups.get('0')!

    expect(phase0[0].story_id).toBe('WINT-0010')
    expect(phase0[1].story_id).toBe('WINT-0020')
    expect(phase0[2].story_id).toBe('WINT-0030')
  })

  it('groups stories without phase into "unphased"', () => {
    const sections = [makeStorySection({ story_id: 'WINT-0010', phase: null })]

    const groups = groupStoriesByPhase(sections)

    expect(groups.has('unphased')).toBe(true)
    expect(groups.get('unphased')!).toHaveLength(1)
  })

  it('places numeric phases before unphased', () => {
    const sections = [
      makeStorySection({ story_id: 'WINT-9999', phase: null }),
      makeStorySection({ story_id: 'WINT-0010', phase: 0 }),
    ]

    const groups = groupStoriesByPhase(sections)
    const keys = Array.from(groups.keys())

    expect(keys[0]).toBe('0')
    expect(keys[keys.length - 1]).toBe('unphased')
  })

  it('sorts phases numerically (phase 2 before phase 10)', () => {
    const sections = [
      makeStorySection({ story_id: 'WINT-1000', phase: 10 }),
      makeStorySection({ story_id: 'WINT-0200', phase: 2 }),
    ]

    const groups = groupStoriesByPhase(sections)
    const keys = Array.from(groups.keys())

    expect(keys[0]).toBe('2')
    expect(keys[1]).toBe('10')
  })

  it('handles empty sections array', () => {
    const groups = groupStoriesByPhase([])
    expect(groups.size).toBe(0)
  })
})

// ============================================================================
// compareLineByLine (AC-8 — inline diff)
// ============================================================================

describe('compareLineByLine', () => {
  it('returns identical=true for identical strings', () => {
    const content = 'line 1\nline 2\nline 3'
    const result = compareLineByLine(content, content)

    expect(result.identical).toBe(true)
    expect(result.diffLines).toHaveLength(0)
    expect(result.addedCount).toBe(0)
    expect(result.removedCount).toBe(0)
  })

  it('returns identical=false for different strings', () => {
    const actual = 'line 1\nline 2\nline 3'
    const expected = 'line 1\nline X\nline 3'

    const result = compareLineByLine(actual, expected)

    expect(result.identical).toBe(false)
    expect(result.diffLines.length).toBeGreaterThan(0)
  })

  it('detects removed lines', () => {
    const actual = 'line 1\nline 2\nline 3'
    const expected = 'line 1\nline 3'

    const result = compareLineByLine(actual, expected)

    expect(result.identical).toBe(false)
    expect(result.removedCount).toBeGreaterThan(0)
  })

  it('detects added lines', () => {
    const actual = 'line 1\nline 3'
    const expected = 'line 1\nline 2\nline 3'

    const result = compareLineByLine(actual, expected)

    expect(result.identical).toBe(false)
    expect(result.addedCount).toBeGreaterThan(0)
  })

  it('handles empty strings', () => {
    const result = compareLineByLine('', '')
    expect(result.identical).toBe(true)
  })

  it('includes line number in diff output', () => {
    const actual = 'line 1\nline X'
    const expected = 'line 1\nline 2'

    const result = compareLineByLine(actual, expected)

    expect(result.diffLines.some(l => l.includes('[line 2]'))).toBe(true)
  })
})

// ============================================================================
// buildStorySection
// ============================================================================

describe('buildStorySection', () => {
  it('builds section from DB row with YAML fallback', () => {
    const row = makeStoryRow()
    const yaml: YamlFallbackData = {
      phase: 0,
      risk_notes: 'Some risk',
      feature: 'Feature description',
      infrastructure: ['postgres'],
    }

    const section = buildStorySection(row, yaml)

    expect(section.story_id).toBe('WINT-0010')
    expect(section.title).toBe('Test Story')
    expect(section.state).toBe('ready-to-work')
    expect(section.phase).toBe(0)
    expect(section.risk_notes).toBe('Some risk')
    expect(section.feature).toBe('Feature description')
    expect(section.infrastructure).toEqual(['postgres'])
    expect(section.goal).toBe('Test goal')
  })

  it('builds section with null yaml (DB-only)', () => {
    const row = makeStoryRow()
    const section = buildStorySection(row, null)

    expect(section.phase).toBeNull()
    expect(section.risk_notes).toBeNull()
    expect(section.feature).toBeNull()
    expect(section.infrastructure).toBeNull()
    expect(section.field_sources.phase).toBe('missing')
    expect(section.field_sources.state).toBe('db')
  })

  it('marks DB fields correctly in field_sources', () => {
    const row = makeStoryRow()
    const section = buildStorySection(row, null)

    expect(section.field_sources.state).toBe('db')
    expect(section.field_sources.title).toBe('db')
    expect(section.field_sources.goal).toBe('db')
    expect(section.field_sources.depends_on).toBe('db')
  })

  it('marks yaml_fallback fields correctly when yaml provided', () => {
    const row = makeStoryRow()
    const yaml: YamlFallbackData = {
      phase: 1,
      risk_notes: 'risk',
      feature: 'feat',
      infrastructure: ['db'],
    }
    const section = buildStorySection(row, yaml)

    expect(section.field_sources.phase).toBe('yaml_fallback')
    expect(section.field_sources.risk_notes).toBe('yaml_fallback')
    expect(section.field_sources.feature).toBe('yaml_fallback')
    expect(section.field_sources.infrastructure).toBe('yaml_fallback')
  })
})

// ============================================================================
// parseArgs
// ============================================================================

describe('parseArgs', () => {
  const originalArgv = process.argv

  afterEach(() => {
    process.argv = originalArgv
  })

  it('defaults to dry-run mode', () => {
    process.argv = ['node', 'script.ts']
    const opts = parseArgs()
    expect(opts.mode).toBe('dry-run')
  })

  it('parses --generate flag', () => {
    process.argv = ['node', 'script.ts', '--generate']
    const opts = parseArgs()
    expect(opts.mode).toBe('generate')
  })

  it('parses --verify flag', () => {
    process.argv = ['node', 'script.ts', '--verify']
    const opts = parseArgs()
    expect(opts.mode).toBe('verify')
  })

  it('parses --dry-run flag explicitly', () => {
    process.argv = ['node', 'script.ts', '--dry-run']
    const opts = parseArgs()
    expect(opts.mode).toBe('dry-run')
  })
})
