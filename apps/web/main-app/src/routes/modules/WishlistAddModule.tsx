/**
 * Wishlist Add Module
 * Epic 6: Wishlist Gallery
 *
 * Story wish-2002: Add Item Flow
 * - Lazy-loads @repo/app-wishlist-gallery AddItemModule
 * - Connected to shell via /wishlist/add route
 */

import { lazy, Suspense, useCallback } from 'react'
import { useRouter } from '@tanstack/react-router'
import { LoadingPage } from '../pages/LoadingPage'

// Lazy-load the wishlist add item module from @repo/app-wishlist-gallery
const AddItemModuleLazy = lazy(() =>
  import('@repo/app-wishlist-gallery').then(module => ({
    default: module.AddItemModule,
  })),
)

/**
 * Wishlist Add Module - Wrapper for lazy-loaded wishlist add item page
 */
export function WishlistAddModule() {
  const router = useRouter()

  const handleNavigateBack = useCallback(() => {
    router.navigate({ to: '/wishlist' })
  }, [router])

  return (
    <Suspense fallback={<LoadingPage />}>
      <AddItemModuleLazy onNavigateBack={handleNavigateBack} />
    </Suspense>
  )
}
