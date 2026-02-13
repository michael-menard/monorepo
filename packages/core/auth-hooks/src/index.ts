/**
 * @repo/auth-hooks
 *
 * Shared authentication and authorization hooks for all apps in the monorepo.
 * Provides unified access to permissions, features, quotas, and module-level auth.
 */

export {
  usePermissions,
  useHasFeature,
  useHasQuota,
  useQuotaInfo,
  useIsAdmin,
  useTier,
} from './usePermissions'

export { useModuleAuth, type ModuleAuthState, type UseModuleAuthReturn } from './useModuleAuth'
