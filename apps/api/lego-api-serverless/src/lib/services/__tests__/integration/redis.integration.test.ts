/**
 * Redis Client Integration Tests
 *
 * Tests the integration between our Redis client and the redis library.
 * Mocks the Redis client but tests our configuration and error handling.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock redis client before importing
vi.mock('redis', () => {
  const mockConnect = vi.fn()
  const mockPing = vi.fn()
  const mockQuit = vi.fn()
  const mockOn = vi.fn()

  const mockClient = {
    connect: mockConnect,
    ping: mockPing,
    quit: mockQuit,
    on: mockOn,
  }

  const createClient = vi.fn(() => mockClient)

  return {
    createClient,
    __mockClient: mockClient,
    __mockConnect: mockConnect,
    __mockPing: mockPing,
    __mockQuit: mockQuit,
    __mockOn: mockOn,
  }
})

describe('Redis Client Integration', () => {
  beforeEach(() => {
    // Set up environment for Redis connection
    process.env.REDIS_HOST = 'localhost'
    process.env.REDIS_PORT = '6379'
    process.env.NODE_ENV = 'development'

    vi.clearAllMocks()
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Client Configuration', () => {
    it('should create Redis client with correct configuration', async () => {
      // Given: Environment variables are set
      const redisModule = await import('redis')
      const mockConnect = (redisModule as any).__mockConnect
      const mockOn = (redisModule as any).__mockOn
      mockConnect.mockResolvedValue(undefined)

      // When: Getting Redis client
      const { getRedisClient } = await import('../../redis')
      await getRedisClient()

      // Then: Client is created with correct settings
      expect(redisModule.createClient).toHaveBeenCalledWith(
        expect.objectContaining({
          socket: expect.objectContaining({
            host: 'localhost',
            port: 6379,
            connectTimeout: 5000,
            reconnectStrategy: expect.any(Function),
          }),
        })
      )

      // And: Error handler is registered
      expect(mockOn).toHaveBeenCalledWith('error', expect.any(Function))

      // And: Client is connected
      expect(mockConnect).toHaveBeenCalled()
    })

    it('should use default port when not specified', async () => {
      // Given: REDIS_PORT is not set
      delete process.env.REDIS_PORT

      const redisModule = await import('redis')
      const mockConnect = (redisModule as any).__mockConnect
      mockConnect.mockResolvedValue(undefined)

      // When: Getting Redis client
      const { getRedisClient } = await import('../../redis')
      await getRedisClient()

      // Then: Uses default port 6379
      expect(redisModule.createClient).toHaveBeenCalledWith(
        expect.objectContaining({
          socket: expect.objectContaining({
            port: 6379,
          }),
        })
      )
    })
  })

  describe('Reconnection Strategy', () => {
    it('should use exponential backoff for reconnection', async () => {
      // Given: Redis client is created
      const redisModule = await import('redis')
      const mockConnect = (redisModule as any).__mockConnect
      mockConnect.mockResolvedValue(undefined)

      const { getRedisClient } = await import('../../redis')
      await getRedisClient()

      // Get the reconnect strategy function
      const createClientCall = (redisModule.createClient as any).mock.calls[0][0]
      const reconnectStrategy = createClientCall.socket.reconnectStrategy

      // When: Testing reconnection delays
      // Then: Uses exponential backoff capped at 3000ms
      expect(reconnectStrategy(1)).toBe(100) // 1 * 100
      expect(reconnectStrategy(2)).toBe(200) // 2 * 100
      expect(reconnectStrategy(3)).toBe(300) // 3 * 100
      expect(reconnectStrategy(10)).toBe(3000) // Capped at 3000
      expect(reconnectStrategy(50)).toBe(3000) // Capped at 3000
    })

    it('should fail after 3 reconnection attempts', async () => {
      // Given: Redis client is created
      const redisModule = await import('redis')
      const mockConnect = (redisModule as any).__mockConnect
      mockConnect.mockResolvedValue(undefined)

      const { getRedisClient } = await import('../../redis')
      await getRedisClient()

      // Get the reconnect strategy function
      const createClientCall = (redisModule.createClient as any).mock.calls[0][0]
      const reconnectStrategy = createClientCall.socket.reconnectStrategy

      // When: More than 3 retries
      const result = reconnectStrategy(4)

      // Then: Returns an Error
      expect(result).toBeInstanceOf(Error)
      expect((result as Error).message).toBe('Max Redis reconnection attempts reached')
    })
  })

  describe('Connection Testing', () => {
    it('should return true when PING succeeds', async () => {
      // Given: Redis connection is healthy
      const redisModule = await import('redis')
      const mockConnect = (redisModule as any).__mockConnect
      const mockPing = (redisModule as any).__mockPing
      mockConnect.mockResolvedValue(undefined)
      mockPing.mockResolvedValue('PONG')

      // When: Testing connection
      const { testRedisConnection } = await import('../../redis')
      const result = await testRedisConnection()

      // Then: Returns true
      expect(result).toBe(true)
      expect(mockPing).toHaveBeenCalled()
    })

    it('should return false when PING fails', async () => {
      // Given: Redis connection fails
      const redisModule = await import('redis')
      const mockConnect = (redisModule as any).__mockConnect
      const mockPing = (redisModule as any).__mockPing
      mockConnect.mockResolvedValue(undefined)
      mockPing.mockRejectedValue(new Error('Connection refused'))

      // Spy on console.error to suppress error output
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // When: Testing connection
      const { testRedisConnection } = await import('../../redis')
      const result = await testRedisConnection()

      // Then: Returns false and logs error
      expect(result).toBe(false)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Redis connection test failed:',
        expect.any(Error)
      )
    })

    it('should return false when PING returns unexpected value', async () => {
      // Given: Redis returns unexpected PING response
      const redisModule = await import('redis')
      const mockConnect = (redisModule as any).__mockConnect
      const mockPing = (redisModule as any).__mockPing
      mockConnect.mockResolvedValue(undefined)
      mockPing.mockResolvedValue('UNEXPECTED')

      // When: Testing connection
      const { testRedisConnection } = await import('../../redis')
      const result = await testRedisConnection()

      // Then: Returns false (PING !== 'PONG')
      expect(result).toBe(false)
    })
  })

  describe('Client Lifecycle', () => {
    it('should reuse existing client on subsequent calls', async () => {
      // Given: Client has been created
      const redisModule = await import('redis')
      const mockConnect = (redisModule as any).__mockConnect
      const mockPing = (redisModule as any).__mockPing
      mockConnect.mockResolvedValue(undefined)
      mockPing.mockResolvedValue('PONG')

      const { getRedisClient } = await import('../../redis')

      // When: getRedisClient is called multiple times
      const client1 = await getRedisClient()
      const client2 = await getRedisClient()
      const client3 = await getRedisClient()

      // Then: Client is only created once
      expect(redisModule.createClient).toHaveBeenCalledTimes(1)
      expect(mockConnect).toHaveBeenCalledTimes(1)
      expect(client1).toBe(client2)
      expect(client2).toBe(client3)
    })

    it('should close connection successfully', async () => {
      // Given: Client is created
      const redisModule = await import('redis')
      const mockConnect = (redisModule as any).__mockConnect
      const mockQuit = (redisModule as any).__mockQuit
      mockConnect.mockResolvedValue(undefined)
      mockQuit.mockResolvedValue('OK')

      const { getRedisClient, closeRedisConnection } = await import('../../redis')
      await getRedisClient()

      // When: Closing connection
      await closeRedisConnection()

      // Then: Client.quit() is called
      expect(mockQuit).toHaveBeenCalled()
    })

    it('should handle closeRedisConnection when client is not initialized', async () => {
      // Given: Client has never been created
      // When: Calling closeRedisConnection
      const { closeRedisConnection } = await import('../../redis')

      // Then: Does not throw
      await expect(closeRedisConnection()).resolves.toBeUndefined()
    })

    it('should handle connection errors gracefully', async () => {
      // Given: Connection fails
      const redisModule = await import('redis')
      const mockConnect = (redisModule as any).__mockConnect
      mockConnect.mockRejectedValue(new Error('Connection refused'))

      // When: Getting Redis client
      const { getRedisClient } = await import('../../redis')

      // Then: Throws the connection error
      await expect(getRedisClient()).rejects.toThrow('Connection refused')
    })
  })

  describe('Error Handling', () => {
    it('should register error handler on client', async () => {
      // Given: Redis client is created
      const redisModule = await import('redis')
      const mockConnect = (redisModule as any).__mockConnect
      const mockOn = (redisModule as any).__mockOn
      mockConnect.mockResolvedValue(undefined)

      // When: Getting Redis client
      const { getRedisClient } = await import('../../redis')
      await getRedisClient()

      // Then: Error handler is registered
      expect(mockOn).toHaveBeenCalledWith('error', expect.any(Function))
    })

    it('should log errors when error event is emitted', async () => {
      // Given: Redis client is created
      const redisModule = await import('redis')
      const mockConnect = (redisModule as any).__mockConnect
      const mockOn = (redisModule as any).__mockOn
      mockConnect.mockResolvedValue(undefined)

      // Spy on console.error
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const { getRedisClient } = await import('../../redis')
      await getRedisClient()

      // Get the error handler
      const errorHandler = mockOn.mock.calls[0][1]

      // When: Error event is emitted
      const testError = new Error('Test Redis error')
      errorHandler(testError)

      // Then: Error is logged
      expect(consoleErrorSpy).toHaveBeenCalledWith('Redis client error:', testError)
    })
  })
})
