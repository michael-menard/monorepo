/**
 * @repo/app-wishlist-gallery
 *
 * Wishlist Gallery module entry point for lazy-loading by main-app shell.
 *
 * Story wish-2001: Wishlist Gallery MVP
 * Story wish-2002: Add Item Flow
 */

export { AppWishlistGalleryModule, AppWishlistGalleryModule as default } from './Module'
export type { AppWishlistGalleryModuleProps } from './Module'

// Story wish-2002: Add Item Flow
export { AddItemModule } from './AddItemModule'
export type { AddItemModuleProps } from './AddItemModule'
