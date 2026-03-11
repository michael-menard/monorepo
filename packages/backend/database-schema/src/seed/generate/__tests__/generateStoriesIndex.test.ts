import { describe, it, expect, vi } from 'vitest'
import { writeFile, unlink } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { generateStoriesIndex } from '../generateStoriesIndex.js'
import { parseStoriesIndex } from '../../../seed/parsers/index-parser.js'

// Mock @repo/logger
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// ============================================================================
// Helpers
// ============================================================================

// Using valid UUIDs (version 4 format: third segment starts with 4, fourth with a/b/8/9)
const UUID_1 = 'a1a1a1a1-0000-4000-a000-000000000001'
const UUID_2 = 'a2a2a2a2-0000-4000-a000-000000000002'
const UUID_3 = 'a3a3a3a3-0000-4000-a000-000000000003'
const INDEX_UUID = 'ffffffff-0000-4000-a000-000000000001'

function makeStory(overrides: Record<string, unknown> = {}) {
  return {
    id: UUID_1,
    storyId: 'KBAR-0010',
    epic: 'KBAR',
    title: 'Database Schema Migrations',
    description: 'Create migrations for stories table',
    storyType: 'feature',
    priority: 'P1',
    complexity: 'high',
    storyPoints: 5,
    currentPhase: 'setup',
    status: 'completed',
    metadata: { wave: 1, surfaces: { database: true, backend: true } },
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-02-01T00:00:00Z'),
    ...overrides,
  }
}

function makeStory2(overrides: Record<string, unknown> = {}) {
  return {
    id: UUID_2,
    storyId: 'KBAR-0020',
    epic: 'KBAR',
    title: 'Schema Tests',
    description: 'Write tests for database schema',
    storyType: 'feature',
    priority: 'P2',
    complexity: 'medium',
    storyPoints: 3,
    currentPhase: 'setup',
    status: 'pending',
    metadata: { wave: 1 },
    createdAt: new Date('2026-01-02T00:00:00Z'),
    updatedAt: new Date('2026-02-02T00:00:00Z'),
    ...overrides,
  }
}

/** Build a minimal mock db that satisfies the patterns used in generateStoriesIndex */
function makeDb(storiesData: unknown[], deps: unknown[] = []) {
  return {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(storiesData),
      }),
    }),
    execute: vi.fn().mockResolvedValue({ rows: deps }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{ id: INDEX_UUID }]),
        }),
      }),
    }),
  } as unknown as NodePgDatabase
}

const TEST_FILE_PATH = 'plans/future/platform/kb-artifact-migration/stories.index.md'

// ============================================================================
// TC-01: Returns markdown string
// ============================================================================
describe('TC-01: generateStoriesIndex returns markdown string', () => {
  it('returns a string for markdown field', async () => {
    const db = makeDb([makeStory()])
    const result = await generateStoriesIndex('KBAR', db, { filePath: TEST_FILE_PATH })
    expect(typeof result.markdown).toBe('string')
    expect(result.markdown.length).toBeGreaterThan(0)
  })
})

// ============================================================================
// TC-02: Frontmatter block present
// ============================================================================
describe('TC-02: Frontmatter block present in output', () => {
  it('includes YAML frontmatter delimiters and required fields', async () => {
    const db = makeDb([makeStory()])
    const { markdown } = await generateStoriesIndex('KBAR', db, { filePath: TEST_FILE_PATH })
    expect(markdown).toMatch(/^---\n/)
    expect(markdown).toContain('doc_type: stories_index')
    expect(markdown).toContain('story_prefix: "KBAR"')
    expect(markdown).toContain('status: active')
  })
})

// ============================================================================
// TC-03: Progress Summary table
// ============================================================================
describe('TC-03: Progress Summary table reflects actual counts', () => {
  it('counts completed and pending stories correctly', async () => {
    const db = makeDb([makeStory({ status: 'completed' }), makeStory2({ status: 'pending' })])
    const { markdown } = await generateStoriesIndex('KBAR', db, { filePath: TEST_FILE_PATH })
    expect(markdown).toContain('## Progress Summary')
    expect(markdown).toMatch(/\| completed \| 1 \|/)
    expect(markdown).toMatch(/\| pending \| 1 \|/)
  })
})

// ============================================================================
// TC-04: Ready to Start section — workable story with no deps appears
// ============================================================================
describe('TC-04: Ready to Start section — workable story with no deps appears', () => {
  it('includes workable story with no dependencies in Ready to Start table', async () => {
    const db = makeDb([makeStory({ status: 'ready-to-work', storyId: 'KBAR-0010' })])
    const { markdown } = await generateStoriesIndex('KBAR', db, { filePath: TEST_FILE_PATH })
    expect(markdown).toContain('## Ready to Start')
    expect(markdown).toContain('KBAR-0010')
  })

  it('excludes completed story from Ready to Start section', async () => {
    const db = makeDb([makeStory({ status: 'completed' })])
    const { markdown } = await generateStoriesIndex('KBAR', db, { filePath: TEST_FILE_PATH })
    const readyMatch = markdown.match(/## Ready to Start[\s\S]*?(?=\n## |$)/)
    const readySection = readyMatch?.[0] ?? ''
    expect(readySection).not.toContain('KBAR-0010')
  })

  it('excludes in-progress story from Ready to Start section', async () => {
    const db = makeDb([makeStory({ status: 'in-progress' })])
    const { markdown } = await generateStoriesIndex('KBAR', db, { filePath: TEST_FILE_PATH })
    const readyMatch = markdown.match(/## Ready to Start[\s\S]*?(?=\n## |$)/)
    const readySection = readyMatch?.[0] ?? ''
    expect(readySection).not.toContain('KBAR-0010')
  })
})

// ============================================================================
// TC-04b: AC-4 — dependency resolution checks target story status
// ============================================================================
describe('TC-04b: AC-4 — Ready to Start checks target story status', () => {
  it('includes story whose dependency target is completed', async () => {
    const db = makeDb(
      [makeStory2({ status: 'ready-to-work' })],
      [
        {
          storyId: UUID_2,
          dependsOnStoryId: UUID_1,
          dependencyType: 'requires',
          resolved: false,
          dependsOnStoryLabel: 'KBAR-0010',
          dependsOnStoryStatus: 'completed',
        },
      ],
    )
    const { markdown } = await generateStoriesIndex('KBAR', db, { filePath: TEST_FILE_PATH })
    // Extract the Ready to Start section (between "## Ready to Start" and the next "##" header)
    const readyMatch = markdown.match(/## Ready to Start[\s\S]*?(?=\n## |$)/)
    const readySection = readyMatch?.[0] ?? ''
    expect(readySection).toContain('KBAR-0020')
  })

  it('excludes story whose dependency target is in-progress', async () => {
    const db = makeDb(
      [makeStory2({ status: 'ready-to-work' })],
      [
        {
          storyId: UUID_2,
          dependsOnStoryId: UUID_1,
          dependencyType: 'requires',
          resolved: false,
          dependsOnStoryLabel: 'KBAR-0010',
          dependsOnStoryStatus: 'in-progress',
        },
      ],
    )
    const { markdown } = await generateStoriesIndex('KBAR', db, { filePath: TEST_FILE_PATH })
    const readyMatch = markdown.match(/## Ready to Start[\s\S]*?(?=\n## |$)/)
    const readySection = readyMatch?.[0] ?? ''
    expect(readySection).not.toContain('KBAR-0020')
  })
})

// ============================================================================
// TC-05: Per-story section rendered
// ============================================================================
describe('TC-05: Per-story sections are rendered', () => {
  it('includes story header and status line for each story', async () => {
    const db = makeDb([makeStory()])
    const { markdown } = await generateStoriesIndex('KBAR', db, { filePath: TEST_FILE_PATH })
    expect(markdown).toContain('## KBAR-0010: Database Schema Migrations')
    expect(markdown).toContain('**Status:** completed')
  })
})

// ============================================================================
// TC-06: Dependency resolution — depends on label
// ============================================================================
describe('TC-06: Dependency labels resolved from JOIN', () => {
  it('shows dependency story ID in Depends On field', async () => {
    const db = makeDb(
      [makeStory2()],
      [
        {
          storyId: UUID_2,
          dependsOnStoryId: UUID_1,
          dependencyType: 'requires',
          resolved: false,
          dependsOnStoryLabel: 'KBAR-0010',
          dependsOnStoryStatus: 'in-progress',
        },
      ],
    )
    const { markdown } = await generateStoriesIndex('KBAR', db, { filePath: TEST_FILE_PATH })
    expect(markdown).toContain('**Depends On:** KBAR-0010')
  })
})

// ============================================================================
// TC-07: Stories sorted by numeric ID
// ============================================================================
describe('TC-07: Stories are sorted by numeric ID (AC-13)', () => {
  it('renders lower numeric ID story before higher numeric ID story', async () => {
    // Provide in reverse order — generator must sort
    const db = makeDb([makeStory2(), makeStory()])
    const { markdown } = await generateStoriesIndex('KBAR', db, { filePath: TEST_FILE_PATH })
    const pos010 = markdown.indexOf('## KBAR-0010:')
    const pos020 = markdown.indexOf('## KBAR-0020:')
    expect(pos010).toBeGreaterThan(-1)
    expect(pos020).toBeGreaterThan(-1)
    expect(pos010).toBeLessThan(pos020)
  })
})

// ============================================================================
// TC-08: DB writes — index_metadata upserted
// ============================================================================
describe('TC-08: DB writes upsert index_metadata', () => {
  it('calls db.insert for index_metadata on upsert', async () => {
    const db = makeDb([makeStory()])
    await generateStoriesIndex('KBAR', db, { filePath: TEST_FILE_PATH })
    expect(db.insert).toHaveBeenCalled()
  })
})

// ============================================================================
// TC-09: DB writes — index_entries upserted for each story
// ============================================================================
describe('TC-09: DB writes upsert index_entries per story', () => {
  it('calls db.insert three times for 2 stories (1 index_metadata + 2 index_entries)', async () => {
    const db = makeDb([makeStory(), makeStory2()])
    await generateStoriesIndex('KBAR', db, { filePath: TEST_FILE_PATH })
    // index_metadata (1) + index_entries (2) = 3 total insert calls
    expect(db.insert).toHaveBeenCalledTimes(3)
  })
})

// ============================================================================
// TC-10: Zod schema validation — invalid epic rejected
// ============================================================================
describe('TC-10: Zod validation rejects empty epic', () => {
  it('throws when epic is empty string', async () => {
    const db = makeDb([])
    await expect(
      generateStoriesIndex('', db, { filePath: TEST_FILE_PATH }),
    ).rejects.toThrow()
  })
})

// ============================================================================
// TC-11: Empty epic — no stories
// ============================================================================
describe('TC-11: Empty epic produces valid minimal markdown', () => {
  it('returns empty storyCount and valid markdown when epic has no stories', async () => {
    const db = makeDb([])
    const result = await generateStoriesIndex('KBAR', db, { filePath: TEST_FILE_PATH })
    expect(result.storyCount).toBe(0)
    expect(result.markdown).toContain('## Progress Summary')
    expect(result.markdown).toContain('## Ready to Start')
  })
})

// ============================================================================
// TC-12: Checksum is deterministic SHA-256 hex
// ============================================================================
describe('TC-12: Checksum is deterministic SHA-256 hex string', () => {
  it('produces identical checksum for identical inputs', async () => {
    const story = makeStory()
    const db1 = makeDb([story])
    const db2 = makeDb([story])

    const r1 = await generateStoriesIndex('KBAR', db1, { filePath: TEST_FILE_PATH })
    const r2 = await generateStoriesIndex('KBAR', db2, { filePath: TEST_FILE_PATH })

    expect(r1.checksum).toBe(r2.checksum)
    // SHA-256 hex is always 64 characters
    expect(r1.checksum).toHaveLength(64)
    expect(r1.checksum).toMatch(/^[0-9a-f]{64}$/)
  })
})

// ============================================================================
// TC-13: AC-14 — Round-trip test: parseStoriesIndex does not throw
// ============================================================================
describe('TC-13: AC-14 — Round-trip: parseStoriesIndex does not throw on generated output', () => {
  it('parseStoriesIndex does not throw when given generated markdown', async () => {
    const db = makeDb([
      makeStory({ status: 'completed' }),
      makeStory2({ status: 'pending' }),
      {
        ...makeStory({
          id: UUID_3,
          storyId: 'KBAR-0030',
          title: 'API Endpoints',
          status: 'in-progress',
        }),
      },
    ])
    const { markdown } = await generateStoriesIndex('KBAR', db, { filePath: TEST_FILE_PATH })

    // Write generated markdown to a temp file for parseStoriesIndex (which reads from disk)
    const tmpFile = join(tmpdir(), `kbar-0230-roundtrip-${Date.now()}.md`)
    await writeFile(tmpFile, markdown, 'utf-8')

    try {
      // AC-14: parser should not throw — it returns phase data (empty array expected
      // since generated output has story sections, not phase sections)
      const phases = await parseStoriesIndex(tmpFile)
      expect(Array.isArray(phases)).toBe(true)
      // Generated output doesn't contain "## Phase N:" headers, so 0 phases expected
      expect(phases).toHaveLength(0)
    } finally {
      await unlink(tmpFile).catch(() => {})
    }
  })
})
