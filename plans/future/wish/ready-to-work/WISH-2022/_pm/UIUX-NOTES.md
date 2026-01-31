# WISH-2022: Client-side Image Compression - UI/UX Notes

**Date:** 2026-01-28
**Story ID:** WISH-2022
**Title:** Client-side Image Compression
**Verdict:** **PASS** - All MVP UI/UX requirements are achievable with existing design system patterns and component library

---

## Executive Summary

WISH-2022 introduces client-side image compression before S3 upload. From a UI/UX perspective, this is **low-complexity** because:

1. **No new components needed** - All required UI elements exist in `@repo/app-component-library`
2. **Integrated into existing flow** - WishlistForm already has upload UX (WISH-2002)
3. **Three UI updates only** - Progress messaging, checkbox toggle, toast notification
4. **Design system aligned** - Uses existing token-only colors and `_primitives` patterns

**MVP-critical requirement:** Show compression progress and allow users to skip compression. Everything else is polish.

---

## MVP Component Architecture

### Components Required for Core Journey

**All integrated into existing `WishlistForm` component** (`/apps/web/app-wishlist-gallery/src/components/WishlistForm/index.tsx`):

| Component | Purpose | Source | Status |
|-----------|---------|--------|--------|
| **Progress** | Show compression % (0-100%) | `@repo/app-component-library` `_primitives/progress` | ✓ Exists |
| **Checkbox** | "High quality (skip compression)" toggle | `@repo/app-component-library` `_primitives/checkbox` | ✓ Exists |
| **Label** | Label for checkbox | `@repo/app-component-library` `_primitives/label` | ✓ Exists |
| **Toast** | Notification after compression complete | `@repo/app-component-library` `showSuccessToast`, `showWarningToast` | ✓ Exists |
| **Image Preview** | Show compressed image before upload | Already in WishlistForm | ✓ Exists |

### Integration Points

1. **useS3Upload hook** → Enhanced to support compression state
2. **WishlistForm** → Add checkbox, integrate compression progress into existing overlay
3. **New hook: useImageCompression** → Encapsulate compression logic (separate from upload)

### No New Components Needed

The existing upload progress overlay (lines 434-446 in WishlistForm) will be reused for compression progress:

```tsx
// CURRENT: "Uploading... 45%"
// NEW DURING COMPRESSION: "Compressing image... 35%"
{Boolean(isUploading) && (
  <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-2">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
    <span className="text-sm text-muted-foreground">
      {uploadState === 'preparing'
        ? 'Preparing upload...'
        : `Uploading... ${uploadProgress}%`}  // ← ADD compression state here
    </span>
    {uploadState === 'uploading' && (
      <Progress value={uploadProgress} className="w-48" />
    )}
  </div>
)}
```

**Key pattern:** Reuse existing `Progress` primitive from `_primitives/progress`.

---

## MVP Accessibility (Blocking Only)

### Core Journey Accessibility

All requirements must work with keyboard-only navigation and screen readers:

#### 1. Compression Checkbox (BLOCKING)

**Requirement:** Checkbox + label must be keyboard accessible and screen-reader discoverable.

**Implementation checklist:**
- [ ] `<Checkbox>` primitive supports `disabled` prop (already does)
- [ ] `<Label>` has `htmlFor` attribute pointing to checkbox ID
- [ ] Checkbox label text: `"High quality (skip compression)"` is self-documenting
- [ ] Tab order: Checkbox appears after Image upload section, before Tags section

**Template:**
```tsx
<div className="space-y-2">
  <div className="flex items-center gap-2">
    <Checkbox
      id="skipCompression"
      checked={skipCompression}
      onCheckedChange={setSkipCompression}
      disabled={isDisabled}
    />
    <Label htmlFor="skipCompression" className="cursor-pointer">
      High quality (skip compression)
    </Label>
  </div>
  <p className="text-xs text-muted-foreground">
    Keep original image resolution and quality. Useful for design-critical images.
  </p>
</div>
```

**Screen reader text:** Already semantic via native `<input type="checkbox">` wrapped by `Checkbox` primitive.

#### 2. Compression Progress (BLOCKING)

**Requirement:** During compression, screen reader must announce "Compressing image" and progress percentage.

**Implementation checklist:**
- [ ] Progress overlay uses `aria-live="polite"` to announce progress updates
- [ ] Text content: `"Compressing image... X%"` is explicit and descriptive
- [ ] Progress bar has `role="progressbar"` + `aria-valuenow` (built into `Progress` primitive)

**Template:**
```tsx
{uploadState === 'compressing' && (
  <div
    className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-2"
    aria-live="polite"
    aria-label="Image compression in progress"
  >
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
    <span className="text-sm text-muted-foreground">
      Compressing image... {compressionProgress}%
    </span>
    <Progress value={compressionProgress} className="w-48" />
  </div>
)}
```

#### 3. Toast Notification (BLOCKING)

**Requirement:** Compression result toast must be announced to screen readers.

**Implementation checklist:**
- [ ] Toast uses `showSuccessToast` (already supports screen reader announcements)
- [ ] Message: `"Image compressed: X MB → Y MB"` is explicit
- [ ] Toast appears for ≥3 seconds (user-readable time)

**Template:**
```tsx
// After compression succeeds:
showSuccessToast(
  'Image compressed',
  `${(originalSize / 1024 / 1024).toFixed(1)} MB → ${(compressedSize / 1024 / 1024).toFixed(1)} MB`,
  4000
)
```

**Screen reader behavior:** `showSuccessToast` uses Sonner toast library which announces to screen readers via ARIA live region.

#### 4. Keyboard Navigation (BLOCKING)

**Requirement:** All form controls (including compression checkbox) must be reachable via Tab key.

**Verification checklist:**
- [ ] Tab order is logical: Title → Store → ... → Image → **Compression Checkbox** → Tags → Notes → Submit
- [ ] All disabled states properly set `disabled={isDisabled}` attribute
- [ ] No keyboard traps (user can always Tab forward and Shift+Tab back)

**Current WishlistForm tab order:** Already correct (follows form sections top-to-bottom). Checkbox inserts between Image and Tags.

#### 5. Error Messaging (BLOCKING)

**Requirement:** If compression fails, error message must be accessible.

**Implementation checklist:**
- [ ] Error text uses `className="text-sm text-destructive"` (same pattern as existing errors)
- [ ] Error is placed immediately below Image section for context
- [ ] Screen reader sees error via aria-describedby or semantic proximity

**Template:**
```tsx
{Boolean(compressionError) && (
  <p className="text-sm text-destructive" role="alert">
    {compressionError}
  </p>
)}
```

---

## MVP Design System Rules

### Token-Only Colors (HARD GATE)

**Rule:** All colors must come from design tokens in `/packages/core/design-system/src/design-tokens.css`. No hardcoded hex, rgba, or Tailwind color literals.

**Compliance checklist for compression UI:**

| Element | Token Source | Usage |
|---------|-------------|-------|
| Compression overlay background | `--background` (light) or `--surface-translucent` (dark) | `bg-background/80` ✓ |
| Loader2 spinner color | `--primary` | `text-primary` ✓ |
| Progress bar | `--primary` (from `Progress` primitive) | Via `@repo/app-component-library` ✓ |
| Checkbox | `--primary` (focus ring), `--muted` (unchecked) | Via `_primitives/checkbox` ✓ |
| Toast text | `--success-foreground` (success toast) | Via `showSuccessToast` ✓ |
| Error text | `--destructive` (red) | `text-destructive` ✓ |
| Help text | `--muted-foreground` (gray) | `text-muted-foreground` ✓ |

**No custom colors allowed.** All styling uses Tailwind classes that map to design tokens.

### _Primitives Import Requirement

**Rule:** UI elements must import from `@repo/app-component-library` and use `_primitives` internally. No direct shadcn imports.

**Compliance checklist:**

```tsx
// ✓ CORRECT
import { Checkbox, Label, Progress } from '@repo/app-component-library'

// ✗ WRONG
import { Checkbox } from '@repo/app-component-library/_primitives/checkbox'
```

**Current WishlistForm compliance:** ✓ Already imports correctly from `@repo/app-component-library`.

### Design System Alignment Summary

- **Progress indicator:** Reuse existing `Progress` primitive
- **Checkbox:** Reuse existing `Checkbox` primitive
- **Colors:** All use design tokens (no custom colors)
- **Spacing/typography:** Use existing Tailwind scale (space-2, text-sm, etc.)
- **Animations:** Loader2 icon uses `animate-spin` (built-in Tailwind)

**Result:** Zero design system friction. All MVP UI fits within existing design language.

---

## MVP Playwright Evidence

### Core Journey: Client-side Compression with Progress Display

**Story:** User uploads high-res phone photo, sees compression progress, then upload progress.

**Test scenario:**
```
Given: User is on Add Item page
When:
  1. Click image upload area
  2. Select 5MB phone photo (4032×3024)
  3. Image preview appears
  4. Compression overlay appears: "Compressing image... 15%"
  5. Progress bar fills from 0→100%
  6. Compression completes (0.8MB)
  7. Toast shows: "Image compressed: 5.0 MB → 0.8 MB"
  8. Toast auto-dismisses after 4 seconds
  9. Upload progress overlay appears: "Uploading... 45%"
  10. Upload completes
  11. Form submits successfully
Then:
  - Item appears in gallery with compressed image
```

**Playwright code skeleton:**
```typescript
// E2E test location: apps/web/playwright/tests/wish-2022-compression.spec.ts

test('should compress image and show progress', async ({ page }) => {
  // Navigate to add item page
  await page.goto('/wishlist/add')

  // Find and click upload area
  const uploadArea = page.getByRole('button', { name: /upload or drag/i })
  await uploadArea.click()

  // Select 5MB test image
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles('fixtures/large-phone-photo.jpg')

  // Verify compression overlay appears
  const compressionOverlay = page.getByText(/Compressing image/)
  await expect(compressionOverlay).toBeVisible()

  // Verify progress increases
  const progressBar = page.locator('[role="progressbar"]')
  let lastValue = 0
  for (let i = 0; i < 10; i++) {
    const value = await progressBar.getAttribute('aria-valuenow')
    expect(Number(value)).toBeGreaterThanOrEqual(lastValue)
    lastValue = Number(value)
    await page.waitForTimeout(100)
  }

  // Verify compression completes with toast
  const toast = page.getByText(/Image compressed/)
  await expect(toast).toBeVisible()

  // Verify upload progress appears (compression done)
  const uploadText = page.getByText(/Uploading/)
  await expect(uploadText).toBeVisible()

  // Verify form submission
  await page.getByRole('button', { name: /Add to Wishlist/i }).click()
  await expect(page).toHaveURL('/')
})
```

### Skip Compression (Checkbox) Scenario

**Story:** User disables compression for high-quality image.

```typescript
test('should skip compression when checkbox is checked', async ({ page }) => {
  await page.goto('/wishlist/add')

  // Check "High quality" checkbox
  const skipCheckbox = page.getByRole('checkbox', { name: /High quality/ })
  await skipCheckbox.check()

  // Upload image
  const fileInput = page.locator('input[type="file"]')
  await fileInput.setInputFiles('fixtures/large-photo.jpg')

  // Verify NO compression overlay appears (goes straight to upload)
  const compressionText = page.getByText(/Compressing image/)
  await expect(compressionText).not.toBeVisible()

  // Verify upload progress appears immediately
  const uploadText = page.getByText(/Uploading/)
  await expect(uploadText).toBeVisible()
})
```

---

## MVP Form Integration Notes

### State Management Updates

**useS3Upload hook** (currently in `/apps/web/app-wishlist-gallery/src/hooks/useS3Upload.ts`):

Add two new fields to `UploadState`:

```typescript
export type UploadState = 'idle' | 'preparing' | 'compressing' | 'uploading' | 'complete' | 'error'
//                                                  ↑ NEW

export interface UseS3UploadResult {
  state: UploadState
  progress: number
  compressionProgress?: number  // ← NEW: track compression progress separately
  compressionError?: string | null  // ← NEW: track compression-specific errors
  // ... rest of interface
}
```

**WishlistForm state:**

```typescript
const [skipCompression, setSkipCompression] = useState<boolean>(
  // Load from localStorage on mount
  () => localStorage.getItem('wishlist:preferences:imageCompression') === 'false'
)

// Save preference when changed
useEffect(() => {
  localStorage.setItem(
    'wishlist:preferences:imageCompression',
    String(!skipCompression)
  )
}, [skipCompression])
```

### Flow: Upload with Compression

1. **User selects file**
   - Call `validateFile()` (existing)
   - Show preview (existing)

2. **Compression phase** (NEW)
   - Check `skipCompression` preference
   - If skipping → go to Upload phase
   - If compressing:
     - Show overlay: "Compressing image... X%"
     - Call new `compressImage()` utility
     - Update `compressionProgress` state
     - Generate compressed blob

3. **Upload phase** (existing)
   - Get presigned URL
   - Upload blob to S3
   - Show "Uploading... X%"

4. **Success**
   - Show toast: "Image compressed: X MB → Y MB"
   - Reset state

5. **Error handling**
   - Compression fails → fall back to original (with warning toast)
   - Upload fails → show error (existing)

---

## MVP Toast Messaging

### Success Case: After Compression

**Message format:** `"Image compressed: X.X MB → Y.Y MB"`

**Example:** `"Image compressed: 5.2 MB → 0.8 MB"`

**Implementation:**
```tsx
const originalSizeMB = (file.size / 1024 / 1024).toFixed(1)
const compressedSizeMB = (compressedBlob.size / 1024 / 1024).toFixed(1)

showSuccessToast(
  'Image compressed',
  `${originalSizeMB} MB → ${compressedSizeMB} MB`,
  4000
)
```

**Token compliance:** `showSuccessToast` uses `bg-success` + `text-success-foreground` (both design tokens) ✓

### Warning Case: Compression Skipped (Small File)

**Message:** `"Image already optimized. No compression needed."`

```tsx
if (file.size < 500 * 1024) {
  showWarningToast(
    'Image already optimized',
    'No compression needed.',
    3000
  )
  // Skip compression, go straight to upload
}
```

### Error Case: Compression Failed

**Message:** `"Failed to compress image. Uploading original instead."`

```tsx
try {
  await compressImage(file)
} catch (error) {
  showWarningToast(
    'Failed to compress image',
    'Uploading original instead.',
    4000
  )
  // Continue with original file
}
```

**Token compliance:** `showWarningToast` uses `bg-warning` + `text-warning-foreground` ✓

---

## MVP Labels & Help Text

### Compression Checkbox

**Label:** `"High quality (skip compression)"`
**Help text below checkbox:**
```
"Keep original image resolution and quality. Useful for design-critical images."
```

**Placement:** Between Image upload and Tags sections.

### Progress Messaging

**During compression:**
```
"Compressing image... 45%"
```

**During upload (existing):**
```
"Uploading... 60%"
```

---

## Design System Compliance Summary

| Requirement | Status | Notes |
|-------------|--------|-------|
| Token-only colors | ✓ Pass | All colors use design tokens |
| _primitives imports | ✓ Pass | Via `@repo/app-component-library` |
| Component reuse | ✓ Pass | No new components needed |
| Accessibility | ✓ Pass | Keyboard + screen reader friendly |
| Responsive | ✓ Pass | Progress overlay uses existing responsive classes |

---

## Risks & Mitigations

### Risk 1: Compression State Complexity

**Issue:** Adding "compressing" state alongside "uploading" could cause state conflicts.

**Mitigation:**
- Use separate `compressionProgress` variable distinct from `uploadProgress`
- Clear `compressionProgress` before entering upload phase
- Use upload state machine: `compressing` → `uploading` (sequential, never overlap)

### Risk 2: Browser Compatibility

**Issue:** Canvas/Web Worker APIs used by `browser-image-compression` may not be available in older browsers.

**Mitigation:**
- Wrap compression in try/catch
- Fall back to original file if compression throws
- Show warning toast: "Your browser doesn't support compression. Using original image."

### Risk 3: Large File Memory Issues

**Issue:** Very large images (>20MB) may cause out-of-memory errors during compression.

**Mitigation:**
- Show warning before compressing: "Large image detected. Compression may take a moment."
- Set compression timeout to 10 seconds
- If timeout → fall back to original with toast

### Risk 4: HEIC/HEIF Format Support

**Issue:** iPhone photos in HEIC format may not compress properly.

**Mitigation:**
- `browser-image-compression` handles HEIC → JPEG conversion
- If it fails, fall back to original with message: "Image format not supported. Using original."

---

## Compliance Checklist

- [x] No new components needed
- [x] Reuses existing Progress, Checkbox, Label, Toast primitives
- [x] All colors use design tokens
- [x] Imports from @repo/app-component-library (not direct shadcn)
- [x] Keyboard navigation accessible (Tab order preserved)
- [x] Screen reader friendly (aria-live, role="progressbar", semantic HTML)
- [x] Error handling graceful (fall back to original + toast)
- [x] Forms validation intact (compression transparent to form validation)
- [x] Design system aligned (spacing, typography, shadows all standard)

---

## Next Steps

1. **Development:** Create `useImageCompression` hook + integrate into WishlistForm
2. **Testing:** Implement E2E tests with Playwright (see Playwright Evidence section)
3. **Accessibility audit:** Test with NVDA/JAWS screen readers
4. **Performance:** Profile compression on real devices (mobile especially)
5. **Polish:** See FUTURE-UIUX.md for delighter ideas

---

**Story Ready:** ✓ All MVP UI/UX requirements are design-system-compliant and accessible.
