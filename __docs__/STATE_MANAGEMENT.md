# State Management Guide

This guide explains the state management architecture in the LEGO MOC Instructions monorepo using Redux Toolkit and RTK Query.

## Technology Stack

- **Redux Toolkit**: Modern Redux with simplified patterns and TypeScript support
- **RTK Query**: Powerful data fetching and caching solution
- **Zod**: Runtime type validation and schema definition
- **TypeScript**: Full type safety throughout the state management system

## Architecture Overview

### State Management Layers
1. **Global State**: Redux store for application-wide state
2. **Server State**: RTK Query for API data fetching and caching
3. **Local State**: React hooks for component-specific state
4. **Form State**: React Hook Form for form management

### Package Structure
```
packages/
├── auth/                    # Authentication state management
│   └── src/store/
│       ├── authSlice.ts     # Auth UI state
│       ├── authApi.ts       # Auth API endpoints
│       └── store.ts         # Auth package store
├── shared/                  # Shared state utilities
│   └── src/store/
│       └── store.ts         # Shared store configuration
└── ui/                      # UI components (no state)

apps/
└── web/lego-moc-instructions-app/
    ├── src/store/
    │   └── store.ts         # Main app store
    └── src/services/
        ├── authApi.ts       # Legacy auth service
        └── api.ts           # Main API service
```

## Redux Store Configuration

### Main App Store
```tsx
// apps/web/lego-moc-instructions-app/src/store/store.ts
import { configureStore } from '@reduxjs/toolkit'
import { authApi, authReducer } from '@repo/auth'
import { api } from '../services/api'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [authApi.reducerPath]: authApi.reducer,
    [api.reducerPath]: api.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(authApi.middleware, api.middleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
```

### Auth Package Store
```tsx
// packages/auth/src/store/store.ts
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice.js';
import { authApi } from './authApi.js';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [authApi.reducerPath]: authApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(authApi.middleware),
});
```

## RTK Query API Services

### Authentication API (`packages/auth/src/store/authApi.ts`)
```tsx
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NODE_ENV === 'development'
      ? 'http://localhost:5000/api/auth'
      : '/api/auth',
    credentials: 'include', // for cookies
  }),
  tagTypes: ['Auth', 'User'],
  endpoints: (builder) => ({
    login: builder.mutation<AuthResponse, LoginRequest>({
      query: (body) => ({
        url: '/login',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Auth', 'User'],
    }),
    // ... other endpoints
  }),
});
```

### Main API Service (`apps/web/lego-moc-instructions-app/src/services/api.ts`)
```tsx
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { z } from 'zod'

// Zod schemas for type safety
export const MOCInstructionSchema = z.object({
  id: z.string(),
  title: z.string(),
  // ... schema definition
})

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: config.api.baseUrl,
    prepareHeaders: (headers, { getState }) => {
      // Add auth token if available
      const token = (getState() as any)?.auth?.tokens?.accessToken
      if (token) {
        headers.set('authorization', `Bearer ${token}`)
      }
      return headers
    },
  }),
  tagTypes: ['MOCInstruction'],
  endpoints: (builder) => ({
    getMOCInstructions: builder.query<ApiResponse<Array<MOCInstruction>>, void>({
      query: () => 'moc-instructions',
      providesTags: ['MOCInstruction'],
    }),
    // ... other endpoints
  }),
})
```

## Redux Slices

### Auth Slice (`packages/auth/src/store/authSlice.ts`)
```tsx
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export interface AuthState {
  isCheckingAuth: boolean;
  lastActivity: number | null;
  sessionTimeout: number;
  message: string | null;
}

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearMessage: (state) => {
      state.message = null;
    },
    setCheckingAuth: (state, action: PayloadAction<boolean>) => {
      state.isCheckingAuth = action.payload;
    },
    // ... other reducers
  },
  extraReducers: (builder) => {
    builder
      .addCase(updateLastActivity.fulfilled, (state, action) => {
        state.lastActivity = action.payload;
      })
      // ... other cases
  },
});
```

## Available API Endpoints

### Authentication Endpoints
- **Login**: `POST /api/auth/login`
- **Signup**: `POST /api/auth/signup`
- **Logout**: `POST /api/auth/logout`
- **Refresh**: `POST /api/auth/refresh`
- **Reset Password**: `POST /api/auth/reset-password`
- **Confirm Reset**: `POST /api/auth/confirm-reset`
- **Check Auth**: `GET /api/auth/check-auth`
- **Verify Email**: `POST /api/auth/verify-email`
- **Resend Verification**: `POST /api/auth/resend-verification`
- **Social Login**: `GET /api/auth/social/{provider}`

### MOC Instructions Endpoints
- **Get All**: `GET /api/moc-instructions`
- **Get by ID**: `GET /api/moc-instructions/{id}`
- **Create**: `POST /api/moc-instructions`
- **Update**: `PUT /api/moc-instructions/{id}`
- **Delete**: `DELETE /api/moc-instructions/{id}`
- **Search**: `GET /api/moc-instructions/search`

## Usage in Components

### Using RTK Query Hooks
```tsx
import { useLoginMutation, useCheckAuthQuery } from '@repo/auth';
import { useGetMOCInstructionsQuery } from '../services/api';

function MyComponent() {
  // Mutations (for POST/PUT/DELETE)
  const [login, { isLoading: isLoggingIn, error: loginError }] = useLoginMutation();
  
  // Queries (for GET)
  const { data: authData, isLoading: isCheckingAuth } = useCheckAuthQuery();
  const { data: mocData, isLoading: isLoadingMOC } = useGetMOCInstructionsQuery();

  const handleLogin = async (credentials) => {
    try {
      await login(credentials).unwrap();
      // Handle success
    } catch (error) {
      // Handle error
    }
  };

  return (
    // Component JSX
  );
}
```

### Using Redux State
```tsx
import { useSelector, useDispatch } from 'react-redux';
import { selectIsCheckingAuth, selectMessage, clearMessage } from '@repo/auth';

function MyComponent() {
  const dispatch = useDispatch();
  const isCheckingAuth = useSelector(selectIsCheckingAuth);
  const message = useSelector(selectMessage);

  const handleClearMessage = () => {
    dispatch(clearMessage());
  };

  return (
    // Component JSX
  );
}
```

## Type Safety with Zod

### Schema Definition
```tsx
import { z } from 'zod';

export const MOCInstructionSchema = z.object({
  id: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced', 'expert']),
  pieces: z.number().positive(),
  estimatedTime: z.number().positive(),
  // ... more fields
});

export type MOCInstruction = z.infer<typeof MOCInstructionSchema>;
```

### API Response Validation
```tsx
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// RTK Query automatically validates responses
getMOCInstructions: builder.query<ApiResponse<Array<MOCInstruction>>, void>({
  query: () => 'moc-instructions',
  providesTags: ['MOCInstruction'],
}),
```

## Cache Management

### Tag-Based Cache Invalidation
```tsx
// Define tag types
tagTypes: ['Auth', 'User', 'MOCInstruction'],

// Provide tags for queries
getMOCInstructions: builder.query({
  query: () => 'moc-instructions',
  providesTags: ['MOCInstruction'],
}),

// Invalidate tags for mutations
createMOCInstruction: builder.mutation({
  query: (body) => ({
    url: 'moc-instructions',
    method: 'POST',
    body,
  }),
  invalidatesTags: ['MOCInstruction'],
}),
```

### Optimistic Updates
```tsx
updateMOCInstruction: builder.mutation({
  query: ({ id, body }) => ({
    url: `moc-instructions/${id}`,
    method: 'PUT',
    body,
  }),
  // Optimistically update the cache
  async onQueryStarted({ id, body }, { dispatch, queryFulfilled }) {
    const patchResult = dispatch(
      api.util.updateQueryData('getMOCInstruction', id, (draft) => {
        Object.assign(draft, body);
      })
    );
    try {
      await queryFulfilled;
    } catch {
      patchResult.undo();
    }
  },
  invalidatesTags: (_result, _error, { id }) => [{ type: 'MOCInstruction', id }],
}),
```

## Error Handling

### RTK Query Error Handling
```tsx
const [login, { error, isError }] = useLoginMutation();

if (isError) {
  console.error('Login failed:', error);
  // Handle error in UI
}
```

### Custom Error Classes
```tsx
class AuthApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'AuthApiError';
  }
}
```

## Testing

### Testing RTK Query
```tsx
import { renderHook, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { api } from '../services/api';

const store = configureStore({
  reducer: {
    [api.reducerPath]: api.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(api.middleware),
});

test('fetches MOC instructions', async () => {
  const { result } = renderHook(() => useGetMOCInstructionsQuery(), {
    wrapper: ({ children }) => (
      <Provider store={store}>{children}</Provider>
    ),
  });

  await waitFor(() => {
    expect(result.current.isSuccess).toBe(true);
  });
});
```

### Testing Redux Slices
```tsx
import { configureStore } from '@reduxjs/toolkit';
import authReducer, { clearMessage, setMessage } from './authSlice';

const store = configureStore({
  reducer: { auth: authReducer },
});

test('should handle clearMessage', () => {
  store.dispatch(setMessage('Test message'));
  expect(store.getState().auth.message).toBe('Test message');
  
  store.dispatch(clearMessage());
  expect(store.getState().auth.message).toBe(null);
});
```

## Best Practices

### State Organization
- **Server State**: Use RTK Query for all API interactions
- **UI State**: Use Redux slices for application-wide UI state
- **Local State**: Use React hooks for component-specific state
- **Form State**: Use React Hook Form for form management

### Performance Optimization
- **Selective Re-renders**: Use `useSelector` with specific selectors
- **Memoization**: Use `useMemo` and `useCallback` for expensive operations
- **Cache Management**: Leverage RTK Query's automatic caching
- **Bundle Splitting**: Import only needed hooks and selectors

### Type Safety
- **Zod Schemas**: Define runtime validation for all API data
- **TypeScript**: Use strict typing throughout the application
- **Generated Types**: Leverage RTK Query's automatic type generation
- **Interface Consistency**: Maintain consistent interfaces across the app

### Error Handling
- **Graceful Degradation**: Handle errors without breaking the UI
- **User Feedback**: Provide clear error messages to users
- **Retry Logic**: Implement retry mechanisms for failed requests
- **Error Boundaries**: Use React error boundaries for unexpected errors

## Migration from Legacy Services

### Current State
- **Legacy Auth Service**: `apps/web/lego-moc-instructions-app/src/services/authApi.ts`
- **Modern Auth API**: `packages/auth/src/store/authApi.ts`
- **Migration Path**: Gradually replace legacy services with RTK Query

### Migration Strategy
1. **Identify Legacy Services**: Find all fetch/axios calls
2. **Create RTK Query Endpoints**: Convert to RTK Query
3. **Update Components**: Replace service calls with hooks
4. **Remove Legacy Code**: Clean up old service files
5. **Test Thoroughly**: Ensure all functionality works correctly

## Troubleshooting

### Common Issues
1. **Cache Invalidation**: Ensure proper tag invalidation
2. **Type Errors**: Check Zod schema definitions
3. **Middleware Issues**: Verify store configuration
4. **Network Errors**: Check base URL and headers configuration

### Debugging Tools
- **Redux DevTools**: Browser extension for debugging
- **RTK Query DevTools**: Built-in debugging for API calls
- **TypeScript**: Compile-time error checking
- **Zod Validation**: Runtime data validation 