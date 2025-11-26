/**
 * Enhanced RTK Query Endpoints for Serverless APIs
 * Pre-configured endpoints with serverless optimizations
 */

import { createApi } from '@reduxjs/toolkit/query/react'
import {
  createServerlessBaseQuery,
  getServerlessCacheConfig,
  getPerformanceOptimizedCacheConfig,
  createAdaptiveCacheConfig,
} from './base-query'
import { SERVERLESS_ENDPOINTS, buildEndpoint } from '../config/endpoints'
import type {
  GallerySearchResponse,
  GalleryImage,
  WishlistResponse,
  WishlistItem,
  MOCSearchResponse,
  MOCInstruction,
  UserProfileResponse,
  HealthCheckResponse,
  ServerlessResponse,
} from '../types/api-responses'

/**
 * Gallery search parameters
 */
export interface GallerySearchParams {
  query?: string
  category?: string
  tags?: string[]
  page?: number
  limit?: number
  sortBy?: 'newest' | 'oldest' | 'popular' | 'title'
  sortOrder?: 'asc' | 'desc'
}

/**
 * Wishlist parameters
 */
export interface WishlistParams {
  priority?: 'low' | 'medium' | 'high'
  page?: number
  limit?: number
  sortBy?: 'newest' | 'oldest' | 'priority' | 'title'
}

/**
 * MOC search parameters
 */
export interface MOCSearchParams {
  query?: string
  category?: string
  difficulty?: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  tags?: string[]
  author?: string
  page?: number
  limit?: number
  sortBy?: 'newest' | 'oldest' | 'popular' | 'title'
  sortOrder?: 'asc' | 'desc'
}

/**
 * Create enhanced serverless API with performance monitoring and optimizations
 */
export function createServerlessApi(
  getAuthToken: () => string | undefined,
  options: {
    enablePerformanceMonitoring?: boolean
    enableCircuitBreaker?: boolean
    priority?: 'low' | 'medium' | 'high' | 'critical'
  } = {}
) {
  const {
    enablePerformanceMonitoring = true,
    enableCircuitBreaker = true,
    priority = 'medium',
  } = options

  return createApi({
    reducerPath: 'serverlessApi',
    baseQuery: createServerlessBaseQuery({
      getAuthToken,
      enablePerformanceMonitoring,
      enableCircuitBreaker,
      priority,
    }),
    tagTypes: ['Gallery', 'Wishlist', 'MOC', 'User'],
    endpoints: (builder) => ({
      // Gallery Endpoints with performance optimization
      searchGallery: builder.query<GallerySearchResponse, GallerySearchParams>({
        query: (params = {}) => ({
          url: SERVERLESS_ENDPOINTS.GALLERY.SEARCH,
          params,
        }),
        providesTags: ['Gallery'],
        ...getPerformanceOptimizedCacheConfig(SERVERLESS_ENDPOINTS.GALLERY.SEARCH),
      }),

      getGalleryImage: builder.query<ServerlessResponse<GalleryImage>, string>({
        query: (id) => buildEndpoint(SERVERLESS_ENDPOINTS.GALLERY.GET_IMAGE, { id }),
        providesTags: (_, __, id) => [{ type: 'Gallery', id }],
        ...createAdaptiveCacheConfig({
          usageFrequency: 'high',
          dataVolatility: 'stable',
          baseKeepTime: 1800, // 30 minutes for individual images
        }),
      }),

      uploadGalleryImage: builder.mutation<ServerlessResponse<GalleryImage>, FormData>({
        query: (formData) => ({
          url: SERVERLESS_ENDPOINTS.GALLERY.UPLOAD,
          method: 'POST',
          body: formData,
          formData: true,
        }),
        invalidatesTags: ['Gallery'],
      }),

      deleteGalleryImage: builder.mutation<ServerlessResponse<void>, string>({
        query: (id) => ({
          url: buildEndpoint(SERVERLESS_ENDPOINTS.GALLERY.DELETE, { id }),
          method: 'DELETE',
        }),
        invalidatesTags: (_, __, id) => [{ type: 'Gallery', id }, 'Gallery'],
      }),

      // Wishlist Endpoints
      getWishlist: builder.query<WishlistResponse, WishlistParams>({
        query: (params = {}) => ({
          url: SERVERLESS_ENDPOINTS.WISHLIST.GET_ITEMS,
          params,
        }),
        providesTags: ['Wishlist'],
        ...getServerlessCacheConfig('short'),
      }),

      addWishlistItem: builder.mutation<ServerlessResponse<WishlistItem>, Partial<WishlistItem>>({
        query: (item) => ({
          url: SERVERLESS_ENDPOINTS.WISHLIST.ADD_ITEM,
          method: 'POST',
          body: item,
        }),
        invalidatesTags: ['Wishlist'],
      }),

      updateWishlistItem: builder.mutation<
        ServerlessResponse<WishlistItem>,
        { id: string; updates: Partial<WishlistItem> }
      >({
        query: ({ id, updates }) => ({
          url: buildEndpoint(SERVERLESS_ENDPOINTS.WISHLIST.UPDATE_ITEM, { id }),
          method: 'PUT',
          body: updates,
        }),
        invalidatesTags: (_, __, { id }) => [{ type: 'Wishlist', id }, 'Wishlist'],
      }),

      deleteWishlistItem: builder.mutation<ServerlessResponse<void>, string>({
        query: (id) => ({
          url: buildEndpoint(SERVERLESS_ENDPOINTS.WISHLIST.DELETE_ITEM, { id }),
          method: 'DELETE',
        }),
        invalidatesTags: (_, __, id) => [{ type: 'Wishlist', id }, 'Wishlist'],
      }),

      shareWishlist: builder.mutation<ServerlessResponse<{ shareId: string; shareUrl: string }>, void>({
        query: () => ({
          url: SERVERLESS_ENDPOINTS.WISHLIST.SHARE,
          method: 'POST',
        }),
      }),

      // MOC Endpoints
      searchMOCs: builder.query<MOCSearchResponse, MOCSearchParams>({
        query: (params = {}) => ({
          url: SERVERLESS_ENDPOINTS.MOC.SEARCH,
          params,
        }),
        providesTags: ['MOC'],
        ...getServerlessCacheConfig('medium'),
      }),

      getMOCInstruction: builder.query<ServerlessResponse<MOCInstruction>, string>({
        query: (id) => buildEndpoint(SERVERLESS_ENDPOINTS.MOC.GET_INSTRUCTION, { id }),
        providesTags: (_, __, id) => [{ type: 'MOC', id }],
        ...getServerlessCacheConfig('long'),
      }),

      getMOCSteps: builder.query<ServerlessResponse<any[]>, string>({
        query: (id) => buildEndpoint(SERVERLESS_ENDPOINTS.MOC.GET_STEPS, { id }),
        providesTags: (_result, _error, id) => [{ type: 'MOC', id: `${id}-steps` }],
        ...getServerlessCacheConfig('long'),
      }),

      getMOCPartsList: builder.query<ServerlessResponse<any[]>, string>({
        query: (id) => buildEndpoint(SERVERLESS_ENDPOINTS.MOC.GET_PARTS_LIST, { id }),
        providesTags: (_, __, id) => [{ type: 'MOC', id: `${id}-parts` }],
        ...getServerlessCacheConfig('long'),
      }),

      // User Endpoints
      getUserProfile: builder.query<UserProfileResponse, void>({
        query: () => SERVERLESS_ENDPOINTS.USER.GET_PROFILE,
        providesTags: ['User'],
        ...getServerlessCacheConfig('medium'),
      }),

      updateUserProfile: builder.mutation<UserProfileResponse, Partial<any>>({
        query: (updates) => ({
          url: SERVERLESS_ENDPOINTS.USER.UPDATE_PROFILE,
          method: 'PUT',
          body: updates,
        }),
        invalidatesTags: ['User'],
      }),

      // Health Check with no caching and high priority
      healthCheck: builder.query<HealthCheckResponse, void>({
        query: () => SERVERLESS_ENDPOINTS.HEALTH.CHECK,
        ...getServerlessCacheConfig('none'),
        // Health checks should be high priority for monitoring
        extraOptions: { priority: 'high' },
      }),
    }),
  })
}

/**
 * Default serverless API instance (requires auth token to be set later)
 */
export const serverlessApi = createServerlessApi(() => undefined)
