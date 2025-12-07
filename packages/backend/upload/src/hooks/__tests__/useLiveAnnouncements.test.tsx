/**
 * Story 3.1.17: useLiveAnnouncements Hook Tests
 *
 * Tests for live region announcements for screen readers.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useLiveAnnouncements, uploadAnnouncements } from '../useLiveAnnouncements.js'

describe('useLiveAnnouncements', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('initialization', () => {
    it('should initialize with empty announcement', () => {
      const { result } = renderHook(() => useLiveAnnouncements())

      expect(result.current.announcement).toBe('')
    })

    it('should provide announce and clear functions', () => {
      const { result } = renderHook(() => useLiveAnnouncements())

      expect(typeof result.current.announce).toBe('function')
      expect(typeof result.current.clear).toBe('function')
    })

    it('should provide getLiveRegionProps function', () => {
      const { result } = renderHook(() => useLiveAnnouncements())

      expect(typeof result.current.getLiveRegionProps).toBe('function')
    })
  })

  describe('announce', () => {
    it('should set announcement message', () => {
      const { result } = renderHook(() => useLiveAnnouncements())

      act(() => {
        result.current.announce('File added')
      })

      expect(result.current.announcement).toBe('File added')
    })

    it('should auto-clear after delay', () => {
      const { result } = renderHook(() => useLiveAnnouncements({ clearDelay: 1000 }))

      act(() => {
        result.current.announce('File added')
      })

      expect(result.current.announcement).toBe('File added')

      act(() => {
        vi.advanceTimersByTime(1000)
      })

      expect(result.current.announcement).toBe('')
    })

    it('should replace previous announcement', () => {
      const { result } = renderHook(() => useLiveAnnouncements())

      act(() => {
        result.current.announce('First message')
      })

      act(() => {
        result.current.announce('Second message')
      })

      expect(result.current.announcement).toBe('Second message')
    })
  })

  describe('clear', () => {
    it('should clear announcement immediately', () => {
      const { result } = renderHook(() => useLiveAnnouncements())

      act(() => {
        result.current.announce('File added')
      })

      act(() => {
        result.current.clear()
      })

      expect(result.current.announcement).toBe('')
    })
  })

  describe('getLiveRegionProps', () => {
    it('should return polite live region props by default', () => {
      const { result } = renderHook(() => useLiveAnnouncements())

      const props = result.current.getLiveRegionProps()

      expect(props.role).toBe('status')
      expect(props['aria-live']).toBe('polite')
      expect(props['aria-atomic']).toBe(true)
      expect(props.className).toBe('sr-only')
    })

    it('should return assertive live region props when configured', () => {
      const { result } = renderHook(() => useLiveAnnouncements({ politeness: 'assertive' }))

      const props = result.current.getLiveRegionProps()

      expect(props.role).toBe('alert')
      expect(props['aria-live']).toBe('assertive')
    })

    it('should include current announcement as children', () => {
      const { result } = renderHook(() => useLiveAnnouncements())

      act(() => {
        result.current.announce('Test message')
      })

      const props = result.current.getLiveRegionProps()
      expect(props.children).toBe('Test message')
    })
  })
})

describe('uploadAnnouncements', () => {
  describe('filesAdded', () => {
    it('should return singular message for 1 file', () => {
      expect(uploadAnnouncements.filesAdded(1)).toBe('1 file added')
    })

    it('should return plural message for multiple files', () => {
      expect(uploadAnnouncements.filesAdded(3)).toBe('3 files added')
    })
  })

  describe('fileRemoved', () => {
    it('should include file name', () => {
      expect(uploadAnnouncements.fileRemoved('photo.jpg')).toBe('photo.jpg removed')
    })
  })

  describe('uploadComplete', () => {
    it('should include file name', () => {
      expect(uploadAnnouncements.uploadComplete('photo.jpg')).toBe('photo.jpg upload complete')
    })
  })

  describe('uploadFailed', () => {
    it('should include file name', () => {
      expect(uploadAnnouncements.uploadFailed('photo.jpg')).toBe('photo.jpg upload failed')
    })
  })

  describe('allUploadsComplete', () => {
    it('should return singular message for 1 file', () => {
      expect(uploadAnnouncements.allUploadsComplete(1)).toBe('Upload complete')
    })

    it('should return plural message for multiple files', () => {
      expect(uploadAnnouncements.allUploadsComplete(5)).toBe('All 5 uploads complete')
    })
  })
})

