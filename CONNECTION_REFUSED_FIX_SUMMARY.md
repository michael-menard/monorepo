# Connection Refused Fix Summary

## Issue Identified
The frontend was getting "connection refused" when posting to `/with-files` because of port mismatches and hardcoded URLs bypassing the Vite proxy.

## Root Cause
1. **RTK Query** was configured to use `http://localhost:3000/api/mocs` (wrong port)
2. **LEGO Projects API** is actually running on port **9000**
3. **Vite proxy** is correctly configured to proxy `/api` requests to port 9000
4. **Hardcoded absolute URLs** were bypassing the proxy system

## Port Configuration
Based on the codebase analysis:

| Service | Port | Status |
|---------|------|--------|
| **Web App** | 3002 | ✅ Correct |
| **Auth API** | 9300 | ✅ Correct |
| **LEGO Projects API** | 9000 | ✅ Correct |
| **Docs** | 3000 | ✅ Correct |

## Vite Proxy Configuration
The Vite proxy is correctly configured in `vite.config.ts`:

```typescript
proxy: {
  // Auth service routes - proxy to auth-service on port 9300
  '/api/auth': {
    target: `http://localhost:${process.env.AUTH_API_PORT || '9300'}`,
    changeOrigin: true,
    secure: false,
    ws: true,
    rewrite: (path) => path // Keep the /api/auth prefix
  },
  // All other API routes - proxy to lego-projects-api on port 9000
  '/api': {
    target: `http://localhost:${process.env.LEGO_API_PORT || '9000'}`,
    changeOrigin: true,
    secure: false,
    ws: true
  }
}
```

## Fixes Applied

### 1. RTK Query Base URL (`packages/features/moc-instructions/src/store/instructionsApi.ts`)
**Before:**
```typescript
const baseUrl = process.env.NODE_ENV === 'development'
  ? 'http://localhost:3000/api/mocs'  // ❌ Wrong port, bypasses proxy
  : '/api/mocs';
```

**After:**
```typescript
const baseUrl = process.env.NODE_ENV === 'development'
  ? '/api/mocs'  // ✅ Relative URL uses Vite proxy
  : '/api/mocs';
```

### 2. Test Auth Utility (`apps/web/lego-moc-instructions-app/src/utils/testAuth.ts`)
**Before:**
```typescript
// Multiple hardcoded URLs bypassing proxy
const response = await fetch('http://localhost:9000/api/mocs/test-auth', {
const testResponse = await fetch('http://localhost:9000/api/mocs/search?q=&from=0&size=1', {
const response = await fetch('http://localhost:9000/api/mocs/with-files', {
```

**After:**
```typescript
// All URLs now use relative paths with proxy
const response = await fetch('/api/mocs/test-auth', {
const testResponse = await fetch('/api/mocs/search?q=&from=0&size=1', {
const response = await fetch('/api/mocs/with-files', {
```

## How the Proxy Works

### Request Flow (Fixed)
1. **Frontend** makes request to `/api/mocs/with-files`
2. **Vite Dev Server** (port 3002) receives the request
3. **Vite Proxy** forwards to `http://localhost:9000/api/mocs/with-files`
4. **LEGO Projects API** (port 9000) processes the request
5. **Response** flows back through the proxy to the frontend

### Previous Broken Flow
1. **Frontend** made request to `http://localhost:3000/api/mocs/with-files`
2. **No service** running on port 3000 for API endpoints
3. **Connection refused** error

## Verification Steps

### 1. Check Services Are Running
```bash
# Check what's running on each port
lsof -ti:3002  # Web app
lsof -ti:9000  # LEGO Projects API
lsof -ti:9300  # Auth API
```

### 2. Test API Directly
```bash
# Test LEGO Projects API directly
curl http://localhost:9000/api/mocs/test-auth -X POST

# Test through proxy (from web app)
curl http://localhost:3002/api/mocs/test-auth -X POST
```

### 3. Browser Network Tab
- Open browser dev tools → Network tab
- Try to create a MOC instruction
- Verify requests go to relative URLs (not absolute localhost URLs)
- Check that requests return 200/201 instead of connection refused

## Expected Behavior Now

✅ **Frontend requests** use relative URLs: `/api/mocs/with-files`
✅ **Vite proxy** forwards to correct port: `http://localhost:9000`
✅ **LEGO Projects API** receives and processes requests
✅ **File uploads** work with multipart/form-data
✅ **CSRF tokens** work correctly
✅ **Authentication** flows properly

## Testing the Fix

1. **Restart the dev environment** (you've already done this)
2. **Open the web app** at http://localhost:3002
3. **Try creating a MOC instruction** with files
4. **Check browser network tab** - should see requests to `/api/mocs/with-files` (relative)
5. **Verify no connection refused errors**

## Additional Notes

- The **Auth API** (port 9300) uses absolute URLs in CSRF functions, which is correct since it's a separate service
- The **Vite proxy** handles both auth (`/api/auth/*`) and main API (`/api/*`) routes correctly
- **Production builds** will use relative URLs for both environments

The connection refused error should now be resolved! 🎉
