/**
 * Story 3.1.9: useUploaderSession Hook Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import React from 'react'
import { useUploaderSession } from '../useUploaderSession'
import { authSlice } from '@/store/slices/authSlice'

// Mock dependencies
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('@repo/app-component-library', () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn(),
  })),
}))

import { logger } from '@repo/logger'

describe('useUploaderSession', () => {
  let store: ReturnType<typeof configureStore>
  let mockLocalStorage: Record<string, string>

  const createMockStore = (authState: any) => {
    return configureStore({
      reducer: {
        auth: authSlice.reducer,
      },
      preloadedState: {
        auth: authState,
      },
    })
  }

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  )

  const defaultAuthState = {
    isAuthenticated: true,
    isLoading: false,
    user: { id: 'user-123', email: 'test@example.com' },
    tokens: null,
    error: null,
  }

  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    mockLocalStorage = {}

    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(key => mockLocalStorage[key] || null)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => {
      mockLocalStorage[key] = value
    })
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(key => {
      delete mockLocalStorage[key]
    })

    store = createMockStore(defaultAuthState)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  describe('initialization', () => {
    it('should initialize with empty session', () => {
      const { result } = renderHook(() => useUploaderSession({ route: '/instructions/new' }), {
        wrapper,
      })

      expect(result.current.session.title).toBe('')
      expect(result.current.session.description).toBe('')
      expect(result.current.session.files).toEqual([])
      expect(result.current.isDirty).toBe(false)
      expect(result.current.wasRestored).toBe(false)
    })

    it('should restore session from localStorage', () => {
      const savedSession = {
        version: 1,
        title: 'My MOC',
        description: 'A cool MOC',
        tags: ['space'],
        theme: 'space',
        step: 'files',
        files: [],
        updatedAt: Date.now(),
      }
      mockLocalStorage['uploader:/instructions/new:user-123'] = JSON.stringify(savedSession)

      const onRestore = vi.fn()
      const { result } = renderHook(
        () => useUploaderSession({ route: '/instructions/new', onRestore }),
        { wrapper },
      )

      expect(result.current.session.title).toBe('My MOC')
      expect(result.current.session.description).toBe('A cool MOC')
      expect(result.current.wasRestored).toBe(true)
      expect(onRestore).toHaveBeenCalled()
      expect(logger.info).toHaveBeenCalledWith(
        'Uploader session restored',
        expect.objectContaining({ route: '/instructions/new' }),
      )
    })
  })

  describe('updateSession', () => {
    it('should update session and mark as dirty', () => {
      const { result } = renderHook(() => useUploaderSession({ route: '/instructions/new' }), {
        wrapper,
      })

      act(() => {
        result.current.updateSession({ title: 'New Title' })
      })

      expect(result.current.session.title).toBe('New Title')
      expect(result.current.isDirty).toBe(true)
    })

    it('should debounce localStorage writes', () => {
      const { result } = renderHook(() => useUploaderSession({ route: '/instructions/new' }), {
        wrapper,
      })

      act(() => {
        result.current.updateSession({ title: 'Title 1' })
        result.current.updateSession({ title: 'Title 2' })
        result.current.updateSession({ title: 'Title 3' })
      })

      expect(mockLocalStorage['uploader:/instructions/new:user-123']).toBeUndefined()

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
      const { result } = renderHook(() => useUploaderSession({ route: '/instructions/new' }), {
        wrapper,
      })

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
      const { result } = renderHook(() => useUploaderSession({ route: '/instructions/new' }), {
        wrapper,
      })

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
  })

  describe('reset', () => {
    it('should reset session to empty state', () => {
      const { result } = renderHook(() => useUploaderSession({ route: '/instructions/new' }), {
        wrapper,
      })

      act(() => {
        result.current.updateSession({ title: 'Test Title' })
        vi.advanceTimersByTime(350)
      })

      expect(mockLocalStorage['uploader:/instructions/new:user-123']).toBeDefined()

      act(() => {
        result.current.reset()
      })

      expect(result.current.session.title).toBe('')
      expect(result.current.isDirty).toBe(false)
      expect(mockLocalStorage['uploader:/instructions/new:user-123']).toBeUndefined()
    })
  })

  describe('anonymous users', () => {
    it('should use anonymous session ID for storage key when not authenticated', () => {
      store = createMockStore({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        tokens: null,
        error: null,
      })

      const { result } = renderHook(() => useUploaderSession({ route: '/instructions/new' }), {
        wrapper,
      })

      // Update session to trigger save
      act(() => {
        result.current.updateSession({ title: 'Test' })
      })

      act(() => {
        vi.advanceTimersByTime(350)
      })

      // Should have saved with anon session ID in key
      const keys = Object.keys(mockLocalStorage)
      const uploaderKey = keys.find(k => k.startsWith('uploader:/instructions/new:anon-'))
      expect(uploaderKey).toBeDefined()
    })
  })
})
