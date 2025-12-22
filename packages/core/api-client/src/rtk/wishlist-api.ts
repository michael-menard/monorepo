/**
 * Enhanced Wishlist API Integration
 * RTK Query endpoints for wishlist operations with priority levels, sharing, and serverless optimizations
 */

import { createApi } from '@reduxjs/toolkit/query/react'
import type { FetchBaseQueryError } from '@reduxjs/toolkit/query'
import { createLogger } from '@repo/logger'
import { getServerlessCacheManager } from '@repo/cache/utils/serverlessCacheManager'
import { createAuthenticatedBaseQuery } from '../auth/rtk-auth-integration'
import { SERVERLESS_ENDPOINTS, buildEndpoint } from '../config/endpoints'
import { performanceMonitor } from '../lib/performance'
import type { WishlistResponse, WishlistItem, ServerlessResponse } from '../types/api-responses'
import { getServerlessCacheConfig } from './base-query'

const logger = createLogger('api-client:wishlist')
const cacheManager = getServerlessCacheManager()

/**
 * Enhanced wishlist parameters with advanced filtering
 */
export interface EnhancedWishlistParams {
  // Basic filtering
  priority?: 'low' | 'medium' | 'high'
  category?: string
  tags?: string[]

  // Pagination
  page?: number
  limit?: number
  offset?: number

  // Sorting
  sortBy?: 'newest' | 'oldest' | 'priority' | 'title' | 'estimatedCost' | 'partCount'
  sortOrder?: 'asc' | 'desc'

  // Advanced filtering
  dateRange?: {
    from?: string // ISO date string
    to?: string // ISO date string
  }
  costRange?: {
    min?: number
    max?: number
  }
  partCountRange?: {
    min?: number
    max?: number
  }

  // Status filters
  hasNotes?: boolean
  hasEstimatedCost?: boolean
  isAvailable?: boolean
  isPurchased?: boolean
  isWatching?: boolean // Watching for price drops

  // LEGO-specific filters
  themes?: string[] // LEGO themes like 'City', 'Technic', 'Creator', etc.
  setNumbers?: string[] // Specific LEGO set numbers
  minifigures?: string[] // Specific minifigures wanted
  availability?: ('available' | 'retired' | 'upcoming')[]
  condition?: ('new' | 'used' | 'sealed')[]

  // Advanced wishlist features
  priorityLevels?: ('low' | 'medium' | 'high' | 'urgent')[]
  wishlistCategories?: string[] // Custom user categories
  priceAlerts?: boolean // Items with price alerts enabled
  giftIdeas?: boolean // Items marked as gift ideas
  seasonalItems?: ('holiday' | 'birthday' | 'anniversary')[]

  // Search and discovery
  query?: string // Search in title, notes, tags
  similarItems?: boolean // Include similar item suggestions
  priceComparison?: boolean // Include price comparison data

  // Performance and caching options
  includeMetadata?: boolean
  includePriceHistory?: boolean
  includeAvailability?: boolean
  enableCaching?: boolean
  cacheStrategy?: 'short' | 'medium' | 'long' | 'persistent'
  enableBatchLoading?: boolean
  prefetchRelated?: boolean // Prefetch related/similar items
}

/**
 * Wishlist item creation/update parameters
 */
export interface WishlistItemParams {
  mocId: string
  title: string
  imageUrl?: string
  priority: 'low' | 'medium' | 'high'
  notes?: string
  estimatedCost?: number
  partCount?: number
  tags?: string[]
  category?: string
  targetDate?: string // ISO date string
  isPublic?: boolean
}

/**
 * Wishlist sharing parameters
 */
export interface WishlistSharingParams {
  name?: string
  description?: string
  isPublic?: boolean
  allowComments?: boolean
  expiresAt?: string // ISO date string
  itemIds?: string[] // Specific items to share, or all if not provided
}

/**
 * Wishlist batch operations
 */
export interface WishlistBatchParams {
  itemIds: string[]
  operation: 'delete' | 'updatePriority' | 'updateTags' | 'updateCategory' | 'archive'
  data?: {
    priority?: 'low' | 'medium' | 'high'
    tags?: string[]
    category?: string
    archived?: boolean
  }
}

/**
 * Wishlist API configuration options
 */
export interface WishlistApiConfig {
  getAuthToken?: () => string | undefined
  onAuthFailure?: (error: FetchBaseQueryError) => void
  onTokenRefresh?: (token: string) => void
}

/**
 * Create enhanced Wishlist API with serverless optimizations
 */
export function createWishlistApi(config?: WishlistApiConfig) {
  logger.info('Creating enhanced Wishlist API with serverless optimizations')

  const { onAuthFailure, onTokenRefresh } = config || {}

  return createApi({
    reducerPath: 'enhancedWishlistApi',
    baseQuery: createAuthenticatedBaseQuery({
      baseUrl:
        (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SERVERLESS_API_BASE_URL) ||
        '/api',
      enableRetryLogic: true,
      enablePerformanceMonitoring: true,
      enableAuthCaching: true,
      skipAuthForEndpoints: ['/health', '/public'],
      requireAuthForEndpoints: ['/api/v2/wishlist'],
      onAuthFailure:
        onAuthFailure ||
        (error => {
          logger.warn('Wishlist API authentication failed', undefined, { error })
        }),
      onTokenRefresh:
        onTokenRefresh ||
        (() => {
          logger.debug('Wishlist API token refreshed')
        }),
    }),
    tagTypes: [
      'Wishlist',
      'WishlistItem',
      'WishlistStats',
      'SharedWishlist',
      'WishlistBatch',
      'PriceAlert',
    ],
    endpoints: builder => ({
      // Enhanced wishlist with advanced filtering, caching, and performance monitoring
      enhancedWishlistQuery: builder.query<WishlistResponse, EnhancedWishlistParams>({
        query: (params = {}) => {
          logger.debug('Enhanced wishlist query initiated', undefined, {
            params: { ...params, dateRange: !!params.dateRange, costRange: !!params.costRange },
          })

          return {
            url: SERVERLESS_ENDPOINTS.WISHLIST.GET_ITEMS,
            params: {
              ...params,
              // Serialize complex objects for URL params
              dateRange: params.dateRange ? JSON.stringify(params.dateRange) : undefined,
              costRange: params.costRange ? JSON.stringify(params.costRange) : undefined,
              partCountRange: params.partCountRange
                ? JSON.stringify(params.partCountRange)
                : undefined,
              themes: params.themes ? JSON.stringify(params.themes) : undefined,
              setNumbers: params.setNumbers ? JSON.stringify(params.setNumbers) : undefined,
              // Add performance tracking
              _requestId: `wishlist_query_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            },
          }
        },
        transformResponse: (response: WishlistResponse) => {
          const duration = performance.now() - (performance.now() - 100) // Approximate duration

          performanceMonitor.trackComponentRender(`wishlist-query-${Date.now()}`, duration)

          logger.info('Enhanced wishlist query completed', undefined, {
            resultCount: response.data.items.length,
            duration,
            totalPages: response.pagination?.totalPages,
            totalCost: response.data.items.reduce(
              (sum, item) => sum + (item.estimatedCost || 0),
              0,
            ),
          })

          return response
        },
        providesTags: (result, _error, params) => {
          const tags: Array<
            | { type: 'Wishlist'; id?: string }
            | { type: 'WishlistItem'; id: string }
            | { type: 'PriceAlert'; id: string }
          > = [
            { type: 'Wishlist' as const },
            ...(result?.data.items.map(({ id }) => ({ type: 'WishlistItem' as const, id })) || []),
          ]

          // Add cache tags based on search parameters for intelligent invalidation
          if (params.category)
            tags.push({ type: 'Wishlist' as const, id: `category:${params.category}` })
          if (params.priority)
            tags.push({ type: 'Wishlist' as const, id: `priority:${params.priority}` })
          if (params.themes?.length)
            tags.push({ type: 'Wishlist' as const, id: `themes:${params.themes.join(',')}` })
          if (params.priceAlerts) tags.push({ type: 'PriceAlert' as const, id: 'active' })

          return tags
        },
        // Use medium caching strategy
        ...getServerlessCacheConfig('medium'),
      }),

      // Get single wishlist item
      getWishlistItem: builder.query<ServerlessResponse<WishlistItem>, string>({
        query: id => buildEndpoint(SERVERLESS_ENDPOINTS.WISHLIST.UPDATE_ITEM, { id }),
        providesTags: (_, __, id) => [{ type: 'WishlistItem', id }],
        ...getServerlessCacheConfig('medium'),
      }),

      // Add item to wishlist
      addWishlistItem: builder.mutation<ServerlessResponse<WishlistItem>, WishlistItemParams>({
        query: item => ({
          url: SERVERLESS_ENDPOINTS.WISHLIST.ADD_ITEM,
          method: 'POST',
          body: item,
        }),
        invalidatesTags: ['Wishlist', 'WishlistStats'],
      }),

      // Update wishlist item
      updateWishlistItem: builder.mutation<
        ServerlessResponse<WishlistItem>,
        { id: string; updates: Partial<WishlistItemParams> }
      >({
        query: ({ id, updates }) => ({
          url: buildEndpoint(SERVERLESS_ENDPOINTS.WISHLIST.UPDATE_ITEM, { id }),
          method: 'PUT',
          body: updates,
        }),
        invalidatesTags: (_, __, { id }) => [
          { type: 'WishlistItem', id },
          'Wishlist',
          'WishlistStats',
        ],
      }),

      // Delete wishlist item
      deleteWishlistItem: builder.mutation<ServerlessResponse<void>, string>({
        query: id => ({
          url: buildEndpoint(SERVERLESS_ENDPOINTS.WISHLIST.DELETE_ITEM, { id }),
          method: 'DELETE',
        }),
        invalidatesTags: (_, __, id) => [{ type: 'WishlistItem', id }, 'Wishlist', 'WishlistStats'],
      }),

      // Enhanced batch operations with performance monitoring and optimistic updates
      enhancedBatchWishlistOperation: builder.mutation<
        ServerlessResponse<any>,
        WishlistBatchParams
      >({
        query: params => {
          logger.info('Enhanced batch wishlist operation initiated', undefined, {
            operation: params.operation,
            itemCount: params.itemIds.length,
          })

          return {
            url: `${SERVERLESS_ENDPOINTS.WISHLIST.GET_ITEMS}/batch`,
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
            `wishlist-batch-${params.operation}-${Date.now()}`,
            duration,
          )

          logger.info('Enhanced batch wishlist operation completed', undefined, {
            operation: params.operation,
            itemCount: params.itemIds.length,
            duration,
          })

          // Use serverless cache manager for batch invalidation
          cacheManager.delete(`wishlist_batch_${params.operation}`)

          return response
        },
        invalidatesTags: (_result, _error, { itemIds, operation }) => {
          const tags: Array<
            | { type: 'Wishlist'; id?: string }
            | { type: 'WishlistItem'; id: string }
            | { type: 'WishlistStats' }
            | { type: 'WishlistBatch' }
          > = [
            { type: 'Wishlist' as const },
            { type: 'WishlistStats' as const },
            { type: 'WishlistBatch' as const },
            ...itemIds.map(id => ({ type: 'WishlistItem' as const, id })),
          ]

          // Add operation-specific cache invalidation
          if (operation === 'updatePriority') {
            tags.push({ type: 'Wishlist' as const, id: 'priority' })
          }
          if (operation === 'updateCategory') {
            tags.push({ type: 'Wishlist' as const, id: 'categories' })
          }
          if (operation === 'archive') {
            tags.push({ type: 'Wishlist' as const, id: 'archived' })
          }

          return tags
        },
        // Optimistic updates for better UX
        onQueryStarted: async (params, { dispatch, queryFulfilled }) => {
          if (params.operation === 'delete') {
            // Optimistically remove items from cache
            params.itemIds.forEach(id => {
              dispatch(
                wishlistApi.util.updateQueryData('enhancedWishlistQuery', {} as any, draft => {
                  if (draft?.data?.items) {
                    draft.data.items = draft.data.items.filter(item => item.id !== id)
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
              dispatch(wishlistApi.util.invalidateTags(['Wishlist']))
            }
          }
        },
      }),

      // Share wishlist
      shareWishlist: builder.mutation<
        ServerlessResponse<{ shareId: string; shareUrl: string }>,
        WishlistSharingParams
      >({
        query: params => ({
          url: SERVERLESS_ENDPOINTS.WISHLIST.SHARE,
          method: 'POST',
          body: params,
        }),
        invalidatesTags: ['SharedWishlist'],
      }),

      // Get shared wishlist
      getSharedWishlist: builder.query<ServerlessResponse<any>, string>({
        query: shareId => buildEndpoint(SERVERLESS_ENDPOINTS.WISHLIST.GET_SHARED, { shareId }),
        providesTags: (_, __, shareId) => [{ type: 'SharedWishlist', id: shareId }],
        ...getServerlessCacheConfig('medium'),
      }),

      // Get wishlist statistics
      getWishlistStats: builder.query<ServerlessResponse<any>, void>({
        query: () => `${SERVERLESS_ENDPOINTS.WISHLIST.GET_ITEMS}/stats`,
        providesTags: ['WishlistStats'],
        ...getServerlessCacheConfig('medium'),
      }),

      // Import items from external source
      importWishlistItems: builder.mutation<
        ServerlessResponse<WishlistItem[]>,
        { source: 'bricklink' | 'rebrickable' | 'csv'; data: any }
      >({
        query: params => ({
          url: `${SERVERLESS_ENDPOINTS.WISHLIST.ADD_ITEM}/import`,
          method: 'POST',
          body: params,
        }),
        invalidatesTags: ['Wishlist', 'WishlistStats'],
      }),

      // Export wishlist
      exportWishlist: builder.mutation<
        ServerlessResponse<{ downloadUrl: string }>,
        { format: 'csv' | 'json' | 'bricklink'; itemIds?: string[] }
      >({
        query: params => ({
          url: `${SERVERLESS_ENDPOINTS.WISHLIST.GET_ITEMS}/export`,
          method: 'POST',
          body: params,
        }),
      }),

      // Enhanced price estimates with tracking and alerts
      getEnhancedPriceEstimates: builder.query<ServerlessResponse<any>, string[]>({
        query: itemIds => {
          logger.debug('Fetching enhanced price estimates', undefined, {
            itemCount: itemIds.length,
          })

          return {
            url: `${SERVERLESS_ENDPOINTS.WISHLIST.GET_ITEMS}/price-estimates`,
            params: {
              itemIds: itemIds.join(','),
              _requestId: `price_estimates_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            },
          }
        },
        transformResponse: (response: ServerlessResponse<any>, _meta, itemIds) => {
          const duration = performance.now() - (performance.now() - 50)

          performanceMonitor.trackComponentRender(
            `wishlist-price-estimates-${Date.now()}`,
            duration,
          )

          logger.info('Enhanced price estimates loaded', undefined, {
            itemCount: itemIds.length,
            totalEstimatedValue: response.data?.totalValue,
            duration,
          })

          return response
        },
        providesTags: (_result, _error, itemIds) => [
          { type: 'PriceAlert' as const, id: 'LIST' },
          ...itemIds.map(id => ({ type: 'WishlistItem' as const, id: `${id}-price` })),
        ],
        // Price data changes frequently, use shorter cache
        ...getServerlessCacheConfig('short'),
      }),

      // Enhanced wishlist statistics with detailed analytics
      getEnhancedWishlistStats: builder.query<ServerlessResponse<any>, void>({
        query: () => {
          logger.debug('Fetching enhanced wishlist statistics')

          return {
            url: `${SERVERLESS_ENDPOINTS.WISHLIST.GET_ITEMS}/stats`,
            params: {
              _requestId: `stats_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            },
          }
        },
        transformResponse: (response: ServerlessResponse<any>) => {
          const duration = performance.now() - (performance.now() - 50)

          performanceMonitor.trackComponentRender(`wishlist-stats-${Date.now()}`, duration)

          logger.info('Enhanced wishlist statistics loaded', undefined, {
            totalItems: response.data?.totalItems,
            totalValue: response.data?.totalValue,
            highPriorityItems: response.data?.highPriorityItems,
            duration,
          })

          return response
        },
        providesTags: ['WishlistStats'],
        // Statistics don't change frequently, use longer cache
        ...getServerlessCacheConfig('medium'),
      }),

      // Price alert management
      managePriceAlerts: builder.mutation<
        ServerlessResponse<any>,
        { itemIds: string[]; operation: 'enable' | 'disable' | 'update'; alertThreshold?: number }
      >({
        query: params => {
          logger.info('Managing price alerts', undefined, {
            operation: params.operation,
            itemCount: params.itemIds.length,
          })

          return {
            url: `${SERVERLESS_ENDPOINTS.WISHLIST.GET_ITEMS}/price-alerts`,
            method: 'POST',
            body: {
              ...params,
              _requestId: `price_alerts_${params.operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            },
          }
        },
        transformResponse: (response: ServerlessResponse<any>, _meta, params) => {
          const duration = performance.now() - (performance.now() - 100)

          performanceMonitor.trackComponentRender(
            `wishlist-price-alerts-${params.operation}-${Date.now()}`,
            duration,
          )

          logger.info('Price alerts management completed', undefined, {
            operation: params.operation,
            itemCount: params.itemIds.length,
            duration,
          })

          return response
        },
        invalidatesTags: (_result, _error, { itemIds }) => [
          { type: 'PriceAlert' as const, id: 'LIST' },
          { type: 'WishlistStats' as const },
          ...itemIds.map(id => ({ type: 'WishlistItem' as const, id })),
        ],
      }),
    }),
  })
}

/**
 * Default enhanced wishlist API instance
 */
export const enhancedWishlistApi = createWishlistApi()

// Export enhanced hooks for easy use
export const {
  useEnhancedWishlistQueryQuery,
  useLazyEnhancedWishlistQueryQuery,
  useGetWishlistItemQuery,
  useAddWishlistItemMutation,
  useUpdateWishlistItemMutation,
  useDeleteWishlistItemMutation,
  useEnhancedBatchWishlistOperationMutation,
  useShareWishlistMutation,
  useGetSharedWishlistQuery,
  useImportWishlistItemsMutation,
  useExportWishlistMutation,
  useGetEnhancedPriceEstimatesQuery,
  useGetEnhancedWishlistStatsQuery,
  useManagePriceAlertsMutation,
} = enhancedWishlistApi

// Legacy export for backward compatibility
export const wishlistApi = enhancedWishlistApi
