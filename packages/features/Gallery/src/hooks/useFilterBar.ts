import { useState, useCallback, useMemo } from 'react';
import {
  useSearchImagesQuery,
  useGetAvailableTagsQuery,
  useGetAvailableCategoriesQuery,
} from '../store/galleryApi';
import type { FilterState } from '../schemas';

export interface UseFilterBarOptions {
  initialFilters?: Partial<FilterState>;
  debounceMs?: number;
  pageSize?: number;
}

export interface UseFilterBarReturn {
  // State
  filters: FilterState;
  searchResults: any[];
  isLoading: boolean;
  error: any;
  totalResults: number;
  hasActiveFilters: boolean;

  // Available options
  availableTags: string[];
  availableCategories: string[];

  // Actions
  setSearchQuery: (query: string) => void;
  setSelectedTags: (tags: string[]) => void;
  setSelectedCategory: (category: string) => void;
  clearFilters: () => void;
  toggleTag: (tag: string) => void;

  // Computed
  searchParams: {
    query?: string;
    tags?: string[];
    category?: string;
    from?: number;
    size?: number;
  };
}

export const useFilterBar = (options: UseFilterBarOptions = {}): UseFilterBarReturn => {
  const { initialFilters = {}, pageSize = 20 } = options;

  // Local filter state
  const [filters, setFilters] = useState<FilterState>({
    searchQuery: '',
    selectedTags: [],
    selectedCategory: '',
    ...initialFilters,
  });

  // Get available tags and categories
  const { data: availableTags = [] } = useGetAvailableTagsQuery();
  const { data: availableCategories = [] } = useGetAvailableCategoriesQuery();

  // Computed values
  const hasActiveFilters = useMemo(() => {
    return !!(
      filters.searchQuery.trim() ||
      filters.selectedTags.length > 0 ||
      filters.selectedCategory
    );
  }, [filters]);

  // Compute search parameters for API call
  const searchParams = useMemo(() => {
    const params: {
      query?: string;
      tags?: string[];
      category?: string;
      from?: number;
      size?: number;
    } = {};

    if (filters.searchQuery.trim()) {
      params.query = filters.searchQuery.trim();
    }

    if (filters.selectedTags.length > 0) {
      params.tags = filters.selectedTags;
    }

    if (filters.selectedCategory) {
      params.category = filters.selectedCategory;
    }

    params.size = pageSize;

    return params;
  }, [filters, pageSize]);

  // Perform search query
  const {
    data: searchData,
    isLoading,
    error,
  } = useSearchImagesQuery(searchParams, {
    skip: !hasActiveFilters && !filters.searchQuery.trim(),
  });

  const searchResults = useMemo(() => {
    return searchData?.data || [];
  }, [searchData]);

  const totalResults = useMemo(() => {
    return searchData?.total || 0;
  }, [searchData]);

  // Action handlers
  const setSearchQuery = useCallback((query: string) => {
    setFilters((prev) => ({ ...prev, searchQuery: query }));
  }, []);

  const setSelectedTags = useCallback((tags: string[]) => {
    setFilters((prev) => ({ ...prev, selectedTags: tags }));
  }, []);

  const setSelectedCategory = useCallback((category: string) => {
    setFilters((prev) => ({ ...prev, selectedCategory: category }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      searchQuery: '',
      selectedTags: [],
      selectedCategory: '',
    });
  }, []);

  const toggleTag = useCallback((tag: string) => {
    setFilters((prev) => {
      const newTags = prev.selectedTags.includes(tag)
        ? prev.selectedTags.filter((t) => t !== tag)
        : [...prev.selectedTags, tag];

      return { ...prev, selectedTags: newTags };
    });
  }, []);

  return {
    // State
    filters,
    searchResults,
    isLoading,
    error,
    totalResults,
    hasActiveFilters,

    // Available options
    availableTags,
    availableCategories,

    // Actions
    setSearchQuery,
    setSelectedTags,
    setSelectedCategory,
    clearFilters,
    toggleTag,

    // Computed
    searchParams,
  };
};
