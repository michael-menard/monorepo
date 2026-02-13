# Dev Feasibility Review: REPA-002 - Migrate Upload Client Functions

## Feasibility Summary

- **Feasible for MVP**: Yes
- **Confidence**: High
- **Why**: This is a straightforward code migration with clear scope and no new functionality. All code already exists and works - we're only moving it. The migration sequence is well-defined and low-risk for the core user journey. The main challenge is thoroughness (updating all 52 import sites), not technical complexity.

---

## Likely Change Surface (Core Only)

### Packages (Core Journey)
1. **`packages/core/upload/client/`** (NEW)
   - `xhr.ts` - Move from `@repo/upload-client/src/xhr.ts`
   - `manager.ts` - Move from `@repo/upload-client/src/manager.ts`
   - `types.ts` - Move from `@repo/upload-client/src/types.ts`
   - `finalize.ts` - NEW, consolidate from app-level implementations
   - `index.ts` - Export all client functions

2. **`packages/core/upload/index.ts`** (MODIFY)
   - Add exports for client functions
   - Maintain barrel export structure

3. **`apps/web/main-app/src/routes/pages/InstructionsNewPage.tsx`** (MODIFY)
   - Change import: `from '@/services/api/finalizeClient'` → `from '@repo/upload'`

4. **`apps/web/app-instructions-gallery/src/pages/upload-page.tsx`** (MODIFY)
   - Change import: `from '@/services/api/finalizeClient'` → `from '@repo/upload'`

5. **52 files importing `@repo/upload-client`** (MODIFY)
   - Change import: `from '@repo/upload-client'` → `from '@repo/upload'`
   - Verify specific exports still available (uploadFile, createUploadManager, etc.)

### Endpoints (Core Journey)
**No endpoint changes** - This is pure client-side migration.

Existing endpoint (unchanged):
- **POST `/api/mocs/uploads/finalize`** - Finalize upload session
  - Request/response contracts unchanged
  - CSRF token handling preserved
  - Error responses (409, 429, 400) unchanged

### Critical Deploy Touchpoints
1. **Package dependencies** - All apps must update `package.json` to include `@repo/upload`
2. **Build system** - Turborepo will rebuild dependent apps automatically
3. **TypeScript compilation** - Must pass `pnpm check-types:all` after import updates
4. **No runtime environment changes** - No env vars, no config files, no infrastructure

---

## MVP-Critical Risks

### Risk 1: Broken Import After Migration
**Why it blocks MVP**: If even one of the 52 import sites is missed, that app will fail to build or have runtime errors. Users cannot upload MOCs.

**Required mitigation**:
- MUST run `pnpm build` after all import updates to verify no broken imports
- MUST run `pnpm check-types:all` to catch TypeScript errors
- MUST use global search to verify all `@repo/upload-client` references removed
- MUST run all test suites to catch runtime import failures

**Verification**:
```bash
# After migration, run these commands:
pnpm build                    # Verify all apps build
pnpm check-types:all          # Verify TypeScript compilation
rg "@repo/upload-client" --type ts  # Verify no old imports remain
pnpm test:all                 # Verify no runtime errors
```

### Risk 2: CSRF Token Handling Broken
**Why it blocks MVP**: If CSRF token is not passed correctly, all authenticated upload finalize requests will fail with 403. Users cannot complete uploads.

**Required mitigation**:
- MUST preserve exact CSRF token extraction logic from old `finalizeClient.ts`
- MUST include CSRF token in request headers: `X-CSRF-Token: {{token}}`
- MUST test authenticated upload flow end-to-end before deploying

**Verification**:
```typescript
// Test: CSRF token included in request
const result = await finalizeSession({
  sessionId: 'test-session',
  fileKeys: ['key1'],
  csrfToken: 'test-csrf-token'
})
// Assert: Request headers include X-CSRF-Token: test-csrf-token
```

### Risk 3: Error Handling Regression (409/429/400)
**Why it blocks MVP**: If error handling logic changes, users will see generic errors instead of actionable messages (e.g., "Slug conflict - try different name" vs "Upload failed").

**Required mitigation**:
- MUST port exact error handling logic from old `finalizeClient.ts` (339 lines)
- MUST preserve error response parsing for:
  - 409: Extract `suggestedSlug` from response body
  - 429: Extract `Retry-After` from response headers
  - 400: Extract `fileErrors` array from response body
- MUST test all three error cases with MSW mocks

**Verification**:
```typescript
// Test: 409 conflict error handling
mockFinalize.mockResolvedValueOnce({
  status: 409,
  body: { error: 'SLUG_CONFLICT', suggestedSlug: 'alt-slug' }
})
const result = await finalizeSession({...})
expect(result.success).toBe(false)
expect(result.error.code).toBe('CONFLICT')
expect(result.error.suggestedSlug).toBe('alt-slug')
```

---

## Missing Requirements for MVP

### Requirement 1: REPA-001 Completion
**Decision needed**: REPA-001 (Create @repo/upload Package Structure) MUST be completed before starting REPA-002.

**Concrete text for PM**:
> **DEPENDENCY: REPA-001 MUST BE COMPLETED FIRST**
>
> Before starting REPA-002, verify:
> - [ ] `packages/core/upload/` directory exists
> - [ ] `packages/core/upload/package.json` exists with correct dependencies (zod, vitest)
> - [ ] `packages/core/upload/client/` directory exists
> - [ ] `packages/core/upload/index.ts` exists with barrel exports
> - [ ] REPA-001 marked as "Completed" in stories.index.md
>
> If REPA-001 not completed, BLOCK REPA-002 implementation.

### Requirement 2: Exact Export Compatibility
**Decision needed**: Confirm that all existing exports from `@repo/upload-client` will be available from `@repo/upload` after migration.

**Concrete text for PM**:
> **EXPORT COMPATIBILITY REQUIREMENT**
>
> The following exports from `@repo/upload-client` MUST remain available from `@repo/upload`:
> - `uploadFile(file, url, options?)` - XHR upload function
> - `uploadToPresignedUrl(file, presignedUrl, options?)` - S3 upload function
> - `createUploadManager(options)` - Upload manager factory
> - `UploadTask` - Type for upload task
> - `UploadProgress` - Type for progress events
> - `UploadError` - Error class
>
> Additionally, new exports for finalize functionality:
> - `finalizeSession(request)` - Finalize upload session
> - `FinalizeError` - Error class for finalize errors
> - `FinalizeRequest` - Zod schema for request
> - `FinalizeSuccessResponse` - Zod schema for success response
> - `FileValidationError` - Zod schema for validation errors
> - `ConflictErrorDetails` - Zod schema for conflict errors
>
> Verify all exports available after migration by importing in a test file.

---

## MVP Evidence Expectations

### Evidence 1: All Apps Build Successfully
**Proof needed**: After all import updates, run `pnpm build` and capture output showing all apps built without errors.

**Command**:
```bash
pnpm build > build-output.txt 2>&1
# Expected: "✓ Built in XXXms" for all packages
# No errors or warnings about missing imports
```

**Critical checkpoint**: If build fails, identify broken imports immediately and fix before proceeding.

### Evidence 2: All Tests Pass
**Proof needed**: After migration, run `pnpm test:all` and capture output showing all tests passed with no regressions.

**Command**:
```bash
pnpm test:all > test-output.txt 2>&1
# Expected: "✓ All tests passed" with no failures
# Test coverage meets 45% minimum threshold
```

**Critical checkpoint**: If tests fail, investigate immediately - do not deploy until all tests pass.

### Evidence 3: Type Check Passes
**Proof needed**: Run `pnpm check-types:all` and verify no TypeScript errors.

**Command**:
```bash
pnpm check-types:all > typecheck-output.txt 2>&1
# Expected: No TypeScript compilation errors
# All imports resolve correctly
```

**Critical checkpoint**: TypeScript errors = broken imports or type mismatches. Fix before deploying.

### Evidence 4: Upload Flow Works End-to-End
**Proof needed**: Manual smoke test of upload flow in main-app and app-instructions-gallery.

**Test steps**:
1. Navigate to `/instructions/new` in main-app (authenticated user)
2. Select and upload a test file (1-2MB image)
3. Observe upload progress (0-100%)
4. Complete finalization
5. Verify MOC created successfully
6. Repeat in app-instructions-gallery (anonymous user)

**Expected outcome**: Both upload flows complete without errors. No console errors. MOC data correct.

**Critical checkpoint**: If upload fails, check network tab for API errors. Verify finalize request includes CSRF token and correct payload.

---

## Implementation Sequence (MVP-Critical)

The migration MUST follow this exact sequence to avoid breaking imports:

### Step 1: Verify REPA-001 Completed
- [ ] Check `packages/core/upload/` exists
- [ ] Check `packages/core/upload/package.json` exists
- [ ] Check `packages/core/upload/client/` directory exists
- [ ] If any missing → BLOCK and wait for REPA-001

### Step 2: Create Migrated Client Files
- [ ] Copy `@repo/upload-client/src/xhr.ts` → `@repo/upload/client/xhr.ts`
- [ ] Copy `@repo/upload-client/src/manager.ts` → `@repo/upload/client/manager.ts`
- [ ] Copy `@repo/upload-client/src/types.ts` → `@repo/upload/client/types.ts`
- [ ] Create `@repo/upload/client/finalize.ts` from app-level `finalizeClient.ts`
- [ ] Copy tests from `@repo/upload-client/__tests__/` → `@repo/upload/client/__tests__/`

### Step 3: Update Exports
- [ ] Add client exports to `@repo/upload/client/index.ts`
- [ ] Add client re-exports to `@repo/upload/index.ts`
- [ ] Verify all existing exports available (uploadFile, createUploadManager, etc.)
- [ ] Add new finalize exports (finalizeSession, FinalizeError, schemas)

### Step 4: Update Dependencies
- [ ] Add `@repo/upload` to all consuming app `package.json` files
- [ ] Run `pnpm install` to update workspace dependencies
- [ ] Verify `node_modules/@repo/upload` symlinked correctly

### Step 5: Update Import Sites (52 files)
- [ ] Use global find-replace: `from '@repo/upload-client'` → `from '@repo/upload'`
- [ ] Update `InstructionsNewPage.tsx`: change `from '@/services/api/finalizeClient'` → `from '@repo/upload'`
- [ ] Update `upload-page.tsx`: change `from '@/services/api/finalizeClient'` → `from '@repo/upload'`
- [ ] Manually review each changed file to verify specific imports still correct

### Step 6: Verify Build and Tests
- [ ] Run `pnpm build` - MUST pass with no errors
- [ ] Run `pnpm check-types:all` - MUST pass with no errors
- [ ] Run `pnpm test:all` - MUST pass with no regressions
- [ ] Check test coverage - MUST meet 45% threshold

### Step 7: Delete Duplicate Files
- [ ] Delete `apps/web/main-app/src/services/api/finalizeClient.ts`
- [ ] Delete `apps/web/app-instructions-gallery/src/services/api/finalizeClient.ts`
- [ ] Verify no references to deleted files remain (grep for `@/services/api/finalizeClient`)

### Step 8: Deprecate Old Package
- [ ] Add deprecation notice to `@repo/upload-client/package.json`
- [ ] Update `@repo/upload-client/README.md` with migration instructions
- [ ] Verify old package still functional (for rollback)

### Step 9: Final Verification
- [ ] Manual smoke test: Upload flow in main-app (authenticated)
- [ ] Manual smoke test: Upload flow in app-instructions-gallery (anonymous)
- [ ] Check browser console for errors (MUST be clean)
- [ ] Check network tab for finalize request (MUST include CSRF token)
- [ ] Verify error handling works (test 409 conflict scenario)

**CRITICAL**: Do not skip any step. Each step depends on the previous completing successfully.

---

**DEV-FEASIBILITY ASSESSMENT: APPROVED FOR MVP**

This story is feasible for MVP implementation with high confidence. The code migration is straightforward, the scope is well-defined, and the core user journey (upload MOCs) is protected by comprehensive testing. The main risk is thoroughness (updating all 52 import sites), which is mitigated by clear verification steps.

**Estimated Implementation Time**: 3-4 hours for an experienced developer following the step-by-step sequence.

**Recommended Story Points**: 2 SP (matches epic plan estimate)

**Next Steps**: Create complete story file with acceptance criteria aligned to implementation sequence and MVP evidence checkpoints.
