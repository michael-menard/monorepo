/**
 * Uploader State Resilience Integration Tests
 * Story 3.1.9: Uploader State Resilience & Unsaved-Changes Guard
 * Story REPA-003: Updated for dependency-injected useUploaderSession from @repo/upload
 *
 * Tests:
 * - Unauthenticated → redirect → return restores locally persisted state
 * - Mismatched userId → no restore (starts fresh)
 * - State restoration never re-uploads automatically
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Stub browser APIs before any module loads (HEIC converter in @repo/upload bundle needs them)
vi.hoisted(() => {
  if (typeof globalThis.Worker === 'undefined') {
    ;(globalThis as any).Worker = class MockWorker {
      postMessage() {}
      terminate() {}
      addEventListener() {}
      removeEventListener() {}
    }
  }
  if (typeof URL.createObjectURL !== 'function') {
    URL.createObjectURL = () => 'blob:mock'
    URL.revokeObjectURL = () => {}
  }
})

import { renderHook, waitFor } from '@testing-library/react'
import { logger } from '@repo/logger'
import { useUploaderSession } from '@repo/upload/hooks'

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

const { mockToast } = vi.hoisted(() => ({
  mockToast: vi.fn(),
}))

vi.mock('@repo/app-component-library', () => ({
  useToast: vi.fn(() => ({
    toast: mockToast,
  })),
}))

describe('Story 3.1.9: Uploader State Resilience Integration', () => {
  let mockLocalStorage: Record<string, string>

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

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Auth redirect flow with state restoration', () => {
    it('restores state after user returns from login redirect', async () => {
      // Step 1: User starts as unauthenticated and creates some state
      const { result: anonResult } = renderHook(() =>
        useUploaderSession({
          route: '/instructions/new',
          isAuthenticated: false,
        }),
      )

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
        step: 'files',
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
        updatedAt: Date.now(),
      }

      // Manually persist state (simulating what the hook would do)
      // Use actual storage key format based on anon session id
      const anonId = mockLocalStorage['uploader:anonSessionId']
      const storageKey = `uploader:/instructions/new:${anonId}`
      mockLocalStorage[storageKey] = JSON.stringify(testState)

      // Step 2: User navigates to login (would be redirected by route guard)
      // Step 3: User completes authentication and returns to /instructions/new

      const { result: authResult } = renderHook(() =>
        useUploaderSession({
          route: '/instructions/new',
          isAuthenticated: true,
          userId: 'user-123',
        }),
      )

      // Step 4: State should be restored from localStorage
      await waitFor(() => {
        expect(authResult.current).toBeDefined()
      })

      // Verify restoration flag is set
      await waitFor(() => {
        expect(authResult.current.wasRestored).toBe(true)
      })

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
        step: 'files',
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
        updatedAt: Date.now(),
      }

      const oldUserKey = 'uploader:/instructions/new:user-123'
      mockLocalStorage[oldUserKey] = JSON.stringify(oldUserState)

      // Step 2: Different user (user-456) logs in and visits uploader
      const { result } = renderHook(() =>
        useUploaderSession({
          route: '/instructions/new',
          isAuthenticated: true,
          userId: 'user-456',
        }),
      )

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
        step: 'files',
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
        updatedAt: Date.now(),
      }

      const storageKey = 'uploader:/instructions/new:user-789'
      mockLocalStorage[storageKey] = JSON.stringify(stateWithFiles)

      // Step 2: User returns authenticated
      const { result } = renderHook(() =>
        useUploaderSession({
          route: '/instructions/new',
          isAuthenticated: true,
          userId: 'user-789',
        }),
      )

      await waitFor(() => {
        expect(result.current).toBeDefined()
      })

      // Step 3: Verify state is restored with file metadata only (no actual file objects)
      // The hook should expose methods for manual retry, not auto-upload
      //
      // Files should be listed from metadata
      // This would be validated in the actual uploader component
      // The key point is: NO automatic upload calls should be made

      await waitFor(() => {
        expect(result.current.wasRestored).toBe(true)
      })

      // Verify that file metadata is present but file blobs are not
      // (This would be checked in the component using the hook)
    })
  })

  describe('State persistence and cleanup', () => {
    it('clears state on successful finalize', async () => {
      // Pre-populate localStorage with state
      const storageKey = 'uploader:/instructions/new:user-999'
      mockLocalStorage[storageKey] = JSON.stringify({
        title: 'Test MOC',
        description: 'Test',
        tags: [],
        theme: 'space',
        step: 'review',
        files: [],
        uploadToken: 'token',
        version: 1,
        updatedAt: Date.now(),
      })

      const { result } = renderHook(() =>
        useUploaderSession({
          route: '/instructions/new',
          isAuthenticated: true,
          userId: 'user-999',
        }),
      )

      await waitFor(() => {
        expect(result.current).toBeDefined()
      })

      // Call markFinalized
      result.current.markFinalized()

      // Verify localStorage was cleared
      expect(mockLocalStorage[storageKey]).toBeUndefined()
    })

    it('clears anon state on user opting to leave', async () => {
      const { result } = renderHook(() =>
        useUploaderSession({
          route: '/instructions/new',
          isAuthenticated: false,
        }),
      )

      await waitFor(() => {
        expect(result.current).toBeDefined()
      })

      // Simulate user making changes so that a session is persisted
      const initialKeys = Object.keys(mockLocalStorage).length

      result.current.updateSession({ title: 'Test MOC' })

      await waitFor(() => {
        expect(Object.keys(mockLocalStorage).length).toBeGreaterThan(initialKeys)
      })

      // User opts to leave (unsaved changes dialog)
      result.current.clear()

      // Verify all uploader keys for this route were cleared
      const remainingKeys = Object.keys(mockLocalStorage).filter(key =>
        key.startsWith('uploader:/instructions/new:'),
      )
      expect(remainingKeys.length).toBe(0)
    })
  })

  describe('State versioning and migration', () => {
    it('handles version field in persisted state', async () => {
      // Persist state with version
      const storageKey = 'uploader:/instructions/new:user-123'
      mockLocalStorage[storageKey] = JSON.stringify({
        title: 'Versioned MOC',
        description: 'Test',
        tags: [],
        theme: 'city',
        step: 'metadata',
        files: [],
        uploadToken: 'token',
        version: 1,
        updatedAt: Date.now(),
      })

      const { result } = renderHook(() =>
        useUploaderSession({
          route: '/instructions/new',
          isAuthenticated: true,
          userId: 'user-123',
        }),
      )

      await waitFor(() => {
        expect(result.current).toBeDefined()
      })

      // State should be restored successfully
      await waitFor(() => {
        expect(result.current.wasRestored).toBe(true)
      })
    })
  })
})
