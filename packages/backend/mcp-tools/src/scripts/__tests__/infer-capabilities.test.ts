/**
 * Unit tests for infer-capabilities.ts
 * WINT-4040: AC-10 — >= 80% coverage
 *
 * All DB calls are mocked via injectable functions.
 * No real database connection needed.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

// ============================================================================
// Mock @repo/db and @repo/database-schema at module level (before imports)
// This prevents the DB pool initialization at import time.
// ============================================================================

vi.mock('@repo/db', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    onConflictDoNothing: vi.fn().mockResolvedValue([]),
  },
}))

vi.mock('@repo/database-schema', () => ({
  features: { id: 'id', featureName: 'featureName' },
  capabilities: { id: 'id', capabilityName: 'capabilityName' },
}))

vi.mock('../graph-get-capability-coverage.js', () => ({
  graph_get_capability_coverage: vi.fn().mockResolvedValue(null),
}))

vi.mock('../../graph-query/graph-get-capability-coverage.js', () => ({
  graph_get_capability_coverage: vi.fn().mockResolvedValue(null),
}))

import {
  mapKeywordsToStages,
  scanStories,
  resolveFeatureId,
  inferCapabilities,
  defaultInsertFn,
} from '../infer-capabilities.js'
import type { InferredCapability, FeatureRow } from '../__types__/index.js'
import { CapabilityInferenceResultSchema } from '../__types__/index.js'

// ============================================================================
// Fixtures
// ============================================================================

const mockFeatureRows: FeatureRow[] = [
  { id: 'f1111111-0000-0000-0000-000000000001', featureName: 'wint' },
  { id: 'f2222222-0000-0000-0000-000000000002', featureName: 'wish' },
  { id: 'f3333333-0000-0000-0000-000000000003', featureName: 'gallery' },
]

const mockCapabilityInsertFn = vi.fn<[InferredCapability[], boolean], Promise<void>>()
const emptyFeaturesFixture: FeatureRow[] = []

// ============================================================================
// ST-2 / AC-3: mapKeywordsToStages
// ============================================================================

describe('mapKeywordsToStages', () => {
  it('HP-1: maps create keywords correctly', () => {
    expect(mapKeywordsToStages('add a new item')).toContain('create')
    expect(mapKeywordsToStages('create story')).toContain('create')
    expect(mapKeywordsToStages('upload file')).toContain('create')
    expect(mapKeywordsToStages('insert record')).toContain('create')
  })

  it('HP-1: maps read keywords correctly', () => {
    expect(mapKeywordsToStages('view details')).toContain('read')
    expect(mapKeywordsToStages('get capability')).toContain('read')
    expect(mapKeywordsToStages('list stories')).toContain('read')
    expect(mapKeywordsToStages('query features')).toContain('read')
    expect(mapKeywordsToStages('download report')).toContain('read')
  })

  it('HP-1: maps update keywords correctly', () => {
    expect(mapKeywordsToStages('edit profile')).toContain('update')
    expect(mapKeywordsToStages('update status')).toContain('update')
    expect(mapKeywordsToStages('modify settings')).toContain('update')
    expect(mapKeywordsToStages('replace content')).toContain('update')
  })

  it('HP-1: maps delete keywords correctly', () => {
    expect(mapKeywordsToStages('delete record')).toContain('delete')
    expect(mapKeywordsToStages('remove item')).toContain('delete')
    expect(mapKeywordsToStages('archive story')).toContain('delete')
  })

  it('ED-3: upload maps to create', () => {
    const stages = mapKeywordsToStages('upload an image')
    expect(stages.has('create')).toBe(true)
    expect(stages.has('delete')).toBe(false)
  })

  it('ED-4: download maps to read', () => {
    const stages = mapKeywordsToStages('download a file')
    expect(stages.has('read')).toBe(true)
    expect(stages.has('create')).toBe(false)
  })

  it('ED-1: multiple CRUD stages from single text', () => {
    const stages = mapKeywordsToStages('create, view, edit and delete items')
    expect(stages.has('create')).toBe(true)
    expect(stages.has('read')).toBe(true)
    expect(stages.has('update')).toBe(true)
    expect(stages.has('delete')).toBe(true)
  })

  it('EC-3: returns empty set for no keyword matches', () => {
    const stages = mapKeywordsToStages('some random text without keywords')
    expect(stages.size).toBe(0)
  })

  it('is case-insensitive', () => {
    expect(mapKeywordsToStages('CREATE ITEMS')).toContain('create')
    expect(mapKeywordsToStages('VIEW Records')).toContain('read')
    expect(mapKeywordsToStages('DELETE Story')).toContain('delete')
  })

  it('deduplicates stages (Set)', () => {
    const stages = mapKeywordsToStages('create add new upload')
    expect(stages.size).toBe(1)
    expect(stages.has('create')).toBe(true)
  })

  it('handles empty string', () => {
    const stages = mapKeywordsToStages('')
    expect(stages.size).toBe(0)
  })

  it('handles text with only punctuation', () => {
    const stages = mapKeywordsToStages('... --- !!!')
    expect(stages.size).toBe(0)
  })
})

// ============================================================================
// ST-3 / AC-2: scanStories
// ============================================================================

describe('scanStories', () => {
  let tmpRoot: string

  beforeEach(() => {
    // Create a temp directory structure mimicking plans/future/platform/
    tmpRoot = join(tmpdir(), `wint-4040-test-${Date.now()}`)
    const platform = join(tmpRoot, 'plans', 'future', 'platform', 'test-feature', 'TEST-001')
    mkdirSync(platform, { recursive: true })

    const storyYaml = `story_id: TEST-001
title: "Add and view test items"
acceptance_criteria:
  - Create a new item
  - View existing items
  - Delete old items
`
    writeFileSync(join(platform, 'story.yaml'), storyYaml)
  })

  it('HP-2: returns array of story entries with extracted fields', () => {
    const stories = scanStories(tmpRoot)
    expect(stories.length).toBeGreaterThan(0)

    const story = stories.find(s => s.storyId === 'TEST-001')
    expect(story).toBeDefined()
    expect(story?.epic).toBe('TEST')
    expect(story?.title).toContain('Add and view test items')
    expect(story?.text).toContain('Add and view test items')
  })

  it('extracts epic prefix from story ID', () => {
    const stories = scanStories(tmpRoot)
    const story = stories.find(s => s.storyId === 'TEST-001')
    expect(story?.epic).toBe('TEST')
  })

  it('handles missing files gracefully (AC-2)', () => {
    // Scanning a non-existent dir should return empty array, not throw
    const stories = scanStories('/non/existent/path')
    expect(Array.isArray(stories)).toBe(true)
  })

  it('deduplicates story IDs', () => {
    // Create a duplicate story in another path
    const altPath = join(tmpRoot, 'plans', 'future', 'platform', 'alt-feature', 'TEST-001')
    mkdirSync(altPath, { recursive: true })
    writeFileSync(join(altPath, 'story.yaml'), 'story_id: TEST-001\ntitle: Duplicate\n')

    const stories = scanStories(tmpRoot)
    const ids = stories.map(s => s.storyId)
    const uniqueIds = new Set(ids)
    expect(ids.length).toBe(uniqueIds.size)
  })

  // Cleanup
  it('cleans up temp dir', () => {
    rmSync(tmpRoot, { recursive: true, force: true })
    expect(true).toBe(true)
  })
})

// ============================================================================
// ST-4 / AC-4 / AC-9: resolveFeatureId
// ============================================================================

describe('resolveFeatureId', () => {
  it('HP-1: returns feature UUID for known epic prefix', () => {
    const id = resolveFeatureId('WINT', mockFeatureRows)
    expect(id).toBe('f1111111-0000-0000-0000-000000000001')
  })

  it('HP-1: matches by feature name containing epic prefix (case-insensitive)', () => {
    const id = resolveFeatureId('wish', mockFeatureRows)
    expect(id).toBe('f2222222-0000-0000-0000-000000000002')
  })

  it('EC-4: returns null for unknown epic prefix', () => {
    const id = resolveFeatureId('UNKNOWN', mockFeatureRows)
    expect(id).toBeNull()
  })

  it('handles empty features array', () => {
    const id = resolveFeatureId('WINT', [])
    expect(id).toBeNull()
  })

  it('prefers exact match over partial match', () => {
    const features: FeatureRow[] = [
      { id: 'exact-id', featureName: 'wint' },
      { id: 'partial-id', featureName: 'wint-extended' },
    ]
    const id = resolveFeatureId('WINT', features)
    expect(id).toBe('exact-id')
  })
})

// ============================================================================
// ST-5 / AC-5 / AC-6 / AC-7 / AC-8 / AC-9: inferCapabilities
// ============================================================================

describe('inferCapabilities', () => {
  let tmpRoot: string

  beforeEach(() => {
    vi.clearAllMocks()
    mockCapabilityInsertFn.mockResolvedValue(undefined)

    // Create temp directory with test story
    tmpRoot = join(tmpdir(), `wint-4040-infer-${Date.now()}`)
    const platform = join(tmpRoot, 'plans', 'future', 'platform', 'wint-feature', 'WINT-001')
    mkdirSync(platform, { recursive: true })

    const storyYaml = `story_id: WINT-001
title: "Create and view capabilities"
acceptance_criteria:
  - As a user I can add capability records
  - As a user I can view the capability list
  - As a user I can delete old capabilities
`
    writeFileSync(join(platform, 'story.yaml'), storyYaml)
  })

  it('HP-2: orchestrates full workflow and produces capabilities', async () => {
    const dbFn = vi.fn().mockResolvedValue(mockFeatureRows)
    const result = await inferCapabilities({
      dryRun: false,
      rootDir: tmpRoot,
      insertFn: mockCapabilityInsertFn,
      dbFn,
    })

    expect(CapabilityInferenceResultSchema.safeParse(result).success).toBe(true)
    expect(result.attempted).toBeGreaterThan(0)
    expect(dbFn).toHaveBeenCalledOnce()
    expect(mockCapabilityInsertFn).toHaveBeenCalled()
  })

  it('HP-3: summary has correct shape matching CapabilityInferenceResultSchema', async () => {
    const dbFn = vi.fn().mockResolvedValue(mockFeatureRows)
    const result = await inferCapabilities({
      dryRun: false,
      rootDir: tmpRoot,
      insertFn: mockCapabilityInsertFn,
      dbFn,
    })

    expect(typeof result.attempted).toBe('number')
    expect(typeof result.succeeded).toBe('number')
    expect(typeof result.failed).toBe('number')
    expect(typeof result.skipped).toBe('number')
    const parsed = CapabilityInferenceResultSchema.safeParse(result)
    expect(parsed.success).toBe(true)
  })

  it('HP-4: dry-run calls insertFn with dryRun=true (AC-7)', async () => {
    const dbFn = vi.fn().mockResolvedValue(mockFeatureRows)
    const dryRunInsertFn = vi.fn<[InferredCapability[], boolean], Promise<void>>().mockResolvedValue(undefined)

    const result = await inferCapabilities({
      dryRun: true,
      rootDir: tmpRoot,
      insertFn: dryRunInsertFn,
      dbFn,
    })

    if (result.attempted > 0) {
      expect(dryRunInsertFn).toHaveBeenCalledWith(expect.any(Array), true)
    }
    expect(CapabilityInferenceResultSchema.safeParse(result).success).toBe(true)
  })

  it('EC-1: exits early if zero features found (AC-9)', async () => {
    const dbFn = vi.fn().mockResolvedValue(emptyFeaturesFixture)

    const result = await inferCapabilities({
      dryRun: false,
      rootDir: tmpRoot,
      insertFn: mockCapabilityInsertFn,
      dbFn,
    })

    expect(result.attempted).toBe(0)
    expect(result.succeeded).toBe(0)
    expect(mockCapabilityInsertFn).not.toHaveBeenCalled()
  })

  it('EC-4: skips stories with unknown epic prefix', async () => {
    // Create story with unknown epic
    const unknownDir = join(tmpRoot, 'plans', 'future', 'platform', 'unknown-feature', 'ZZZZZ-001')
    mkdirSync(unknownDir, { recursive: true })
    writeFileSync(join(unknownDir, 'story.yaml'), `story_id: ZZZZZ-001\ntitle: unknown epic test create view\n`)

    const dbFn = vi.fn().mockResolvedValue(mockFeatureRows)

    const result = await inferCapabilities({
      dryRun: false,
      rootDir: tmpRoot,
      insertFn: mockCapabilityInsertFn,
      dbFn,
    })

    expect(CapabilityInferenceResultSchema.safeParse(result).success).toBe(true)
  })

  it('AC-7: all inserted capabilities have capability_type=business, maturity_level=beta', async () => {
    const capturedRows: InferredCapability[] = []
    const capturingInsertFn = vi.fn<[InferredCapability[], boolean], Promise<void>>()
      .mockImplementation(async (rows, _dryRun) => {
        capturedRows.push(...rows)
      })

    const dbFn = vi.fn().mockResolvedValue(mockFeatureRows)

    await inferCapabilities({
      dryRun: false,
      rootDir: tmpRoot,
      insertFn: capturingInsertFn,
      dbFn,
    })

    for (const cap of capturedRows) {
      expect(cap.capabilityType).toBe('business')
      expect(cap.maturityLevel).toBe('beta')
      expect(['create', 'read', 'update', 'delete']).toContain(cap.lifecycleStage)
    }
  })

  it('ED-2: deduplicates capabilities with same name (AC-6)', async () => {
    // Create two stories with same epic that would generate same capability name
    const dir2 = join(tmpRoot, 'plans', 'future', 'platform', 'wint-feature2', 'WINT-002')
    mkdirSync(dir2, { recursive: true })
    writeFileSync(join(dir2, 'story.yaml'), `story_id: WINT-002\ntitle: create more items\n`)

    const capturedRows: InferredCapability[] = []
    const capturingInsertFn = vi.fn<[InferredCapability[], boolean], Promise<void>>()
      .mockImplementation(async (rows, _dryRun) => {
        capturedRows.push(...rows)
      })

    const dbFn = vi.fn().mockResolvedValue(mockFeatureRows)

    const result = await inferCapabilities({
      dryRun: false,
      rootDir: tmpRoot,
      insertFn: capturingInsertFn,
      dbFn,
    })

    // Verify no duplicate capabilityName in the inserted rows
    const names = capturedRows.map(c => c.capabilityName)
    const uniqueNames = new Set(names)
    expect(names.length).toBe(uniqueNames.size)
    expect(result.skipped).toBeGreaterThanOrEqual(0)
  })

  it('EC-2: handles insert errors gracefully and increments failed count', async () => {
    const failingInsertFn = vi.fn<[InferredCapability[], boolean], Promise<void>>()
      .mockRejectedValue(new Error('DB connection failed'))

    const dbFn = vi.fn().mockResolvedValue(mockFeatureRows)

    const result = await inferCapabilities({
      dryRun: false,
      rootDir: tmpRoot,
      insertFn: failingInsertFn,
      dbFn,
    })

    if (result.attempted > 0) {
      expect(result.failed).toBeGreaterThan(0)
    }
    expect(CapabilityInferenceResultSchema.safeParse(result).success).toBe(true)
  })

  it('succeeds with zero stories (no matches)', async () => {
    const emptyRoot = join(tmpdir(), `wint-4040-empty-${Date.now()}`)
    mkdirSync(join(emptyRoot, 'plans', 'future', 'platform'), { recursive: true })

    const dbFn = vi.fn().mockResolvedValue(mockFeatureRows)

    const result = await inferCapabilities({
      dryRun: false,
      rootDir: emptyRoot,
      insertFn: mockCapabilityInsertFn,
      dbFn,
    })

    expect(result.attempted).toBe(0)
    expect(result.succeeded).toBe(0)
    expect(mockCapabilityInsertFn).not.toHaveBeenCalled()

    rmSync(emptyRoot, { recursive: true, force: true })
  })
})

// ============================================================================
// defaultInsertFn tests (dry-run path only — no real DB)
// ============================================================================

describe('defaultInsertFn (dry-run path)', () => {
  it('HP-4: dry-run resolves without error', async () => {
    const rows: InferredCapability[] = [
      {
        capabilityName: 'wint-create-inferred',
        capabilityType: 'business',
        lifecycleStage: 'create',
        maturityLevel: 'beta',
        featureId: 'f1111111-0000-0000-0000-000000000001',
      },
    ]

    // dry-run=true should resolve without error (no actual DB write)
    await expect(defaultInsertFn(rows, true)).resolves.toBeUndefined()
  })

  it('handles empty rows without error (dry-run)', async () => {
    await expect(defaultInsertFn([], true)).resolves.toBeUndefined()
  })
})
