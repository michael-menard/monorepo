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
} from './wishlist'
