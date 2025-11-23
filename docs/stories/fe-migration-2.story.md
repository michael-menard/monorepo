# Story 1.2: Frontend Runtime Config Fetch Implementation

**Epic:** Epic 1: Frontend Serverless Migration

**Story ID:** 1.2

**Priority:** High

**Estimated Effort:** 5 story points

---

## User Story

**As a** frontend developer,
**I want** the application to fetch runtime configuration on initialization,
**so that** API routing can be controlled without code changes.

---

## Business Context

This story implements the client-side mechanism to consume the runtime configuration deployed in Story 1.1. By fetching configuration on app initialization, we enable dynamic API routing without rebuilding or redeploying the frontend. This is essential for the staged rollout strategy and provides instant rollback capability by simply updating the S3 config file.

---

## Acceptance Criteria

**AC1**: Create `src/config/runtime-config.ts` with async config fetch function and Zod validation

**AC2**: Config fetched on app initialization before Redux store setup, with retry logic (3 attempts, exponential backoff)

**AC3**: Fallback to hardcoded Express API URL if config fetch fails (safe default with console warning)

**AC4**: Last-known-good config cached in localStorage, used if fetch fails and localStorage cache exists

**AC5**: Runtime config stored in Redux store or Context for app-wide access

**AC6**: TypeScript types inferred from Zod schema: `type RuntimeConfig = z.infer<typeof RuntimeConfigSchema>`

**AC7**: Client-side backend lock stored in localStorage with 24-hour expiration to prevent sticky routing issues. Lock checked on app init, expired locks cleared automatically.

---

## Integration Verification

**IV1**: Existing app initialization flow (auth check, route setup) remains functional

**IV2**: Performance impact measured: Config fetch adds <200ms to app startup time (P95)

**IV3**: Error handling tested: S3 down → fallback to Express API, user-facing error message displayed

---

## Technical Implementation Notes

### Architecture Context

- **Tech Stack**: React 19, TypeScript 5.8, Redux Toolkit, Zod, Vite 6
- **Related Components**:
  - `apps/web/lego-moc-instructions-app/src/main.tsx` - App entry point
  - `apps/web/lego-moc-instructions-app/src/store/store.ts` - Redux store setup
  - Runtime config deployed in Story 1.1

### Implementation Approach

1. **Create Runtime Config Module**:

```typescript
// src/config/runtime-config.ts
import { z } from 'zod'

export const RuntimeConfigSchema = z.object({
  apiBaseUrl: z.string().url(),
  useServerless: z.boolean(),
  cognitoConfig: z.object({
    userPoolId: z.string(),
    clientId: z.string(),
    region: z.string(),
  }),
})

export type RuntimeConfig = z.infer<typeof RuntimeConfigSchema>

const CONFIG_URL = '/config.json' // Served from S3 or local public folder
const RETRY_ATTEMPTS = 3
const RETRY_BASE_DELAY = 500 // ms

async function fetchWithRetry(url: string, attempts: number): Promise<Response> {
  for (let i = 0; i < attempts; i++) {
    try {
      const response = await fetch(url)
      if (response.ok) return response
    } catch (error) {
      if (i === attempts - 1) throw error
      const delay = RETRY_BASE_DELAY * Math.pow(2, i)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  throw new Error('All retry attempts failed')
}

export async function fetchRuntimeConfig(): Promise<RuntimeConfig> {
  try {
    const response = await fetchWithRetry(CONFIG_URL, RETRY_ATTEMPTS)
    const data = await response.json()

    // Validate with Zod schema
    const config = RuntimeConfigSchema.parse(data)

    // Cache last-known-good config
    localStorage.setItem('runtime-config', JSON.stringify(config))
    localStorage.setItem('runtime-config-timestamp', Date.now().toString())

    return config
  } catch (error) {
    console.warn('Failed to fetch runtime config, attempting fallback', error)

    // Try localStorage cache
    const cached = localStorage.getItem('runtime-config')
    if (cached) {
      try {
        return RuntimeConfigSchema.parse(JSON.parse(cached))
      } catch {
        // Cache invalid, continue to hardcoded fallback
      }
    }

    // Hardcoded fallback (Express API)
    console.warn('Using hardcoded Express API fallback')
    return {
      apiBaseUrl: 'http://localhost:9000', // or production Express URL
      useServerless: false,
      cognitoConfig: {
        userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || '',
        clientId: import.meta.env.VITE_COGNITO_CLIENT_ID || '',
        region: 'us-east-1',
      },
    }
  }
}
```

2. **Backend Lock for Sticky Routing**:

```typescript
// src/config/backend-lock.ts
const BACKEND_LOCK_KEY = 'backend-lock'
const LOCK_DURATION = 24 * 60 * 60 * 1000 // 24 hours

interface BackendLock {
  backend: 'express' | 'serverless'
  timestamp: number
}

export function getBackendLock(): BackendLock | null {
  const lockStr = localStorage.getItem(BACKEND_LOCK_KEY)
  if (!lockStr) return null

  try {
    const lock: BackendLock = JSON.parse(lockStr)
    const now = Date.now()

    // Check if lock expired
    if (now - lock.timestamp > LOCK_DURATION) {
      localStorage.removeItem(BACKEND_LOCK_KEY)
      return null
    }

    return lock
  } catch {
    localStorage.removeItem(BACKEND_LOCK_KEY)
    return null
  }
}

export function setBackendLock(backend: 'express' | 'serverless'): void {
  const lock: BackendLock = {
    backend,
    timestamp: Date.now(),
  }
  localStorage.setItem(BACKEND_LOCK_KEY, JSON.stringify(lock))
}

export function clearBackendLock(): void {
  localStorage.removeItem(BACKEND_LOCK_KEY)
}
```

3. **Redux Store Integration**:

```typescript
// src/store/slices/configSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit'
import type { RuntimeConfig } from '@/config/runtime-config'

interface ConfigState {
  config: RuntimeConfig | null
  isLoading: boolean
  error: string | null
}

const initialState: ConfigState = {
  config: null,
  isLoading: false,
  error: null,
}

export const configSlice = createSlice({
  name: 'config',
  initialState,
  reducers: {
    setConfig: (state, action: PayloadAction<RuntimeConfig>) => {
      state.config = action.payload
      state.isLoading = false
      state.error = null
    },
    setConfigError: (state, action: PayloadAction<string>) => {
      state.error = action.payload
      state.isLoading = false
    },
  },
})

export const { setConfig, setConfigError } = configSlice.actions
export default configSlice.reducer
```

4. **App Initialization**:

```typescript
// src/main.tsx
import { fetchRuntimeConfig } from './config/runtime-config';
import { getBackendLock, setBackendLock } from './config/backend-lock';
import { store } from './store/store';
import { setConfig } from './store/slices/configSlice';

async function initializeApp() {
  try {
    // Fetch runtime config
    const config = await fetchRuntimeConfig();

    // Check backend lock
    const lock = getBackendLock();
    if (lock) {
      console.info(`Backend locked to ${lock.backend} until lock expires`);
      // Optionally override config based on lock
    } else {
      // Set lock based on current config
      setBackendLock(config.useServerless ? 'serverless' : 'express');
    }

    // Store in Redux
    store.dispatch(setConfig(config));

    // Continue with app initialization
    // ...
  } catch (error) {
    console.error('App initialization failed', error);
    // Show user-facing error or continue with fallback
  }
}

initializeApp().then(() => {
  // Render React app
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <Provider store={store}>
        <App />
      </Provider>
    </StrictMode>
  );
});
```

### Dependencies

- **Upstream**: Story 1.1 (Runtime Configuration Infrastructure Setup)
- **Downstream**: Story 1.3 (RTK Query Base URL Refactoring)
- **Shared Database**: N/A
- **External Services**: S3 (config file)

### File Changes

**Files to Create**:

- `apps/web/lego-moc-instructions-app/src/config/runtime-config.ts` - Config fetch logic
- `apps/web/lego-moc-instructions-app/src/config/backend-lock.ts` - Backend lock logic
- `apps/web/lego-moc-instructions-app/src/store/slices/configSlice.ts` - Redux config slice

**Files to Modify**:

- `apps/web/lego-moc-instructions-app/src/main.tsx` - Add config fetch before app render
- `apps/web/lego-moc-instructions-app/src/store/store.ts` - Add configSlice to store

### Testing Strategy

**Unit Tests**:

```typescript
// runtime-config.test.ts
import { describe, it, expect, vi } from 'vitest'
import { fetchRuntimeConfig, RuntimeConfigSchema } from './runtime-config'

describe('fetchRuntimeConfig', () => {
  it('should fetch and validate config successfully', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        apiBaseUrl: 'https://api.example.com',
        useServerless: true,
        cognitoConfig: {
          userPoolId: 'pool123',
          clientId: 'client123',
          region: 'us-east-1',
        },
      }),
    })

    const config = await fetchRuntimeConfig()
    expect(config.apiBaseUrl).toBe('https://api.example.com')
  })

  it('should fallback to localStorage on fetch failure', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))
    localStorage.setItem(
      'runtime-config',
      JSON.stringify({
        apiBaseUrl: 'https://cached.example.com',
        useServerless: false,
        cognitoConfig: { userPoolId: 'pool', clientId: 'client', region: 'us-east-1' },
      }),
    )

    const config = await fetchRuntimeConfig()
    expect(config.apiBaseUrl).toBe('https://cached.example.com')
  })

  it('should retry on fetch failure', async () => {
    const mockFetch = vi
      .fn()
      .mockRejectedValueOnce(new Error('Fail 1'))
      .mockRejectedValueOnce(new Error('Fail 2'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          /* valid config */
        }),
      })
    global.fetch = mockFetch

    await fetchRuntimeConfig()
    expect(mockFetch).toHaveBeenCalledTimes(3)
  })
})

// backend-lock.test.ts
import { describe, it, expect } from 'vitest'
import { getBackendLock, setBackendLock, clearBackendLock } from './backend-lock'

describe('backend-lock', () => {
  it('should set and retrieve backend lock', () => {
    setBackendLock('serverless')
    const lock = getBackendLock()
    expect(lock?.backend).toBe('serverless')
  })

  it('should clear expired locks', () => {
    const expiredLock = {
      backend: 'express',
      timestamp: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
    }
    localStorage.setItem('backend-lock', JSON.stringify(expiredLock))

    const lock = getBackendLock()
    expect(lock).toBeNull()
  })
})
```

**Integration Tests**:

- Mock S3 config endpoint with MSW
- Test app initialization flow with mocked config
- Verify Redux store receives config
- Test error scenarios (network failure, invalid JSON, validation failure)

**Manual Testing**:

1. Start dev server, verify config fetched from public folder or S3
2. Check browser DevTools Network tab: Config request completes <200ms
3. Simulate network failure: Block S3 request, verify fallback to Express API
4. Check localStorage after successful config fetch
5. Refresh page with localStorage cache, verify cache used if S3 unavailable
6. Test backend lock: Switch backend, verify lock persists for 24 hours

---

## Definition of Done

- [ ] `src/config/runtime-config.ts` created with fetch logic and Zod validation
- [ ] `src/config/backend-lock.ts` created with lock management
- [ ] Config fetched before Redux store setup in `main.tsx`
- [ ] Retry logic implemented (3 attempts, exponential backoff)
- [ ] localStorage caching implemented (last-known-good config)
- [ ] Hardcoded fallback to Express API on complete failure
- [ ] Backend lock stored in localStorage with 24-hour expiration
- [ ] Runtime config stored in Redux store via configSlice
- [ ] TypeScript types inferred from Zod schema
- [ ] Unit tests written and passing (>80% coverage)
- [ ] Integration tests passing
- [ ] Manual testing completed: All scenarios verified
- [ ] Performance measured: <200ms config fetch time
- [ ] All Integration Verification criteria passed
- [ ] Code reviewed and approved
- [ ] Changes merged to main branch

---

## Notes

- **localStorage Key**: Use consistent key names: `runtime-config`, `runtime-config-timestamp`, `backend-lock`
- **Error Handling**: Console warnings acceptable for dev, consider user-facing toast notification for production
- **Performance**: Consider preloading config in index.html with `<link rel="preload">` if needed
- **Testing**: Use MSW to mock `/config.json` endpoint in integration tests
- **Future Enhancement**: Expose config reload function for admin users (not in this story)

---

**Story Created:** 2025-11-23
**Last Updated:** 2025-11-23
