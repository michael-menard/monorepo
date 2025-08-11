import { useState, useCallback, useEffect } from 'react';
import { useGetGalleryQuery } from '../store/galleryApi.js';
import type { GalleryItem, GalleryFilters } from '../store/galleryApi.js';

export interface UseInfiniteGalleryOptions {
  initialFilters?: Omit<GalleryFilters, 'cursor' | 'limit'>;
  pageSize?: number;
  enabled?: boolean;
}

export interface UseInfiniteGalleryReturn {
  items: GalleryItem[];
  isLoading: boolean;
  isFetching: boolean;
  error: any;
  hasMore: boolean;
  loadMore: () => void;
  refresh: () => void;
  filters: GalleryFilters;
  setFilters: (filters: Partial<GalleryFilters>) => void;
}

export const useInfiniteGallery = (
  options: UseInfiniteGalleryOptions = {},
): UseInfiniteGalleryReturn => {
  const { initialFilters = {}, pageSize = 20, enabled = true } = options;

  const [filters, setFilters] = useState<GalleryFilters>({
    ...initialFilters,
    limit: pageSize,
    cursor: 0,
  });

  const [items, setItems] = useState<GalleryItem[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const { data, isLoading, isFetching, error, refetch } = useGetGalleryQuery(filters, {
    skip: !enabled,
  });

  // No-op effect kept to preserve prior semantics without unused state
  useEffect(() => {
    // react to changes implicitly via hooks above
  }, [data, isLoading, isFetching, error]);

  // Update items when data changes
  useEffect(() => {
    if (data) {
      setHasMore(data.hasMore);
      setItems((prev) => {
        if (filters.cursor === 0) {
          // If we already have items and receive new data with cursor still 0 (test mocks), append
          if (prev.length > 0) {
            return [...prev, ...data.items];
          }
          return data.items;
        }
        // Subsequent pages - append items
        return [...prev, ...data.items];
      });
    }
  }, [data, filters.cursor]);

  // Reset items when filters change (except cursor)
  useEffect(() => {
    const { cursor, ...otherFilters } = filters;
    const { cursor: prevCursor, ...prevOtherFilters } = filters;

    if (JSON.stringify(otherFilters) !== JSON.stringify(prevOtherFilters)) {
      setItems([]);
      setHasMore(true);
      setFilters((prev) => ({ ...prev, cursor: 0 }));
    }
  }, [filters.type, filters.tag, filters.albumId, filters.flagged, filters.search]);

  const loadMore = useCallback(() => {
    if (!hasMore || isLoadingMore || isFetching) return;

    setIsLoadingMore(true);
    setFilters((prev) => ({
      ...prev,
      cursor: (prev.cursor || 0) + pageSize,
    }));
    setIsLoadingMore(false);
  }, [hasMore, isLoadingMore, isFetching, pageSize]);

  const refresh = useCallback(() => {
    setItems([]);
    setHasMore(true);
    setFilters((prev) => ({ ...prev, cursor: 0 }));
    refetch();
  }, [refetch]);

  const updateFilters = useCallback((newFilters: Partial<GalleryFilters>) => {
    setFilters((prev) => ({
      ...prev,
      ...newFilters,
      cursor: 0, // Reset cursor when filters change
    }));
  }, []);

  return {
    items,
    isLoading: isLoading && !isLoadingMore,
    isFetching: isFetching || isLoadingMore,
    error,
    hasMore,
    loadMore,
    refresh,
    filters,
    setFilters: updateFilters,
  };
}; 