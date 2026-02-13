/**
 * Story 3.1.9: useUploaderSession Hook Tests
 * Story REPA-003: Migrate Upload Hooks to @repo/upload
 *
 * Tests for session persistence, restoration, expiry, and anonymous→authenticated migration.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useUploaderSession } from '../useUploaderSession'

// Mock dependencies
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

const mockToast = vi.fn()
vi.mock('@repo/app-component-library', () => ({
  useToast: vi.fn(() => ({
    toast: mockToast,
  })),
}))

import { logger } from '@repo/logger'

describe('useUploaderSession', () => {
  let mockLocalStorage: Record<string, string>

  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    mockLocalStorage = {}
    mockToast.mockClear()

    vi.spyOn(localStorage, 'getItem').mockImplementation(key => mockLocalStorage[key] || null)
    vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
      mockLocalStorage[key] = value
    })
    vi.spyOn(localStorage, 'removeItem').mockImplementation(key => {
      delete mockLocalStorage[key]
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('initialization - authenticated mode', () => {
    it('should initialize with empty session for authenticated user', () => {
      const { result } = renderHook(() =>
        useUploaderSession({
          route: '/instructions/new',
          isAuthenticated: true,
          userId: 'user-123',
        }),
      )

      expect(result.current.session.title).toBe('')
      expect(result.current.session.description).toBe('')
      expect(result.current.session.files).toEqual([])
      expect(result.current.isDirty).toBe(false)
      expect(result.current.wasRestored).toBe(false)
    })

    it('should use correct storage key format for authenticated user', () => {
      const { result } = renderHook(() =>
        useUploaderSession({
          route: '/instructions/new',
          isAuthenticated: true,
          userId: 'user-123',
        }),
      )

      act(() => {
        result.current.updateSession({ title: 'Test Title' })
      })

      act(() => {
        vi.advanceTimersByTime(350)
      })

      expect(mockLocalStorage['uploader:/instructions/new:user-123']).toBeDefined()
    })
  })

  describe('initialization - anonymous mode', () => {
    it('should initialize with empty session for anonymous user', () => {
      const { result } = renderHook(() =>
        useUploaderSession({
          route: '/instructions/new',
          isAuthenticated: false,
        }),
      )

      expect(result.current.session.title).toBe('')
      expect(result.current.session.files).toEqual([])
      expect(result.current.isDirty).toBe(false)
      expect(result.current.wasRestored).toBe(false)
    })
  })

  describe('updateSession', () => {
    it('should update session and mark as dirty', () => {
      const { result } = renderHook(() =>
        useUploaderSession({
          route: '/instructions/new',
          isAuthenticated: true,
          userId: 'user-123',
        }),
      )

      act(() => {
        result.current.updateSession({ title: 'New Title' })
      })

      expect(result.current.session.title).toBe('New Title')
      expect(result.current.isDirty).toBe(true)
    })

    it('should debounce localStorage writes (300ms)', () => {
      const { result } = renderHook(() =>
        useUploaderSession({
          route: '/instructions/new',
          isAuthenticated: true,
          userId: 'user-123',
        }),
      )

      act(() => {
        result.current.updateSession({ title: 'Title 1' })
        result.current.updateSession({ title: 'Title 2' })
        result.current.updateSession({ title: 'Title 3' })
      })

      // Before debounce delay - no save yet
      expect(mockLocalStorage['uploader:/instructions/new:user-123']).toBeUndefined()

      // After debounce delay - should save latest
      act(() => {
        vi.advanceTimersByTime(350)
      })

      expect(mockLocalStorage['uploader:/instructions/new:user-123']).toBeDefined()
      const saved = JSON.parse(mockLocalStorage['uploader:/instructions/new:user-123'])
      expect(saved.title).toBe('Title 3')
    })
  })

  describe('file operations', () => {
    it('should add files to session', () => {
      const { result } = renderHook(() =>
        useUploaderSession({
          route: '/instructions/new',
          isAuthenticated: true,
          userId: 'user-123',
        }),
      )

      act(() => {
        result.current.addFiles([
          {
            name: 'test.pdf',
            size: 1000,
            type: 'application/pdf',
            lastModified: Date.now(),
            fileType: 'instruction',
            uploadStatus: 'pending',
          },
        ])
      })

      expect(result.current.session.files).toHaveLength(1)
      expect(result.current.session.files[0].name).toBe('test.pdf')
    })

    it('should remove file from session', () => {
      const { result } = renderHook(() =>
        useUploaderSession({
          route: '/instructions/new',
          isAuthenticated: true,
          userId: 'user-123',
        }),
      )

      act(() => {
        result.current.addFiles([
          {
            name: 'test1.pdf',
            size: 1000,
            type: 'application/pdf',
            lastModified: Date.now(),
            fileType: 'instruction',
            uploadStatus: 'pending',
          },
          {
            name: 'test2.pdf',
            size: 2000,
            type: 'application/pdf',
            lastModified: Date.now(),
            fileType: 'instruction',
            uploadStatus: 'pending',
          },
        ])
      })

      act(() => {
        result.current.removeFile(0)
      })

      expect(result.current.session.files).toHaveLength(1)
      expect(result.current.session.files[0].name).toBe('test2.pdf')
    })

    it('should update a specific file', () => {
      const { result } = renderHook(() =>
        useUploaderSession({
          route: '/instructions/new',
          isAuthenticated: true,
          userId: 'user-123',
        }),
      )

      act(() => {
        result.current.addFiles([
          {
            name: 'test.pdf',
            size: 1000,
            type: 'application/pdf',
            lastModified: Date.now(),
            fileType: 'instruction',
            uploadStatus: 'pending',
          },
        ])
      })

      act(() => {
        result.current.updateFile(0, { uploadStatus: 'completed' })
      })

      expect(result.current.session.files[0].uploadStatus).toBe('completed')
    })
  })

  describe('reset and clear operations', () => {
    it('should reset session to empty state', () => {
      const { result } = renderHook(() =>
        useUploaderSession({
          route: '/instructions/new',
          isAuthenticated: true,
          userId: 'user-123',
        }),
      )

      act(() => {
        result.current.updateSession({ title: 'My Session' })
      })

      act(() => {
        result.current.reset()
      })

      expect(result.current.session.title).toBe('')
      expect(result.current.isDirty).toBe(false)
      expect(result.current.wasRestored).toBe(false)
      expect(mockLocalStorage['uploader:/instructions/new:user-123']).toBeUndefined()
    })

    it('should clear session (alias for reset)', () => {
      const { result } = renderHook(() =>
        useUploaderSession({
          route: '/instructions/new',
          isAuthenticated: true,
          userId: 'user-123',
        }),
      )

      act(() => {
        result.current.updateSession({ title: 'My Session' })
      })

      act(() => {
        result.current.clear()
      })

      expect(result.current.session.title).toBe('')
    })

    it('should mark session as finalized', () => {
      const { result } = renderHook(() =>
        useUploaderSession({
          route: '/instructions/new',
          isAuthenticated: true,
          userId: 'user-123',
        }),
      )

      act(() => {
        result.current.updateSession({ title: 'My Session' })
      })

      act(() => {
        result.current.markFinalized()
      })

      expect(result.current.session.title).toBe('')
      expect(logger.info).toHaveBeenCalledWith(
        'Uploader session finalized',
        expect.objectContaining({ route: '/instructions/new' }),
      )
    })
  })

  describe('step management', () => {
    it('should set current step', () => {
      const { result } = renderHook(() =>
        useUploaderSession({
          route: '/instructions/new',
          isAuthenticated: true,
          userId: 'user-123',
        }),
      )

      act(() => {
        result.current.setStep('files')
      })

      expect(result.current.session.step).toBe('files')

      act(() => {
        result.current.setStep('details')
      })

      expect(result.current.session.step).toBe('details')
    })
  })
})
