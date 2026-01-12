import { describe, it, expect } from 'vitest'
import { randomUUID } from 'node:crypto'

import { getDbAsync } from '@/core/database/client'
import { sets, setImages } from '@/core/database/schema'

/**
 * Integration tests for Sets database schema & cascade behavior.
 *
 * These tests are intentionally lightweight and only run when a Postgres
 * connection is available via POSTGRES_* env vars. They validate that:
 * - We can insert a Set with all major fields
 * - We can insert related SetImages rows
 * - Deleting the Set cascades and removes related SetImages rows
 *
 * NOTE: Migrations must already have been applied (pnpm db:migrate).
 */

const hasDbEnv = Boolean(process.env.POSTGRES_HOST && process.env.POSTGRES_DATABASE)

(hasDbEnv ? describe : describe.skip)('Sets database schema integration', () => {
  it('inserts a set with images and cascades delete', async () => {
    const db = await getDbAsync()

    // Use a random UUID so we never clash with real data
    const setId = randomUUID()

    // 1) Insert a test set row
    const [insertedSet] = await db
      .insert(sets)
      .values({
        id: setId,
        userId: 'test-user-sets-integration',
        title: 'Integration Test Set',
        setNumber: '99999',
        store: 'LEGO',
        sourceUrl: 'https://example.com/set/99999',
        pieceCount: 1234,
        theme: 'Test Theme',
        tags: ['test', 'integration'],
        notes: 'Inserted by sets-database.integration.test.ts',
        isBuilt: false,
        quantity: 1,
      })
      .returning()

    expect(insertedSet.id).toBe(setId)
    expect(insertedSet.title).toBe('Integration Test Set')

    // 2) Insert two related images
    const [img1, img2] = await db
      .insert(setImages)
      .values([
        {
          setId,
          imageUrl: 'https://example.com/images/set-99999-1.jpg',
          thumbnailUrl: 'https://example.com/images/set-99999-1-thumb.jpg',
          position: 0,
        },
        {
          setId,
          imageUrl: 'https://example.com/images/set-99999-2.jpg',
          thumbnailUrl: 'https://example.com/images/set-99999-2-thumb.jpg',
          position: 1,
        },
      ])
      .returning()

    expect(img1.setId).toBe(setId)
    expect(img2.setId).toBe(setId)

    // 3) Verify images exist
    const imagesBeforeDelete = await db
      .select()
      .from(setImages)
      .where(setImages.setId.eq(setId))

    expect(imagesBeforeDelete).toHaveLength(2)

    // 4) Delete the set and ensure ON DELETE CASCADE removes images
    await db.delete(sets).where(sets.id.eq(setId))

    const imagesAfterDelete = await db
      .select()
      .from(setImages)
      .where(setImages.setId.eq(setId))

    expect(imagesAfterDelete).toHaveLength(0)
  })
})
