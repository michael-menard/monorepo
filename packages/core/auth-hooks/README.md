# @repo/auth-hooks

Shared authentication and authorization hooks for the LEGO MOC instructions platform.

## Overview

This package provides a centralized set of hooks for managing:
- User permissions and feature access
- Quota management
- Module-level authentication
- Admin and tier checking

## Installation

This package is part of the monorepo workspace and should be installed via workspace dependencies:

```json
{
  "dependencies": {
    "@repo/auth-hooks": "workspace:*"
  }
}
```

## Prerequisites

This package requires Redux to be configured in the consuming application with:
- `authSlice` from your store (for auth state)
- `permissionsApi` from `@repo/api-client/rtk/permissions-api` (for RTK Query)

## Hooks

### `usePermissions()`

Main hook for accessing user permissions, features, and quotas.

```tsx
import { usePermissions } from '@repo/auth-hooks'

function MyComponent() {
  const { permissions, hasFeature, hasQuota, isLoading, tier, isAdmin } = usePermissions()

  if (isLoading) return <LoadingSpinner />
  if (!hasFeature('gallery')) return <UpgradePrompt />

  return <GalleryContent />
}
```

### `useHasFeature(feature)`

Convenience hook to check if user has access to a specific feature.

```tsx
import { useHasFeature } from '@repo/auth-hooks'

function GalleryButton() {
  const hasGallery = useHasFeature('gallery')
  
  return hasGallery ? <OpenGalleryButton /> : <UpgradeButton />
}
```

### `useHasQuota(quotaType)`

Check if user has remaining quota for a resource type.

```tsx
import { useHasQuota } from '@repo/auth-hooks'

function CreateMOCButton() {
  const canCreate = useHasQuota('mocs')
  
  return (
    <button disabled={!canCreate}>
      {canCreate ? 'Create MOC' : 'Quota Exceeded'}
    </button>
  )
}
```

### `useQuotaInfo(quotaType)`

Get detailed quota information for a resource.

```tsx
import { useQuotaInfo } from '@repo/auth-hooks'

function QuotaDisplay() {
  const mocQuota = useQuotaInfo('mocs')
  
  if (!mocQuota) return null
  
  return <div>{mocQuota.current} / {mocQuota.limit ?? '∞'} MOCs</div>
}
```

### `useIsAdmin()`

Check if the current user has admin privileges.

```tsx
import { useIsAdmin } from '@repo/auth-hooks'

function AdminPanel() {
  const isAdmin = useIsAdmin()
  
  if (!isAdmin) return <AccessDenied />
  
  return <AdminControls />
}
```

### `useTier()`

Get the current user's subscription tier.

```tsx
import { useTier } from '@repo/auth-hooks'

function TierBadge() {
  const tier = useTier()
  
  return <Badge>{tier || 'Free'}</Badge>
}
```

### `useModuleAuth()`

Module-level authentication hook with comprehensive auth state.

```tsx
import { useModuleAuth } from '@repo/auth-hooks'

function ModulePage() {
  const { 
    hasAccess, 
    canEdit, 
    canDelete, 
    isAdmin, 
    hasPermission, 
    refreshAuth 
  } = useModuleAuth()

  if (!hasAccess) return <AccessDenied />

  return (
    <div>
      {canEdit && <EditButton />}
      {canDelete && <DeleteButton />}
      {hasPermission('export') && <ExportButton />}
    </div>
  )
}
```

## Type Safety

All hooks use Zod schemas for runtime validation and type inference. Types are automatically inferred from `@repo/api-client`.

## Dependencies

- `@repo/api-client` - Core API schemas and RTK Query hooks
- `@repo/logger` - Logging utilities
- `react-redux` - Redux integration
- `@reduxjs/toolkit` - RTK utilities
- `zod` - Schema validation

## License

MIT
