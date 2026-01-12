/**
 * Wishlist Module
 * Epic 6: Wishlist Gallery
 *
 * Story wish-2001: Wishlist Gallery MVP
 * Story wish-2002: Add Item Flow
 * - Lazy-loads @repo/app-wishlist-gallery micro-app
 * - Connected to shell via /wishlist route
 */

import { lazy, Suspense, useCallback } from 'react'
import { useRouter } from '@tanstack/react-router'
import { LoadingPage } from '../pages/LoadingPage'

// Lazy-load the wishlist gallery module from @repo/app-wishlist-gallery
const WishlistGalleryModule = lazy(() => import('@repo/app-wishlist-gallery'))

/**
 * Wishlist Module - Wrapper for lazy-loaded wishlist gallery
 */
export function WishlistModule() {
  const router = useRouter()

  const handleNavigateToAdd = useCallback(() => {
    router.navigate({ to: '/wishlist/add' })
  }, [router])

  return (
    <Suspense fallback={<LoadingPage />}>
      <WishlistGalleryModule onNavigateToAdd={handleNavigateToAdd} />
    </Suspense>
  )
}
