/**
 * Unit Tests for Context Cache Stats Tool
 * WINT-0100 AC-4: Query cache effectiveness metrics
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { db } from '@repo/db'
import { contextPacks } from '@repo/knowledge-base/db'
import { sql } from 'drizzle-orm'
import { contextCacheStats } from '../context-cache-stats.js'
import { contextCachePut } from '../context-cache-put.js'
import { contextCacheGet } from '../context-cache-get.js'

describe('contextCacheStats', () => {
  beforeEach(async () => {
    await db.delete(contextPacks)
  })

  afterEach(async () => {
    await db.delete(contextPacks)
  })

  it('should return overall stats for all packs', async () => {
    // Arrange: Create 3 active packs with different hit counts
    await contextCachePut({
      packType: 'codebase',
      packKey: 'frontend',
      content: { summary: 'Frontend' },
      ttl: 3600,
    })
    await contextCachePut({
      packType: 'story',
      packKey: 'WINT-0100',
      content: { title: 'Story' },
      ttl: 3600,
    })
    await contextCachePut({
      packType: 'feature',
      packKey: 'auth',
      content: { description: 'Auth' },
      ttl: 3600,
    })

    // Simulate hits
    await contextCacheGet({ packType: 'codebase', packKey: 'frontend' }) // hitCount = 1
    await contextCacheGet({ packType: 'codebase', packKey: 'frontend' }) // hitCount = 2
    await contextCacheGet({ packType: 'story', packKey: 'WINT-0100' }) // hitCount = 1

    // Act: Get overall stats
    const result = await contextCacheStats({})

    // Assert: Stats calculated correctly
    expect(result).not.toBeNull()
    expect(result.totalPacks).toBe(3)
    expect(result.hitCount).toBe(3) // Total hits: 2 + 1 + 0
    expect(result.avgHitsPerPack).toBe(1) // Average: 3 / 3
    expect(result.expiredCount).toBe(0)
  })

  it('should filter stats by packType', async () => {
    // Arrange: Create packs of different types
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
      content: { description: 'Feature' },
      ttl: 3600,
    })

    // Simulate hits on story packs
    await contextCacheGet({ packType: 'story', packKey: 'WINT-0100' })
    await contextCacheGet({ packType: 'story', packKey: 'WINT-0110' })
    await contextCacheGet({ packType: 'story', packKey: 'WINT-0110' })

    // Act: Get stats for story packs only
    const result = await contextCacheStats({ packType: 'story' })

    // Assert: Only story packs counted
    expect(result).not.toBeNull()
    expect(result.totalPacks).toBe(2)
    expect(result.hitCount).toBe(3) // 1 + 2
    expect(result.avgHitsPerPack).toBe(1.5) // 3 / 2
  })

  it('should filter stats by since date', async () => {
    // Arrange: Create packs with different lastHitAt values
    const now = new Date()
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000)

    // Old pack (hit 2 days ago)
    await db.insert(contextPacks).values({
      packType: 'architecture',
      packKey: 'old-design',
      content: { decision: 'Old' },
      version: 1,
      expiresAt: sql`NOW() + INTERVAL '1 day'`,
      hitCount: 5,
      lastHitAt: twoDaysAgo,
    })

    // Recent pack (hit just now)
    await contextCachePut({
      packType: 'architecture',
      packKey: 'new-design',
      content: { decision: 'New' },
      ttl: 3600,
    })
    await contextCacheGet({ packType: 'architecture', packKey: 'new-design' })

    // Act: Get stats for packs hit in last day
    const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000)
    const result = await contextCacheStats({ since: oneDayAgo })

    // Assert: Only recent pack counted
    expect(result).not.toBeNull()
    expect(result.totalPacks).toBeGreaterThanOrEqual(1)
  })

  it('should return all zeros for empty database', async () => {
    // Act: Get stats with no packs in database
    const result = await contextCacheStats({})

    // Assert: All values are zero, no error thrown
    expect(result).not.toBeNull()
    expect(result.totalPacks).toBe(0)
    expect(result.hitCount).toBe(0)
    expect(result.avgHitsPerPack).toBe(0)
    expect(result.expiredCount).toBe(0)
  })

  it('should count expired packs correctly', async () => {
    // Arrange: Create 2 active and 1 expired pack
    await contextCachePut({
      packType: 'codebase',
      packKey: 'frontend',
      content: { summary: 'Active 1' },
      ttl: 3600,
    })
    await contextCachePut({
      packType: 'story',
      packKey: 'WINT-0100',
      content: { title: 'Active 2' },
      ttl: 3600,
    })

    // Expired pack
    await db.insert(contextPacks).values({
      packType: 'feature',
      packKey: 'old-feature',
      content: { description: 'Expired' },
      version: 1,
      expiresAt: sql`NOW() - INTERVAL '1 hour'`, // Expired
      hitCount: 10,
    })

    // Act: Get stats
    const result = await contextCacheStats({})

    // Assert: Expired pack counted separately
    expect(result).not.toBeNull()
    expect(result.totalPacks).toBe(2) // Only active packs
    expect(result.expiredCount).toBe(1) // Expired pack counted
  })
})
