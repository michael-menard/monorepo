# UI/UX Recommendations: INST-1107 - Download Files

## Verdict
**PASS** - Core download journey can work with MVP component architecture. No blocking UX issues.

---

## MVP Component Architecture

### Components Required for Core Journey

**Primary Component:**
- `FileDownloadButton` - New component in `apps/web/app-instructions-gallery/src/components/`
  - Props: `{ mocId: string, fileId: string, fileName: string, className?: string }`
  - Renders download button with icon, text, loading state
  - Handles API call via RTK Query
  - Triggers browser download on success

**Integration Point:**
- Modify `DetailPage` (or create `FileListItem` component) to render `FileDownloadButton` for each file
- Location: `apps/web/app-instructions-gallery/src/pages/detail-page.tsx` (lines 318-325 already have PDF download, extend pattern)

### Reuse Targets in packages/** for Core Flow

**From `@repo/app-component-library`:**
- `Button` from `_primitives/button` - Base button component
- `Spinner` or loading icon - Loading indicator
- `cn` utility - Class name merging

**From `lucide-react`:**
- `Download` icon - Already imported in detail-page.tsx
- `Loader2` icon - For spinning loading state

**Pattern to Follow:**
- Similar to existing PDF download button (detail-page.tsx:318-325) but with:
  - API call instead of direct link
  - Loading state management
  - Error handling with toast

### shadcn Primitives for Core UI

- Import `Button` from `@repo/app-component-library/_primitives/button`
- Do NOT import from individual shadcn paths
- Use `variant="outline"` or `variant="default"` for download button

---

## MVP Accessibility (Blocking Only)

### Requirements That Prevent Core Journey Usage

1. **Keyboard Navigation (CRITICAL)**
   - Download button must be focusable via Tab key
   - Enter key must trigger download
   - Disabled state must prevent keyboard activation
   - **Test**: Tab to button, press Enter → download starts

2. **Screen Reader Announcements (CRITICAL)**
   - Button must have `aria-label="Download {fileName}"`
   - Loading state must announce "Downloading {fileName}" to screen readers
   - Error state must announce error message
   - **Test**: Use VoiceOver/NVDA to verify announcements

3. **Focus Management (CRITICAL)**
   - Focus remains on button during loading
   - Focus visible indicator when button focused (Tailwind: `focus:ring-2 focus:ring-primary`)
   - **Test**: Tab to button → visible focus ring appears

### Basic Keyboard Navigation for Core Flow

- **Tab**: Navigate to download button
- **Enter**: Trigger download (same as click)
- **Escape**: Cancel download (if still in loading state) - **FUTURE** enhancement, not MVP-blocking

### Critical Screen Reader Requirements

- Button text: "Download" (visible to all users)
- `aria-label`: "Download {fileName}" (context for screen readers)
- Loading state: `aria-busy="true"` while fetching URL
- Disabled state: `aria-disabled="true"` when loading

---

## MVP Design System Rules

### Token-Only Colors (Hard Gate)

**Allowed:**
- `bg-primary`, `text-primary-foreground` (button background)
- `text-muted-foreground` (secondary text)
- `border-input` (button border if outline variant)
- `ring-primary` (focus ring)

**NOT Allowed:**
- Hard-coded hex: `#4A5568` ❌
- Arbitrary colors: `bg-[#123456]` ❌
- Non-token Tailwind: `bg-blue-500` ❌ (use `bg-primary` instead)

### `_primitives` Import Requirement

```typescript
// ✅ CORRECT
import { Button } from '@repo/app-component-library/_primitives/button'

// ❌ WRONG
import { Button } from '@repo/app-component-library/button'
import { Button } from '@/components/ui/button'
```

### Button Styling (MVP)

```tsx
<Button
  variant="outline"
  size="sm"
  className={cn(
    "w-full sm:w-auto", // Responsive width
    className
  )}
  disabled={isLoading}
  aria-label={`Download ${fileName}`}
  aria-busy={isLoading}
>
  {isLoading ? (
    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
  ) : (
    <Download className="w-4 h-4 mr-2" />
  )}
  Download
</Button>
```

---

## MVP Playwright Evidence

### Core Journey Demonstration Steps

**Test: Download instruction PDF**
```typescript
test('download instruction file', async ({ page }) => {
  // Navigate to MOC detail page
  await page.goto('/mocs/test-moc-id')

  // Locate download button for first file
  const downloadButton = page.getByRole('button', { name: /download.*castle-instructions/i })

  // Verify button visible and enabled
  await expect(downloadButton).toBeVisible()
  await expect(downloadButton).toBeEnabled()

  // Start download
  const downloadPromise = page.waitForEvent('download')
  await downloadButton.click()

  // Verify loading state
  await expect(downloadButton).toBeDisabled()
  await expect(page.getByRole('button', { name: /downloading/i })).toBeVisible()

  // Wait for download to complete
  const download = await downloadPromise

  // Verify filename
  expect(download.suggestedFilename()).toBe('castle-instructions.pdf')

  // Verify button returns to ready state
  await expect(downloadButton).toBeEnabled()
})
```

**Visual States to Capture:**
1. Button in ready state (Download icon + text)
2. Button in loading state (Spinner + "Download" text, disabled)
3. Button after error (returns to ready, toast shown)

---

## FUTURE-UIUX.md (Deferred to Post-MVP)

### UX Polish Opportunities
- Download progress percentage (S3 doesn't provide this easily)
- Batch download (download all files as ZIP)
- Download history/analytics
- Retry button on error (auto-retry with exponential backoff)
- Download queue (multiple simultaneous downloads)

### Accessibility Enhancements
- ARIA live region for download completion announcement
- High contrast mode support verification
- Keyboard shortcut (e.g., Ctrl+D to download focused file)
- Screen reader announces file size before download

### UI Improvements
- Download icon animation on hover
- Success checkmark animation after download
- File preview modal before download (PDF thumbnail)
- Download speed indicator (if feasible)
- Different icons for file types (PDF, CSV, etc.)

### Responsive Refinements
- Mobile: Full-width button with larger touch target (44x44px minimum)
- Desktop: Compact button with icon + text
- Tablet: Adaptive sizing based on viewport

---

## Component Architecture Diagram

```
DetailPage (exists)
  └─ Files Section
      └─ FileListItem (new or inline)
          ├─ File Icon
          ├─ File Name
          ├─ File Size
          └─ FileDownloadButton ← NEW COMPONENT
              ├─ useGetFileDownloadUrlQuery (RTK Query)
              ├─ Button (_primitives)
              │   ├─ Download Icon (lucide-react)
              │   └─ "Download" text
              └─ Error Toast (shadcn Toaster)
```

---

## Design Tokens Checklist

- [ ] All colors use design tokens (`bg-primary`, `text-muted-foreground`, etc.)
- [ ] All spacing uses Tailwind spacing scale (no arbitrary values like `p-[13px]`)
- [ ] All border radii use design system values (`rounded-lg`, `rounded-md`)
- [ ] All font sizes use design system scale (`text-sm`, `text-base`)
- [ ] All shadows use design system shadows (`shadow-sm`, `shadow-md`)

---

## Accessibility Checklist (MVP-Critical)

- [ ] Download button focusable via keyboard (Tab)
- [ ] Enter key triggers download
- [ ] `aria-label` includes filename
- [ ] `aria-busy` set during loading
- [ ] `aria-disabled` set when disabled
- [ ] Focus visible indicator (ring-2 ring-primary)
- [ ] Color contrast meets WCAG AA (4.5:1 minimum)
- [ ] Touch target size ≥44x44px on mobile

---

## Notes for Implementation

1. **Reuse existing PDF download pattern** (detail-page.tsx:318-325) as starting point
2. **Extract to component** for reusability and testability
3. **Add error handling** that existing pattern lacks (toast on failure)
4. **Loading state** is critical for UX (presigned URL generation takes ~100-500ms)
5. **Don't cache presigned URLs** (they expire, RTK Query should not cache this endpoint)
