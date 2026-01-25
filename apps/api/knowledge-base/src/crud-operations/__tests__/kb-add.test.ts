/**
 * Tests for kb_add operation
 *
 * @see KNOW-003 AC1 for acceptance criteria
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { eq } from 'drizzle-orm'
import { ZodError } from 'zod'
import { kb_add } from '../kb-add.js'
import { getDbClient, closeDbClient } from '../../db/client.js'
import { knowledgeEntries } from '../../db/schema.js'
import {
  createMockEmbeddingClient,
  sampleEntries,
  generateContentOfLength,
} from './test-helpers.js'
import { MAX_CONTENT_LENGTH } from '../schemas.js'

describe('kb_add', () => {
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

  // Cleanup connection after all tests
  afterEach(async () => {
    // Keep connection open for test reuse
  })

  describe('happy path', () => {
    it('should add knowledge entry and return UUID', async () => {
      const embeddingClient = createMockEmbeddingClient()

      const id = await kb_add(sampleEntries.dev1, { db, embeddingClient })
      createdIds.push(id)

      // Validate UUID format
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)

      // Verify entry exists in database
      const result = await db
        .select()
        .from(knowledgeEntries)
        .where(eq(knowledgeEntries.id, id))

      expect(result).toHaveLength(1)
      expect(result[0].content).toBe(sampleEntries.dev1.content)
      expect(result[0].role).toBe(sampleEntries.dev1.role)
      expect(result[0].tags).toEqual(sampleEntries.dev1.tags)
    })

    it('should generate embedding before database insert', async () => {
      const embeddingClient = createMockEmbeddingClient()

      const id = await kb_add(sampleEntries.dev1, { db, embeddingClient })
      createdIds.push(id)

      // Verify generateEmbedding was called
      expect(embeddingClient.generateEmbedding).toHaveBeenCalledWith(sampleEntries.dev1.content)
      expect(embeddingClient.generateEmbedding).toHaveBeenCalledTimes(1)

      // Verify embedding was stored
      const result = await db
        .select()
        .from(knowledgeEntries)
        .where(eq(knowledgeEntries.id, id))

      expect(result[0].embedding).toHaveLength(1536)
    })

    it('should set createdAt and updatedAt timestamps', async () => {
      const embeddingClient = createMockEmbeddingClient()
      const before = new Date()

      const id = await kb_add(sampleEntries.dev1, { db, embeddingClient })
      createdIds.push(id)

      const after = new Date()

      const result = await db
        .select()
        .from(knowledgeEntries)
        .where(eq(knowledgeEntries.id, id))

      expect(result[0].createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(result[0].createdAt.getTime()).toBeLessThanOrEqual(after.getTime())
      expect(result[0].updatedAt.getTime()).toBe(result[0].createdAt.getTime())
    })

    it('should handle null tags', async () => {
      const embeddingClient = createMockEmbeddingClient()

      const id = await kb_add(sampleEntries.noTags, { db, embeddingClient })
      createdIds.push(id)

      const result = await db
        .select()
        .from(knowledgeEntries)
        .where(eq(knowledgeEntries.id, id))

      expect(result[0].tags).toBeNull()
    })

    it('should handle empty tags array', async () => {
      const embeddingClient = createMockEmbeddingClient()

      const id = await kb_add(sampleEntries.emptyTags, { db, embeddingClient })
      createdIds.push(id)

      const result = await db
        .select()
        .from(knowledgeEntries)
        .where(eq(knowledgeEntries.id, id))

      expect(result[0].tags).toEqual([])
    })

    it('should create separate entries for duplicate content', async () => {
      const embeddingClient = createMockEmbeddingClient()

      const id1 = await kb_add(sampleEntries.dev1, { db, embeddingClient })
      createdIds.push(id1)

      const id2 = await kb_add(sampleEntries.dev1, { db, embeddingClient })
      createdIds.push(id2)

      // Different IDs
      expect(id1).not.toBe(id2)

      // Both exist
      const result1 = await db.select().from(knowledgeEntries).where(eq(knowledgeEntries.id, id1))
      const result2 = await db.select().from(knowledgeEntries).where(eq(knowledgeEntries.id, id2))

      expect(result1).toHaveLength(1)
      expect(result2).toHaveLength(1)
    })
  })

  describe('validation errors', () => {
    it('should throw ZodError for empty content', async () => {
      const embeddingClient = createMockEmbeddingClient()

      await expect(
        kb_add({ content: '', role: 'dev', tags: [] }, { db, embeddingClient }),
      ).rejects.toThrow(ZodError)
    })

    it('should throw ZodError for invalid role', async () => {
      const embeddingClient = createMockEmbeddingClient()

      await expect(
        kb_add({ content: 'Test', role: 'invalid' as 'dev', tags: [] }, { db, embeddingClient }),
      ).rejects.toThrow(ZodError)
    })

    it('should throw ZodError for content exceeding max length', async () => {
      const embeddingClient = createMockEmbeddingClient()
      const longContent = generateContentOfLength(MAX_CONTENT_LENGTH + 1)

      await expect(
        kb_add({ content: longContent, role: 'dev', tags: [] }, { db, embeddingClient }),
      ).rejects.toThrow(ZodError)
    })

    it('should accept content at max length', async () => {
      const embeddingClient = createMockEmbeddingClient()
      const maxContent = generateContentOfLength(MAX_CONTENT_LENGTH)

      const id = await kb_add({ content: maxContent, role: 'dev', tags: [] }, { db, embeddingClient })
      createdIds.push(id)

      expect(id).toBeDefined()
    })
  })

  describe('error handling', () => {
    it('should not create entry if embedding generation fails', async () => {
      const embeddingClient = createMockEmbeddingClient({
        shouldFail: true,
        errorMessage: 'OpenAI API error',
      })

      // Use unique content to track this specific test
      const uniqueContent = `Test content for error case - ${Date.now()}`

      await expect(
        kb_add({ content: uniqueContent, role: 'dev', tags: ['test'] }, { db, embeddingClient }),
      ).rejects.toThrow('OpenAI API error')

      // Verify the specific entry was not created
      const result = await db
        .select()
        .from(knowledgeEntries)
        .where(eq(knowledgeEntries.content, uniqueContent))

      expect(result.length).toBe(0)
    })
  })
})
