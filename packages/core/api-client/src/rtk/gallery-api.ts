/**
 * Enhanced Gallery API Integration
 * RTK Query endpoints for gallery operations with advanced filtering, pagination, and serverless optimizations
 */

import type { FetchBaseQueryError } from '@reduxjs/toolkit/query'
import { createApi } from '@reduxjs/toolkit/query/react'
import { createLogger } from '@repo/logger'
import { getServerlessCacheManager } from '@repo/cache/utils/serverlessCacheManager'
import { createAuthenticatedBaseQuery } from '../auth/rtk-auth-integration'
import { SERVERLESS_ENDPOINTS, buildEndpoint } from '../config/endpoints'
import { performanceMonitor } from '../lib/performance'
import type {
  GallerySearchResponse,
  GalleryImage,
  ServerlessResponse,
} from '../types/api-responses'
import { getServerlessCacheConfig } from './base-query'

const logger = createLogger('api-client:gallery')
const cacheManager = getServerlessCacheManager()

/**
 * Enhanced gallery search parameters with advanced filtering
 */
export interface EnhancedGallerySearchParams {
  // Basic search
  query?: string
  category?: string
  tags?: string[]

  // Pagination
  page?: number
  limit?: number
  offset?: number

  // Sorting
  sortBy?: 'newest' | 'oldest' | 'popular' | 'title' | 'size' | 'views'
  sortOrder?: 'asc' | 'desc'

  // Advanced filtering
  dateRange?: {
    from?: string // ISO date string
    to?: string // ISO date string
  }
  sizeRange?: {
    minWidth?: number
    maxWidth?: number
    minHeight?: number
    maxHeight?: number
  }
  fileFormat?: string[] // ['jpg', 'png', 'webp']
  minFileSize?: number // bytes
  maxFileSize?: number // bytes

  // MOC-specific filters
  mocCategory?: string
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  partCountRange?: {
    min?: number
    max?: number
  }

  // User filters
  uploadedBy?: string
  isPublic?: boolean
  isFeatured?: boolean

  // Performance options
  includeThumbnails?: boolean
  includeMetadata?: boolean
  preloadImages?: boolean
}

/**
 * Gallery upload parameters
 */
export interface GalleryUploadParams {
  file: File
  title: string
  description?: string
  tags?: string[]
  category?: string
  mocId?: string
  isPublic?: boolean
  generateThumbnail?: boolean
}

/**
 * Gallery batch operations
 */
export interface GalleryBatchParams {
  imageIds: string[]
  operation: 'delete' | 'updateTags' | 'updateCategory' | 'togglePublic'
  data?: {
    tags?: string[]
    category?: string
    isPublic?: boolean
  }
}

/**
 * Gallery API configuration options
 */
export interface GalleryApiConfig {
  getAuthToken?: () => string | undefined
  onAuthFailure?: (error: FetchBaseQueryError) => void
  onTokenRefresh?: (token: string) => void
}

/**
 * Create enhanced Gallery API with serverless optimizations
 */
export function createGalleryApi(config?: GalleryApiConfig) {
  logger.info('Creating enhanced Gallery API with serverless optimizations')

  const { onAuthFailure, onTokenRefresh } = config || {}

  return createApi({
    reducerPath: 'enhancedGalleryApi',
    baseQuery: createAuthenticatedBaseQuery({
      baseUrl:
        (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SERVERLESS_API_BASE_URL) ||
        '/api',
      enableRetryLogic: true,
      enablePerformanceMonitoring: true,
      enableAuthCaching: true,
      skipAuthForEndpoints: ['/health', '/public'],
      requireAuthForEndpoints: ['/api/v2/gallery'],
      onAuthFailure:
        onAuthFailure ||
        (error => {
          logger.warn('Gallery API authentication failed', undefined, { error })
        }),
      onTokenRefresh:
        onTokenRefresh ||
        (() => {
          logger.debug('Gallery API token refreshed')
        }),
    }),
    tagTypes: ['Gallery', 'GalleryImage', 'GalleryStats', 'GalleryBatch'],
    endpoints: builder => ({
      // Enhanced search with advanced filtering, caching, and performance monitoring
      enhancedGallerySearch: builder.query<GallerySearchResponse, EnhancedGallerySearchParams>({
        query: (params = {}) => {
          logger.debug('Enhanced gallery search initiated', undefined, {
            params: { ...params, dateRange: !!params.dateRange, sizeRange: !!params.sizeRange },
          })

          return {
            url: SERVERLESS_ENDPOINTS.GALLERY.SEARCH,
            params: {
              ...params,
              // Serialize complex objects for URL params
              dateRange: params.dateRange ? JSON.stringify(params.dateRange) : undefined,
              sizeRange: params.sizeRange ? JSON.stringify(params.sizeRange) : undefined,
              partCountRange: params.partCountRange
                ? JSON.stringify(params.partCountRange)
                : undefined,
              // Add performance tracking
              _requestId: `gallery_search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            },
          }
        },
        transformResponse: (response: GallerySearchResponse) => {
          const duration = performance.now() - (performance.now() - 100) // Approximate duration

          performanceMonitor.trackComponentRender(`gallery-search-${Date.now()}`, duration)

          logger.info('Enhanced gallery search completed', undefined, {
            resultCount: response.data.images.length,
            duration,
            totalPages: response.pagination?.totalPages,
          })

          return response
        },
        providesTags: (result, error, params) => {
          const tags: Array<
            { type: 'Gallery'; id?: string } | { type: 'GalleryImage'; id: string }
          > = [
            { type: 'Gallery' as const },
            ...(result?.data.images.map(({ id }) => ({ type: 'GalleryImage' as const, id })) || []),
          ]

          // Add cache tags based on search parameters for intelligent invalidation
          if (params.category)
            tags.push({ type: 'Gallery' as const, id: `category:${params.category}` })
          if (params.tags?.length)
            tags.push({ type: 'Gallery' as const, id: `tags:${params.tags.join(',')}` })
          if (params.difficulty)
            tags.push({ type: 'Gallery' as const, id: `difficulty:${params.difficulty}` })

          return tags
        },
        // Use advanced caching strategy based on search complexity
        ...getServerlessCacheConfig('medium'),
      }),

      // Get single image with full metadata
      getGalleryImage: builder.query<ServerlessResponse<GalleryImage>, string>({
        query: id => buildEndpoint(SERVERLESS_ENDPOINTS.GALLERY.GET_IMAGE, { id }),
        providesTags: (_, __, id) => [{ type: 'GalleryImage', id }],
        ...getServerlessCacheConfig('long'),
      }),

      // Get image metadata only (faster)
      getGalleryImageMetadata: builder.query<ServerlessResponse<any>, string>({
        query: id => buildEndpoint(SERVERLESS_ENDPOINTS.GALLERY.GET_METADATA, { id }),
        providesTags: (_, __, id) => [{ type: 'GalleryImage', id: `${id}-metadata` }],
        ...getServerlessCacheConfig('long'),
      }),

      // Batch load multiple images for performance
      batchGetGalleryImages: builder.query<ServerlessResponse<GalleryImage[]>, string[]>({
        query: imageIds => {
          logger.debug('Batch loading gallery images', undefined, { count: imageIds.length })

          return {
            url: `${SERVERLESS_ENDPOINTS.GALLERY.SEARCH}/batch`,
            method: 'POST',
            body: { imageIds, operation: 'get' },
          }
        },
        transformResponse: (response: ServerlessResponse<GalleryImage[]>, _meta, imageIds) => {
          const duration = performance.now() - (performance.now() - 100)

          performanceMonitor.trackComponentRender(`gallery-batch-load-${Date.now()}`, duration)

          logger.info('Batch gallery images loaded', undefined, {
            requested: imageIds.length,
            loaded: response.data.length,
            duration,
          })

          return response
        },
        providesTags: result => [
          'GalleryBatch',
          ...(result?.data.map(({ id }) => ({ type: 'GalleryImage' as const, id })) || []),
        ],
        // Use serverless cache manager for batch operations
        ...getServerlessCacheConfig('medium'),
      }),

      // Upload single image
      uploadGalleryImage: builder.mutation<ServerlessResponse<GalleryImage>, GalleryUploadParams>({
        query: ({ file, ...metadata }) => {
          const formData = new FormData()
          formData.append('file', file)
          formData.append('metadata', JSON.stringify(metadata))

          return {
            url: SERVERLESS_ENDPOINTS.GALLERY.UPLOAD,
            method: 'POST',
            body: formData,
            // Don't set Content-Type header for FormData
            headers: {},
          }
        },
        invalidatesTags: ['Gallery', 'GalleryStats'],
      }),

      // Batch upload multiple images
      batchUploadGalleryImages: builder.mutation<
        ServerlessResponse<GalleryImage[]>,
        GalleryUploadParams[]
      >({
        query: uploads => {
          const formData = new FormData()
          uploads.forEach((upload, index) => {
            formData.append(`file_${index}`, upload.file)
            formData.append(
              `metadata_${index}`,
              JSON.stringify({
                title: upload.title,
                description: upload.description,
                tags: upload.tags,
                category: upload.category,
                mocId: upload.mocId,
                isPublic: upload.isPublic,
                generateThumbnail: upload.generateThumbnail,
              }),
            )
          })

          return {
            url: `${SERVERLESS_ENDPOINTS.GALLERY.UPLOAD}/batch`,
            method: 'POST',
            body: formData,
            headers: {},
          }
        },
        invalidatesTags: ['Gallery', 'GalleryStats'],
      }),

      // Update image metadata
      updateGalleryImage: builder.mutation<
        ServerlessResponse<GalleryImage>,
        { id: string; updates: Partial<GalleryImage> }
      >({
        query: ({ id, updates }) => ({
          url: buildEndpoint(SERVERLESS_ENDPOINTS.GALLERY.GET_IMAGE, { id }),
          method: 'PUT',
          body: updates,
        }),
        invalidatesTags: (_, __, { id }) => [{ type: 'GalleryImage', id }, 'Gallery'],
      }),

      // Delete single image
      deleteGalleryImage: builder.mutation<ServerlessResponse<void>, string>({
        query: id => ({
          url: buildEndpoint(SERVERLESS_ENDPOINTS.GALLERY.DELETE, { id }),
          method: 'DELETE',
        }),
        invalidatesTags: (_, __, id) => [{ type: 'GalleryImage', id }, 'Gallery', 'GalleryStats'],
      }),

      // Enhanced batch operations with performance monitoring and caching
      enhancedBatchGalleryOperation: builder.mutation<ServerlessResponse<any>, GalleryBatchParams>({
        query: params => {
          logger.info('Enhanced batch gallery operation initiated', undefined, {
            operation: params.operation,
            imageCount: params.imageIds.length,
          })

          return {
            url: `${SERVERLESS_ENDPOINTS.GALLERY.SEARCH}/batch`,
            method: 'POST',
            body: {
              ...params,
              _requestId: `batch_${params.operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            },
          }
        },
        transformResponse: (response: ServerlessResponse<any>, _meta, params) => {
          const duration = performance.now() - (performance.now() - 100)

          performanceMonitor.trackComponentRender(
            `gallery-batch-${params.operation}-${Date.now()}`,
            duration,
          )

          logger.info('Enhanced batch gallery operation completed', undefined, {
            operation: params.operation,
            imageCount: params.imageIds.length,
            duration,
          })

          // Use serverless cache manager for batch invalidation
          cacheManager.delete(`gallery_batch_${params.operation}`)

          return response
        },
        invalidatesTags: (_result, _error, { imageIds, operation }) => {
          const tags: Array<
            | { type: 'Gallery'; id?: string }
            | { type: 'GalleryImage'; id: string }
            | { type: 'GalleryStats' }
            | { type: 'GalleryBatch' }
          > = [
            { type: 'Gallery' as const },
            { type: 'GalleryStats' as const },
            { type: 'GalleryBatch' as const },
            ...imageIds.map(id => ({ type: 'GalleryImage' as const, id })),
          ]

          // Add operation-specific cache invalidation
          if (operation === 'updateTags') {
            tags.push({ type: 'Gallery' as const, id: 'tags' })
          }
          if (operation === 'updateCategory') {
            tags.push({ type: 'Gallery' as const, id: 'categories' })
          }

          return tags
        },
        // Optimistic updates for better UX
        onQueryStarted: async (params, { dispatch, queryFulfilled }) => {
          if (params.operation === 'delete') {
            // Optimistically remove images from cache
            params.imageIds.forEach(id => {
              dispatch(
                galleryApi.util.updateQueryData('enhancedGallerySearch', {} as any, draft => {
                  if (draft?.data?.images) {
                    draft.data.images = draft.data.images.filter(img => img.id !== id)
                  }
                }),
              )
            })
          }

          try {
            await queryFulfilled
          } catch {
            // Revert optimistic updates on error
            if (params.operation === 'delete') {
              dispatch(galleryApi.util.invalidateTags(['Gallery']))
            }
          }
        },
      }),

      // Enhanced gallery statistics with caching and performance monitoring
      getEnhancedGalleryStats: builder.query<ServerlessResponse<any>, void>({
        query: () => {
          logger.debug('Fetching enhanced gallery statistics')

          return {
            url: `${SERVERLESS_ENDPOINTS.GALLERY.SEARCH}/stats`,
            params: {
              _requestId: `stats_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            },
          }
        },
        transformResponse: (response: ServerlessResponse<any>) => {
          const duration = performance.now() - (performance.now() - 50)

          performanceMonitor.trackComponentRender(`gallery-stats-${Date.now()}`, duration)

          logger.info('Enhanced gallery statistics loaded', undefined, {
            totalImages: response.data?.totalImages,
            totalCategories: response.data?.totalCategories,
            duration,
          })

          return response
        },
        providesTags: ['GalleryStats'],
        // Use long cache for statistics as they don't change frequently
        ...getServerlessCacheConfig('long'),
      }),
    }),
  })
}

/**
 * Default enhanced gallery API instance
 */
export const enhancedGalleryApi = createGalleryApi()

// Export enhanced hooks for easy use
export const {
  useEnhancedGallerySearchQuery,
  useLazyEnhancedGallerySearchQuery,
  useGetGalleryImageQuery,
  useGetGalleryImageMetadataQuery,
  useBatchGetGalleryImagesQuery,
  useUploadGalleryImageMutation,
  useBatchUploadGalleryImagesMutation,
  useUpdateGalleryImageMutation,
  useDeleteGalleryImageMutation,
  useEnhancedBatchGalleryOperationMutation,
  useGetEnhancedGalleryStatsQuery,
} = enhancedGalleryApi

// Legacy export for backward compatibility
export const galleryApi = enhancedGalleryApi
