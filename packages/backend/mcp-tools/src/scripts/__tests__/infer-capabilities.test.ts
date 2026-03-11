/**
 * Unit tests for infer-capabilities.ts
 * WINT-4040: Infer Existing Capabilities from Story History
 *
 * All DB calls injectable via insertFn and dbFn parameters — no real DB needed.
 * File I/O tests use tmp directories with real story.yaml fixtures.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import {
  mapKeywordsToStages,
  scanStories,
  resolveFeatureId,
  inferCapabilities,
  defaultInsertFn,
  findStoryFiles,
  extractEpic,
  extractStoryIdFromPath,
  readStoryFile,
} from '../infer-capabilities.js'
import { CapabilityInferenceResultSchema } from '../__types__/index.js'
import type { FeatureRow, InsertFn, InferredCapability } from '../__types__/index.js'

// ============================================================================
// Fixtures
// ============================================================================

const mockFeatureRows: FeatureRow[] = [
  { id: 'f1a2b3c4-0000-0000-0000-000000000001', featureName: 'wint' },
  { id: 'f1a2b3c4-0000-0000-0000-000000000002', featureName: 'wish' },
  { id: 'f1a2b3c4-0000-0000-0000-000000000003', featureName: 'apip' },
]

const emptyFeaturesFixture: FeatureRow[] = []

const mockInsertFn: InsertFn = vi.fn().mockResolvedValue(undefined)

const STORY_YAML_CONTENT = `id: WINT-001
title: "Add MOC to wishlist"
status: in-progress
feature: wint
story_type: feature
ac_text: |
  User can create and view saved items
  User can delete items from list
`

const WINT_STORY_MD_CONTENT = `---
id: WINT-999
title: "Upload and download images"
status: in-progress
---

# WINT-999: Upload and download images

User can upload images and download PDFs.
`

// ============================================================================
// mapKeywordsToStages
// ============================================================================

describe('mapKeywordsToStages', () => {
  it('HP-1: maps create keyword correctly', () => {
    const result = mapKeywordsToStages('create a new epic')
    expect(result.has('create')).toBe(true)
    expect(result.size).toBe(1)
  })

  it('HP-1: maps read keyword correctly', () => {
    const result = mapKeywordsToStages('view all features')
    expect(result.has('read')).toBe(true)
  })

  it('HP-1: maps update keyword correctly', () => {
    const result = mapKeywordsToStages('edit and update the story')
    expect(result.has('update')).toBe(true)
  })

  it('HP-1: maps delete keyword correctly', () => {
    const result = mapKeywordsToStages('remove all items')
    expect(result.has('delete')).toBe(true)
  })

  it('ED-3: upload maps to create', () => {
    const result = mapKeywordsToStages('upload image to collection')
    expect(result.has('create')).toBe(true)
    expect(result.has('read')).toBe(false)
  })

  it('ED-4: download maps to read', () => {
    const result = mapKeywordsToStages('download instruction PDF')
    expect(result.has('read')).toBe(true)
    expect(result.has('create')).toBe(false)
  })

  it('ED-1: multiple CRUD keywords return multiple stages', () => {
    const result = mapKeywordsToStages('create widget, view widget, delete widget')
    expect(result.has('create')).toBe(true)
    expect(result.has('read')).toBe(true)
    expect(result.has('delete')).toBe(true)
    expect(result.size).toBe(3)
  })

  it('EC-3: no keywords returns empty Set', () => {
    const result = mapKeywordsToStages('the quick brown fox jumps over the lazy dog')
    expect(result.size).toBe(0)
  })

  it('is case-insensitive', () => {
    const result = mapKeywordsToStages('CREATE A NEW ITEM')
    expect(result.has('create')).toBe(true)
  })

  it('deduplicates stages from multiple matching keywords', () => {
    const result = mapKeywordsToStages('add and create and insert')
    expect(result.has('create')).toBe(true)
    expect(result.size).toBe(1)
  })

  it('handles empty string', () => {
    const result = mapKeywordsToStages('')
    expect(result.size).toBe(0)
  })

  it('maps add to create', () => {
    const result = mapKeywordsToStages('add item to list')
    expect(result.has('create')).toBe(true)
  })

  it('maps list to read', () => {
    const result = mapKeywordsToStages('list all items')
    expect(result.has('read')).toBe(true)
  })

  it('maps archive to delete', () => {
    const result = mapKeywordsToStages('archive old records')
    expect(result.has('delete')).toBe(true)
  })
})

// ============================================================================
// scanStories
// ============================================================================

describe('scanStories', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = join(tmpdir(), `wint-4040-test-${Date.now()}`)
    mkdirSync(tmpDir, { recursive: true })
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('HP-2: returns array of story entries with extracted fields', () => {
    // Create a fake story.yaml
    const storyDir = join(tmpDir, 'wint', 'in-progress', 'WINT-001')
    mkdirSync(storyDir, { recursive: true })
    writeFileSync(join(storyDir, 'story.yaml'), STORY_YAML_CONTENT)

    const entries = scanStories(tmpDir)
    expect(entries.length).toBeGreaterThanOrEqual(1)
    const wintEntry = entries.find(e => e.storyId === 'WINT-001')
    expect(wintEntry).toBeDefined()
    expect(wintEntry?.epic).toBe('WINT')
  })

  it('extracts epic prefix from story ID', () => {
    const storyDir = join(tmpDir, 'wish', 'backlog', 'WISH-001')
    mkdirSync(storyDir, { recursive: true })
    writeFileSync(
      join(storyDir, 'story.yaml'),
      'id: WISH-001\ntitle: "Wishlist feature"\nfeature: wish\n',
    )

    const entries = scanStories(tmpDir)
    const wishEntry = entries.find(e => e.storyId === 'WISH-001')
    expect(wishEntry?.epic).toBe('WISH')
  })

  it('handles missing files gracefully (AC-2)', () => {
    const entries = scanStories('/non-existent-path-xyz')
    expect(entries).toEqual([])
  })

  it('handles empty directory', () => {
    const entries = scanStories(tmpDir)
    expect(entries).toEqual([])
  })

  it('reads text from .md files', () => {
    const storyDir = join(tmpDir, 'wint', 'done')
    mkdirSync(storyDir, { recursive: true })
    writeFileSync(join(storyDir, 'WINT-999.md'), WINT_STORY_MD_CONTENT)

    const entries = scanStories(tmpDir)
    const entry = entries.find(e => e.storyId === 'WINT-999')
    expect(entry).toBeDefined()
    expect(entry?.epic).toBe('WINT')
    expect(entry?.text).toContain('upload')
  })
})

// ============================================================================
// resolveFeatureId
// ============================================================================

describe('resolveFeatureId', () => {
  it('HP-1: returns correct UUID for known prefix', () => {
    const featureId = resolveFeatureId('WINT', mockFeatureRows)
    expect(featureId).toBe('f1a2b3c4-0000-0000-0000-000000000001')
  })

  it('HP-1: case-insensitive match', () => {
    const featureId = resolveFeatureId('wish', mockFeatureRows)
    expect(featureId).toBe('f1a2b3c4-0000-0000-0000-000000000002')
  })

  it('EC-4: unknown prefix returns null', () => {
    const featureId = resolveFeatureId('XYZ', mockFeatureRows)
    expect(featureId).toBeNull()
  })

  it('empty features returns null', () => {
    const featureId = resolveFeatureId('WINT', emptyFeaturesFixture)
    expect(featureId).toBeNull()
  })

  it('exact match preferred over partial match', () => {
    const rows: FeatureRow[] = [
      { id: 'aaa-0000-0000-0000-000000000001', featureName: 'wint-extra' },
      { id: 'bbb-0000-0000-0000-000000000002', featureName: 'wint' },
    ]
    const featureId = resolveFeatureId('WINT', rows)
    // Should match exact 'wint', not 'wint-extra'
    expect(featureId).toBe('bbb-0000-0000-0000-000000000002')
  })
})

// ============================================================================
// inferCapabilities
// ============================================================================

describe('inferCapabilities', () => {
  let tmpDir: string
  let capturedRows: InferredCapability[]
  let mockInsert: InsertFn

  beforeEach(() => {
    tmpDir = join(tmpdir(), `wint-4040-infer-${Date.now()}`)
    mkdirSync(tmpDir, { recursive: true })
    capturedRows = []
    mockInsert = vi.fn().mockImplementation(async (rows: InferredCapability[]) => {
      capturedRows.push(...rows)
    })
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('EC-1: exits early if zero features found (AC-9)', async () => {
    const dbFn = vi.fn().mockResolvedValue([])
    const result = await inferCapabilities({}, mockInsert, dbFn)

    expect(result.attempted).toBe(0)
    expect(result.succeeded).toBe(0)
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('HP-3: summary has correct shape matching CapabilityInferenceResultSchema', async () => {
    // Create a story with known keywords
    const storyDir = join(tmpDir, 'wint', 'done', 'WINT-001')
    mkdirSync(storyDir, { recursive: true })
    writeFileSync(join(storyDir, 'story.yaml'), STORY_YAML_CONTENT)

    const dbFn = vi.fn().mockResolvedValue(mockFeatureRows)
    const result = await inferCapabilities({ rootDir: tmpDir }, mockInsert, dbFn)

    const parsed = CapabilityInferenceResultSchema.safeParse(result)
    expect(parsed.success).toBe(true)
    expect(typeof result.attempted).toBe('number')
    expect(typeof result.succeeded).toBe('number')
    expect(typeof result.failed).toBe('number')
    expect(typeof result.skipped).toBe('number')
  })

  it('HP-4: dry-run calls insertFn with dryRun=true', async () => {
    const storyDir = join(tmpDir, 'wint', 'done', 'WINT-001')
    mkdirSync(storyDir, { recursive: true })
    writeFileSync(join(storyDir, 'story.yaml'), STORY_YAML_CONTENT)

    const dryRunInsert: InsertFn = vi.fn().mockResolvedValue(undefined)
    const dbFn = vi.fn().mockResolvedValue(mockFeatureRows)

    await inferCapabilities({ dryRun: true, rootDir: tmpDir }, dryRunInsert, dbFn)

    // Verify insertFn was called with dryRun=true
    expect(dryRunInsert).toHaveBeenCalledWith(expect.any(Array), true)
  })

  it('HP-4: dry-run resolves without error', async () => {
    const storyDir = join(tmpDir, 'wint', 'done', 'WINT-001')
    mkdirSync(storyDir, { recursive: true })
    writeFileSync(join(storyDir, 'story.yaml'), STORY_YAML_CONTENT)

    const dbFn = vi.fn().mockResolvedValue(mockFeatureRows)
    await expect(
      inferCapabilities({ dryRun: true, rootDir: tmpDir }, mockInsert, dbFn),
    ).resolves.not.toThrow()
  })

  it('AC-7: all inserted capabilities have capability_type=business, maturity_level=beta', async () => {
    const storyDir = join(tmpDir, 'wint', 'done', 'WINT-001')
    mkdirSync(storyDir, { recursive: true })
    writeFileSync(join(storyDir, 'story.yaml'), STORY_YAML_CONTENT)

    const dbFn = vi.fn().mockResolvedValue(mockFeatureRows)
    await inferCapabilities({ rootDir: tmpDir }, mockInsert, dbFn)

    for (const row of capturedRows) {
      expect(row.capabilityType).toBe('business')
      expect(row.maturityLevel).toBe('beta')
      expect(['create', 'read', 'update', 'delete']).toContain(row.lifecycleStage)
    }
  })

  it('ED-2: deduplicates capabilities with same name', async () => {
    // Two stories from same epic, both with "create" keyword → only one 'wint-create-inferred'
    const storyDir1 = join(tmpDir, 'wint', 'done', 'WINT-001')
    const storyDir2 = join(tmpDir, 'wint', 'done', 'WINT-002')
    mkdirSync(storyDir1, { recursive: true })
    mkdirSync(storyDir2, { recursive: true })
    writeFileSync(join(storyDir1, 'story.yaml'), STORY_YAML_CONTENT)
    writeFileSync(
      join(storyDir2, 'story.yaml'),
      'id: WINT-002\ntitle: "Create items"\nfeature: wint\nac_text: "User can add new item"\n',
    )

    const dbFn = vi.fn().mockResolvedValue(mockFeatureRows)
    const result = await inferCapabilities({ rootDir: tmpDir }, mockInsert, dbFn)

    // Check that skipped count exists (deduplication occurred)
    expect(result.skipped).toBeGreaterThanOrEqual(0)

    // capabilityNames in captured rows should be unique
    const names = capturedRows.map(r => r.capabilityName)
    const uniqueNames = new Set(names)
    expect(names.length).toBe(uniqueNames.size)
  })

  it('handles empty rows without error (dry-run)', async () => {
    // No story files → nothing to insert
    const dbFn = vi.fn().mockResolvedValue(mockFeatureRows)
    const result = await inferCapabilities({ dryRun: true, rootDir: tmpDir }, mockInsert, dbFn)

    expect(result.attempted).toBe(0)
    expect(result.failed).toBe(0)
    expect(mockInsert).not.toHaveBeenCalled()
  })

  it('EC-4: stories with unknown epic prefix are skipped', async () => {
    const storyDir = join(tmpDir, 'xyz', 'done', 'XYZ-001')
    mkdirSync(storyDir, { recursive: true })
    writeFileSync(
      join(storyDir, 'story.yaml'),
      'id: XYZ-001\ntitle: "Some unknown feature"\nfeature: xyz\nac_text: "create items"\n',
    )

    const dbFn = vi.fn().mockResolvedValue(mockFeatureRows)
    const result = await inferCapabilities({ rootDir: tmpDir }, mockInsert, dbFn)

    // XYZ is not in mockFeatureRows, so nothing should be inserted
    expect(capturedRows.length).toBe(0)
    expect(result.succeeded).toBe(0)
  })

  it('handles db query failure gracefully', async () => {
    const failingDbFn = vi.fn().mockRejectedValue(new Error('DB connection failed'))
    const result = await inferCapabilities({ rootDir: tmpDir }, mockInsert, failingDbFn)

    expect(result.failed).toBe(1)
    expect(mockInsert).not.toHaveBeenCalled()
  })
})

// ============================================================================
// defaultInsertFn
// ============================================================================

describe('defaultInsertFn (dry-run path only — no real DB)', () => {
  it('dry-run: resolves without calling db.insert', async () => {
    const rows: InferredCapability[] = [
      {
        capabilityName: 'wint-create-inferred',
        capabilityType: 'business',
        maturityLevel: 'beta',
        lifecycleStage: 'create',
        featureId: 'f1a2b3c4-0000-0000-0000-000000000001',
      },
    ]

    // dry-run=true should not throw even without a real DB
    await expect(defaultInsertFn(rows, true)).resolves.toBeUndefined()
  })

  it('dry-run: handles empty rows without error', async () => {
    await expect(defaultInsertFn([], true)).resolves.toBeUndefined()
  })
})

// ============================================================================
// Helper functions
// ============================================================================

describe('extractEpic', () => {
  it('extracts uppercase prefix from story ID', () => {
    expect(extractEpic('WINT-4040')).toBe('WINT')
    expect(extractEpic('WISH-001')).toBe('WISH')
    expect(extractEpic('APIP-0040')).toBe('APIP')
  })

  it('returns empty string for invalid story ID', () => {
    expect(extractEpic('invalid')).toBe('')
    expect(extractEpic('')).toBe('')
  })
})

describe('extractStoryIdFromPath', () => {
  it('extracts story ID from .md file path', () => {
    expect(extractStoryIdFromPath('/plans/future/platform/wint/WINT-4040.md')).toBe('WINT-4040')
  })

  it('extracts story ID from story.yaml path', () => {
    expect(extractStoryIdFromPath('/plans/future/platform/wint/in-progress/WINT-001/story.yaml')).toBe(
      'WINT-001',
    )
  })

  it('returns empty string for unrecognized path', () => {
    expect(extractStoryIdFromPath('/some/random/file.txt')).toBe('')
  })
})

describe('readStoryFile', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = join(tmpdir(), `wint-4040-read-${Date.now()}`)
    mkdirSync(tmpDir, { recursive: true })
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('reads story.yaml and returns storyId and text', () => {
    const storyDir = join(tmpDir, 'WINT-001')
    mkdirSync(storyDir, { recursive: true })
    writeFileSync(join(storyDir, 'story.yaml'), STORY_YAML_CONTENT)

    const result = readStoryFile(join(storyDir, 'story.yaml'))
    expect(result).not.toBeNull()
    expect(result?.storyId).toBe('WINT-001')
    expect(result?.text).toContain('wishlist')
  })

  it('returns null for non-existent file', () => {
    const result = readStoryFile('/non-existent/story.yaml')
    expect(result).toBeNull()
  })
})

describe('findStoryFiles', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = join(tmpdir(), `wint-4040-find-${Date.now()}`)
    mkdirSync(tmpDir, { recursive: true })
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  it('returns empty array for non-existent directory', () => {
    const files = findStoryFiles('/non-existent-dir-xyz')
    expect(files).toEqual([])
  })

  it('finds story.yaml files recursively', () => {
    const storyDir = join(tmpDir, 'wint', 'in-progress', 'WINT-001')
    mkdirSync(storyDir, { recursive: true })
    writeFileSync(join(storyDir, 'story.yaml'), STORY_YAML_CONTENT)

    const files = findStoryFiles(tmpDir)
    expect(files.some(f => f.endsWith('story.yaml'))).toBe(true)
  })
})
