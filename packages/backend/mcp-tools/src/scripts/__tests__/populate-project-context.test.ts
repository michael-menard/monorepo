/**
 * Integration Tests for populate-project-context
 * WINT-2030: Populate Project Context Cache from CLAUDE.md and Tech-Stack Docs
 *
 * Runs against real PostgreSQL at DATABASE_URL (port 5432, lego_dev).
 * DO NOT run against port 5433 (KB database).
 *
 * @requires DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lego_dev
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { db } from '@repo/db'
import { contextPacks } from '@repo/database-schema'
import { eq, inArray } from 'drizzle-orm'
import { populateProjectContext } from '../populate-project-context.js'
import { contextCachePut } from '../../context-cache/context-cache-put.js'

// Mock the context-cache-put module so EC-1 can simulate a throw on first call.
// All other tests call vi.mocked(contextCachePut).mockRestore() or use the real
// implementation by restoring the spy after each test.
vi.mock('../../context-cache/context-cache-put.js', async importOriginal => {
  const actual = await importOriginal<typeof import('../../context-cache/context-cache-put.js')>()
  return {
    ...actual,
    contextCachePut: vi.fn(actual.contextCachePut),
  }
})

// Mock node:fs so EC-2 can simulate a missing source file for readFileSync.
vi.mock('node:fs', async importOriginal => {
  const actual = await importOriginal<typeof import('node:fs')>()
  return {
    ...actual,
    readFileSync: vi.fn(actual.readFileSync),
  }
})

const EXPECTED_PACK_KEYS = [
  'project-conventions',
  'tech-stack-backend',
  'tech-stack-frontend',
  'tech-stack-monorepo',
  'testing-strategy',
]

/** Clean only the rows written by this story's populate function */
async function cleanupPacks() {
  await db.delete(contextPacks).where(inArray(contextPacks.packKey, EXPECTED_PACK_KEYS))
  // Also clean any test-only rows
  await db.delete(contextPacks).where(eq(contextPacks.packKey, 'test-invalid'))
}

describe('populateProjectContext integration', () => {
  beforeEach(async () => {
    // Restore all mocks to real implementations before each test so integration
    // tests run against the actual DB and filesystem by default.
    vi.restoreAllMocks()
    await cleanupPacks()
  })

  afterEach(async () => {
    await cleanupPacks()
  })

  it('HP-1: writes exactly 5 entries with expected packType/packKey pairs on first run', async () => {
    const result = await populateProjectContext()

    expect(result.attempted).toBe(5)
    expect(result.succeeded).toBe(5)
    expect(result.failed).toBe(0)

    const rows = await db
      .select({ packType: contextPacks.packType, packKey: contextPacks.packKey })
      .from(contextPacks)
      .where(inArray(contextPacks.packKey, EXPECTED_PACK_KEYS))

    expect(rows).toHaveLength(5)

    const packKeys = rows.map(r => r.packKey).sort()
    expect(packKeys).toEqual([...EXPECTED_PACK_KEYS].sort())

    // architecture packs
    const archPacks = rows.filter(r => r.packKey !== 'testing-strategy')
    expect(archPacks.every(r => r.packType === 'architecture')).toBe(true)

    // test_patterns pack
    const testPack = rows.find(r => r.packKey === 'testing-strategy')
    expect(testPack?.packType).toBe('test_patterns')
  })

  it('HP-2: content is structured JSONB with summary field, not raw file string', async () => {
    await populateProjectContext()

    const rows = await db
      .select({ packKey: contextPacks.packKey, content: contextPacks.content })
      .from(contextPacks)
      .where(inArray(contextPacks.packKey, EXPECTED_PACK_KEYS))

    expect(rows).toHaveLength(5)

    for (const row of rows) {
      // Content must be an object (not a string)
      expect(typeof row.content).toBe('object')
      expect(row.content).not.toBeNull()

      // Must have a summary string field
      const content = row.content as Record<string, unknown>
      expect(typeof content['summary']).toBe('string')
      expect((content['summary'] as string).length).toBeGreaterThan(10)
    }
  })

  it('HP-3: all entries have ttl-derived expiresAt set (30 days)', async () => {
    await populateProjectContext()

    const rows = await db
      .select({ packKey: contextPacks.packKey, expiresAt: contextPacks.expiresAt })
      .from(contextPacks)
      .where(inArray(contextPacks.packKey, EXPECTED_PACK_KEYS))

    expect(rows).toHaveLength(5)

    const now = new Date()
    const expectedExpiry = new Date(now.getTime() + 2592000 * 1000)

    for (const row of rows) {
      expect(row.expiresAt).not.toBeNull()
      const expiresAt = row.expiresAt as Date
      // Should expire in roughly 30 days — allow ±60s window for test timing
      const diffMs = expectedExpiry.getTime() - expiresAt.getTime()
      expect(Math.abs(diffMs)).toBeLessThan(60_000)
    }
  })

  it('HP-4: returns summary { attempted: 5, succeeded: 5, failed: 0 }', async () => {
    const result = await populateProjectContext()

    expect(result).toEqual({ attempted: 5, succeeded: 5, failed: 0 })
  })

  it('ED-1: running populate twice does not duplicate rows (idempotency)', async () => {
    await populateProjectContext()
    await populateProjectContext()

    const rows = await db
      .select({ packKey: contextPacks.packKey })
      .from(contextPacks)
      .where(inArray(contextPacks.packKey, EXPECTED_PACK_KEYS))

    expect(rows).toHaveLength(5)
  })

  it('ED-2: content JSON stringified length < 8000 chars per pack', async () => {
    await populateProjectContext()

    const rows = await db
      .select({ packKey: contextPacks.packKey, content: contextPacks.content })
      .from(contextPacks)
      .where(inArray(contextPacks.packKey, EXPECTED_PACK_KEYS))

    expect(rows).toHaveLength(5)

    for (const row of rows) {
      const length = JSON.stringify(row.content).length
      expect(length).toBeLessThan(8000)
    }
  })

  it('EC-1: resilience — contextCachePut throwing on first call is counted as failed, other 4 packs succeed', async () => {
    // Simulate contextCachePut throwing on the first call (first pack: project-conventions).
    // The populate function catches errors in its try/catch loop — the remaining 4 packs
    // must still be written and result.failed must equal 1.
    const mockedPut = vi.mocked(contextCachePut)
    const realImplementation = mockedPut.getMockImplementation()

    mockedPut.mockImplementationOnce(() => {
      throw new Error('Simulated DB failure on first pack')
    })

    // Restore real implementation for calls 2-5 so the other packs are actually written
    if (realImplementation) {
      mockedPut.mockImplementation(realImplementation)
    }

    const result = await populateProjectContext()

    expect(result.attempted).toBe(5)
    expect(result.failed).toBe(1)
    expect(result.succeeded).toBe(4)

    // Verify that the 4 non-failing packs were actually written to DB
    const rows = await db
      .select({ packKey: contextPacks.packKey })
      .from(contextPacks)
      .where(inArray(contextPacks.packKey, EXPECTED_PACK_KEYS))

    expect(rows).toHaveLength(4)
    // project-conventions (first pack) should NOT be present
    const writtenKeys = rows.map(r => r.packKey)
    expect(writtenKeys).not.toContain('project-conventions')
  })

  it('EC-2: source doc not found — readDoc returns null, pack counted as failed, others continue', async () => {
    // Simulate a missing source file by making readFileSync throw for the CLAUDE.md path.
    // The readDoc() function catches the error and returns null, so the populate function
    // increments results.failed and continues — the other 4 packs must still succeed.
    const fs = await import('node:fs')
    const mockedReadFileSync = vi.mocked(fs.readFileSync)

    mockedReadFileSync.mockImplementationOnce((path, _options) => {
      // Only throw for CLAUDE.md (the first source doc — project-conventions pack)
      if (String(path).endsWith('CLAUDE.md')) {
        throw new Error('ENOENT: no such file or directory')
      }
      // Fall through to real implementation for all other files
      return fs.readFileSync(path, _options as BufferEncoding)
    })

    const result = await populateProjectContext()

    expect(result.attempted).toBe(5)
    expect(result.failed).toBe(1)
    expect(result.succeeded).toBe(4)

    // Verify that the 4 non-failing packs were written to DB
    const rows = await db
      .select({ packKey: contextPacks.packKey })
      .from(contextPacks)
      .where(inArray(contextPacks.packKey, EXPECTED_PACK_KEYS))

    expect(rows).toHaveLength(4)
    // project-conventions (sourced from CLAUDE.md) should NOT be present
    const writtenKeys = rows.map(r => r.packKey)
    expect(writtenKeys).not.toContain('project-conventions')
  })

  it('EC-3: invalid packType value is rejected by Zod before DB call', async () => {
    // Attempt call with invalid packType — Zod should reject before any DB write
    const result = await contextCachePut({
      packType: 'project_context' as never,
      packKey: 'test-invalid',
      content: { summary: 'invalid' },
      ttl: 3600,
    })

    // contextCachePut catches Zod errors and returns null (no DB write)
    expect(result).toBeNull()

    // Verify no row was written
    const rows = await db
      .select()
      .from(contextPacks)
      .where(eq(contextPacks.packKey, 'test-invalid'))

    expect(rows).toHaveLength(0)
  })
})
