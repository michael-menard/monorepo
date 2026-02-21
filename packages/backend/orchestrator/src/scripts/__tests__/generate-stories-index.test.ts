/**
 * Unit Tests for generate-stories-index.ts pure rendering functions
 *
 * Tests all pure functions achieving ≥80% coverage:
 * - computeProgressSummary
 * - computeReadyToStart
 * - renderStorySection
 * - renderFrontmatter
 * - renderProgressTable
 * - renderReadyToStartTable
 * - groupStoriesByPhase
 * - extractPhaseFromStoryId
 * - computeLineDiff
 * - formatDiffSummary
 *
 * Story: WINT-1070
 */

import { describe, it, expect } from 'vitest'
import type { StoryRow } from '../../__types__/index.js'
import {
  computeProgressSummary,
  computeReadyToStart,
  renderStorySection,
  renderFrontmatter,
  renderProgressTable,
  renderReadyToStartTable,
  groupStoriesByPhase,
  extractPhaseFromStoryId,
  computeLineDiff,
  formatDiffSummary,
} from '../generate-stories-index.js'
import type { StorySection, IndexFrontmatter } from '../__types__/generation.js'

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Create a minimal StoryRow for testing.
 * DB uses underscore state values (ready_to_work, not ready-to-work).
 */
function makeStoryRow(overrides: { story_id: string; state: string } & Partial<StoryRow>): StoryRow {
  return {
    id: `uuid-${overrides.story_id}`,
    story_id: overrides.story_id,
    feature_id: null,
    type: 'feature',
    state: overrides.state as any,
    title: overrides.title ?? `Story ${overrides.story_id}`,
    goal: overrides.goal ?? null,
    points: null,
    priority: null,
    blocked_by: null,
    depends_on: overrides.depends_on ?? null,
    follow_up_from: null,
    packages: null,
    surfaces: null,
    non_goals: null,
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
    ...overrides,
  } as StoryRow
}

function makeStorySection(overrides: { story_id: string } & Partial<StorySection>): StorySection {
  return {
    story_id: overrides.story_id,
    title: overrides.title ?? `Story ${overrides.story_id}`,
    status: overrides.status ?? 'backlog',
    state: (overrides.state ?? 'backlog') as any,
    depends_on: overrides.depends_on ?? [],
    phase: overrides.phase ?? null,
    feature: overrides.feature ?? null,
    infrastructure: overrides.infrastructure ?? null,
    goal: overrides.goal ?? null,
    risk_notes: overrides.risk_notes ?? null,
  }
}

// ============================================================================
// extractPhaseFromStoryId Tests
// ============================================================================

describe('extractPhaseFromStoryId', () => {
  it('extracts phase 0 from WINT-0010', () => {
    expect(extractPhaseFromStoryId('WINT-0010')).toBe('0')
  })

  it('extracts phase 1 from WINT-1070', () => {
    expect(extractPhaseFromStoryId('WINT-1070')).toBe('1')
  })

  it('extracts phase 4 from WINT-4060', () => {
    expect(extractPhaseFromStoryId('WINT-4060')).toBe('4')
  })

  it('extracts phase 9 from WINT-9010', () => {
    expect(extractPhaseFromStoryId('WINT-9010')).toBe('9')
  })

  it('returns null for malformed story IDs', () => {
    expect(extractPhaseFromStoryId('INVALID')).toBeNull()
    expect(extractPhaseFromStoryId('WINT-10')).toBeNull()
    expect(extractPhaseFromStoryId('')).toBeNull()
  })

  it('handles variant suffix (e.g., WINT-1070A)', () => {
    expect(extractPhaseFromStoryId('WINT-1070A')).toBe('1')
  })
})

// ============================================================================
// computeProgressSummary Tests
// ============================================================================

describe('computeProgressSummary', () => {
  it('returns an empty array for empty input', () => {
    const summary = computeProgressSummary([])
    expect(Array.isArray(summary)).toBe(true)
    expect(summary).toHaveLength(0)
  })

  it('counts stories by state label', () => {
    const stories = [
      makeStoryRow({ story_id: 'WINT-0010', state: 'ready_to_work' }),
      makeStoryRow({ story_id: 'WINT-0020', state: 'ready_to_work' }),
      makeStoryRow({ story_id: 'WINT-0030', state: 'in_progress' }),
      makeStoryRow({ story_id: 'WINT-0040', state: 'done' }),
    ]

    const summary = computeProgressSummary(stories)

    // AC-4: STATE_TO_DISPLAY_LABEL mapping (ready_to_work → ready-to-work)
    const readyToWork = summary.find(s => s.label === 'ready-to-work')
    expect(readyToWork?.count).toBe(2)

    const inProgress = summary.find(s => s.label === 'in-progress')
    expect(inProgress?.count).toBe(1)

    const done = summary.find(s => s.label === 'done')
    expect(done?.count).toBe(1)
  })

  it('maps ready_to_work to ready-to-work display label (AC-4)', () => {
    const stories = [makeStoryRow({ story_id: 'WINT-0010', state: 'ready_to_work' })]
    const summary = computeProgressSummary(stories)
    // AC-4: STATE_TO_DISPLAY_LABEL(ready_to_work) → ready-to-work
    expect(summary.some(s => s.label === 'ready-to-work' && s.count === 1)).toBe(true)
    expect(summary.some(s => s.label === 'ready_to_work')).toBe(false)
  })

  it('maps in_progress to in-progress display label', () => {
    const stories = [makeStoryRow({ story_id: 'WINT-0010', state: 'in_progress' })]
    const summary = computeProgressSummary(stories)
    expect(summary.some(s => s.label === 'in-progress' && s.count === 1)).toBe(true)
  })

  it('maps ready_for_qa to ready-for-qa display label', () => {
    const stories = [makeStoryRow({ story_id: 'WINT-0010', state: 'ready_for_qa' })]
    const summary = computeProgressSummary(stories)
    expect(summary.some(s => s.label === 'ready-for-qa' && s.count === 1)).toBe(true)
  })

  it('maps in_qa to in-qa display label', () => {
    const stories = [makeStoryRow({ story_id: 'WINT-0010', state: 'in_qa' })]
    const summary = computeProgressSummary(stories)
    expect(summary.some(s => s.label === 'in-qa' && s.count === 1)).toBe(true)
  })

  it('returns { label, count } objects', () => {
    const stories = [makeStoryRow({ story_id: 'WINT-0010', state: 'done' })]
    const summary = computeProgressSummary(stories)
    expect(summary[0]).toHaveProperty('label')
    expect(summary[0]).toHaveProperty('count')
  })

  it('sorts by count descending', () => {
    const stories = [
      makeStoryRow({ story_id: 'WINT-0010', state: 'done' }),
      makeStoryRow({ story_id: 'WINT-0020', state: 'done' }),
      makeStoryRow({ story_id: 'WINT-0030', state: 'done' }),
      makeStoryRow({ story_id: 'WINT-0040', state: 'backlog' }),
    ]
    const summary = computeProgressSummary(stories)
    // done has 3, backlog has 1 → done should be first
    expect(summary[0].count).toBeGreaterThanOrEqual(summary[1].count)
  })

  it('handles large number of stories (performance)', () => {
    const stories = Array.from({ length: 143 }, (_, i) =>
      makeStoryRow({ story_id: `WINT-${String(i).padStart(4, '0')}`, state: 'backlog' }),
    )
    const summary = computeProgressSummary(stories)
    const backlog = summary.find(s => s.label === 'backlog')
    expect(backlog?.count).toBe(143)
  })
})

// ============================================================================
// computeReadyToStart Tests (AC-5)
// ============================================================================

describe('computeReadyToStart', () => {
  it('includes story with no deps in ready_to_work state', () => {
    const stories = [
      makeStoryRow({ story_id: 'WINT-0010', state: 'ready_to_work', depends_on: [] }),
    ]

    // AC-5: story with all deps in done/uat is included (no deps = included)
    const ready = computeReadyToStart(stories)
    expect(ready).toHaveLength(1)
    expect(ready[0].story_id).toBe('WINT-0010')
  })

  it('includes story with all deps in done state', () => {
    const stories = [
      makeStoryRow({ story_id: 'WINT-0010', state: 'done' }),
      makeStoryRow({ story_id: 'WINT-0020', state: 'ready_to_work', depends_on: ['WINT-0010'] }),
    ]

    // AC-5: story with all deps in done/uat is included
    const ready = computeReadyToStart(stories)
    expect(ready).toHaveLength(1)
    expect(ready[0].story_id).toBe('WINT-0020')
  })

  it('includes story with all deps in in_qa (UAT) state', () => {
    const stories = [
      makeStoryRow({ story_id: 'WINT-0010', state: 'in_qa' }),
      makeStoryRow({ story_id: 'WINT-0020', state: 'ready_to_work', depends_on: ['WINT-0010'] }),
    ]

    // AC-5: in_qa counts as satisfied (UAT)
    const ready = computeReadyToStart(stories)
    expect(ready).toHaveLength(1)
  })

  it('excludes story with one pending dep (AC-5)', () => {
    const stories = [
      makeStoryRow({ story_id: 'WINT-0010', state: 'in_progress' }),
      makeStoryRow({ story_id: 'WINT-0020', state: 'ready_to_work', depends_on: ['WINT-0010'] }),
    ]

    // AC-5: story with one pending dep is absent
    const ready = computeReadyToStart(stories)
    expect(ready).toHaveLength(0)
  })

  it('excludes story with mixed satisfied/pending deps (AC-5)', () => {
    const stories = [
      makeStoryRow({ story_id: 'WINT-0010', state: 'done' }),
      makeStoryRow({ story_id: 'WINT-0020', state: 'backlog' }),
      makeStoryRow({
        story_id: 'WINT-0030',
        state: 'ready_to_work',
        depends_on: ['WINT-0010', 'WINT-0020'],
      }),
    ]

    // AC-5: partial satisfaction does not trigger inclusion
    const ready = computeReadyToStart(stories)
    expect(ready).toHaveLength(0)
  })

  it('excludes stories not in ready_to_work state', () => {
    const stories = [
      makeStoryRow({ story_id: 'WINT-0010', state: 'in_progress' }),
      makeStoryRow({ story_id: 'WINT-0020', state: 'backlog' }),
    ]

    const ready = computeReadyToStart(stories)
    expect(ready).toHaveLength(0)
  })

  it('handles dep not found in DB as unsatisfied', () => {
    const stories = [
      makeStoryRow({
        story_id: 'WINT-0010',
        state: 'ready_to_work',
        depends_on: ['EXTERNAL-0010'], // Not in stories array
      }),
    ]

    const ready = computeReadyToStart(stories)
    expect(ready).toHaveLength(0)
  })

  it('returns empty array for empty input', () => {
    expect(computeReadyToStart([])).toHaveLength(0)
  })
})

// ============================================================================
// renderFrontmatter Tests (AC-3, AC-10)
// ============================================================================

describe('renderFrontmatter', () => {
  const validFrontmatter: IndexFrontmatter = {
    doc_type: 'stories_index',
    title: 'WINT Stories Index',
    status: 'generated',
    story_prefix: 'WINT',
    generated_at: '2026-02-18T00:00:00Z',
    generated_by: 'generate-stories-index.ts',
    story_count: 143,
  }

  it('renders valid frontmatter with doc_type stories_index (AC-3)', () => {
    const output = renderFrontmatter(validFrontmatter)
    expect(output).toContain('doc_type: stories_index')
  })

  it('renders status: generated (AC-3)', () => {
    const output = renderFrontmatter(validFrontmatter)
    expect(output).toContain('status: generated')
  })

  it('renders generated_by field (AC-10)', () => {
    const output = renderFrontmatter(validFrontmatter)
    expect(output).toContain('generated_by: "generate-stories-index.ts"')
  })

  it('includes DO NOT EDIT warning after closing --- (AC-10)', () => {
    const output = renderFrontmatter(validFrontmatter)
    // AC-10: DO NOT EDIT warning present immediately after closing ---
    expect(output).toContain('DO NOT EDIT')
    // Verify it appears AFTER the frontmatter closing ---
    const closingDashIdx = output.lastIndexOf('---')
    const doNotEditIdx = output.indexOf('DO NOT EDIT')
    expect(doNotEditIdx).toBeGreaterThan(closingDashIdx)
  })

  it('starts with --- delimiter', () => {
    const output = renderFrontmatter(validFrontmatter)
    expect(output.startsWith('---')).toBe(true)
  })

  it('contains the story count', () => {
    const output = renderFrontmatter(validFrontmatter)
    expect(output).toContain('story_count: 143')
  })

  it('contains generated_at timestamp', () => {
    const output = renderFrontmatter(validFrontmatter)
    expect(output).toContain('generated_at: "2026-02-18T00:00:00Z"')
  })
})

// ============================================================================
// renderProgressTable Tests (AC-4)
// ============================================================================

describe('renderProgressTable', () => {
  it('renders Progress Summary header', () => {
    const output = renderProgressTable([{ label: 'ready-to-work', count: 3 }])
    expect(output).toContain('## Progress Summary')
  })

  it('renders table with correct counts', () => {
    const output = renderProgressTable([
      { label: 'ready-to-work', count: 3 },
      { label: 'done', count: 10 },
    ])
    expect(output).toContain('| ready-to-work | 3 |')
    expect(output).toContain('| done | 10 |')
  })

  it('renders table header row', () => {
    const output = renderProgressTable([])
    expect(output).toContain('| Status | Count |')
    expect(output).toContain('|--------|-------|')
  })

  it('handles empty summary array', () => {
    const output = renderProgressTable([])
    expect(output).toContain('## Progress Summary')
  })

  it('renders all entries from array', () => {
    const entries = [
      { label: 'done', count: 5 },
      { label: 'backlog', count: 3 },
      { label: 'in-progress', count: 1 },
    ]
    const output = renderProgressTable(entries)
    expect(output).toContain('| done | 5 |')
    expect(output).toContain('| backlog | 3 |')
    expect(output).toContain('| in-progress | 1 |')
  })
})

// ============================================================================
// renderReadyToStartTable Tests
// ============================================================================

describe('renderReadyToStartTable', () => {
  it('renders Ready to Start header', () => {
    const output = renderReadyToStartTable([])
    expect(output).toContain('## Ready to Start')
  })

  it('renders message when no stories are ready', () => {
    const output = renderReadyToStartTable([])
    // Implementation renders "No stories are currently ready to start"
    expect(output).toContain('No stories are currently ready to start')
  })

  it('renders table header columns when stories are ready', () => {
    const story = makeStoryRow({ story_id: 'WINT-0010', state: 'ready_to_work', title: 'Build DB' })
    const output = renderReadyToStartTable([story])
    expect(output).toContain('| Story | Feature | Blocked By |')
  })

  it('renders story row with story_id and title', () => {
    const story = makeStoryRow({
      story_id: 'WINT-0010',
      state: 'ready_to_work',
      title: 'Build the thing',
    })
    const output = renderReadyToStartTable([story])
    expect(output).toContain('| WINT-0010 |')
    expect(output).toContain('Build the thing')
  })

  it('handles multiple ready stories', () => {
    const stories = [
      makeStoryRow({ story_id: 'WINT-0010', state: 'ready_to_work', title: 'Story A' }),
      makeStoryRow({ story_id: 'WINT-0020', state: 'ready_to_work', title: 'Story B' }),
    ]
    const output = renderReadyToStartTable(stories)
    expect(output).toContain('WINT-0010')
    expect(output).toContain('WINT-0020')
  })
})

// ============================================================================
// renderStorySection Tests (AC-6)
// ============================================================================

describe('renderStorySection', () => {
  const fullSection = makeStorySection({
    story_id: 'WINT-0010',
    title: 'Create Core Database Schemas',
    status: 'done',
    state: 'done',
    depends_on: ['WINT-0001'],
    phase: 0,
    feature: 'Create 6 database schemas',
    infrastructure: 'postgres-knowledgebase database',
    goal: 'Establish schema structure',
    risk_notes: 'Must not break existing KB functionality',
  })

  it('renders story ID as h3 heading (AC-6)', () => {
    const output = renderStorySection(fullSection)
    expect(output).toContain('### WINT-0010: Create Core Database Schemas')
  })

  it('renders Status header (AC-6)', () => {
    const output = renderStorySection(fullSection)
    expect(output).toContain('**Status:** done')
  })

  it('renders Depends On header (AC-6)', () => {
    const output = renderStorySection(fullSection)
    expect(output).toContain('**Depends On:** WINT-0001')
  })

  it('renders Phase header (AC-6)', () => {
    const output = renderStorySection(fullSection)
    expect(output).toContain('**Phase:** 0')
  })

  it('renders Feature header (AC-6)', () => {
    const output = renderStorySection(fullSection)
    expect(output).toContain('**Feature:** Create 6 database schemas')
  })

  it('renders Infrastructure header (AC-6)', () => {
    const output = renderStorySection(fullSection)
    expect(output).toContain('**Infrastructure:**')
    expect(output).toContain('postgres-knowledgebase database')
  })

  it('renders Goal header (AC-6)', () => {
    const output = renderStorySection(fullSection)
    expect(output).toContain('**Goal:** Establish schema structure')
  })

  it('renders Risk Notes header (AC-6)', () => {
    const output = renderStorySection(fullSection)
    expect(output).toContain('**Risk Notes:** Must not break existing KB functionality')
  })

  it('renders — for missing phase (AC-6)', () => {
    const section = makeStorySection({ story_id: 'WINT-0010', phase: null })
    const output = renderStorySection(section)
    expect(output).toContain('**Phase:** —')
  })

  it('renders — for missing feature (AC-6)', () => {
    const section = makeStorySection({ story_id: 'WINT-0010', feature: null })
    const output = renderStorySection(section)
    expect(output).toContain('**Feature:** —')
  })

  it('renders — for missing infrastructure (AC-6)', () => {
    const section = makeStorySection({ story_id: 'WINT-0010', infrastructure: null })
    const output = renderStorySection(section)
    expect(output).toContain('- —')
  })

  it('renders — for missing goal (AC-6)', () => {
    const section = makeStorySection({ story_id: 'WINT-0010', goal: null })
    const output = renderStorySection(section)
    expect(output).toContain('**Goal:** —')
  })

  it('renders — for missing risk notes (AC-6)', () => {
    const section = makeStorySection({ story_id: 'WINT-0010', risk_notes: null })
    const output = renderStorySection(section)
    expect(output).toContain('**Risk Notes:** —')
  })

  it('renders "none" for empty depends_on', () => {
    const section = makeStorySection({ story_id: 'WINT-0010', depends_on: [] })
    const output = renderStorySection(section)
    expect(output).toContain('**Depends On:** none')
  })

  it('renders multiple dependencies comma-separated', () => {
    const section = makeStorySection({
      story_id: 'WINT-0010',
      depends_on: ['WINT-0001', 'WINT-0002'],
    })
    const output = renderStorySection(section)
    expect(output).toContain('**Depends On:** WINT-0001, WINT-0002')
  })

  it('ends with --- separator', () => {
    const output = renderStorySection(fullSection)
    expect(output).toContain('---')
  })

  it('renders null phase as — (AC-6)', () => {
    const section = makeStorySection({ story_id: 'WINT-0010', phase: undefined })
    const output = renderStorySection(section)
    expect(output).toContain('**Phase:** —')
  })
})

// ============================================================================
// groupStoriesByPhase Tests
// ============================================================================

describe('groupStoriesByPhase', () => {
  it('groups sections by phase extracted from story ID', () => {
    const sections = [
      makeStorySection({ story_id: 'WINT-0010' }), // phase 0
      makeStorySection({ story_id: 'WINT-1010' }), // phase 1
      makeStorySection({ story_id: 'WINT-1020' }), // phase 1
    ]

    const groups = groupStoriesByPhase(sections)
    expect(groups.size).toBe(2)
    expect(groups.get('0')).toHaveLength(1)
    expect(groups.get('1')).toHaveLength(2)
  })

  it('groups sections without recognizable phase under unknown', () => {
    const sections = [
      makeStorySection({ story_id: 'INVALID-STORY' }),
    ]

    const groups = groupStoriesByPhase(sections)
    expect(groups.has('unknown')).toBe(true)
    expect(groups.get('unknown')).toHaveLength(1)
  })

  it('handles empty sections array', () => {
    const groups = groupStoriesByPhase([])
    expect(groups.size).toBe(0)
  })

  it('extracts correct phase from various story IDs', () => {
    const sections = [
      makeStorySection({ story_id: 'WINT-4060' }), // phase 4
      makeStorySection({ story_id: 'WINT-4070' }), // phase 4
      makeStorySection({ story_id: 'WINT-7010' }), // phase 7
    ]
    const groups = groupStoriesByPhase(sections)
    expect(groups.get('4')).toHaveLength(2)
    expect(groups.get('7')).toHaveLength(1)
  })

  it('returns sorted map by phase key', () => {
    const sections = [
      makeStorySection({ story_id: 'WINT-9010' }), // phase 9
      makeStorySection({ story_id: 'WINT-0010' }), // phase 0
      makeStorySection({ story_id: 'WINT-1010' }), // phase 1
    ]
    const groups = groupStoriesByPhase(sections)
    const keys = [...groups.keys()]
    // Keys should be sorted: 0, 1, 9
    expect(keys[0]).toBe('0')
    expect(keys[1]).toBe('1')
    expect(keys[2]).toBe('9')
  })
})

// ============================================================================
// computeLineDiff Tests (AC-8)
// ============================================================================

describe('computeLineDiff', () => {
  it('returns identical: true for identical strings', () => {
    const { identical } = computeLineDiff('line1\nline2', 'line1\nline2')
    // AC-8: exits 0 when files are identical
    expect(identical).toBe(true)
  })

  it('returns identical: false for different strings', () => {
    const { identical } = computeLineDiff('line1\nline2', 'line1\nDIFFERENT')
    // AC-8: exits 1 with diff summary when files differ
    expect(identical).toBe(false)
  })

  it('provides diffLines with lineNum, expected, actual', () => {
    const { diffLines } = computeLineDiff('original\nline2', 'modified\nline2')
    expect(diffLines.length).toBeGreaterThan(0)
    expect(diffLines[0]).toHaveProperty('lineNum')
    expect(diffLines[0]).toHaveProperty('expected')
    expect(diffLines[0]).toHaveProperty('actual')
  })

  it('reports correct line numbers for differences', () => {
    const { diffLines } = computeLineDiff('line1\noriginal\nline3', 'line1\nmodified\nline3')
    expect(diffLines[0].lineNum).toBe(2) // Second line differs
  })

  it('handles empty strings as identical', () => {
    const { identical } = computeLineDiff('', '')
    expect(identical).toBe(true)
  })

  it('detects difference when one string is longer', () => {
    const { identical } = computeLineDiff('line1', 'line1\nextra')
    expect(identical).toBe(false)
  })

  it('shows missing content as <missing>', () => {
    const { diffLines } = computeLineDiff('line1\nline2', 'line1')
    expect(diffLines.some(d => d.actual === '<missing>')).toBe(true)
  })
})

// ============================================================================
// formatDiffSummary Tests
// ============================================================================

describe('formatDiffSummary', () => {
  it('returns no-differences message for empty diffLines', () => {
    const output = formatDiffSummary([])
    expect(output).toContain('No differences')
  })

  it('formats diff lines with line numbers', () => {
    const diffLines = [{ lineNum: 5, expected: 'expected text', actual: 'actual text' }]
    const output = formatDiffSummary(diffLines)
    expect(output).toContain('Line 5')
  })

  it('shows expected and actual values', () => {
    const diffLines = [{ lineNum: 1, expected: 'foo', actual: 'bar' }]
    const output = formatDiffSummary(diffLines)
    expect(output).toContain('expected')
    expect(output).toContain('actual')
  })

  it('limits output to first 10 differences', () => {
    const diffLines = Array.from({ length: 25 }, (_, i) => ({
      lineNum: i + 1,
      expected: `exp${i}`,
      actual: `act${i}`,
    }))
    const output = formatDiffSummary(diffLines)
    // Should mention remaining differences
    expect(output).toContain('15 more differences')
  })
})
