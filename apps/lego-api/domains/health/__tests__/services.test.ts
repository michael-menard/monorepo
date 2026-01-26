import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getLivenessStatus,
  getReadinessStatus,
  getHealthStatus,
  getApiInfo,
} from '../services.js'

/**
 * Health Service Unit Tests
 *
 * Tests health check business logic.
 */

// Mock the testConnection from api-core
vi.mock('@repo/api-core', () => ({
  testConnection: vi.fn(),
}))

import { testConnection } from '@repo/api-core'

describe('Health Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getLivenessStatus', () => {
    it('returns ok status', () => {
      const result = getLivenessStatus()

      expect(result).toEqual({ status: 'ok' })
    })
  })

  describe('getReadinessStatus', () => {
    it('returns ready when database is connected', async () => {
      vi.mocked(testConnection).mockResolvedValue(true)

      const result = await getReadinessStatus()

      expect(result.status).toBe('ready')
      expect(result.checks.database).toBe('ok')
    })

    it('returns not_ready when database is disconnected', async () => {
      vi.mocked(testConnection).mockResolvedValue(false)

      const result = await getReadinessStatus()

      expect(result.status).toBe('not_ready')
      expect(result.checks.database).toBe('error')
    })

    it('returns not_ready when database check throws', async () => {
      vi.mocked(testConnection).mockRejectedValue(new Error('Connection failed'))

      const result = await getReadinessStatus()

      expect(result.status).toBe('not_ready')
      expect(result.checks.database).toBe('error')
    })
  })

  describe('getHealthStatus', () => {
    it('returns healthy when database is connected', async () => {
      vi.mocked(testConnection).mockResolvedValue(true)

      const result = await getHealthStatus()

      expect(result.status).toBe('healthy')
      expect(result.services.database).toBe('connected')
      expect(result.version).toBeDefined()
      expect(result.environment).toBeDefined()
      expect(result.timestamp).toBeDefined()
    })

    it('returns degraded when database is disconnected', async () => {
      vi.mocked(testConnection).mockResolvedValue(false)

      const result = await getHealthStatus()

      expect(result.status).toBe('degraded')
      expect(result.services.database).toBe('disconnected')
    })

    it('returns degraded when database check throws', async () => {
      vi.mocked(testConnection).mockRejectedValue(new Error('Connection failed'))

      const result = await getHealthStatus()

      expect(result.status).toBe('degraded')
      expect(result.services.database).toBe('disconnected')
    })

    it('includes valid ISO timestamp', async () => {
      vi.mocked(testConnection).mockResolvedValue(true)

      const result = await getHealthStatus()

      expect(() => new Date(result.timestamp)).not.toThrow()
    })
  })

  describe('getApiInfo', () => {
    it('returns API information', () => {
      const result = getApiInfo()

      expect(result.name).toBe('lego-api')
      expect(result.version).toBeDefined()
      expect(result.environment).toBeDefined()
    })
  })
})
