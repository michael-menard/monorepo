# Future Opportunities - REPA-012

Non-MVP gaps and enhancements tracked for future iterations.

## Gaps (Non-Blocking)

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | No context-based alternative for apps without Redux | Medium | Medium | Create context-based auth provider in REPA-018 (@repo/auth-services) for apps that don't use Redux store |
| 2 | No E2E tests for useModuleAuth UI integration | Low | Low | Add Playwright test if gallery apps use useModuleAuth in critical UI flows (check post-implementation) |
| 3 | No runtime validation that RTK Query hook exists in @repo/api-client | Low | Low | Add runtime check in usePermissions that throws helpful error if `useGetPermissionsQuery` is undefined |
| 4 | Missing JSDoc examples for helper hooks (useHasFeature, useHasQuota, etc.) | Low | Low | Add JSDoc to each helper hook showing usage examples |
| 5 | No package-level README badges (build status, coverage, version) | Low | Low | Add status badges to README.md for visibility into package health |

## Enhancement Opportunities

| # | Finding | Impact | Effort | Recommendation |
|---|---------|--------|--------|----------------|
| 1 | **Circular Dependency Resolution** - Extract toast notifications to separate package | High | High | Create `@repo/notifications` package for toast utilities, eliminating circular dependency between @repo/auth-hooks and @repo/app-component-library |
| 2 | **Composable Auth Hook** - No single hook combining all auth functionality | Medium | Low | Create `useAuth()` hook that combines useModuleAuth, usePermissions, and useTokenRefresh into one convenient API |
| 3 | **Token Refresh Customization** - Hardcoded toast notification in useTokenRefresh | Medium | Low | Accept notification renderer as optional prop: `useTokenRefresh({ onRefreshError?: (error) => void })` |
| 4 | **Permission Caching Strategy** - No client-side cache invalidation strategy documented | Medium | Low | Document when apps should call `invalidatePermissionsMutation` (after tier upgrade, resource creation, etc.) |
| 5 | **Quota Polling** - No real-time quota updates | Low | Medium | Add optional polling to usePermissions: `usePermissions({ pollInterval?: number })` for apps needing real-time quota display |
| 6 | **Admin Override Hook** - No dedicated hook for admin checks with bypass logic | Low | Low | Create `useAdminGuard(feature)` hook that bypasses feature gates for admins |
| 7 | **Permission Preloading** - No prefetch strategy for permissions on app load | Low | Medium | Add `prefetchPermissions()` utility for apps to call during auth initialization |
| 8 | **Offline Permissions** - No fallback when permissions API fails | Low | Medium | Add localStorage caching of last known permissions for offline/degraded mode |
| 9 | **Permission Change Notifications** - No way to detect when permissions change | Low | High | Add WebSocket integration or polling to notify users when permissions change server-side |
| 10 | **Type-Safe Feature Checks** - hasFeature accepts any string, no autocomplete | Low | Low | Enhance TypeScript types to provide autocomplete for Feature enum values |

## Categories

### Edge Cases
- **Gap #1**: Apps without Redux cannot use hooks (REPA-018 will address)
- **Gap #3**: Missing runtime validation for RTK Query dependency
- **Enhancement #8**: No offline fallback strategy

### UX Polish
- **Enhancement #2**: Composable useAuth() hook for simpler API
- **Enhancement #3**: Customizable notification renderer
- **Enhancement #9**: Real-time permission change notifications
- **Enhancement #10**: Type-safe autocomplete for feature checks

### Performance
- **Enhancement #4**: Permission caching strategy documentation
- **Enhancement #5**: Optional polling for real-time quota updates
- **Enhancement #7**: Permission prefetching strategy

### Observability
- **Gap #5**: Package health badges (build status, coverage)
- **Enhancement #4**: Document cache invalidation patterns

### Integrations
- **Enhancement #1**: Extract notifications to separate package (HIGH PRIORITY)
- **Enhancement #9**: WebSocket integration for permission changes

## Priority Recommendations

### High Priority (Next Story)
1. **Enhancement #1** - Extract toast notifications to `@repo/notifications`
   - **Why:** Eliminates circular dependency risk
   - **Effort:** High (new package creation)
   - **Impact:** High (architectural cleanliness, reusability)
   - **Story:** Create REPA-022: "Create @repo/notifications Package"

### Medium Priority (Within Epic)
2. **Enhancement #2** - Create composable `useAuth()` hook
   - **Why:** Simplifies app integration (one import instead of three)
   - **Effort:** Low (composition hook)
   - **Impact:** Medium (developer experience)
   - **Story:** Add to REPA-012 as AC-8 or defer to REPA-023

3. **Enhancement #3** - Customizable token refresh notifications
   - **Why:** Apps may want different notification styles
   - **Effort:** Low (add optional prop)
   - **Impact:** Medium (flexibility)
   - **Story:** Add to REPA-018 (auth services) or REPA-023

4. **Gap #1** - Context-based auth alternative
   - **Why:** Gallery apps without Redux need auth hooks
   - **Effort:** Medium (REPA-018 already planned)
   - **Impact:** Medium (broader adoption)
   - **Story:** REPA-018 (already planned)

### Low Priority (Post-Epic)
5. **Enhancement #7** - Permission prefetching
   - **Why:** Faster app initialization
   - **Effort:** Medium
   - **Impact:** Low (marginal UX improvement)

6. **Enhancement #10** - Type-safe feature checks
   - **Why:** Better DX with autocomplete
   - **Effort:** Low
   - **Impact:** Low (nice-to-have)

## Implementation Notes

### For Enhancement #1 (Notifications Package)
If creating `@repo/notifications`:
- Extract `useToast` from @repo/app-component-library
- Add toast queue management (prevent duplicate toasts)
- Support multiple notification types (toast, banner, modal)
- Zero dependencies on other packages (foundation package)

### For Enhancement #2 (Composable Auth Hook)
```typescript
// Proposed API
function useAuth() {
  const moduleAuth = useModuleAuth()
  const permissions = usePermissions()
  useTokenRefresh() // side effect only

  return {
    ...moduleAuth,
    ...permissions,
    // Combined helpers
    canAccess: (feature: Feature) =>
      moduleAuth.isAuthenticated && permissions.hasFeature(feature),
  }
}
```

### For Gap #1 (Context-Based Alternative)
Consider architecture:
- `AuthProvider` context (wraps app)
- `useAuthContext()` hook (replaces useModuleAuth)
- Compatible with Redux-based apps via adapter pattern
- Documented migration path from Redux to context
