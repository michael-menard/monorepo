/**
 * Wishlist Core Package
 *
 * Platform-agnostic business logic for wishlist operations.
 */

// Core functions
export { listWishlistItems } from './list-wishlist-items.js'
export type {
  ListWishlistDbClient,
  WishlistSchema as ListWishlistSchema,
} from './list-wishlist-items.js'

export { getWishlistItemById } from './get-wishlist-item.js'
export type {
  GetWishlistDbClient,
  GetWishlistItemResult,
  WishlistSchema as GetWishlistSchema,
} from './get-wishlist-item.js'

export { searchWishlistItems } from './search-wishlist-items.js'
export type {
  SearchWishlistDbClient,
  WishlistSchema as SearchWishlistSchema,
} from './search-wishlist-items.js'

export { createWishlistItem } from './create-wishlist-item.js'
export type {
  CreateWishlistDbClient,
  CreateWishlistSchema,
  CreateWishlistResult,
} from './create-wishlist-item.js'

export { updateWishlistItem } from './update-wishlist-item.js'
export type {
  UpdateWishlistDbClient,
  UpdateWishlistSchema,
  UpdateWishlistResult,
} from './update-wishlist-item.js'

export { deleteWishlistItem } from './delete-wishlist-item.js'
export type {
  DeleteWishlistDbClient,
  DeleteWishlistSchema,
  DeleteWishlistResult,
} from './delete-wishlist-item.js'

export { reorderWishlistItems } from './reorder-wishlist-items.js'
export type {
  ReorderWishlistDbClient,
  ReorderWishlistSchema,
  ReorderWishlistResult,
} from './reorder-wishlist-items.js'

// Types
export type {
  WishlistItem,
  WishlistListResponse,
  ListWishlistFilters,
  SearchWishlistFilters,
  Pagination,
  WishlistRow,
} from './__types__/index.js'

export {
  WishlistItemSchema,
  WishlistListResponseSchema,
  ListWishlistFiltersSchema,
  SearchWishlistFiltersSchema,
  PaginationSchema,
  WishlistRowSchema,
  CreateWishlistInputSchema,
  UpdateWishlistInputSchema,
  ReorderWishlistInputSchema,
  ReorderItemSchema,
} from './__types__/index.js'

export type {
  CreateWishlistInput,
  UpdateWishlistInput,
  ReorderWishlistInput,
  ReorderItem,
} from './__types__/index.js'
