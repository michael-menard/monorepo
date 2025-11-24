/**
 * Database Client Integration Tests
 *
 * Tests the integration between our database client and Drizzle ORM.
 * Mocks the PostgreSQL Pool but tests our client configuration.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { Pool } from 'pg'

// Mock pg Pool before importing client
vi.mock('pg', () => {
  const mockQuery = vi.fn()
  const mockEnd = vi.fn()
  const mockOn = vi.fn()

  const MockPool = vi.fn(() => ({
    query: mockQuery,
    end: mockEnd,
    on: mockOn,
  }))

  return {
    Pool: MockPool,
    __mockQuery: mockQuery,
    __mockEnd: mockEnd,
    __mockOn: mockOn,
  }
})

describe('Database Client Integration', () => {
  beforeEach(() => {
    // Set up environment for database connection
    process.env.POSTGRES_HOST = 'localhost'
    process.env.POSTGRES_PORT = '5432'
    process.env.POSTGRES_DATABASE = 'test_db'
    process.env.POSTGRES_USERNAME = 'test_user'
    process.env.POSTGRES_PASSWORD = 'test_password'
    process.env.NODE_ENV = 'development'

    vi.clearAllMocks()
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Connection Pool Configuration', () => {
    it('should create pool with correct configuration', async () => {
      // Given: Environment variables are set
      // When: Importing and using the database client
      const { testConnection } = await import('../../client')

      // Mock successful query
      const pgModule = await import('pg')
      const mockQuery = (pgModule as any).__mockQuery
      mockQuery.mockResolvedValue({ rows: [{ health_check: 1 }] })

      await testConnection()

      // Then: Pool is created with correct settings
      expect(Pool).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'localhost',
          port: 5432,
          user: 'test_user',
          password: 'test_password',
          database: 'test_db',
          max: 1, // Serverless-optimized
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 5000,
          ssl: false, // Development environment
        })
      )
    })

    it('should enable SSL in production environment', async () => {
      // Given: Production environment
      process.env.NODE_ENV = 'production'

      // When: Importing database client
      const { testConnection } = await import('../../client')

      // Mock successful query
      const pgModule = await import('pg')
      const mockQuery = (pgModule as any).__mockQuery
      mockQuery.mockResolvedValue({ rows: [{ health_check: 1 }] })

      await testConnection()

      // Then: SSL is enabled
      expect(Pool).toHaveBeenCalledWith(
        expect.objectContaining({
          ssl: { rejectUnauthorized: false },
        })
      )
    })

    it('should register error handler on pool', async () => {
      // Given: Database client is imported
      const { testConnection } = await import('../../client')

      // Mock successful query
      const pgModule = await import('pg')
      const mockQuery = (pgModule as any).__mockQuery
      const mockOn = (pgModule as any).__mockOn
      mockQuery.mockResolvedValue({ rows: [{ health_check: 1 }] })

      // When: Pool is created
      await testConnection()

      // Then: Error handler is registered
      expect(mockOn).toHaveBeenCalledWith('error', expect.any(Function))
    })
  })

  describe('Connection Testing', () => {
    it('should return true when connection is successful', async () => {
      // Given: Database connection is healthy
      const pgModule = await import('pg')
      const mockQuery = (pgModule as any).__mockQuery
      mockQuery.mockResolvedValue({ rows: [{ health_check: 1 }] })

      // When: Testing connection
      const { testConnection } = await import('../../client')
      const result = await testConnection()

      // Then: Returns true
      expect(result).toBe(true)
      expect(mockQuery).toHaveBeenCalledWith('SELECT 1 as health_check')
    })

    it('should return false when connection fails', async () => {
      // Given: Database connection fails
      const pgModule = await import('pg')
      const mockQuery = (pgModule as any).__mockQuery
      mockQuery.mockRejectedValue(new Error('Connection refused'))

      // Spy on console.error to suppress error output
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // When: Testing connection
      const { testConnection } = await import('../../client')
      const result = await testConnection()

      // Then: Returns false and logs error
      expect(result).toBe(false)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Database connection test failed:',
        expect.any(Error)
      )
    })

    it('should handle malformed query response', async () => {
      // Given: Query returns unexpected structure
      const pgModule = await import('pg')
      const mockQuery = (pgModule as any).__mockQuery
      mockQuery.mockResolvedValue({ rows: [] })

      // When: Testing connection
      const { testConnection } = await import('../../client')
      const result = await testConnection()

      // Then: Returns false (health_check !== 1)
      expect(result).toBe(false)
    })
  })

  describe('Connection Pool Lifecycle', () => {
    it('should reuse existing pool on subsequent calls', async () => {
      // Given: Pool has been created
      const pgModule = await import('pg')
      const mockQuery = (pgModule as any).__mockQuery
      mockQuery.mockResolvedValue({ rows: [{ health_check: 1 }] })

      const { testConnection } = await import('../../client')

      // When: testConnection is called multiple times
      await testConnection()
      await testConnection()
      await testConnection()

      // Then: Pool is only created once
      expect(Pool).toHaveBeenCalledTimes(1)
      expect(mockQuery).toHaveBeenCalledTimes(3)
    })

    it('should close pool successfully', async () => {
      // Given: Pool is created
      const pgModule = await import('pg')
      const mockQuery = (pgModule as any).__mockQuery
      const mockEnd = (pgModule as any).__mockEnd
      mockQuery.mockResolvedValue({ rows: [{ health_check: 1 }] })
      mockEnd.mockResolvedValue(undefined)

      const { testConnection, closePool } = await import('../../client')
      await testConnection()

      // When: Closing pool
      await closePool()

      // Then: Pool.end() is called
      expect(mockEnd).toHaveBeenCalled()
    })

    it('should handle closePool when pool is not initialized', async () => {
      // Given: Pool has never been created
      // When: Calling closePool
      const { closePool } = await import('../../client')

      // Then: Does not throw
      await expect(closePool()).resolves.toBeUndefined()
    })
  })

  describe('Drizzle ORM Integration', () => {
    it('should export Drizzle db instance', async () => {
      // Given: Database client is imported
      const { db } = await import('../../client')

      // Then: db is exported and has Drizzle methods
      expect(db).toBeDefined()
      expect(db.select).toBeDefined()
      expect(db.insert).toBeDefined()
      expect(db.update).toBeDefined()
      expect(db.delete).toBeDefined()
    })
  })
})
