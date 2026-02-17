/**
 * Unit Tests for Context Cache Put Tool
 * WINT-0100 AC-2: Create or update context pack with content
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { db } from '@repo/db'
import { contextPacks } from '@repo/database-schema'
import { sql } from 'drizzle-orm'
import { contextCachePut } from '../context-cache-put.js'

describe('contextCachePut', () => {
  beforeEach(async () => {
    await db.delete(contextPacks)
  })

  afterEach(async () => {
    await db.delete(contextPacks)
  })

  it('should create new pack on first call', async () => {
    // Act: Create new pack
    const result = await contextCachePut({
      packType: 'codebase',
      packKey: 'frontend',
      content: { summary: 'Frontend codebase', files: [] },
      ttl: 7200, // 2 hours
      version: 1,
    })

    // Assert: Pack created successfully
    expect(result).not.toBeNull()
    expect(result?.packType).toBe('codebase')
    expect(result?.packKey).toBe('frontend')
    expect(result?.content).toEqual({ summary: 'Frontend codebase', files: [] })
    expect(result?.version).toBe(1)
    expect(result?.hitCount).toBe(0) // Initial hitCount is 0
    expect(result?.expiresAt).not.toBeNull()

    // Verify expiresAt is approximately NOW + 7200 seconds
    const now = new Date()
    const expiresAt = new Date(result!.expiresAt!)
    const diffSeconds = (expiresAt.getTime() - now.getTime()) / 1000
    expect(diffSeconds).toBeGreaterThan(7000) // Within 200 seconds tolerance
    expect(diffSeconds).toBeLessThan(7400)
  })

  it('should update existing pack on second call (upsert behavior)', async () => {
    // Arrange: Create initial pack
    const firstResult = await contextCachePut({
      packType: 'story',
      packKey: 'WINT-0100',
      content: { summary: 'Initial content' },
      ttl: 3600,
    })

    expect(firstResult).not.toBeNull()
    const firstId = firstResult!.id

    // Act: Update the same pack
    const secondResult = await contextCachePut({
      packType: 'story',
      packKey: 'WINT-0100',
      content: { summary: 'Updated content', notes: 'New notes' },
      ttl: 7200,
      version: 2,
    })

    // Assert: Same pack updated (same ID)
    expect(secondResult).not.toBeNull()
    expect(secondResult?.id).toBe(firstId)
    expect(secondResult?.content).toEqual({ summary: 'Updated content', notes: 'New notes' })
    expect(secondResult?.version).toBe(2)

    // Verify only one row exists in database
    const allPacks = await db.select().from(contextPacks)
    expect(allPacks).toHaveLength(1)
  })

  it('should use default TTL (7 days) when ttl not provided', async () => {
    // Act: Create pack without specifying ttl
    const result = await contextCachePut({
      packType: 'lessons_learned',
      packKey: 'context-cache',
      content: { lessons: ['Use Zod validation'] },
    })

    // Assert: Default TTL applied (7 days = 604800 seconds)
    expect(result).not.toBeNull()
    const now = new Date()
    const expiresAt = new Date(result!.expiresAt!)
    const diffSeconds = (expiresAt.getTime() - now.getTime()) / 1000

    // Should be approximately 7 days (within 5 minutes tolerance)
    expect(diffSeconds).toBeGreaterThan(604800 - 300)
    expect(diffSeconds).toBeLessThan(604800 + 300)
  })

  it('should handle large JSONB content correctly', async () => {
    // Arrange: Create large content object (1000+ elements)
    const largeContent = {
      files: Array.from({ length: 1000 }, (_, i) => ({
        path: `src/file-${i}.ts`,
        relevance: Math.random(),
      })),
      summary: 'Large codebase with 1000 files',
    }

    // Act: Store large content
    const result = await contextCachePut({
      packType: 'codebase',
      packKey: 'large-project',
      content: largeContent,
      ttl: 3600,
    })

    // Assert: Content stored and retrieved correctly
    expect(result).not.toBeNull()
    expect(result?.content).toEqual(largeContent)
    expect((result?.content as any).files).toHaveLength(1000)
  })

  it('should reset hitCount to 0 on new pack creation', async () => {
    // Act: Create new pack
    const result = await contextCachePut({
      packType: 'feature',
      packKey: 'auth-system',
      content: { description: 'Authentication system' },
      ttl: 3600,
    })

    // Assert: Initial hitCount is 0
    expect(result).not.toBeNull()
    expect(result?.hitCount).toBe(0)
  })

  it('should handle TTL calculation correctly for various values', async () => {
    // Test multiple TTL values
    const testCases = [
      { ttl: 60, description: '1 minute' },
      { ttl: 3600, description: '1 hour' },
      { ttl: 86400, description: '1 day' },
      { ttl: 2592000, description: '30 days' },
    ]

    for (const { ttl, description } of testCases) {
      const packKey = `test-${ttl}`

      const result = await contextCachePut({
        packType: 'epic',
        packKey,
        content: { ttl: description },
        ttl,
      })

      expect(result).not.toBeNull()

      const now = new Date()
      const expiresAt = new Date(result!.expiresAt!)
      const diffSeconds = (expiresAt.getTime() - now.getTime()) / 1000

      // Verify TTL is within ±10 seconds tolerance
      expect(diffSeconds).toBeGreaterThan(ttl - 10)
      expect(diffSeconds).toBeLessThan(ttl + 10)
    }
  })
})
