# WISH-2022: Client-side Image Compression - Test Plan

**Story ID:** WISH-2022
**Feature:** Client-side Image Compression
**Acceptance Criteria Count:** 10
**Test Scope:** Unit (hook), Integration (hook + component), Browser (Playwright E2E)

---

## Scope Summary

### Endpoints Touched
- **No new endpoints.** Uses existing `getWishlistImagePresignUrl` mutation (WISH-2002).
- Compression happens client-side before presign request; presign request receives compressed blob metadata.

### UI Touched
- **Yes.** Upload form (`WishlistForm` component, `AddItemPage`) will include:
  - Compression progress indicator: "Compressing image... X%"
  - Toast notification after compression: "Image compressed: X MB → Y MB"
  - Checkbox: "High quality (skip compression)"
  - Image preview update (post-compression, pre-upload)

### Data/Storage Touched
- **Client-side localStorage only.** User preference for compression toggle stored in `wishlist:preferences:imageCompression` (default: enabled).
- **No database schema changes.** Compressed blob replaces original file in existing S3 upload workflow.

---

## Happy Path Tests

### Test 1: High-resolution image auto-compressed
**Acceptance Criteria:** 1, 2, 3, 4, 5, 9, 10

**Setup:**
- User navigates to AddItemPage (or form modal)
- Browser environment supports canvas/blob APIs (all modern browsers)
- No compression preference set in localStorage (defaults to enabled)

**Action:**
1. User selects a high-resolution image file: 5MB, 4032×3024px, JPEG format (simulating modern smartphone photo)
2. `useS3Upload.upload()` is called with the file
3. Compression begins automatically (before presign request)
4. Progress callback fires multiple times (0%, 25%, 50%, 75%, 100%)

**Expected Outcome:**
- Compression state transitions: `idle` → `compressing` → `compressed` → `preparing` (presign) → `uploading` → `complete`
- Progress indicator shows: "Compressing image... 45%" (or similar percentage)
- Toast notification displays: "Image compressed: 5.2 MB → 0.8 MB" (or similar sizes)
- Image preview in form updates with compressed image (visually identical at thumbnail size)
- Filename and MIME type preserved: original `photo.jpg` remains `photo.jpg` (or converted to JPEG)
- Compressed blob size: ≤ 1MB (per spec: maxSizeMB: 1)
- Compressed dimensions: max(width, height) ≤ 1920px
- Presign request receives fileName and mimeType from compressed blob metadata

**Evidence to Capture:**
- Hook state transitions: log `state` at each step
- Compression progress values: capture `percent` from progress callbacks
- Toast message: assert exact text "Image compressed: X.X MB → Y.Y MB"
- File metadata: assert compressed blob size, dimensions, MIME type
- Presign request payload: assert `fileName` and `mimeType` fields
- S3 upload success: assert final S3 URL returned and imageKey populated

**Test File:** `apps/web/app-wishlist-gallery/src/hooks/__tests__/useS3Upload.test.ts` (new test case)

---

### Test 2: Small image skips compression
**Acceptance Criteria:** 5

**Setup:**
- User navigates to AddItemPage
- Compression preference enabled (default)
- Small image file: 300KB, 1200×800px, JPEG format

**Action:**
1. User selects the small image
2. `useS3Upload.upload()` is called

**Expected Outcome:**
- No compression progress indicator shown (skipped automatically)
- State transitions: `idle` → `preparing` (presign) → `uploading` → `complete`
- Presign request uses original file (not a compressed blob)
- No toast notification for compression (only upload success if applicable)
- File size unchanged: 300KB → 300KB

**Evidence to Capture:**
- State transitions: no `compressing` state logged
- Presign request: fileName matches original filename, mimeType matches original
- File size assertion: `file.size === originalSize`
- HTTP request logs: presign request body has original file metadata

**Test File:** `apps/web/app-wishlist-gallery/src/hooks/__tests__/useS3Upload.test.ts` (new test case)

---

### Test 3: User toggles high-quality checkbox to skip compression
**Acceptance Criteria:** 7

**Setup:**
- User navigates to AddItemPage with form displayed
- High-resolution image ready to upload: 5MB, 4032×3024px

**Action:**
1. User checks "High quality (skip compression)" checkbox
2. User selects high-resolution image
3. `useS3Upload.upload()` is called

**Expected Outcome:**
- Compression is skipped entirely (no progress indicator, no compression state)
- State transitions directly: `idle` → `preparing` → `uploading` → `complete`
- Original 5MB file is uploaded to S3 unchanged
- Preference is persisted in localStorage under key `wishlist:preferences:imageCompression` with value `{ enabled: false }`
- On next page load, checkbox remains checked (preference persisted)

**Evidence to Capture:**
- localStorage entry: `JSON.stringify(localStorage.getItem('wishlist:preferences:imageCompression'))`
- State transitions: no `compressing` state
- Presign request: original file metadata sent
- S3 upload: original file size (5MB) uploaded

**Test File:** `apps/web/app-wishlist-gallery/src/hooks/__tests__/useS3Upload.test.ts` + E2E test in Playwright

---

### Test 4: Compression happens before presign request
**Acceptance Criteria:** 8

**Setup:**
- High-resolution image: 5MB, 4032×3024px
- `getPresignUrl` mutation mocked to track call timing

**Action:**
1. User selects image and starts upload
2. Monitor timing of compression state vs presign request

**Expected Outcome:**
- Compression completes first (state: `compressing`, then `compressed`)
- After compression, presign request is initiated (state: `preparing`)
- presign request payload contains compressed file metadata (name, MIME type, size ≤ 1MB)
- Order of operations: compression → presign → upload

**Evidence to Capture:**
- State transition timeline: log timestamps for each state change
- Presign call timing: assert presign called after compression complete
- Presign payload: assert file size ≤ 1MB in request
- Hook return value: `imageUrl` and `imageKey` populated on success

**Test File:** `apps/web/app-wishlist-gallery/src/hooks/__tests__/useS3Upload.test.ts` (new test case)

---

### Test 5: Compressed image preview updates in form
**Acceptance Criteria:** 10

**Setup:**
- WishlistForm component rendered on AddItemPage
- Image input field visible with preview area

**Action:**
1. User selects high-resolution image (5MB)
2. Compression completes
3. User can see updated preview in form before submitting

**Expected Outcome:**
- Preview element (img or preview canvas) updates with compressed image
- Visual quality is acceptable (JPEG quality 0.8, so slight compression artifacts acceptable)
- Preview dimensions fit form layout (no overflow)
- User can proceed to upload with preview showing final result

**Evidence to Capture:**
- DOM assertion: `<img>` or preview element has `src` attribute pointing to compressed blob URL
- Image rendering: no console errors related to image decoding
- Form state: image data correctly bound to form object before submission

**Test File:** Playwright E2E test in `apps/web/playwright/` (new test file)

---

## Error Cases

### Error Case 1: Compression library throws error
**Acceptance Criteria:** 6 (graceful fallback)

**Setup:**
- High-resolution image: 5MB
- `browser-image-compression` library throws error (mocked in unit test)
- Or browser canvas API not available (simulated)

**Action:**
1. User selects image, compression is initiated
2. Compression throws exception during processing

**Expected Outcome:**
- Error is caught gracefully
- State transitions: `idle` → `compressing` → `error` (or back to `idle` with warning)
- Warning toast displayed: "Image compression failed. Uploading original file..." (or similar message)
- Original (uncompressed) file is uploaded to S3 as fallback
- Upload succeeds with original 5MB file
- Final S3 URL and imageKey are populated

**Evidence to Capture:**
- Error handler invoked: assert error caught and logged
- Toast message: "Image compression failed..." displayed to user
- Presign request: uses original file metadata (5MB)
- S3 upload success: original file uploaded despite compression error
- No silent failures: user is informed via toast

**Test File:** `apps/web/app-wishlist-gallery/src/hooks/__tests__/useS3Upload.test.ts` (new test case)

---

### Error Case 2: Unsupported image format
**Acceptance Criteria:** 6 (graceful fallback)

**Setup:**
- User selects animated GIF or other format that browser-image-compression may not support
- Or HEIC/HEIF format (modern iPhone photos)

**Action:**
1. User selects animated GIF (2MB)
2. Compression is initiated

**Expected Outcome:**
- Compression library detects unsupported format and skips compression (or throws error caught in handler)
- Original GIF is uploaded as-is
- No progress indicator shown (format not compressible)
- Upload completes successfully
- No visual degradation (GIF animation preserved if uploaded)

**Evidence to Capture:**
- State transitions: no compression state (or error caught and recovered)
- Presign request: GIF MIME type sent (image/gif)
- S3 upload: original GIF file uploaded
- File integrity: GIF animation or image quality intact post-upload

**Test File:** `apps/web/app-wishlist-gallery/src/hooks/__tests__/useS3Upload.test.ts` (new test case)

---

### Error Case 3: Browser compatibility issue (missing canvas API)
**Acceptance Criteria:** 6 (graceful fallback)

**Setup:**
- Simulated browser environment with canvas API unavailable (older browser or sandboxed environment)
- Unit test: mock `HTMLCanvasElement` or `canvas.toBlob` to throw error

**Action:**
1. User selects high-resolution image
2. Compression is attempted

**Expected Outcome:**
- Compression fails due to missing canvas API
- Error is caught and handled
- Original file uploaded as fallback
- Upload succeeds with original file
- User is informed via warning toast or silent fallback (implementation detail)

**Evidence to Capture:**
- Feature detection: code checks for canvas API availability before attempting compression
- Error handling: try-catch around compression call
- Fallback behavior: original file uploaded if compression fails
- S3 upload success: final URL populated on success

**Test File:** `apps/web/app-wishlist-gallery/src/hooks/__tests__/useS3Upload.test.ts` (new test case)

---

### Error Case 4: Presign request fails (after compression)
**Acceptance Criteria:** Implicit (error handling in existing flow)

**Setup:**
- Compression completes successfully (blob ≤ 1MB)
- `getPresignUrl` mutation throws error (network failure, auth issue, server error)

**Action:**
1. User selects image, compression starts
2. Compression completes
3. Presign request is made and fails with 500 or 401 error

**Expected Outcome:**
- Error is caught after compression completes
- State transitions: `idle` → `compressing` → `compressed` → `preparing` → `error`
- Error message displayed: "Failed to get presigned URL" or similar
- Upload is aborted
- User can retry or cancel

**Evidence to Capture:**
- Error message: assert specific error text from presign failure
- State: `error` state set with error message
- No orphaned blob: compressed blob not retained if presign fails

**Test File:** `apps/web/app-wishlist-gallery/src/hooks/__tests__/useS3Upload.test.ts` (existing test case adapted)

---

## Edge Cases (Reasonable)

### Edge Case 1: Image already below 500KB and dimensions < 1920×1920
**Acceptance Criteria:** 5 (skip compression for small images)

**Setup:**
- Image: 450KB, 1200×800px, JPEG

**Action:**
1. User selects image
2. `useS3Upload.upload()` called

**Expected Outcome:**
- Compression skipped automatically
- State: `idle` → `preparing` → `uploading` → `complete`
- No compression progress indicator shown
- File uploaded as-is (450KB)
- No toast notification about compression

**Evidence to Capture:**
- State transitions: no `compressing` state
- HTTP request: original file metadata in presign request
- Upload: no compression applied

**Test File:** `apps/web/app-wishlist-gallery/src/hooks/__tests__/useS3Upload.test.ts` (new test case)

---

### Edge Case 2: Very large image (20MB+) warning
**Acceptance Criteria:** Implicit (error/warning message for edge case)

**Setup:**
- Image: 25MB, 8000×6000px (very large)

**Action:**
1. User selects very large image
2. Compression is attempted

**Expected Outcome:**
- Warning toast or UI message: "Large image detected. Compression may take a moment." (or similar)
- Compression proceeds with potential for browser memory warning
- If compression succeeds, file reduced to ≤ 1MB
- If compression fails (out of memory), fallback to original upload (with error message)
- User is not blocked; upload continues even if compression is slow

**Evidence to Capture:**
- Warning message displayed (if applicable)
- Compression timeout: if compression takes > 10 seconds, allow user to skip (or show option to proceed)
- Memory usage: no unhandled out-of-memory errors
- Upload success: file uploaded successfully (compressed or original)

**Test File:** `apps/web/app-wishlist-gallery/src/hooks/__tests__/useS3Upload.test.ts` (new test case) + Playwright (manual verification of UI message)

---

### Edge Case 3: Compression size increases (rare)
**Acceptance Criteria:** Implicit (use smaller of compressed vs original)

**Setup:**
- Image: 800KB, already well-optimized, compression attempt increases size

**Action:**
1. User selects already-optimized image
2. Compression is attempted
3. Compressed blob is larger than original (e.g., 850KB vs 800KB)

**Expected Outcome:**
- Code detects larger compressed blob
- Original file is used instead (800KB)
- Upload proceeds with smaller original file
- No misleading toast (e.g., don't show "compressed 800KB → 850KB")

**Evidence to Capture:**
- Compression logic: check `compressedBlob.size > originalFile.size`
- Fallback: use original file if compression increases size
- Presign request: uses smaller file

**Test File:** `apps/web/app-wishlist-gallery/src/hooks/__tests__/useS3Upload.test.ts` (new test case)

---

### Edge Case 4: User uploads same image twice
**Acceptance Criteria:** Implicit (no state bleed between uploads)

**Setup:**
- First upload: high-resolution image, compression succeeds
- Second upload: different image or same image again

**Action:**
1. First upload completes, state set to `complete`
2. User calls `reset()` to clear state
3. User selects second image and uploads

**Expected Outcome:**
- State is properly reset between uploads
- No compression progress from first upload carries over
- Second upload starts fresh: `idle` → `compressing` → ... → `complete`
- Both uploads complete independently

**Evidence to Capture:**
- State transitions: `reset()` clears state to `idle`
- Second upload: independent state machine (no interference from first)
- Hook return values: `progress`, `error` properly reset

**Test File:** `apps/web/app-wishlist-gallery/src/hooks/__tests__/useS3Upload.test.ts` (new test case)

---

### Edge Case 5: User cancels upload during compression
**Acceptance Criteria:** Implicit (abort handling)

**Setup:**
- Large image (5MB) selected, compression ongoing
- `cancel()` method available on hook

**Action:**
1. User selects image, compression starts
2. Compression is ~50% complete
3. User clicks "Cancel" button, triggering `cancel()` call

**Expected Outcome:**
- Compression is aborted (web worker thread terminated or polling stopped)
- State transitions: `compressing` → `idle`
- Progress set to 0
- Error cleared
- No presign request made
- User can select a different image immediately after

**Evidence to Capture:**
- State: transitions to `idle` after cancel
- Progress: reset to 0
- Error: cleared
- No lingering async operations

**Test File:** `apps/web/app-wishlist-gallery/src/hooks/__tests__/useS3Upload.test.ts` (new test case)

---

### Edge Case 6: Compression settings boundary values
**Acceptance Criteria:** 2 (compression settings specification)

**Setup:**
- Image exactly at boundary values:
  - 1920px width, 1920px height
  - 1920px width, 1000px height (max width, smaller height)
  - 1000px width, 1920px height (smaller width, max height)
  - Exactly 500KB file size
  - Exactly 1MB compressed file size

**Action:**
1. User selects image at boundary dimensions/size
2. Compression applied

**Expected Outcome:**
- Image at 1920×1920 is not further compressed (respects max constraint)
- Image at 1920×1000 is not resized further
- File at exactly 1MB compressed is accepted
- File at exactly 500KB is skipped (not recompressed)
- No off-by-one errors in size/dimension checks

**Evidence to Capture:**
- Dimension assertions: output width/height ≤ 1920px
- Size assertions: output blob size ≤ 1MB
- Compression decision: correct logic for 500KB boundary

**Test File:** `apps/web/app-wishlist-gallery/src/hooks/__tests__/useS3Upload.test.ts` (new test case)

---

### Edge Case 7: Multiple tabs/windows uploading simultaneously
**Acceptance Criteria:** Implicit (state isolation)

**Setup:**
- User has two browser tabs open, both with AddItemPage
- Each tab has its own `useS3Upload` hook instance

**Action:**
1. Tab A: select image, start compression and upload
2. Tab B: select different image, start compression and upload
3. Both compressions proceed in parallel

**Expected Outcome:**
- Each tab has independent hook state
- Tab A compression progress doesn't affect Tab B
- Both uploads complete independently
- No race conditions or state sharing between instances

**Evidence to Capture:**
- Hook isolation: each hook instance has separate state object
- No shared state: no global variables used for compression state
- Parallel uploads: both complete without interference

**Test File:** Not easily testable in unit tests; noted as Playwright E2E concern (manual or multi-tab test)

---

## Required Tooling Evidence

### Unit Tests (Vitest)

**Location:** `/Users/michaelmenard/Development/Monorepo/apps/web/app-wishlist-gallery/src/hooks/__tests__/useS3Upload.test.ts`

**Commands to Run:**
```bash
cd /Users/michaelmenard/Development/Monorepo
pnpm test apps/web/app-wishlist-gallery/src/hooks/__tests__/useS3Upload.test.ts
# Or watch mode:
pnpm test:watch apps/web/app-wishlist-gallery/src/hooks/__tests__/useS3Upload.test.ts
```

**Required Test Cases:**
1. ✅ "Compresses high-resolution image automatically"
2. ✅ "Skips compression for small images (< 500KB)"
3. ✅ "Respects user preference to skip compression (high-quality checkbox)"
4. ✅ "Compression happens before presign request"
5. ✅ "Displays compression progress (0-100%)"
6. ✅ "Shows compression completion toast: 'Image compressed: X MB → Y MB'"
7. ✅ "Gracefully falls back to original image if compression fails"
8. ✅ "Handles unsupported formats (GIF, HEIC) by skipping compression"
9. ✅ "Detects browser compatibility issues and falls back"
10. ✅ "Preserves filename and MIME type after compression"
11. ✅ "Uses smaller of compressed vs original if compression increases size"
12. ✅ "Cancels in-progress compression and resets state"
13. ✅ "Validates compression settings: max 1920×1920, quality 0.8, maxSize 1MB"
14. ✅ "Handles very large images (> 20MB) with warning"

**Required Assertions (for each test):**
- State transitions logged and correct
- Progress callbacks fired with correct percentages (0, 25, 50, 75, 100)
- Toast notifications display exact expected text
- Presign request receives correct file metadata (name, MIME type, size)
- Compressed blob dimensions: max(width, height) ≤ 1920
- Compressed blob size: ≤ 1MB
- Error messages clear and actionable
- No console errors or warnings

**Mocking Strategy:**
- Mock `browser-image-compression` library
- Mock `@repo/api-client/rtk/wishlist-gallery-api` (getPresignUrl mutation)
- Mock `@repo/upload-client` (uploadToPresignedUrl)
- Use Vitest's `vi.fn()` for progress callbacks
- Simulate web worker behavior (if needed) with async delays

**Coverage Target:**
- Hook: 100% line coverage
- Error paths: 100% branch coverage
- Integration with presign request: 100% coverage

---

### Integration Tests (Vitest + React Testing Library)

**Location:** `/Users/michaelmenard/Development/Monorepo/apps/web/app-wishlist-gallery/src/components/WishlistForm/__tests__/WishlistForm.test.tsx` (or new file)

**Commands to Run:**
```bash
cd /Users/michaelmenard/Development/Monorepo
pnpm test apps/web/app-wishlist-gallery/src/components/WishlistForm/__tests__/
```

**Required Test Cases:**
1. ✅ "Displays compression progress indicator during compression"
2. ✅ "Shows 'High quality (skip compression)' checkbox"
3. ✅ "Persists compression preference to localStorage"
4. ✅ "Updates image preview after compression completes"
5. ✅ "Shows compression toast notification with size reduction"
6. ✅ "Checkbox toggles compression on/off"
7. ✅ "Form can be submitted after compression completes"

**Required DOM Assertions:**
- Checkbox element exists with label "High quality (skip compression)"
- Compression progress indicator displays when compression active
- Progress text format: "Compressing image... 45%"
- Toast container renders compression notification
- Toast text matches: "Image compressed: X.X MB → Y.Y MB"
- Image preview `<img>` element updates with compressed blob URL
- Form submission button enabled after compression completes

**Mocking Strategy:**
- Mock `useS3Upload` hook to return controllable state
- Mock `showSuccessToast`, `showErrorToast` from component library
- Mock RTK Query mutations
- Use `userEvent` for checkbox interaction, file selection

**Coverage Target:**
- Component: 90%+ line coverage
- User interactions (checkbox toggle, file select): 100% coverage

---

### Browser Tests (Playwright E2E)

**Location:** `/Users/michaelmenard/Development/Monorepo/apps/web/playwright/tests/wishlist-compression.spec.ts` (new file)

**Commands to Run:**
```bash
cd /Users/michaelmenard/Development/Monorepo/apps/web/playwright
pnpm exec playwright test tests/wishlist-compression.spec.ts
# Or specific test:
pnpm exec playwright test tests/wishlist-compression.spec.ts --grep "compresses high-resolution image"
# With UI:
pnpm exec playwright test tests/wishlist-compression.spec.ts --ui
# With headed browser for debugging:
pnpm exec playwright test tests/wishlist-compression.spec.ts --headed
```

**Required Test Cases:**
1. ✅ "Compresses high-resolution image before upload (happy path)"
   - Upload 5MB image, verify compression progress UI, verify final size reduction, verify preview updates
2. ✅ "Skips compression for already-small images"
   - Upload 300KB image, verify no compression progress, verify immediate upload
3. ✅ "User can disable compression with checkbox"
   - Check "High quality" checkbox, upload 5MB image, verify original file uploaded, verify preference persists
4. ✅ "Compression is shown before form submission"
   - Select image, verify compression progress visible before user submits form
5. ✅ "Toast notification displays compression result"
   - Upload image, wait for toast, verify text contains original and compressed sizes
6. ✅ "Very large image shows warning and completes upload"
   - Upload 20MB image, verify warning message (if applicable), verify upload completes

**Test File Template:**
```typescript
import { test, expect } from '@playwright/test'

test.describe('Image Compression - WISH-2022', () => {
  test('compresses high-resolution image before upload', async ({ page }) => {
    // 1. Navigate to AddItemPage
    await page.goto('/add-item')

    // 2. Select high-resolution image (5MB, 4032×3024)
    // - Create test image or use fixture
    const fileInput = page.locator('input[type="file"]')
    await fileInput.setInputFiles('./fixtures/high-res-image.jpg')

    // 3. Verify compression progress appears
    const progressIndicator = page.locator('text=Compressing image...')
    await expect(progressIndicator).toBeVisible()

    // 4. Wait for compression to complete
    const toastNotification = page.locator('text=/Image compressed:.*MB → .*MB/')
    await expect(toastNotification).toBeVisible({ timeout: 30000 })

    // 5. Verify image preview updates
    const preview = page.locator('img[alt="Image preview"]')
    await expect(preview).toHaveAttribute('src', /blob:/)

    // 6. Verify form can be submitted
    const submitButton = page.locator('button:has-text("Add to Wishlist")')
    await submitButton.click()

    // 7. Verify upload completes
    await expect(page).toHaveURL('/')
  })

  test.skip('disables compression when high-quality checkbox is checked', async ({ page }) => {
    // Similar to above, but toggle checkbox first
  })
})
```

**Required Assertions:**
- Compression progress indicator visible and updates (0% → 100%)
- Toast notification contains exact format: "Image compressed: X.X MB → Y.Y MB"
- Image preview updates with compressed blob URL
- Form submission succeeds after compression
- Checkbox state persists across page reloads (verify localStorage in DevTools)
- No console errors during compression or upload
- Upload completes successfully and returns to gallery page

**Test Fixtures:**
- High-resolution test image: 5MB, 4032×3024px, JPEG (or create in test)
- Small test image: 300KB, 1200×800px, JPEG
- Test image formats: JPEG, PNG, WebP, GIF (if applicable)

**Artifacts to Capture:**
- Screenshots: compression progress UI, toast notification, updated preview
- Video: full compression → upload flow (if test fails)
- Trace: detailed trace file for debugging (--trace on)
- Console logs: any errors or warnings during compression

**Run Configuration:**
```typescript
// playwright.config.ts
export default defineConfig({
  testMatch: 'tests/wishlist-compression.spec.ts',
  use: {
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm dev',
    port: 5173,
    reuseExistingServer: !process.env.CI,
  },
})
```

---

## Risks & Concerns

### Risk 1: Browser-image-compression Library Limitations
**Issue:** `browser-image-compression` may not support all image formats (HEIC, HEIF, WebP in some browsers).
**Mitigation:**
- Graceful fallback: catch compression errors and upload original
- Feature detection: test for canvas API before attempting
- User education: document which formats support compression
- Alternative: consider fallback compression library if HEIC support needed

**Test Strategy:** Error case testing (Error Case 2, 3)

---

### Risk 2: Web Worker Memory Issues
**Issue:** Compression in web worker may fail for very large images (>20MB) due to browser memory limits.
**Mitigation:**
- Show warning toast for large images
- Allow user to skip compression manually
- Set reasonable timeout (10 seconds) for compression to complete
- Fall back to original image if compression fails

**Test Strategy:** Edge case testing (Edge Case 2)

---

### Risk 3: Progress Indicator Accuracy
**Issue:** Web worker compression progress may not map linearly to UI percentage display.
**Mitigation:**
- Use `browser-image-compression` progress callback if available
- Show realistic progress ranges (e.g., 0% → 95% during compression, final 5% during blob generation)
- Accept slight inaccuracy; focus on showing *some* progress to user

**Test Strategy:** Unit test progress callback firing (Happy Path Test 1)

---

### Risk 4: localStorage Persistence Across Browsers
**Issue:** localStorage may be disabled or cleared by user, affecting compression preference.
**Mitigation:**
- Default to compression enabled (safe behavior)
- If localStorage unavailable, compression still works (web worker-based, not localStorage-dependent)
- Gracefully degrade if localStorage not available

**Test Strategy:** Check localStorage in unit test (Happy Path Test 3)

---

### Risk 5: Presign Request Metadata Accuracy
**Issue:** Compressed blob MIME type or filename may not match original file expectations.
**Mitigation:**
- Always convert to JPEG for consistency (per spec: `fileType: 'image/jpeg'`)
- Preserve original filename (or sanitize appropriately)
- Backend S3 bucket permissions must accept JPEG uploads
- Verify S3 bucket CORS and upload permissions beforehand

**Test Strategy:** Assert presign request payload (Happy Path Test 4)

---

### Risk 6: UI/UX of Compression Progress
**Issue:** Long compression time (>5 seconds) may feel slow to user.
**Mitigation:**
- Document expected compression time (typically <2 seconds for 5MB image)
- Show progress indicator to give user feedback
- Allow user to skip compression with checkbox
- Test with realistic hardware (not just fast dev machines)

**Test Strategy:** Playwright E2E test with realistic network throttling (if needed)

---

### Risk 7: Test Environment Isolation
**Issue:** localStorage may bleed across tests if not properly cleaned up.
**Mitigation:**
- Clear localStorage before/after each test
- Use Vitest's `beforeEach` and `afterEach` hooks
- Isolated React hook instances for each test

**Test Strategy:** Add setup/teardown in test file

```typescript
beforeEach(() => {
  localStorage.clear()
})

afterEach(() => {
  localStorage.clear()
})
```

---

### Risk 8: Image Format Conversion
**Issue:** Converting all images to JPEG may lose transparency or animation (GIF).
**Mitigation:**
- Document that compression converts to JPEG (lossy)
- Skip compression for formats that don't compress well (GIF, WebP with transparency)
- Consider user preference "High quality" as explicit acknowledgment of original format preservation

**Test Strategy:** Error case testing (Error Case 2: unsupported formats)

---

## Test Execution Checklist

### Pre-Test Setup
- [ ] Ensure `browser-image-compression` npm package version specified in package.json
- [ ] Verify vitest config includes jsdom environment (for canvas mocking)
- [ ] Create test fixtures: high-res image (5MB), small image (300KB), various formats
- [ ] Playwright test database/API ready (or mocked)
- [ ] Browser DevTools console open (for debugging)

### Unit Test Execution
- [ ] Run all useS3Upload tests: `pnpm test apps/web/app-wishlist-gallery/src/hooks/__tests__/useS3Upload.test.ts`
- [ ] Verify all 14 test cases pass
- [ ] Check coverage: aim for 100% line/branch coverage
- [ ] Review test logs for any warnings or flaky tests

### Integration Test Execution
- [ ] Run WishlistForm component tests: `pnpm test apps/web/app-wishlist-gallery/src/components/WishlistForm/__tests__/`
- [ ] Verify all 7 test cases pass
- [ ] Check localStorage assertions work
- [ ] Verify DOM assertions match actual UI structure

### E2E Test Execution
- [ ] Run Playwright tests: `pnpm exec playwright test tests/wishlist-compression.spec.ts`
- [ ] Verify all 6 test cases pass
- [ ] Check videos/traces for any UI issues
- [ ] Test on multiple browsers if available (Chrome, Firefox, WebKit)

### Manual Testing Checklist
- [ ] Test on real device (if possible) with realistic network speed
- [ ] Verify compression progress indicator updates smoothly
- [ ] Verify toast notification displays correct size reduction
- [ ] Verify image preview updates before upload
- [ ] Verify checkbox persists across page reloads
- [ ] Test cancel button during compression
- [ ] Test with very large image (>20MB) and verify warning/handling
- [ ] Test with GIF/WebP and verify graceful fallback

### Final Verification
- [ ] All tests pass locally and in CI
- [ ] Code coverage meets 90%+ threshold
- [ ] No console errors or warnings
- [ ] No security vulnerabilities in dependencies
- [ ] Compression library license reviewed (MIT is acceptable)

---

## Acceptance Criteria Coverage Matrix

| AC # | Description | Unit Test | Integration Test | E2E Test | Evidence |
|------|-------------|-----------|------------------|----------|----------|
| 1 | Auto-compress before S3 upload | ✅ Happy Path 1 | ✅ | ✅ | State transitions, compression blob created |
| 2 | Compression settings (1920×1920, q0.8, 1MB) | ✅ Happy Path 1, Edge Case 6 | ✅ | ✅ | Blob dimensions, size assertions |
| 3 | Progress indicator "Compressing... X%" | ✅ Happy Path 1 | ✅ | ✅ | Toast message text assertion |
| 4 | Preserve filename & MIME type | ✅ Happy Path 1 | ✅ | ✅ | Presign request payload check |
| 5 | Skip if < 500KB | ✅ Happy Path 2, Edge Case 1 | ✅ | ✅ | No compression state logged |
| 6 | Graceful fallback on error | ✅ Error Cases 1-3 | ✅ | ✅ | Fallback upload succeeds |
| 7 | User toggle "High quality" checkbox | ✅ Happy Path 3 | ✅ | ✅ | localStorage assertion, checkbox state |
| 8 | Compress before presign request | ✅ Happy Path 4 | ✅ | ✅ | Timing assertion in test |
| 9 | Toast "Compressed: X MB → Y MB" | ✅ Happy Path 1 | ✅ | ✅ | Exact toast text match |
| 10 | Preview updates post-compression | ✅ Happy Path 5 | ✅ | ✅ | DOM/img src attribute assertion |

---

## Summary

**Total Test Cases:**
- Unit: 14 tests in useS3Upload.test.ts
- Integration: 7 tests in WishlistForm.test.tsx
- E2E: 6 tests in wishlist-compression.spec.ts
- **Total: 27 tests**

**Estimated Execution Time:**
- Unit tests: ~3 seconds
- Integration tests: ~5 seconds
- E2E tests: ~30 seconds (per browser)
- **Total: ~40 seconds (single browser), ~2 minutes (3 browsers)**

**Pass Criteria:**
- All 10 acceptance criteria covered by at least one test
- 90%+ code coverage for compression module
- 0 flaky tests (all deterministic)
- 0 console errors in E2E tests

---

**Test Plan Author:** Product Manager (PM Agent)
**Date:** 2026-01-28
**Story ID:** WISH-2022
**Version:** 1.0
