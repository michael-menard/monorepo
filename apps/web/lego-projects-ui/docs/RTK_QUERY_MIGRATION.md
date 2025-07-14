# RTK Query Migration Guide

## Overview

This document outlines the migration from axios-based HTTP calls to RTK Query for better state management, caching, and developer experience.

## Benefits of RTK Query

### 1. **Automatic Caching**
- Automatic cache invalidation
- Optimistic updates
- Background refetching
- Cache time management

### 2. **Reduced Boilerplate**
- No manual loading/error states
- Automatic request deduplication
- Built-in TypeScript support
- Simplified error handling

### 3. **Better Developer Experience**
- DevTools integration
- Automatic request cancellation
- Optimistic updates
- Real-time synchronization

## Migration Summary

### Before (Axios)
```typescript
// Old authService.ts
export class AuthServiceClient {
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    try {
      const response = await axios.post('/auth/login', credentials);
      return response.data;
    } catch (error) {
      throw new Error('Login failed');
    }
  }
}

// Component usage
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

const handleLogin = async () => {
  setLoading(true);
  setError(null);
  try {
    const response = await authService.login(credentials);
    // Handle success
  } catch (error) {
    setError(error.message);
  } finally {
    setLoading(false);
  }
};
```

### After (RTK Query)
```typescript
// New authApi.ts
export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_AUTH_API_URL,
    credentials: 'include',
  }),
  endpoints: (builder) => ({
    login: builder.mutation<AuthResponse, LoginCredentials>({
      query: (credentials) => ({
        url: '/auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),
  }),
});

// Component usage
const [login, { isLoading, isError, error }] = useLoginMutation();

const handleLogin = async () => {
  try {
    const result = await login(credentials).unwrap();
    // Handle success
  } catch (error) {
    // Error is automatically handled
  }
};
```

## API Structure

### Base Configuration
```typescript
export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_AUTH_API_URL || 'http://localhost:3001',
    credentials: 'include', // for HTTP-only cookies
  }),
  tagTypes: ['Auth', 'User'],
  endpoints: (builder) => ({
    // Endpoints defined here
  }),
});
```

### Available Endpoints

#### Authentication
- `login` - User login
- `signup` - User registration
- `logout` - User logout
- `refreshToken` - Token refresh
- `verifyEmail` - Email verification
- `forgotPassword` - Password reset request
- `resetPassword` - Password reset
- `socialLogin` - Social authentication

#### Generated Hooks
```typescript
export const {
  useLoginMutation,
  useSignupMutation,
  useRefreshTokenMutation,
  useLogoutMutation,
  useVerifyEmailMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useSocialLoginMutation,
} = authApi;
```

## Usage Patterns

### 1. **Mutations (POST/PUT/DELETE)**
```typescript
const [login, { isLoading, isError, error, isSuccess }] = useLoginMutation();

const handleLogin = async () => {
  try {
    const result = await login(credentials).unwrap();
    // Handle success
  } catch (error) {
    // Handle error
  }
};
```

### 2. **Queries (GET)**
```typescript
const { data, isLoading, isError, error } = useGetUserQuery(userId);
```

### 3. **Error Handling**
```typescript
const [login, { isError, error }] = useLoginMutation();

if (isError) {
  const errorMessage = error?.data?.message || 'Login failed';
  // Display error message
}
```

### 4. **Loading States**
```typescript
const [login, { isLoading }] = useLoginMutation();

return (
  <button disabled={isLoading}>
    {isLoading ? 'Signing in...' : 'Sign In'}
  </button>
);
```

## Store Integration

### Redux Store Setup
```typescript
import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from '@repo/auth';
import { authApi } from '@/services/authApi';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [authApi.reducerPath]: authApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(authApi.middleware),
});
```

### TypeScript Types
```typescript
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  status: string;
  Status: number;
  message: string;
  data?: {
    user?: User;
    token?: string;
    refreshToken?: string;
  };
}
```

## Best Practices

### 1. **Error Handling**
- Always use `.unwrap()` for mutations to get proper error handling
- Check `isError` and `error` states
- Provide user-friendly error messages

### 2. **Loading States**
- Use `isLoading` for better UX
- Disable forms during submission
- Show loading spinners

### 3. **Cache Management**
- Use `tagTypes` for automatic cache invalidation
- Implement optimistic updates where appropriate
- Consider cache time for different endpoints

### 4. **Security**
- Use HTTP-only cookies for tokens
- Implement proper CORS configuration
- Validate all inputs

## Migration Checklist

### ✅ Completed
- [x] Remove axios dependencies
- [x] Create RTK Query API slice
- [x] Update all auth components
- [x] Implement proper error handling
- [x] Add loading states
- [x] Update Redux store
- [x] Add security configurations
- [x] Implement accessibility features

### 🔄 In Progress
- [ ] Update tests to use RTK Query
- [ ] Remove unused dependencies
- [ ] Update documentation
- [ ] Performance optimization

### 📋 Pending
- [ ] Add more comprehensive tests
- [ ] Implement advanced caching strategies
- [ ] Add real-time features
- [ ] Performance monitoring

## Troubleshooting

### Common Issues

#### 1. **TypeScript Errors**
```typescript
// Error: Property 'unwrap' does not exist
const result = await login(credentials).unwrap();
```
**Solution**: Ensure you're using the latest RTK Query version and proper TypeScript configuration.

#### 2. **CORS Issues**
```typescript
// Error: CORS policy blocked
```
**Solution**: Configure proper CORS settings in your API and ensure credentials are included.

#### 3. **Cache Issues**
```typescript
// Data not updating after mutation
```
**Solution**: Use `tagTypes` and `invalidatesTags` for proper cache invalidation.

### Debugging

#### 1. **Redux DevTools**
- Install Redux DevTools extension
- Monitor API calls and cache state
- Debug mutations and queries

#### 2. **Console Logging**
```typescript
const [login, { isLoading, isError, error }] = useLoginMutation();

console.log('Loading:', isLoading);
console.log('Error:', error);
```

#### 3. **Network Tab**
- Monitor actual HTTP requests
- Check request/response headers
- Verify CORS configuration

## Performance Considerations

### 1. **Caching Strategy**
- Short cache time for frequently changing data
- Longer cache time for static data
- Use `keepUnusedDataFor` for background cache

### 2. **Request Deduplication**
- RTK Query automatically deduplicates identical requests
- No manual request cancellation needed
- Optimized for concurrent requests

### 3. **Bundle Size**
- RTK Query is tree-shakeable
- Only include used endpoints
- Consider code splitting for large APIs

## Future Enhancements

### 1. **Real-time Features**
- WebSocket integration
- Real-time cache updates
- Optimistic updates

### 2. **Advanced Caching**
- Custom cache keys
- Conditional cache invalidation
- Background sync

### 3. **Performance Monitoring**
- Request timing metrics
- Cache hit rates
- Error rate tracking

## Conclusion

The migration to RTK Query provides significant benefits in terms of developer experience, performance, and maintainability. The automatic caching, reduced boilerplate, and better error handling make it an excellent choice for modern React applications.

For more information, refer to the [RTK Query documentation](https://redux-toolkit.js.org/rtk-query/overview). 