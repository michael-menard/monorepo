/**
 * Wishlist Gallery API
 *
 * RTK Query endpoints for wishlist gallery operations.
 * Uses Zod schemas from @repo/api-client/schemas/wishlist for response validation.
 *
 * Story wish-2001: Wishlist Gallery MVP
 */

import { createApi } from '@reduxjs/toolkit/query/react'
import {
  WishlistListResponseSchema,
  WishlistItemSchema,
  type WishlistListResponse,
  type WishlistItem,
  type WishlistQueryParams,
} from '../schemas/wishlist'
import { createServerlessBaseQuery, getServerlessCacheConfig } from './base-query'

/**
 * Wishlist Gallery API
 *
 * Provides list and get operations for the wishlist gallery.
 * Uses cookie-based authentication via credentials: 'include'.
 */
export const wishlistGalleryApi = createApi({
  reducerPath: 'wishlistGalleryApi',
  baseQuery: createServerlessBaseQuery({
    enablePerformanceMonitoring: true,
  }),
  tagTypes: ['Wishlist', 'WishlistItem'],
  endpoints: builder => ({
    /**
     * GET /api/wishlist
     *
     * Returns paginated wishlist items with filtering, sorting, and counts.
     */
    getWishlist: builder.query<WishlistListResponse, Partial<WishlistQueryParams>>({
      query: params => ({
        url: '/wishlist',
        params: {
          q: params.q,
          store: params.store,
          tags: params.tags,
          priority: params.priority,
          sort: params.sort,
          order: params.order,
          page: params.page,
          limit: params.limit,
        },
      }),
      transformResponse: (response: unknown) => WishlistListResponseSchema.parse(response),
      providesTags: result =>
        result
          ? [
              ...result.items.map(({ id }) => ({ type: 'WishlistItem' as const, id })),
              { type: 'Wishlist', id: 'LIST' },
            ]
          : [{ type: 'Wishlist', id: 'LIST' }],
      ...getServerlessCacheConfig('medium'),
    }),

    /**
     * GET /api/wishlist/:id
     *
     * Returns a single wishlist item by ID.
     */
    getWishlistItem: builder.query<WishlistItem, string>({
      query: id => `/wishlist/${id}`,
      transformResponse: (response: unknown) => WishlistItemSchema.parse(response),
      providesTags: (_, __, id) => [{ type: 'WishlistItem', id }],
      ...getServerlessCacheConfig('medium'),
    }),
  }),
})

// Export hooks for use in components
export const { useGetWishlistQuery, useGetWishlistItemQuery, useLazyGetWishlistQuery } =
  wishlistGalleryApi
