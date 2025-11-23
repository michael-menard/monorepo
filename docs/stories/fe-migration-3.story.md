# Story 1.3: RTK Query Base URL Refactoring

**Epic:** Epic 1: Frontend Serverless Migration

**Story ID:** 1.3

**Priority:** High

**Estimated Effort:** 3 story points

---

## User Story

**As a** frontend developer,
**I want** RTK Query to use runtime-configured API base URL instead of build-time env vars,
**so that** data fetching endpoints route to the correct backend without rebuild.

---

## Business Context

This story enables the frontend data layer to dynamically route requests based on the runtime configuration fetched in Story 1.2. By refactoring RTK Query to use the runtime config instead of build-time environment variables, we achieve the flexibility needed for staged rollout without requiring frontend rebuilds or redeployments.

---

## Acceptance Criteria

**AC1**: Update `src/services/api.ts` - `baseQuery` configuration uses runtime config API URL (not `import.meta.env.VITE_*`)

**AC2**: All existing RTK Query endpoints (MOCs, gallery, wishlist) maintain identical request/response handling

**AC3**: Remove build-time env vars: `VITE_API_GATEWAY_URL_*` from Vite config and `.env` files

**AC4**: TypeScript compilation succeeds with zero errors after refactoring

**AC5**: Unit tests updated to mock runtime config instead of env vars

---

## Integration Verification

**IV1**: Existing RTK Query endpoints (`useGetMocsQuery`, `useUploadImageMutation`, etc.) function identically in local dev

**IV2**: Redux DevTools show correct API base URL in network requests

**IV3**: All existing frontend features (MOC list, upload, gallery, wishlist) work in local dev with SST serverless backend

---

## Technical Implementation Notes

### Architecture Context

- **Tech Stack**: Redux Toolkit, RTK Query, TypeScript 5.8, React 19
- **Related Components**:
  - `apps/web/lego-moc-instructions-app/src/services/api.ts` - RTK Query base configuration
  - Runtime config from Story 1.2
  - Existing API endpoints in various feature packages

### Implementation Approach

1. **Refactor Base Query Configuration**:

```typescript
// src/services/api.ts (BEFORE)
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_GATEWAY_URL, // ❌ Build-time
    prepareHeaders: (headers, { getState }) => {
      // Auth headers...
      return headers
    },
  }),
  endpoints: () => ({}),
})

// src/services/api.ts (AFTER)
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { RootState } from '@/store/store'

export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: '/', // Will be overridden dynamically
    prepareHeaders: (headers, { getState }) => {
      const state = getState() as RootState
      const config = state.config.config

      // Set base URL dynamically
      if (config?.apiBaseUrl) {
        // RTK Query doesn't support dynamic baseUrl directly,
        // so we'll use a wrapper approach (see below)
      }

      // Auth headers...
      return headers
    },
  }),
  endpoints: () => ({}),
})
```

**Better Approach - Dynamic Base Query Wrapper**:

```typescript
// src/services/api.ts
import { createApi, fetchBaseQuery, FetchArgs } from '@reduxjs/toolkit/query/react'
import type { RootState } from '@/store/store'

// Create a dynamic base query that reads from runtime config
const dynamicBaseQuery: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  const state = api.getState() as RootState
  const config = state.config.config

  // Fallback to Express API if config not loaded
  const baseUrl = config?.apiBaseUrl || 'http://localhost:9000'

  const rawBaseQuery = fetchBaseQuery({
    baseUrl,
    prepareHeaders: (headers, { getState }) => {
      // Add auth tokens, etc.
      const token = (getState() as RootState).auth.token
      if (token) {
        headers.set('Authorization', `Bearer ${token}`)
      }
      return headers
    },
  })

  return rawBaseQuery(args, api, extraOptions)
}

export const api = createApi({
  reducerPath: 'api',
  baseQuery: dynamicBaseQuery,
  tagTypes: ['Moc', 'Image', 'Wishlist', 'Album'],
  endpoints: () => ({}),
})
```

2. **Remove Build-Time Environment Variables**:

```typescript
// .env.development (BEFORE)
VITE_API_GATEWAY_URL=https://api-gateway.dev.example.com
VITE_EXPRESS_API_URL=http://localhost:9000

// .env.development (AFTER)
# Runtime config now managed via S3 /config.json
# Remove all VITE_API_GATEWAY_URL and VITE_EXPRESS_API_URL references
```

3. **Update Existing Endpoints** (verify compatibility):

```typescript
// Example: src/features/mocs/mocsApi.ts
import { api } from '@/services/api'

export const mocsApi = api.injectEndpoints({
  endpoints: builder => ({
    getMocs: builder.query({
      query: () => '/api/mocs', // ✅ Relative path works with dynamic baseUrl
      providesTags: ['Moc'],
    }),
    uploadMoc: builder.mutation({
      query: data => ({
        url: '/api/mocs/upload',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['Moc'],
    }),
  }),
})

export const { useGetMocsQuery, useUploadMocMutation } = mocsApi
```

4. **Update Tests**:

```typescript
// tests/mocks/handlers.ts (MSW)
import { rest } from 'msw'

export const handlers = [
  rest.get('http://localhost:9000/api/mocs', (req, res, ctx) => {
    return res(ctx.json({ mocs: [] }))
  }),
  // Update to match dynamic baseUrl if needed
]

// tests/setup.ts
import { setupStore } from '@/store/store'
import { setConfig } from '@/store/slices/configSlice'

export function setupTestStore() {
  const store = setupStore()

  // Mock runtime config
  store.dispatch(
    setConfig({
      apiBaseUrl: 'http://localhost:9000',
      useServerless: false,
      cognitoConfig: {
        userPoolId: 'test-pool',
        clientId: 'test-client',
        region: 'us-east-1',
      },
    }),
  )

  return store
}
```

### Dependencies

- **Upstream**: Story 1.2 (Frontend Runtime Config Fetch Implementation)
- **Downstream**: Story 1.4 (AWS Cognito Authentication Integration)
- **Shared Database**: N/A
- **External Services**: Express API or Serverless API Gateway

### File Changes

**Files to Modify**:

- `apps/web/lego-moc-instructions-app/src/services/api.ts` - Refactor baseQuery to use runtime config
- `apps/web/lego-moc-instructions-app/.env.development` - Remove API URL env vars
- `apps/web/lego-moc-instructions-app/.env.production` - Remove API URL env vars
- `apps/web/lego-moc-instructions-app/vite.config.ts` - Verify no hardcoded API URLs
- Test setup files - Mock runtime config instead of env vars

**Files to Verify (no changes expected)**:

- All feature API files (`src/features/*/api.ts`) - Should continue working with relative paths

### Testing Strategy

**Unit Tests**:

```typescript
// api.test.ts
import { describe, it, expect } from 'vitest'
import { api } from './api'
import { setupTestStore } from '@/tests/setup'
import { setConfig } from '@/store/slices/configSlice'

describe('RTK Query API', () => {
  it('should use runtime config base URL', () => {
    const store = setupTestStore()

    store.dispatch(
      setConfig({
        apiBaseUrl: 'https://serverless.example.com',
        useServerless: true,
        cognitoConfig: {
          /* ... */
        },
      }),
    )

    // Verify baseQuery uses correct URL
    // (may require inspecting network requests in integration tests)
  })

  it('should fallback to default URL if config not loaded', () => {
    const store = setupTestStore()
    // Don't dispatch setConfig

    // Verify baseQuery uses fallback URL
  })
})
```

**Integration Tests**:

- Test all existing RTK Query endpoints with MSW
- Verify requests go to correct base URL
- Test switching between Express and Serverless base URLs
- Verify error handling (401, 403, 500)

**Manual Testing**:

1. Start dev server with Express API (port 9000)
2. Set `/config.json` to use Express API URL
3. Verify all features work: MOC list, upload, gallery, wishlist
4. Switch `/config.json` to use Serverless API Gateway URL
5. Refresh page, verify all features work with Serverless backend
6. Check Network tab in DevTools: Requests go to correct base URL
7. Check Redux DevTools: Verify config state shows correct API URL

---

## Definition of Done

- [ ] `src/services/api.ts` refactored to use runtime config base URL
- [ ] Dynamic base query wrapper implemented
- [ ] All environment variables for API URLs removed
- [ ] TypeScript compilation succeeds with zero errors
- [ ] Unit tests updated to mock runtime config
- [ ] Integration tests passing with MSW
- [ ] Manual testing completed: All API features work
- [ ] Redux DevTools show correct API base URL in state
- [ ] Network requests go to correct base URL
- [ ] All Integration Verification criteria passed
- [ ] Code reviewed and approved
- [ ] Changes merged to main branch

---

## Notes

- **RTK Query Limitation**: `baseUrl` in `fetchBaseQuery` is evaluated once at creation time, so we need the wrapper approach
- **Fallback URL**: Use Express API URL as safe fallback during development
- **Testing**: MSW handlers should match the dynamic base URL from runtime config
- **Performance**: No performance impact expected - same number of network requests
- **Future Enhancement**: Consider caching base URL to avoid reading from Redux state on every request (not critical for this story)

---

**Story Created:** 2025-11-23
**Last Updated:** 2025-11-23
