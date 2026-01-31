/**
 * useFeatureFlag Hook (WISH-2009 - AC11)
 *
 * Simple hook to check if a feature flag is enabled.
 * Returns false while loading (safe default).
 */

import { useFeatureFlagContext } from '../contexts/FeatureFlagContext'

/**
 * Check if a feature flag is enabled
 *
 * @param flagKey - The flag key to check (e.g., 'wishlist-gallery')
 * @returns true if flag is enabled, false otherwise (including while loading)
 *
 * @example
 * ```tsx
 * function WishlistPage() {
 *   const isGalleryEnabled = useFeatureFlag('wishlist-gallery')
 *
 *   if (!isGalleryEnabled) {
 *     return <FeatureNotAvailable message="Wishlist coming soon!" />
 *   }
 *
 *   return <WishlistGallery />
 * }
 * ```
 */
export function useFeatureFlag(flagKey: string): boolean {
  const { isFeatureEnabled } = useFeatureFlagContext()
  return isFeatureEnabled(flagKey)
}

/**
 * Get all feature flags with loading state
 *
 * @returns Object with flags, loading state, and error
 *
 * @example
 * ```tsx
 * function FeatureAwareComponent() {
 *   const { flags, isLoading, error } = useFeatureFlags()
 *
 *   if (isLoading) return <Spinner />
 *   if (error) return <ErrorMessage error={error} />
 *
 *   return (
 *     <div>
 *       {flags['wishlist-gallery'] && <WishlistGallery />}
 *       {flags['wishlist-add-item'] && <AddItemButton />}
 *     </div>
 *   )
 * }
 * ```
 */
export function useFeatureFlags() {
  const { flags, isLoading, error, refetch } = useFeatureFlagContext()
  return { flags, isLoading, error, refetch }
}
