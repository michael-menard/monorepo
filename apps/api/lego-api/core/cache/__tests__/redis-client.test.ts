import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock @repo/logger
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

/**
 * Redis Client Tests (WISH-2019)
 *
 * Tests for Redis client creation and configuration:
 * - AC 1: Connection configuration
 * - AC 5: Lambda cold start handling
 * - AC 6: Retry strategy
 */

// Mock Redis constructor
const mockRedisInstance = {
  on: vi.fn(),
  quit: vi.fn().mockResolvedValue('OK'),
}

const MockRedis = vi.fn(() => mockRedisInstance)

vi.mock('ioredis', () => ({
  default: MockRedis,
  Redis: MockRedis,
}))

describe('createRedisClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create Redis client with correct URL', async () => {
    const { createRedisClient } = await import('../redis-client.js')

    createRedisClient({ url: 'redis://localhost:6379' })

    expect(MockRedis).toHaveBeenCalledWith(
      'redis://localhost:6379',
      expect.objectContaining({
        connectTimeout: 2000, // AC 1: 2s timeout
        maxRetriesPerRequest: 3,
        lazyConnect: false, // AC 5: Eager connect
        enableReadyCheck: true,
      }),
    )
  })

  it('should allow custom configuration', async () => {
    const { createRedisClient } = await import('../redis-client.js')

    createRedisClient({
      url: 'redis://localhost:6379',
      connectTimeout: 5000,
      maxRetriesPerRequest: 5,
      lazyConnect: true,
    })

    expect(MockRedis).toHaveBeenCalledWith(
      'redis://localhost:6379',
      expect.objectContaining({
        connectTimeout: 5000,
        maxRetriesPerRequest: 5,
        lazyConnect: true,
      }),
    )
  })

  it('should configure retry strategy with exponential backoff (AC 6)', async () => {
    const { createRedisClient } = await import('../redis-client.js')

    createRedisClient({ url: 'redis://localhost:6379' })

    const callArgs = MockRedis.mock.calls[0] as unknown[]
    const options = callArgs[1] as { retryStrategy?: (times: number) => number }
    expect(options.retryStrategy).toBeDefined()

    // Test exponential backoff
    expect(options.retryStrategy!(1)).toBe(100) // 100ms
    expect(options.retryStrategy!(2)).toBe(200) // 200ms
    expect(options.retryStrategy!(3)).toBe(300) // 300ms
    expect(options.retryStrategy!(30)).toBe(2000) // Max 2000ms
  })

  it('should register event handlers', async () => {
    const { createRedisClient } = await import('../redis-client.js')

    createRedisClient({ url: 'redis://localhost:6379' })

    expect(mockRedisInstance.on).toHaveBeenCalledWith('connect', expect.any(Function))
    expect(mockRedisInstance.on).toHaveBeenCalledWith('ready', expect.any(Function))
    expect(mockRedisInstance.on).toHaveBeenCalledWith('error', expect.any(Function))
    expect(mockRedisInstance.on).toHaveBeenCalledWith('close', expect.any(Function))
    expect(mockRedisInstance.on).toHaveBeenCalledWith('reconnecting', expect.any(Function))
  })
})

describe('getRedisClient', () => {
  const originalEnv = process.env.REDIS_URL

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.REDIS_URL = originalEnv
    } else {
      delete process.env.REDIS_URL
    }
  })

  it('should return null when REDIS_URL is not set', async () => {
    delete process.env.REDIS_URL

    const { getRedisClient } = await import('../redis-client.js')
    const client = getRedisClient()

    expect(client).toBeNull()
  })

  it('should return Redis client when REDIS_URL is set', async () => {
    process.env.REDIS_URL = 'redis://localhost:6379'

    const { getRedisClient } = await import('../redis-client.js')
    const client = getRedisClient()

    expect(client).not.toBeNull()
  })
})

describe('disconnectRedis', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  it('should call quit on Redis client when connected', async () => {
    process.env.REDIS_URL = 'redis://localhost:6379'

    const { getRedisClient, disconnectRedis } = await import('../redis-client.js')

    // Create instance first
    getRedisClient()

    // Disconnect
    await disconnectRedis()

    expect(mockRedisInstance.quit).toHaveBeenCalled()
  })

  it('should not throw when no client exists', async () => {
    delete process.env.REDIS_URL

    const { disconnectRedis } = await import('../redis-client.js')

    // Should not throw
    await expect(disconnectRedis()).resolves.toBeUndefined()
  })
})
