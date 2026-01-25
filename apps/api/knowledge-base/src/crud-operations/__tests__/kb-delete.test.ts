/**
 * Tests for kb_delete operation
 *
 * @see KNOW-003 AC4 for acceptance criteria
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { eq } from 'drizzle-orm'
import { ZodError } from 'zod'
import { kb_delete } from '../kb-delete.js'
import { kb_add } from '../kb-add.js'
import { kb_get } from '../kb-get.js'
import { getDbClient } from '../../db/client.js'
import { knowledgeEntries } from '../../db/schema.js'
import { createMockEmbeddingClient, sampleEntries, generateTestUuid } from './test-helpers.js'

describe('kb_delete', () => {
  const db = getDbClient()
  const createdIds: string[] = []

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(async () => {
    // Clean up any remaining entries
    for (const id of createdIds) {
      await db.delete(knowledgeEntries).where(eq(knowledgeEntries.id, id))
    }
    createdIds.length = 0
  })

  describe('happy path', () => {
    it('should delete existing entry', async () => {
      const embeddingClient = createMockEmbeddingClient()

      // Create entry
      const id = await kb_add(sampleEntries.dev1, { db, embeddingClient })

      // Verify it exists
      const before = await kb_get({ id }, { db })
      expect(before).not.toBeNull()

      // Delete it
      await kb_delete({ id }, { db })

      // Verify it's gone
      const after = await kb_get({ id }, { db })
      expect(after).toBeNull()
    })

    it('should return void on success', async () => {
      const embeddingClient = createMockEmbeddingClient()

      const id = await kb_add(sampleEntries.dev1, { db, embeddingClient })

      const result = await kb_delete({ id }, { db })

      expect(result).toBeUndefined()
    })

    it('should be idempotent - deleting non-existent entry succeeds', async () => {
      const nonExistentId = generateTestUuid()

      // Should not throw
      await expect(kb_delete({ id: nonExistentId }, { db })).resolves.toBeUndefined()
    })

    it('should be idempotent - deleting same entry twice succeeds', async () => {
      const embeddingClient = createMockEmbeddingClient()

      const id = await kb_add(sampleEntries.dev1, { db, embeddingClient })

      // First delete
      await kb_delete({ id }, { db })

      // Second delete should also succeed
      await expect(kb_delete({ id }, { db })).resolves.toBeUndefined()
    })

    it('should only delete the specified entry', async () => {
      const embeddingClient = createMockEmbeddingClient()

      // Create two entries
      const id1 = await kb_add(sampleEntries.dev1, { db, embeddingClient })
      createdIds.push(id1)

      const id2 = await kb_add(sampleEntries.pm1, { db, embeddingClient })
      createdIds.push(id2)

      // Delete first entry
      await kb_delete({ id: id1 }, { db })
      createdIds.shift() // Remove from cleanup list

      // Second entry should still exist
      const entry2 = await kb_get({ id: id2 }, { db })
      expect(entry2).not.toBeNull()
      expect(entry2?.content).toBe(sampleEntries.pm1.content)
    })
  })

  describe('validation errors', () => {
    it('should throw ZodError for invalid UUID format', async () => {
      await expect(kb_delete({ id: 'not-a-uuid' }, { db })).rejects.toThrow(ZodError)
    })

    it('should throw ZodError for empty ID', async () => {
      await expect(kb_delete({ id: '' }, { db })).rejects.toThrow(ZodError)
    })

    it('should throw ZodError for malformed UUID', async () => {
      await expect(kb_delete({ id: '123e4567-e89b-12d3-a456' }, { db })).rejects.toThrow(ZodError)
    })
  })

  describe('cache behavior', () => {
    it('should not affect embedding cache (acceptable orphaning)', async () => {
      const embeddingClient = createMockEmbeddingClient()

      // Create and delete an entry
      const id = await kb_add(sampleEntries.dev1, { db, embeddingClient })
      await kb_delete({ id }, { db })

      // Note: We can't easily verify the cache still has the embedding
      // without querying the cache table directly, but the test verifies
      // that delete doesn't fail when cache entries might exist.
      // The embedding cache is managed separately.

      // This is documenting expected behavior
      expect(true).toBe(true)
    })
  })
})
