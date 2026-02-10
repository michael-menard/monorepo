/**
 * Wishlist Gallery API
 *
 * RTK Query endpoints for wishlist gallery operations.
 * Uses Zod schemas from @repo/api-client/schemas/wishlist for response validation.
 *
 * Story wish-2001: Wishlist Gallery MVP
 * Story wish-2002: Add Item Flow
 * Story WISH-2041: Delete Flow
 * Story WISH-2042: Purchase/Got It Flow
 * Story WISH-2005a: Drag-and-drop reordering
 * Story WISH-2005b: Optimistic updates and undo flow
 * Story WISH-2032: Optimistic UI for Form Submission
 */

import { createApi } from '@reduxjs/toolkit/query/react'
import { z } from 'zod'
import {
  WishlistListResponseSchema,
  WishlistItemSchema,
  PresignResponseSchema,
  SetItemSchema,
  ReorderResponseSchema,
  type WishlistListResponse,
  type WishlistItem,
  type WishlistQueryParams,
  type CreateWishlistItem,
  type PresignRequest,
  type PresignResponse,
  type MarkAsPurchasedInput,
  type PurchaseDetailsInput,
  type SetItem,
  type BatchReorder,
  type ReorderResponse,
  type BuildStatus,
} from '../schemas/wishlist'
import { createServerlessBaseQuery, getServerlessCacheConfig } from './base-query'

/**
 * Reorder undo context returned from optimistic update
 * Story WISH-2005b: Optimistic updates and undo flow
 * Per CLAUDE.md: Use Zod for data structures, TypeScript types for functions
 */
const ReorderUndoContextDataSchema = z.object({
  /** Original sortOrder values before reorder */
  originalOrder: z.array(
    z.object({
      id: z.string(),
      sortOrder: z.number(),
    }),
  ),
})

export type ReorderUndoContext = z.infer<typeof ReorderUndoContextDataSchema> & {
  /** Function to restore original order (undo operation) */
  undo: () => void
}

/**
 * Wishlist Gallery API
 *
 * Provides list and get operations for the wishlist gallery.
 * Uses JWT Bearer token authentication via CognitoTokenManager.
 */
export const wishlistGalleryApi = createApi({
  reducerPath: 'wishlistGalleryApi',
  baseQuery: createServerlessBaseQuery({
    enablePerformanceMonitoring: true,
    enableJwtAuth: true,
  }),
  tagTypes: ['Wishlist', 'WishlistItem', 'Sets'],
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
          status: params.status,
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
     * POST /api/wishlist
     *
     * Creates a new wishlist item.
     * Story wish-2002: Add Item Flow
     * Story WISH-2032: Optimistic UI for Form Submission
     *
     * Implements optimistic cache update via onQueryStarted:
     * - Generates temporary ID for immediate feedback
     * - Optimistically adds item to cache
     * - On success: replaces temp item with real item from API
     * - On error: rolls back cache, calls onError callback if provided
     */
    addWishlistItem: builder.mutation<
      WishlistItem,
      CreateWishlistItem & {
        /** WISH-2032: Callback when API fails (for rollback UI) */
        onOptimisticError?: (error: unknown) => void
        /** WISH-2032: Temporary ID for optimistic update tracking */
        tempId?: string
      }
    >({
      query: arg => {
        // Extract optimistic-only properties, send only API-relevant fields
        const { onOptimisticError, tempId, ...body } = arg
        void onOptimisticError // Used in onQueryStarted
        void tempId // Used in onQueryStarted
        return {
          url: '/wishlist',
          method: 'POST',
          body,
        }
      },
      transformResponse: (response: unknown) => WishlistItemSchema.parse(response),
      /**
       * WISH-2032: Optimistic update for immediate UI feedback
       *
       * Flow:
       * 1. Generate temporary ID (or use provided tempId)
       * 2. Create optimistic item and add to cache
       * 3. Wait for API response
       * 4. On success: replace temp item with real item
       * 5. On error: rollback cache, call onOptimisticError callback
       */
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        const tempId = arg.tempId || `temp-${Date.now()}`
        const now = new Date().toISOString()

        // Create optimistic item with temp ID
        const optimisticItem: WishlistItem = {
          id: tempId,
          userId: 'temp-user', // Will be replaced by API
          title: arg.title,
          store: arg.store as WishlistItem['store'],
          setNumber: arg.setNumber || null,
          sourceUrl: arg.sourceUrl || null,
          imageUrl: arg.imageUrl || null,
          imageVariants: null,
          price: arg.price || null,
          currency: (arg.currency as WishlistItem['currency']) || 'USD',
          pieceCount: arg.pieceCount ?? null,
          releaseDate: arg.releaseDate || null,
          tags: arg.tags || [],
          priority: arg.priority ?? 0,
          notes: arg.notes || null,
          sortOrder: 0, // Will be at top
          createdAt: now,
          updatedAt: now,
          createdBy: null,
          updatedBy: null,
          // SETS-MVP-001: Collection management fields
          status: 'wishlist',
          statusChangedAt: null,
          purchaseDate: null,
          purchasePrice: null,
          purchaseTax: null,
          purchaseShipping: null,
          buildStatus: null,
        }

        // Optimistically add to cache
        const patchResult = dispatch(
          wishlistGalleryApi.util.updateQueryData('getWishlist', {}, draft => {
            // Add new item at the beginning
            draft.items.unshift(optimisticItem)
            // Update pagination total
            if (draft.pagination) {
              draft.pagination.total += 1
            }
          }),
        )

        try {
          // Wait for API response
          const { data: realItem } = await queryFulfilled

          // Replace temp item with real item from API
          dispatch(
            wishlistGalleryApi.util.updateQueryData('getWishlist', {}, draft => {
              const index = draft.items.findIndex(item => item.id === tempId)
              if (index !== -1) {
                draft.items[index] = realItem
              }
            }),
          )
        } catch (error) {
          // Rollback on error
          patchResult.undo()

          // Call error callback if provided (for UI rollback handling)
          if (arg.onOptimisticError) {
            arg.onOptimisticError(error)
          }
        }
      },
      // Still invalidate tags to ensure fresh data after mutation
      invalidatesTags: [{ type: 'Wishlist', id: 'LIST' }],
    }),

    /**
     * GET /api/wishlist/images/presign
     *
     * Gets a presigned URL for uploading an image to S3.
     * Story wish-2002: Add Item Flow
     */
    getWishlistImagePresignUrl: builder.mutation<PresignResponse, PresignRequest>({
      query: params => ({
        url: '/wishlist/images/presign',
        params: {
          fileName: params.fileName,
          mimeType: params.mimeType,
        },
      }),
      transformResponse: (response: unknown) => PresignResponseSchema.parse(response),
    }),

    /**
     * POST /api/wishlist/:id/purchased
     *
     * Marks a wishlist item as purchased and creates a Set item.
     * Story WISH-2042: Purchase/Got It Flow
     */
    markAsPurchased: builder.mutation<SetItem, { itemId: string; input: MarkAsPurchasedInput }>({
      query: ({ itemId, input }) => ({
        url: `/wishlist/${itemId}/purchased`,
        method: 'POST',
        body: input,
      }),
      transformResponse: (response: unknown) => SetItemSchema.parse(response),
      invalidatesTags: (result, _error, { itemId }) =>
        result
          ? [
              { type: 'WishlistItem', id: itemId },
              { type: 'Wishlist', id: 'LIST' },
              { type: 'Sets', id: 'LIST' },
            ]
          : [],
    }),

    /**
     * PATCH /api/wishlist/:id/purchase
     *
     * SETS-MVP-0310: Update item status to 'owned' with purchase details.
     * Uses unified model status transition instead of creating new Set record.
     */
    updateItemPurchase: builder.mutation<
      WishlistItem,
      { itemId: string; input: PurchaseDetailsInput }
    >({
      query: ({ itemId, input }) => ({
        url: `/wishlist/${itemId}/purchase`,
        method: 'PATCH',
        body: input,
      }),
      transformResponse: (response: unknown) => WishlistItemSchema.parse(response),
      invalidatesTags: (result, _error, { itemId }) =>
        result
          ? [
              { type: 'WishlistItem', id: itemId },
              { type: 'Wishlist', id: 'LIST' },
            ]
          : [],
    }),

    /**
     * PATCH /api/wishlist/:id/build-status
     *
     * SETS-MVP-004: Toggle build status of an owned item.
     * Implements optimistic update via onQueryStarted.
     */
    updateBuildStatus: builder.mutation<WishlistItem, { itemId: string; buildStatus: BuildStatus }>({
      query: ({ itemId, buildStatus }) => ({
        url: `/wishlist/${itemId}/build-status`,
        method: 'PATCH',
        body: { buildStatus },
      }),
      transformResponse: (response: unknown) => WishlistItemSchema.parse(response),
      async onQueryStarted({ itemId, buildStatus }, { dispatch, queryFulfilled }) {
        // AC12, AC28: Optimistic update - update cache immediately
        const patchResult = dispatch(
          wishlistGalleryApi.util.updateQueryData(
            'getWishlist',
            { status: 'owned', page: 1, limit: 100 },
            draft => {
              const item = draft.items.find(i => i.id === itemId)
              if (item) {
                item.buildStatus = buildStatus
              }
            },
          ),
        )

        try {
          await queryFulfilled
        } catch {
          // AC13, AC31: Revert on error without retry
          patchResult.undo()
        }
      },
      invalidatesTags: (result, _error, { itemId }) =>
        result
          ? [
              { type: 'WishlistItem', id: itemId },
              { type: 'Wishlist', id: 'LIST' },
            ]
          : [],
    }),

    /**
     * DELETE /api/wishlist/:id
     *
     * Deletes a wishlist item permanently.
     * Story WISH-2041: Delete Flow
     *
     * Alias: removeFromWishlist (story naming convention)
     */
    deleteWishlistItem: builder.mutation<void, string>({
      query: itemId => ({
        url: `/wishlist/${itemId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, itemId) => [
        { type: 'WishlistItem', id: itemId },
        { type: 'Wishlist', id: 'LIST' },
      ],
    }),

    /**
     * DELETE /api/wishlist/:id (Alias)
     *
     * Alias for deleteWishlistItem per WISH-2041 naming convention.
     * Story WISH-2041: Delete Flow
     */
    removeFromWishlist: builder.mutation<void, string>({
      query: itemId => ({
        url: `/wishlist/${itemId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, itemId) => [
        { type: 'WishlistItem', id: itemId },
        { type: 'Wishlist', id: 'LIST' },
      ],
    }),

    /**
     * PUT /api/wishlist/reorder
     *
     * Reorders wishlist items by updating their sortOrder values.
     * Story WISH-2005a: Drag-and-drop reordering
     * Story WISH-2005b: Optimistic updates and undo flow
     *
     * Implements optimistic cache update via onQueryStarted:
     * - Cache is updated immediately before API response
     * - On error, cache is rolled back via patchResult.undo()
     * - Component shows toast with undo button for 5 seconds
     */
    reorderWishlist: builder.mutation<ReorderResponse, BatchReorder>({
      query: body => ({
        url: '/wishlist/reorder',
        method: 'PUT',
        body,
      }),
      transformResponse: (response: unknown) => ReorderResponseSchema.parse(response),
      /**
       * Optimistic update implementation (WISH-2005b AC 1-5)
       *
       * Flow:
       * 1. Capture original order from cache
       * 2. Optimistically update cache with new order
       * 3. Wait for API response
       * 4. On success: cache already correct, return undo context
       * 5. On error: rollback cache via patchResult.undo()
       */
      async onQueryStarted(arg, { dispatch, queryFulfilled }) {
        // AC 3: Capture original order before optimistic update
        // We need to update ALL cached queries that might contain these items
        // For simplicity, we update the default query (no params)
        const patchResult = dispatch(
          wishlistGalleryApi.util.updateQueryData('getWishlist', {}, draft => {
            // AC 1-2: Update sortOrder values in cache immediately
            const itemMap = new Map(arg.items.map(item => [item.id, item.sortOrder]))

            for (const item of draft.items) {
              const newSortOrder = itemMap.get(item.id)
              if (newSortOrder !== undefined) {
                item.sortOrder = newSortOrder
              }
            }

            // Sort items by new sortOrder
            draft.items.sort((a, b) => a.sortOrder - b.sortOrder)
          }),
        )

        try {
          // AC 4: Wait for API success - cache already reflects new order
          await queryFulfilled
        } catch {
          // AC 5, AC 16: Rollback cache on API failure
          patchResult.undo()
        }
      },
      // Do NOT invalidate cache - optimistic update handles it
      invalidatesTags: [],
    }),
  }),
})

// Export hooks for use in components
export const {
  useGetWishlistQuery,
  useGetWishlistItemQuery,
  useLazyGetWishlistQuery,
  useAddWishlistItemMutation,
  useGetWishlistImagePresignUrlMutation,
  useMarkAsPurchasedMutation,
  useUpdateItemPurchaseMutation,
  useUpdateBuildStatusMutation,
  useDeleteWishlistItemMutation,
  // WISH-2041: Delete Flow - alias hook
  useRemoveFromWishlistMutation,
  // WISH-2005a: Drag-and-drop reordering
  useReorderWishlistMutation,
} = wishlistGalleryApi
