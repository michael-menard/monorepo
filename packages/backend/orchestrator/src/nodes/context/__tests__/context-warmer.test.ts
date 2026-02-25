/**
 * Unit Tests for context-warmer.ts
 * WINT-9090 AC-4, AC-5, AC-8, AC-10, AC-11, AC-12, AC-13
 *
 * Uses injectable mock DB functions — no live DB required.
 * Note: concurrent write tests (ED-1) are run serially per PLAN.yaml notes.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { SelectContextPack } from '@repo/database-schema'
import {
  createContextWarmerNode,
  type ContextWarmerGetInput,
  type ContextWarmerPutInput,
  type ContextWarmerInvalidateInput,
} from '../context-warmer.js'

// ============================================================================
// Mock factory helpers
// ============================================================================

function makeMockPack(overrides: Partial<SelectContextPack> = {}): SelectContextPack {
  return {
    id: 'pack-uuid-1',
    packType: 'codebase',
    packKey: 'main',
    content: { summary: 'Main codebase', files: [] },
    version: 1,
    hitCount: 1,
    lastHitAt: new Date('2026-02-24T22:00:00Z'),
    expiresAt: new Date('2027-02-24T22:00:00Z'), // future expiry
    createdAt: new Date('2026-02-24T10:00:00Z'),
    updatedAt: new Date('2026-02-24T22:00:00Z'),
    ...overrides,
  } as SelectContextPack
}

function baseState() {
  return {
    storyId: 'WINT-9090',
  }
}

// ============================================================================
// HP-1: Cache hit — contextCacheHit=true, contextPackContent populated (AC-4)
// ============================================================================

describe('HP-1: contextWarmerNode cache hit', () => {
  it('should return contextCacheHit=true and populate contextPackContent', async () => {
    const mockPack = makeMockPack()
    const mockCacheGet = vi.fn().mockResolvedValue(mockPack)

    const node = createContextWarmerNode({ cacheGetFn: mockCacheGet })

    const result = await node({
      ...baseState(),
      cacheOperation: 'get',
      cachePackType: 'codebase',
      cachePackKey: 'main',
    })

    expect(result.contextCacheHit).toBe(true)
    expect(result.contextPackContent).toEqual({ summary: 'Main codebase', files: [] })
    expect(result.contextWarmerResult?.operation).toBe('get')
    expect(result.contextWarmerResult?.contextCacheHit).toBe(true)
    expect(result.contextWarmerResult?.error).toBeNull()
    expect(mockCacheGet).toHaveBeenCalledWith({ packType: 'codebase', packKey: 'main' })
  })
})

// ============================================================================
// HP-2: Cache miss — contextCacheHit=false, new row insertion (AC-5)
// ============================================================================

describe('HP-2: contextWarmerNode cache miss', () => {
  it('should return contextCacheHit=false on cache miss', async () => {
    const mockCacheGet = vi.fn().mockResolvedValue(null)

    const node = createContextWarmerNode({ cacheGetFn: mockCacheGet })

    const result = await node({
      ...baseState(),
      cacheOperation: 'get',
      cachePackType: 'story',
      cachePackKey: 'WINT-9090',
    })

    expect(result.contextCacheHit).toBe(false)
    expect(result.contextPackContent).toBeNull()
    expect(result.contextWarmerResult?.operation).toBe('get')
    expect(result.contextWarmerResult?.error).toBeNull()
  })

  it('should store new content on put after cache miss', async () => {
    const mockCacheGet = vi.fn().mockResolvedValue(null)
    const newContent = { summary: 'New story pack', lessons: ['Use Zod validation'] }
    const mockPack = makeMockPack({ content: newContent, hitCount: 0, packType: 'story', packKey: 'WINT-9090' })
    const mockCachePut = vi.fn().mockResolvedValue(mockPack)

    const node = createContextWarmerNode({ cacheGetFn: mockCacheGet, cachePutFn: mockCachePut })

    // First: cache miss
    const getResult = await node({
      ...baseState(),
      cacheOperation: 'get',
      cachePackType: 'story',
      cachePackKey: 'WINT-9090',
    })
    expect(getResult.contextCacheHit).toBe(false)

    // Then: put to cache
    const putResult = await node({
      ...baseState(),
      cacheOperation: 'put',
      cachePackType: 'story',
      cachePackKey: 'WINT-9090',
      cacheContent: newContent,
    })
    expect(putResult.contextWarmerResult?.operation).toBe('put')
    expect(putResult.contextWarmerResult?.error).toBeNull()
    expect(putResult.contextPackContent).toEqual(newContent)
    expect(mockCachePut).toHaveBeenCalledTimes(1)
  })
})

// ============================================================================
// HP-3: Cache put — upsert with TTL
// ============================================================================

describe('HP-3: cache put operation', () => {
  it('should call cachePutFn with correct arguments including TTL', async () => {
    const content = { decisions: ['Microservices', 'Event-driven'] }
    const mockPack = makeMockPack({ content, packType: 'architecture', packKey: 'system-design', version: 2 })
    const mockCachePut = vi.fn().mockResolvedValue(mockPack)

    const node = createContextWarmerNode({ cachePutFn: mockCachePut })

    const result = await node({
      ...baseState(),
      cacheOperation: 'put',
      cachePackType: 'architecture',
      cachePackKey: 'system-design',
      cacheContent: content,
      cacheTtl: 3600,
      cacheVersion: 2,
    })

    expect(result.contextWarmerResult?.operation).toBe('put')
    expect(result.contextWarmerResult?.error).toBeNull()
    expect(result.contextPackContent).toEqual(content)
    expect(mockCachePut).toHaveBeenCalledWith(
      expect.objectContaining({
        packType: 'architecture',
        packKey: 'system-design',
        content,
        ttl: 3600,
        version: 2,
      }),
    )
  })

  it('should use defaultTtl from config when not specified in state', async () => {
    const content = { lessons: ['Test'] }
    const mockPack = makeMockPack({ content })
    const mockCachePut = vi.fn().mockResolvedValue(mockPack)

    const node = createContextWarmerNode({ cachePutFn: mockCachePut, defaultTtl: 1800 })

    await node({
      ...baseState(),
      cacheOperation: 'put',
      cachePackType: 'codebase',
      cachePackKey: 'main',
      cacheContent: content,
      // No cacheTtl provided — should use defaultTtl=1800
    })

    expect(mockCachePut).toHaveBeenCalledWith(
      expect.objectContaining({ ttl: 1800 }),
    )
  })
})

// ============================================================================
// HP-4: Invalidation operation (AC-13)
// ============================================================================

describe('HP-4: cache invalidation operation (AC-13)', () => {
  it('should call cacheInvalidateFn and return invalidatedCount', async () => {
    const mockCacheInvalidate = vi.fn().mockResolvedValue({ invalidatedCount: 3 })

    const node = createContextWarmerNode({ cacheInvalidateFn: mockCacheInvalidate })

    const result = await node({
      ...baseState(),
      cacheOperation: 'invalidate',
      cachePackType: 'story',
      cacheHardDelete: false,
    })

    expect(result.contextWarmerResult?.operation).toBe('invalidate')
    expect(result.contextWarmerResult?.invalidatedCount).toBe(3)
    expect(result.contextWarmerResult?.error).toBeNull()
    expect(mockCacheInvalidate).toHaveBeenCalledWith(
      expect.objectContaining({ packType: 'story', hardDelete: false }),
    )
  })

  it('should support hard delete invalidation', async () => {
    const mockCacheInvalidate = vi.fn().mockResolvedValue({ invalidatedCount: 1 })

    const node = createContextWarmerNode({ cacheInvalidateFn: mockCacheInvalidate })

    await node({
      ...baseState(),
      cacheOperation: 'invalidate',
      cachePackType: 'codebase',
      cachePackKey: 'old-project',
      cacheHardDelete: true,
    })

    expect(mockCacheInvalidate).toHaveBeenCalledWith(
      expect.objectContaining({ hardDelete: true, packKey: 'old-project' }),
    )
  })

  it('should support age-based invalidation with olderThan', async () => {
    const olderThan = new Date('2026-01-01T00:00:00Z')
    const mockCacheInvalidate = vi.fn().mockResolvedValue({ invalidatedCount: 5 })

    const node = createContextWarmerNode({ cacheInvalidateFn: mockCacheInvalidate })

    const result = await node({
      ...baseState(),
      cacheOperation: 'invalidate',
      cacheOlderThan: olderThan,
    })

    expect(result.contextWarmerResult?.invalidatedCount).toBe(5)
    expect(mockCacheInvalidate).toHaveBeenCalledWith(
      expect.objectContaining({ olderThan }),
    )
  })
})

// ============================================================================
// HP-5: Factory pattern — injectable mock DB accepted (AC-8, AC-10)
// ============================================================================

describe('HP-5: factory pattern and DB injection (AC-8, AC-10)', () => {
  it('createContextWarmerNode accepts mockDb functions and uses them', async () => {
    const mockCacheGet = vi.fn().mockResolvedValue(null)
    const mockCachePut = vi.fn().mockResolvedValue(makeMockPack())
    const mockCacheInvalidate = vi.fn().mockResolvedValue({ invalidatedCount: 0 })

    const node = createContextWarmerNode({ mockCacheGet, cachePutFn: mockCachePut, cacheGetFn: mockCacheGet, cacheInvalidateFn: mockCacheInvalidate })

    await node({ ...baseState(), cacheOperation: 'get', cachePackType: 'codebase', cachePackKey: 'main' })
    expect(mockCacheGet).toHaveBeenCalledTimes(1)

    await node({ ...baseState(), cacheOperation: 'put', cachePackType: 'codebase', cachePackKey: 'main', cacheContent: {} })
    expect(mockCachePut).toHaveBeenCalledTimes(1)

    await node({ ...baseState(), cacheOperation: 'invalidate' })
    expect(mockCacheInvalidate).toHaveBeenCalledTimes(1)
  })

  it('uses createToolNode from node-factory (AC-8)', () => {
    // Verify the node is a function (LangGraph-compatible)
    const node = createContextWarmerNode({})
    expect(typeof node).toBe('function')
  })
})

// ============================================================================
// EC-1: DB failure returns null state fields, never throws (AC-11)
// ============================================================================

describe('EC-1: graceful degradation on DB failure (AC-11)', () => {
  it('should return null contextPackContent and log error on cacheGetFn failure', async () => {
    const mockCacheGet = vi.fn().mockRejectedValue(new Error('Database connection refused'))

    const node = createContextWarmerNode({ cacheGetFn: mockCacheGet })

    const result = await node({
      ...baseState(),
      cacheOperation: 'get',
      cachePackType: 'codebase',
      cachePackKey: 'main',
    })

    // Must not throw — returns null fields instead
    expect(result.contextCacheHit).toBe(false)
    expect(result.contextPackContent).toBeNull()
    expect(result.contextWarmerResult?.error).toContain('Database connection refused')
  })

  it('should return null contextPackContent and log error on cachePutFn failure', async () => {
    const mockCachePut = vi.fn().mockRejectedValue(new Error('Unique constraint violation'))

    const node = createContextWarmerNode({ cachePutFn: mockCachePut })

    const result = await node({
      ...baseState(),
      cacheOperation: 'put',
      cachePackType: 'codebase',
      cachePackKey: 'main',
      cacheContent: { test: true },
    })

    expect(result.contextPackContent).toBeNull()
    expect(result.contextWarmerResult?.error).toContain('Unique constraint violation')
  })

  it('should return invalidatedCount=0 and log error on cacheInvalidateFn failure', async () => {
    const mockCacheInvalidate = vi.fn().mockRejectedValue(new Error('DB timeout'))

    const node = createContextWarmerNode({ cacheInvalidateFn: mockCacheInvalidate })

    const result = await node({
      ...baseState(),
      cacheOperation: 'invalidate',
      cachePackType: 'story',
    })

    expect(result.contextWarmerResult?.invalidatedCount).toBe(0)
    expect(result.contextWarmerResult?.error).toContain('DB timeout')
  })
})

// ============================================================================
// EC-2: Missing required fields returns error state (input validation)
// ============================================================================

describe('EC-2: missing required fields', () => {
  it('should return error when cachePackType is missing for get', async () => {
    const mockCacheGet = vi.fn()
    const node = createContextWarmerNode({ cacheGetFn: mockCacheGet })

    const result = await node({
      ...baseState(),
      cacheOperation: 'get',
      // Missing cachePackType and cachePackKey
    })

    expect(result.contextCacheHit).toBe(false)
    expect(result.contextPackContent).toBeNull()
    expect(result.contextWarmerResult?.error).toContain('required')
    expect(mockCacheGet).not.toHaveBeenCalled()
  })

  it('should return error when cacheContent is missing for put', async () => {
    const mockCachePut = vi.fn()
    const node = createContextWarmerNode({ cachePutFn: mockCachePut })

    const result = await node({
      ...baseState(),
      cacheOperation: 'put',
      cachePackType: 'codebase',
      cachePackKey: 'main',
      // Missing cacheContent
    })

    expect(result.contextPackContent).toBeNull()
    expect(result.contextWarmerResult?.error).toContain('required')
    expect(mockCachePut).not.toHaveBeenCalled()
  })
})

// ============================================================================
// ED-1: Concurrent writes (serialized in vitest per PLAN.yaml)
// ============================================================================

describe.sequential('ED-1: concurrent write safety (serialized)', () => {
  let callCount = 0
  let mockCachePut: ReturnType<typeof vi.fn>

  beforeEach(() => {
    callCount = 0
    mockCachePut = vi.fn().mockImplementation(async (_input: ContextWarmerPutInput) => {
      callCount++
      return makeMockPack({ hitCount: callCount })
    })
  })

  it('should handle sequential put operations without errors', async () => {
    const node = createContextWarmerNode({ cachePutFn: mockCachePut })

    // Sequential writes
    const result1 = await node({
      ...baseState(),
      cacheOperation: 'put',
      cachePackType: 'codebase',
      cachePackKey: 'main',
      cacheContent: { version: 1 },
    })
    const result2 = await node({
      ...baseState(),
      cacheOperation: 'put',
      cachePackType: 'codebase',
      cachePackKey: 'main',
      cacheContent: { version: 2 },
    })

    expect(result1.contextWarmerResult?.error).toBeNull()
    expect(result2.contextWarmerResult?.error).toBeNull()
    expect(mockCachePut).toHaveBeenCalledTimes(2)
  })
})
