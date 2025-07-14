# Task 02: Redux Store Setup

## Overview
Set up Redux Toolkit store using the existing auth slice from `@repo/auth` package.

## Priority
**High**

## Estimated Effort
**1-2 hours** (reduced due to existing auth slice)

## Category
**Core Auth**

## Dependencies
- Task 01: Environment Setup

## Technical Details

### Leveraging Existing Auth Slice
The `@repo/auth` package already provides a complete auth slice:

```typescript
// Import existing auth slice and types
import { authReducer, type AuthState, type User } from '@repo/auth';
import { configureStore } from '@reduxjs/toolkit';

// Configure store with existing auth reducer
export const store = configureStore({
  reducer: {
    auth: authReducer,
    // Add other reducers as needed
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

### Existing Auth State Interface
```typescript
// From @repo/auth package
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  error: string | null;
  isLoading: boolean;
  isCheckingAuth: boolean;
  message: string | null;
}

export type User = {
  id: string;
  name: string;
  email: string;
  emailVerified?: boolean;
  isVerified?: boolean;
  createdAt: string;
  updatedAt: string;
};
```

### Existing Auth Actions
The auth slice already includes all necessary actions:
- `signup` - User registration
- `login` - User login
- `logout` - User logout
- `verifyEmail` - Email verification
- `checkAuth` - Check authentication status
- `forgotPassword` - Password reset request
- `resetPassword` - Password reset
- `clearError` - Clear error state
- `clearMessage` - Clear message state

### Store Provider Setup
```typescript
// App.tsx or main entry point
import { Provider } from 'react-redux';
import { store } from './store/store';

function App() {
  return (
    <Provider store={store}>
      {/* Your app components */}
    </Provider>
  );
}
```

## Acceptance Criteria
- [ ] Redux store is configured with existing auth reducer
- [ ] Store provider is set up in the app
- [ ] Existing auth actions are accessible
- [ ] Auth state is properly typed
- [ ] Store integrates with React components
- [ ] Loading and error states are handled
- [ ] No duplicate auth slice implementation

## Implementation Steps
1. Import existing auth reducer from `@repo/auth`
2. Configure Redux store with auth reducer
3. Set up store provider in app
4. Test store integration
5. Verify existing auth actions work
6. Test auth state management

## Notes
- **Use existing auth slice** instead of creating a new one
- **Leverage existing actions** and selectors from the package
- **Extend the store** with additional reducers if needed
- **Ensure compatibility** with existing auth service endpoints
- **Test that all existing auth functionality** works correctly 