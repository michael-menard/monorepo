/**
 * Tests for kb_get operation
 *
 * @see KNOW-003 AC2 for acceptance criteria
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { eq } from 'drizzle-orm'
import { ZodError } from 'zod'
import { kb_get } from '../kb-get.js'
import { kb_add } from '../kb-add.js'
import { getDbClient } from '../../db/client.js'
import { knowledgeEntries } from '../../db/schema.js'
import { createMockEmbeddingClient, sampleEntries, generateTestUuid } from './test-helpers.js'

describe('kb_get', () => {
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
    it('should retrieve existing entry by ID', async () => {
      const embeddingClient = createMockEmbeddingClient()

      // Create an entry first
      const id = await kb_add(sampleEntries.dev1, { db, embeddingClient })
      createdIds.push(id)

      // Get the entry
      const entry = await kb_get({ id }, { db })

      expect(entry).not.toBeNull()
      expect(entry?.id).toBe(id)
      expect(entry?.content).toBe(sampleEntries.dev1.content)
      expect(entry?.role).toBe(sampleEntries.dev1.role)
      expect(entry?.tags).toEqual(sampleEntries.dev1.tags)
    })

    it('should include embedding vector in result', async () => {
      const embeddingClient = createMockEmbeddingClient()

      const id = await kb_add(sampleEntries.dev1, { db, embeddingClient })
      createdIds.push(id)

      const entry = await kb_get({ id }, { db })

      expect(entry?.embedding).toBeDefined()
      expect(entry?.embedding).toHaveLength(1536)
    })

    it('should return null for non-existent entry', async () => {
      const nonExistentId = generateTestUuid()

      const entry = await kb_get({ id: nonExistentId }, { db })

      expect(entry).toBeNull()
    })

    it('should include timestamps in result', async () => {
      const embeddingClient = createMockEmbeddingClient()

      const id = await kb_add(sampleEntries.dev1, { db, embeddingClient })
      createdIds.push(id)

      const entry = await kb_get({ id }, { db })

      expect(entry?.createdAt).toBeInstanceOf(Date)
      expect(entry?.updatedAt).toBeInstanceOf(Date)
    })

    it('should handle entry with null tags', async () => {
      const embeddingClient = createMockEmbeddingClient()

      const id = await kb_add(sampleEntries.noTags, { db, embeddingClient })
      createdIds.push(id)

      const entry = await kb_get({ id }, { db })

      expect(entry?.tags).toBeNull()
    })

    it('should handle entry with empty tags array', async () => {
      const embeddingClient = createMockEmbeddingClient()

      const id = await kb_add(sampleEntries.emptyTags, { db, embeddingClient })
      createdIds.push(id)

      const entry = await kb_get({ id }, { db })

      expect(entry?.tags).toEqual([])
    })
  })

  describe('validation errors', () => {
    it('should throw ZodError for invalid UUID format', async () => {
      await expect(kb_get({ id: 'not-a-uuid' }, { db })).rejects.toThrow(ZodError)
    })

    it('should throw ZodError for empty ID', async () => {
      await expect(kb_get({ id: '' }, { db })).rejects.toThrow(ZodError)
    })

    it('should throw ZodError for malformed UUID', async () => {
      // Missing a section
      await expect(kb_get({ id: '123e4567-e89b-12d3-a456' }, { db })).rejects.toThrow(ZodError)
    })
  })
})
