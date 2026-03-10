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

// vi.mock calls are hoisted to the top of the file by Vitest — they execute before imports.
// We wrap the real modules so each test can inject failures via mockImplementationOnce.
vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs')
  return {
    ...actual,
    readFileSync: vi.fn(actual.readFileSync),
  }
})

vi.mock('../../context-cache/context-cache-put.js', async () => {
  const actual =
    await vi.importActual<typeof import('../../context-cache/context-cache-put.js')>(
      '../../context-cache/context-cache-put.js',
    )
  return {
    ...actual,
    contextCachePut: vi.fn(actual.contextCachePut),
  }
})

// Imports must come AFTER vi.mock declarations (hoisting means mocks are set up first)
import { readFileSync } from 'node:fs'
import { contextCachePut } from '../../context-cache/context-cache-put.js'
import { populateProjectContext } from '../populate-project-context.js'

const mockedReadFileSync = vi.mocked(readFileSync)
const mockedContextCachePut = vi.mocked(contextCachePut)

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
    await cleanupPacks()
    // Clear any queued mockImplementationOnce from previous tests.
    // mockReset clears implementations AND call history, so we must re-set real impls.
    mockedReadFileSync.mockReset()
    mockedContextCachePut.mockReset()
    // Re-wire to real implementations so HP/ED tests run as true integration tests
    const realFs = await vi.importActual<typeof import('node:fs')>('node:fs')
    mockedReadFileSync.mockImplementation(realFs.readFileSync as typeof readFileSync)
    const realCachePut =
      await vi.importActual<typeof import('../../context-cache/context-cache-put.js')>(
        '../../context-cache/context-cache-put.js',
      )
    mockedContextCachePut.mockImplementation(realCachePut.contextCachePut)
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

  it('EC-1: resilience — single contextCachePut throw does not abort run; 4 packs written, 1 failed', async () => {
    // Make contextCachePut throw on the very first call (project-conventions pack).
    // mockImplementationOnce queues the throw for the first call only;
    // subsequent calls fall through to the real implementation set in beforeEach.
    mockedContextCachePut.mockImplementationOnce(() => {
      throw new Error('Simulated DB write failure for project-conventions')
    })

    const result = await populateProjectContext()

    // All 5 packs were attempted
    expect(result.attempted).toBe(5)
    // First pack threw — remaining 4 must have been written
    expect(result.failed).toBe(1)
    expect(result.succeeded).toBe(4)

    // Confirm 4 rows actually written to DB — project-conventions was the failing pack
    const rows = await db
      .select({ packKey: contextPacks.packKey })
      .from(contextPacks)
      .where(inArray(contextPacks.packKey, EXPECTED_PACK_KEYS))

    expect(rows).toHaveLength(4)
    const writtenKeys = rows.map(r => r.packKey).sort()
    expect(writtenKeys).not.toContain('project-conventions')
    expect(writtenKeys).toContain('tech-stack-backend')
    expect(writtenKeys).toContain('tech-stack-frontend')
    expect(writtenKeys).toContain('tech-stack-monorepo')
    expect(writtenKeys).toContain('testing-strategy')
  })

  it('EC-2: missing source doc — readFileSync ENOENT for CLAUDE.md; pack counted failed, 4 others continue', async () => {
    // Make readFileSync throw ENOENT on the first call (CLAUDE.md for project-conventions).
    // mockImplementationOnce queues the error for the first call only;
    // subsequent calls fall through to the real implementation set in beforeEach.
    mockedReadFileSync.mockImplementationOnce((_path, _options) => {
      const err = Object.assign(new Error('ENOENT: no such file or directory, open CLAUDE.md'), {
        code: 'ENOENT',
      })
      throw err
    })

    const result = await populateProjectContext()

    // All 5 packs were attempted
    expect(result.attempted).toBe(5)
    // CLAUDE.md read threw ENOENT — project-conventions pack counted as failed
    expect(result.failed).toBe(1)
    expect(result.succeeded).toBe(4)

    // Confirm 4 rows actually written to DB — not the one with missing source doc
    const rows = await db
      .select({ packKey: contextPacks.packKey })
      .from(contextPacks)
      .where(inArray(contextPacks.packKey, EXPECTED_PACK_KEYS))

    expect(rows).toHaveLength(4)
    const writtenKeys = rows.map(r => r.packKey).sort()
    expect(writtenKeys).not.toContain('project-conventions')
    expect(writtenKeys).toContain('tech-stack-backend')
    expect(writtenKeys).toContain('tech-stack-frontend')
    expect(writtenKeys).toContain('tech-stack-monorepo')
    expect(writtenKeys).toContain('testing-strategy')
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
