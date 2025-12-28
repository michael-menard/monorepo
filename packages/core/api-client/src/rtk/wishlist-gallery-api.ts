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
  MarkPurchasedResponseSchema,
  DeleteWishlistItemResponseSchema,
  type WishlistListResponse,
  type WishlistItem,
  type WishlistQueryParams,
  type UpdateWishlistItem,
  type MarkPurchasedRequest,
  type MarkPurchasedResponse,
  type DeleteWishlistItemResponse,
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

    /**
     * PATCH /api/wishlist/:id
     *
     * Updates a wishlist item with partial data.
     * Story wish-2003: Detail & Edit Pages
     */
    updateWishlistItem: builder.mutation<WishlistItem, { id: string; data: UpdateWishlistItem }>({
      query: ({ id, data }) => ({
        url: `/wishlist/${id}`,
        method: 'PATCH',
        body: data,
      }),
      transformResponse: (response: unknown) => WishlistItemSchema.parse(response),
      invalidatesTags: (_, __, { id }) => [
        { type: 'WishlistItem', id },
        { type: 'Wishlist', id: 'LIST' },
      ],
    }),

    /**
     * DELETE /api/wishlist/:id
     *
     * Deletes a wishlist item permanently.
     * Story wish-2003: Detail & Edit Pages / wish-2004: Delete Confirmation Modal
     */
    deleteWishlistItem: builder.mutation<void, string>({
      query: id => ({
        url: `/wishlist/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_, __, id) => [
        { type: 'WishlistItem', id },
        { type: 'Wishlist', id: 'LIST' },
      ],
    }),

    /**
     * DELETE /api/wishlist/:id (with response validation)
     *
     * Removes a wishlist item permanently.
     * Story wish-2004: Delete Confirmation Modal
     */
    removeFromWishlist: builder.mutation<DeleteWishlistItemResponse, string>({
      query: id => ({
        url: `/wishlist/${id}`,
        method: 'DELETE',
      }),
      transformResponse: (response: unknown) => DeleteWishlistItemResponseSchema.parse(response),
      invalidatesTags: (_, __, id) => [
        { type: 'WishlistItem', id },
        { type: 'Wishlist', id: 'LIST' },
      ],
    }),

    /**
     * POST /api/wishlist/:id/purchased
     *
     * Marks a wishlist item as purchased with purchase details.
     * Story wish-2004: Got It Flow Modal
     */
    markAsPurchased: builder.mutation<
      MarkPurchasedResponse,
      { id: string; data: MarkPurchasedRequest }
    >({
      query: ({ id, data }) => ({
        url: `/wishlist/${id}/purchased`,
        method: 'POST',
        body: data,
      }),
      transformResponse: (response: unknown) => MarkPurchasedResponseSchema.parse(response),
      invalidatesTags: (result, _, { id }) =>
        result?.removedFromWishlist
          ? [
              { type: 'WishlistItem', id },
              { type: 'Wishlist', id: 'LIST' },
            ]
          : [],
    }),
  }),
})

// Export hooks for use in components
export const {
  useGetWishlistQuery,
  useGetWishlistItemQuery,
  useLazyGetWishlistQuery,
  useUpdateWishlistItemMutation,
  useDeleteWishlistItemMutation,
  useRemoveFromWishlistMutation,
  useMarkAsPurchasedMutation,
} = wishlistGalleryApi
