/**
 * Permissions Service
 *
 * Hooks for user permissions, features, and quotas.
 * Uses RTK Query under the hood with auth-aware fetching.
 */

export {
  usePermissions,
  useHasFeature,
  useHasQuota,
  useQuotaInfo,
  useIsAdmin,
  useTier,
} from './usePermissions'
