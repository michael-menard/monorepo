import { describe, it, expect, beforeEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useUploadProgress } from '../useUploadProgress.js'

describe('useUploadProgress', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initialization', () => {
    it('should initialize with zero progress', () => {
      const { result } = renderHook(() => useUploadProgress())

      expect(result.current.progress.loaded).toBe(0)
      expect(result.current.progress.total).toBe(0)
      expect(result.current.progress.percentage).toBe(0)
    })

    it('should accept onProgressChange callback', () => {
      const onProgressChange = vi.fn()
      const { result } = renderHook(() => useUploadProgress({ onProgressChange }))

      expect(result.current.progress.loaded).toBe(0)
      expect(result.current.progress.total).toBe(0)
      expect(result.current.progress.percentage).toBe(0)
    })
  })

  describe('progress updates', () => {
    it('should update progress correctly', () => {
      const { result } = renderHook(() => useUploadProgress())

      act(() => {
        result.current.updateProgress(50, 100)
      })

      expect(result.current.progress.loaded).toBe(50)
      expect(result.current.progress.total).toBe(100)
      expect(result.current.progress.percentage).toBe(50)
    })

    it('should calculate percentage correctly', () => {
      const { result } = renderHook(() => useUploadProgress())

      act(() => {
        result.current.updateProgress(75, 100)
      })

      expect(result.current.progress.percentage).toBe(75)

      act(() => {
        result.current.updateProgress(0, 100)
      })

      expect(result.current.progress.percentage).toBe(0)

      act(() => {
        result.current.updateProgress(100, 100)
      })

      expect(result.current.progress.percentage).toBe(100)
    })

    it('should handle zero total gracefully', () => {
      const { result } = renderHook(() => useUploadProgress())

      act(() => {
        result.current.updateProgress(50, 0)
      })

      expect(result.current.progress.percentage).toBe(0)
    })

    it('should call onProgressChange callback', () => {
      const onProgressChange = vi.fn()
      const { result } = renderHook(() => useUploadProgress({ onProgressChange }))

      act(() => {
        result.current.updateProgress(30, 100)
      })

      expect(onProgressChange).toHaveBeenCalledWith({
        loaded: 30,
        total: 100,
        percentage: 30,
      })
    })
  })

  describe('reset functionality', () => {
    it('should reset progress to zero', () => {
      const { result } = renderHook(() => useUploadProgress())

      // Set some progress first
      act(() => {
        result.current.updateProgress(75, 100)
      })

      expect(result.current.progress.percentage).toBe(75)

      // Reset progress
      act(() => {
        result.current.resetProgress()
      })

      expect(result.current.progress.loaded).toBe(0)
      expect(result.current.progress.total).toBe(0)
      expect(result.current.progress.percentage).toBe(0)
    })

    it('should call onProgressChange when reset', () => {
      const onProgressChange = vi.fn()
      const { result } = renderHook(() => useUploadProgress({ onProgressChange }))

      act(() => {
        result.current.updateProgress(50, 100)
      })

      onProgressChange.mockClear()

      act(() => {
        result.current.resetProgress()
      })

      expect(onProgressChange).toHaveBeenCalledWith({
        loaded: 0,
        total: 0,
        percentage: 0,
      })
    })
  })
})
