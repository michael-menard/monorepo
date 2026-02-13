# Test Plan: REPA-018

## Scope Summary

**Endpoints Touched:**
- POST `/api/v2/auth/session` - Set auth session with ID token
- POST `/api/v2/auth/refresh` - Refresh auth session
- POST `/api/v2/auth/logout` - Clear auth session
- GET `/api/v2/auth/status` - Check session status

**UI Touched:** No (service-layer only)

**Data/Storage Touched:** No (httpOnly cookies managed by backend)

**Test Strategy:**
- Unit tests with mocked `fetch` (vitest)
- Integration tests with real backend (per ADR-005, no MSW)
- Coverage target: Minimum 45%, aim for 80%+

---

## Happy Path Tests

### Test 1: setAuthSession - Success Flow
**Setup:**
- Mock `fetch` to return 200 OK
- Valid ID token string
- `VITE_SERVERLESS_API_BASE_URL` environment variable set

**Action:**
```typescript
const response = await setAuthSession('valid-id-token-abc123')
```

**Expected Outcome:**
- Returns `SessionResponse` object with `{ success: true, message: string, user?: {...} }`
- Zod validation passes on response shape
- Request made to `${baseUrl}/auth/session` with POST method
- Request includes `Content-Type: application/json` header
- Request includes `credentials: 'include'` for httpOnly cookie support
- ID token sent in request body: `{ idToken: 'valid-id-token-abc123' }`

**Evidence:**
- Assert `response.success === true`
- Assert `response.message` is a non-empty string
- Verify `fetch` called exactly once with correct URL and options
- Verify request body contains `idToken` field

---

### Test 2: refreshAuthSession - Success Flow
**Setup:**
- Mock `fetch` to return 200 OK
- Valid refreshed ID token
- Environment variable set

**Action:**
```typescript
const response = await refreshAuthSession('refreshed-id-token-xyz789')
```

**Expected Outcome:**
- Returns `SessionResponse` with `{ success: true, message: string }`
- Request made to `${baseUrl}/auth/refresh` with POST method
- Request includes proper headers and credentials
- ID token sent in body

**Evidence:**
- Assert `response.success === true`
- Verify `fetch` called with `/auth/refresh` endpoint
- Verify request body contains new ID token

---

### Test 3: clearAuthSession - Success Flow
**Setup:**
- Mock `fetch` to return 200 OK
- Environment variable set

**Action:**
```typescript
await clearAuthSession()
```

**Expected Outcome:**
- Resolves without throwing
- Request made to `${baseUrl}/auth/logout` with POST method
- Request includes `credentials: 'include'`
- No return value expected (void)

**Evidence:**
- Assert promise resolves successfully
- Verify `fetch` called with `/auth/logout` endpoint
- No exception thrown

---

### Test 4: getSessionStatus - Authenticated User
**Setup:**
- Mock `fetch` to return 200 OK with:
  ```json
  {
    "authenticated": true,
    "user": {
      "userId": "user-123",
      "email": "test@example.com"
    }
  }
  ```

**Action:**
```typescript
const status = await getSessionStatus()
```

**Expected Outcome:**
- Returns `{ authenticated: true, user: { userId: string, email?: string } }`
- Request made to `${baseUrl}/auth/status` with GET method
- Request includes `credentials: 'include'`

**Evidence:**
- Assert `status.authenticated === true`
- Assert `status.user.userId === 'user-123'`
- Assert `status.user.email === 'test@example.com'`
- Verify GET request made to `/auth/status`

---

### Test 5: getSessionStatus - Unauthenticated
**Setup:**
- Mock `fetch` to return 200 OK with:
  ```json
  { "authenticated": false }
  ```

**Action:**
```typescript
const status = await getSessionStatus()
```

**Expected Outcome:**
- Returns `{ authenticated: false, user: undefined }`

**Evidence:**
- Assert `status.authenticated === false`
- Assert `status.user === undefined`

---

## Error Cases

### Error 1: setAuthSession - Backend Returns 401 Unauthorized
**Setup:**
- Mock `fetch` to return 401 with error body:
  ```json
  { "error": "Invalid token", "message": "Token validation failed" }
  ```

**Action:**
```typescript
await setAuthSession('invalid-token')
```

**Expected Outcome:**
- Throws error with descriptive message
- Logger captures error via `logger.error()`
- Zod schema validates error response shape

**Evidence:**
- Assert promise rejects with error
- Assert error message includes "Invalid token" or "401"
- Verify `logger.error` called (mock @repo/logger)

---

### Error 2: refreshAuthSession - Network Failure
**Setup:**
- Mock `fetch` to throw `TypeError: Failed to fetch`

**Action:**
```typescript
await refreshAuthSession('valid-token')
```

**Expected Outcome:**
- Throws error
- Logger captures network failure
- Error message indicates network issue

**Evidence:**
- Assert promise rejects
- Assert error message references network failure
- Verify logger called with network error context

---

### Error 3: clearAuthSession - Backend Error (Graceful Failure)
**Setup:**
- Mock `fetch` to return 500 Internal Server Error

**Action:**
```typescript
await clearAuthSession()
```

**Expected Outcome:**
- Does NOT throw (graceful failure per existing pattern)
- Logger warns about failure via `logger.warn()`
- Function still resolves

**Evidence:**
- Assert promise resolves without throwing
- Verify `logger.warn` called with error context
- Assert function completes gracefully

---

### Error 4: getSessionStatus - Non-200 Response
**Setup:**
- Mock `fetch` to return 503 Service Unavailable

**Action:**
```typescript
await getSessionStatus()
```

**Expected Outcome:**
- Throws error
- Logger captures failure
- Error indicates service unavailable

**Evidence:**
- Assert promise rejects
- Assert error message includes "503" or "Service Unavailable"
- Verify logger error called

---

### Error 5: Missing Environment Variable
**Setup:**
- Unset `VITE_SERVERLESS_API_BASE_URL`

**Action:**
```typescript
await setAuthSession('token')
```

**Expected Outcome:**
- Throws error immediately from `getBaseUrl()` helper
- Error message indicates missing environment variable
- No fetch call attempted

**Evidence:**
- Assert throws error before fetch
- Assert error message includes "VITE_SERVERLESS_API_BASE_URL"
- Verify `fetch` never called

---

## Edge Cases (Reasonable)

### Edge 1: Empty ID Token String
**Setup:**
- Valid environment
- Empty string passed as token

**Action:**
```typescript
await setAuthSession('')
```

**Expected Outcome:**
- Backend returns validation error (400)
- Function throws with validation error message
- Logger captures invalid input

**Evidence:**
- Assert promise rejects
- Assert error indicates validation failure

---

### Edge 2: Very Long ID Token (Boundary Test)
**Setup:**
- ID token string of 5000+ characters (simulating malformed token)

**Action:**
```typescript
await setAuthSession('a'.repeat(5000))
```

**Expected Outcome:**
- Backend may reject (413 Payload Too Large or 400 Bad Request)
- Function handles error gracefully
- Logger captures oversized token attempt

**Evidence:**
- Assert error handling works for large payloads
- No memory issues or crashes

---

### Edge 3: Concurrent Session Calls (Race Condition)
**Setup:**
- Multiple simultaneous calls to `setAuthSession`

**Action:**
```typescript
await Promise.all([
  setAuthSession('token1'),
  setAuthSession('token2'),
  setAuthSession('token3')
])
```

**Expected Outcome:**
- All requests complete independently
- No shared state corruption
- Last-write-wins behavior for cookie (backend-controlled)

**Evidence:**
- Assert all promises resolve or reject independently
- No interference between concurrent calls

---

### Edge 4: Session Status After Logout
**Setup:**
- Set session, then clear session

**Action:**
```typescript
await setAuthSession('valid-token')
await clearAuthSession()
const status = await getSessionStatus()
```

**Expected Outcome:**
- `status.authenticated === false`
- Session properly cleared

**Evidence:**
- Assert final status is unauthenticated

---

### Edge 5: Malformed Backend Response
**Setup:**
- Mock `fetch` to return 200 OK but invalid JSON

**Action:**
```typescript
await setAuthSession('valid-token')
```

**Expected Outcome:**
- JSON parse error caught
- Function throws with parse error
- Logger captures malformed response

**Evidence:**
- Assert promise rejects with parse error
- Verify logger captures JSON parse failure

---

## Integration Tests (Real Backend - ADR-005)

### Integration Test Setup
**Prerequisites:**
- Backend running at `VITE_SERVERLESS_API_BASE_URL`
- Test Cognito user pool with valid credentials (per ADR-004)
- Valid test ID token obtained from Cognito (may require test fixture)

**Note:** Integration tests may be marked `test.skip()` in CI environments where backend is unavailable.

---

### Integration 1: Full Session Lifecycle
**Setup:**
- Obtain valid test ID token from Cognito test pool
- Ensure backend auth endpoints are operational

**Test Sequence:**
1. Call `setAuthSession(testIdToken)` → expect 200 OK, `success: true`
2. Call `getSessionStatus()` → expect `authenticated: true` with user object
3. Call `refreshAuthSession(newTestIdToken)` → expect 200 OK
4. Call `getSessionStatus()` → expect still authenticated
5. Call `clearAuthSession()` → expect 200 OK
6. Call `getSessionStatus()` → expect `authenticated: false`

**Expected Outcomes:**
- All backend requests succeed with real httpOnly cookies
- Session state transitions correctly
- No mocks or stubs used (per ADR-005)

**Evidence:**
- Capture response bodies for each call
- Verify httpOnly cookie set/cleared in browser (if applicable)
- Assert final unauthenticated state

---

### Integration 2: Invalid Token Rejection
**Setup:**
- Use malformed or expired test token

**Action:**
```typescript
await setAuthSession('expired-or-invalid-token')
```

**Expected Outcome:**
- Backend returns 401 Unauthorized
- Function throws with error from backend

**Evidence:**
- Assert 401 error captured
- Verify error message from backend

---

### Integration 3: Refresh Without Active Session
**Setup:**
- No prior session set

**Action:**
```typescript
await refreshAuthSession('new-token')
```

**Expected Outcome:**
- Backend may return 401 or successfully create new session (depends on backend logic)
- Function handles response correctly

**Evidence:**
- Assert proper error handling or session creation

---

## Required Tooling Evidence

### Backend Testing
**Required `.http` Requests:**
```http
### Set Session
POST {{baseUrl}}/auth/session
Content-Type: application/json

{
  "idToken": "{{testIdToken}}"
}

### Get Session Status
GET {{baseUrl}}/auth/status

### Refresh Session
POST {{baseUrl}}/auth/refresh
Content-Type: application/json

{
  "idToken": "{{refreshedIdToken}}"
}

### Clear Session
POST {{baseUrl}}/auth/logout
```

**Assertions Required:**
- Status code checks (200, 401, 500, etc.)
- Response body shape validation against Zod schemas
- `Set-Cookie` header presence (httpOnly cookie)

---

### Frontend Testing (Not Applicable)
**UI Touched:** No

**Playwright Runs:** None required (service-layer only)

---

## Risks to Call Out

### Risk 1: Integration Test Dependency on Backend
**Description:** Integration tests require running backend with auth endpoints. CI environments may not have backend available.

**Mitigation:**
- Use `test.skip()` conditional on environment variable (e.g., `CI=true`)
- Document backend setup requirements in README
- Prioritize unit tests for CI coverage

---

### Risk 2: Test Cognito User Pool Requirements
**Description:** Real backend integration tests need valid Cognito ID tokens (per ADR-004). Test user pool may not exist yet.

**Mitigation:**
- Document test user pool setup in README
- Provide example tokens or fixture generation script
- Consider mocking Cognito token generation in test setup (outside of session service tests)

---

### Risk 3: httpOnly Cookie Verification
**Description:** Unit tests mock `fetch` and cannot verify actual httpOnly cookie behavior. This is backend-controlled.

**Mitigation:**
- Integration tests verify end-to-end cookie behavior
- Document that `credentials: 'include'` is critical (must not be removed)
- Consider E2E tests in main-app AuthProvider tests (existing coverage)

---

### Risk 4: Environment Variable Missing in Tests
**Description:** Tests may fail if `VITE_SERVERLESS_API_BASE_URL` not set in test environment.

**Mitigation:**
- Set default in vitest.config.ts `define` or `env` section
- Document required env vars in README
- Test should explicitly verify env var handling (Error 5 above)

---

## Test Coverage Target

**Minimum:** 45% (per CLAUDE.md)
**Goal:** 80%+ (high-value auth code justifies thorough coverage)

**Coverage Breakdown:**
- Unit tests: All 4 functions (set, refresh, clear, getStatus) with success/error/network failure paths
- Integration tests: Full lifecycle with real backend
- Edge cases: Boundary conditions and concurrency

**Excluded from Coverage:**
- Logger internals (external dependency)
- Backend endpoint implementations (out of scope)
