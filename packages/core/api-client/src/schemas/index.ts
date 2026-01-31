/**
 * API Client Schemas
 *
 * Zod schemas for runtime validation and type inference.
 * All types are derived from Zod schemas using z.infer<>.
 */

// Wishlist schemas
export {
  // Enums
  WishlistStoreSchema,
  CurrencySchema,
  // Item schemas
  WishlistItemSchema,
  CreateWishlistItemSchema,
  UpdateWishlistItemSchema,
  // Query/Response schemas
  WishlistQueryParamsSchema,
  PaginationSchema,
  WishlistListResponseSchema,
  // Reorder schemas
  ReorderWishlistItemSchema,
  BatchReorderSchema,
  ReorderResponseSchema,
  // Presign schemas
  PresignRequestSchema,
  PresignResponseSchema,
  // Purchase schemas (WISH-2042)
  MarkAsPurchasedInputSchema,
  GotItFormSchema,
  SetItemSchema,
  // Types
  type WishlistStore,
  type Currency,
  type WishlistItem,
  type CreateWishlistItem,
  type UpdateWishlistItem,
  type WishlistQueryParams,
  type Pagination,
  type WishlistListResponse,
  type ReorderWishlistItem,
  type BatchReorder,
  type ReorderResponse,
  type PresignRequest,
  type PresignResponse,
  type MarkAsPurchasedInput,
  type GotItFormValues,
  type SetItem,
} from './wishlist'

// Sets schemas
export {
  SetImageSchema,
  SetSchema,
  CreateSetSchema,
  UpdateSetSchema,
  SetListQuerySchema,
  SetListPaginationSchema,
  SetListFiltersSchema,
  SetListResponseSchema,
  type SetImage,
  type Set,
  type CreateSetInput,
  type UpdateSetInput,
  type SetListQuery,
  type SetListPagination,
  type SetListFilters,
  type SetListResponse,
} from './sets'

// Feature flags schemas (WISH-2009)
export {
  FeatureFlagSchema,
  FeatureFlagsResponseSchema,
  FeatureFlagDetailResponseSchema,
  UpdateFeatureFlagInputSchema,
  WishlistFlagKeys,
  type FeatureFlag,
  type FeatureFlagsResponse,
  type FeatureFlagDetailResponse,
  type UpdateFeatureFlagInput,
  type WishlistFlagKey,
} from './feature-flags'
