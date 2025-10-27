# RTK Query Refactoring Documentation

## Overview

This document outlines the refactoring of the auth package to better leverage RTK Query's capabilities and reduce state management complexity.

## What Was Refactored

### 1. **Simplified Auth Slice**

**Before:**

- Managed user data, tokens, authentication state, loading states, and errors
- Duplicated state that RTK Query already handles
- Complex state synchronization between auth slice and RTK Query

**After:**

- Only manages UI-specific state:
  - `isCheckingAuth`: Initial auth check loading state
  - `lastActivity`: Session management
  - `sessionTimeout`: Session configuration
  - `message`: UI messages (not API errors)

### 2. **Removed Auth Slice Dependencies from RTK Query**

**Before:**

- RTK Query endpoints had `onQueryStarted` callbacks that dispatched auth slice actions
- Complex state synchronization between API cache and auth slice
- Potential for state inconsistencies

**After:**

- RTK Query handles all API state independently
- Uses cache tags for invalidation (`['Auth', 'User']`)
- No direct coupling between RTK Query and auth slice

### 3. **Updated useAuth Hook**

**Before:**

- Mixed data from auth slice and RTK Query
- Complex error and loading state management
- Potential for state conflicts

**After:**

- Gets user data directly from RTK Query cache: `authData?.data?.user`
- Gets tokens directly from RTK Query cache: `authData?.data?.tokens`
- Computes `isAuthenticated` from user data: `!!user`
- Combines loading states from all RTK Query hooks
- Combines errors from all RTK Query hooks
- Only uses auth slice for UI-specific state

## Benefits of the Refactoring

### 1. **Single Source of Truth**

- RTK Query cache is the authoritative source for API data
- No more state synchronization issues
- Consistent data across the application

### 2. **Automatic Cache Management**

- RTK Query handles cache invalidation automatically
- Optimistic updates and background refetching
- Built-in deduplication and caching strategies

### 3. **Reduced Complexity**

- Less state to manage manually
- Fewer potential bugs from state synchronization
- Cleaner separation of concerns

### 4. **Better Performance**

- RTK Query's built-in optimizations
- Automatic request deduplication
- Intelligent cache invalidation

### 5. **Consistent Error Handling**

- All API errors handled by RTK Query
- Consistent error format across the application
- Better error recovery mechanisms

## File Changes

### Modified Files

1. **`packages/auth/src/store/authSlice.ts`**
   - Simplified state interface
   - Removed user, tokens, isAuthenticated, isLoading, error
   - Kept only UI-specific state
   - Updated selectors and actions

2. **`packages/auth/src/store/authApi.ts`**
   - Removed auth slice dependencies
   - Removed `onQueryStarted` callbacks
   - Added proper cache tags
   - Simplified endpoint definitions

3. **`packages/auth/src/hooks/useAuth.ts`**
   - Gets data from RTK Query cache
   - Computes derived state from cache
   - Combines loading and error states
   - Uses auth slice only for UI state

4. **`packages/auth/src/types/auth.ts`**
   - Updated `AuthStateSchema` to match simplified state
   - Removed redundant fields

5. **`packages/auth/src/store/__tests__/authSlice.test.ts`**
   - Updated tests to match simplified state
   - Removed tests for removed functionality
   - Focused on UI-specific state testing

## Migration Guide

### For Components

Components using the `useAuth` hook don't need any changes. The interface remains the same:

```typescript
const { user, isAuthenticated, isLoading, error, login, signup } = useAuth()
```

### For New Features

When adding new auth-related features:

1. **API Operations**: Add to RTK Query endpoints in `authApi.ts`
2. **UI State**: Add to auth slice if it's UI-specific
3. **Cache Management**: Use appropriate cache tags
4. **Error Handling**: Let RTK Query handle API errors

### Best Practices

1. **Use RTK Query for all API operations**
2. **Keep auth slice focused on UI state only**
3. **Use cache tags for proper invalidation**
4. **Let RTK Query handle loading and error states**
5. **Compute derived state from RTK Query cache**

## Testing Strategy

### Unit Tests

- Test auth slice for UI-specific state only
- Test RTK Query endpoints independently
- Test useAuth hook integration

### Integration Tests

- Test component integration with RTK Query
- Test cache invalidation scenarios
- Test error handling flows

### Mock Strategy

- Mock RTK Query responses for component tests
- Use MSW for integration tests
- Test cache behavior with real API calls

## Future Improvements

1. **Add optimistic updates** for better UX
2. **Implement background sync** for offline support
3. **Add retry logic** for failed requests
4. **Implement request deduplication** for concurrent requests
5. **Add cache persistence** for better performance

## Conclusion

This refactoring successfully leverages RTK Query's strengths while reducing the complexity of state management. The auth system is now more maintainable, performant, and less prone to bugs from state synchronization issues.

The refactoring maintains backward compatibility for components while providing a cleaner, more efficient architecture for future development.
