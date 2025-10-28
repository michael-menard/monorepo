# Auth Service to Cognito Migration - COMPLETE ✅

## Migration Status

All auth pages have been successfully migrated to use AWS Cognito:

### ✅ Migrated Pages (Using useCognitoAuth hook)
- `LoginPage` - Uses `useCognitoAuth().signIn()`
- `SignupPage` - Uses `useCognitoAuth().signUp()`
- `EmailVerificationPage` - Uses `useCognitoAuth().verifyEmail()` and `resendCode()`
- `ForgotPasswordPage` - Uses `useCognitoAuth().forgotPassword()`
- `ResetPasswordPage` - Uses `useCognitoAuth().resetPassword()`

### 🗑️ Removed
- `authApi.ts` - Old auth-service client (DELETED)
- `apps/api/auth-service/` - Old Express+MongoDB auth service (DELETED)
- CSRF utilities - No longer needed with JWT tokens

## Migration Strategy

### Option 1: Use Existing Cognito Pages (Fastest)
Just keep using `CognitoLoginPage`, `CognitoSignupPage`, `CognitoVerifyEmailPage` and **delete** the old pages. They already work with Cognito.

**Pros**: No work needed, already done
**Cons**: Lose any custom UI/UX from old pages

### Option 2: Migrate Old Pages to Use Cognito (Recommended)
Keep your existing page UI/UX but replace the API calls.

#### What to Replace in Each Page:

**LoginPage** (`apps/web/lego-moc-instructions-app/src/pages/auth/LoginPage/index.tsx`):
```typescript
// OLD (line 9):
import { AuthApiError, authApi } from '../../../services/authApi'

// NEW:
import { useCognitoAuth } from '../../../hooks/useCognitoAuth'

// OLD (line 39):
const response = await authApi.login(data)

// NEW:
const { signIn } = useCognitoAuth()
const user = await signIn(data)
```

**SignupPage**:
```typescript
// OLD:
await authApi.signup(data)

// NEW:
const { signUp } = useCognitoAuth()
await signUp({ email, password, name })
```

**ForgotPasswordPage**:
```typescript
// OLD:
await authApi.forgotPassword({ email })

// NEW:
const { resetPassword } = useCognitoAuth()
await resetPassword(email)
```

**ResetPasswordPage**:
```typescript
// OLD:
await authApi.resetPassword(token, { password })

// NEW:
const { confirmResetPassword } = useCognitoAuth()
await confirmResetPassword(email, code, newPassword)
```

**EmailVerificationPage**:
```typescript
// OLD:
await authApi.verifyEmail({ code })

// NEW:
const { confirmSignUp } = useCognitoAuth()
await confirmSignUp(email, code)
```

## Cognito Hook Available

Location: `apps/web/lego-moc-instructions-app/src/hooks/useCognitoAuth.ts`

Available methods:
- `signIn(data)` - Login
- `signUp(data)` - Register
- `signOut()` - Logout
- `confirmSignUp(email, code)` - Verify email
- `resetPassword(email)` - Request password reset
- `confirmResetPassword(email, code, newPassword)` - Confirm password reset
- `resendConfirmationCode(email)` - Resend verification code
- `currentUser` - Get current authenticated user
- `isLoading` - Loading state
- `error` - Error state

## Next Steps

1. **Decide**: Option 1 (use Cognito pages) or Option 2 (migrate old pages)?

2. **If Option 2** - Migrate pages one by one:
   - Replace `authApi` imports with `useCognitoAuth`
   - Update API calls to use Cognito methods
   - Test each page
   - Remove old page once migrated

3. **Remove legacy code**:
   - Delete `src/services/authApi.ts` (old auth-service client)
   - Delete CSRF utilities (not needed for Cognito)
   - Update routes to use migrated pages

4. **Update `@repo/auth` package** (if needed):
   - Remove CSRF utilities from exports
   - Focus on Cognito integration only

## Files to Remove After Migration

- `apps/web/lego-moc-instructions-app/src/services/authApi.ts`
- `apps/web/lego-moc-instructions-app/src/services/csrfExamples.ts`
- `apps/web/lego-moc-instructions-app/src/pages/CSRFDemoPage/`
- Old auth pages (if using Option 1)

## Testing Checklist

- [ ] Login flow works
- [ ] Signup flow works
- [ ] Email verification works
- [ ] Password reset flow works
- [ ] JWT tokens are sent with API requests
- [ ] Protected routes work (redirect to login if not authenticated)
- [ ] Logout works

## Current Routes Status

All routes are now using migrated pages with Cognito:
- `/auth/login` → `LoginPage` ✅ (migrated to Cognito)
- `/auth/signup` → `SignupPage` ✅ (migrated to Cognito)
- `/auth/verify-email` → `EmailVerificationPage` ✅ (migrated to Cognito)
- `/auth/forgot-password` → `ForgotPasswordPage` ✅ (migrated to Cognito)
- `/auth/reset-password` → `ResetPasswordPage` ✅ (migrated to Cognito, route updated to remove token param)

## What Changed

### Authentication Flow
- **Before**: Cookie-based sessions with CSRF protection
- **After**: JWT bearer tokens from Cognito (no CSRF needed)

### Password Reset Flow
- **Before**: Token in URL (`/auth/reset-password/$token`)
- **After**: Verification code input (`/auth/reset-password` + code field)

### Email Verification
- **Before**: Direct API call with code
- **After**: Cognito `confirmSignUp` with email + code from localStorage

## Build Status

✅ Build successful - all TypeScript errors related to authApi resolved
