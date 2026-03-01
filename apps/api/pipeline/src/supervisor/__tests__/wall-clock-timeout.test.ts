/**
 * Unit tests for WallClockTimeoutError and withWallClockTimeout().
 *
 * AC-10b: Wall clock timeout path triggers 'failed' + log event.
 *
 * Uses vi.useFakeTimers() per test plan guidance.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { WallClockTimeoutError, withWallClockTimeout } from '../wall-clock-timeout.js'

describe('WallClockTimeoutError', () => {
  it('is an instance of Error', () => {
    const err = new WallClockTimeoutError(600_000, 'elaboration')
    expect(err).toBeInstanceOf(Error)
    expect(err).toBeInstanceOf(WallClockTimeoutError)
  })

  it('stores timeoutMs and stage', () => {
    const err = new WallClockTimeoutError(10_000, 'story-creation')
    expect(err.timeoutMs).toBe(10_000)
    expect(err.stage).toBe('story-creation')
  })

  it('has the correct name', () => {
    const err = new WallClockTimeoutError(100, 'elaboration')
    expect(err.name).toBe('WallClockTimeoutError')
  })

  it('message includes timeout and stage', () => {
    const err = new WallClockTimeoutError(5000, 'elaboration')
    expect(err.message).toContain('5000ms')
    expect(err.message).toContain('elaboration')
  })
})

describe('withWallClockTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('resolves with the promise value if it completes within timeout', async () => {
    const promise = Promise.resolve('success')
    const result = await withWallClockTimeout(promise, 1000, 'elaboration')
    expect(result).toBe('success')
  })

  it('rejects with WallClockTimeoutError when timeout fires before promise resolves', async () => {
    // A promise that never resolves
    const neverResolves = new Promise<never>(() => {
      /* intentionally hangs */
    })

    const racePromise = withWallClockTimeout(neverResolves, 100, 'elaboration')

    // Advance fake timers past the timeout
    vi.advanceTimersByTime(200)

    await expect(racePromise).rejects.toThrow(WallClockTimeoutError)
  })

  it('rejects with WallClockTimeoutError carrying correct stage', async () => {
    const neverResolves = new Promise<never>(() => {
      /* intentionally hangs */
    })

    const racePromise = withWallClockTimeout(neverResolves, 100, 'story-creation')
    vi.advanceTimersByTime(200)

    await expect(racePromise).rejects.toSatisfy(
      (e: unknown) => e instanceof WallClockTimeoutError && e.stage === 'story-creation',
    )
  })

  it('rejects with WallClockTimeoutError carrying correct timeoutMs', async () => {
    const neverResolves = new Promise<never>(() => {
      /* intentionally hangs */
    })

    const racePromise = withWallClockTimeout(neverResolves, 250, 'elaboration')
    vi.advanceTimersByTime(300)

    await expect(racePromise).rejects.toSatisfy(
      (e: unknown) => e instanceof WallClockTimeoutError && e.timeoutMs === 250,
    )
  })

  it('propagates rejection from promise if it rejects before timeout', async () => {
    const rejectingPromise = Promise.reject(new Error('graph error'))

    // Need to suppress unhandled rejection for the raw promise
    rejectingPromise.catch(() => {
      /* suppress */
    })

    await expect(
      withWallClockTimeout(rejectingPromise, 10_000, 'elaboration'),
    ).rejects.toThrow('graph error')
  })
})
