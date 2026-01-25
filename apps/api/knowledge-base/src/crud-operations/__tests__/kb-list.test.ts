/**
 * Tests for kb_list operation
 *
 * @see KNOW-003 AC5 for acceptance criteria
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { eq } from 'drizzle-orm'
import { ZodError } from 'zod'
import { kb_list } from '../kb-list.js'
import { kb_add } from '../kb-add.js'
import { getDbClient } from '../../db/client.js'
import { knowledgeEntries } from '../../db/schema.js'
import { createMockEmbeddingClient, sampleEntries, delay } from './test-helpers.js'

describe('kb_list', () => {
  const db = getDbClient()
  const createdIds: string[] = []

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(async () => {
    // Clean up created entries
    for (const id of createdIds) {
      await db.delete(knowledgeEntries).where(eq(knowledgeEntries.id, id))
    }
    createdIds.length = 0
  })

  describe('happy path', () => {
    it('should list all entries with default limit', async () => {
      const embeddingClient = createMockEmbeddingClient()

      // Create a few entries
      const id1 = await kb_add(sampleEntries.dev1, { db, embeddingClient })
      createdIds.push(id1)

      const id2 = await kb_add(sampleEntries.pm1, { db, embeddingClient })
      createdIds.push(id2)

      const entries = await kb_list(undefined, { db })

      expect(entries.length).toBeGreaterThanOrEqual(2)
      expect(entries.some(e => e.id === id1)).toBe(true)
      expect(entries.some(e => e.id === id2)).toBe(true)
    })

    it('should filter by role', async () => {
      const embeddingClient = createMockEmbeddingClient()

      const devId = await kb_add(sampleEntries.dev1, { db, embeddingClient })
      createdIds.push(devId)

      const pmId = await kb_add(sampleEntries.pm1, { db, embeddingClient })
      createdIds.push(pmId)

      const devEntries = await kb_list({ role: 'dev' }, { db })

      expect(devEntries.some(e => e.id === devId)).toBe(true)
      expect(devEntries.some(e => e.id === pmId)).toBe(false)
      expect(devEntries.every(e => e.role === 'dev')).toBe(true)
    })

    it('should filter by tags (ANY match semantics)', async () => {
      const embeddingClient = createMockEmbeddingClient()

      // dev1 has tags: ['typescript', 'validation', 'best-practice']
      // pm1 has tags: ['process', 'stories']
      const devId = await kb_add(sampleEntries.dev1, { db, embeddingClient })
      createdIds.push(devId)

      const pmId = await kb_add(sampleEntries.pm1, { db, embeddingClient })
      createdIds.push(pmId)

      // Filter by 'typescript' should only return dev1
      const typescriptEntries = await kb_list({ tags: ['typescript'] }, { db })
      expect(typescriptEntries.some(e => e.id === devId)).toBe(true)
      expect(typescriptEntries.some(e => e.id === pmId)).toBe(false)

      // Filter by 'process' should only return pm1
      const processEntries = await kb_list({ tags: ['process'] }, { db })
      expect(processEntries.some(e => e.id === pmId)).toBe(true)
      expect(processEntries.some(e => e.id === devId)).toBe(false)
    })

    it('should match entries with ANY of the filter tags (OR logic)', async () => {
      const embeddingClient = createMockEmbeddingClient()

      const devId = await kb_add(sampleEntries.dev1, { db, embeddingClient })
      createdIds.push(devId)

      const pmId = await kb_add(sampleEntries.pm1, { db, embeddingClient })
      createdIds.push(pmId)

      // Filter by both 'typescript' and 'process' should return both entries
      const entries = await kb_list({ tags: ['typescript', 'process'] }, { db })

      expect(entries.some(e => e.id === devId)).toBe(true)
      expect(entries.some(e => e.id === pmId)).toBe(true)
    })

    it('should combine role and tags filters (AND logic)', async () => {
      const embeddingClient = createMockEmbeddingClient()

      const devId = await kb_add(sampleEntries.dev1, { db, embeddingClient })
      createdIds.push(devId)

      const pmId = await kb_add(sampleEntries.pm1, { db, embeddingClient })
      createdIds.push(pmId)

      // dev1 has 'best-practice' tag
      // Filter by role='dev' AND tags=['best-practice']
      const entries = await kb_list({ role: 'dev', tags: ['best-practice'] }, { db })

      expect(entries.some(e => e.id === devId)).toBe(true)
      expect(entries.some(e => e.id === pmId)).toBe(false)
    })

    it('should order by createdAt DESC (newest first)', async () => {
      const embeddingClient = createMockEmbeddingClient()

      const id1 = await kb_add(sampleEntries.dev1, { db, embeddingClient })
      createdIds.push(id1)

      await delay(10) // Small delay to ensure different timestamps

      const id2 = await kb_add(sampleEntries.pm1, { db, embeddingClient })
      createdIds.push(id2)

      const entries = await kb_list(undefined, { db })

      // Find positions of our entries
      const pos1 = entries.findIndex(e => e.id === id1)
      const pos2 = entries.findIndex(e => e.id === id2)

      // id2 (newer) should come before id1 (older)
      expect(pos2).toBeLessThan(pos1)
    })

    it('should respect limit parameter', async () => {
      const embeddingClient = createMockEmbeddingClient()

      // Create 3 entries
      for (let i = 0; i < 3; i++) {
        const id = await kb_add(
          { content: `Test ${i}`, role: 'dev', tags: ['test'] },
          { db, embeddingClient },
        )
        createdIds.push(id)
      }

      const entries = await kb_list({ limit: 2 }, { db })

      expect(entries.length).toBeLessThanOrEqual(2)
    })

    it('should enforce maximum limit of 100', async () => {
      // We can't easily test this without creating 100+ entries,
      // so we just verify the schema accepts 100 but rejects 101
      const result = await kb_list({ limit: 100 }, { db })
      expect(Array.isArray(result)).toBe(true)
    })

    it('should return empty array when no matches', async () => {
      // Filter for a role that likely has no entries in our test set
      const entries = await kb_list({ role: 'qa', tags: ['nonexistent-tag'] }, { db })

      // Even if empty, should be an array
      expect(Array.isArray(entries)).toBe(true)
    })

    it('should return all entries when no filters provided', async () => {
      const embeddingClient = createMockEmbeddingClient()

      const id1 = await kb_add(sampleEntries.dev1, { db, embeddingClient })
      createdIds.push(id1)

      const id2 = await kb_add(sampleEntries.pm1, { db, embeddingClient })
      createdIds.push(id2)

      const entries = await kb_list({}, { db })

      expect(entries.some(e => e.id === id1)).toBe(true)
      expect(entries.some(e => e.id === id2)).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('should handle entries with null tags', async () => {
      const embeddingClient = createMockEmbeddingClient()

      const id = await kb_add(sampleEntries.noTags, { db, embeddingClient })
      createdIds.push(id)

      // Should still be listable without tag filter
      const entries = await kb_list({ role: 'dev' }, { db })
      expect(entries.some(e => e.id === id)).toBe(true)
    })

    it('should not match null tags when filtering by tags', async () => {
      const embeddingClient = createMockEmbeddingClient()

      const id = await kb_add(sampleEntries.noTags, { db, embeddingClient })
      createdIds.push(id)

      // Entry with null tags should not match a tag filter
      const entries = await kb_list({ tags: ['some-tag'] }, { db })
      expect(entries.some(e => e.id === id)).toBe(false)
    })

    it('should handle entries with empty tags array', async () => {
      const embeddingClient = createMockEmbeddingClient()

      const id = await kb_add(sampleEntries.emptyTags, { db, embeddingClient })
      createdIds.push(id)

      // Should be listable without tag filter
      const entries = await kb_list({ role: 'dev' }, { db })
      expect(entries.some(e => e.id === id)).toBe(true)

      // Should not match when filtering by tags
      const taggedEntries = await kb_list({ tags: ['some-tag'] }, { db })
      expect(taggedEntries.some(e => e.id === id)).toBe(false)
    })
  })

  describe('validation errors', () => {
    it('should throw ZodError for limit exceeding 100', async () => {
      await expect(kb_list({ limit: 101 }, { db })).rejects.toThrow(ZodError)
    })

    it('should throw ZodError for negative limit', async () => {
      await expect(kb_list({ limit: -1 }, { db })).rejects.toThrow(ZodError)
    })

    it('should throw ZodError for zero limit', async () => {
      await expect(kb_list({ limit: 0 }, { db })).rejects.toThrow(ZodError)
    })

    it('should throw ZodError for invalid role', async () => {
      await expect(kb_list({ role: 'invalid' as 'dev' }, { db })).rejects.toThrow(ZodError)
    })
  })

  describe('dependency handling', () => {
    it('should throw error when deps is undefined', async () => {
      await expect(kb_list({})).rejects.toThrow('Database dependency is required')
    })
  })
})
