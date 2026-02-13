import { useCallback, useMemo } from 'react'
import { z } from 'zod'
import { PermissionFeatureSchema } from '@repo/api-client'
import { logger } from '@repo/logger'
import { usePermissions, useIsAdmin } from './usePermissions'

/**
 * Module auth state schema
 */
const ModuleAuthStateSchema = z.object({
  /** Whether the user has access to this module */
  hasAccess: z.boolean(),
  /** Whether the user can edit content in this module */
  canEdit: z.boolean(),
  /** Whether the user can delete content in this module */
  canDelete: z.boolean(),
  /** Whether the user has admin privileges for this module */
  isAdmin: z.boolean(),
})

export type ModuleAuthState = z.infer<typeof ModuleAuthStateSchema>

/**
 * Return type for useModuleAuth hook
 * Extends ModuleAuthState with method signatures
 */
const UseModuleAuthReturnSchema = ModuleAuthStateSchema.extend({
  isLoading: z.boolean(),
  error: z.unknown(),
})

export type UseModuleAuthReturn = z.infer<typeof UseModuleAuthReturnSchema> & {
  /** Check if user has a specific permission */
  hasPermission: (permission: string) => boolean
  /** Refresh auth state */
  refreshAuth: () => void
}

/**
 * Hook for managing module-specific authentication and authorization
 *
 * Provides a unified interface for checking access, edit, delete, and admin permissions.
 * Internally uses usePermissions to access the central auth state.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { hasAccess, canEdit, hasPermission } = useModuleAuth()
 *
 *   if (!hasAccess) {
 *     return <AccessDenied />
 *   }
 *
 *   return (
 *     <div>
 *       {canEdit && <EditButton />}
 *       {hasPermission('export') && <ExportButton />}
 *     </div>
 *   )
 * }
 * ```
 */
export function useModuleAuth(): UseModuleAuthReturn {
  const { permissions, isLoading, error, refetch } = usePermissions()
  const isAdmin = useIsAdmin()

  // Basic access control
  const hasAccess = useMemo(() => {
    if (isAdmin) return true
    if (!permissions) return false
    if (permissions.isSuspended) return false
    return true
  }, [isAdmin, permissions])

  // Edit permission (requires being authenticated and not suspended)
  const canEdit = useMemo(() => {
    if (isAdmin) return true
    if (!permissions) return false
    if (permissions.isSuspended) return false
    return true
  }, [isAdmin, permissions])

  // Delete permission (more restrictive - requires admin or specific permission)
  const canDelete = useMemo(() => {
    return isAdmin
  }, [isAdmin])

  // Permission checker
  const hasPermission = useCallback(
    (permission: string): boolean => {
      // Admin has all permissions
      if (isAdmin) return true

      // No permissions if not authenticated or suspended
      if (!permissions || permissions.isSuspended) return false

      // Map common permission strings to feature/quota checks
      const permissionMap: Record<string, boolean> = {
        view: hasAccess,
        edit: canEdit,
        delete: canDelete,
        admin: isAdmin,
      }

      // Check if permission is in the map
      if (permission in permissionMap) {
        return permissionMap[permission]
      }

      // Try to interpret as a feature name with runtime validation
      const parseResult = PermissionFeatureSchema.safeParse(permission)
      if (parseResult.success) {
        return permissions.features.includes(parseResult.data)
      }

      logger.warn('Unknown permission requested', { permission })
      return false
    },
    [isAdmin, permissions, hasAccess, canEdit, canDelete],
  )

  // Refresh auth state
  const refreshAuth = useCallback(() => {
    refetch()
  }, [refetch])

  const authState: ModuleAuthState = useMemo(
    () => ({
      hasAccess,
      canEdit,
      canDelete,
      isAdmin,
    }),
    [hasAccess, canEdit, canDelete, isAdmin],
  )

  return {
    ...authState,
    hasPermission,
    refreshAuth,
    isLoading,
    error,
  }
}

export default useModuleAuth
