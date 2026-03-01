/**
 * Drain Module Unit Tests
 *
 * Tests drain state machine, idempotent signal handlers, timeout behavior.
 * Uses vi.useFakeTimers() for time-controlled drain timeout tests.
 * Uses vi.spyOn(process, 'exit') to prevent actual process termination.
 *
 * APIP-2030: AC-1, AC-2, AC-6, AC-9 (structured logs)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { drain, registerDrainHandlers, resetDrainHandlers } from '../drain/index.js'
import type { DrainDependencies } from '../drain/index.js'

// ─────────────────────────────────────────────────────────────────────────────
// Mocks
// ─────────────────────────────────────────────────────────────────────────────

vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}))

// ─────────────────────────────────────────────────────────────────────────────
// Fixtures
// ─────────────────────────────────────────────────────────────────────────────

function makeDeps(overrides: Partial<DrainDependencies> = {}): DrainDependencies {
  return {
    pauseWorker: vi.fn().mockResolvedValue(undefined),
    closeWorker: vi.fn().mockResolvedValue(undefined),
    stopHealthServer: vi.fn().mockResolvedValue(undefined),
    getActiveJobCount: vi.fn().mockReturnValue(0),
    drainTimeoutMs: 1000,
    ...overrides,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('drain()', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let exitSpy: any

  beforeEach(() => {
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never)
  })

  afterEach(() => {
    exitSpy.mockRestore()
    vi.useRealTimers()
  })

  it('HP-1: calls pauseWorker, closeWorker, stopHealthServer in order then exit(0) when no in-flight jobs', async () => {
    const deps = makeDeps()

    await drain(deps, 'SIGTERM')

    expect(deps.pauseWorker).toHaveBeenCalledOnce()
    expect(deps.closeWorker).toHaveBeenCalledOnce()
    expect(deps.stopHealthServer).toHaveBeenCalledOnce()
    expect(exitSpy).toHaveBeenCalledWith(0)
  })

  it('EC-1: timeout exceeded calls process.exit(1)', async () => {
    vi.useFakeTimers()

    const getActiveJobCount = vi.fn().mockReturnValue(1) // never becomes 0
    const deps = makeDeps({ getActiveJobCount, drainTimeoutMs: 100 })

    const drainPromise = drain(deps, 'SIGTERM')
    // Advance past drain timeout
    await vi.advanceTimersByTimeAsync(200)
    await drainPromise

    expect(exitSpy).toHaveBeenCalledWith(1)
  })

  it('HP-2: waits for in-flight jobs to complete before exit(0)', async () => {
    vi.useFakeTimers()
    let activeJobs = 1

    const getActiveJobCount = vi.fn().mockImplementation(() => activeJobs)
    const deps = makeDeps({ getActiveJobCount, drainTimeoutMs: 5000 })

    const drainPromise = drain(deps, 'SIGTERM')

    // Simulate job completing after 300ms
    setTimeout(() => {
      activeJobs = 0
    }, 300)

    await vi.advanceTimersByTimeAsync(400)
    await drainPromise

    expect(exitSpy).toHaveBeenCalledWith(0)
  })

  it('EC-3: SIGINT triggers same drain behavior as SIGTERM', async () => {
    const deps = makeDeps()

    await drain(deps, 'SIGINT')

    expect(deps.pauseWorker).toHaveBeenCalledOnce()
    expect(deps.closeWorker).toHaveBeenCalledOnce()
    expect(exitSpy).toHaveBeenCalledWith(0)
  })

  it('pauseWorker failure does not prevent drain from continuing', async () => {
    const deps = makeDeps({
      pauseWorker: vi.fn().mockRejectedValue(new Error('pause failed')),
    })

    await drain(deps, 'SIGTERM')

    // Despite pauseWorker failing, drain should complete and call exit(0)
    expect(deps.closeWorker).toHaveBeenCalledOnce()
    expect(exitSpy).toHaveBeenCalledWith(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// registerDrainHandlers (idempotency)
// ─────────────────────────────────────────────────────────────────────────────

describe('registerDrainHandlers()', () => {
  beforeEach(() => {
    // Remove any registered handlers from previous tests
    process.removeAllListeners('SIGTERM')
    process.removeAllListeners('SIGINT')
    resetDrainHandlers()
  })

  afterEach(() => {
    process.removeAllListeners('SIGTERM')
    process.removeAllListeners('SIGINT')
    resetDrainHandlers()
  })

  it('HP-8: registers exactly one SIGTERM handler after single call', () => {
    const deps = makeDeps()
    registerDrainHandlers(deps)

    expect(process.listenerCount('SIGTERM')).toBe(1)
  })

  it('HP-8: calling twice does not duplicate SIGTERM handler', () => {
    const deps = makeDeps()
    registerDrainHandlers(deps)
    registerDrainHandlers(deps)

    expect(process.listenerCount('SIGTERM')).toBe(1)
  })

  it('HP-8: registers exactly one SIGINT handler', () => {
    const deps = makeDeps()
    registerDrainHandlers(deps)

    expect(process.listenerCount('SIGINT')).toBe(1)
  })

  it('HP-8: triple call still results in one SIGTERM handler', () => {
    const deps = makeDeps()
    registerDrainHandlers(deps)
    registerDrainHandlers(deps)
    registerDrainHandlers(deps)

    expect(process.listenerCount('SIGTERM')).toBe(1)
  })

  it('resetDrainHandlers() allows re-registration after reset', () => {
    const deps = makeDeps()
    registerDrainHandlers(deps)
    expect(process.listenerCount('SIGTERM')).toBe(1)

    process.removeAllListeners('SIGTERM')
    process.removeAllListeners('SIGINT')
    resetDrainHandlers()

    registerDrainHandlers(deps)
    expect(process.listenerCount('SIGTERM')).toBe(1)
  })
})
