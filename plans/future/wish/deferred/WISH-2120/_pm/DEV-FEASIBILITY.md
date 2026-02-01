# Dev Feasibility: WISH-2120 - Test Utility Helpers

## Feasibility Summary

- **Feasible for MVP:** Yes
- **Confidence:** High
- **Why:** This is a straightforward test infrastructure story with no external dependencies, no runtime code changes, and no deployment requirements. The utilities are pure functions that wrap existing patterns already proven in the codebase.

---

## Likely Change Surface (Core Only)

### Areas/Packages

| Location | Change Type | Description |
|----------|-------------|-------------|
| `apps/web/app-wishlist-gallery/src/test/utils/` | **New** | Test utilities directory with createMockFile, mockS3Upload |
| `apps/web/app-wishlist-gallery/src/test/utils/index.ts` | **New** | Barrel export for utilities |
| `apps/web/app-wishlist-gallery/src/test/utils/__tests__/` | **New** | Unit tests for utilities |
| `apps/web/app-wishlist-gallery/src/hooks/__tests__/useS3Upload.test.ts` | **Refactor** | Replace boilerplate with utility calls |

### Endpoints

- **None** - This is test infrastructure only

### Critical Deploy Touchpoints

- **None** - Test-only code, not deployed to production

---

## MVP-Critical Risks (Max 5)

### Risk 1: MSW Handler Isolation

**Risk:** mockS3Upload handlers could conflict if cleanup is not properly called between tests.

**Why it blocks MVP:** Tests become flaky and unreliable if handlers leak.

**Required mitigation:**
- Use `server.use()` with `beforeEach`/`afterEach` patterns
- Include cleanup function in return value
- Add explicit test for cleanup isolation

### Risk 2: File Content Generation Performance

**Risk:** Creating large mock files (10MB) could slow down test suite.

**Why it blocks MVP:** Slow tests reduce developer productivity and CI efficiency.

**Required mitigation:**
- Use lazy content generation (repeat patterns instead of random bytes)
- Add optional `lazyContent: true` flag for large files
- Document performance characteristics

---

## Missing Requirements for MVP

1. **Explicit size units:** AC should clarify if `size` parameter is in bytes or KB. Recommend: bytes (matches File API).

2. **MSW version compatibility:** Current MSW setup uses v2 syntax (`http.get` not `rest.get`). Utilities must use v2 patterns.

3. **Handler scope:** Should mockS3Upload mock both presign endpoint AND S3 PUT, or only one? Recommend: both, with separate scenarios.

---

## MVP Evidence Expectations

### Proof Needed

1. **Utility Tests Pass:**
   ```bash
   pnpm --filter app-wishlist-gallery test src/test/utils
   ```

2. **Existing Tests Still Pass After Refactoring:**
   ```bash
   pnpm --filter app-wishlist-gallery test src/hooks/__tests__/useS3Upload.test.ts
   ```

3. **Type Check Passes:**
   ```bash
   pnpm check-types
   ```

4. **Code Reduction Measured:**
   - Before: ~100 lines of boilerplate in useS3Upload.test.ts
   - After: ~20 lines using utilities
   - Documented in PR description

### Critical CI/Deploy Checkpoints

- **CI only** (no production deployment)
- Vitest test runner passes
- TypeScript compilation succeeds
- ESLint passes with no errors

---

## Architecture Notes

### Reuse Patterns

- `createMockFile` follows the same pattern as existing `new File()` calls but with sensible defaults
- `mockS3Upload` wraps MSW `http` handlers following existing `handlers.ts` patterns
- Both utilities should be side-effect free and pure functions

### TypeScript Types

```typescript
// createMockFile options
interface CreateMockFileOptions {
  name?: string     // default: 'test-image.jpg'
  type?: string     // default: 'image/jpeg'
  size?: number     // default: 1024 (bytes)
  content?: string  // optional explicit content
}

// mockS3Upload options
interface MockS3UploadOptions {
  scenario: 'success' | 'presign-error' | 's3-error' | 'timeout'
  statusCode?: number        // default depends on scenario
  delay?: number             // default: 0 (ms)
  progressSteps?: number[]   // default: [100]
}

// mockS3Upload return type
type MockS3UploadCleanup = () => void
```

---

## Recommendation

**Proceed with implementation.** This story is low-risk, high-value test infrastructure that will improve developer experience across all S3 upload tests.
