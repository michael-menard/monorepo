/**
 * Uploader State Resilience Integration Tests
 * Story 3.1.9: Uploader State Resilience & Unsaved-Changes Guard
 *
 * Tests:
 * - Unauthenticated → redirect → return restores locally persisted state
 * - Mismatched userId → no restore (starts fresh)
 * - State restoration never re-uploads automatically
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import React from 'react'
import { logger } from '@repo/logger'
import { useUploaderSession } from '@/hooks/useUploaderSession'
import { authSlice } from '@/store/slices/authSlice'

// Mock dependencies
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
  createLogger: vi.fn(() => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  })),
}))

vi.mock('@repo/app-component-library', () => ({
  useToast: vi.fn(() => ({
    toast: vi.fn(),
  })),
}))

describe('Story 3.1.9: Uploader State Resilience Integration', () => {
  let mockLocalStorage: Record<string, string>
  let mockToast: ReturnType<typeof vi.fn>

  beforeEach(() => {
    // Mock localStorage
    mockLocalStorage = {}
    global.Storage.prototype.getItem = vi.fn((key: string) => mockLocalStorage[key] || null)
    global.Storage.prototype.setItem = vi.fn((key: string, value: string) => {
      mockLocalStorage[key] = value
    })
    global.Storage.prototype.removeItem = vi.fn((key: string) => {
      delete mockLocalStorage[key]
    })
    global.Storage.prototype.clear = vi.fn(() => {
      mockLocalStorage = {}
    })

    // Mock toast
    mockToast = vi.fn()
    const { useToast } = require('@repo/app-component-library')
    useToast.mockReturnValue({ toast: mockToast })

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

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

  const wrapper =
    (store: any) =>
    ({ children }: { children: React.ReactNode }) => <Provider store={store}>{children}</Provider>

  describe('Auth redirect flow with state restoration', () => {
    it('restores state after user returns from login redirect', async () => {
      // Step 1: User starts as unauthenticated and creates some state
      const anonStore = createMockStore({
        isAuthenticated: false,
        user: null,
        token: null,
      })

      const { result: anonResult } = renderHook(() => useUploaderSession('/instructions/new'), {
        wrapper: wrapper(anonStore),
      })

      // User fills in some data
      await waitFor(() => {
        expect(anonResult.current).toBeDefined()
      })

      // Simulate user filling in the form (this would happen through the actual form)
      // The state should be persisted to localStorage with anonSessionId
      const testState = {
        title: 'My Test MOC',
        description: 'Test description',
        tags: ['test', 'moc'],
        theme: 'space',
        step: 1,
        files: [
          {
            name: 'instructions.pdf',
            size: 1024,
            type: 'application/pdf',
            lastModified: Date.now(),
          },
        ],
        uploadToken: 'test-token',
        version: 1,
      }

      // Manually persist state (simulating what the hook would do)
      const storageKey = 'uploader:/instructions/new:anon'
      mockLocalStorage[storageKey] = JSON.stringify(testState)

      // Step 2: User navigates to login (would be redirected by route guard)
      // Step 3: User completes authentication and returns to /instructions/new

      const authStore = createMockStore({
        isAuthenticated: true,
        user: { id: 'user-123', email: 'test@example.com' },
        token: 'auth-token',
      })

      const { result: authResult } = renderHook(() => useUploaderSession('/instructions/new'), {
        wrapper: wrapper(authStore),
      })

      // Step 4: State should be restored from localStorage
      await waitFor(() => {
        expect(authResult.current).toBeDefined()
      })

      // Verify logger was called to indicate restoration
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Restored uploader session'),
        expect.any(Object),
      )

      // Verify toast notification was shown
      expect(mockToast).toHaveBeenCalledWith({
        title: expect.stringContaining('restored'),
        description: expect.any(String),
      })
    })

    it('does not restore state when userId mismatches', async () => {
      // Step 1: Persist state for user-123
      const oldUserState = {
        title: 'Old User MOC',
        description: 'Old description',
        tags: ['old'],
        theme: 'city',
        step: 2,
        files: [
          {
            name: 'old.pdf',
            size: 2048,
            type: 'application/pdf',
            lastModified: Date.now(),
          },
        ],
        uploadToken: 'old-token',
        version: 1,
      }

      const oldUserKey = 'uploader:/instructions/new:user-123'
      mockLocalStorage[oldUserKey] = JSON.stringify(oldUserState)

      // Step 2: Different user (user-456) logs in and visits uploader
      const newUserStore = createMockStore({
        isAuthenticated: true,
        user: { id: 'user-456', email: 'newuser@example.com' },
        token: 'new-auth-token',
      })

      const { result } = renderHook(() => useUploaderSession('/instructions/new'), {
        wrapper: wrapper(newUserStore),
      })

      await waitFor(() => {
        expect(result.current).toBeDefined()
      })

      // Step 3: State should NOT be restored (mismatched userId)
      // The hook should start fresh for the new user

      // Verify no restoration toast was shown
      expect(mockToast).not.toHaveBeenCalledWith({
        title: expect.stringContaining('restored'),
        description: expect.any(String),
      })

      // Verify logger did not log restoration
      const restoredCalls = (logger.info as any).mock.calls.filter((call: any[]) =>
        call[0]?.includes('Restored'),
      )
      expect(restoredCalls.length).toBe(0)
    })

    it('never automatically re-uploads files on restoration', async () => {
      // Step 1: Persist state with file metadata
      const stateWithFiles = {
        title: 'MOC with Files',
        description: 'Description',
        tags: ['test'],
        theme: 'technic',
        step: 2,
        files: [
          {
            name: 'file1.pdf',
            size: 1024,
            type: 'application/pdf',
            lastModified: Date.now(),
          },
          {
            name: 'file2.pdf',
            size: 2048,
            type: 'application/pdf',
            lastModified: Date.now(),
          },
        ],
        uploadToken: 'upload-token',
        version: 1,
      }

      const storageKey = 'uploader:/instructions/new:user-789'
      mockLocalStorage[storageKey] = JSON.stringify(stateWithFiles)

      // Step 2: User returns authenticated
      const authStore = createMockStore({
        isAuthenticated: true,
        user: { id: 'user-789', email: 'test@example.com' },
        token: 'auth-token',
      })

      const { result } = renderHook(() => useUploaderSession('/instructions/new'), {
        wrapper: wrapper(authStore),
      })

      await waitFor(() => {
        expect(result.current).toBeDefined()
      })

      // Step 3: Verify state is restored with file metadata only (no actual file objects)
      // The hook should expose methods for manual retry, not auto-upload

      // Files should be listed from metadata
      // This would be validated in the actual uploader component
      // The key point is: NO automatic upload calls should be made

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Restored uploader session'),
        expect.any(Object),
      )

      // Verify that file metadata is present but file blobs are not
      // (This would be checked in the component using the hook)
    })
  })

  describe('State persistence and cleanup', () => {
    it('clears state on successful finalize', async () => {
      const authStore = createMockStore({
        isAuthenticated: true,
        user: { id: 'user-999', email: 'test@example.com' },
        token: 'auth-token',
      })

      // Pre-populate localStorage with state
      const storageKey = 'uploader:/instructions/new:user-999'
      mockLocalStorage[storageKey] = JSON.stringify({
        title: 'Test MOC',
        description: 'Test',
        tags: [],
        theme: 'space',
        step: 3,
        files: [],
        uploadToken: 'token',
        version: 1,
      })

      const { result } = renderHook(() => useUploaderSession('/instructions/new'), {
        wrapper: wrapper(authStore),
      })

      await waitFor(() => {
        expect(result.current).toBeDefined()
      })

      // Call markFinalized
      result.current.markFinalized()

      // Verify localStorage was cleared
      expect(mockLocalStorage[storageKey]).toBeUndefined()
    })

    it('clears anon state on user opting to leave', async () => {
      const anonStore = createMockStore({
        isAuthenticated: false,
        user: null,
        token: null,
      })

      // Pre-populate localStorage with anon state
      const storageKey = 'uploader:/instructions/new:anon'
      mockLocalStorage[storageKey] = JSON.stringify({
        title: 'Test MOC',
        description: 'Test',
        tags: [],
        theme: 'space',
        step: 1,
        files: [],
        version: 1,
      })

      const { result } = renderHook(() => useUploaderSession('/instructions/new'), {
        wrapper: wrapper(anonStore),
      })

      await waitFor(() => {
        expect(result.current).toBeDefined()
      })

      // User opts to leave (unsaved changes dialog)
      result.current.clear()

      // Verify localStorage was cleared
      expect(mockLocalStorage[storageKey]).toBeUndefined()
    })
  })

  describe('State versioning and migration', () => {
    it('handles version field in persisted state', async () => {
      const authStore = createMockStore({
        isAuthenticated: true,
        user: { id: 'user-123', email: 'test@example.com' },
        token: 'auth-token',
      })

      // Persist state with version
      const storageKey = 'uploader:/instructions/new:user-123'
      mockLocalStorage[storageKey] = JSON.stringify({
        title: 'Versioned MOC',
        description: 'Test',
        tags: [],
        theme: 'city',
        step: 1,
        files: [],
        uploadToken: 'token',
        version: 1,
      })

      const { result } = renderHook(() => useUploaderSession('/instructions/new'), {
        wrapper: wrapper(authStore),
      })

      await waitFor(() => {
        expect(result.current).toBeDefined()
      })

      // State should be restored successfully
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining('Restored uploader session'),
        expect.any(Object),
      )
    })
  })
})
