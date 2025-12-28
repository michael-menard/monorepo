/**
 * Wishlist Module
 * Epic 6: Wishlist Gallery
 *
 * Story wish-2001: Wishlist Gallery MVP
 * - Lazy-loads @repo/app-wishlist-gallery micro-app
 * - Connected to shell via /wishlist route
 */

import { lazy, Suspense } from 'react'
import { LoadingPage } from '../pages/LoadingPage'

// Lazy-load the wishlist gallery module from @repo/app-wishlist-gallery
const WishlistGalleryModule = lazy(() => import('@repo/app-wishlist-gallery'))

/**
 * Wishlist Module - Wrapper for lazy-loaded wishlist gallery
 */
export function WishlistModule() {
  return (
    <Suspense fallback={<LoadingPage />}>
      <WishlistGalleryModule />
    </Suspense>
  )
}
