/**
 * Unit Tests for Context Cache Get Tool
 * WINT-0100 AC-1: Retrieve cached context by pack type and key
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { db } from '@repo/db'
import { contextPacks } from '@repo/database-schema'
import { sql } from 'drizzle-orm'
import { contextCacheGet } from '../context-cache-get.js'
import { contextCachePut } from '../context-cache-put.js'

describe('contextCacheGet', () => {
  // Clean up database before and after each test
  beforeEach(async () => {
    await db.delete(contextPacks)
  })

  afterEach(async () => {
    await db.delete(contextPacks)
  })

  it('should return cached pack on cache hit and increment hitCount', async () => {
    // Arrange: Create a context pack
    const putResult = await contextCachePut({
      packType: 'codebase',
      packKey: 'main',
      content: { summary: 'Test codebase summary' },
      ttl: 3600, // 1 hour
    })

    expect(putResult).not.toBeNull()
    expect(putResult?.hitCount).toBe(0)

    // Act: Retrieve the pack
    const result = await contextCacheGet({
      packType: 'codebase',
      packKey: 'main',
    })

    // Assert: Pack returned and hitCount incremented
    expect(result).not.toBeNull()
    expect(result?.packType).toBe('codebase')
    expect(result?.packKey).toBe('main')
    expect(result?.content).toEqual({ summary: 'Test codebase summary' })
    expect(result?.hitCount).toBe(1)
    expect(result?.lastHitAt).not.toBeNull()
  })

  it('should return null on cache miss (pack not found)', async () => {
    // Act: Try to retrieve non-existent pack
    const result = await contextCacheGet({
      packType: 'story',
      packKey: 'WINT-9999',
    })

    // Assert: Null returned
    expect(result).toBeNull()
  })

  it('should return null for expired pack and not increment hitCount', async () => {
    // Arrange: Create an already-expired pack
    await db.insert(contextPacks).values({
      packType: 'test_patterns',
      packKey: 'vitest',
      content: { patterns: ['test pattern'] },
      version: 1,
      expiresAt: sql`NOW() - INTERVAL '1 hour'`, // Expired 1 hour ago
      hitCount: 0,
    })

    // Act: Try to retrieve expired pack
    const result = await contextCacheGet({
      packType: 'test_patterns',
      packKey: 'vitest',
    })

    // Assert: Null returned (expired)
    expect(result).toBeNull()

    // Verify hitCount was NOT incremented
    const [pack] = await db
      .select()
      .from(contextPacks)
      .where(sql`pack_type = 'test_patterns' AND pack_key = 'vitest'`)

    expect(pack.hitCount).toBe(0)
  })

  it('should handle concurrent get requests with atomic hitCount increment', async () => {
    // Arrange: Create a context pack
    await contextCachePut({
      packType: 'architecture',
      packKey: 'auth-system',
      content: { decisions: ['JWT tokens', 'OAuth2'] },
      ttl: 3600,
    })

    // Act: Concurrent get requests (10 parallel calls)
    const promises = Array.from({ length: 10 }, () =>
      contextCacheGet({
        packType: 'architecture',
        packKey: 'auth-system',
      }),
    )

    const results = await Promise.all(promises)

    // Assert: All requests succeeded
    results.forEach(result => {
      expect(result).not.toBeNull()
      expect(result?.packType).toBe('architecture')
    })

    // Verify final hitCount is exactly 10 (atomic increment)
    const [finalPack] = await db
      .select()
      .from(contextPacks)
      .where(sql`pack_type = 'architecture' AND pack_key = 'auth-system'`)

    expect(finalPack.hitCount).toBe(10)
  })
})
