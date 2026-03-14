/**
 * Unit Tests for Context Cache Invalidate Tool
 * WINT-0100 AC-3: Mark context as expired or delete stale entries
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { db } from '@repo/db'
import { contextPacks } from '@repo/knowledge-base/src/db'
import { sql } from 'drizzle-orm'
import { contextCacheInvalidate } from '../context-cache-invalidate.js'
import { contextCachePut } from '../context-cache-put.js'
import { contextCacheGet } from '../context-cache-get.js'

describe('contextCacheInvalidate', () => {
  beforeEach(async () => {
    await db.delete(contextPacks)
  })

  afterEach(async () => {
    await db.delete(contextPacks)
  })

  it('should soft delete by packType (default behavior)', async () => {
    // Arrange: Create 3 packs with same type
    await contextCachePut({
      packType: 'story',
      packKey: 'WINT-0100',
      content: { title: 'Story 1' },
      ttl: 3600,
    })
    await contextCachePut({
      packType: 'story',
      packKey: 'WINT-0110',
      content: { title: 'Story 2' },
      ttl: 3600,
    })
    await contextCachePut({
      packType: 'feature',
      packKey: 'auth',
      content: { title: 'Feature 1' },
      ttl: 3600,
    })

    // Act: Soft delete all story packs
    const result = await contextCacheInvalidate({
      packType: 'story',
    })

    // Assert: 2 packs invalidated
    expect(result.invalidatedCount).toBe(2)

    // Verify rows still exist (soft delete)
    const allPacks = await db.select().from(contextPacks)
    expect(allPacks).toHaveLength(3)

    // Verify story packs are expired (not retrievable)
    const story1 = await contextCacheGet({ packType: 'story', packKey: 'WINT-0100' })
    const story2 = await contextCacheGet({ packType: 'story', packKey: 'WINT-0110' })
    expect(story1).toBeNull()
    expect(story2).toBeNull()

    // Verify feature pack is still valid
    const feature = await contextCacheGet({ packType: 'feature', packKey: 'auth' })
    expect(feature).not.toBeNull()
  })

  it('should hard delete by packKey (physical removal)', async () => {
    // Arrange: Create 2 packs
    await contextCachePut({
      packType: 'codebase',
      packKey: 'frontend',
      content: { summary: 'Frontend' },
      ttl: 3600,
    })
    await contextCachePut({
      packType: 'codebase',
      packKey: 'backend',
      content: { summary: 'Backend' },
      ttl: 3600,
    })

    // Act: Hard delete specific pack
    const result = await contextCacheInvalidate({
      packType: 'codebase',
      packKey: 'frontend',
      hardDelete: true,
    })

    // Assert: 1 pack deleted
    expect(result.invalidatedCount).toBe(1)

    // Verify row physically removed
    const allPacks = await db.select().from(contextPacks)
    expect(allPacks).toHaveLength(1)
    expect(allPacks[0].packKey).toBe('backend')
  })

  it('should invalidate by age (olderThan filter)', async () => {
    // Arrange: Create packs with different lastHitAt values
    const now = new Date()
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)

    // Old pack (2 days ago)
    await db.insert(contextPacks).values({
      packType: 'architecture',
      packKey: 'old-design',
      content: { decision: 'Old architecture' },
      version: 1,
      expiresAt: sql`NOW() + INTERVAL '1 day'`,
      hitCount: 5,
      lastHitAt: twoDaysAgo,
    })

    // Recent pack (just created, no lastHitAt)
    await contextCachePut({
      packType: 'architecture',
      packKey: 'new-design',
      content: { decision: 'New architecture' },
      ttl: 3600,
    })

    // Act: Invalidate packs older than 1 day
    const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)
    const result = await contextCacheInvalidate({
      olderThan: oneDayAgo,
    })

    // Assert: Only old pack invalidated
    expect(result.invalidatedCount).toBeGreaterThanOrEqual(1)

    // Verify old pack is expired
    const oldPack = await contextCacheGet({ packType: 'architecture', packKey: 'old-design' })
    expect(oldPack).toBeNull()

    // Verify new pack is still valid
    const newPack = await contextCacheGet({ packType: 'architecture', packKey: 'new-design' })
    expect(newPack).not.toBeNull()
  })

  it('should return invalidatedCount: 0 when no matches found', async () => {
    // Arrange: Create pack with different type
    await contextCachePut({
      packType: 'epic',
      packKey: 'WINT',
      content: { description: 'WINT epic' },
      ttl: 3600,
    })

    // Act: Try to invalidate non-existent type
    const result = await contextCacheInvalidate({
      packType: 'lessons_learned',
    })

    // Assert: No packs invalidated, no error thrown
    expect(result.invalidatedCount).toBe(0)
  })

  it('should default to soft delete when hardDelete not specified', async () => {
    // Arrange: Create pack
    await contextCachePut({
      packType: 'test_patterns',
      packKey: 'vitest',
      content: { patterns: ['TDD'] },
      ttl: 3600,
    })

    // Act: Invalidate without specifying hardDelete
    const result = await contextCacheInvalidate({
      packType: 'test_patterns',
      packKey: 'vitest',
    })

    // Assert: Pack invalidated
    expect(result.invalidatedCount).toBe(1)

    // Verify row still exists (soft delete default)
    const allPacks = await db.select().from(contextPacks)
    expect(allPacks).toHaveLength(1)

    // Verify pack is expired
    const pack = await contextCacheGet({ packType: 'test_patterns', packKey: 'vitest' })
    expect(pack).toBeNull()
  })
})
