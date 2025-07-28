import { renderHook, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useFilterBar } from '../useFilterBar';

// Mock the gallery API hooks
const mockUseSearchImagesQuery = vi.fn();
const mockUseGetAvailableTagsQuery = vi.fn();
const mockUseGetAvailableCategoriesQuery = vi.fn();

vi.mock('../store/galleryApi', () => ({
  useSearchImagesQuery: mockUseSearchImagesQuery,
  useGetAvailableTagsQuery: mockUseGetAvailableTagsQuery,
  useGetAvailableCategoriesQuery: mockUseGetAvailableCategoriesQuery,
}));

describe('useFilterBar', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock implementations
    mockUseGetAvailableTagsQuery.mockReturnValue({
      data: ['nature', 'city', 'portrait', 'landscape'],
    });
    
    mockUseGetAvailableCategoriesQuery.mockReturnValue({
      data: ['photography', 'art', 'design'],
    });
    
    mockUseSearchImagesQuery.mockReturnValue({
      data: { data: [], total: 0 },
      isLoading: false,
      error: null,
    });
  });

  it('initializes with default state', () => {
    const { result } = renderHook(() => useFilterBar());

    expect(result.current.filters).toEqual({
      searchQuery: '',
      selectedTags: [],
      selectedCategory: '',
    });
    
    expect(result.current.hasActiveFilters).toBe(false);
    expect(result.current.searchResults).toEqual([]);
    expect(result.current.totalResults).toBe(0);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
  });

  it('initializes with custom initial filters', () => {
    const initialFilters = {
      searchQuery: 'test',
      selectedTags: ['nature'],
      selectedCategory: 'photography',
    };

    const { result } = renderHook(() => useFilterBar({ initialFilters }));

    expect(result.current.filters).toEqual(initialFilters);
    expect(result.current.hasActiveFilters).toBe(true);
  });

  it('updates search query', () => {
    const { result } = renderHook(() => useFilterBar());

    act(() => {
      result.current.setSearchQuery('test query');
    });

    expect(result.current.filters.searchQuery).toBe('test query');
    expect(result.current.hasActiveFilters).toBe(true);
  });

  it('updates selected tags', () => {
    const { result } = renderHook(() => useFilterBar());

    act(() => {
      result.current.setSelectedTags(['nature', 'city']);
    });

    expect(result.current.filters.selectedTags).toEqual(['nature', 'city']);
    expect(result.current.hasActiveFilters).toBe(true);
  });

  it('updates selected category', () => {
    const { result } = renderHook(() => useFilterBar());

    act(() => {
      result.current.setSelectedCategory('photography');
    });

    expect(result.current.filters.selectedCategory).toBe('photography');
    expect(result.current.hasActiveFilters).toBe(true);
  });

  it('toggles tag selection', () => {
    const { result } = renderHook(() => useFilterBar());

    // Add tag
    act(() => {
      result.current.toggleTag('nature');
    });

    expect(result.current.filters.selectedTags).toEqual(['nature']);

    // Remove tag
    act(() => {
      result.current.toggleTag('nature');
    });

    expect(result.current.filters.selectedTags).toEqual([]);
  });

  it('adds multiple tags', () => {
    const { result } = renderHook(() => useFilterBar());

    act(() => {
      result.current.toggleTag('nature');
      result.current.toggleTag('city');
    });

    expect(result.current.filters.selectedTags).toEqual(['nature', 'city']);
  });

  it('clears all filters', () => {
    const initialFilters = {
      searchQuery: 'test',
      selectedTags: ['nature'],
      selectedCategory: 'photography',
    };

    const { result } = renderHook(() => useFilterBar({ initialFilters }));

    act(() => {
      result.current.clearFilters();
    });

    expect(result.current.filters).toEqual({
      searchQuery: '',
      selectedTags: [],
      selectedCategory: '',
    });
    expect(result.current.hasActiveFilters).toBe(false);
  });

  it('computes search parameters correctly', () => {
    const { result } = renderHook(() => useFilterBar());

    act(() => {
      result.current.setSearchQuery('test query');
      result.current.setSelectedTags(['nature', 'city']);
      result.current.setSelectedCategory('photography');
    });

    expect(result.current.searchParams).toEqual({
      query: 'test query',
      tags: ['nature', 'city'],
      category: 'photography',
      size: 20,
    });
  });

  it('omits empty search parameters', () => {
    const { result } = renderHook(() => useFilterBar());

    act(() => {
      result.current.setSearchQuery('   '); // Whitespace only
      result.current.setSelectedTags([]);
      result.current.setSelectedCategory('');
    });

    expect(result.current.searchParams).toEqual({
      size: 20,
    });
  });

  it('trims search query whitespace', () => {
    const { result } = renderHook(() => useFilterBar());

    act(() => {
      result.current.setSearchQuery('  test query  ');
    });

    expect(result.current.searchParams.query).toBe('test query');
  });

  it('uses custom page size', () => {
    const { result } = renderHook(() => useFilterBar({ pageSize: 50 }));

    expect(result.current.searchParams.size).toBe(50);
  });

  it('returns available tags and categories', () => {
    const { result } = renderHook(() => useFilterBar());

    expect(result.current.availableTags).toEqual(['nature', 'city', 'portrait', 'landscape']);
    expect(result.current.availableCategories).toEqual(['photography', 'art', 'design']);
  });

  it('handles search results correctly', () => {
    const mockSearchData = {
      data: [
        { id: '1', title: 'Image 1' },
        { id: '2', title: 'Image 2' },
      ],
      total: 2,
    };

    mockUseSearchImagesQuery.mockReturnValue({
      data: mockSearchData,
      isLoading: false,
      error: null,
    });

    const { result } = renderHook(() => useFilterBar());

    expect(result.current.searchResults).toEqual(mockSearchData.data);
    expect(result.current.totalResults).toBe(2);
  });

  it('handles loading state', () => {
    mockUseSearchImagesQuery.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });

    const { result } = renderHook(() => useFilterBar());

    expect(result.current.isLoading).toBe(true);
  });

  it('handles error state', () => {
    const mockError = new Error('Search failed');
    
    mockUseSearchImagesQuery.mockReturnValue({
      data: null,
      isLoading: false,
      error: mockError,
    });

    const { result } = renderHook(() => useFilterBar());

    expect(result.current.error).toBe(mockError);
  });

  it('skips search query when no active filters', () => {
    const { result } = renderHook(() => useFilterBar());

    // Should not call search query when no filters are active
    expect(mockUseSearchImagesQuery).toHaveBeenCalledWith(
      { size: 20 },
      { skip: true }
    );
  });

  it('performs search when filters are active', () => {
    const { result } = renderHook(() => useFilterBar());

    act(() => {
      result.current.setSearchQuery('test');
    });

    expect(mockUseSearchImagesQuery).toHaveBeenCalledWith(
      { query: 'test', size: 20 },
      { skip: false }
    );
  });

  it('handles empty available tags and categories', () => {
    mockUseGetAvailableTagsQuery.mockReturnValue({ data: [] });
    mockUseGetAvailableCategoriesQuery.mockReturnValue({ data: [] });

    const { result } = renderHook(() => useFilterBar());

    expect(result.current.availableTags).toEqual([]);
    expect(result.current.availableCategories).toEqual([]);
  });

  it('maintains filter state across re-renders', () => {
    const { result, rerender } = renderHook(() => useFilterBar());

    act(() => {
      result.current.setSearchQuery('test');
      result.current.setSelectedTags(['nature']);
    });

    // Re-render the hook
    rerender();

    expect(result.current.filters.searchQuery).toBe('test');
    expect(result.current.filters.selectedTags).toEqual(['nature']);
    expect(result.current.hasActiveFilters).toBe(true);
  });

  it('computes hasActiveFilters correctly', () => {
    const { result } = renderHook(() => useFilterBar());

    // Initially no active filters
    expect(result.current.hasActiveFilters).toBe(false);

    // Add search query
    act(() => {
      result.current.setSearchQuery('test');
    });
    expect(result.current.hasActiveFilters).toBe(true);

    // Clear search, add tags
    act(() => {
      result.current.setSearchQuery('');
      result.current.setSelectedTags(['nature']);
    });
    expect(result.current.hasActiveFilters).toBe(true);

    // Clear tags, add category
    act(() => {
      result.current.setSelectedTags([]);
      result.current.setSelectedCategory('photography');
    });
    expect(result.current.hasActiveFilters).toBe(true);

    // Clear everything
    act(() => {
      result.current.setSelectedCategory('');
    });
    expect(result.current.hasActiveFilters).toBe(false);
  });
}); 