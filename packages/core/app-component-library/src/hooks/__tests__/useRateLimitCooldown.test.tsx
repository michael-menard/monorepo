/**
 * BUGF-019: useRateLimitCooldown Tests
 * Comprehensive test suite for rate limit cooldown hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useRateLimitCooldown } from '../useRateLimitCooldown'

describe('useRateLimitCooldown', () => {
  // Create real sessionStorage implementation for tests
  const realSessionStorage: Storage = {
    length: 0,
    key: (index: number) => null,
    data: {} as Record<string, string>,
    getItem(key: string) {
      return this.data[key] || null
    },
    setItem(key: string, value: string) {
      this.data[key] = value
    },
    removeItem(key: string) {
      delete this.data[key]
    },
    clear() {
      this.data = {}
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    // Use real storage implementation
    Object.defineProperty(window, 'sessionStorage', {
      value: realSessionStorage,
      writable: true,
    })
    realSessionStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    realSessionStorage.clear()
  })

  const defaultParams = {
    storageKeyPrefix: 'test-prefix',
    baseCooldownSeconds: 60,
    maxCooldownSeconds: 600,
  }

  describe('Initialization', () => {
    it('should initialize with default values', () => {
      const { result } = renderHook(() => useRateLimitCooldown(defaultParams))

      expect(result.current.remainingSeconds).toBe(0)
      expect(result.current.canRetry).toBe(true)
      expect(result.current.attemptCount).toBe(0)
      expect(result.current.formattedTime).toBe('0:00')
    })

    it('should use default base cooldown when not provided', () => {
      const { result } = renderHook(() =>
        useRateLimitCooldown({ storageKeyPrefix: 'test' }),
      )

      act(() => {
        result.current.handleRateLimitError()
      })

      expect(result.current.remainingSeconds).toBe(60)
    })

    it('should use default max cooldown when not provided', () => {
      const { result } = renderHook(() =>
        useRateLimitCooldown({ storageKeyPrefix: 'test' }),
      )

      // Trigger many attempts to hit max cooldown
      for (let i = 0; i < 10; i++) {
        act(() => {
          result.current.handleRateLimitError()
        })
      }

      // Should be capped at 600 seconds
      expect(result.current.remainingSeconds).toBe(600)
    })

    it('should restore state from sessionStorage on mount', () => {
      // Pre-populate sessionStorage
      sessionStorage.setItem('test-prefix:attempts', '3')
      sessionStorage.setItem('test-prefix:lastAttempt', Date.now().toString())
      const cooldownUntil = Date.now() + 120000 // 120 seconds from now
      sessionStorage.setItem('test-prefix:cooldownUntil', cooldownUntil.toString())

      const { result } = renderHook(() => useRateLimitCooldown(defaultParams))

      expect(result.current.attemptCount).toBe(3)
      expect(result.current.remainingSeconds).toBe(120)
      expect(result.current.canRetry).toBe(false)
    })
  })

  describe('Exponential Backoff', () => {
    it('should apply exponential backoff on consecutive errors (attempt 1)', () => {
      const { result } = renderHook(() => useRateLimitCooldown(defaultParams))

      act(() => {
        result.current.handleRateLimitError()
      })

      // First attempt: 60 * 2^0 = 60 seconds
      expect(result.current.attemptCount).toBe(1)
      expect(result.current.remainingSeconds).toBe(60)
    })

    it('should apply exponential backoff on consecutive errors (attempt 2)', () => {
      const { result } = renderHook(() => useRateLimitCooldown(defaultParams))

      act(() => {
        result.current.handleRateLimitError()
      })
      act(() => {
        result.current.handleRateLimitError()
      })

      // Second attempt: 60 * 2^1 = 120 seconds
      expect(result.current.attemptCount).toBe(2)
      expect(result.current.remainingSeconds).toBe(120)
    })

    it('should apply exponential backoff on consecutive errors (attempt 3)', () => {
      const { result } = renderHook(() => useRateLimitCooldown(defaultParams))

      act(() => {
        result.current.handleRateLimitError()
      })
      act(() => {
        result.current.handleRateLimitError()
      })
      act(() => {
        result.current.handleRateLimitError()
      })

      // Third attempt: 60 * 2^2 = 240 seconds
      expect(result.current.attemptCount).toBe(3)
      expect(result.current.remainingSeconds).toBe(240)
    })

    it('should apply exponential backoff on consecutive errors (attempt 4)', () => {
      const { result } = renderHook(() => useRateLimitCooldown(defaultParams))

      act(() => {
        result.current.handleRateLimitError()
      })
      act(() => {
        result.current.handleRateLimitError()
      })
      act(() => {
        result.current.handleRateLimitError()
      })
      act(() => {
        result.current.handleRateLimitError()
      })

      // Fourth attempt: 60 * 2^3 = 480 seconds
      expect(result.current.attemptCount).toBe(4)
      expect(result.current.remainingSeconds).toBe(480)
    })

    it('should cap cooldown at maxCooldownSeconds', () => {
      const { result } = renderHook(() => useRateLimitCooldown(defaultParams))

      // Trigger enough attempts to exceed max cooldown
      for (let i = 0; i < 6; i++) {
        act(() => {
          result.current.handleRateLimitError()
        })
      }

      // Should be capped at 600 seconds
      expect(result.current.remainingSeconds).toBe(600)
      expect(result.current.attemptCount).toBe(6)
    })

    it('should use custom base and max cooldown values', () => {
      const { result } = renderHook(() =>
        useRateLimitCooldown({
          storageKeyPrefix: 'test',
          baseCooldownSeconds: 30,
          maxCooldownSeconds: 300,
        }),
      )

      act(() => {
        result.current.handleRateLimitError()
      })

      // First attempt with base 30: 30 * 2^0 = 30 seconds
      expect(result.current.remainingSeconds).toBe(30)

      // Trigger more attempts to hit custom max
      for (let i = 0; i < 5; i++) {
        act(() => {
          result.current.handleRateLimitError()
        })
      }

      // Should be capped at custom max 300 seconds
      expect(result.current.remainingSeconds).toBe(300)
    })
  })

  describe('Countdown Timer', () => {
    it('should count down by one second', () => {
      const { result } = renderHook(() => useRateLimitCooldown(defaultParams))

      act(() => {
        result.current.handleRateLimitError()
      })

      expect(result.current.remainingSeconds).toBe(60)

      // Advance timer by 1 second
      act(() => {
        vi.advanceTimersByTime(1000)
      })

      expect(result.current.remainingSeconds).toBe(59)
    })

    it('should count down to zero', () => {
      const { result } = renderHook(() =>
        useRateLimitCooldown({
          storageKeyPrefix: 'test',
          baseCooldownSeconds: 3,
        }),
      )

      act(() => {
        result.current.handleRateLimitError()
      })

      expect(result.current.remainingSeconds).toBe(3)
      expect(result.current.canRetry).toBe(false)

      // Advance timer by 3 seconds
      act(() => {
        vi.advanceTimersByTime(3000)
      })

      expect(result.current.remainingSeconds).toBe(0)
      expect(result.current.canRetry).toBe(true)
    })

    it('should not go below zero', () => {
      const { result } = renderHook(() =>
        useRateLimitCooldown({
          storageKeyPrefix: 'test',
          baseCooldownSeconds: 2,
        }),
      )

      act(() => {
        result.current.handleRateLimitError()
      })

      // Advance timer beyond cooldown duration
      act(() => {
        vi.advanceTimersByTime(5000)
      })

      expect(result.current.remainingSeconds).toBe(0)
      expect(result.current.canRetry).toBe(true)
    })

    it('should clean up timer on unmount', () => {
      const { result, unmount } = renderHook(() => useRateLimitCooldown(defaultParams))

      act(() => {
        result.current.handleRateLimitError()
      })

      expect(result.current.remainingSeconds).toBe(60)

      unmount()

      // Should not throw errors when timer tries to update after unmount
      act(() => {
        vi.advanceTimersByTime(1000)
      })
    })
  })

  describe('SessionStorage Persistence', () => {
    it('should store attempt count in sessionStorage', () => {
      const { result } = renderHook(() => useRateLimitCooldown(defaultParams))

      act(() => {
        result.current.handleRateLimitError()
      })

      expect(sessionStorage.getItem('test-prefix:attempts')).toBe('1')

      act(() => {
        result.current.handleRateLimitError()
      })

      expect(sessionStorage.getItem('test-prefix:attempts')).toBe('2')
    })

    it('should store last attempt timestamp in sessionStorage', () => {
      const { result } = renderHook(() => useRateLimitCooldown(defaultParams))

      const beforeTimestamp = Date.now()

      act(() => {
        result.current.handleRateLimitError()
      })

      const storedTimestamp = parseInt(
        sessionStorage.getItem('test-prefix:lastAttempt') || '0',
        10,
      )
      expect(storedTimestamp).toBeGreaterThanOrEqual(beforeTimestamp)
    })

    it('should store cooldown expiration in sessionStorage', () => {
      const { result } = renderHook(() => useRateLimitCooldown(defaultParams))

      const beforeTimestamp = Date.now()

      act(() => {
        result.current.handleRateLimitError()
      })

      const storedCooldownUntil = parseInt(
        sessionStorage.getItem('test-prefix:cooldownUntil') || '0',
        10,
      )
      const expectedCooldownUntil = beforeTimestamp + 60000 // 60 seconds

      // Allow for small timing differences
      expect(storedCooldownUntil).toBeGreaterThanOrEqual(expectedCooldownUntil - 100)
      expect(storedCooldownUntil).toBeLessThanOrEqual(expectedCooldownUntil + 100)
    })

    it('should persist across hook remounts', () => {
      const { result, unmount } = renderHook(() => useRateLimitCooldown(defaultParams))

      act(() => {
        result.current.handleRateLimitError()
      })
      act(() => {
        result.current.handleRateLimitError()
      })

      expect(result.current.attemptCount).toBe(2)

      unmount()

      // Remount hook
      const { result: newResult } = renderHook(() => useRateLimitCooldown(defaultParams))

      expect(newResult.current.attemptCount).toBe(2)
    })

    it('should clear sessionStorage when cooldown finishes', () => {
      const { result } = renderHook(() =>
        useRateLimitCooldown({
          storageKeyPrefix: 'test',
          baseCooldownSeconds: 2,
        }),
      )

      act(() => {
        result.current.handleRateLimitError()
      })

      expect(sessionStorage.getItem('test:cooldownUntil')).not.toBeNull()

      // Advance timer to finish cooldown
      act(() => {
        vi.advanceTimersByTime(2000)
      })

      expect(sessionStorage.getItem('test:cooldownUntil')).toBeNull()
      // Attempt count should persist
      expect(sessionStorage.getItem('test:attempts')).toBe('1')
    })
  })

  describe('clearCooldown', () => {
    it('should clear all sessionStorage keys', () => {
      const { result } = renderHook(() => useRateLimitCooldown(defaultParams))

      act(() => {
        result.current.handleRateLimitError()
      })

      expect(sessionStorage.getItem('test-prefix:attempts')).toBe('1')
      expect(sessionStorage.getItem('test-prefix:lastAttempt')).not.toBeNull()
      expect(sessionStorage.getItem('test-prefix:cooldownUntil')).not.toBeNull()

      act(() => {
        result.current.clearCooldown()
      })

      expect(sessionStorage.getItem('test-prefix:attempts')).toBeNull()
      expect(sessionStorage.getItem('test-prefix:lastAttempt')).toBeNull()
      expect(sessionStorage.getItem('test-prefix:cooldownUntil')).toBeNull()
    })

    it('should reset attempt count to zero', () => {
      const { result } = renderHook(() => useRateLimitCooldown(defaultParams))

      act(() => {
        result.current.handleRateLimitError()
      })
      act(() => {
        result.current.handleRateLimitError()
      })

      expect(result.current.attemptCount).toBe(2)

      act(() => {
        result.current.clearCooldown()
      })

      expect(result.current.attemptCount).toBe(0)
    })

    it('should reset remaining seconds to zero', () => {
      const { result } = renderHook(() => useRateLimitCooldown(defaultParams))

      act(() => {
        result.current.handleRateLimitError()
      })

      expect(result.current.remainingSeconds).toBe(60)

      act(() => {
        result.current.clearCooldown()
      })

      expect(result.current.remainingSeconds).toBe(0)
    })

    it('should allow retry after clearing', () => {
      const { result } = renderHook(() => useRateLimitCooldown(defaultParams))

      act(() => {
        result.current.handleRateLimitError()
      })

      expect(result.current.canRetry).toBe(false)

      act(() => {
        result.current.clearCooldown()
      })

      expect(result.current.canRetry).toBe(true)
    })
  })

  describe('Formatted Time', () => {
    it('should format zero seconds as 0:00', () => {
      const { result } = renderHook(() => useRateLimitCooldown(defaultParams))

      expect(result.current.formattedTime).toBe('0:00')
    })

    it('should format seconds with leading zeros', () => {
      const { result } = renderHook(() =>
        useRateLimitCooldown({
          storageKeyPrefix: 'test',
          baseCooldownSeconds: 5,
        }),
      )

      act(() => {
        result.current.handleRateLimitError()
      })

      expect(result.current.formattedTime).toBe('0:05')
    })

    it('should format minutes and seconds correctly', () => {
      const { result } = renderHook(() =>
        useRateLimitCooldown({
          storageKeyPrefix: 'test',
          baseCooldownSeconds: 125,
        }),
      )

      act(() => {
        result.current.handleRateLimitError()
      })

      expect(result.current.formattedTime).toBe('2:05')
    })

    it('should format large values correctly', () => {
      const { result } = renderHook(() => useRateLimitCooldown(defaultParams))

      // Trigger enough attempts to hit max cooldown (600 seconds)
      for (let i = 0; i < 6; i++) {
        act(() => {
          result.current.handleRateLimitError()
        })
      }

      expect(result.current.formattedTime).toBe('10:00')
    })
  })

  describe('canRetry Flag', () => {
    it('should be true when remainingSeconds is zero', () => {
      const { result } = renderHook(() => useRateLimitCooldown(defaultParams))

      expect(result.current.canRetry).toBe(true)
    })

    it('should be false when cooldown is active', () => {
      const { result } = renderHook(() => useRateLimitCooldown(defaultParams))

      act(() => {
        result.current.handleRateLimitError()
      })

      expect(result.current.canRetry).toBe(false)
    })

    it('should become true when countdown finishes', () => {
      const { result } = renderHook(() =>
        useRateLimitCooldown({
          storageKeyPrefix: 'test',
          baseCooldownSeconds: 2,
        }),
      )

      act(() => {
        result.current.handleRateLimitError()
      })

      expect(result.current.canRetry).toBe(false)

      act(() => {
        vi.advanceTimersByTime(2000)
      })

      expect(result.current.canRetry).toBe(true)
    })
  })

  describe('Multiple Storage Prefixes', () => {
    it('should isolate state between different prefixes', () => {
      const { result: result1 } = renderHook(() =>
        useRateLimitCooldown({
          storageKeyPrefix: 'prefix1',
          baseCooldownSeconds: 30,
        }),
      )

      const { result: result2 } = renderHook(() =>
        useRateLimitCooldown({
          storageKeyPrefix: 'prefix2',
          baseCooldownSeconds: 60,
        }),
      )

      act(() => {
        result1.current.handleRateLimitError()
      })

      expect(result1.current.attemptCount).toBe(1)
      expect(result1.current.remainingSeconds).toBe(30)
      expect(result2.current.attemptCount).toBe(0)
      expect(result2.current.remainingSeconds).toBe(0)

      act(() => {
        result2.current.handleRateLimitError()
      })

      expect(result1.current.attemptCount).toBe(1)
      expect(result2.current.attemptCount).toBe(1)
      expect(result2.current.remainingSeconds).toBe(60)
    })
  })
})
