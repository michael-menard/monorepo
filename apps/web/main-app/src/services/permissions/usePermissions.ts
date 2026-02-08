import { useSelector } from 'react-redux'
import {
  type Feature,
  type QuotaType,
  type Tier,
  FEATURE_REQUIRED_TIER,
  TIER_DISPLAY_NAMES,
} from '@repo/api-client'
import { selectAuth } from '@/store/slices/authSlice'
import { useGetPermissionsQuery } from '@/store'

/**
 * Main permissions hook
 *
 * Wraps RTK Query with authentication-aware fetching and helper functions.
 * Skips fetching when user is not authenticated.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { permissions, hasFeature, hasQuota, isLoading } = usePermissions()
 *
 *   if (isLoading) return <LoadingSpinner />
 *   if (!hasFeature('gallery')) return <UpgradePrompt />
 *
 *   return <GalleryContent />
 * }
 * ```
 */
export function usePermissions() {
  const auth = useSelector(selectAuth)
  const isAuthenticated = auth.isAuthenticated

  const {
    data: permissions,
    isLoading,
    error,
    refetch,
  } = useGetPermissionsQuery(undefined, {
    skip: !isAuthenticated,
  })

  const hasFeature = (feature: Feature): boolean => {
    if (!permissions) return false
    if (permissions.isAdmin) return true
    if (permissions.isSuspended) return false
    return permissions.features.includes(feature)
  }

  const hasQuota = (quotaType: QuotaType): boolean => {
    if (!permissions) return false
    if (permissions.isAdmin) return true
    if (permissions.isSuspended) return false
    const quota = permissions.quotas[quotaType]
    if (quota.remaining === null) return true // unlimited
    return quota.remaining > 0
  }

  const getRequiredTier = (feature: Feature): Tier => FEATURE_REQUIRED_TIER[feature]
  const getTierDisplayName = (tier: Tier): string => TIER_DISPLAY_NAMES[tier]

  return {
    permissions: permissions ?? null,
    isLoading,
    error,
    refetch,
    tier: permissions?.tier ?? null,
    isAdmin: permissions?.isAdmin ?? false,
    isSuspended: permissions?.isSuspended ?? false,
    hasFeature,
    hasQuota,
    getRequiredTier,
    getTierDisplayName,
  }
}

/**
 * Check if user has a specific feature
 */
export function useHasFeature(feature: Feature): boolean {
  const { hasFeature } = usePermissions()
  return hasFeature(feature)
}

/**
 * Check if user has quota remaining
 */
export function useHasQuota(quotaType: QuotaType): boolean {
  const { hasQuota } = usePermissions()
  return hasQuota(quotaType)
}

/**
 * Get quota info for a resource type
 */
export function useQuotaInfo(quotaType: QuotaType) {
  const { permissions } = usePermissions()
  return permissions?.quotas[quotaType] ?? null
}

/**
 * Check if user is admin
 */
export function useIsAdmin(): boolean {
  const { isAdmin } = usePermissions()
  return isAdmin
}

/**
 * Get current user tier
 */
export function useTier(): Tier | null {
  const { tier } = usePermissions()
  return tier
}
