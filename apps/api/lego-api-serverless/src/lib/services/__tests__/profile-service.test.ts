/**
 * Unit Tests for Profile Service
 *
 * Tests the profile service helper functions in isolation with all dependencies mocked.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getCognitoProfile, getProfileStats, getUserProfile } from '../profile-service'
import * as cognitoClient from '@/lib/cognito/cognito-client'
import * as dbClient from '@/lib/db/client'
import * as redisClient from '@/lib/cache/redis-client'

// Mock all external dependencies
vi.mock('@/lib/cognito/cognito-client')
vi.mock('@/lib/db/client', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn(),
  },
}))
vi.mock('@/lib/cache/redis-client')
vi.mock('@/lib/utils/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}))

describe('Profile Service - getCognitoProfile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should successfully retrieve Cognito profile attributes', async () => {
    const mockCognitoResponse = {
      UserAttributes: [
        { Name: 'sub', Value: 'user-123' },
        { Name: 'email', Value: 'test@example.com' },
        { Name: 'name', Value: 'Test User' },
        { Name: 'picture', Value: 'https://example.com/avatar.jpg' },
      ],
    }

    vi.mocked(cognitoClient.getCognitoUser).mockResolvedValue(mockCognitoResponse)
    vi.mocked(cognitoClient.getCognitoAttribute).mockImplementation((attrs, name) => {
      const attr = attrs?.find(a => a.Name === name)
      return attr?.Value || null
    })

    const result = await getCognitoProfile('user-123')

    expect(result).toEqual({
      sub: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      picture: 'https://example.com/avatar.jpg',
    })
    expect(cognitoClient.getCognitoUser).toHaveBeenCalledWith('user-123')
  })

  it('should handle missing optional attributes (name, picture)', async () => {
    const mockCognitoResponse = {
      UserAttributes: [
        { Name: 'sub', Value: 'user-123' },
        { Name: 'email', Value: 'test@example.com' },
      ],
    }

    vi.mocked(cognitoClient.getCognitoUser).mockResolvedValue(mockCognitoResponse)
    vi.mocked(cognitoClient.getCognitoAttribute).mockImplementation((attrs, name) => {
      const attr = attrs?.find(a => a.Name === name)
      return attr?.Value || null
    })

    const result = await getCognitoProfile('user-123')

    expect(result).toEqual({
      sub: 'user-123',
      email: 'test@example.com',
      name: null,
      picture: null,
    })
  })

  it('should return null if user not found in Cognito', async () => {
    vi.mocked(cognitoClient.getCognitoUser).mockResolvedValue(null)

    const result = await getCognitoProfile('non-existent-user')

    expect(result).toBeNull()
  })

  it('should throw error on Cognito failure', async () => {
    vi.mocked(cognitoClient.getCognitoUser).mockRejectedValue(new Error('Cognito API error'))

    await expect(getCognitoProfile('user-123')).rejects.toThrow('Cognito API error')
  })
})

describe('Profile Service - getProfileStats', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should aggregate statistics from PostgreSQL correctly', async () => {
    const mockWhere = vi
      .fn()
      .mockResolvedValueOnce([{ count: BigInt(5) }]) // MOCs
      .mockResolvedValueOnce([{ count: BigInt(15) }]) // Gallery images
      .mockResolvedValueOnce([{ count: BigInt(3) }]) // Wishlist items

    vi.mocked(dbClient.db).select = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: mockWhere,
      }),
    }) as any

    const result = await getProfileStats('user-123')

    expect(result).toEqual({
      mocs: 5,
      images: 15,
      wishlistItems: 3,
    })
  })

  it('should handle zero counts correctly', async () => {
    const mockWhere = vi
      .fn()
      .mockResolvedValueOnce([{ count: BigInt(0) }])
      .mockResolvedValueOnce([{ count: BigInt(0) }])
      .mockResolvedValueOnce([{ count: BigInt(0) }])

    vi.mocked(dbClient.db).select = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: mockWhere,
      }),
    }) as any

    const result = await getProfileStats('user-123')

    expect(result).toEqual({
      mocs: 0,
      images: 0,
      wishlistItems: 0,
    })
  })

  it('should throw error on database failure', async () => {
    const mockWhere = vi.fn().mockRejectedValue(new Error('Database connection failed'))

    vi.mocked(dbClient.db).select = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: mockWhere,
      }),
    }) as any

    await expect(getProfileStats('user-123')).rejects.toThrow('Database connection failed')
  })
})

describe('Profile Service - getUserProfile (with caching)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return cached profile if available', async () => {
    const cachedProfile = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      avatarUrl: 'https://example.com/avatar.jpg',
      stats: { mocs: 5, images: 15, wishlistItems: 3 },
    }

    const mockRedis = {
      get: vi.fn().mockResolvedValue(JSON.stringify(cachedProfile)),
      setEx: vi.fn(),
    }

    vi.mocked(redisClient.getRedisClient).mockResolvedValue(mockRedis as any)

    const result = await getUserProfile('user-123')

    expect(result).toEqual(cachedProfile)
    expect(mockRedis.get).toHaveBeenCalledWith('profile:user:user-123')
    // Should not fetch from Cognito or DB when cache hit
    expect(cognitoClient.getCognitoUser).not.toHaveBeenCalled()
  })

  it('should fetch and cache profile on cache miss', async () => {
    const mockStats = {
      mocs: 5,
      images: 15,
      wishlistItems: 3,
    }

    const mockRedis = {
      get: vi.fn().mockResolvedValue(null), // Cache miss
      setEx: vi.fn(),
    }

    vi.mocked(redisClient.getRedisClient).mockResolvedValue(mockRedis as any)
    vi.mocked(cognitoClient.getCognitoUser).mockResolvedValue({
      UserAttributes: [
        { Name: 'sub', Value: 'user-123' },
        { Name: 'email', Value: 'test@example.com' },
        { Name: 'name', Value: 'Test User' },
        { Name: 'picture', Value: 'https://example.com/avatar.jpg' },
      ],
    })
    vi.mocked(cognitoClient.getCognitoAttribute).mockImplementation((attrs, name) => {
      const attr = attrs?.find(a => a.Name === name)
      return attr?.Value || null
    })

    const mockWhere = vi
      .fn()
      .mockResolvedValueOnce([{ count: BigInt(5) }])
      .mockResolvedValueOnce([{ count: BigInt(15) }])
      .mockResolvedValueOnce([{ count: BigInt(3) }])

    vi.mocked(dbClient.db).select = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: mockWhere,
      }),
    }) as any

    const result = await getUserProfile('user-123')

    const expectedProfile = {
      id: 'user-123',
      email: 'test@example.com',
      name: 'Test User',
      avatarUrl: 'https://example.com/avatar.jpg',
      stats: mockStats,
    }

    expect(result).toEqual(expectedProfile)
    expect(mockRedis.get).toHaveBeenCalledWith('profile:user:user-123')
    expect(mockRedis.setEx).toHaveBeenCalledWith(
      'profile:user:user-123',
      600,
      JSON.stringify(expectedProfile),
    )
  })

  it('should throw error if user not found in Cognito', async () => {
    const mockRedis = {
      get: vi.fn().mockResolvedValue(null), // Cache miss
      setEx: vi.fn(),
    }

    const mockWhere = vi
      .fn()
      .mockResolvedValueOnce([{ count: BigInt(0) }])
      .mockResolvedValueOnce([{ count: BigInt(0) }])
      .mockResolvedValueOnce([{ count: BigInt(0) }])

    vi.mocked(dbClient.db).select = vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: mockWhere,
      }),
    }) as any

    vi.mocked(redisClient.getRedisClient).mockResolvedValue(mockRedis as any)
    vi.mocked(cognitoClient.getCognitoUser).mockResolvedValue(null)

    await expect(getUserProfile('non-existent-user')).rejects.toThrow(
      'User not found in Cognito',
    )
  })

  it('should throw error on Redis connection failure', async () => {
    vi.mocked(redisClient.getRedisClient).mockRejectedValue(new Error('Redis connection failed'))

    await expect(getUserProfile('user-123')).rejects.toThrow('Redis connection failed')
  })
})
