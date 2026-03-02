/**
 * KB Freshness Check — Unit Tests
 *
 * @see APIP-4060 AC-10
 * @see APIP-4060.md for test scenarios HP-1 through HP-7, EC-1 through EC-3, ED-1 through ED-3
 */

import { describe, expect, it, vi, beforeEach } from 'vitest'
import {
  runKbFreshnessCheck,
  extractFirstFilePath,
  calculateCutoffDate,
  FILE_PATH_REGEX,
  type KbFreshnessCheckDeps,
  type FreshnessKnowledgeEntry,
  type FreshnessAuditLogger,
  type FreshnessKbUpdateFn,
  type FreshnessFs,
} from '../index.js'
import {
  KbFreshnessConfigSchema,
  KbFreshnessResultSchema,
  type KbFreshnessConfig,
} from '../__types__/index.js'

// ---------------------------------------------------------------------------
// Logger mock
// ---------------------------------------------------------------------------

vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeEntry(overrides: Partial<FreshnessKnowledgeEntry> = {}): FreshnessKnowledgeEntry {
  return {
    id: `entry-${Math.random().toString(36).slice(2, 8)}`,
    content: 'Some KB content without file references.',
    role: 'dev',
    tags: null,
    createdAt: new Date('2025-01-01T00:00:00Z'), // older than 90 days from 2026-03-01
    updatedAt: new Date('2025-01-01T00:00:00Z'),
    archived: false,
    archivedAt: null,
    ...overrides,
  }
}

function makeEntryWithPath(
  filePath: string,
  exists = true,
  overrides: Partial<FreshnessKnowledgeEntry> = {},
): FreshnessKnowledgeEntry {
  return makeEntry({
    content: `See ${filePath} for implementation details.`,
    ...overrides,
  })
}

function makeDeps(
  entries: FreshnessKnowledgeEntry[][],
  fsOverrides: Record<string, boolean> = {},
  kbUpdateOverride?: FreshnessKbUpdateFn,
  auditLoggerOverride?: FreshnessAuditLogger,
): KbFreshnessCheckDeps {
  let batchCallCount = 0

  const batchQuery = vi.fn(async (_cutoff: Date, limit: number, _offset: number) => {
    const batch = entries[batchCallCount] ?? []
    batchCallCount++
    return batch
  })

  const kbUpdate: FreshnessKbUpdateFn =
    kbUpdateOverride ??
    vi.fn(async (input, _deps) => ({
      ...makeEntry({ id: input.id }),
      archived: input.archived ?? false,
      archivedAt: input.archived_at ?? null,
      tags: input.tags ?? null,
    }))

  const auditLogger: FreshnessAuditLogger = auditLoggerOverride ?? {
    logUpdate: vi.fn().mockResolvedValue(undefined),
  }

  const fs: FreshnessFs = {
    existsSync: vi.fn(path => {
      if (path in fsOverrides) return fsOverrides[path]
      return true // default: file exists
    }),
  }

  return {
    batchQuery,
    kbUpdate,
    auditLogger,
    fs,
    db: {},
    embeddingClient: { generateEmbedding: vi.fn().mockResolvedValue([]) },
  }
}

const DEFAULT_CONFIG: KbFreshnessConfig = {
  staleDays: 90,
  dryRun: false,
  batchSize: 500,
  maxDurationMs: 300000,
}

// ---------------------------------------------------------------------------
// Schema tests (HP-6, HP-7, AC-8, AC-9)
// ---------------------------------------------------------------------------

describe('Schema validation', () => {
  it('KbFreshnessConfigSchema applies defaults for staleDays and batchSize (HP-7)', () => {
    const parsed = KbFreshnessConfigSchema.parse({ dryRun: true })
    expect(parsed.staleDays).toBe(90)
    expect(parsed.batchSize).toBe(500)
    expect(parsed.dryRun).toBe(true)
    expect(parsed.maxDurationMs).toBe(300000)
  })

  it('KbFreshnessResultSchema validates a complete result (HP-6)', () => {
    const result = {
      archived_count: 2,
      flagged_count: 3,
      skipped_count: 1,
      entries_scanned: 6,
      duration_ms: 1234,
      dry_run: false,
      batches_processed: 1,
      truncated: false,
    }
    expect(() => KbFreshnessResultSchema.parse(result)).not.toThrow()
  })
})

// ---------------------------------------------------------------------------
// Helper function tests
// ---------------------------------------------------------------------------

describe('extractFirstFilePath', () => {
  it('returns null for content with no file path reference', () => {
    expect(extractFirstFilePath('Some generic KB content with no paths.')).toBeNull()
  })

  it('extracts a path starting with apps/', () => {
    const content = 'See apps/api/knowledge-base/src/db/schema.ts for the schema.'
    const result = extractFirstFilePath(content)
    expect(result).toBe('apps/api/knowledge-base/src/db/schema.ts')
  })

  it('extracts a path starting with packages/', () => {
    const content = 'Check packages/backend/orchestrator/src/nodes/freshness/index.ts'
    const result = extractFirstFilePath(content)
    expect(result).toBe('packages/backend/orchestrator/src/nodes/freshness/index.ts')
  })

  it('returns the first path when multiple paths exist', () => {
    const content =
      'apps/api/old-file.ts was replaced by packages/core/new-file.ts in APIP-4060.'
    const result = extractFirstFilePath(content)
    expect(result).toBe('apps/api/old-file.ts')
  })

  it('does not match paths without file extensions', () => {
    const content = 'See apps/api/knowledge-base for the service.'
    expect(extractFirstFilePath(content)).toBeNull()
  })
})

describe('calculateCutoffDate', () => {
  it('returns a date staleDays in the past at midnight', () => {
    const cutoff = calculateCutoffDate(90)
    const now = new Date()
    const expected = new Date()
    expected.setDate(expected.getDate() - 90)
    expected.setHours(0, 0, 0, 0)
    // Allow 1 second tolerance
    expect(Math.abs(cutoff.getTime() - expected.getTime())).toBeLessThan(1000)
    expect(cutoff.getHours()).toBe(0)
    expect(cutoff.getMinutes()).toBe(0)
    expect(cutoff.getSeconds()).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// HP-1: Dry-run returns counts without mutations
// ---------------------------------------------------------------------------

describe('runKbFreshnessCheck — dry-run (HP-1, AC-6)', () => {
  it('returns counts without any kbUpdate calls', async () => {
    const nonExistentPath = 'apps/api/knowledge-base/old-file.ts'
    const existingPath = 'apps/api/knowledge-base/src/index.ts'

    const entries = [
      makeEntryWithPath(nonExistentPath),
      makeEntryWithPath(nonExistentPath),
      makeEntryWithPath(existingPath),
    ]

    const deps = makeDeps([entries, []], { [nonExistentPath]: false, [existingPath]: true })
    const result = await runKbFreshnessCheck(deps, { ...DEFAULT_CONFIG, dryRun: true })

    expect(result.dry_run).toBe(true)
    expect(result.archived_count).toBe(2)
    expect(result.flagged_count).toBe(1)
    expect(deps.kbUpdate).not.toHaveBeenCalled()
    expect(result.entries_scanned).toBe(3)
  })
})

// ---------------------------------------------------------------------------
// HP-2: Non-existent file paths are archived (AC-4, AC-15)
// ---------------------------------------------------------------------------

describe('runKbFreshnessCheck — archive non-existent paths (HP-2, AC-4, AC-15)', () => {
  it('calls kbUpdate with archived:true and AuditLogger.logUpdate for each archived entry', async () => {
    const filePath = 'apps/api/knowledge-base/old-file.ts'
    const entries = [
      makeEntryWithPath(filePath, false, { id: 'entry-1' }),
      makeEntryWithPath(filePath, false, { id: 'entry-2' }),
      makeEntryWithPath(filePath, false, { id: 'entry-3' }),
    ]

    const auditLogger = { logUpdate: vi.fn().mockResolvedValue(undefined) }
    const deps = makeDeps([entries, []], { [filePath]: false }, undefined, auditLogger)

    const result = await runKbFreshnessCheck(deps, DEFAULT_CONFIG)

    expect(result.archived_count).toBe(3)
    expect(result.dry_run).toBe(false)
    expect(deps.kbUpdate).toHaveBeenCalledTimes(3)

    // Verify kbUpdate called with archived:true
    const calls = vi.mocked(deps.kbUpdate).mock.calls
    for (const [input] of calls) {
      expect(input.archived).toBe(true)
      expect(input.archived_at).toBeInstanceOf(Date)
    }

    // AC-15: AuditLogger.logUpdate called for each archived entry
    expect(auditLogger.logUpdate).toHaveBeenCalledTimes(3)
  })
})

// ---------------------------------------------------------------------------
// HP-3: Existing file paths are flagged with 'stale-candidate' (AC-5)
// ---------------------------------------------------------------------------

describe('runKbFreshnessCheck — flag entries with existing paths (HP-3, AC-5)', () => {
  it('calls kbUpdate with stale-candidate tag (not archived)', async () => {
    const existingPath = 'packages/backend/orchestrator/src/nodes/freshness/index.ts'
    const entries = [
      makeEntryWithPath(existingPath, true, { id: 'entry-1', tags: ['typescript'] }),
      makeEntryWithPath(existingPath, true, { id: 'entry-2', tags: null }),
      makeEntryWithPath(existingPath, true, { id: 'entry-3', tags: ['dev'] }),
    ]

    const deps = makeDeps([entries, []], { [existingPath]: true })
    const result = await runKbFreshnessCheck(deps, DEFAULT_CONFIG)

    expect(result.flagged_count).toBe(3)
    expect(result.archived_count).toBe(0)
    expect(deps.kbUpdate).toHaveBeenCalledTimes(3)

    const calls = vi.mocked(deps.kbUpdate).mock.calls
    for (const [input] of calls) {
      expect(input.archived).toBeUndefined()
      expect(input.tags).toContain('stale-candidate')
    }
  })

  it('does not duplicate stale-candidate tag if already present', async () => {
    const existingPath = 'packages/backend/orchestrator/src/index.ts'
    const entry = makeEntryWithPath(existingPath, true, {
      id: 'entry-1',
      tags: ['stale-candidate', 'typescript'],
    })

    const deps = makeDeps([[entry], []], { [existingPath]: true })
    await runKbFreshnessCheck(deps, DEFAULT_CONFIG)

    const [input] = vi.mocked(deps.kbUpdate).mock.calls[0]
    const tagCount = (input.tags ?? []).filter(t => t === 'stale-candidate').length
    expect(tagCount).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// HP-4: Entries without file references are skipped (AC-3)
// ---------------------------------------------------------------------------

describe('runKbFreshnessCheck — skip entries with no file references (HP-4)', () => {
  it('counts entries without paths as skipped and makes no kbUpdate calls', async () => {
    const entries = [
      makeEntry({ id: 'e1', content: 'Generic advice about testing strategies.' }),
      makeEntry({ id: 'e2', content: 'Always use zod for schema validation.' }),
      makeEntry({ id: 'e3', content: 'No file references here at all.' }),
      makeEntry({ id: 'e4', content: 'Use @repo/logger for structured logging.' }),
      makeEntry({ id: 'e5', content: 'Follow conventional commits format.' }),
    ]

    const deps = makeDeps([entries, []])
    const result = await runKbFreshnessCheck(deps, DEFAULT_CONFIG)

    expect(result.skipped_count).toBe(5)
    expect(deps.kbUpdate).not.toHaveBeenCalled()
    expect(result.archived_count).toBe(0)
    expect(result.flagged_count).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// HP-5: Batch processing respects batchSize (AC-2, AC-14)
// ---------------------------------------------------------------------------

describe('runKbFreshnessCheck — batch processing (HP-5, AC-2, AC-14)', () => {
  it('processes batches respecting batchSize and reports batches_processed', async () => {
    const existingPath = 'packages/backend/orchestrator/src/index.ts'
    const batch1 = Array.from({ length: 500 }, (_, i) =>
      makeEntryWithPath(existingPath, true, { id: `entry-batch1-${i}` }),
    )
    const batch2 = Array.from({ length: 500 }, (_, i) =>
      makeEntryWithPath(existingPath, true, { id: `entry-batch2-${i}` }),
    )
    const batch3 = Array.from({ length: 200 }, (_, i) =>
      makeEntryWithPath(existingPath, true, { id: `entry-batch3-${i}` }),
    )

    const deps = makeDeps([batch1, batch2, batch3, []], { [existingPath]: true })
    const result = await runKbFreshnessCheck(deps, { ...DEFAULT_CONFIG, batchSize: 500 })

    expect(result.batches_processed).toBe(3)
    expect(result.entries_scanned).toBe(1200)
  })
})

// ---------------------------------------------------------------------------
// EC-1: Per-entry kbUpdate failure does not abort the batch (AC-12)
// ---------------------------------------------------------------------------

describe('runKbFreshnessCheck — per-entry error isolation (EC-1, AC-12)', () => {
  it('continues processing when kbUpdate throws on one entry', async () => {
    const filePath = 'apps/api/knowledge-base/old-file.ts'
    const entries = Array.from({ length: 10 }, (_, i) =>
      makeEntryWithPath(filePath, false, { id: `entry-${i}` }),
    )

    let callCount = 0
    const kbUpdate = vi.fn(async (input: Parameters<FreshnessKbUpdateFn>[0], _deps: Parameters<FreshnessKbUpdateFn>[1]) => {
      callCount++
      if (callCount === 3) {
        throw new Error('DB connection error on entry 3')
      }
      return makeEntry({ id: input.id, archived: true })
    }) as FreshnessKbUpdateFn

    const deps = makeDeps([entries, []], { [filePath]: false }, kbUpdate)
    const result = await runKbFreshnessCheck(deps, DEFAULT_CONFIG)

    // 9 archived (entries 1-2, 4-10), 1 skipped (entry 3 threw)
    expect(result.archived_count).toBe(9)
    expect(result.skipped_count).toBe(1)
    // No uncaught exception — function completed
    expect(result.entries_scanned).toBe(10)
  })
})

// ---------------------------------------------------------------------------
// EC-2: AuditLogger failure is soft-failed (AC-12)
// ---------------------------------------------------------------------------

describe('runKbFreshnessCheck — AuditLogger soft fail (EC-2)', () => {
  it('continues kbUpdate processing even when AuditLogger throws', async () => {
    const filePath = 'apps/api/knowledge-base/old-file.ts'
    const entries = [
      makeEntryWithPath(filePath, false, { id: 'entry-1' }),
      makeEntryWithPath(filePath, false, { id: 'entry-2' }),
    ]

    const auditLogger: FreshnessAuditLogger = {
      logUpdate: vi.fn().mockRejectedValue(new Error('audit write failed')),
    }
    const deps = makeDeps([entries, []], { [filePath]: false }, undefined, auditLogger)
    const result = await runKbFreshnessCheck(deps, DEFAULT_CONFIG)

    // kbUpdate should still have been called despite audit failure
    expect(deps.kbUpdate).toHaveBeenCalledTimes(2)
    expect(result.archived_count).toBe(2)
  })
})

// ---------------------------------------------------------------------------
// EC-3: Empty KB returns zero counts without error
// ---------------------------------------------------------------------------

describe('runKbFreshnessCheck — empty KB (EC-3)', () => {
  it('returns all-zero counts and does not throw', async () => {
    const deps = makeDeps([[]])
    const result = await runKbFreshnessCheck(deps, DEFAULT_CONFIG)

    expect(result.archived_count).toBe(0)
    expect(result.flagged_count).toBe(0)
    expect(result.skipped_count).toBe(0)
    expect(result.entries_scanned).toBe(0)
    expect(result.batches_processed).toBe(0)
    expect(result.truncated).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// ED-1: Time truncation halts at batch boundary (AC-13)
// ---------------------------------------------------------------------------

describe('runKbFreshnessCheck — time truncation (ED-1, AC-13)', () => {
  it('returns truncated:true and partial counts when maxDurationMs exceeded', async () => {
    // Use a tiny maxDurationMs so it triggers after first full batch
    const existingPath = 'packages/backend/orchestrator/src/index.ts'
    const batch1 = Array.from({ length: 500 }, (_, i) =>
      makeEntryWithPath(existingPath, true, { id: `entry-${i}` }),
    )
    const batch2 = Array.from({ length: 500 }, (_, i) =>
      makeEntryWithPath(existingPath, true, { id: `entry-b2-${i}` }),
    )

    // Slow kbUpdate to ensure time elapses
    const kbUpdate = vi.fn(async (input: Parameters<FreshnessKbUpdateFn>[0], _deps: Parameters<FreshnessKbUpdateFn>[1]) => {
      return makeEntry({ id: input.id })
    }) as FreshnessKbUpdateFn

    const deps = makeDeps([batch1, batch2, []], { [existingPath]: true }, kbUpdate)

    // maxDurationMs: 1 — should truncate after first full batch completes
    const result = await runKbFreshnessCheck(deps, {
      ...DEFAULT_CONFIG,
      maxDurationMs: 1,
    })

    expect(result.truncated).toBe(true)
    // Partial results returned (at least first batch processed)
    expect(result.batches_processed).toBeGreaterThanOrEqual(1)
    expect(result.entries_scanned).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// ED-2: Entry with multiple file path references handled consistently
// ---------------------------------------------------------------------------

describe('runKbFreshnessCheck — multiple paths in one entry (ED-2)', () => {
  it('archives the entry when first path is non-existent (first match wins)', async () => {
    const nonExistentPath = 'apps/api/old-file.ts'
    const existingPath = 'apps/api/knowledge-base/src/index.ts'
    const entry = makeEntry({
      id: 'multi-path-entry',
      content: `See ${nonExistentPath} or ${existingPath} for details.`,
    })

    const deps = makeDeps([[entry], []], {
      [nonExistentPath]: false,
      [existingPath]: true,
    })

    const result = await runKbFreshnessCheck(deps, DEFAULT_CONFIG)

    // First match (non-existent path) wins → archived
    expect(result.archived_count).toBe(1)
    expect(result.flagged_count).toBe(0)
    const [input] = vi.mocked(deps.kbUpdate).mock.calls[0]
    expect(input.archived).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// ED-3: Batch loop exits correctly on partial last batch
// ---------------------------------------------------------------------------

describe('runKbFreshnessCheck — partial last batch (ED-3)', () => {
  it('exits loop correctly and reports correct batches_processed and entries_scanned', async () => {
    const existingPath = 'packages/backend/orchestrator/src/index.ts'
    const batch1 = Array.from({ length: 500 }, (_, i) =>
      makeEntryWithPath(existingPath, true, { id: `b1-${i}` }),
    )
    const batch2 = Array.from({ length: 200 }, (_, i) =>
      makeEntryWithPath(existingPath, true, { id: `b2-${i}` }),
    )

    const deps = makeDeps([batch1, batch2, []], { [existingPath]: true })
    const result = await runKbFreshnessCheck(deps, { ...DEFAULT_CONFIG, batchSize: 500 })

    expect(result.batches_processed).toBe(2)
    expect(result.entries_scanned).toBe(700)
    expect(result.truncated).toBe(false)
  })
})
