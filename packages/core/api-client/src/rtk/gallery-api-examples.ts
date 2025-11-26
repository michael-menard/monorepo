/**
 * Enhanced Gallery API Usage Examples
 * Demonstrates how to use the enhanced serverless Gallery API with all optimizations
 */

import { useState, useEffect, useCallback } from 'react'
import {
  useEnhancedGallerySearchQuery,
  useBatchGetGalleryImagesQuery,
  useEnhancedBatchGalleryOperationMutation,
  useGetEnhancedGalleryStatsQuery,
  type EnhancedGallerySearchParams
} from './gallery-api'

/**
 * Example 1: Advanced Gallery Search with Filtering
 */
export function useAdvancedGallerySearch() {
  const searchParams: EnhancedGallerySearchParams = {
    // Basic search
    query: 'technic vehicle',
    category: 'vehicles',
    tags: ['technic', 'motorized'],
    
    // LEGO-specific filters
    difficulty: ['intermediate', 'advanced'],
    pieceCount: { min: 500, max: 2000 },
    themes: ['Technic', 'Creator Expert'],
    buildingTechniques: ['SNOT', 'Minifig scale'],
    
    // Content filters
    hasInstructions: true,
    hasPartsList: true,
    isOriginalDesign: true,
    isFeatured: false,
    
    // Pagination with prefetching
    page: 1,
    limit: 20,
    prefetchNext: true, // Automatically prefetch next page
    
    // Sorting
    sortBy: 'popularity',
    sortOrder: 'desc',
    secondarySortBy: 'date',
    
    // Performance optimizations
    includeMetadata: true,
    includeThumbnails: true,
    cacheStrategy: 'medium', // Cache for 5 minutes
    enableBatchLoading: true,
  }

  const {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  } = useEnhancedGallerySearchQuery(searchParams, {
    // RTK Query options with serverless optimizations
    refetchOnMountOrArgChange: 300, // 5 minutes
    refetchOnFocus: false,
    refetchOnReconnect: true,
  })

  return {
    images: data?.data.images || [],
    pagination: data?.pagination,
    totalCount: data?.data.totalCount || 0,
    isLoading,
    isFetching,
    error,
    refetch,
  }
}

/**
 * Example 2: Batch Image Loading for Performance
 */
export function useBatchImageLoader(imageIds: string[]) {
  const {
    data,
    isLoading,
    error,
  } = useBatchGetGalleryImagesQuery(imageIds, {
    skip: imageIds.length === 0,
    // Use persistent cache for batch loaded images
    refetchOnMountOrArgChange: false,
  })

  return {
    images: data?.data || [],
    isLoading,
    error,
    // Helper to get specific image by ID
    getImageById: (id: string) => data?.data.find(img => img.id === id),
  }
}

/**
 * Example 3: Batch Operations with Optimistic Updates
 */
export function useGalleryBatchOperations() {
  const [batchOperation, { isLoading, error }] = useEnhancedBatchGalleryOperationMutation()

  const batchDeleteImages = async (imageIds: string[]) => {
    return batchOperation({
      operation: 'delete',
      imageIds,
    }).unwrap()
  }

  const batchUpdateTags = async (imageIds: string[], tags: string[]) => {
    return batchOperation({
      operation: 'updateTags',
      imageIds,
      data: { tags },
    }).unwrap()
  }

  const batchUpdateCategory = async (imageIds: string[], category: string) => {
    return batchOperation({
      operation: 'updateCategory',
      imageIds,
      data: { category },
    }).unwrap()
  }

  return {
    batchDeleteImages,
    batchUpdateTags,
    batchUpdateCategory,
    isLoading,
    error,
  }
}

/**
 * Example 4: Gallery Statistics with Caching
 */
export function useGalleryStatistics() {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useGetEnhancedGalleryStatsQuery(undefined, {
    // Statistics don't change often, use long cache
    refetchOnMountOrArgChange: 1800, // 30 minutes
    refetchOnFocus: false,
    refetchOnReconnect: false,
  })

  return {
    stats: data?.data,
    totalImages: data?.data?.totalImages || 0,
    totalCategories: data?.data?.totalCategories || 0,
    totalTags: data?.data?.totalTags || 0,
    popularCategories: data?.data?.popularCategories || [],
    recentUploads: data?.data?.recentUploads || 0,
    isLoading,
    error,
    refetch,
  }
}

/**
 * Example 5: Infinite Scroll with Enhanced Gallery API
 */
export function useInfiniteGalleryScroll(baseParams: Partial<EnhancedGallerySearchParams>) {
  const [page, setPage] = useState(1)
  const [allImages, setAllImages] = useState<any[]>([])

  const searchParams = {
    ...baseParams,
    page,
    limit: 20,
    prefetchNext: true,
    cacheStrategy: 'short' as const, // Fresh data for infinite scroll
  }

  const { data, isLoading, isFetching } = useEnhancedGallerySearchQuery(searchParams)

  useEffect(() => {
    if (data?.data.images) {
      if (page === 1) {
        setAllImages(data.data.images)
      } else {
        setAllImages(prev => [...prev, ...data.data.images])
      }
    }
  }, [data, page])

  const loadMore = useCallback(() => {
    if (data?.pagination?.hasMore && !isFetching) {
      setPage(prev => prev + 1)
    }
  }, [data?.pagination?.hasMore, isFetching])

  const reset = useCallback(() => {
    setPage(1)
    setAllImages([])
  }, [])

  return {
    images: allImages,
    hasMore: data?.pagination?.hasMore || false,
    isLoading: isLoading && page === 1,
    isLoadingMore: isFetching && page > 1,
    loadMore,
    reset,
  }
}
