/**
 * Tests for populate-library-cache
 * WINT-2060: Populate Library Cache — Cache Common Library Patterns
 *
 * Unit tests: mocked contextCachePutFn — no real DB needed.
 * Integration tests: real PostgreSQL at DATABASE_URL (port 5432, lego_dev).
 *
 * @requires DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lego_dev
 * (lego_dev at port 5432 — NOT the KB database at port 5433)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { db } from '@repo/db'
import { contextPacks } from '@repo/knowledge-base/src/db'
import { inArray } from 'drizzle-orm'
import { populateLibraryCache, PopulateResultSchema } from '../populate-library-cache.js'

// ============================================================================
// Constants
// ============================================================================

const EXPECTED_PACK_KEYS = ['lib-react19', 'lib-tailwind', 'lib-zod', 'lib-vitest']

// ============================================================================
// Test cleanup
// ============================================================================

async function cleanupPacks() {
  await db.delete(contextPacks).where(inArray(contextPacks.packKey, EXPECTED_PACK_KEYS))
}

// ============================================================================
// Unit tests (mocked contextCachePutFn)
// ============================================================================

describe('populateLibraryCache unit tests (mocked contextCachePutFn)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('HP-4: contextCachePutFn called 4 times, each with ttl: 2592000', async () => {
    const mockPut = vi.fn().mockResolvedValue({ id: 'mock-id', packKey: 'mock' })
    const result = await populateLibraryCache({ contextCachePutFn: mockPut })

    expect(mockPut).toHaveBeenCalledTimes(4)
    expect(result.attempted).toBe(4)
    expect(result.succeeded).toBe(4)
    expect(result.failed).toBe(0)

    for (const call of mockPut.mock.calls) {
      expect(call[0]).toMatchObject({ ttl: 2592000 })
    }
  })

  it('EC-1: mock throw on 2nd call → { attempted: 4, succeeded: 3, failed: 1 }', async () => {
    let callCount = 0
    const mockPut = vi.fn().mockImplementation(async () => {
      callCount++
      if (callCount === 2) {
        throw new Error('Simulated write failure on 2nd call')
      }
      return { id: 'mock-id', packKey: 'mock' }
    })

    const result = await populateLibraryCache({ contextCachePutFn: mockPut })

    expect(result.attempted).toBe(4)
    expect(result.succeeded).toBe(3)
    expect(result.failed).toBe(1)
  })

  it('EC-2: readDoc returns null → pack skipped, failed incremented, others continue', async () => {
    const mockPut = vi.fn().mockResolvedValue({ id: 'mock-id', packKey: 'mock' })
    // Return null for all source files of the 2nd pack (lib-tailwind)
    const mockReadDoc = vi.fn().mockImplementation((relPath: string) => {
      if (relPath === 'docs/tech-stack/frontend.md' || relPath === 'CLAUDE.md') {
        // First call for lib-react19 uses frontend.md — allow it
        // But lib-tailwind also uses frontend.md + CLAUDE.md
        // We need to fail only for lib-tailwind's calls
        // Simplest: fail all reads — all 4 packs should fail
        return null
      }
      return 'mock content'
    })

    const result = await populateLibraryCache({
      contextCachePutFn: mockPut,
      readDocFn: mockReadDoc,
    })

    // All packs depend on either frontend.md, CLAUDE.md, or backend.md
    // Since we return null for frontend.md and CLAUDE.md, react19+tailwind+zod fail
    // backend.md returns 'mock content' so vitest pack succeeds
    expect(result.attempted).toBe(4)
    expect(result.failed).toBe(3)
    expect(result.succeeded).toBe(1)
    // No uncaught exception — script continues after null readDoc
  })

  it('EC-2b: all readDoc returns null → { attempted: 4, succeeded: 0, failed: 4 }', async () => {
    const mockPut = vi.fn().mockResolvedValue({ id: 'mock-id', packKey: 'mock' })
    const mockReadDoc = vi.fn().mockReturnValue(null)

    const result = await populateLibraryCache({
      contextCachePutFn: mockPut,
      readDocFn: mockReadDoc,
    })

    expect(result.attempted).toBe(4)
    expect(result.succeeded).toBe(0)
    expect(result.failed).toBe(4)
    expect(mockPut).not.toHaveBeenCalled()
  })

  it('EC-3: all writes fail (mock always throws) → { attempted: 4, succeeded: 0, failed: 4 }', async () => {
    const mockPut = vi.fn().mockRejectedValue(new Error('All writes fail'))

    const result = await populateLibraryCache({ contextCachePutFn: mockPut })

    expect(result.attempted).toBe(4)
    expect(result.succeeded).toBe(0)
    expect(result.failed).toBe(4)
  })

  it('ED-4: result matches PopulateResultSchema shape', async () => {
    const mockPut = vi.fn().mockResolvedValue({ id: 'mock-id', packKey: 'mock' })
    const result = await populateLibraryCache({ contextCachePutFn: mockPut })

    const parsed = PopulateResultSchema.safeParse(result)
    expect(parsed.success).toBe(true)
  })

  it('Null-return handling: mock returns null on 2nd call → { attempted: 4, succeeded: 3, failed: 1 }', async () => {
    let callCount = 0
    const mockPut = vi.fn().mockImplementation(async () => {
      callCount++
      if (callCount === 2) {
        return null
      }
      return { id: 'mock-id', packKey: 'mock' }
    })

    const result = await populateLibraryCache({ contextCachePutFn: mockPut })

    expect(result.attempted).toBe(4)
    expect(result.succeeded).toBe(3)
    expect(result.failed).toBe(1)
  })
})

// ============================================================================
// Integration tests (real DB port 5432)
// ============================================================================

describe('populateLibraryCache integration (real lego_dev at port 5432)', () => {
  beforeEach(async () => {
    await cleanupPacks()
  })

  afterEach(async () => {
    await cleanupPacks()
  })

  it('HP-1: writes exactly 4 entries with correct packType and packKey', async () => {
    const result = await populateLibraryCache()

    expect(result.attempted).toBe(4)
    expect(result.succeeded).toBe(4)
    expect(result.failed).toBe(0)

    const rows = await db
      .select({ packType: contextPacks.packType, packKey: contextPacks.packKey })
      .from(contextPacks)
      .where(inArray(contextPacks.packKey, EXPECTED_PACK_KEYS))

    expect(rows).toHaveLength(4)

    const packKeys = rows.map(r => r.packKey).sort()
    expect(packKeys).toEqual([...EXPECTED_PACK_KEYS].sort())

    // All packs must be 'codebase' packType
    expect(rows.every(r => r.packType === 'codebase')).toBe(true)
  })

  it('HP-2: content is structured JSONB with summary field and patterns array >= 3 entries', async () => {
    await populateLibraryCache()

    const rows = await db
      .select({ packKey: contextPacks.packKey, content: contextPacks.content })
      .from(contextPacks)
      .where(inArray(contextPacks.packKey, EXPECTED_PACK_KEYS))

    expect(rows).toHaveLength(4)

    for (const row of rows) {
      expect(typeof row.content).toBe('object')
      expect(row.content).not.toBeNull()

      const content = row.content as Record<string, unknown>
      expect(typeof content['summary']).toBe('string')
      expect((content['summary'] as string).length).toBeGreaterThan(10)

      expect(Array.isArray(content['patterns'])).toBe(true)
      expect((content['patterns'] as unknown[]).length).toBeGreaterThanOrEqual(3)
    }
  })

  it('HP-3: each pack content JSON.stringify < 8000 chars', async () => {
    await populateLibraryCache()

    const rows = await db
      .select({ packKey: contextPacks.packKey, content: contextPacks.content })
      .from(contextPacks)
      .where(inArray(contextPacks.packKey, EXPECTED_PACK_KEYS))

    expect(rows).toHaveLength(4)

    for (const row of rows) {
      const length = JSON.stringify(row.content).length
      expect(length).toBeLessThan(8000)
    }
  })

  it('ED-1: idempotency — running twice produces exactly 4 rows', async () => {
    await populateLibraryCache()
    await populateLibraryCache()

    const rows = await db
      .select({ packKey: contextPacks.packKey })
      .from(contextPacks)
      .where(inArray(contextPacks.packKey, EXPECTED_PACK_KEYS))

    expect(rows).toHaveLength(4)
  })

  it('ED-3: only codebase packType written', async () => {
    await populateLibraryCache()

    const rows = await db
      .select({ packType: contextPacks.packType })
      .from(contextPacks)
      .where(inArray(contextPacks.packKey, EXPECTED_PACK_KEYS))

    const packTypes = [...new Set(rows.map(r => r.packType))]
    expect(packTypes).toEqual(['codebase'])
  })
})
