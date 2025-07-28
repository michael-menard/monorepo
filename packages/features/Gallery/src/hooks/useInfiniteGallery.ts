import { useState, useCallback, useRef, useEffect } from 'react';
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

  // Update items when data changes
  useEffect(() => {
    if (data) {
      if (filters.cursor === 0) {
        // First page - replace items
        setItems(data.items);
      } else {
        // Subsequent pages - append items
        setItems((prev) => [...prev, ...data.items]);
      }
      setHasMore(data.hasMore);
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