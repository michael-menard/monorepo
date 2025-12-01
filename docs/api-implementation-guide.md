# API Implementation Guide

**Version:** 1.0.0  
**Last Updated:** 2025-12-01  
**Related Documents:** 
- [API Specification](./api-spec.yaml)
- [Authorization System PRD](./prd/epic-authorization-system.md)

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication Flow](#authentication-flow)
3. [Authorization Patterns](#authorization-patterns)
4. [Error Handling](#error-handling)
5. [Rate Limiting](#rate-limiting)
6. [File Upload Strategy](#file-upload-strategy)
7. [Testing the API](#testing-the-api)
8. [Client SDK Generation](#client-sdk-generation)
9. [API Versioning](#api-versioning)

---

## Overview

The LEGO Inventory API is a RESTful API that uses:
- **Authentication:** AWS Cognito JWT tokens (Bearer authentication)
- **Authorization:** OAuth 2.0 scopes + Cognito groups
- **Format:** JSON request/response bodies
- **Versioning:** URL-based (`/v1/`)
- **Documentation:** OpenAPI 3.0 specification

### Base URLs

| Environment | URL |
|-------------|-----|
| Production | `https://api.lego-inventory.com/v1` |
| Staging | `https://api-staging.lego-inventory.com/v1` |
| Local Dev | `http://localhost:3000/v1` |

---

## Authentication Flow

### 1. User Login

**Request:**
```bash
POST /v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response:**
```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user@example.com",
    "tier": "pro-tier"
  },
  "refresh_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expires_in": 3600
}
```

**Response Headers:**
```
Set-Cookie: access_token=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600
```

**🔒 Security Model:**
- **Access token** is stored in an **HttpOnly cookie** (not accessible to JavaScript)
- **Refresh token** is returned in response body (store in memory or secure storage)
- Cookie attributes:
  - `HttpOnly` - Prevents XSS attacks (JavaScript cannot access)
  - `Secure` - Only sent over HTTPS
  - `SameSite=Strict` - Prevents CSRF attacks
  - `Path=/` - Available for all routes
  - `Max-Age=3600` - Expires in 1 hour

**Access Token Contents (decoded):**
```json
{
  "sub": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "cognito:groups": ["pro-tier"],
  "scope": "moc:manage wishlist:manage gallery:manage chat:participate user:discover review:manage profile:manage",
  "exp": 1733140800,
  "iat": 1733137200
}
```

### 2. Using the Access Token

**The access token is automatically sent with every request via the HttpOnly cookie.**

No need to manually set the Authorization header:

```bash
GET /v1/mocs
# Cookie is automatically included by the browser
```

**For API testing tools (Postman, cURL):**
```bash
# Option 1: Use cookie
curl -X GET http://localhost:3000/v1/mocs \
  --cookie "access_token=eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."

# Option 2: Use Authorization header (for testing only)
curl -X GET http://localhost:3000/v1/mocs \
  -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
```

### 3. Token Refresh

When the access token expires (1 hour), use the refresh token to get a new one:

```bash
POST /v1/auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Response:**
```json
{
  "expires_in": 3600
}
```

**Response Headers:**
```
Set-Cookie: access_token=<NEW_JWT>; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600
```

**Client Implementation Pattern:**
```javascript
// Store refresh token in memory (or secure storage)
let refreshToken = null;

async function login(email, password) {
  const response = await fetch('/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include' // Important: Include cookies
  });

  if (response.ok) {
    const data = await response.json();
    // Store refresh token in memory
    refreshToken = data.refresh_token;
    // Access token is automatically stored in HttpOnly cookie
    return data.user;
  }

  throw new Error('Login failed');
}

async function apiRequest(url, options = {}) {
  let response = await fetch(url, {
    ...options,
    credentials: 'include', // Important: Include cookies
    headers: {
      ...options.headers,
      'Content-Type': 'application/json'
    }
  });

  // If 401, try refreshing token
  if (response.status === 401 && refreshToken) {
    const refreshResponse = await fetch('/v1/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
      credentials: 'include'
    });

    if (refreshResponse.ok) {
      // New access token is now in cookie, retry original request
      response = await fetch(url, {
        ...options,
        credentials: 'include',
        headers: {
          ...options.headers,
          'Content-Type': 'application/json'
        }
      });
    } else {
      // Refresh failed, redirect to login
      window.location.href = '/login';
    }
  }

  return response;
}

async function logout() {
  await fetch('/v1/auth/logout', {
    method: 'POST',
    credentials: 'include'
  });

  // Clear refresh token from memory
  refreshToken = null;

  // Redirect to login
  window.location.href = '/login';
}
```

### 4. Backend Implementation (Express.js)

**Login Endpoint:**
```javascript
app.post('/v1/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // Authenticate with Cognito
    const authResult = await cognito.initiateAuth({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: process.env.COGNITO_CLIENT_ID,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password
      }
    }).promise();

    const accessToken = authResult.AuthenticationResult.AccessToken;
    const refreshToken = authResult.AuthenticationResult.RefreshToken;
    const expiresIn = authResult.AuthenticationResult.ExpiresIn;

    // Decode access token to get user info
    const decoded = jwt.decode(accessToken);

    // Set HttpOnly cookie
    res.cookie('access_token', accessToken, {
      httpOnly: true,      // Prevents JavaScript access
      secure: true,        // HTTPS only (set to false for local dev)
      sameSite: 'strict',  // CSRF protection
      maxAge: expiresIn * 1000, // Convert seconds to milliseconds
      path: '/'
    });

    // Return user info and refresh token
    res.json({
      user: {
        id: decoded.sub,
        email: decoded.email,
        tier: decoded['cognito:groups'][0]
      },
      refresh_token: refreshToken,
      expires_in: expiresIn
    });
  } catch (error) {
    res.status(401).json({
      error: 'unauthorized',
      message: 'Invalid email or password'
    });
  }
});
```

**Refresh Endpoint:**
```javascript
app.post('/v1/auth/refresh', async (req, res) => {
  const { refresh_token } = req.body;

  try {
    const authResult = await cognito.initiateAuth({
      AuthFlow: 'REFRESH_TOKEN_AUTH',
      ClientId: process.env.COGNITO_CLIENT_ID,
      AuthParameters: {
        REFRESH_TOKEN: refresh_token
      }
    }).promise();

    const accessToken = authResult.AuthenticationResult.AccessToken;
    const expiresIn = authResult.AuthenticationResult.ExpiresIn;

    // Set new HttpOnly cookie
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: expiresIn * 1000,
      path: '/'
    });

    res.json({ expires_in: expiresIn });
  } catch (error) {
    res.status(401).json({
      error: 'unauthorized',
      message: 'Invalid or expired refresh token'
    });
  }
});
```

**Logout Endpoint:**
```javascript
app.post('/v1/auth/logout', (req, res) => {
  // Clear the cookie
  res.clearCookie('access_token', {
    httpOnly: true,
    secure: true,
    sameSite: 'strict',
    path: '/'
  });

  res.json({ message: 'Logout successful' });
});
```

**Authentication Middleware:**
```javascript
async function authenticateToken(req, res, next) {
  // Try to get token from cookie first
  let token = req.cookies.access_token;

  // Fallback to Authorization header (for API testing)
  if (!token) {
    const authHeader = req.headers['authorization'];
    token = authHeader && authHeader.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      error: 'unauthorized',
      message: 'No access token provided'
    });
  }

  try {
    // Verify JWT with Cognito public keys
    const decoded = await verifyJWT(token);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      error: 'unauthorized',
      message: 'Invalid or expired access token'
    });
  }
}
```

**CORS Configuration:**
```javascript
const cors = require('cors');

app.use(cors({
  origin: process.env.FRONTEND_URL, // e.g., 'https://app.lego-inventory.com'
  credentials: true, // Important: Allow cookies to be sent
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

**Cookie Parser:**
```javascript
const cookieParser = require('cookie-parser');
app.use(cookieParser());
```

---

## Authorization Patterns

### Scope-Based Authorization

Each endpoint requires specific scopes. The API middleware checks:

1. **JWT is valid** (signature, expiration)
2. **Required scope is present** in the token
3. **Quota is not exceeded** (for creation endpoints)

**Example: Creating a MOC**

```javascript
// Client checks scope before showing UI
function canUploadMOC(token) {
  const decoded = jwt_decode(token);
  return decoded.scope.includes('moc:manage');
}

// API checks scope and quota
app.post('/v1/mocs', 
  authenticateToken,           // Verify JWT
  requireScope('moc:manage'),  // Check scope
  checkQuota('mocs'),          // Check quota
  async (req, res) => {
    // Create MOC
  }
);
```

### Tier-Based Features

Some endpoints are only available to certain tiers:

| Endpoint | Required Tier | Scope |
|----------|---------------|-------|
| `/mocs` | All tiers | `moc:manage` |
| `/wishlists` | All tiers | `wishlist:manage` |
| `/galleries` | Pro, Power, Admin | `gallery:manage` |
| `/setlists` | Power, Admin | `setlist:manage` |
| `/chat/*` | Pro, Power, Admin (18+) | `chat:participate` |
| `/users/discover` | Pro, Power, Admin | `user:discover` |
| `/admin/*` | Admin only | `admin:*` |

**Frontend Pattern:**
```javascript
function renderNavigation(user) {
  const nav = [
    { label: 'MOCs', path: '/mocs', scope: 'moc:manage' },
    { label: 'Wishlists', path: '/wishlists', scope: 'wishlist:manage' },
  ];
  
  // Conditionally add tier-specific features
  if (hasScope(user, 'gallery:manage')) {
    nav.push({ label: 'Galleries', path: '/galleries', scope: 'gallery:manage' });
  }
  
  if (hasScope(user, 'chat:participate')) {
    nav.push({ label: 'Chat', path: '/chat', scope: 'chat:participate' });
  }
  
  if (hasScope(user, 'admin:users:manage')) {
    nav.push({ label: 'Admin', path: '/admin', scope: 'admin:users:manage' });
  }
  
  return nav;
}
```

---

## Error Handling

### Standard Error Response

All errors follow this format:

```json
{
  "error": "error_code",
  "message": "Human-readable error message",
  "details": {
    // Additional context
  },
  "actions": [
    {
      "label": "Upgrade to Pro",
      "url": "/pricing",
      "description": "Get 100 MOC uploads and 1GB storage"
    }
  ]
}
```

### Common Error Codes

| HTTP Status | Error Code | Description | User Action |
|-------------|------------|-------------|-------------|
| 401 | `unauthorized` | Invalid or missing token | Re-login |
| 403 | `forbidden` | Missing required scope | Upgrade tier |
| 404 | `not_found` | Resource doesn't exist | Check ID |
| 409 | `conflict` | Resource already exists | Use different name |
| 413 | `storage_exceeded` | Storage quota full | Delete files or upgrade |
| 429 | `quota_exceeded` | Item quota reached | Delete items or upgrade |
| 429 | `rate_limit_exceeded` | Too many requests | Wait and retry |
| 500 | `internal_error` | Server error | Contact support |

### Quota Exceeded Error

```json
{
  "error": "quota_exceeded",
  "message": "You have reached your MOC upload limit",
  "details": {
    "quota_type": "mocs",
    "current": 5,
    "limit": 5,
    "tier": "free-tier"
  },
  "actions": [
    {
      "label": "Upgrade to Pro",
      "url": "/pricing",
      "description": "Get 100 MOC uploads (20x more)"
    },
    {
      "label": "Delete a MOC",
      "url": "/mocs",
      "description": "Free up space by removing an existing MOC"
    }
  ]
}
```

**Client Handling:**
```javascript
async function createMOC(data) {
  try {
    const response = await apiRequest('/v1/mocs', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const error = await response.json();
      
      if (error.error === 'quota_exceeded') {
        // Show upgrade prompt with suggested actions
        showUpgradeModal(error.actions);
      } else {
        showError(error.message);
      }
      return null;
    }
    
    return await response.json();
  } catch (err) {
    showError('Network error. Please try again.');
    return null;
  }
}
```

### Storage Exceeded Error

```json
{
  "error": "storage_exceeded",
  "message": "Uploading this file would exceed your storage limit",
  "details": {
    "current_mb": 48.5,
    "limit_mb": 50,
    "file_size_mb": 2.3
  },
  "actions": [
    {
      "label": "Upgrade to Pro",
      "url": "/pricing",
      "description": "Get 1GB storage (20x more)"
    },
    {
      "label": "Delete files",
      "url": "/mocs",
      "description": "Free up storage by removing files"
    }
  ]
}
```

---

## Rate Limiting

### Rate Limits by Tier

| Tier | Requests/Minute | Burst Limit |
|------|-----------------|-------------|
| Free | 100 | 120 |
| Pro | 1,000 | 1,200 |
| Power | 5,000 | 6,000 |
| Admin | Unlimited | Unlimited |

### Rate Limit Headers

Every response includes rate limit information:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 847
X-RateLimit-Reset: 1733137260
```

### Rate Limit Exceeded Response

```json
{
  "error": "rate_limit_exceeded",
  "message": "You have exceeded your rate limit. Please try again in 23 seconds.",
  "details": {
    "limit": 1000,
    "reset_at": "2025-12-01T10:31:00Z"
  }
}
```

**Client Implementation:**
```javascript
async function apiRequestWithRetry(url, options = {}, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const response = await apiRequest(url, options);

    if (response.status === 429) {
      const resetTime = response.headers.get('X-RateLimit-Reset');
      const waitSeconds = resetTime - Math.floor(Date.now() / 1000);

      if (i < maxRetries - 1) {
        await sleep(waitSeconds * 1000);
        continue;
      }
    }

    return response;
  }
}
```

---

## File Upload Strategy

### Two-Step Upload Process

File uploads use a two-step process to check quotas before uploading:

**Step 1: Create MOC (metadata only)**
```bash
POST /v1/mocs
Content-Type: application/json

{
  "name": "Medieval Castle",
  "description": "A detailed castle build",
  "theme": "Castle",
  "piece_count": 2847
}
```

**Response:**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Medieval Castle",
  "files": [],
  "created_at": "2025-12-01T10:30:00Z"
}
```

**Step 2: Upload files**
```bash
POST /v1/mocs/123e4567-e89b-12d3-a456-426614174000/files
Content-Type: multipart/form-data

file: [binary data]
file_type: pdf
```

**Response:**
```json
{
  "id": "file-uuid-123",
  "filename": "instructions.pdf",
  "file_type": "pdf",
  "file_size_mb": 12.5,
  "url": "https://s3.amazonaws.com/bucket/files/abc123.pdf"
}
```

### Why Two Steps?

1. **Quota checking:** Check MOC count quota before user selects files
2. **Storage validation:** Check storage quota before uploading large files
3. **Better UX:** User knows immediately if they're at quota limit
4. **Partial success:** MOC exists even if file upload fails

### Client Implementation

```javascript
async function uploadMOC(metadata, files) {
  // Step 1: Create MOC
  const moc = await createMOC(metadata);
  if (!moc) return null;

  // Step 2: Upload files
  const uploadedFiles = [];
  for (const file of files) {
    try {
      const uploadedFile = await uploadFile(moc.id, file);
      uploadedFiles.push(uploadedFile);
    } catch (error) {
      if (error.error === 'storage_exceeded') {
        // Show storage upgrade prompt
        showStorageUpgradeModal();
        break;
      }
    }
  }

  return { ...moc, files: uploadedFiles };
}
```

### File Size Limits

| File Type | Max Size | Allowed Extensions |
|-----------|----------|-------------------|
| PDF | 100 MB | `.pdf` |
| Image | 25 MB | `.jpg`, `.jpeg`, `.png`, `.webp` |

### Storage Quota Enforcement

```javascript
// Backend middleware
async function checkStorageQuota(req, res, next) {
  const userId = req.user.sub;
  const fileSize = req.file.size / (1024 * 1024); // Convert to MB

  const quotas = await getUserQuotas(userId);

  if (quotas.storage.used_mb + fileSize > quotas.storage.limit_mb) {
    return res.status(413).json({
      error: 'storage_exceeded',
      message: 'Uploading this file would exceed your storage limit',
      details: {
        current_mb: quotas.storage.used_mb,
        limit_mb: quotas.storage.limit_mb,
        file_size_mb: fileSize
      },
      actions: [
        {
          label: 'Upgrade to Pro',
          url: '/pricing',
          description: 'Get 1GB storage (20x more)'
        }
      ]
    });
  }

  next();
}
```

---

## Security Considerations

### Why HttpOnly Cookies?

**HttpOnly cookies provide better security than localStorage or sessionStorage:**

| Attack Vector | localStorage | HttpOnly Cookie |
|---------------|--------------|-----------------|
| **XSS (Cross-Site Scripting)** | ❌ Vulnerable | ✅ Protected |
| **CSRF (Cross-Site Request Forgery)** | ✅ Protected | ✅ Protected (with SameSite) |
| **JavaScript Access** | ❌ Accessible | ✅ Not accessible |
| **Network Sniffing** | ⚠️ Depends on HTTPS | ✅ Protected (with Secure flag) |

**XSS Protection:**
- If an attacker injects malicious JavaScript, they **cannot** read the HttpOnly cookie
- With localStorage, `localStorage.getItem('access_token')` would expose the token

**CSRF Protection:**
- `SameSite=Strict` prevents the cookie from being sent in cross-origin requests
- Even if an attacker tricks a user into clicking a malicious link, the cookie won't be sent

**Best Practices:**
1. ✅ **Access token in HttpOnly cookie** (short-lived, 1 hour)
2. ✅ **Refresh token in memory** (or secure storage, never localStorage)
3. ✅ **HTTPS only** (Secure flag)
4. ✅ **SameSite=Strict** (CSRF protection)
5. ✅ **Short expiration** (1 hour for access token)

### Local Development

For local development (HTTP), you need to adjust cookie settings:

```javascript
const isProduction = process.env.NODE_ENV === 'production';

res.cookie('access_token', accessToken, {
  httpOnly: true,
  secure: isProduction,  // false for local dev (HTTP)
  sameSite: isProduction ? 'strict' : 'lax',
  maxAge: expiresIn * 1000,
  path: '/'
});
```

**Local development checklist:**
- Frontend: `http://localhost:5173` (Vite)
- Backend: `http://localhost:3000` (Express)
- CORS: Allow `http://localhost:5173` with `credentials: true`
- Cookies: `secure: false`, `sameSite: 'lax'`

### Production Checklist

Before deploying to production:

- [ ] Set `secure: true` (HTTPS only)
- [ ] Set `sameSite: 'strict'` (CSRF protection)
- [ ] Configure CORS with specific origin (not `*`)
- [ ] Enable `credentials: true` in CORS
- [ ] Use environment variables for secrets
- [ ] Enable rate limiting
- [ ] Set up CloudWatch logging
- [ ] Test token refresh flow
- [ ] Test logout flow
- [ ] Verify cookies are HttpOnly in browser DevTools

---

## Testing the API

### Using the OpenAPI Spec

The `api-spec.yaml` file can be used with various tools:

#### 1. Swagger UI (Interactive Documentation)

```bash
# Install Swagger UI
npm install -g swagger-ui-watcher

# Serve the spec
swagger-ui-watcher docs/api-spec.yaml
```

Open `http://localhost:8080` to interact with the API documentation.

#### 2. Postman

1. Import `docs/api-spec.yaml` into Postman
2. Postman will generate a collection with all endpoints
3. Set up environment variables for `baseUrl` and `accessToken`

#### 3. cURL Examples

**Login (saves cookie to file):**
```bash
curl -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}' \
  -c cookies.txt
```

**Get Quotas (uses cookie from file):**
```bash
curl -X GET http://localhost:3000/v1/quotas/me \
  -b cookies.txt
```

**Create MOC (uses cookie from file):**
```bash
curl -X POST http://localhost:3000/v1/mocs \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Castle","theme":"Castle","piece_count":1000}' \
  -b cookies.txt
```

**Upload File (uses cookie from file):**
```bash
curl -X POST http://localhost:3000/v1/mocs/MOC_ID/files \
  -F "file=@instructions.pdf" \
  -F "file_type=pdf" \
  -b cookies.txt
```

**Alternative: Using Authorization header (for testing):**
```bash
# Extract token from login response
TOKEN=$(curl -X POST http://localhost:3000/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}' \
  -c cookies.txt | jq -r '.refresh_token')

# Use Authorization header
curl -X GET http://localhost:3000/v1/quotas/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Automated Testing

**Example using Jest + Supertest:**

```javascript
const request = require('supertest');
const app = require('../app');

describe('MOC API', () => {
  let cookies;
  let refreshToken;
  let userId;

  beforeAll(async () => {
    // Login and get cookies
    const response = await request(app)
      .post('/v1/auth/login')
      .send({ email: 'test@example.com', password: 'password' });

    // Extract cookies from response
    cookies = response.headers['set-cookie'];
    refreshToken = response.body.refresh_token;
    userId = response.body.user.id;
  });

  describe('POST /v1/mocs', () => {
    it('should create a MOC when under quota', async () => {
      const response = await request(app)
        .post('/v1/mocs')
        .set('Cookie', cookies) // Use cookies
        .send({
          name: 'Test Castle',
          theme: 'Castle',
          piece_count: 1000
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Test Castle');
    });

    it('should return 429 when quota exceeded', async () => {
      // Create MOCs up to limit
      const quotas = await getUserQuotas(userId);
      for (let i = 0; i < quotas.mocs.limit; i++) {
        await request(app)
          .post('/v1/mocs')
          .set('Cookie', cookies)
          .send({ name: `MOC ${i}` });
      }

      // Try to create one more
      const response = await request(app)
        .post('/v1/mocs')
        .set('Cookie', cookies)
        .send({ name: 'Over Limit' });

      expect(response.status).toBe(429);
      expect(response.body.error).toBe('quota_exceeded');
      expect(response.body.details.quota_type).toBe('mocs');
    });

    it('should return 401 when cookie is missing', async () => {
      const response = await request(app)
        .post('/v1/mocs')
        .send({ name: 'Test' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('unauthorized');
    });

    it('should refresh token when expired', async () => {
      const response = await request(app)
        .post('/v1/auth/refresh')
        .send({ refresh_token: refreshToken });

      expect(response.status).toBe(200);
      expect(response.headers['set-cookie']).toBeDefined();

      // Update cookies for subsequent tests
      cookies = response.headers['set-cookie'];
    });
  });

  describe('POST /v1/auth/logout', () => {
    it('should clear the cookie', async () => {
      const response = await request(app)
        .post('/v1/auth/logout')
        .set('Cookie', cookies);

      expect(response.status).toBe(200);

      // Check that cookie is cleared
      const setCookie = response.headers['set-cookie'][0];
      expect(setCookie).toContain('Max-Age=0');
    });
  });
});
```

**Testing with Playwright (E2E):**

```javascript
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should login and access protected page', async ({ page }) => {
    // Go to login page
    await page.goto('http://localhost:5173/login');

    // Fill in credentials
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');

    // Submit form
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('http://localhost:5173/dashboard');

    // Verify cookie is set
    const cookies = await page.context().cookies();
    const accessTokenCookie = cookies.find(c => c.name === 'access_token');

    expect(accessTokenCookie).toBeDefined();
    expect(accessTokenCookie.httpOnly).toBe(true);
    expect(accessTokenCookie.secure).toBe(true);
    expect(accessTokenCookie.sameSite).toBe('Strict');

    // Verify we can access protected content
    await expect(page.locator('h1')).toContainText('Dashboard');
  });

  test('should logout and clear cookie', async ({ page }) => {
    // Login first
    await page.goto('http://localhost:5173/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('http://localhost:5173/dashboard');

    // Logout
    await page.click('button[aria-label="Logout"]');

    // Verify redirect to login
    await page.waitForURL('http://localhost:5173/login');

    // Verify cookie is cleared
    const cookies = await page.context().cookies();
    const accessTokenCookie = cookies.find(c => c.name === 'access_token');

    expect(accessTokenCookie).toBeUndefined();
  });
});
```

---

## Client SDK Generation

The OpenAPI spec can generate client SDKs automatically:

### JavaScript/TypeScript

```bash
npm install -g @openapitools/openapi-generator-cli

openapi-generator-cli generate \
  -i docs/api-spec.yaml \
  -g typescript-fetch \
  -o client-sdk/typescript
```

**Usage:**
```typescript
import { Configuration, MOCsApi } from './client-sdk/typescript';

const config = new Configuration({
  basePath: 'https://api.lego-inventory.com/v1',
  accessToken: 'YOUR_ACCESS_TOKEN'
});

const mocsApi = new MOCsApi(config);

// List MOCs
const mocs = await mocsApi.listMOCs({ page: 1, limit: 20 });

// Create MOC
const newMOC = await mocsApi.createMOC({
  name: 'Medieval Castle',
  theme: 'Castle',
  piece_count: 2847
});
```

### Python

```bash
openapi-generator-cli generate \
  -i docs/api-spec.yaml \
  -g python \
  -o client-sdk/python
```

**Usage:**
```python
from client_sdk.python import ApiClient, Configuration, MOCsApi

config = Configuration(
    host='https://api.lego-inventory.com/v1',
    access_token='YOUR_ACCESS_TOKEN'
)

with ApiClient(config) as api_client:
    mocs_api = MOCsApi(api_client)

    # List MOCs
    mocs = mocs_api.list_mocs(page=1, limit=20)

    # Create MOC
    new_moc = mocs_api.create_moc({
        'name': 'Medieval Castle',
        'theme': 'Castle',
        'piece_count': 2847
    })
```

---

## API Versioning

### Current Version: v1

All endpoints are prefixed with `/v1/`.

### Version Migration Strategy

When breaking changes are needed:

1. **Create new version** (`/v2/`)
2. **Maintain old version** for 6 months minimum
3. **Add deprecation headers** to v1 responses:
   ```
   Deprecation: true
   Sunset: Sat, 01 Jun 2026 00:00:00 GMT
   Link: </v2/mocs>; rel="successor-version"
   ```
4. **Communicate migration timeline** to users
5. **Provide migration guide**

### Non-Breaking Changes

These can be added to existing version:
- New optional fields in requests
- New fields in responses
- New endpoints
- New query parameters (optional)
- New error codes

### Breaking Changes (require new version)

- Removing fields from responses
- Changing field types
- Making optional fields required
- Removing endpoints
- Changing authentication method

---

## Next Steps

1. **Review the API spec:** Open `docs/api-spec.yaml` in Swagger Editor
2. **Set up local development:** Configure Cognito and database
3. **Implement middleware:** JWT verification, scope checking, quota enforcement
4. **Build endpoints:** Start with authentication, then MOCs, then other resources
5. **Write tests:** Unit tests for middleware, integration tests for endpoints
6. **Generate client SDK:** Use OpenAPI generator for frontend
7. **Deploy to staging:** Test with real Cognito tokens
8. **Monitor and iterate:** Use CloudWatch metrics to optimize

---

**Questions or issues?** Refer to the [Authorization System PRD](./prd/epic-authorization-system.md) for detailed implementation guidance.


