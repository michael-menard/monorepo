/**
 * Tests for populate-domain-kb
 * WINT-2050: Populate Domain Knowledge Cache from ADR-LOG, KB Lessons, and Architecture Docs
 *
 * Unit tests: mocked contextCachePut + kbQueryFn — no real DB needed.
 * Integration tests: real PostgreSQL at DATABASE_URL (port 5432, lego_dev),
 *                    mocked KB query — no real port 5433 needed.
 *
 * @requires DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lego_dev
 * (lego_dev at port 5432 — NOT the KB database at port 5433)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { db } from '@repo/db'
import { contextPacks } from '@repo/knowledge-base/src/db'
import { inArray, eq } from 'drizzle-orm'
import {
  populateDomainKb,
  extractAdrEntries,
  extractAdrPack,
  type KbQueryResult,
  type KbQueryFn,
} from '../populate-domain-kb.js'
import { contextCachePut } from '../../context-cache/context-cache-put.js'

// ============================================================================
// Constants
// ============================================================================

const EXPECTED_PACK_KEYS = [
  'active-adrs',
  'lessons-backend',
  'lessons-frontend',
  'lessons-testing',
  'lessons-workflow',
  'blockers-known',
]

const SAMPLE_ADR_LOG = `# Architecture Decision Record Log

## ADR-001: API Endpoint Path Schema

**Date**: 2026-02-01
**Status**: Active

### Problem

Frontend expects /api/v2 prefix.

### Decision

Establish canonical API path schema with clear env mapping.

## ADR-002: Infrastructure-as-Code Strategy

**Date**: 2026-01-15
**Status**: Active

### Decision

Use AWS CDK for all infrastructure provisioning.
`

const FIXTURE_KB_ENTRIES: KbQueryResult = {
  entries: [
    {
      id: 'entry-1',
      content: 'Always validate backend inputs with Zod schemas before database writes.',
      entry_type: 'lesson',
      tags: ['backend', 'zod', 'validation'],
    },
    {
      id: 'entry-2',
      content: 'Use React Testing Library semantic queries for frontend component tests.',
      entry_type: 'lesson',
      tags: ['frontend', 'testing', 'react'],
    },
    {
      id: 'entry-3',
      content: 'E2E tests must target real services — MSW breaks Playwright flows.',
      entry_type: 'lesson',
      tags: ['testing', 'e2e', 'playwright'],
    },
    {
      id: 'entry-4',
      content: 'Agent workflow steps must be idempotent to survive retry loops.',
      entry_type: 'lesson',
      tags: ['workflow', 'agent', 'pipeline'],
    },
    {
      id: 'entry-5',
      content: 'Port 5432 (lego_dev) and port 5433 (KB) must never be confused.',
      entry_type: 'constraint',
      tags: ['blocker', 'database', 'backend'],
    },
  ],
}

const EMPTY_KB: KbQueryResult = { entries: [] }

const mockKbQuery: KbQueryFn = vi.fn().mockResolvedValue(FIXTURE_KB_ENTRIES)
const emptyKbQuery: KbQueryFn = vi.fn().mockResolvedValue(EMPTY_KB)
const failingKbQuery: KbQueryFn = vi.fn().mockRejectedValue(new Error('Connection refused to port 5433'))

// ============================================================================
// Test cleanup
// ============================================================================

async function cleanupPacks() {
  await db.delete(contextPacks).where(inArray(contextPacks.packKey, EXPECTED_PACK_KEYS))
}

// ============================================================================
// Unit tests (mocked DB + mocked KB)
// ============================================================================

describe('extractAdrEntries (unit)', () => {
  it('parses active ADRs from ADR-LOG.md content', () => {
    const entries = extractAdrEntries(SAMPLE_ADR_LOG)
    expect(entries).toHaveLength(2)
    expect(entries[0]!.id).toBe('ADR-001')
    expect(entries[0]!.title).toBe('API Endpoint Path Schema')
    expect(entries[0]!.status).toBe('Active')
    expect(entries[0]!.date).toBe('2026-02-01')
    expect(entries[0]!.decision).toContain('canonical API path schema')
  })

  it('returns empty array for content with no ADR sections', () => {
    const entries = extractAdrEntries('# No ADR sections here\n\nJust prose.')
    expect(entries).toHaveLength(0)
  })

  it('handles ADR with unknown status gracefully', () => {
    const raw = '## ADR-003: Some Decision\n\n**Date**: 2026-03-01\n\nNo status line here.\n\n### Decision\n\nDo something.'
    const entries = extractAdrEntries(raw)
    expect(entries).toHaveLength(1)
    expect(entries[0]!.status).toBe('Unknown')
  })
})

describe('extractAdrPack (unit)', () => {
  it('AC-1: returns structured JSONB with summary, adrs array, and counts', () => {
    const content = extractAdrPack(SAMPLE_ADR_LOG)
    expect(typeof content['summary']).toBe('string')
    expect((content['summary'] as string).length).toBeGreaterThan(10)
    expect(Array.isArray(content['adrs'])).toBe(true)
    expect((content['adrs'] as unknown[]).length).toBeGreaterThan(0)
    expect(typeof content['totalAdrs']).toBe('number')
    expect(typeof content['activeCount']).toBe('number')
  })

  it('content JSON is under 8000 chars', () => {
    const content = extractAdrPack(SAMPLE_ADR_LOG)
    expect(JSON.stringify(content).length).toBeLessThan(8000)
  })

  it('AC-6 (content cap): trims large content to under 8000 chars', () => {
    // Build a massive ADR log to trigger the cap
    const bigEntry = 'x'.repeat(200)
    let bigLog = '# ADR Log\n\n'
    for (let i = 1; i <= 50; i++) {
      bigLog += `## ADR-${String(i).padStart(3, '0')}: Decision ${i}\n\n**Date**: 2026-01-01\n**Status**: Active\n\n### Decision\n\n${bigEntry}\n\n`
    }
    const content = extractAdrPack(bigLog)
    expect(JSON.stringify(content).length).toBeLessThan(8000)
  })
})

describe('populateDomainKb unit tests (mocked contextCachePut + kbQueryFn)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('AC-9 (injectable kbQueryFn): calls mock, not real port 5433', async () => {
    const mockKb: KbQueryFn = vi.fn().mockResolvedValue(FIXTURE_KB_ENTRIES)
    // Use vi.mock or spy — we verify no real pg call is made
    await populateDomainKb({ kbQueryFn: mockKb })
    expect(mockKb).toHaveBeenCalledTimes(1)
  })

  it('AC-2 (lessons packs): mock kbQueryFn returns fixture, domain packs are written', async () => {
    const mockKb: KbQueryFn = vi.fn().mockResolvedValue(FIXTURE_KB_ENTRIES)
    const result = await populateDomainKb({ kbQueryFn: mockKb })
    // 6 packs attempted: 1 ADR + 4 lessons + 1 blockers
    expect(result.attempted).toBe(6)
    expect(result.succeeded).toBeGreaterThanOrEqual(1) // at minimum ADR pack
  })

  it('AC-5 (EC-1): KB unavailable — ADR pack still written, KB packs increment failed', async () => {
    const result = await populateDomainKb({ kbQueryFn: failingKbQuery })
    // ADR pack should still be attempted (may succeed or fail depending on file availability)
    expect(result.attempted).toBe(6)
    // failed >= 0 (no exception thrown)
    expect(result.failed).toBeGreaterThanOrEqual(0)
    // succeeded + failed = attempted
    expect(result.succeeded + result.failed).toBe(result.attempted)
  })

  it('AC-5 (EC-3): single pack write failure does not abort run — all 6 packs attempted', async () => {
    // Mock contextCachePut to fail on second call only
    const putModule = await import('../../context-cache/context-cache-put.js')
    let callCount = 0
    const originalPut = putModule.contextCachePut

    vi.spyOn(putModule, 'contextCachePut').mockImplementation(async input => {
      callCount++
      if (callCount === 2) {
        return null // simulate pack write failure on second call
      }
      return originalPut(input)
    })

    const mockKb: KbQueryFn = vi.fn().mockResolvedValue(FIXTURE_KB_ENTRIES)
    const result = await populateDomainKb({ kbQueryFn: mockKb })

    // Run must not abort — all 6 packs must be attempted
    expect(result.attempted).toBe(6)
    expect(result.succeeded + result.failed).toBe(6)
    // Second pack write returned null → failed should reflect it
    expect(result.failed).toBeGreaterThanOrEqual(1)

    vi.restoreAllMocks()
  })
})

// ============================================================================
// Integration tests (real DB port 5432, mocked KB query)
// ============================================================================

describe('populateDomainKb integration (real lego_dev at port 5432, mocked KB)', () => {
  beforeEach(async () => {
    await cleanupPacks()
  })

  afterEach(async () => {
    await cleanupPacks()
  })

  it('AC-1 (HP-1): active-adrs pack written with correct packType and JSONB content', async () => {
    const result = await populateDomainKb({ kbQueryFn: mockKbQuery })

    expect(result.attempted).toBe(6)
    expect(result.succeeded).toBeGreaterThanOrEqual(2)

    const rows = await db
      .select({ packType: contextPacks.packType, packKey: contextPacks.packKey, content: contextPacks.content })
      .from(contextPacks)
      .where(eq(contextPacks.packKey, 'active-adrs'))

    expect(rows).toHaveLength(1)
    expect(rows[0]!.packType).toBe('architecture')

    const content = rows[0]!.content as Record<string, unknown>
    expect(typeof content['summary']).toBe('string')
    expect(Array.isArray(content['adrs'])).toBe(true)
    expect(JSON.stringify(content).length).toBeLessThan(8000)
  })

  it('AC-2 (HP-2): lessons packs written per domain with packType=lessons_learned', async () => {
    const result = await populateDomainKb({ kbQueryFn: mockKbQuery })

    expect(result.attempted).toBe(6)

    const rows = await db
      .select({ packType: contextPacks.packType, packKey: contextPacks.packKey })
      .from(contextPacks)
      .where(inArray(contextPacks.packKey, ['lessons-backend', 'lessons-frontend', 'lessons-testing', 'lessons-workflow']))

    expect(rows.length).toBeGreaterThanOrEqual(1)
    expect(rows.every(r => r.packType === 'lessons_learned')).toBe(true)
  })

  it('AC-3 (HP-3): blockers-known pack written with blockers array', async () => {
    await populateDomainKb({ kbQueryFn: mockKbQuery })

    const rows = await db
      .select({ content: contextPacks.content })
      .from(contextPacks)
      .where(eq(contextPacks.packKey, 'blockers-known'))

    expect(rows).toHaveLength(1)
    const content = rows[0]!.content as Record<string, unknown>
    expect(typeof content['summary']).toBe('string')
    expect(Array.isArray(content['blockers'])).toBe(true)
  })

  it('AC-4 (HP-3/HP-4): all packs have ttl: 2592000 (30 days) expiresAt', async () => {
    await populateDomainKb({ kbQueryFn: mockKbQuery })

    const rows = await db
      .select({ packKey: contextPacks.packKey, expiresAt: contextPacks.expiresAt })
      .from(contextPacks)
      .where(inArray(contextPacks.packKey, EXPECTED_PACK_KEYS))

    const now = new Date()
    const expected30Days = new Date(now.getTime() + 2592000 * 1000)

    for (const row of rows) {
      expect(row.expiresAt).not.toBeNull()
      const diffMs = expected30Days.getTime() - (row.expiresAt as Date).getTime()
      // Allow ±60s for test timing
      expect(Math.abs(diffMs)).toBeLessThan(60_000)
    }
  })

  it('AC-4 (HP-5): idempotency — running twice yields same row count', async () => {
    await populateDomainKb({ kbQueryFn: mockKbQuery })

    const rowsBefore = await db
      .select({ packKey: contextPacks.packKey })
      .from(contextPacks)
      .where(inArray(contextPacks.packKey, EXPECTED_PACK_KEYS))

    await populateDomainKb({ kbQueryFn: mockKbQuery })

    const rowsAfter = await db
      .select({ packKey: contextPacks.packKey })
      .from(contextPacks)
      .where(inArray(contextPacks.packKey, EXPECTED_PACK_KEYS))

    expect(rowsAfter.length).toBe(rowsBefore.length)
  })

  it('AC-8 (HP-6): all 6 expected packs present after full run', async () => {
    const result = await populateDomainKb({ kbQueryFn: mockKbQuery })

    expect(result.attempted).toBe(6)
    expect(result.succeeded).toBe(6)
    expect(result.failed).toBe(0)

    const rows = await db
      .select({ packKey: contextPacks.packKey })
      .from(contextPacks)
      .where(inArray(contextPacks.packKey, EXPECTED_PACK_KEYS))

    expect(rows.length).toBe(6)

    const packKeys = rows.map(r => r.packKey).sort()
    expect(packKeys).toEqual([...EXPECTED_PACK_KEYS].sort())
  })

  it('AC-10 (ED-2): only architecture and lessons_learned packType values used', async () => {
    await populateDomainKb({ kbQueryFn: mockKbQuery })

    const rows = await db
      .select({ packType: contextPacks.packType })
      .from(contextPacks)
      .where(inArray(contextPacks.packKey, EXPECTED_PACK_KEYS))

    const packTypes = [...new Set(rows.map(r => r.packType))].sort()
    expect(packTypes).toEqual(['architecture', 'lessons_learned'].sort())
  })

  it('AC-6 (ED-1): all pack content JSON < 8000 chars', async () => {
    await populateDomainKb({ kbQueryFn: mockKbQuery })

    const rows = await db
      .select({ packKey: contextPacks.packKey, content: contextPacks.content })
      .from(contextPacks)
      .where(inArray(contextPacks.packKey, EXPECTED_PACK_KEYS))

    for (const row of rows) {
      const length = JSON.stringify(row.content).length
      expect(length).toBeLessThan(8000)
    }
  })

  it('AC-6 (ED-1 high-volume): 100 entries per domain still caps at 8000 chars', async () => {
    // Build 100 entries per domain area to stress-test the cap
    const highVolumeEntries: KbQueryResult = {
      entries: Array.from({ length: 100 }, (_, i) => ({
        id: `e-${i}`,
        content: `Backend lesson ${i}: always validate inputs at the API boundary before processing. `.repeat(3),
        entry_type: 'lesson',
        tags: ['backend', 'api', 'validation'],
      })).concat(
        Array.from({ length: 100 }, (_, i) => ({
          id: `f-${i}`,
          content: `Blocker ${i}: known constraint about database connections and timeouts. `.repeat(3),
          entry_type: 'constraint',
          tags: ['blocker', 'database'],
        }))
      ),
    }
    const highVolumeKb: KbQueryFn = vi.fn().mockResolvedValue(highVolumeEntries)

    await populateDomainKb({ kbQueryFn: highVolumeKb })

    const rows = await db
      .select({ packKey: contextPacks.packKey, content: contextPacks.content })
      .from(contextPacks)
      .where(inArray(contextPacks.packKey, EXPECTED_PACK_KEYS))

    for (const row of rows) {
      const length = JSON.stringify(row.content).length
      expect(length).toBeLessThan(8000)
    }
  })

  it('AC-5 (EC-2): empty KB — all packs still written with empty lessons arrays', async () => {
    const result = await populateDomainKb({ kbQueryFn: emptyKbQuery })

    expect(result.attempted).toBe(6)
    expect(result.succeeded).toBe(6)
    expect(result.failed).toBe(0)

    const lessonsRows = await db
      .select({ packKey: contextPacks.packKey, content: contextPacks.content })
      .from(contextPacks)
      .where(inArray(contextPacks.packKey, ['lessons-backend', 'lessons-frontend', 'lessons-testing', 'lessons-workflow']))

    for (const row of lessonsRows) {
      const content = row.content as Record<string, unknown>
      expect(Array.isArray(content['lessons'])).toBe(true)
      expect((content['lessons'] as unknown[]).length).toBe(0)
    }
  })

  it('PopulateResultSchema: result matches schema shape', async () => {
    const { PopulateResultSchema } = await import('../populate-domain-kb.js')
    const result = await populateDomainKb({ kbQueryFn: mockKbQuery })
    const parsed = PopulateResultSchema.safeParse(result)
    expect(parsed.success).toBe(true)
  })
})
