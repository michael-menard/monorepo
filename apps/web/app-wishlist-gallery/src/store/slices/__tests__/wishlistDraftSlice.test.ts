/**
 * Tests for wishlistDraftSlice
 *
 * Story WISH-2015: Form Autosave via RTK Slice with localStorage Persistence
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import {
  wishlistDraftSlice,
  updateDraftField,
  setDraft,
  clearDraft,
  setDraftRestored,
  selectDraft,
  selectDraftFormData,
  selectIsDraftRestored,
  selectHasDraft,
  type DraftFormData,
} from '../wishlistDraftSlice'

describe('wishlistDraftSlice', () => {
  let store: ReturnType<typeof configureStore>

  beforeEach(() => {
    store = configureStore({
      reducer: {
        wishlistDraft: wishlistDraftSlice.reducer,
      },
    })
  })

  describe('initial state', () => {
    it('has empty form data', () => {
      const state = store.getState()
      expect(selectDraftFormData(state)).toEqual({
        title: '',
        store: '',
        setNumber: undefined,
        sourceUrl: undefined,
        imageUrl: undefined,
        price: undefined,
        pieceCount: undefined,
        releaseDate: undefined,
        tags: [],
        priority: 0,
        notes: undefined,
      })
    })

    it('has null timestamp', () => {
      const state = store.getState()
      expect(selectDraft(state).timestamp).toBeNull()
    })

    it('is not restored', () => {
      const state = store.getState()
      expect(selectIsDraftRestored(state)).toBe(false)
    })

    it('has no draft', () => {
      const state = store.getState()
      expect(selectHasDraft(state)).toBe(false)
    })
  })

  describe('updateDraftField', () => {
    it('updates a single field', () => {
      store.dispatch(updateDraftField({ field: 'title', value: 'LEGO Star Wars' }))
      const state = store.getState()
      expect(selectDraftFormData(state).title).toBe('LEGO Star Wars')
    })

    it('sets timestamp when field is updated', () => {
      const before = Date.now()
      store.dispatch(updateDraftField({ field: 'title', value: 'Test' }))
      const after = Date.now()

      const state = store.getState()
      const timestamp = selectDraft(state).timestamp
      expect(timestamp).toBeGreaterThanOrEqual(before)
      expect(timestamp).toBeLessThanOrEqual(after)
    })

    it('updates multiple fields independently', () => {
      store.dispatch(updateDraftField({ field: 'title', value: 'Test Title' }))
      store.dispatch(updateDraftField({ field: 'store', value: 'BrickLink' }))
      store.dispatch(updateDraftField({ field: 'price', value: '99.99' }))

      const state = store.getState()
      const formData = selectDraftFormData(state)
      expect(formData.title).toBe('Test Title')
      expect(formData.store).toBe('BrickLink')
      expect(formData.price).toBe('99.99')
    })

    it('updates array fields', () => {
      store.dispatch(updateDraftField({ field: 'tags', value: ['star-wars', 'ucs'] }))

      const state = store.getState()
      expect(selectDraftFormData(state).tags).toEqual(['star-wars', 'ucs'])
    })

    it('updates number fields', () => {
      store.dispatch(updateDraftField({ field: 'pieceCount', value: 7541 }))
      store.dispatch(updateDraftField({ field: 'priority', value: 5 }))

      const state = store.getState()
      const formData = selectDraftFormData(state)
      expect(formData.pieceCount).toBe(7541)
      expect(formData.priority).toBe(5)
    })
  })

  describe('setDraft', () => {
    it('bulk sets all form fields', () => {
      const draftData: DraftFormData = {
        title: 'Millennium Falcon',
        store: 'LEGO',
        setNumber: '75192',
        sourceUrl: 'https://example.com',
        imageUrl: 'https://example.com/image.jpg',
        price: '849.99',
        pieceCount: 7541,
        releaseDate: '2023-01-01T00:00:00Z',
        tags: ['star-wars', 'ucs'],
        priority: 5,
        notes: 'Dream set!',
      }

      store.dispatch(setDraft(draftData))

      const state = store.getState()
      expect(selectDraftFormData(state)).toEqual(draftData)
    })

    it('sets timestamp', () => {
      const draftData: DraftFormData = {
        title: 'Test',
        store: 'LEGO',
        tags: [],
        priority: 0,
      }

      const before = Date.now()
      store.dispatch(setDraft(draftData))
      const after = Date.now()

      const state = store.getState()
      const timestamp = selectDraft(state).timestamp
      expect(timestamp).toBeGreaterThanOrEqual(before)
      expect(timestamp).toBeLessThanOrEqual(after)
    })
  })

  describe('clearDraft', () => {
    it('resets form data to initial state', () => {
      // Set some data first
      store.dispatch(updateDraftField({ field: 'title', value: 'Test' }))
      store.dispatch(updateDraftField({ field: 'store', value: 'BrickLink' }))
      store.dispatch(updateDraftField({ field: 'priority', value: 3 }))

      // Clear it
      store.dispatch(clearDraft())

      const state = store.getState()
      const formData = selectDraftFormData(state)
      expect(formData.title).toBe('')
      expect(formData.store).toBe('')
      expect(formData.priority).toBe(0)
    })

    it('resets timestamp to null', () => {
      store.dispatch(updateDraftField({ field: 'title', value: 'Test' }))
      expect(selectDraft(store.getState()).timestamp).not.toBeNull()

      store.dispatch(clearDraft())
      expect(selectDraft(store.getState()).timestamp).toBeNull()
    })

    it('resets isRestored flag', () => {
      store.dispatch(setDraftRestored(true))
      expect(selectIsDraftRestored(store.getState())).toBe(true)

      store.dispatch(clearDraft())
      expect(selectIsDraftRestored(store.getState())).toBe(false)
    })
  })

  describe('setDraftRestored', () => {
    it('sets isRestored to true', () => {
      store.dispatch(setDraftRestored(true))
      expect(selectIsDraftRestored(store.getState())).toBe(true)
    })

    it('sets isRestored to false', () => {
      store.dispatch(setDraftRestored(true))
      store.dispatch(setDraftRestored(false))
      expect(selectIsDraftRestored(store.getState())).toBe(false)
    })
  })

  describe('selectHasDraft', () => {
    it('returns false for empty draft', () => {
      expect(selectHasDraft(store.getState())).toBe(false)
    })

    it('returns true when title is set', () => {
      store.dispatch(updateDraftField({ field: 'title', value: 'Test' }))
      expect(selectHasDraft(store.getState())).toBe(true)
    })

    it('returns false when store is default LEGO', () => {
      store.dispatch(updateDraftField({ field: 'store', value: 'LEGO' }))
      expect(selectHasDraft(store.getState())).toBe(false)
    })

    it('returns true when store is non-default', () => {
      store.dispatch(updateDraftField({ field: 'store', value: 'BrickLink' }))
      expect(selectHasDraft(store.getState())).toBe(true)
    })

    it('returns true when priority > 0', () => {
      store.dispatch(updateDraftField({ field: 'priority', value: 1 }))
      expect(selectHasDraft(store.getState())).toBe(true)
    })

    it('returns true when tags are set', () => {
      store.dispatch(updateDraftField({ field: 'tags', value: ['test'] }))
      expect(selectHasDraft(store.getState())).toBe(true)
    })

    it('returns true for any non-empty optional field', () => {
      const fieldsToTest = [
        { field: 'setNumber', value: '75192' },
        { field: 'sourceUrl', value: 'https://example.com' },
        { field: 'imageUrl', value: 'https://example.com/img.jpg' },
        { field: 'price', value: '99.99' },
        { field: 'pieceCount', value: 100 },
        { field: 'releaseDate', value: '2023-01-01T00:00:00Z' },
        { field: 'notes', value: 'Test note' },
      ]

      for (const testCase of fieldsToTest) {
        // Create fresh store for each test
        const testStore = configureStore({
          reducer: {
            wishlistDraft: wishlistDraftSlice.reducer,
          },
        })

        testStore.dispatch(updateDraftField(testCase as any))
        expect(selectHasDraft(testStore.getState())).toBe(true)
      }
    })
  })
})
