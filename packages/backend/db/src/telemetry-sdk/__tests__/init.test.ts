/**
 * SDK Initialization Tests (INFR-0050 AC-8)
 * Test cases: INIT-001 through INIT-004
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { initTelemetrySdk, getSdkInstance } from '../init'

// Mock dependencies
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

vi.mock('../utils/flush-timer', () => ({
  startFlushTimer: vi.fn(() => 'timer-handle'),
  stopFlushTimer: vi.fn(),
}))

vi.mock('../batch-insert', () => ({
  insertWorkflowEventsBatch: vi.fn(() => Promise.resolve()),
}))

describe('SDK Initialization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset singleton by re-importing
    vi.resetModules()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('INIT-001: should initialize SDK with valid config', async () => {
    const sdk = initTelemetrySdk({ source: 'test-orchestrator' })

    expect(sdk).toBeDefined()
    expect(sdk.withStepTracking).toBeInstanceOf(Function)
    expect(sdk.withStateTracking).toBeInstanceOf(Function)
    expect(sdk.shutdown).toBeInstanceOf(Function)
    expect(sdk.flush).toBeInstanceOf(Function)
  })

  it('INIT-002: should start flush timer on initialization', async () => {
    const { startFlushTimer } = await import('../utils/flush-timer')
    const { initTelemetrySdk: initSdk } = await import('../init')

    initSdk({ source: 'test-orchestrator' })

    expect(startFlushTimer).toHaveBeenCalledWith(5000, expect.any(Function))
  })

  it('INIT-003: should return cached instance on subsequent calls (singleton)', async () => {
    const sdk1 = initTelemetrySdk({ source: 'test-orchestrator' })
    const sdk2 = initTelemetrySdk({ source: 'different-source' })

    expect(sdk1).toBe(sdk2) // Same instance
  })

  it('INIT-004: should cleanup on shutdown', async () => {
    const { stopFlushTimer } = await import('../utils/flush-timer')
    const sdk = initTelemetrySdk({ source: 'test-orchestrator' })

    await sdk.shutdown()

    expect(stopFlushTimer).toHaveBeenCalled()
    expect(getSdkInstance()).toBeNull()
  })
})
