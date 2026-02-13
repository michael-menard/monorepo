import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useDelayedShow } from '../useDelayedShow'

describe('useDelayedShow', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('with default delay (300ms)', () => {
    it('should return false initially when isActive is true', () => {
      const { result } = renderHook(() => useDelayedShow(true))

      expect(result.current).toBe(false)
    })

    it('should return true after default delay when isActive is true', () => {
      const { result } = renderHook(() => useDelayedShow(true))

      expect(result.current).toBe(false)

      act(() => {
        vi.advanceTimersByTime(300)
      })

      expect(result.current).toBe(true)
    })

    it('should remain false before delay completes', () => {
      const { result } = renderHook(() => useDelayedShow(true))

      act(() => {
        vi.advanceTimersByTime(299)
      })

      expect(result.current).toBe(false)
    })

    it('should return false when isActive is false', () => {
      const { result } = renderHook(() => useDelayedShow(false))

      expect(result.current).toBe(false)

      act(() => {
        vi.advanceTimersByTime(500)
      })

      expect(result.current).toBe(false)
    })
  })

  describe('with custom delay', () => {
    it('should respect custom delay of 100ms', () => {
      const { result } = renderHook(() => useDelayedShow(true, 100))

      expect(result.current).toBe(false)

      act(() => {
        vi.advanceTimersByTime(99)
      })

      expect(result.current).toBe(false)

      act(() => {
        vi.advanceTimersByTime(1)
      })

      expect(result.current).toBe(true)
    })

    it('should respect custom delay of 500ms', () => {
      const { result } = renderHook(() => useDelayedShow(true, 500))

      expect(result.current).toBe(false)

      act(() => {
        vi.advanceTimersByTime(499)
      })

      expect(result.current).toBe(false)

      act(() => {
        vi.advanceTimersByTime(1)
      })

      expect(result.current).toBe(true)
    })
  })

  describe('cancellation on fast navigation', () => {
    it('should not show if isActive becomes false before delay', () => {
      const { result, rerender } = renderHook(({ isActive }) => useDelayedShow(isActive), {
        initialProps: { isActive: true },
      })

      expect(result.current).toBe(false)

      // Fast navigation: completes before 300ms
      act(() => {
        vi.advanceTimersByTime(200)
      })

      expect(result.current).toBe(false)

      // Navigation completes
      rerender({ isActive: false })

      // Even after waiting, should still be false
      act(() => {
        vi.advanceTimersByTime(200)
      })

      expect(result.current).toBe(false)
    })

    it('should cancel timer and hide immediately when isActive becomes false', () => {
      const { result, rerender } = renderHook(({ isActive }) => useDelayedShow(isActive), {
        initialProps: { isActive: true },
      })

      // Wait for spinner to show
      act(() => {
        vi.advanceTimersByTime(300)
      })

      expect(result.current).toBe(true)

      // Navigation completes
      rerender({ isActive: false })

      expect(result.current).toBe(false)
    })
  })

  describe('multiple navigation cycles', () => {
    it('should handle rapid start/stop cycles', () => {
      const { result, rerender } = renderHook(({ isActive }) => useDelayedShow(isActive), {
        initialProps: { isActive: false },
      })

      // Cycle 1: fast navigation
      rerender({ isActive: true })

      act(() => {
        vi.advanceTimersByTime(100)
      })

      rerender({ isActive: false })
      expect(result.current).toBe(false)

      // Cycle 2: slow navigation
      rerender({ isActive: true })

      act(() => {
        vi.advanceTimersByTime(300)
      })

      expect(result.current).toBe(true)

      rerender({ isActive: false })
      expect(result.current).toBe(false)
    })

    it('should reset timer on re-activation', () => {
      const { result, rerender } = renderHook(({ isActive }) => useDelayedShow(isActive, 300), {
        initialProps: { isActive: true },
      })

      // Almost there
      act(() => {
        vi.advanceTimersByTime(250)
      })

      expect(result.current).toBe(false)

      // Stop and restart
      rerender({ isActive: false })
      rerender({ isActive: true })

      // Timer should have reset, so 250ms more shouldn't trigger
      act(() => {
        vi.advanceTimersByTime(250)
      })

      expect(result.current).toBe(false)

      // Need another 50ms
      act(() => {
        vi.advanceTimersByTime(50)
      })

      expect(result.current).toBe(true)
    })
  })

  describe('delay parameter changes', () => {
    it('should respond to delay changes', () => {
      const { result, rerender } = renderHook(
        ({ isActive, delayMs }) => useDelayedShow(isActive, delayMs),
        { initialProps: { isActive: true, delayMs: 300 } },
      )

      expect(result.current).toBe(false)

      // Change delay to 100ms
      rerender({ isActive: true, delayMs: 100 })

      act(() => {
        vi.advanceTimersByTime(100)
      })

      expect(result.current).toBe(true)
    })
  })

  describe('cleanup', () => {
    it('should clean up timer on unmount', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout')

      const { unmount } = renderHook(() => useDelayedShow(true))

      unmount()

      expect(clearTimeoutSpy).toHaveBeenCalled()

      clearTimeoutSpy.mockRestore()
    })
  })
})
