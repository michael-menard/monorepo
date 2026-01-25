/**
 * Tests for kb_update operation
 *
 * @see KNOW-003 AC3 for acceptance criteria
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { eq } from 'drizzle-orm'
import { ZodError } from 'zod'
import { kb_update } from '../kb-update.js'
import { kb_add } from '../kb-add.js'
import { kb_get } from '../kb-get.js'
import { NotFoundError, isNotFoundError } from '../errors.js'
import { getDbClient } from '../../db/client.js'
import { knowledgeEntries } from '../../db/schema.js'
import {
  createMockEmbeddingClient,
  sampleEntries,
  generateTestUuid,
  generateContentOfLength,
  delay,
} from './test-helpers.js'
import { MAX_CONTENT_LENGTH } from '../schemas.js'

describe('kb_update', () => {
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
    it('should update content and generate new embedding', async () => {
      const embeddingClient = createMockEmbeddingClient()

      // Create entry
      const id = await kb_add(sampleEntries.dev1, { db, embeddingClient })
      createdIds.push(id)

      // Update content
      const newContent = 'Updated content for testing'
      const updated = await kb_update({ id, content: newContent }, { db, embeddingClient })

      expect(updated.content).toBe(newContent)
      expect(embeddingClient.generateEmbedding).toHaveBeenCalledTimes(2) // Once for add, once for update
    })

    it('should update role without re-embedding', async () => {
      const embeddingClient = createMockEmbeddingClient()

      const id = await kb_add(sampleEntries.dev1, { db, embeddingClient })
      createdIds.push(id)

      // Clear mock to track new calls
      vi.mocked(embeddingClient.generateEmbedding).mockClear()

      const updated = await kb_update({ id, role: 'qa' }, { db, embeddingClient })

      expect(updated.role).toBe('qa')
      expect(embeddingClient.generateEmbedding).not.toHaveBeenCalled()
    })

    it('should update tags without re-embedding', async () => {
      const embeddingClient = createMockEmbeddingClient()

      const id = await kb_add(sampleEntries.dev1, { db, embeddingClient })
      createdIds.push(id)

      vi.mocked(embeddingClient.generateEmbedding).mockClear()

      const updated = await kb_update({ id, tags: ['new-tag'] }, { db, embeddingClient })

      expect(updated.tags).toEqual(['new-tag'])
      expect(embeddingClient.generateEmbedding).not.toHaveBeenCalled()
    })

    it('should skip re-embedding if content is identical', async () => {
      const embeddingClient = createMockEmbeddingClient()

      const id = await kb_add(sampleEntries.dev1, { db, embeddingClient })
      createdIds.push(id)

      vi.mocked(embeddingClient.generateEmbedding).mockClear()

      // Update with same content
      const updated = await kb_update(
        { id, content: sampleEntries.dev1.content },
        { db, embeddingClient },
      )

      expect(updated.content).toBe(sampleEntries.dev1.content)
      expect(embeddingClient.generateEmbedding).not.toHaveBeenCalled()
    })

    it('should update updatedAt timestamp', async () => {
      const embeddingClient = createMockEmbeddingClient()

      const id = await kb_add(sampleEntries.dev1, { db, embeddingClient })
      createdIds.push(id)

      const original = await kb_get({ id }, { db })
      const originalUpdatedAt = original!.updatedAt

      // Small delay to ensure timestamp difference
      await delay(10)

      const updated = await kb_update({ id, role: 'qa' }, { db, embeddingClient })

      expect(updated.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime())
    })

    it('should preserve createdAt timestamp', async () => {
      const embeddingClient = createMockEmbeddingClient()

      const id = await kb_add(sampleEntries.dev1, { db, embeddingClient })
      createdIds.push(id)

      const original = await kb_get({ id }, { db })
      const originalCreatedAt = original!.createdAt

      await delay(10)

      const updated = await kb_update({ id, content: 'New content' }, { db, embeddingClient })

      expect(updated.createdAt.getTime()).toBe(originalCreatedAt.getTime())
    })

    it('should set tags to null when explicitly passed', async () => {
      const embeddingClient = createMockEmbeddingClient()

      const id = await kb_add(sampleEntries.dev1, { db, embeddingClient })
      createdIds.push(id)

      const updated = await kb_update({ id, tags: null }, { db, embeddingClient })

      expect(updated.tags).toBeNull()
    })

    it('should support updating multiple fields at once', async () => {
      const embeddingClient = createMockEmbeddingClient()

      const id = await kb_add(sampleEntries.dev1, { db, embeddingClient })
      createdIds.push(id)

      const updated = await kb_update(
        { id, content: 'New content', role: 'qa', tags: ['new'] },
        { db, embeddingClient },
      )

      expect(updated.content).toBe('New content')
      expect(updated.role).toBe('qa')
      expect(updated.tags).toEqual(['new'])
    })

    it('should return the updated entry object', async () => {
      const embeddingClient = createMockEmbeddingClient()

      const id = await kb_add(sampleEntries.dev1, { db, embeddingClient })
      createdIds.push(id)

      const updated = await kb_update({ id, role: 'pm' }, { db, embeddingClient })

      expect(updated.id).toBe(id)
      expect(updated.role).toBe('pm')
      expect(updated.embedding).toBeDefined()
      expect(updated.createdAt).toBeDefined()
      expect(updated.updatedAt).toBeDefined()
    })
  })

  describe('not found errors', () => {
    it('should throw NotFoundError for non-existent entry', async () => {
      const embeddingClient = createMockEmbeddingClient()
      const nonExistentId = generateTestUuid()

      await expect(
        kb_update({ id: nonExistentId, content: 'New content' }, { db, embeddingClient }),
      ).rejects.toThrow(NotFoundError)
    })

    it('should throw NotFoundError with correct resource info', async () => {
      const embeddingClient = createMockEmbeddingClient()
      const nonExistentId = generateTestUuid()

      try {
        await kb_update({ id: nonExistentId, content: 'New content' }, { db, embeddingClient })
        expect.fail('Should have thrown')
      } catch (error) {
        expect(isNotFoundError(error)).toBe(true)
        if (isNotFoundError(error)) {
          expect(error.resource).toBe('KnowledgeEntry')
          expect(error.resourceId).toBe(nonExistentId)
        }
      }
    })

    it('should not call embedding API for non-existent entry', async () => {
      const embeddingClient = createMockEmbeddingClient()
      const nonExistentId = generateTestUuid()

      try {
        await kb_update({ id: nonExistentId, content: 'New content' }, { db, embeddingClient })
      } catch {
        // Expected
      }

      expect(embeddingClient.generateEmbedding).not.toHaveBeenCalled()
    })
  })

  describe('validation errors', () => {
    it('should throw ZodError for invalid UUID', async () => {
      const embeddingClient = createMockEmbeddingClient()

      await expect(
        kb_update({ id: 'invalid', content: 'New content' }, { db, embeddingClient }),
      ).rejects.toThrow(ZodError)
    })

    it('should throw ZodError when no fields provided', async () => {
      const embeddingClient = createMockEmbeddingClient()
      const id = generateTestUuid()

      await expect(kb_update({ id } as never, { db, embeddingClient })).rejects.toThrow(ZodError)
    })

    it('should throw ZodError for empty content', async () => {
      const embeddingClient = createMockEmbeddingClient()

      const id = await kb_add(sampleEntries.dev1, { db, embeddingClient })
      createdIds.push(id)

      await expect(
        kb_update({ id, content: '' }, { db, embeddingClient }),
      ).rejects.toThrow(ZodError)
    })

    it('should throw ZodError for content exceeding max length', async () => {
      const embeddingClient = createMockEmbeddingClient()

      const id = await kb_add(sampleEntries.dev1, { db, embeddingClient })
      createdIds.push(id)

      const longContent = generateContentOfLength(MAX_CONTENT_LENGTH + 1)

      await expect(
        kb_update({ id, content: longContent }, { db, embeddingClient }),
      ).rejects.toThrow(ZodError)
    })

    it('should throw ZodError for invalid role', async () => {
      const embeddingClient = createMockEmbeddingClient()

      const id = await kb_add(sampleEntries.dev1, { db, embeddingClient })
      createdIds.push(id)

      await expect(
        kb_update({ id, role: 'invalid' as 'dev' }, { db, embeddingClient }),
      ).rejects.toThrow(ZodError)
    })
  })

  describe('error handling', () => {
    it('should not update if embedding generation fails', async () => {
      const goodClient = createMockEmbeddingClient()
      const badClient = createMockEmbeddingClient({
        shouldFail: true,
        errorMessage: 'API error',
      })

      const id = await kb_add(sampleEntries.dev1, { db, embeddingClient: goodClient })
      createdIds.push(id)

      const original = await kb_get({ id }, { db })

      await expect(
        kb_update({ id, content: 'New content' }, { db, embeddingClient: badClient }),
      ).rejects.toThrow('API error')

      // Verify entry unchanged
      const afterError = await kb_get({ id }, { db })
      expect(afterError?.content).toBe(original?.content)
    })
  })
})
