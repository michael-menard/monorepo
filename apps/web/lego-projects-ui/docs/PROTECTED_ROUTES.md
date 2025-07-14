# Protected Routes & Authentication Flow

## Overview

The protected routes system ensures that only authenticated and verified users can access certain pages. It includes proper redirects, loading states, and seamless user experience.

## Features Implemented

### ✅ Completed Features

1. **Enhanced ProtectedRoute Component**
   - Checks authentication status
   - Checks email verification status (optional)
   - Shows loading state while checking auth
   - Proper redirects based on user state
   - Preserves intended destination for post-login redirect

2. **Smart Redirect Logic**
   - Unauthenticated users → `/auth/login`
   - Authenticated but unverified users → `/auth/email-verification`
   - Authenticated and verified users → Access granted
   - Loading state while checking auth status

3. **Login Flow Integration**
   - Redirects back to original intended page after login
   - Preserves user's intended destination
   - Seamless user experience

4. **Email Verification Integration**
   - Redirects back to original intended page after verification
   - Maintains user flow continuity

## Technical Implementation

### ProtectedRoute Component

```typescript
interface ProtectedRouteProps {
  children: React.ReactNode;
  requireVerification?: boolean; // Optional: require email verification
}
```

**Features:**
- `requireVerification` prop (defaults to `true`)
- Checks `isAuthenticated` and `isCheckingAuth` from Redux state
- Checks `user.isVerified` or `user.emailVerified` for verification
- Shows loading spinner while checking auth status
- Preserves original location for redirects

### Authentication Flow

1. **User tries to access protected page**
2. **ProtectedRoute checks auth status**
   - If `isCheckingAuth` → Show loading
   - If not authenticated → Redirect to login with original location
   - If authenticated but not verified → Redirect to email verification
   - If authenticated and verified → Show protected content

3. **After login/verification**
   - Redirect back to original intended page
   - Seamless user experience

### User State Management

**Redux State Structure:**
```typescript
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isCheckingAuth: boolean;
  isLoading: boolean;
  error: string | null;
}

interface User {
  id: string;
  email: string;
  name: string;
  isVerified?: boolean;
  emailVerified?: boolean;
  // ... other fields
}
```

## Usage Examples

### Basic Protected Route
```tsx
<ProtectedRoute>
  <Dashboard />
</ProtectedRoute>
```

### Route Without Verification Requirement
```tsx
<ProtectedRoute requireVerification={false}>
  <PublicDashboard />
</ProtectedRoute>
```

### Route Configuration
```tsx
// In routes/index.tsx
{
  path: '/dashboard',
  element: (
    <ProtectedRoute>
      <AuthenticatedLayout>
        <Dashboard />
      </AuthenticatedLayout>
    </ProtectedRoute>
  ),
}
```

## User Experience Flow

### Scenario 1: Unauthenticated User
1. User tries to access `/dashboard`
2. Redirected to `/auth/login` with original location saved
3. User logs in successfully
4. Redirected back to `/dashboard`

### Scenario 2: Unverified User
1. User logs in but email not verified
2. Redirected to `/auth/email-verification`
3. User verifies email
4. Redirected to original intended page

### Scenario 3: Fully Authenticated User
1. User is authenticated and verified
2. Direct access to protected pages
3. No redirects needed

## Loading States

### Auth Checking
- Shows spinner while checking authentication status
- Prevents flash of content or redirects
- Smooth user experience

### Login/Verification
- Shows loading states during API calls
- Disables forms during submission
- Clear feedback for all states

## Error Handling

### Network Errors
- Graceful fallback to login page
- Clear error messages
- Retry mechanisms

### Auth Errors
- Proper error display
- No sensitive information exposed
- User-friendly messages

## Security Considerations

1. **Route Protection**: All sensitive routes are properly protected
2. **State Validation**: Multiple checks for authentication status
3. **Redirect Security**: Safe redirect handling with location state
4. **Session Management**: Proper token and session handling

## Performance

- **Lazy Loading**: Components load efficiently
- **State Caching**: Redux state prevents unnecessary API calls
- **Optimized Renders**: Minimal re-renders during auth checks

## Configuration

### Environment Variables
```env
VITE_AUTH_API_URL=http://localhost:3001
```

### Customization Options
- `requireVerification` prop for different verification requirements
- Loading spinner customization
- Redirect timeout configuration

## Testing

### Manual Testing Checklist
- [ ] Unauthenticated user redirected to login
- [ ] Unverified user redirected to email verification
- [ ] Authenticated user can access protected pages
- [ ] Login redirects back to original page
- [ ] Email verification redirects back to original page
- [ ] Loading states work correctly
- [ ] Error states handled properly

### Automated Testing
Tests can be run with:
```bash
pnpm test
```

## Future Enhancements

### Role-Based Access
```typescript
interface ProtectedRouteProps {
  children: React.ReactNode;
  requireVerification?: boolean;
  requiredRole?: 'user' | 'admin' | 'moderator';
}
```

### Advanced Features
- [ ] Route-level permissions
- [ ] Dynamic role checking
- [ ] Audit logging
- [ ] Session timeout handling
- [ ] Multi-factor authentication support

## Troubleshooting

### Common Issues

1. **Infinite redirect loops**
   - Check auth state management
   - Verify redirect logic
   - Ensure proper state updates

2. **Loading states not clearing**
   - Check `isCheckingAuth` state
   - Verify API response handling
   - Check Redux state updates

3. **Redirects not working**
   - Check route configuration
   - Verify location state handling
   - Ensure proper navigation

### Debug Steps
1. Check Redux DevTools for auth state
2. Verify API responses
3. Check browser console for errors
4. Test with different user states

## Dependencies

- `@reduxjs/toolkit` - State management
- `react-router-dom` - Navigation and routing
- `@repo/auth` - Shared auth components and types

## Related Files

- `/src/components/ProtectedRoute.tsx` - Main protection component
- `/src/pages/Auth/Login/index.tsx` - Login with redirect handling
- `/src/pages/Auth/EmailVerification.tsx` - Verification with redirect handling
- `/src/store/hooks.ts` - Auth state hooks
- `/src/routes/index.tsx` - Route configuration
- `/src/store/index.ts` - Redux store setup 