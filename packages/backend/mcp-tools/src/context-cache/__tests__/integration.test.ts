/**
 * Integration Test for Context Cache Tools
 * WINT-0100: Full workflow test covering all 4 tools
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { db } from '@repo/db'
import { contextPacks } from '@repo/knowledge-base/db'
import { sql } from 'drizzle-orm'
import { contextCacheGet } from '../context-cache-get.js'
import { contextCachePut } from '../context-cache-put.js'
import { contextCacheInvalidate } from '../context-cache-invalidate.js'
import { contextCacheStats } from '../context-cache-stats.js'

describe('Context Cache Tools Integration', () => {
  beforeEach(async () => {
    await db.delete(contextPacks)
  })

  afterEach(async () => {
    await db.delete(contextPacks)
  })

  it('should handle full workflow: put → get → stats → invalidate → stats', async () => {
    // Step 1: Put - Create context packs
    const pack1 = await contextCachePut({
      packType: 'codebase',
      packKey: 'main',
      content: {
        summary: 'Main codebase summary',
        files: [
          { path: 'src/index.ts', relevance: 1.0 },
          { path: 'src/app.ts', relevance: 0.9 },
        ],
      },
      ttl: 3600, // 1 hour
      version: 1,
    })

    expect(pack1).not.toBeNull()
    expect(pack1?.hitCount).toBe(0)

    const pack2 = await contextCachePut({
      packType: 'story',
      packKey: 'WINT-0100',
      content: {
        summary: 'Context Cache MCP Tools',
        lessons: ['Use Zod validation', 'Resilient error handling'],
      },
      ttl: 7200, // 2 hours
    })

    expect(pack2).not.toBeNull()

    // Step 2: Get - Retrieve and track hits
    const retrieved1 = await contextCacheGet({
      packType: 'codebase',
      packKey: 'main',
    })

    expect(retrieved1).not.toBeNull()
    expect(retrieved1?.hitCount).toBe(1)
    expect(retrieved1?.lastHitAt).not.toBeNull()

    // Multiple hits
    await contextCacheGet({ packType: 'codebase', packKey: 'main' })
    await contextCacheGet({ packType: 'codebase', packKey: 'main' })

    const retrieved2 = await contextCacheGet({
      packType: 'story',
      packKey: 'WINT-0100',
    })

    expect(retrieved2).not.toBeNull()
    expect(retrieved2?.hitCount).toBe(1)

    // Step 3: Stats - Check initial metrics
    const statsBeforeInvalidate = await contextCacheStats({})

    expect(statsBeforeInvalidate.totalPacks).toBe(2)
    expect(statsBeforeInvalidate.hitCount).toBe(4) // 3 hits on pack1 + 1 hit on pack2
    expect(statsBeforeInvalidate.expiredCount).toBe(0)

    // Step 4: Invalidate - Soft delete story pack
    const invalidateResult = await contextCacheInvalidate({
      packType: 'story',
      packKey: 'WINT-0100',
    })

    expect(invalidateResult.invalidatedCount).toBe(1)

    // Verify pack is no longer retrievable
    const retrievedAfterInvalidate = await contextCacheGet({
      packType: 'story',
      packKey: 'WINT-0100',
    })

    expect(retrievedAfterInvalidate).toBeNull()

    // Step 5: Stats - Verify updated metrics
    const statsAfterInvalidate = await contextCacheStats({})

    expect(statsAfterInvalidate.totalPacks).toBe(1) // Only codebase pack active
    expect(statsAfterInvalidate.expiredCount).toBe(1) // Story pack expired

    // Step 6: Update - Upsert existing pack
    const updatedPack = await contextCachePut({
      packType: 'codebase',
      packKey: 'main',
      content: {
        summary: 'Updated main codebase summary',
        files: [{ path: 'src/index.ts', relevance: 1.0 }],
      },
      ttl: 7200,
      version: 2,
    })

    expect(updatedPack).not.toBeNull()
    expect(updatedPack?.version).toBe(2)
    expect(updatedPack?.content).toEqual({
      summary: 'Updated main codebase summary',
      files: [{ path: 'src/index.ts', relevance: 1.0 }],
    })

    // Step 7: Hard delete - Physical removal
    const hardDeleteResult = await contextCacheInvalidate({
      packType: 'codebase',
      packKey: 'main',
      hardDelete: true,
    })

    expect(hardDeleteResult.invalidatedCount).toBe(1)

    // Verify all packs removed
    const finalStats = await contextCacheStats({})
    expect(finalStats.totalPacks).toBe(0)
  })

  it('should handle concurrent operations correctly', async () => {
    // Create initial pack
    await contextCachePut({
      packType: 'architecture',
      packKey: 'system-design',
      content: { decisions: ['Microservices', 'Event-driven'] },
      ttl: 3600,
    })

    // Concurrent gets and puts
    const operations = [
      contextCacheGet({ packType: 'architecture', packKey: 'system-design' }),
      contextCacheGet({ packType: 'architecture', packKey: 'system-design' }),
      contextCachePut({
        packType: 'architecture',
        packKey: 'system-design',
        content: { decisions: ['Updated microservices'] },
        ttl: 7200,
      }),
      contextCacheGet({ packType: 'architecture', packKey: 'system-design' }),
      contextCacheStats({}),
    ]

    const results = await Promise.all(operations)

    // Verify no errors occurred
    expect(results).toHaveLength(5)
    expect(results.every(r => r !== null)).toBe(true)

    // Verify final state
    const finalPack = await contextCacheGet({
      packType: 'architecture',
      packKey: 'system-design',
    })

    expect(finalPack).not.toBeNull()
    expect(finalPack?.content).toEqual({ decisions: ['Updated microservices'] })
  })
})
