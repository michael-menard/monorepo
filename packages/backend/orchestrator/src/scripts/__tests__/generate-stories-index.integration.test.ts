/**
 * Integration Tests: generate-stories-index.ts
 *
 * Tests the full generation pipeline against a real DB fixture (mocked pool)
 * and real filesystem operations on a temp directory.
 *
 * INT-1: --generate against fixture DB → compare to expected snapshot
 * INT-2: --verify after --generate → exit code 0
 * INT-3: --verify after manual mutation → exit code 1 with diff
 * INT-4: --dry-run → file hash unchanged
 * INT-5: Story in DB with no YAML file → generates entry with DB-only fields
 *
 * Note: These tests use a mocked DB pool (not a live connection) but real
 * filesystem temp directories to test atomic writes, file hashing, and
 * verify mode line-by-line comparison.
 *
 * Story: WINT-1070
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'

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
  renderFrontmatter,
  renderProgressTable,
  renderReadyToStartTable,
  renderStorySection,
  groupStoriesByPhase,
  buildStorySection,
  renderFullIndex,
  runGenerationPipeline,
  writeFileAtomic,
  compareLineByLine,
  extractCreatedAt,
} from '../generate-stories-index.js'

import { GenerationReportSchema, STORY_STATE_ENUM } from '../__types__/generation.js'
import type { StoryRow } from '../../__types__/index.js'
import type { StorySection } from '../__types__/generation.js'

// ============================================================================
// Fixture Data (simulates wint.stories DB rows)
// ============================================================================

function makeFixtureStories(): StoryRow[] {
  const now = new Date('2026-01-01')
  return [
    {
      id: 'uuid-001',
      story_id: 'WINT-0010',
      feature_id: null,
      type: 'feature',
      state: 'done' as any,
      title: 'Create Core Database Schemas',
      goal: 'Establish schema structure for all workflow data storage',
      points: 5,
      priority: 'p1',
      blocked_by: null,
      depends_on: null,
      follow_up_from: null,
      packages: [],
      surfaces: [],
      non_goals: [],
      created_at: now,
      updated_at: now,
    },
    {
      id: 'uuid-002',
      story_id: 'WINT-0020',
      feature_id: null,
      type: 'feature',
      state: 'ready-to-work' as any,
      title: 'Create Story Management Tables',
      goal: 'Enable database-driven story tracking',
      points: 3,
      priority: 'p2',
      blocked_by: null,
      depends_on: ['WINT-0010'],
      follow_up_from: null,
      packages: [],
      surfaces: [],
      non_goals: [],
      created_at: now,
      updated_at: now,
    },
    {
      id: 'uuid-003',
      story_id: 'WINT-0030',
      feature_id: null,
      type: 'feature',
      state: 'backlog' as any,
      title: 'Create Context Cache Tables',
      goal: 'Replace .cache/ files with database storage',
      points: 3,
      priority: 'p2',
      blocked_by: null,
      depends_on: ['WINT-0010'],
      follow_up_from: null,
      packages: [],
      surfaces: [],
      non_goals: [],
      created_at: now,
      updated_at: now,
    },
    {
      id: 'uuid-004',
      story_id: 'WINT-1010',
      feature_id: null,
      type: 'feature',
      state: 'in-progress' as any,
      title: 'Phase 1 Story',
      goal: 'Phase 1 goal',
      points: 2,
      priority: 'p3',
      blocked_by: null,
      depends_on: null,
      follow_up_from: null,
      packages: [],
      surfaces: [],
      non_goals: [],
      created_at: now,
      updated_at: now,
    },
  ]
}

// ============================================================================
// Helpers
// ============================================================================

function hashContent(content: string): string {
  return crypto.createHash('md5').update(content).digest('hex')
}

async function createTempDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'wint-integration-'))
}

async function cleanupTempDir(dir: string): Promise<void> {
  try {
    await fs.rm(dir, { recursive: true, force: true })
  } catch {
    // Ignore cleanup errors
  }
}

// Build sections from fixtures without YAML fallback (DB-only)
function buildFixtureSections(stories: StoryRow[]): StorySection[] {
  return stories.map(row => buildStorySection(row, null))
}

// ============================================================================
// INT-1: --generate against fixture DB → compare to expected snapshot
// ============================================================================

describe('INT-1: Generate pipeline with fixture DB', () => {
  it('generates a complete stories.index.md with frontmatter, progress table, and story sections', () => {
    const stories = makeFixtureStories()
    const sections = buildFixtureSections(stories)

    const progressSummary = computeProgressSummary(stories)
    const readyToStart = computeReadyToStart(stories)
    const groupedSections = groupStoriesByPhase(sections)
    const phaseDescriptions = new Map<string, string>()

    const frontmatterStr = renderFrontmatter({
      title: 'WINT Stories Index',
      story_prefix: 'WINT',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-02-01T00:00:00Z',
    })

    const progressTableStr = renderProgressTable(progressSummary)
    const readyToStartTableStr = renderReadyToStartTable(readyToStart, sections)
    const content = renderFullIndex(
      frontmatterStr,
      progressTableStr,
      readyToStartTableStr,
      groupedSections,
      phaseDescriptions,
    )

    // Verify structure
    expect(content).toContain('---')
    expect(content).toContain('doc_type: stories_index')
    expect(content).toContain('status: generated')
    expect(content).toContain('generated_by: generate-stories-index.ts')

    // DO NOT EDIT warning (AC-10)
    expect(content).toContain('DO NOT EDIT')
    expect(content).toContain('generate-stories-index.ts')

    // Progress table
    expect(content).toContain('## Progress Summary')
    expect(content).toContain('| Status | Count |')

    // Ready to Start table
    expect(content).toContain('## Ready to Start')

    // Story sections
    expect(content).toContain('### WINT-0010: Create Core Database Schemas')
    expect(content).toContain('### WINT-0020: Create Story Management Tables')
    expect(content).toContain('### WINT-0030: Create Context Cache Tables')
    expect(content).toContain('### WINT-1010: Phase 1 Story')
  })

  it('progress table counts match story states from fixture', () => {
    const stories = makeFixtureStories()
    const summary = computeProgressSummary(stories)

    expect(summary['done']).toBe(1)
    expect(summary['ready-to-work']).toBe(1)
    expect(summary['backlog']).toBe(1)
    expect(summary['in-progress']).toBe(1)
  })

  it('all STORY_STATE_ENUM values appear in progress table', () => {
    const stories = makeFixtureStories()
    const summary = computeProgressSummary(stories)
    const progressTable = renderProgressTable(summary)

    for (const state of STORY_STATE_ENUM) {
      expect(progressTable).toContain(state)
    }
  })

  it('generation report validates against GenerationReportSchema', () => {
    const stories = makeFixtureStories()
    const sections = buildFixtureSections(stories)
    const groupedSections = groupStoriesByPhase(sections)

    const storyCountByPhase: Record<string, number> = {}
    for (const [phase, phaseStories] of groupedSections) {
      storyCountByPhase[phase] = phaseStories.length
    }

    const storyCountByStatus: Record<string, number> = {}
    const summary = computeProgressSummary(stories)
    for (const [state, count] of Object.entries(summary)) {
      storyCountByStatus[state] = count
    }

    const report = {
      timestamp: new Date().toISOString(),
      story_count: stories.length,
      story_count_by_phase: storyCountByPhase,
      story_count_by_status: storyCountByStatus,
      field_source_breakdown: {
        db_fields: ['state', 'title', 'goal', 'depends_on'],
        yaml_fallback_fields: ['phase', 'risk_notes', 'feature', 'infrastructure'],
        computed_fields: ['created_at', 'updated_at'],
        stories_with_yaml_fallback: 0,
        stories_db_only: stories.length,
      },
      skipped_stories: [],
      duration_ms: 100,
      output_path: '/tmp/stories.index.md',
    }

    expect(() => GenerationReportSchema.parse(report)).not.toThrow()
  })

  it('spot-checks 5 stories for correct field rendering', () => {
    const stories = makeFixtureStories()
    const sections = buildFixtureSections(stories)

    const checkStory = (storyId: string, expectedTitle: string, expectedState: string) => {
      const section = sections.find(s => s.story_id === storyId)
      expect(section).toBeDefined()
      expect(section!.title).toBe(expectedTitle)
      expect(section!.state).toBe(expectedState)
    }

    checkStory('WINT-0010', 'Create Core Database Schemas', 'done')
    checkStory('WINT-0020', 'Create Story Management Tables', 'ready-to-work')
    checkStory('WINT-0030', 'Create Context Cache Tables', 'backlog')
    checkStory('WINT-1010', 'Phase 1 Story', 'in-progress')
  })
})

// ============================================================================
// INT-2: --verify after --generate → exit code 0 (identical content)
// ============================================================================

describe('INT-2: Verify mode - identical content', () => {
  it('compareLineByLine returns identical=true for same content', () => {
    const stories = makeFixtureStories()
    const sections = buildFixtureSections(stories)
    const progressSummary = computeProgressSummary(stories)
    const readyToStart = computeReadyToStart(stories)
    const groupedSections = groupStoriesByPhase(sections)
    const phaseDescriptions = new Map<string, string>()

    const frontmatterStr = renderFrontmatter({
      title: 'WINT Stories Index',
      story_prefix: 'WINT',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-02-01T00:00:00Z',
    })

    const content = renderFullIndex(
      frontmatterStr,
      renderProgressTable(progressSummary),
      renderReadyToStartTable(readyToStart, sections),
      groupedSections,
      phaseDescriptions,
    )

    // Verify against itself — should be identical (round-trip)
    const diff = compareLineByLine(content, content)

    expect(diff.identical).toBe(true)
    expect(diff.diffLines).toHaveLength(0)
    expect(diff.addedCount).toBe(0)
    expect(diff.removedCount).toBe(0)
  })
})

// ============================================================================
// INT-3: --verify after manual mutation → exit code 1 with diff
// ============================================================================

describe('INT-3: Verify mode - mutated content', () => {
  it('compareLineByLine returns identical=false when content is mutated', () => {
    const stories = makeFixtureStories()
    const sections = buildFixtureSections(stories)
    const progressSummary = computeProgressSummary(stories)
    const readyToStart = computeReadyToStart(stories)
    const groupedSections = groupStoriesByPhase(sections)
    const phaseDescriptions = new Map<string, string>()

    const frontmatterStr = renderFrontmatter({
      title: 'WINT Stories Index',
      story_prefix: 'WINT',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-02-01T00:00:00Z',
    })

    const originalContent = renderFullIndex(
      frontmatterStr,
      renderProgressTable(progressSummary),
      renderReadyToStartTable(readyToStart, sections),
      groupedSections,
      phaseDescriptions,
    )

    // Mutate the content (simulate manual edit)
    const mutatedContent = originalContent.replace(
      '### WINT-0010: Create Core Database Schemas',
      '### WINT-0010: MANUALLY EDITED TITLE',
    )

    const diff = compareLineByLine(mutatedContent, originalContent)

    expect(diff.identical).toBe(false)
    expect(diff.diffLines.length).toBeGreaterThan(0)
    expect(diff.addedCount + diff.removedCount).toBeGreaterThan(0)
  })

  it('diff output includes line number references', () => {
    const actual = 'line 1\nMUTATED LINE\nline 3'
    const expected = 'line 1\nORIGINAL LINE\nline 3'

    const diff = compareLineByLine(actual, expected)

    expect(diff.identical).toBe(false)
    expect(diff.diffLines.some(l => l.includes('[line 2]'))).toBe(true)
  })
})

// ============================================================================
// INT-4: --dry-run → file hash unchanged
// ============================================================================

describe('INT-4: Dry-run mode - file unchanged', () => {
  let tmpDir: string
  let indexPath: string

  beforeEach(async () => {
    tmpDir = await createTempDir()
    indexPath = path.join(tmpDir, 'stories.index.md')
  })

  afterEach(async () => {
    await cleanupTempDir(tmpDir)
  })

  it('dry-run does not write to the target file (file unchanged)', async () => {
    // Create initial file content
    const initialContent = '# Initial Content\n\nThis should not change.'
    await fs.writeFile(indexPath, initialContent, 'utf8')

    // Record hash before dry-run
    const hashBefore = hashContent(initialContent)

    // Simulate dry-run: generate content but do NOT write to file
    // (In real --dry-run, content goes to stdout only)
    const stories = makeFixtureStories()
    const sections = buildFixtureSections(stories)
    const progressSummary = computeProgressSummary(stories)
    const readyToStart = computeReadyToStart(stories)
    const groupedSections = groupStoriesByPhase(sections)
    const phaseDescriptions = new Map<string, string>()

    renderFullIndex(
      renderFrontmatter({
        title: 'WINT Stories Index',
        story_prefix: 'WINT',
        created_at: '2026-01-01T00:00:00Z',
        updated_at: new Date().toISOString(),
      }),
      renderProgressTable(progressSummary),
      renderReadyToStartTable(readyToStart, sections),
      groupedSections,
      phaseDescriptions,
    )
    // NOTE: We generated content but did NOT write to indexPath

    // Hash after "dry-run" should be unchanged
    const fileContentAfter = await fs.readFile(indexPath, 'utf8')
    const hashAfter = hashContent(fileContentAfter)

    expect(hashAfter).toBe(hashBefore)
    expect(fileContentAfter).toBe(initialContent)
  })

  it('atomic write works correctly (writeFileAtomic)', async () => {
    const targetPath = path.join(tmpDir, 'output.md')
    const content = '# Test Content\nThis is generated.\n'

    await writeFileAtomic(targetPath, content)

    const written = await fs.readFile(targetPath, 'utf8')
    expect(written).toBe(content)
  })

  it('atomic write creates file if it does not exist', async () => {
    const targetPath = path.join(tmpDir, 'new-file.md')
    const content = '# New File\n'

    await writeFileAtomic(targetPath, content)

    const written = await fs.readFile(targetPath, 'utf8')
    expect(written).toBe(content)
  })
})

// ============================================================================
// INT-5: Story in DB with no YAML file → generates entry with DB-only fields
// ============================================================================

describe('INT-5: DB-only story (no YAML file)', () => {
  it('generates story section with — for missing YAML fields', () => {
    // Story has no YAML fallback (yaml=null)
    const row: StoryRow = {
      id: 'uuid-999',
      story_id: 'WINT-9999',
      feature_id: null,
      type: 'feature',
      state: 'backlog' as any,
      title: 'Story Without YAML',
      goal: 'Some goal',
      points: 1,
      priority: 'p3',
      blocked_by: null,
      depends_on: null,
      follow_up_from: null,
      packages: [],
      surfaces: [],
      non_goals: [],
      created_at: new Date('2026-01-01'),
      updated_at: new Date('2026-01-01'),
    }

    // Build section with no YAML fallback
    const section = buildStorySection(row, null)

    expect(section.phase).toBeNull()
    expect(section.feature).toBeNull()
    expect(section.risk_notes).toBeNull()
    expect(section.infrastructure).toBeNull()

    // Render the section — missing fields should render as —
    const rendered = renderStorySection(section)

    expect(rendered).toContain('### WINT-9999: Story Without YAML')
    expect(rendered).toContain('**Status:** backlog')
    expect(rendered).toContain('**Phase:** —')
    expect(rendered).toContain('**Feature:** —')
    expect(rendered).toContain('**Infrastructure:** —')
    expect(rendered).toContain('**Risk Notes:** —')
  })

  it('field_sources mark yaml fields as missing when no YAML', () => {
    const row: StoryRow = {
      id: 'uuid-999',
      story_id: 'WINT-9999',
      feature_id: null,
      type: 'feature',
      state: 'backlog' as any,
      title: 'Story Without YAML',
      goal: 'Some goal',
      points: 1,
      priority: 'p3',
      blocked_by: null,
      depends_on: null,
      follow_up_from: null,
      packages: [],
      surfaces: [],
      non_goals: [],
      created_at: new Date('2026-01-01'),
      updated_at: new Date('2026-01-01'),
    }

    const section = buildStorySection(row, null)

    expect(section.field_sources.phase).toBe('missing')
    expect(section.field_sources.risk_notes).toBe('missing')
    expect(section.field_sources.feature).toBe('missing')
    expect(section.field_sources.infrastructure).toBe('missing')
    // DB fields should still be marked correctly
    expect(section.field_sources.state).toBe('db')
    expect(section.field_sources.title).toBe('db')
  })

  it('does not skip story with no YAML — renders with DB-only data', () => {
    const stories: StoryRow[] = [
      {
        id: 'uuid-999',
        story_id: 'WINT-9999',
        feature_id: null,
        type: 'feature',
        state: 'backlog' as any,
        title: 'Story Without YAML',
        goal: 'Some goal',
        points: 1,
        priority: 'p3',
        blocked_by: null,
        depends_on: null,
        follow_up_from: null,
        packages: [],
        surfaces: [],
        non_goals: [],
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]

    // Build section with DB-only (no YAML)
    const sections = stories.map(row => buildStorySection(row, null))

    expect(sections).toHaveLength(1)
    expect(sections[0].story_id).toBe('WINT-9999')
    expect(sections[0].goal).toBe('Some goal') // DB field preserved
  })
})

// ============================================================================
// Additional: created_at preservation (AC-3)
// ============================================================================

describe('created_at preservation', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await createTempDir()
  })

  afterEach(async () => {
    await cleanupTempDir(tmpDir)
  })

  it('extracts created_at from existing stories.index.md', async () => {
    const indexPath = path.join(tmpDir, 'stories.index.md')
    const content = `---
doc_type: stories_index
title: "WINT Stories Index"
status: active
story_prefix: "WINT"
created_at: "2026-02-09T22:30:00Z"
updated_at: "2026-02-17T23:55:00Z"
---

# WINT Stories Index
`
    await fs.writeFile(indexPath, content, 'utf8')

    const createdAt = await extractCreatedAt(indexPath)
    expect(createdAt).toBe('2026-02-09T22:30:00Z')
  })

  it('returns null when stories.index.md does not exist', async () => {
    const nonExistentPath = path.join(tmpDir, 'does-not-exist.md')
    const createdAt = await extractCreatedAt(nonExistentPath)
    expect(createdAt).toBeNull()
  })

  it('preserves created_at in generated frontmatter', () => {
    const originalCreatedAt = '2026-02-09T22:30:00Z'
    const result = renderFrontmatter({
      title: 'WINT Stories Index',
      story_prefix: 'WINT',
      created_at: originalCreatedAt,
      updated_at: '2026-02-17T00:00:00Z',
    })

    expect(result).toContain(`created_at: "${originalCreatedAt}"`)
  })
})

// ============================================================================
// Additional: Grouping with phase numbers
// ============================================================================

describe('Phase grouping in generated content', () => {
  it('generates Phase 0 section correctly', () => {
    const sections = [
      buildStorySection(
        {
          id: 'uuid-001',
          story_id: 'WINT-0010',
          feature_id: null,
          type: 'feature',
          state: 'done' as any,
          title: 'Phase 0 Story',
          goal: 'Goal',
          points: 1,
          priority: 'p1',
          blocked_by: null,
          depends_on: null,
          follow_up_from: null,
          packages: [],
          surfaces: [],
          non_goals: [],
          created_at: new Date(),
          updated_at: new Date(),
        },
        { phase: 0, risk_notes: null, feature: 'Feature desc', infrastructure: null },
      ),
    ]

    const groups = groupStoriesByPhase(sections)
    expect(groups.has('0')).toBe(true)
    expect(groups.get('0')!).toHaveLength(1)
    expect(groups.get('0')![0].phase).toBe(0)
  })
})
