/**
 * Tests for draftPersistenceMiddleware
 *
 * Story WISH-2015: Form Autosave via RTK Slice with localStorage Persistence
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import { logger } from '@repo/logger'
import {
  draftPersistenceMiddleware,
  loadDraftFromLocalStorage,
} from '../draftPersistenceMiddleware'
import { wishlistDraftSlice, updateDraftField, clearDraft } from '../../slices/wishlistDraftSlice'
import { authSlice, setUser } from '../../slices/authSlice'

// Mock @repo/logger
vi.mock('@repo/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

describe('draftPersistenceMiddleware', () => {
  let store: ReturnType<typeof configureStore>
  let localStorageSetItemSpy: ReturnType<typeof vi.spyOn<Storage, 'setItem'>>
  let localStorageGetItemSpy: ReturnType<typeof vi.spyOn<Storage, 'getItem'>>
  let localStorageRemoveItemSpy: ReturnType<typeof vi.spyOn<Storage, 'removeItem'>>

  beforeEach(() => {
    // Use fake timers for debounce testing
    vi.useFakeTimers()

    // Create store with middleware
    store = configureStore({
      reducer: {
        auth: authSlice.reducer,
        wishlistDraft: wishlistDraftSlice.reducer,
      },
      middleware: getDefaultMiddleware => getDefaultMiddleware().concat(draftPersistenceMiddleware),
    })

    // Set up authenticated user
    store.dispatch(setUser({ id: 'user-123', email: 'test@example.com', name: 'Test User' }))

    // Spy on localStorage methods
    localStorageSetItemSpy = vi.spyOn(Storage.prototype, 'setItem')
    localStorageGetItemSpy = vi.spyOn(Storage.prototype, 'getItem')
    localStorageRemoveItemSpy = vi.spyOn(Storage.prototype, 'removeItem')

    // Clear mocks
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
    localStorage.clear()
  })

  describe('debounced writes', () => {
    it('writes to localStorage after 500ms debounce on updateDraftField', () => {
      // Dispatch updateDraftField
      store.dispatch(updateDraftField({ field: 'title', value: 'LEGO Star Wars' }))

      // Should not write immediately
      expect(localStorageSetItemSpy).not.toHaveBeenCalled()

      // Advance time by 500ms
      vi.advanceTimersByTime(500)

      // Should write to localStorage
      expect(localStorageSetItemSpy).toHaveBeenCalledWith(
        'wishlist:draft:user-123:add-item',
        expect.any(String),
      )

      // Verify the data written
      const writtenData = JSON.parse(localStorageSetItemSpy.mock.calls[0][1] as string)
      expect(writtenData.formData.title).toBe('LEGO Star Wars')
      expect(writtenData.timestamp).toBeTypeOf('number')
    })

    it('debounce resets on rapid actions - multiple dispatches result in only 1 write', () => {
      // Dispatch multiple field updates rapidly
      store.dispatch(updateDraftField({ field: 'title', value: 'Test 1' }))
      vi.advanceTimersByTime(200) // 200ms

      store.dispatch(updateDraftField({ field: 'title', value: 'Test 2' }))
      vi.advanceTimersByTime(200) // 400ms total

      store.dispatch(updateDraftField({ field: 'title', value: 'Test 3' }))
      vi.advanceTimersByTime(200) // 600ms total (but debounce resets each time)

      // Should not have written yet
      expect(localStorageSetItemSpy).not.toHaveBeenCalled()

      // Advance final 300ms to complete the 500ms debounce from last dispatch
      vi.advanceTimersByTime(300)

      // Should only write once with the latest value
      expect(localStorageSetItemSpy).toHaveBeenCalledTimes(1)

      const writtenData = JSON.parse(localStorageSetItemSpy.mock.calls[0][1] as string)
      expect(writtenData.formData.title).toBe('Test 3')
    })
  })

  describe('action filtering', () => {
    it('does not write on non-draft actions', () => {
      // Dispatch a non-draft action
      store.dispatch(setUser({ id: 'user-456', email: 'other@example.com' }))

      // Advance time
      vi.advanceTimersByTime(500)

      // Should not write to localStorage
      expect(localStorageSetItemSpy).not.toHaveBeenCalled()
    })

    it('only processes wishlistDraft/* actions', () => {
      // Dispatch various draft actions
      store.dispatch(updateDraftField({ field: 'store', value: 'BrickLink' }))
      vi.advanceTimersByTime(500)

      expect(localStorageSetItemSpy).toHaveBeenCalledTimes(1)
    })
  })

  describe('user scoping', () => {
    it('uses user ID from state for localStorage key', () => {
      store.dispatch(updateDraftField({ field: 'title', value: 'Test' }))
      vi.advanceTimersByTime(500)

      expect(localStorageSetItemSpy).toHaveBeenCalledWith(
        'wishlist:draft:user-123:add-item',
        expect.any(String),
      )
    })

    it('skips persistence when user is not authenticated', () => {
      // Create store without authenticated user
      const unauthStore = configureStore({
        reducer: {
          auth: authSlice.reducer,
          wishlistDraft: wishlistDraftSlice.reducer,
        },
        middleware: getDefaultMiddleware =>
          getDefaultMiddleware().concat(draftPersistenceMiddleware),
      })

      // Dispatch action without auth
      unauthStore.dispatch(updateDraftField({ field: 'title', value: 'Test' }))
      vi.advanceTimersByTime(500)

      // Should not write to localStorage
      expect(localStorageSetItemSpy).not.toHaveBeenCalled()
    })
  })

  describe('clearDraft immediate behavior', () => {
    it('clearDraft removes localStorage entry immediately (no debounce)', () => {
      // First set some draft data
      store.dispatch(updateDraftField({ field: 'title', value: 'Test' }))
      vi.advanceTimersByTime(500)

      // Verify it was written
      expect(localStorageSetItemSpy).toHaveBeenCalledTimes(1)

      // Clear the mock
      localStorageSetItemSpy.mockClear()

      // Now clear the draft
      store.dispatch(clearDraft())

      // Should remove immediately without debounce
      expect(localStorageRemoveItemSpy).toHaveBeenCalledWith('wishlist:draft:user-123:add-item')
      expect(localStorageSetItemSpy).not.toHaveBeenCalled()
    })

    it('clearDraft cancels pending debounced write', () => {
      // Dispatch updateDraftField
      store.dispatch(updateDraftField({ field: 'title', value: 'Test' }))

      // Before debounce completes, dispatch clearDraft
      vi.advanceTimersByTime(200)
      store.dispatch(clearDraft())

      // Advance time past original debounce
      vi.advanceTimersByTime(400)

      // Should have called remove, but not setItem
      expect(localStorageRemoveItemSpy).toHaveBeenCalledWith('wishlist:draft:user-123:add-item')
      expect(localStorageSetItemSpy).not.toHaveBeenCalled()
    })
  })

  describe('error handling', () => {
    it('catches QuotaExceededError and logs warning', () => {
      // Mock localStorage.setItem to throw QuotaExceededError
      const quotaError = new DOMException('QuotaExceededError', 'QuotaExceededError')
      localStorageSetItemSpy.mockImplementation(() => {
        throw quotaError
      })

      // Dispatch action
      store.dispatch(updateDraftField({ field: 'title', value: 'Test' }))
      vi.advanceTimersByTime(500)

      // Should log warning
      expect(logger.warn).toHaveBeenCalledWith('localStorage quota exceeded, draft not saved')
    })

    it('logs generic error for other localStorage failures', () => {
      // Mock localStorage.setItem to throw generic error
      const genericError = new Error('Generic storage error')
      localStorageSetItemSpy.mockImplementation(() => {
        throw genericError
      })

      // Dispatch action
      store.dispatch(updateDraftField({ field: 'title', value: 'Test' }))
      vi.advanceTimersByTime(500)

      // Should log error
      expect(logger.error).toHaveBeenCalledWith('Failed to save draft to localStorage', {
        error: genericError,
      })
    })
  })

  describe('loadDraftFromLocalStorage', () => {
    it('validates data with Zod schema - valid data', () => {
      const validDraft = {
        formData: {
          title: 'Test Item',
          store: 'LEGO',
          tags: [],
          priority: 0,
        },
        timestamp: Date.now(),
      }

      localStorageGetItemSpy.mockReturnValue(JSON.stringify(validDraft))

      const result = loadDraftFromLocalStorage('user-123')

      expect(result).not.toBeNull()
      expect(result?.formData.title).toBe('Test Item')
      expect(result?.timestamp).toBe(validDraft.timestamp)
    })

    it('validates data with Zod schema - invalid data structure returns null', () => {
      // Invalid structure - missing formData entirely
      const invalidDraft = {
        timestamp: Date.now(),
        // formData is missing
      }

      localStorageGetItemSpy.mockReturnValue(JSON.stringify(invalidDraft))

      const result = loadDraftFromLocalStorage('user-123')

      expect(result).toBeNull()
      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to load draft from localStorage, clearing corrupted data',
        expect.any(Object),
      )
    })

    it('skips expired drafts (> 7 days)', () => {
      const expiredTimestamp = Date.now() - 8 * 24 * 60 * 60 * 1000 // 8 days ago

      const expiredDraft = {
        formData: {
          title: 'Expired Draft',
          store: 'LEGO',
          tags: [],
          priority: 0,
        },
        timestamp: expiredTimestamp,
      }

      localStorageGetItemSpy.mockReturnValue(JSON.stringify(expiredDraft))

      const result = loadDraftFromLocalStorage('user-123')

      expect(result).toBeNull()
      expect(logger.info).toHaveBeenCalledWith(
        'Draft expired, clearing from localStorage',
        expect.objectContaining({ ageInDays: expect.any(Number) }),
      )
      expect(localStorageRemoveItemSpy).toHaveBeenCalledWith('wishlist:draft:user-123:add-item')
    })

    it('loads draft within expiry window (< 7 days)', () => {
      const recentTimestamp = Date.now() - 2 * 24 * 60 * 60 * 1000 // 2 days ago

      const recentDraft = {
        formData: {
          title: 'Recent Draft',
          store: 'LEGO',
          tags: [],
          priority: 0,
        },
        timestamp: recentTimestamp,
      }

      localStorageGetItemSpy.mockReturnValue(JSON.stringify(recentDraft))

      const result = loadDraftFromLocalStorage('user-123')

      expect(result).not.toBeNull()
      expect(result?.formData.title).toBe('Recent Draft')
      expect(result?.timestamp).toBe(recentTimestamp)
    })

    it('clears corrupted data (malformed JSON)', () => {
      localStorageGetItemSpy.mockReturnValue('{ invalid json }')

      const result = loadDraftFromLocalStorage('user-123')

      expect(result).toBeNull()
      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to load draft from localStorage, clearing corrupted data',
        expect.any(Object),
      )
      expect(localStorageRemoveItemSpy).toHaveBeenCalledWith('wishlist:draft:user-123:add-item')
    })

    it('returns null when no draft exists', () => {
      localStorageGetItemSpy.mockReturnValue(null)

      const result = loadDraftFromLocalStorage('user-123')

      expect(result).toBeNull()
    })

    it('returns null when userId is not provided', () => {
      const result = loadDraftFromLocalStorage(null)

      expect(result).toBeNull()
      expect(localStorageGetItemSpy).not.toHaveBeenCalled()
    })
  })

  describe('integration with store state', () => {
    it('persists complete form state with all fields', () => {
      // Dispatch multiple field updates
      store.dispatch(updateDraftField({ field: 'title', value: 'Millennium Falcon' }))
      store.dispatch(updateDraftField({ field: 'store', value: 'BrickLink' }))
      store.dispatch(updateDraftField({ field: 'setNumber', value: '75192' }))
      store.dispatch(updateDraftField({ field: 'price', value: '849.99' }))
      store.dispatch(updateDraftField({ field: 'pieceCount', value: 7541 }))
      store.dispatch(updateDraftField({ field: 'priority', value: 5 }))
      store.dispatch(updateDraftField({ field: 'tags', value: ['star-wars', 'ucs'] }))
      store.dispatch(updateDraftField({ field: 'notes', value: 'Dream set!' }))

      vi.advanceTimersByTime(500)

      expect(localStorageSetItemSpy).toHaveBeenCalledTimes(1)

      const writtenData = JSON.parse(localStorageSetItemSpy.mock.calls[0][1] as string)
      expect(writtenData.formData).toEqual({
        title: 'Millennium Falcon',
        store: 'BrickLink',
        setNumber: '75192',
        sourceUrl: undefined,
        imageUrl: undefined,
        price: '849.99',
        pieceCount: 7541,
        releaseDate: undefined,
        tags: ['star-wars', 'ucs'],
        priority: 5,
        notes: 'Dream set!',
      })
    })
  })
})
