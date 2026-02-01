# Frontend Log - WISH-2009

## Files Created

### Shared Schemas
- `packages/core/api-client/src/schemas/feature-flags.ts` - Zod schemas for frontend/backend alignment

### Context
- `apps/web/app-wishlist-gallery/src/contexts/FeatureFlagContext.tsx` - FeatureFlagProvider and useFeatureFlagContext

### Hooks
- `apps/web/app-wishlist-gallery/src/hooks/useFeatureFlag.ts` - useFeatureFlag and useFeatureFlags hooks

### Tests
- `apps/web/app-wishlist-gallery/src/contexts/__tests__/FeatureFlagContext.test.tsx` - 6 context tests
- `apps/web/app-wishlist-gallery/src/hooks/__tests__/useFeatureFlag.test.tsx` - 7 hook tests

## Files Modified

### Package Exports
- `packages/core/api-client/package.json` - Added feature-flags schema export
- `packages/core/api-client/src/schemas/index.ts` - Added feature-flags exports

## Components Created

### FeatureFlagProvider
- Fetches flags from `/api/config/flags` on mount
- Provides `flags`, `isFeatureEnabled`, `isLoading`, `error`, `refetch`
- Window focus refetch with stale-while-revalidate (5 min cache)
- Supports `initialFlags` prop for testing/SSR

### Hooks
- `useFeatureFlag(flagKey)` - Returns boolean (false while loading)
- `useFeatureFlags()` - Returns `{ flags, isLoading, error, refetch }`

## Test Results

```
 ✓ apps/web/app-wishlist-gallery/src/contexts/__tests__/FeatureFlagContext.test.tsx (6 tests) 36ms
 ✓ apps/web/app-wishlist-gallery/src/hooks/__tests__/useFeatureFlag.test.tsx (7 tests) 68ms

 Test Files  2 passed (2)
      Tests  13 passed (13)
```

## Usage Example

```tsx
// In Module.tsx
import { FeatureFlagProvider } from './contexts/FeatureFlagContext'

export function AppWishlistGalleryModule({ className }: Props) {
  return (
    <FeatureFlagProvider>
      <Provider store={store}>
        <RouterProvider router={router} />
      </Provider>
    </FeatureFlagProvider>
  )
}

// In components
import { useFeatureFlag } from '../hooks/useFeatureFlag'
import { WishlistFlagKeys } from '@repo/api-client/schemas/feature-flags'

function WishlistGallery() {
  const isGalleryEnabled = useFeatureFlag(WishlistFlagKeys.GALLERY)

  if (!isGalleryEnabled) {
    return <FeatureNotAvailable message="Coming soon!" />
  }

  return <Gallery />
}
```
