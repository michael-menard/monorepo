/**
 * Unit tests for health check core logic
 * Tests platform-agnostic business logic with mock dependencies
 */

import { describe, it, expect, vi } from 'vitest'
import { performHealthCheck, determineHealthStatus } from '../health-check'
import type { HealthCheckDeps } from '../__types__'

describe('performHealthCheck', () => {
  it('returns healthy status when PostgreSQL is connected', async () => {
    const deps: HealthCheckDeps = {
      testPostgresConnection: vi.fn().mockResolvedValue(true),
    }

    const result = await performHealthCheck(deps, '1.0.0')

    expect(result.status).toBe('healthy')
    expect(result.services.postgres).toBe('connected')
    expect(result.services.opensearch).toBe('not_monitored')
    expect(result.version).toBe('1.0.0')
    expect(result.timestamp).toBeDefined()
    expect(deps.testPostgresConnection).toHaveBeenCalledOnce()
  })

  it('returns unhealthy status when PostgreSQL is disconnected', async () => {
    const deps: HealthCheckDeps = {
      testPostgresConnection: vi.fn().mockResolvedValue(false),
    }

    const result = await performHealthCheck(deps, '1.0.0')

    expect(result.status).toBe('unhealthy')
    expect(result.services.postgres).toBe('disconnected')
    expect(result.services.opensearch).toBe('not_monitored')
    expect(result.version).toBe('1.0.0')
    expect(result.timestamp).toBeDefined()
  })

  it('uses default version when not provided', async () => {
    const deps: HealthCheckDeps = {
      testPostgresConnection: vi.fn().mockResolvedValue(true),
    }

    const result = await performHealthCheck(deps)

    expect(result.version).toBe('1.0.0')
  })

  it('includes ISO 8601 timestamp', async () => {
    const deps: HealthCheckDeps = {
      testPostgresConnection: vi.fn().mockResolvedValue(true),
    }

    const result = await performHealthCheck(deps)

    // Validate ISO 8601 format
    expect(() => new Date(result.timestamp)).not.toThrow()
    expect(result.timestamp).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
    )
  })

  it('handles connection test errors by propagating them', async () => {
    const deps: HealthCheckDeps = {
      testPostgresConnection: vi.fn().mockRejectedValue(new Error('Connection failed')),
    }

    await expect(performHealthCheck(deps)).rejects.toThrow('Connection failed')
  })
})

describe('determineHealthStatus', () => {
  it('returns healthy when PostgreSQL is connected', () => {
    expect(determineHealthStatus(true)).toBe('healthy')
  })

  it('returns unhealthy when PostgreSQL is disconnected', () => {
    expect(determineHealthStatus(false)).toBe('unhealthy')
  })
})
