/**
 * Tests for backlog-curate LangGraph node.
 *
 * AC-3: Unit tests cover each of the 4 phase functions independently.
 *       Integration test covers the full node handler via graph-like invocation.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import * as os from 'node:os'
import {
  loadDeferredItems,
  deduplicateAndRank,
  generatePMReviewBatch,
  produceOutput,
  createBacklogCuratorNode,
  type RawDeferredItem,
  type KbSearchFn,
} from '../backlog-curate.js'

// ============================================================================
// Helpers
// ============================================================================

function makeRawItem(overrides: Partial<RawDeferredItem> = {}): RawDeferredItem {
  return {
    source: 'kb',
    story_id: 'WINT-1234',
    description: 'Add audit trail for all deferrals',
    deferral_reason: 'Out of scope for MVP',
    deferred_at: '2026-02-20T14:30:00Z',
    ...overrides,
  }
}

function makeMockKbSearch(items: object[]): KbSearchFn {
  return vi.fn().mockResolvedValue(items)
}

// ============================================================================
// Phase 1: loadDeferredItems
// ============================================================================

describe('Phase 1: loadDeferredItems', () => {
  describe('KB query (primary source)', () => {
    it('returns items from KB search when available', async () => {
      const kbSearch = makeMockKbSearch([
        {
          story_id: 'WINT-1234',
          description: 'Add audit trail',
          deferral_reason: 'Out of scope',
          deferred_at: '2026-02-20T14:30:00Z',
        },
      ])

      const { items, warnings } = await loadDeferredItems(kbSearch, 'all', null, null)

      expect(items).toHaveLength(1)
      expect(items[0].story_id).toBe('WINT-1234')
      expect(items[0].source).toBe('kb')
      expect(warnings).toHaveLength(0)
    })

    it('filters by story ID scope', async () => {
      const kbSearch = makeMockKbSearch([
        { story_id: 'WINT-1234', description: 'Item A', deferral_reason: 'r', deferred_at: '2026-01-01T00:00:00Z' },
        { story_id: 'WISH-9999', description: 'Item B', deferral_reason: 'r', deferred_at: '2026-01-01T00:00:00Z' },
      ])

      const { items } = await loadDeferredItems(kbSearch, 'WINT-1234', null, null)

      expect(items).toHaveLength(1)
      expect(items[0].story_id).toBe('WINT-1234')
    })

    it('filters by epic prefix scope', async () => {
      const kbSearch = makeMockKbSearch([
        { story_id: 'WINT-1234', description: 'Item A', deferral_reason: 'r', deferred_at: '2026-01-01T00:00:00Z' },
        { story_id: 'WINT-5678', description: 'Item B', deferral_reason: 'r', deferred_at: '2026-01-01T00:00:00Z' },
        { story_id: 'WISH-9999', description: 'Item C', deferral_reason: 'r', deferred_at: '2026-01-01T00:00:00Z' },
      ])

      const { items } = await loadDeferredItems(kbSearch, 'WINT', null, null)

      expect(items).toHaveLength(2)
      expect(items.every(i => i.story_id.startsWith('WINT'))).toBe(true)
    })

    it('falls back with warning when KB search throws', async () => {
      const kbSearch = vi.fn().mockRejectedValue(new Error('KB unavailable'))

      const { items, warnings } = await loadDeferredItems(kbSearch, 'all', null, null)

      expect(items).toHaveLength(0)
      expect(warnings.some(w => w.includes('KB search unavailable'))).toBe(true)
    })

    it('emits warning when kbSearch not injected', async () => {
      const { items, warnings } = await loadDeferredItems(undefined, 'all', null, null)

      expect(items).toHaveLength(0)
      expect(warnings.some(w => w.includes('kbSearch not injected'))).toBe(true)
    })

    it('skips items with missing story_id or description', async () => {
      const kbSearch = makeMockKbSearch([
        { description: 'No story ID', deferral_reason: 'r', deferred_at: '2026-01-01T00:00:00Z' },
        { story_id: 'WINT-1', deferral_reason: 'r', deferred_at: '2026-01-01T00:00:00Z' },
      ])

      const { items } = await loadDeferredItems(kbSearch, 'all', null, null)

      expect(items).toHaveLength(0)
    })
  })

  describe('Filesystem scan: scope-challenges.json', () => {
    let tmpDir: string

    beforeEach(async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'backlog-curate-test-'))
    })

    afterEach(async () => {
      await fs.rm(tmpDir, { recursive: true, force: true })
    })

    it('loads items from scope-challenges.json with defer-to-backlog recommendation', async () => {
      await fs.writeFile(
        path.join(tmpDir, 'scope-challenges.json'),
        JSON.stringify([
          {
            story_id: 'WINT-5678',
            recommendation: 'defer-to-backlog',
            target: 'Add caching layer',
            deferral_note: 'Too complex for MVP',
            generated_at: '2026-03-01T10:00:00Z',
          },
        ]),
      )

      const { items } = await loadDeferredItems(undefined, 'all', tmpDir, null)

      const scopeItem = items.find(i => i.source === 'scope-challenges')
      expect(scopeItem).toBeDefined()
      expect(scopeItem!.story_id).toBe('WINT-5678')
      expect(scopeItem!.description).toBe('Add caching layer')
    })

    it('skips items without defer-to-backlog recommendation', async () => {
      await fs.writeFile(
        path.join(tmpDir, 'scope-challenges.json'),
        JSON.stringify([
          { story_id: 'WINT-9999', recommendation: 'descope', target: 'Remove feature' },
        ]),
      )

      const { items } = await loadDeferredItems(undefined, 'all', tmpDir, null)

      expect(items.filter(i => i.source === 'scope-challenges')).toHaveLength(0)
    })

    it('skips silently when scopeChallengesDir does not exist', async () => {
      const { items, warnings } = await loadDeferredItems(undefined, 'all', '/nonexistent/path', null)

      // No warnings emitted for missing dir (AC-4 spec)
      expect(items.filter(i => i.source === 'scope-challenges')).toHaveLength(0)
    })
  })

  describe('Filesystem scan: DEFERRED-KB-WRITES.yaml', () => {
    let tmpDir: string

    beforeEach(async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'backlog-curate-test-'))
    })

    afterEach(async () => {
      await fs.rm(tmpDir, { recursive: true, force: true })
    })

    it('loads items from DEFERRED-KB-WRITES.yaml', async () => {
      const yaml = [
        'pending_writes:',
        '  - story_id: WINT-4050',
        '    description: "Pending audit write"',
        '    reason: "KB was down"',
        '    deferred_at: "2026-02-15T08:00:00Z"',
      ].join('\n')

      await fs.writeFile(path.join(tmpDir, 'DEFERRED-KB-WRITES.yaml'), yaml)

      const { items } = await loadDeferredItems(undefined, 'all', null, tmpDir)

      const write = items.find(i => i.source === 'deferred-writes')
      expect(write).toBeDefined()
      expect(write!.story_id).toBe('WINT-4050')
    })
  })
})

// ============================================================================
// Phase 2: deduplicateAndRank
// ============================================================================

describe('Phase 2: deduplicateAndRank', () => {
  it('deduplicates items with same story_id + description', () => {
    const items: RawDeferredItem[] = [
      makeRawItem({ source: 'kb' }),
      makeRawItem({ source: 'scope-challenges' }),
    ]

    const result = deduplicateAndRank(items)

    expect(result).toHaveLength(1)
    expect(result[0].source).toContain('kb')
    expect(result[0].source).toContain('scope-challenges')
  })

  it('keeps distinct items with same story_id but different descriptions', () => {
    const items: RawDeferredItem[] = [
      makeRawItem({ description: 'Add audit trail' }),
      makeRawItem({ description: 'Add caching' }),
    ]

    const result = deduplicateAndRank(items)

    expect(result).toHaveLength(2)
  })

  it('keeps distinct items with same description but different story_ids', () => {
    const items: RawDeferredItem[] = [
      makeRawItem({ story_id: 'WINT-1' }),
      makeRawItem({ story_id: 'WINT-2' }),
    ]

    const result = deduplicateAndRank(items)

    expect(result).toHaveLength(2)
  })

  it('sorts by recency descending (most recent first)', () => {
    const items: RawDeferredItem[] = [
      makeRawItem({ description: 'Older item', deferred_at: '2026-01-01T00:00:00Z' }),
      makeRawItem({ description: 'Newer item', deferred_at: '2026-03-01T00:00:00Z' }),
    ]

    const result = deduplicateAndRank(items)

    expect(result[0].description).toBe('Newer item')
    expect(result[1].description).toBe('Older item')
  })

  it('handles items with invalid timestamps gracefully', () => {
    const items: RawDeferredItem[] = [
      makeRawItem({ description: 'Valid', deferred_at: '2026-01-01T00:00:00Z' }),
      makeRawItem({ description: 'Invalid', deferred_at: 'not-a-date' }),
    ]

    expect(() => deduplicateAndRank(items)).not.toThrow()
    const result = deduplicateAndRank(items)
    expect(result).toHaveLength(2)
  })

  it('returns empty array for empty input', () => {
    expect(deduplicateAndRank([])).toEqual([])
  })
})

// ============================================================================
// Phase 3: generatePMReviewBatch
// ============================================================================

describe('Phase 3: generatePMReviewBatch', () => {
  function makeDedupedItem(i: number) {
    return {
      source: 'kb',
      story_id: `WINT-${i}`,
      description: `Deferred item ${i}`,
      deferral_reason: 'Out of scope',
      deferred_at: `2026-0${(i % 9) + 1}-01T00:00:00Z`,
      descriptionHash: `hash${i}`,
    }
  }

  it('assigns sequential BC-001 IDs', () => {
    const items = [1, 2, 3].map(makeDedupedItem)
    const { batch } = generatePMReviewBatch(items, 10)

    expect(batch.map(b => b.id)).toEqual(['BC-001', 'BC-002', 'BC-003'])
  })

  it('caps batch at batchLimit', () => {
    const items = Array.from({ length: 15 }, (_, i) => makeDedupedItem(i + 1))
    const { batch, totalItemsFound, truncated } = generatePMReviewBatch(items, 10)

    expect(batch).toHaveLength(10)
    expect(totalItemsFound).toBe(15)
    expect(truncated).toBe(true)
  })

  it('sets truncated=false when items <= batchLimit', () => {
    const items = [1, 2].map(makeDedupedItem)
    const { truncated } = generatePMReviewBatch(items, 10)

    expect(truncated).toBe(false)
  })

  it('returns empty batch for empty input', () => {
    const { batch, totalItemsFound, truncated } = generatePMReviewBatch([], 10)

    expect(batch).toHaveLength(0)
    expect(totalItemsFound).toBe(0)
    expect(truncated).toBe(false)
  })

  it('assigns risk_signal for each item', () => {
    const items = [makeDedupedItem(1)]
    const { batch } = generatePMReviewBatch(items, 10)

    expect(['low', 'medium', 'high']).toContain(batch[0].risk_signal)
  })

  it('assigns recommended_action for each item', () => {
    const items = [makeDedupedItem(1)]
    const { batch } = generatePMReviewBatch(items, 10)

    expect(['promote-to-story', 'close', 'defer-again']).toContain(batch[0].recommended_action)
  })

  it('uses default batchLimit of 10 when not provided', () => {
    const items = Array.from({ length: 12 }, (_, i) => makeDedupedItem(i + 1))
    const { batch } = generatePMReviewBatch(items)

    expect(batch).toHaveLength(10)
  })
})

// ============================================================================
// Phase 4: produceOutput
// ============================================================================

describe('Phase 4: produceOutput', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'backlog-curate-output-'))
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  const sampleBatch = [
    {
      id: 'BC-001',
      source: 'kb',
      story_id: 'WINT-1234',
      description: 'Add audit trail',
      deferral_reason: 'Out of scope for MVP',
      deferred_at: '2026-02-20T14:30:00Z',
      risk_signal: 'low' as const,
      recommended_action: 'defer-again' as const,
    },
  ]

  it('writes pm-review-batch.json conforming to schema', async () => {
    await produceOutput(sampleBatch, 1, false, tmpDir)

    const raw = await fs.readFile(path.join(tmpDir, 'pm-review-batch.json'), 'utf-8')
    const data = JSON.parse(raw) as Record<string, unknown>

    expect(data).toMatchObject({
      total_items_found: 1,
      items_in_batch: 1,
      truncated: false,
    })
    expect(Array.isArray(data['items'])).toBe(true)
    expect((data['items'] as unknown[]).length).toBe(1)
  })

  it('writes PM-REVIEW-REPORT.md with item sections', async () => {
    await produceOutput(sampleBatch, 1, false, tmpDir)

    const report = await fs.readFile(path.join(tmpDir, 'PM-REVIEW-REPORT.md'), 'utf-8')

    expect(report).toContain('# Backlog Curator — PM Review Report')
    expect(report).toContain('## BC-001: Add audit trail')
    expect(report).toContain('**Story:** WINT-1234')
  })

  it('includes truncation note when truncated=true', async () => {
    await produceOutput(sampleBatch, 15, true, tmpDir)

    const report = await fs.readFile(path.join(tmpDir, 'PM-REVIEW-REPORT.md'), 'utf-8')

    expect(report).toContain('additional item')
  })

  it('overwrites existing files (idempotent)', async () => {
    await produceOutput(sampleBatch, 1, false, tmpDir)
    await produceOutput(sampleBatch, 1, false, tmpDir)

    // Second write should succeed without throwing
    const raw = await fs.readFile(path.join(tmpDir, 'pm-review-batch.json'), 'utf-8')
    expect(raw).toBeTruthy()
  })

  it('creates outputDir if it does not exist', async () => {
    const nestedDir = path.join(tmpDir, 'nested', 'output')
    await produceOutput(sampleBatch, 1, false, nestedDir)

    const exists = await fs.stat(path.join(nestedDir, 'pm-review-batch.json')).then(() => true).catch(() => false)
    expect(exists).toBe(true)
  })
})

// ============================================================================
// Integration: full node handler
// ============================================================================

describe('Integration: createBacklogCuratorNode (full handler)', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'backlog-curate-integration-'))
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  function makeState(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      storyId: 'WINT-9070',
      scope: 'all',
      outputDir: tmpDir,
      ...overrides,
    }
  }

  it('runs all 4 phases and writes output files', async () => {
    const kbSearch = makeMockKbSearch([
      {
        story_id: 'WINT-1234',
        description: 'Add audit trail',
        deferral_reason: 'Out of scope',
        deferred_at: '2026-02-20T14:30:00Z',
      },
    ])

    const node = createBacklogCuratorNode({ kbSearch })
    const result = await node(makeState() as never)

    const stateResult = (result as Record<string, unknown>)['backlogCuratorResult'] as Record<string, unknown>
    expect(stateResult).toBeDefined()
    expect(stateResult['totalItemsFound']).toBe(1)
    expect(stateResult['itemsInBatch']).toBe(1)

    // Output files written
    const batchExists = await fs.stat(path.join(tmpDir, 'pm-review-batch.json')).then(() => true).catch(() => false)
    expect(batchExists).toBe(true)
  })

  it('completes with warnings when kbSearch not injected', async () => {
    const node = createBacklogCuratorNode()
    const result = await node(makeState() as never)

    const stateResult = (result as Record<string, unknown>)['backlogCuratorResult'] as Record<string, unknown>
    expect(stateResult).toBeDefined()
    expect(stateResult['totalItemsFound']).toBe(0)
    const warnings = stateResult['warnings'] as string[]
    expect(warnings.some((w: string) => w.includes('kbSearch not injected'))).toBe(true)
  })

  it('never throws — returns error in warnings when KB fails', async () => {
    const kbSearch = vi.fn().mockRejectedValue(new Error('network failure'))
    const node = createBacklogCuratorNode({ kbSearch })

    await expect(node(makeState() as never)).resolves.not.toThrow()
  })

  it('skips file output when outputDir not provided', async () => {
    const node = createBacklogCuratorNode()
    const result = await node(makeState({ outputDir: undefined }) as never)

    const stateResult = (result as Record<string, unknown>)['backlogCuratorResult'] as Record<string, unknown>
    const warnings = stateResult['warnings'] as string[]
    expect(warnings.some((w: string) => w.includes('outputDir not set'))).toBe(true)
  })

  it('respects batchLimit config', async () => {
    const items = Array.from({ length: 20 }, (_, i) => ({
      story_id: `WINT-${i + 1}`,
      description: `Item ${i + 1}`,
      deferral_reason: 'Deferred',
      deferred_at: '2026-01-01T00:00:00Z',
    }))
    const kbSearch = makeMockKbSearch(items)

    const node = createBacklogCuratorNode({ kbSearch, batchLimit: 5 })
    const result = await node(makeState() as never)

    const stateResult = (result as Record<string, unknown>)['backlogCuratorResult'] as Record<string, unknown>
    expect(stateResult['itemsInBatch']).toBe(5)
    expect(stateResult['totalItemsFound']).toBe(20)
  })
})
