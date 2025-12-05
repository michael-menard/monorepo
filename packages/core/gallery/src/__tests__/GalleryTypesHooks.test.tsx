import { renderHook, act } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { useGalleryState } from '../hooks/useGalleryState'
import { useGalleryUrl } from '../hooks/useGalleryUrl'
import type { GallerySearchParams } from '../types'

describe('useGalleryState', () => {
  describe('initial state', () => {
    it('returns default values', () => {
      const { result } = renderHook(() => useGalleryState())

      expect(result.current.search).toBe('')
      expect(result.current.tags).toEqual([])
      expect(result.current.theme).toBeNull()
      expect(result.current.sortField).toBe('createdAt')
      expect(result.current.sortDirection).toBe('desc')
      expect(result.current.page).toBe(1)
      expect(result.current.pageSize).toBe(12)
      expect(result.current.hasActiveFilters).toBe(false)
    })

    it('accepts custom default values', () => {
      const { result } = renderHook(() =>
        useGalleryState({
          defaultSort: { field: 'title', direction: 'asc' },
          defaultPageSize: 24,
          initialSearch: 'castle',
          initialTags: ['architecture'],
          initialTheme: 'Castle',
        }),
      )

      expect(result.current.search).toBe('castle')
      expect(result.current.tags).toEqual(['architecture'])
      expect(result.current.theme).toBe('Castle')
      expect(result.current.sortField).toBe('title')
      expect(result.current.sortDirection).toBe('asc')
      expect(result.current.pageSize).toBe(24)
    })
  })

  describe('filter setters', () => {
    it('setSearch updates search and resets page', () => {
      const { result } = renderHook(() => useGalleryState())

      act(() => {
        result.current.setPage(5)
      })
      expect(result.current.page).toBe(5)

      act(() => {
        result.current.setSearch('castle')
      })

      expect(result.current.search).toBe('castle')
      expect(result.current.page).toBe(1) // Reset on filter change
    })

    it('setTags updates tags and resets page', () => {
      const { result } = renderHook(() => useGalleryState())

      act(() => {
        result.current.setPage(3)
      })

      act(() => {
        result.current.setTags(['tag1', 'tag2'])
      })

      expect(result.current.tags).toEqual(['tag1', 'tag2'])
      expect(result.current.page).toBe(1)
    })

    it('addTag adds a tag without duplicates', () => {
      const { result } = renderHook(() => useGalleryState())

      act(() => {
        result.current.addTag('tag1')
      })
      expect(result.current.tags).toEqual(['tag1'])

      act(() => {
        result.current.addTag('tag2')
      })
      expect(result.current.tags).toEqual(['tag1', 'tag2'])

      act(() => {
        result.current.addTag('tag1') // Duplicate
      })
      expect(result.current.tags).toEqual(['tag1', 'tag2']) // No duplicate
    })

    it('removeTag removes a tag', () => {
      const { result } = renderHook(() =>
        useGalleryState({ initialTags: ['tag1', 'tag2', 'tag3'] }),
      )

      act(() => {
        result.current.removeTag('tag2')
      })

      expect(result.current.tags).toEqual(['tag1', 'tag3'])
    })

    it('toggleTag adds or removes tag', () => {
      const { result } = renderHook(() => useGalleryState())

      act(() => {
        result.current.toggleTag('tag1')
      })
      expect(result.current.tags).toEqual(['tag1'])

      act(() => {
        result.current.toggleTag('tag1')
      })
      expect(result.current.tags).toEqual([])
    })

    it('setTheme updates theme and resets page', () => {
      const { result } = renderHook(() => useGalleryState())

      act(() => {
        result.current.setPage(2)
      })

      act(() => {
        result.current.setTheme('Castle')
      })

      expect(result.current.theme).toBe('Castle')
      expect(result.current.page).toBe(1)
    })
  })

  describe('sort setters', () => {
    it('setSort updates sort field and direction', () => {
      const { result } = renderHook(() => useGalleryState())

      act(() => {
        result.current.setSort('title', 'asc')
      })

      expect(result.current.sortField).toBe('title')
      expect(result.current.sortDirection).toBe('asc')
    })

    it('setSort uses default direction when not specified', () => {
      const { result } = renderHook(() =>
        useGalleryState({ defaultSort: { field: 'createdAt', direction: 'desc' } }),
      )

      act(() => {
        result.current.setSort('title')
      })

      expect(result.current.sortField).toBe('title')
      expect(result.current.sortDirection).toBe('desc') // Uses default
    })
  })

  describe('pagination setters', () => {
    it('setPage updates page number', () => {
      const { result } = renderHook(() => useGalleryState())

      act(() => {
        result.current.setPage(5)
      })

      expect(result.current.page).toBe(5)
    })

    it('setPage enforces minimum of 1', () => {
      const { result } = renderHook(() => useGalleryState())

      act(() => {
        result.current.setPage(-1)
      })

      expect(result.current.page).toBe(1)
    })

    it('setPageSize updates page size and resets page', () => {
      const { result } = renderHook(() => useGalleryState())

      act(() => {
        result.current.setPage(3)
      })

      act(() => {
        result.current.setPageSize(24)
      })

      expect(result.current.pageSize).toBe(24)
      expect(result.current.page).toBe(1)
    })
  })

  describe('actions', () => {
    it('clearFilters resets only filter state', () => {
      const { result } = renderHook(() => useGalleryState())

      act(() => {
        result.current.setSearch('castle')
        result.current.setTags(['tag1'])
        result.current.setTheme('Castle')
        result.current.setSort('title', 'asc')
        result.current.setPage(5)
      })

      act(() => {
        result.current.clearFilters()
      })

      expect(result.current.search).toBe('')
      expect(result.current.tags).toEqual([])
      expect(result.current.theme).toBeNull()
      expect(result.current.page).toBe(1)
      // Sort should remain unchanged
      expect(result.current.sortField).toBe('title')
      expect(result.current.sortDirection).toBe('asc')
    })

    it('resetAll resets all state to defaults', () => {
      const { result } = renderHook(() =>
        useGalleryState({
          defaultSort: { field: 'createdAt', direction: 'desc' },
          defaultPageSize: 12,
        }),
      )

      act(() => {
        result.current.setSearch('castle')
        result.current.setTags(['tag1'])
        result.current.setTheme('Castle')
        result.current.setSort('title', 'asc')
        result.current.setPage(5)
        result.current.setPageSize(24)
      })

      act(() => {
        result.current.resetAll()
      })

      expect(result.current.search).toBe('')
      expect(result.current.tags).toEqual([])
      expect(result.current.theme).toBeNull()
      expect(result.current.sortField).toBe('createdAt')
      expect(result.current.sortDirection).toBe('desc')
      expect(result.current.page).toBe(1)
      expect(result.current.pageSize).toBe(12)
    })
  })

  describe('computed values', () => {
    it('hasActiveFilters is true when search is set', () => {
      const { result } = renderHook(() => useGalleryState())

      act(() => {
        result.current.setSearch('test')
      })

      expect(result.current.hasActiveFilters).toBe(true)
    })

    it('hasActiveFilters is true when tags are set', () => {
      const { result } = renderHook(() => useGalleryState())

      act(() => {
        result.current.addTag('tag1')
      })

      expect(result.current.hasActiveFilters).toBe(true)
    })

    it('hasActiveFilters is true when theme is set', () => {
      const { result } = renderHook(() => useGalleryState())

      act(() => {
        result.current.setTheme('Castle')
      })

      expect(result.current.hasActiveFilters).toBe(true)
    })

    it('hasActiveFilters is false when no filters', () => {
      const { result } = renderHook(() => useGalleryState())

      expect(result.current.hasActiveFilters).toBe(false)
    })

    it('filterState returns correct structure', () => {
      const { result } = renderHook(() => useGalleryState())

      act(() => {
        result.current.setSearch('castle')
        result.current.setTags(['tag1'])
        result.current.setTheme('Castle')
      })

      expect(result.current.filterState).toEqual({
        search: 'castle',
        tags: ['tag1'],
        theme: 'Castle',
      })
    })

    it('sortState returns correct structure', () => {
      const { result } = renderHook(() => useGalleryState())

      act(() => {
        result.current.setSort('title', 'asc')
      })

      expect(result.current.sortState).toEqual({
        field: 'title',
        direction: 'asc',
      })
    })

    it('queryParams returns correct structure', () => {
      const { result } = renderHook(() => useGalleryState())

      act(() => {
        result.current.setSearch('castle')
        result.current.setTags(['tag1', 'tag2'])
        result.current.setTheme('Castle')
        result.current.setSort('title', 'asc')
        result.current.setPage(2)
      })

      expect(result.current.queryParams).toEqual({
        q: 'castle',
        tags: ['tag1', 'tag2'],
        theme: 'Castle',
        sort: 'title',
        order: 'asc',
        page: 2,
        limit: 12,
      })
    })

    it('queryParams omits empty values', () => {
      const { result } = renderHook(() => useGalleryState())

      expect(result.current.queryParams).toEqual({
        sort: 'createdAt',
        order: 'desc',
        page: 1,
        limit: 12,
      })
    })
  })
})

describe('useGalleryUrl', () => {
  const createMockNavigate = () => {
    const navigate = vi.fn()
    return navigate
  }

  describe('state parsing', () => {
    it('parses empty search params', () => {
      const navigate = createMockNavigate()
      const search: GallerySearchParams = {}

      const { result } = renderHook(() => useGalleryUrl({ search, navigate }))

      expect(result.current.state).toEqual({
        search: '',
        tags: [],
        theme: null,
        sortField: 'createdAt',
        sortDirection: 'desc',
        page: 1,
      })
    })

    it('parses search params with values', () => {
      const navigate = createMockNavigate()
      const search: GallerySearchParams = {
        q: 'castle',
        tags: ['architecture', 'medieval'],
        theme: 'Castle',
        sort: 'title',
        order: 'asc',
        page: 3,
      }

      const { result } = renderHook(() => useGalleryUrl({ search, navigate }))

      expect(result.current.state).toEqual({
        search: 'castle',
        tags: ['architecture', 'medieval'],
        theme: 'Castle',
        sortField: 'title',
        sortDirection: 'asc',
        page: 3,
      })
    })

    it('parses comma-separated tags string', () => {
      const navigate = createMockNavigate()
      const search: GallerySearchParams = {
        tags: 'tag1,tag2,tag3',
      }

      const { result } = renderHook(() => useGalleryUrl({ search, navigate }))

      expect(result.current.state.tags).toEqual(['tag1', 'tag2', 'tag3'])
    })
  })

  describe('URL updates', () => {
    it('setSearch calls navigate with correct params', () => {
      const navigate = createMockNavigate()
      const search: GallerySearchParams = {}

      const { result } = renderHook(() => useGalleryUrl({ search, navigate }))

      act(() => {
        result.current.setSearch('castle')
      })

      expect(navigate).toHaveBeenCalledWith({
        search: expect.any(Function),
      })

      // Test the search function
      const searchFn = navigate.mock.calls[0][0].search
      const newSearch = searchFn({})
      expect(newSearch.q).toBe('castle')
    })

    it('setTags calls navigate with correct params', () => {
      const navigate = createMockNavigate()
      const search: GallerySearchParams = {}

      const { result } = renderHook(() => useGalleryUrl({ search, navigate }))

      act(() => {
        result.current.setTags(['tag1', 'tag2'])
      })

      const searchFn = navigate.mock.calls[0][0].search
      const newSearch = searchFn({})
      expect(newSearch.tags).toEqual(['tag1', 'tag2'])
    })

    it('setTheme calls navigate with correct params', () => {
      const navigate = createMockNavigate()
      const search: GallerySearchParams = {}

      const { result } = renderHook(() => useGalleryUrl({ search, navigate }))

      act(() => {
        result.current.setTheme('Castle')
      })

      const searchFn = navigate.mock.calls[0][0].search
      const newSearch = searchFn({})
      expect(newSearch.theme).toBe('Castle')
    })

    it('setTheme(null) removes theme from URL', () => {
      const navigate = createMockNavigate()
      const search: GallerySearchParams = { theme: 'Castle' }

      const { result } = renderHook(() => useGalleryUrl({ search, navigate }))

      act(() => {
        result.current.setTheme(null)
      })

      const searchFn = navigate.mock.calls[0][0].search
      const newSearch = searchFn({ theme: 'Castle' })
      expect(newSearch.theme).toBeUndefined()
    })

    it('setSort calls navigate with correct params', () => {
      const navigate = createMockNavigate()
      const search: GallerySearchParams = {}

      const { result } = renderHook(() => useGalleryUrl({ search, navigate }))

      act(() => {
        result.current.setSort('title', 'asc')
      })

      const searchFn = navigate.mock.calls[0][0].search
      const newSearch = searchFn({})
      expect(newSearch.sort).toBe('title')
      expect(newSearch.order).toBe('asc')
    })

    it('setPage calls navigate with correct params', () => {
      const navigate = createMockNavigate()
      const search: GallerySearchParams = {}

      const { result } = renderHook(() => useGalleryUrl({ search, navigate }))

      act(() => {
        result.current.setPage(5)
      })

      const searchFn = navigate.mock.calls[0][0].search
      const newSearch = searchFn({})
      expect(newSearch.page).toBe(5)
    })

    it('setPage(1) removes page from URL', () => {
      const navigate = createMockNavigate()
      const search: GallerySearchParams = { page: 3 }

      const { result } = renderHook(() => useGalleryUrl({ search, navigate }))

      act(() => {
        result.current.setPage(1)
      })

      const searchFn = navigate.mock.calls[0][0].search
      const newSearch = searchFn({ page: 3 })
      expect(newSearch.page).toBeUndefined()
    })

    it('filter changes reset page', () => {
      const navigate = createMockNavigate()
      const search: GallerySearchParams = { page: 5 }

      const { result } = renderHook(() => useGalleryUrl({ search, navigate }))

      act(() => {
        result.current.setSearch('castle')
      })

      const searchFn = navigate.mock.calls[0][0].search
      const newSearch = searchFn({ page: 5 })
      expect(newSearch.page).toBeUndefined()
    })

    it('clearFilters removes all filter params', () => {
      const navigate = createMockNavigate()
      const search: GallerySearchParams = {
        q: 'castle',
        tags: ['tag1'],
        theme: 'Castle',
        page: 3,
      }

      const { result } = renderHook(() => useGalleryUrl({ search, navigate }))

      act(() => {
        result.current.clearFilters()
      })

      const searchFn = navigate.mock.calls[0][0].search
      const newSearch = searchFn(search)
      expect(newSearch.q).toBeUndefined()
      expect(newSearch.tags).toBeUndefined()
      expect(newSearch.theme).toBeUndefined()
      expect(newSearch.page).toBeUndefined()
    })
  })

  describe('computed values', () => {
    it('hasActiveFilters is true when search is set', () => {
      const navigate = createMockNavigate()
      const search: GallerySearchParams = { q: 'castle' }

      const { result } = renderHook(() => useGalleryUrl({ search, navigate }))

      expect(result.current.hasActiveFilters).toBe(true)
    })

    it('hasActiveFilters is false when no filters', () => {
      const navigate = createMockNavigate()
      const search: GallerySearchParams = {}

      const { result } = renderHook(() => useGalleryUrl({ search, navigate }))

      expect(result.current.hasActiveFilters).toBe(false)
    })

    it('filterState returns correct structure', () => {
      const navigate = createMockNavigate()
      const search: GallerySearchParams = {
        q: 'castle',
        tags: ['tag1'],
        theme: 'Castle',
      }

      const { result } = renderHook(() => useGalleryUrl({ search, navigate }))

      expect(result.current.filterState).toEqual({
        search: 'castle',
        tags: ['tag1'],
        theme: 'Castle',
      })
    })

    it('sortState returns correct structure', () => {
      const navigate = createMockNavigate()
      const search: GallerySearchParams = {
        sort: 'title',
        order: 'asc',
      }

      const { result } = renderHook(() => useGalleryUrl({ search, navigate }))

      expect(result.current.sortState).toEqual({
        field: 'title',
        direction: 'asc',
      })
    })
  })

  describe('custom param keys', () => {
    it('uses custom param keys', () => {
      const navigate = createMockNavigate()
      const search = {
        search: 'castle',
        filter_tags: ['tag1'],
      }

      const { result } = renderHook(() =>
        useGalleryUrl({
          search,
          navigate,
          paramKeys: {
            search: 'search',
            tags: 'filter_tags',
          },
        }),
      )

      expect(result.current.state.search).toBe('castle')
      expect(result.current.state.tags).toEqual(['tag1'])
    })
  })
})
