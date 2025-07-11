# HTTP-Only Cookie Security Implementation

## Overview

This document outlines the security improvements made to implement HTTP-only cookies for token storage, replacing localStorage to prevent XSS attacks.

## Changes Made

### Backend Changes

#### 1. Login Handler (`src/handlers/login.ts`)
- **Before**: Returned tokens in response body
- **After**: Sets HTTP-only cookies via `Set-Cookie` headers
- **Security**: Tokens are now inaccessible to JavaScript

```typescript
// Sets secure cookies instead of returning tokens
const accessTokenCookie = `accessToken=${tokens.accessToken}; HttpOnly; Secure=${NODE_ENV === 'production'}; SameSite=Strict; Path=/; Max-Age=${ACCESS_TOKEN_MAX_AGE}`;
const refreshTokenCookie = `refreshToken=${tokens.refreshToken}; HttpOnly; Secure=${NODE_ENV === 'production'}; SameSite=Strict; Path=/; Max-Age=${REFRESH_TOKEN_MAX_AGE}`;
```

#### 2. Logout Handler (`src/handlers/logout.ts`)
- **Before**: Client-side token removal
- **After**: Server clears cookies by setting expired dates
- **Security**: Ensures tokens are properly invalidated

```typescript
// Clears cookies by setting expired dates
const clearAccessTokenCookie = `accessToken=; HttpOnly; Secure=${NODE_ENV === 'production'}; SameSite=Strict; Path=/; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT`;
```

#### 3. Refresh Token Handler (`src/handlers/refreshToken.ts`)
- **Before**: Required refresh token in request body
- **After**: Reads refresh token from cookies
- **Security**: Refresh token is automatically sent with requests

```typescript
// Extracts refresh token from cookies
const cookies = event.headers?.['cookie'] || event.headers?.['Cookie'] || '';
const refreshTokenMatch = cookies.match(/refreshToken=([^;]+)/);
```

#### 4. Environment Configuration (`src/config/env.ts`)
- Added centralized cookie configuration
- Environment-specific settings for production/development

```typescript
// Cookie Configuration
NODE_ENV: process.env['NODE_ENV'] || 'development',
COOKIE_DOMAIN: process.env['COOKIE_DOMAIN'],
COOKIE_SECURE: process.env['NODE_ENV'] === 'production',
COOKIE_SAME_SITE: 'Strict',
ACCESS_TOKEN_MAX_AGE: 3600, // 1 hour
REFRESH_TOKEN_MAX_AGE: 604800, // 7 days
```

### Frontend Changes

#### 1. API Service (`src/services/api.ts`)
- **Before**: Used localStorage for tokens, manual Authorization headers
- **After**: Uses `withCredentials: true`, automatic cookie sending
- **Security**: Tokens are automatically included in requests

```typescript
// Enable sending cookies with requests
this.api = axios.create({
  withCredentials: true, // Enable sending cookies with requests
});

// Removed localStorage token management
// Removed manual Authorization headers
```

#### 2. Auth Hook (`src/hooks/useAuth.ts`)
- **Before**: Stored tokens in localStorage, manual token management
- **After**: Relies on HTTP-only cookies, server-managed authentication
- **Security**: No client-side token storage

```typescript
// Removed localStorage usage
// Tokens are now stored in HTTP-only cookies
// Authentication state managed by server
```

## Security Benefits

### 1. XSS Protection
- **Before**: Tokens accessible via `localStorage.getItem()`
- **After**: Tokens inaccessible to JavaScript
- **Impact**: Prevents token theft via XSS attacks

### 2. CSRF Protection
- **Before**: Manual token handling vulnerable to CSRF
- **After**: SameSite=Strict prevents CSRF attacks
- **Impact**: Automatic CSRF protection

### 3. Automatic Token Management
- **Before**: Manual token refresh, localStorage cleanup
- **After**: Automatic cookie-based token refresh
- **Impact**: Reduced attack surface, better UX

### 4. Secure by Default
- **Before**: Tokens persisted in localStorage
- **After**: Tokens automatically cleared on logout
- **Impact**: Better session management

## Cookie Configuration

### Production Settings
```typescript
HttpOnly: true          // Prevents JavaScript access
Secure: true            // HTTPS only in production
SameSite: Strict        // Prevents CSRF attacks
Path: /                 // Available across the site
Max-Age: 3600          // 1 hour for access tokens
Max-Age: 604800        // 7 days for refresh tokens
```

### Development Settings
```typescript
HttpOnly: true          // Prevents JavaScript access
Secure: false           // Allows HTTP in development
SameSite: Strict        // Prevents CSRF attacks
Path: /                 // Available across the site
```

## Environment Variables

Add these to your `.env` file:

```bash
# Cookie Configuration
NODE_ENV=production
COOKIE_DOMAIN=.yourdomain.com  # Optional, for subdomain support
```

## Testing

### Backend Testing
```bash
# Test login with cookies
curl -X POST https://your-api.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -c cookies.txt

# Test protected endpoint with cookies
curl -X GET https://your-api.com/auth/protected \
  -b cookies.txt
```

### Frontend Testing
```javascript
// All requests now automatically include cookies
const response = await apiService.login({ email, password });
// No need to manually handle tokens
```

## Migration Notes

### Breaking Changes
1. **Frontend**: Remove all `localStorage` token management
2. **Backend**: Update CORS to allow credentials
3. **Testing**: Update tests to use `withCredentials: true`

### Backward Compatibility
- Consider implementing a migration period
- Support both cookie and header-based auth during transition
- Gradually deprecate localStorage usage

## Best Practices

1. **Always use HTTPS in production**
2. **Set appropriate cookie domains**
3. **Monitor cookie security headers**
4. **Implement proper CORS configuration**
5. **Regular security audits**

## Security Headers

Ensure your server includes these security headers:

```typescript
// Security headers for cookie protection
'X-Content-Type-Options': 'nosniff',
'X-Frame-Options': 'DENY',
'X-XSS-Protection': '1; mode=block',
'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
```

## Monitoring

Monitor these security events:
- Failed authentication attempts
- Cookie-related errors
- CSRF attack attempts
- Token refresh failures 