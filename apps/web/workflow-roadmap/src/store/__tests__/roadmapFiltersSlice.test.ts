import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { configureStore } from '@reduxjs/toolkit'
import {
  roadmapFiltersSlice,
  setStatus,
  setPriority,
  setType,
  setExcludeCompleted,
  setSearch,
  setSort,
  setPageSize,
  type RoadmapFiltersState,
} from '../roadmapFiltersSlice'

// ──────────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────────

function makeStore(preloadedFilters?: Partial<RoadmapFiltersState>) {
  if (preloadedFilters) {
    localStorage.setItem('roadmapFilters', JSON.stringify(preloadedFilters))
  }
  return configureStore({ reducer: { roadmapFilters: roadmapFiltersSlice.reducer } })
}

const defaultState: RoadmapFiltersState = {
  status: '',
  priority: '',
  type: '',
  excludeCompleted: true,
  search: '',
  sortKey: 'createdAt',
  sortDirection: 'desc',
  pageSize: 10,
}

// ──────────────────────────────────────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────────────────────────────────────

describe('roadmapFiltersSlice', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
    vi.restoreAllMocks()
  })

  // ── loadFromStorage ──────────────────────────────────────────────────────

  describe('loadFromStorage (initial state)', () => {
    it('returns default state when localStorage is empty', () => {
      const store = makeStore()
      expect(store.getState().roadmapFilters).toEqual(defaultState)
    })

    it('hydrates state from localStorage when valid data is present', () => {
      const saved: Partial<RoadmapFiltersState> = {
        status: 'active',
        priority: 'P1',
        type: 'feature',
        excludeCompleted: false,
        search: 'auth',
        sortKey: 'title',
        sortDirection: 'asc',
        pageSize: 25,
      }
      const store = makeStore(saved)
      expect(store.getState().roadmapFilters).toEqual({ ...defaultState, ...saved })
    })

    it('falls back to defaults when localStorage contains invalid JSON', () => {
      localStorage.setItem('roadmapFilters', '{not valid json}')
      const store = configureStore({ reducer: { roadmapFilters: roadmapFiltersSlice.reducer } })
      expect(store.getState().roadmapFilters).toEqual(defaultState)
    })

    it('falls back to defaults when localStorage.getItem throws', () => {
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('storage unavailable')
      })
      const store = configureStore({ reducer: { roadmapFilters: roadmapFiltersSlice.reducer } })
      expect(store.getState().roadmapFilters).toEqual(defaultState)
    })

    it('merges partial saved state with defaults so new fields get default values', () => {
      // Simulate an older saved state missing newer fields
      localStorage.setItem('roadmapFilters', JSON.stringify({ status: 'draft' }))
      const store = configureStore({ reducer: { roadmapFilters: roadmapFiltersSlice.reducer } })
      expect(store.getState().roadmapFilters).toEqual({ ...defaultState, status: 'draft' })
    })
  })

  // ── actions ──────────────────────────────────────────────────────────────

  describe('setStatus', () => {
    it('updates status', () => {
      const store = makeStore()
      store.dispatch(setStatus('active'))
      expect(store.getState().roadmapFilters.status).toBe('active')
    })

    it('clears status when empty string is dispatched', () => {
      const store = makeStore({ status: 'draft' })
      store.dispatch(setStatus(''))
      expect(store.getState().roadmapFilters.status).toBe('')
    })
  })

  describe('setPriority', () => {
    it('updates priority', () => {
      const store = makeStore()
      store.dispatch(setPriority('P2'))
      expect(store.getState().roadmapFilters.priority).toBe('P2')
    })

    it('clears priority when empty string is dispatched', () => {
      const store = makeStore({ priority: 'P1' })
      store.dispatch(setPriority(''))
      expect(store.getState().roadmapFilters.priority).toBe('')
    })
  })

  describe('setType', () => {
    it('updates type', () => {
      const store = makeStore()
      store.dispatch(setType('refactor'))
      expect(store.getState().roadmapFilters.type).toBe('refactor')
    })

    it('clears type when empty string is dispatched', () => {
      const store = makeStore({ type: 'feature' })
      store.dispatch(setType(''))
      expect(store.getState().roadmapFilters.type).toBe('')
    })
  })

  describe('setExcludeCompleted', () => {
    it('can be set to false', () => {
      const store = makeStore()
      store.dispatch(setExcludeCompleted(false))
      expect(store.getState().roadmapFilters.excludeCompleted).toBe(false)
    })

    it('can be set back to true', () => {
      const store = makeStore({ excludeCompleted: false })
      store.dispatch(setExcludeCompleted(true))
      expect(store.getState().roadmapFilters.excludeCompleted).toBe(true)
    })
  })

  describe('setSearch', () => {
    it('updates search text', () => {
      const store = makeStore()
      store.dispatch(setSearch('authentication'))
      expect(store.getState().roadmapFilters.search).toBe('authentication')
    })

    it('clears search when empty string is dispatched', () => {
      const store = makeStore({ search: 'auth' })
      store.dispatch(setSearch(''))
      expect(store.getState().roadmapFilters.search).toBe('')
    })
  })

  describe('setSort', () => {
    it('updates sortKey and sortDirection together', () => {
      const store = makeStore()
      store.dispatch(setSort({ key: 'title', direction: 'asc' }))
      const { sortKey, sortDirection } = store.getState().roadmapFilters
      expect(sortKey).toBe('title')
      expect(sortDirection).toBe('asc')
    })

    it('can switch direction from asc to desc', () => {
      const store = makeStore({ sortKey: 'title', sortDirection: 'asc' })
      store.dispatch(setSort({ key: 'title', direction: 'desc' }))
      expect(store.getState().roadmapFilters.sortDirection).toBe('desc')
    })
  })

  describe('setPageSize', () => {
    it('updates pageSize', () => {
      const store = makeStore()
      store.dispatch(setPageSize(25))
      expect(store.getState().roadmapFilters.pageSize).toBe(25)
    })

    it('allows all valid page size options', () => {
      const store = makeStore()
      for (const size of [5, 10, 20, 50]) {
        store.dispatch(setPageSize(size))
        expect(store.getState().roadmapFilters.pageSize).toBe(size)
      }
    })
  })

  // ── multiple dispatches ──────────────────────────────────────────────────

  it('handles multiple filter changes in sequence', () => {
    const store = makeStore()
    store.dispatch(setStatus('active'))
    store.dispatch(setPriority('P1'))
    store.dispatch(setSearch('auth'))
    store.dispatch(setExcludeCompleted(false))
    store.dispatch(setSort({ key: 'priority', direction: 'asc' }))
    store.dispatch(setPageSize(20))

    expect(store.getState().roadmapFilters).toEqual({
      status: 'active',
      priority: 'P1',
      type: '',
      excludeCompleted: false,
      search: 'auth',
      sortKey: 'priority',
      sortDirection: 'asc',
      pageSize: 20,
    })
  })
})
