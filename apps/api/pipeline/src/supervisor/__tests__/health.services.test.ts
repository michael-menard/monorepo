/**
 * Health Service Unit Tests
 *
 * Tests for getSupervisorHealth() and computeSupervisorStatus() pure functions.
 * No HTTP, no BullMQ — pure domain logic only.
 *
 * APIP-2030: AC-3, AC-4, AC-5
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { getSupervisorHealth, getLivenessStatus, computeSupervisorStatus } from '../health/services.js'
import type { HealthContext } from '../health/__types__/index.js'

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

const CLOSED_CBS = { elaboration: 'CLOSED' as const, storyCreation: 'CLOSED' as const }
const OPEN_CBS = { elaboration: 'OPEN' as const, storyCreation: 'OPEN' as const }

function makeCtx(overrides: Partial<HealthContext> = {}): HealthContext {
  return {
    draining: false,
    activeJobs: 0,
    circuitBreakerState: CLOSED_CBS,
    startTimeMs: Date.now() - 5000,
    ...overrides,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// computeSupervisorStatus
// ─────────────────────────────────────────────────────────────────────────────

describe('computeSupervisorStatus', () => {
  it('returns healthy when running normally', () => {
    expect(computeSupervisorStatus(makeCtx())).toBe('healthy')
  })

  it('returns draining when drain mode is active', () => {
    expect(computeSupervisorStatus(makeCtx({ draining: true }))).toBe('draining')
  })

  it('returns unhealthy when Redis is unreachable', () => {
    expect(computeSupervisorStatus(makeCtx({ redisReachable: false }))).toBe('unhealthy')
  })

  it('returns unhealthy even when also draining — unhealthy takes priority', () => {
    expect(
      computeSupervisorStatus(makeCtx({ draining: true, redisReachable: false })),
    ).toBe('unhealthy')
  })

  it('returns healthy when Redis is explicitly reachable', () => {
    expect(computeSupervisorStatus(makeCtx({ redisReachable: true }))).toBe('healthy')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getSupervisorHealth
// ─────────────────────────────────────────────────────────────────────────────

describe('getSupervisorHealth', () => {
  let startTimeMs: number

  beforeEach(() => {
    startTimeMs = Date.now() - 10_000
  })

  it('AC-3: returns full health shape with all required fields', () => {
    const ctx = makeCtx({ startTimeMs })
    const health = getSupervisorHealth(ctx)

    expect(health).toMatchObject({
      status: 'healthy',
      draining: false,
      activeJobs: 0,
      circuitBreakerState: CLOSED_CBS,
    })
    expect(health.uptimeMs).toBeGreaterThanOrEqual(0)
    expect(typeof health.uptimeMs).toBe('number')
  })

  it('AC-4: returns draining status and draining:true during drain', () => {
    const ctx = makeCtx({ draining: true, activeJobs: 1, startTimeMs })
    const health = getSupervisorHealth(ctx)

    expect(health.status).toBe('draining')
    expect(health.draining).toBe(true)
    expect(health.activeJobs).toBe(1)
  })

  it('returns unhealthy when Redis unreachable', () => {
    const ctx = makeCtx({ redisReachable: false, startTimeMs })
    const health = getSupervisorHealth(ctx)

    expect(health.status).toBe('unhealthy')
  })

  it('reports circuitBreakerState from context', () => {
    const ctx = makeCtx({ circuitBreakerState: OPEN_CBS, startTimeMs })
    const health = getSupervisorHealth(ctx)

    expect(health.circuitBreakerState).toEqual(OPEN_CBS)
  })

  it('computes positive uptimeMs', () => {
    const ctx = makeCtx({ startTimeMs })
    const health = getSupervisorHealth(ctx)

    expect(health.uptimeMs).toBeGreaterThan(0)
    expect(health.uptimeMs).toBeGreaterThanOrEqual(9000) // at least ~9s
  })

  it('returns zero uptimeMs if startTimeMs is in the future (clock skew safety)', () => {
    const ctx = makeCtx({ startTimeMs: Date.now() + 60_000 })
    const health = getSupervisorHealth(ctx)

    expect(health.uptimeMs).toBe(0)
  })

  it('reports activeJobs from context', () => {
    const ctx = makeCtx({ activeJobs: 3, startTimeMs })
    const health = getSupervisorHealth(ctx)

    expect(health.activeJobs).toBe(3)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// getLivenessStatus
// ─────────────────────────────────────────────────────────────────────────────

describe('getLivenessStatus', () => {
  it('AC-5: always returns { status: ok }', () => {
    expect(getLivenessStatus()).toEqual({ status: 'ok' })
  })
})
