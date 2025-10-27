import { renderHook, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import React from 'react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'

// Mock the gallery API hooks BEFORE importing the hook under test
vi.mock('../../store/galleryApi', () => ({
  useSearchImagesQuery: vi.fn(),
  useGetAvailableTagsQuery: vi.fn(),
  useGetAvailableCategoriesQuery: vi.fn(),
}))

import * as GalleryApi from '../../store/galleryApi'
import { useFilterBar } from '../useFilterBar'

describe('useFilterBar', () => {
  let store: any

  beforeEach(() => {
    vi.clearAllMocks()
    // Minimal store for Provider context
    store = configureStore({ reducer: (state = {}) => state })

    // Default mock implementations
    ;(GalleryApi.useGetAvailableTagsQuery as any).mockReturnValue({
      data: ['nature', 'city', 'portrait', 'landscape'],
    })
    ;(GalleryApi.useGetAvailableCategoriesQuery as any).mockReturnValue({
      data: ['photography', 'art', 'design'],
    })
    ;(GalleryApi.useSearchImagesQuery as any).mockReturnValue({
      data: { data: [], total: 0 },
      isLoading: false,
      error: null,
    })
  })

  it('initializes with default state', () => {
    const wrapper = ({ children }: any) => React.createElement(Provider as any, { store }, children)
    const { result } = renderHook(() => useFilterBar(), { wrapper })

    expect(result.current.filters).toEqual({
      searchQuery: '',
      selectedTags: [],
      selectedCategory: '',
    })

    expect(result.current.hasActiveFilters).toBe(false)
    expect(result.current.searchResults).toEqual([])
    expect(result.current.totalResults).toBe(0)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.error).toBe(null)
  })

  it('initializes with custom initial filters', () => {
    const initialFilters = {
      searchQuery: 'test',
      selectedTags: ['nature'],
      selectedCategory: 'photography',
    }

    const wrapper = ({ children }: any) => React.createElement(Provider as any, { store }, children)
    const { result } = renderHook(() => useFilterBar({ initialFilters }), { wrapper })

    expect(result.current.filters).toEqual(initialFilters)
    expect(result.current.hasActiveFilters).toBe(true)
  })

  it('updates search query', () => {
    const wrapper = ({ children }: any) => React.createElement(Provider as any, { store }, children)
    const { result } = renderHook(() => useFilterBar(), { wrapper })

    act(() => {
      result.current.setSearchQuery('test query')
    })

    expect(result.current.filters.searchQuery).toBe('test query')
    expect(result.current.hasActiveFilters).toBe(true)
  })

  it('updates selected tags', () => {
    const wrapper = ({ children }: any) => React.createElement(Provider as any, { store }, children)
    const { result } = renderHook(() => useFilterBar(), { wrapper })

    act(() => {
      result.current.setSelectedTags(['nature', 'city'])
    })

    expect(result.current.filters.selectedTags).toEqual(['nature', 'city'])
    expect(result.current.hasActiveFilters).toBe(true)
  })

  it('updates selected category', () => {
    const wrapper = ({ children }: any) => React.createElement(Provider as any, { store }, children)
    const { result } = renderHook(() => useFilterBar(), { wrapper })

    act(() => {
      result.current.setSelectedCategory('photography')
    })

    expect(result.current.filters.selectedCategory).toBe('photography')
    expect(result.current.hasActiveFilters).toBe(true)
  })

  it('toggles tag selection', () => {
    const wrapper = ({ children }: any) => React.createElement(Provider as any, { store }, children)
    const { result } = renderHook(() => useFilterBar(), { wrapper })

    // Add tag
    act(() => {
      result.current.toggleTag('nature')
    })

    expect(result.current.filters.selectedTags).toEqual(['nature'])

    // Remove tag
    act(() => {
      result.current.toggleTag('nature')
    })

    expect(result.current.filters.selectedTags).toEqual([])
  })

  it('adds multiple tags', () => {
    const wrapper = ({ children }: any) => React.createElement(Provider as any, { store }, children)
    const { result } = renderHook(() => useFilterBar(), { wrapper })

    act(() => {
      result.current.toggleTag('nature')
      result.current.toggleTag('city')
    })

    expect(result.current.filters.selectedTags).toEqual(['nature', 'city'])
  })

  it('clears all filters', () => {
    const initialFilters = {
      searchQuery: 'test',
      selectedTags: ['nature'],
      selectedCategory: 'photography',
    }

    const wrapper = ({ children }: any) => React.createElement(Provider as any, { store }, children)
    const { result } = renderHook(() => useFilterBar({ initialFilters }), { wrapper })

    act(() => {
      result.current.clearFilters()
    })

    expect(result.current.filters).toEqual({
      searchQuery: '',
      selectedTags: [],
      selectedCategory: '',
    })
    expect(result.current.hasActiveFilters).toBe(false)
  })

  it('computes search parameters correctly', () => {
    const wrapper = ({ children }: any) => React.createElement(Provider as any, { store }, children)
    const { result } = renderHook(() => useFilterBar(), { wrapper })

    act(() => {
      result.current.setSearchQuery('test query')
      result.current.setSelectedTags(['nature', 'city'])
      result.current.setSelectedCategory('photography')
    })

    expect(result.current.searchParams).toEqual({
      query: 'test query',
      tags: ['nature', 'city'],
      category: 'photography',
      size: 20,
    })
  })

  it('omits empty search parameters', () => {
    const wrapper = ({ children }: any) => React.createElement(Provider as any, { store }, children)
    const { result } = renderHook(() => useFilterBar(), { wrapper })

    act(() => {
      result.current.setSearchQuery('   ') // Whitespace only
      result.current.setSelectedTags([])
      result.current.setSelectedCategory('')
    })

    expect(result.current.searchParams).toEqual({
      size: 20,
    })
  })

  it('trims search query whitespace', () => {
    const wrapper = ({ children }: any) => React.createElement(Provider as any, { store }, children)
    const { result } = renderHook(() => useFilterBar(), { wrapper })

    act(() => {
      result.current.setSearchQuery('  test query  ')
    })

    expect(result.current.searchParams.query).toBe('test query')
  })

  it('uses custom page size', () => {
    const wrapper = ({ children }: any) => React.createElement(Provider as any, { store }, children)
    const { result } = renderHook(() => useFilterBar({ pageSize: 50 }), { wrapper })

    expect(result.current.searchParams.size).toBe(50)
  })

  it('returns available tags and categories', () => {
    const wrapper = ({ children }: any) => React.createElement(Provider as any, { store }, children)
    const { result } = renderHook(() => useFilterBar(), { wrapper })

    expect(result.current.availableTags).toEqual(['nature', 'city', 'portrait', 'landscape'])
    expect(result.current.availableCategories).toEqual(['photography', 'art', 'design'])
  })

  it('handles search results correctly', () => {
    const mockSearchData = {
      data: [
        { id: '1', title: 'Image 1' },
        { id: '2', title: 'Image 2' },
      ],
      total: 2,
    }

    ;(GalleryApi.useSearchImagesQuery as any).mockReturnValue({
      data: mockSearchData,
      isLoading: false,
      error: null,
    })

    const wrapper = ({ children }: any) => React.createElement(Provider as any, { store }, children)
    const { result } = renderHook(() => useFilterBar(), { wrapper })

    expect(result.current.searchResults).toEqual(mockSearchData.data)
    expect(result.current.totalResults).toBe(2)
  })

  it('handles loading state', () => {
    ;(GalleryApi.useSearchImagesQuery as any).mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    })

    const wrapper = ({ children }: any) => React.createElement(Provider as any, { store }, children)
    const { result } = renderHook(() => useFilterBar(), { wrapper })

    expect(result.current.isLoading).toBe(true)
  })

  it('handles error state', () => {
    const mockError = new Error('Search failed')

    ;(GalleryApi.useSearchImagesQuery as any).mockReturnValue({
      data: null,
      isLoading: false,
      error: mockError,
    })

    const wrapper = ({ children }: any) => React.createElement(Provider as any, { store }, children)
    const { result } = renderHook(() => useFilterBar(), { wrapper })

    expect(result.current.error).toBe(mockError)
  })

  it('skips search query when no active filters', () => {
    const wrapper = ({ children }: any) => React.createElement(Provider as any, { store }, children)
    const { result } = renderHook(() => useFilterBar(), { wrapper })

    // Should not call search query when no filters are active
    expect(GalleryApi.useSearchImagesQuery).toHaveBeenCalledWith({ size: 20 }, { skip: true })
  })

  it('performs search when filters are active', () => {
    const wrapper = ({ children }: any) => React.createElement(Provider as any, { store }, children)
    const { result } = renderHook(() => useFilterBar(), { wrapper })

    act(() => {
      result.current.setSearchQuery('test')
    })

    expect(GalleryApi.useSearchImagesQuery).toHaveBeenCalledWith(
      { query: 'test', size: 20 },
      { skip: false },
    )
  })

  it('handles empty available tags and categories', () => {
    ;(GalleryApi.useGetAvailableTagsQuery as any).mockReturnValue({ data: [] })
    ;(GalleryApi.useGetAvailableCategoriesQuery as any).mockReturnValue({ data: [] })

    const wrapper = ({ children }: any) => React.createElement(Provider as any, { store }, children)
    const { result } = renderHook(() => useFilterBar(), { wrapper })

    expect(result.current.availableTags).toEqual([])
    expect(result.current.availableCategories).toEqual([])
  })

  it('maintains filter state across re-renders', () => {
    const wrapper = ({ children }: any) => React.createElement(Provider as any, { store }, children)
    const { result, rerender } = renderHook(() => useFilterBar(), { wrapper })

    act(() => {
      result.current.setSearchQuery('test')
      result.current.setSelectedTags(['nature'])
    })

    // Re-render the hook
    rerender()

    expect(result.current.filters.searchQuery).toBe('test')
    expect(result.current.filters.selectedTags).toEqual(['nature'])
    expect(result.current.hasActiveFilters).toBe(true)
  })

  it('computes hasActiveFilters correctly', () => {
    const wrapper = ({ children }: any) => React.createElement(Provider as any, { store }, children)
    const { result } = renderHook(() => useFilterBar(), { wrapper })

    // Initially no active filters
    expect(result.current.hasActiveFilters).toBe(false)

    // Add search query
    act(() => {
      result.current.setSearchQuery('test')
    })
    expect(result.current.hasActiveFilters).toBe(true)

    // Clear search, add tags
    act(() => {
      result.current.setSearchQuery('')
      result.current.setSelectedTags(['nature'])
    })
    expect(result.current.hasActiveFilters).toBe(true)

    // Clear tags, add category
    act(() => {
      result.current.setSelectedTags([])
      result.current.setSelectedCategory('photography')
    })
    expect(result.current.hasActiveFilters).toBe(true)

    // Clear everything
    act(() => {
      result.current.setSelectedCategory('')
    })
    expect(result.current.hasActiveFilters).toBe(false)
  })
})
