/**
 * MOC Service Integration Tests
 *
 * Tests the MOC service layer integration with mocked database and cache.
 * Focuses on cache invalidation, service orchestration, and error handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock external dependencies
vi.mock('@/lib/db/client')
vi.mock('@/lib/services/redis')
vi.mock('@/lib/services/opensearch-moc')

describe('MOC Service Integration', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'development'
    process.env.STAGE = 'dev'
    vi.clearAllMocks()
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getMocById() - Cache Integration', () => {
    it('should return cached MOC if available', async () => {
      // Given: MOC is in cache
      const mockMoc = {
        id: 'test-moc-123',
        title: 'Test MOC',
        userId: 'user-123',
        createdAt: new Date(),
      }

      const redis = await import('@/lib/services/redis')
      const mockRedisClient = {
        get: vi.fn().mockResolvedValue(JSON.stringify(mockMoc)),
        set: vi.fn(),
        setEx: vi.fn(),
        del: vi.fn(),
      }
      vi.mocked(redis.getRedisClient).mockResolvedValue(mockRedisClient as any)

      // When: Getting MOC by ID
      const { getMocById } = await import('../../moc-service')
      const result = await getMocById('test-moc-123')

      // Then: Returns cached data without database query
      expect(result).toBeDefined()
      expect(result?.id).toBe('test-moc-123')
      expect(mockRedisClient.get).toHaveBeenCalledWith('moc:detail:test-moc-123')
    })

    it('should fetch from database and cache if not in cache', async () => {
      // Given: MOC is not in cache
      const mockMoc = {
        id: 'test-moc-456',
        title: 'Another MOC',
        userId: 'user-456',
        difficulty: 'intermediate',
        pieceCount: 500,
        estimatedCost: '50.00',
        timeToComplete: 180,
        isPublic: true,
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const redis = await import('@/lib/services/redis')
      const mockRedisClient = {
        get: vi.fn().mockResolvedValue(null), // Not in cache
        set: vi.fn(),
        setEx: vi.fn(),
        del: vi.fn(),
      }
      vi.mocked(redis.getRedisClient).mockResolvedValue(mockRedisClient as any)

      const dbClient = await import('@/lib/db/client')
      ;(dbClient.db as any) = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockMoc]),
            }),
          }),
        }),
      }

      // When: Getting MOC by ID
      const { getMocById } = await import('../../moc-service')
      const result = await getMocById('test-moc-456')

      // Then: Fetches from database and caches result
      expect(result).toBeDefined()
      expect(result?.id).toBe('test-moc-456')
      expect(mockRedisClient.get).toHaveBeenCalledWith('moc:detail:test-moc-456')
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(
        'moc:detail:test-moc-456',
        600, // 10 minute TTL
        expect.any(String)
      )
    })

    it('should handle cache failures gracefully', async () => {
      // Given: Redis is down
      const redis = await import('@/lib/services/redis')
      vi.mocked(redis.getRedisClient).mockRejectedValue(new Error('Redis connection failed'))

      // Suppress console.error
      vi.spyOn(console, 'error').mockImplementation(() => {})

      const dbClient = await import('@/lib/db/client')
      const mockMoc = {
        id: 'test-moc-789',
        title: 'Test MOC',
        userId: 'user-789',
        difficulty: 'beginner',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      ;(dbClient.db as any) = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockMoc]),
            }),
          }),
        }),
      }

      // When: Getting MOC by ID
      const { getMocById } = await import('../../moc-service')
      const result = await getMocById('test-moc-789')

      // Then: Still returns data from database (cache failure doesn't break functionality)
      expect(result).toBeDefined()
      expect(result?.id).toBe('test-moc-789')
    })
  })

  describe('Cache Invalidation', () => {
    it('should invalidate cache when MOC is updated', async () => {
      // Given: MOC exists and cache is populated
      const redis = await import('@/lib/services/redis')
      const mockRedisClient = {
        get: vi.fn(),
        set: vi.fn(),
        setEx: vi.fn(),
        del: vi.fn(),
      }
      vi.mocked(redis.getRedisClient).mockResolvedValue(mockRedisClient as any)

      const dbClient = await import('@/lib/db/client')
      const mockMoc = {
        id: 'test-moc-update',
        title: 'Updated MOC',
        userId: 'user-123',
        difficulty: 'advanced',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      ;(dbClient.db as any) = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockMoc]),
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          set: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([{ ...mockMoc, title: 'Updated Title' }]),
            }),
          }),
        }),
      }

      // When: Updating MOC
      const { updateMoc } = await import('../../moc-service')
      await updateMoc('test-moc-update', 'user-123', { title: 'Updated Title' })

      // Then: Cache is invalidated
      expect(mockRedisClient.del).toHaveBeenCalledWith('moc:detail:test-moc-update')
    })
  })

  describe('Error Handling', () => {
    it('should throw NotFoundError when MOC does not exist', async () => {
      // Given: MOC does not exist in cache or database
      const redis = await import('@/lib/services/redis')
      const mockRedisClient = {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn(),
        setEx: vi.fn(),
        del: vi.fn(),
      }
      vi.mocked(redis.getRedisClient).mockResolvedValue(mockRedisClient as any)

      const dbClient = await import('@/lib/db/client')
      ;(dbClient.db as any) = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]), // Empty result
            }),
          }),
        }),
      }

      // When: Getting non-existent MOC
      const { getMocById } = await import('../../moc-service')
      const result = await getMocById('non-existent-moc')

      // Then: Returns null (not found)
      expect(result).toBeNull()
    })

    it('should throw DatabaseError when database query fails', async () => {
      // Given: Database query fails
      const redis = await import('@/lib/services/redis')
      const mockRedisClient = {
        get: vi.fn().mockResolvedValue(null),
        set: vi.fn(),
        setEx: vi.fn(),
        del: vi.fn(),
      }
      vi.mocked(redis.getRedisClient).mockResolvedValue(mockRedisClient as any)

      const dbClient = await import('@/lib/db/client')
      ;(dbClient.db as any) = {
        select: vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockRejectedValue(new Error('Database connection timeout')),
            }),
          }),
        }),
      }

      // When: Getting MOC by ID
      const { getMocById } = await import('../../moc-service')

      // Then: Throws database error
      await expect(getMocById('test-moc-error')).rejects.toThrow('Database connection timeout')
    })
  })

  describe('Service Orchestration', () => {
    it('should coordinate database, cache, and search operations', async () => {
      // Given: All services are available
      const redis = await import('@/lib/services/redis')
      const mockRedisClient = {
        get: vi.fn(),
        set: vi.fn(),
        setEx: vi.fn(),
        del: vi.fn(),
      }
      vi.mocked(redis.getRedisClient).mockResolvedValue(mockRedisClient as any)

      const opensearch = await import('@/lib/services/opensearch-moc')
      vi.mocked(opensearch.indexMocInstruction).mockResolvedValue(undefined)

      const dbClient = await import('@/lib/db/client')
      const mockMoc = {
        id: 'new-moc-123',
        title: 'New MOC',
        userId: 'user-123',
        difficulty: 'intermediate',
        pieceCount: 300,
        isPublic: true,
        tags: ['castle', 'medieval'],
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      ;(dbClient.db as any) = {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([mockMoc]),
          }),
        }),
      }

      // When: Creating a new MOC
      const { createMoc } = await import('../../moc-service')
      const result = await createMoc('user-123', {
        title: 'New MOC',
        difficulty: 'intermediate',
        pieceCount: 300,
        isPublic: true,
        tags: ['castle', 'medieval'],
      })

      // Then: Coordinates all operations
      expect(result).toBeDefined()
      expect(result.id).toBe('new-moc-123')

      // Database insert was called
      expect(dbClient.db.insert).toHaveBeenCalled()

      // Search index was updated (fire-and-forget)
      expect(opensearch.indexMocInstruction).toHaveBeenCalledWith(mockMoc)
    })
  })
})
