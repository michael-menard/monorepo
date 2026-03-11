# Dev Feasibility Review: REPA-003 - Migrate Upload Hooks

## Executive Summary

**Feasibility:** MEDIUM (blocked by dependencies, moderate technical complexity)

**Blocking Dependencies:**
- **REPA-001** (Create @repo/upload Package Structure) - REQUIRED before work can start
- **REPA-002** (Migrate Upload Client Functions) - REQUIRED for correct import paths

**Technical Complexity:** MEDIUM
- Merge strategy for divergent useUploaderSession implementations
- Redux dependency injection refactor
- Import path updates across multiple apps
- Test migration decisions

**Estimated Story Points:** 5 SP

**Estimated Implementation Time:** 2-3 days (after dependencies resolved)

---

## Dependency Analysis

### REPA-001: @repo/upload Package Structure
**Status:** Pending (NOT STARTED)

**What REPA-003 Needs:**
- `packages/core/upload/` directory exists
- `packages/core/upload/hooks/` subdirectory created
- `packages/core/upload/package.json` configured with dependencies:
  - `@repo/upload-types` (types and utilities)
  - `@repo/upload-client` (XHR client - will be migrated to @repo/upload/client by REPA-002)
  - `@repo/logger` (logging)
  - `@repo/app-component-library` (useToast)
  - `react` (peer dependency)
- Vitest config for testing
- TypeScript config for compilation
- ESLint config for linting

**Blocker Impact:** Cannot create hook files without directory structure. REPA-003 cannot start until REPA-001 is complete.

---

### REPA-002: Migrate Upload Client Functions
**Status:** Pending (NOT STARTED)

**What REPA-003 Needs:**
- Upload client moved from `@repo/upload-client` to `@repo/upload/client`
- Imports updated from:
  ```typescript
  import { uploadToPresignedUrl } from '@repo/upload-client'
  ```
  To:
  ```typescript
  import { uploadToPresignedUrl } from '@repo/upload/client'
  ```

**Blocker Impact:** If REPA-002 incomplete, hooks will import from wrong path, causing runtime errors. Must verify REPA-002 completion before starting REPA-003.

---

## Technical Implementation Plan

### Challenge 1: Merge Divergent useUploaderSession Implementations

**Problem:**
- **main-app implementation (313 lines):** Tightly coupled to Redux auth state
  ```typescript
  import { useAppSelector } from '@/store/hooks'
  import { selectAuth } from '@/store/slices/authSlice'

  const { isAuthenticated, user } = useAppSelector(selectAuth)
  const userId = isAuthenticated ? user?.id : undefined
  ```

- **app-instructions-gallery implementation (261 lines):** Anonymous-only, no auth integration
  ```typescript
  // No Redux imports
  // Always uses anonymous session keys
  ```

**Solution: Dependency Injection**

**Approach:** Accept `isAuthenticated` and `userId` as hook parameters instead of importing from Redux.

**Proposed API:**
```typescript
export interface UseUploaderSessionOptions {
  route: string
  isAuthenticated?: boolean  // NEW: Optional, defaults to false
  userId?: string            // NEW: Optional, undefined if anonymous
  onRestore?: (session: UploaderSession) => void
}

export function useUploaderSession(options: UseUploaderSessionOptions): UseUploaderSessionResult {
  const { route, isAuthenticated = false, userId, onRestore } = options

  // Use provided auth state instead of Redux
  const storageKey = useMemo(() => {
    const anonId = !isAuthenticated ? getAnonSessionId() : undefined
    return getStorageKey(route, userId, anonId)
  }, [route, isAuthenticated, userId])

  // Rest of implementation unchanged
}
```

**Migration Path for Apps:**

**main-app (authenticated):**
```typescript
import { useUploaderSession } from '@repo/upload/hooks'
import { useAppSelector } from '@/store/hooks'
import { selectAuth } from '@/store/slices/authSlice'

function InstructionsNewPage() {
  const { isAuthenticated, user } = useAppSelector(selectAuth)

  const uploaderSession = useUploaderSession({
    route: '/instructions/new',
    isAuthenticated,
    userId: user?.id,
  })
  // ...
}
```

**app-instructions-gallery (anonymous):**
```typescript
import { useUploaderSession } from '@repo/upload/hooks'

function UploadPage() {
  const uploaderSession = useUploaderSession({
    route: '/upload',
    // isAuthenticated and userId omitted (defaults to anonymous)
  })
  // ...
}
```

**Backward Compatibility:** Breaking change required. Apps must update imports and pass auth state.

**Mitigation:** Provide clear migration guide in story completion comment. Consider deprecation warnings in v1 if phased rollout is needed.

---

### Challenge 2: Import Path Updates

**Current State:**
- Apps import from local hook files:
  ```typescript
  import { useUploadManager } from '@/hooks/useUploadManager'
  import { useUploaderSession } from '@/hooks/useUploaderSession'
  ```

**Target State:**
- Apps import from shared package:
  ```typescript
  import { useUploadManager, useUploaderSession } from '@repo/upload/hooks'
  ```

**Implementation Steps:**
1. Create hooks in `@repo/upload/hooks/` (after REPA-001)
2. Update imports in main-app components:
   - `apps/web/main-app/src/routes/pages/InstructionsNewPage.tsx`
   - `apps/web/main-app/src/components/Uploader/SessionProvider/index.tsx`
   - Any other consumers (grep for `from '@/hooks/useUpload`)
3. Update imports in app-instructions-gallery:
   - `apps/web/app-instructions-gallery/src/pages/upload-page.tsx`
   - `apps/web/app-instructions-gallery/src/components/Uploader/SessionProvider/index.tsx`
4. Delete old hook files:
   - `apps/web/main-app/src/hooks/useUploadManager.ts`
   - `apps/web/main-app/src/hooks/useUploaderSession.ts`
   - `apps/web/app-instructions-gallery/src/hooks/useUploadManager.ts`
   - `apps/web/app-instructions-gallery/src/hooks/useUploaderSession.ts`

**Verification:**
```bash
# Ensure no lingering imports
grep -r "from '@/hooks/useUpload" apps/web/main-app/src
grep -r "from '@/hooks/useUpload" apps/web/app-instructions-gallery/src
# Should return no results
```

---

### Challenge 3: Test Migration Strategy

**Current State:**
- `main-app/hooks/__tests__/useUploadManager.test.tsx` - 34 tests, 859 lines
- `main-app/hooks/__tests__/useUploaderSession.test.tsx` - 8 tests, 269 lines
- `app-instructions-gallery` has similar tests (not counted but exists)

**Decision: Hybrid Approach**

**Option A: Move all tests to @repo/upload (RECOMMENDED)**
- **Pros:** Tests live with implementation, single source of truth, easier maintenance
- **Cons:** Requires adapting Redux mocks, more upfront migration work

**Option B: Keep tests in apps (NOT RECOMMENDED)**
- **Pros:** Minimal test changes, apps verify their specific integration
- **Cons:** Duplicate test coverage, no tests in shared package, harder to catch regressions

**Recommendation:** **Option A** - Move tests to `@repo/upload/hooks/__tests__/`

**Implementation:**
1. Copy `useUploadManager.test.tsx` from main-app to `@repo/upload/hooks/__tests__/`
2. Adapt imports:
   ```diff
   - import { useUploadManager } from '../useUploadManager'
   + import { useUploadManager } from '../useUploadManager'
   - import { logger } from '@repo/logger'
   + import { logger } from '@repo/logger'
   - import { uploadToPresignedUrl } from '@/services/api/uploadClient'
   + import { uploadToPresignedUrl } from '@repo/upload/client'
   ```
3. Copy `useUploaderSession.test.tsx` and adapt:
   - Remove Redux Provider wrapper
   - Mock `isAuthenticated` and `userId` props directly
   - Remove Redux store setup
4. Keep 2-3 minimal smoke tests in each app to verify integration
5. Delete duplicate tests from apps after verification

**Smoke Tests in Apps (Integration Level):**
```typescript
// apps/web/main-app/src/hooks/__tests__/uploadHooks.integration.test.tsx
describe('Upload Hooks Integration', () => {
  it('should import useUploadManager from @repo/upload/hooks', () => {
    expect(useUploadManager).toBeDefined()
  })

  it('should import useUploaderSession from @repo/upload/hooks', () => {
    expect(useUploaderSession).toBeDefined()
  })

  it('should work with Redux auth state', () => {
    // Minimal test verifying auth integration works
  })
})
```

---

### Challenge 4: File Handle Tracking Complexity

**Issue:** useUploadManager uses a ref to track File objects for retry scenarios:

```typescript
const fileHandlesRef = useRef<Map<string, File>>(new Map())

// On addFiles:
fileHandlesRef.current.set(fileId, file)

// On retryFile:
const fileHandle = fileHandlesRef.current.get(fileId)
if (!fileHandle) {
  logger.error('File handle lost, cannot retry')
  return
}
```

**Concern:** Will this pattern work correctly when hook is in a shared package vs app-local?

**Analysis:**
- File objects are passed from consuming components (file input)
- Refs are React-managed, independent of package location
- **No issue expected** - ref behavior is identical in shared packages

**Verification:**
- Unit test: Mock File object, add to manager, verify ref stores correctly
- Integration test in app: Upload file, retry after "lost handle" scenario

**Risk:** LOW - React ref behavior is consistent across package boundaries

---

### Challenge 5: Session Key Strategy Verification

**Current Implementation:**
`@repo/upload-types` provides `getStorageKey` utility:

```typescript
export function getStorageKey(
  route: string,
  userId?: string,
  anonSessionId?: string
): string {
  if (userId) {
    return `uploader-session:${userId}`
  }
  if (anonSessionId) {
    return `uploader-session-anon:${anonSessionId}`
  }
  throw new Error('Either userId or anonSessionId required')
}
```

**Consolidated Hook Usage:**
```typescript
const storageKey = useMemo(() => {
  const anonId = !isAuthenticated ? getAnonSessionId() : undefined
  return getStorageKey(route, userId, anonId)
}, [route, isAuthenticated, userId])
```

**Verification Needed:**
- Ensure `getStorageKey` handles both userId and anonSessionId correctly
- Test session migration: anon key → user key when user logs in
- Verify `migrateSession` utility works with new key strategy

**Action Items:**
1. Review `@repo/upload-types` session utilities before starting
2. Add unit tests for session key generation with both auth states
3. Add unit test for session migration scenario

**Risk:** LOW - utility already exists and is tested, just needs verification

---

## Reuse Plan Verification

**Packages to Use (Confirmed Available):**
| Package | Usage | Status |
|---------|-------|--------|
| @repo/upload-types | Types, session utilities, calculateBatchState | ✅ Available |
| @repo/upload-client → @repo/upload/client | uploadToPresignedUrl, UploadError | ⏸️ Blocked by REPA-002 |
| @repo/logger | Logging (no console.log) | ✅ Available |
| @repo/app-component-library | useToast for session restoration | ✅ Available |

**Patterns to Reuse (Confirmed):**
- Debounced localStorage writes (300ms delay) - already implemented
- Session expiry buffer (30s before actual expiry) - already implemented
- File handle tracking for retry - already implemented
- Discriminated status types (queued, uploading, success, failed, expired, canceled) - already implemented
- AbortController for cancellation - already implemented

---

## Risk Assessment

### High Risks (Must Address)
1. **Dependency Chain Blocker:** Cannot start until REPA-001 and REPA-002 complete
   - **Mitigation:** Coordinate with PM to sequence stories correctly
   - **Timeline Impact:** Delays this story by however long dependencies take

2. **Breaking Changes in useUploaderSession API:** Apps must update to pass auth state
   - **Mitigation:** Provide clear migration guide, test in both apps thoroughly
   - **Timeline Impact:** Adds 1-2 hours for app-level refactoring

### Medium Risks (Monitor)
3. **Test Migration Complexity:** Redux mocks must be removed/adapted
   - **Mitigation:** Use haiku for test refactoring, lean on existing test patterns
   - **Timeline Impact:** Adds 2-3 hours for test adaptation

4. **Session Migration Edge Cases:** Anon → Authenticated flow has subtle timing issues
   - **Mitigation:** Add dedicated unit test, manual E2E verification
   - **Timeline Impact:** Adds 1 hour for extra testing

### Low Risks (Accept)
5. **File Handle Tracking in Shared Package:** Refs might behave differently (unlikely)
   - **Mitigation:** Verify with unit test, no special handling needed
   - **Timeline Impact:** None (already part of standard testing)

---

## Implementation Sequence

**Prerequisites (Blocking):**
1. ✅ Verify REPA-001 complete: `@repo/upload/hooks` directory exists
2. ✅ Verify REPA-002 complete: `@repo/upload/client` available
3. ✅ Review `@repo/upload-types` session utilities

**Phase 1: Create Consolidated Hooks (4 hours)**
1. Create `@repo/upload/hooks/useUploadManager.ts`
   - Copy from main-app implementation (610 lines)
   - Update import: `@repo/upload/client` for upload client
   - No auth dependencies, should work as-is
2. Create `@repo/upload/hooks/useUploaderSession.ts`
   - Merge main-app (313 lines) and app-instructions-gallery (261 lines)
   - Refactor Redux imports → dependency injection (isAuthenticated, userId params)
   - Preserve all existing functionality
3. Create barrel export: `@repo/upload/hooks/index.ts`
   ```typescript
   export { useUploadManager } from './useUploadManager'
   export { useUploaderSession } from './useUploaderSession'
   export type { UseUploadManagerOptions, UseUploadManagerResult } from './useUploadManager'
   export type { UseUploaderSessionOptions, UseUploaderSessionResult } from './useUploaderSession'
   ```

**Phase 2: Migrate Tests (3 hours)**
1. Copy `useUploadManager.test.tsx` to `@repo/upload/hooks/__tests__/`
   - Adapt imports (upload client path)
   - Run tests, fix any failures
2. Copy `useUploaderSession.test.tsx` to `@repo/upload/hooks/__tests__/`
   - Remove Redux Provider wrapper
   - Mock auth props directly
   - Add tests for authenticated vs anonymous modes
   - Add test for session migration (anon → authenticated)
3. Run full test suite: `pnpm test --filter=@repo/upload`
   - Fix any failures
   - Verify coverage >= 45%

**Phase 3: Update Apps (2 hours)**
1. Update main-app imports:
   - Find all usages: `grep -r "from '@/hooks/useUpload" apps/web/main-app/src`
   - Update to `@repo/upload/hooks`
   - Pass `isAuthenticated` and `userId` props to useUploaderSession
2. Update app-instructions-gallery imports:
   - Find all usages
   - Update to `@repo/upload/hooks`
   - No auth props needed (defaults to anonymous)
3. Run app tests: `pnpm test --filter=main-app --filter=app-instructions-gallery`
   - Fix any failures

**Phase 4: Cleanup & Verification (1 hour)**
1. Delete old hook files:
   - `apps/web/main-app/src/hooks/useUploadManager.ts`
   - `apps/web/main-app/src/hooks/useUploaderSession.ts`
   - `apps/web/app-instructions-gallery/src/hooks/useUploadManager.ts`
   - `apps/web/app-instructions-gallery/src/hooks/useUploaderSession.ts`
2. Delete old test files (or keep as minimal smoke tests)
3. Run full checks:
   - `pnpm check-types:all`
   - `pnpm lint:all`
   - `pnpm test:all`
4. Manual verification:
   - Test upload flow in main-app
   - Test upload flow in app-instructions-gallery
   - Verify session restoration works
   - Verify authenticated vs anonymous modes

**Total Estimated Time:** 10 hours (2-3 days with QA and manual testing)

---

## Quality Gates

**Before Starting:**
- [ ] REPA-001 complete: @repo/upload package structure exists
- [ ] REPA-002 complete: @repo/upload/client available
- [ ] All existing upload tests passing in both apps

**Before Merging:**
- [ ] All unit tests pass: `pnpm test --filter=@repo/upload`
- [ ] All app tests pass: `pnpm test:all`
- [ ] TypeScript compiles: `pnpm check-types:all`
- [ ] Linting passes: `pnpm lint:all`
- [ ] Manual verification: Upload flows work in both apps
- [ ] No lingering imports: `grep -r "from '@/hooks/useUpload" apps/web` returns nothing
- [ ] Old hook files deleted

---

## Conclusion

**Feasibility: MEDIUM - BLOCKED but Implementable After Dependencies**

**Key Takeaways:**
1. **Dependencies are blocking:** Cannot start until REPA-001 and REPA-002 complete
2. **Technical complexity is manageable:** Dependency injection refactor is straightforward
3. **Test migration is critical:** Must move tests to package for maintainability
4. **Breaking changes are acceptable:** Apps can easily adapt to new API
5. **Estimated effort is reasonable:** 5 SP, 2-3 days of work

**Recommendation: PROCEED** with story as written, but ensure REPA-001 and REPA-002 are prioritized first. Once dependencies are resolved, this story should be straightforward to implement following the plan above.
