# UI/UX Notes: REPA-005 - Migrate Upload Components

## Verdict

**PASS-WITH-NOTES**

This story is a pure consolidation/migration effort with NO new UI features. All components already exist and are well-tested. The migration should preserve existing UI/UX exactly as-is. Notes below focus on ensuring no degradation during migration.

---

## MVP Component Architecture

### Components Required for Core Journey

This story migrates 9 existing components to @repo/upload/components/:

**Core Uploader Sub-Components** (7):
1. ConflictModal - Handles 409 Conflict errors with suggested slug
2. RateLimitBanner - Handles 429 Rate Limit errors with countdown
3. SessionExpiredBanner - Handles 401 Session Expired errors
4. UnsavedChangesDialog - Prevents data loss on navigation
5. UploaderFileItem - Single file display with progress/status
6. UploaderList - Container for file queue
7. SessionProvider - Context provider for session state

**Domain-Specific Upload Components** (2):
8. ThumbnailUpload - Drag-and-drop image upload with preview
9. InstructionsUpload - Multi-file PDF upload with sequential processing

### Reuse Targets (Already in Use)

All components currently use @repo/app-component-library primitives. Migration MUST preserve these dependencies:

- **Dialog** (from `_primitives/`) - Used in ConflictModal, UnsavedChangesDialog
- **Alert** (from `_primitives/`) - Used in RateLimitBanner, SessionExpiredBanner
- **Button** (from `_primitives/`) - All interactive components
- **Progress** (from `_primitives/`) - RateLimitBanner, UploaderFileItem
- **Card** (from `_primitives/`) - UploaderFileItem, ThumbnailUpload
- **Badge** (from `_primitives/`) - UploaderFileItem status indicators
- **Input** (from `_primitives/`) - ConflictModal slug input
- **Label** (from `_primitives/`) - Form fields in upload components

**Critical**: Do NOT import from individual paths like `@repo/app-component-library/primitives/dialog`. Always use barrel export: `import { Dialog } from '@repo/app-component-library'` (per CLAUDE.md).

---

## MVP Accessibility (Blocking Only)

### Requirements That Prevent Core Journey Usage

**1. Focus Management in Modals (WCAG 2.1 AA)**

- **ConflictModal**: Focus MUST move to suggested slug input when modal opens
  - Current implementation has focus trap
  - Migration MUST preserve this behavior
  - Test: Tab key cycles within modal only
  - Test: Escape key closes modal and returns focus to trigger

- **UnsavedChangesDialog**: Focus MUST move to primary action button
  - Current implementation has focus management
  - Migration MUST preserve this behavior

**2. Keyboard Navigation for Upload Flows**

- **ThumbnailUpload**: Drag zone MUST be keyboard accessible
  - Current: File picker fallback button exists
  - Migration: Preserve button for keyboard users
  - Test: Space/Enter on button opens file picker

- **UploaderFileItem**: Action buttons (Cancel, Retry, Remove) MUST be keyboard accessible
  - Current: Buttons have focus indicators
  - Migration: Preserve focus ring styles
  - Test: Tab to button, Enter/Space activates

**3. Screen Reader Requirements**

- **RateLimitBanner**: Countdown timer MUST announce updates
  - Current: aria-live="polite" on countdown display
  - Migration: Preserve aria-live region
  - Test: Screen reader announces "30 seconds remaining", "29 seconds remaining", etc.

- **UploaderFileItem**: Upload progress MUST be announced
  - Current: Progress bar has aria-valuenow, aria-valuemin, aria-valuemax
  - Migration: Preserve ARIA attributes
  - Test: Screen reader announces "Upload progress: 65%"

- **ConflictModal**: Suggested slug explanation MUST be announced
  - Current: aria-describedby links to explanation text
  - Migration: Preserve aria-describedby association

---

## MVP Design System Rules

### Token-Only Colors (Hard Gate)

All components currently use Tailwind token classes. Migration MUST NOT introduce hardcoded colors.

**Verification checklist**:
- ✅ No hex colors in component files (e.g., `#FF0000`)
- ✅ No RGB/RGBA colors (e.g., `rgb(255, 0, 0)`)
- ✅ Only Tailwind color classes (e.g., `bg-sky-500`, `text-gray-700`)

**Common patterns to preserve**:
- Success states: `bg-green-100`, `text-green-700`
- Error states: `bg-red-100`, `text-red-700`
- Warning states: `bg-yellow-100`, `text-yellow-700`
- Info states: `bg-blue-100`, `text-blue-700`
- Progress bars: `bg-sky-500` (brand color)

### _primitives Import Requirement

All shadcn/Radix components MUST be imported from `@repo/app-component-library` barrel export, NOT from individual files.

**Correct** (current pattern):
```tsx
import { Dialog, Button, Progress } from '@repo/app-component-library'
```

**Incorrect** (violates CLAUDE.md):
```tsx
import { Dialog } from '@repo/app-component-library/primitives/dialog'
import { Button } from '@repo/app-component-library/primitives/button'
```

**Migration action**: Audit all import statements in migrated components to ensure barrel export usage.

---

## MVP Playwright Evidence

### Core Journey Demonstration Steps

**Journey 1: Conflict Resolution Flow**
1. Navigate to instruction upload page
2. Upload instruction with duplicate slug
3. Wait for ConflictModal to appear
4. Verify suggested slug is pre-filled
5. Press Enter or click "Use Suggested Slug"
6. Verify upload succeeds with new slug
7. Verify modal closes and focus returns to page

**Journey 2: Rate Limit Handling Flow**
1. Trigger 429 rate limit response (mock or real)
2. Verify RateLimitBanner appears
3. Verify countdown timer displays and decrements
4. Wait for countdown to reach 00:00 (or fast-forward in test)
5. Verify "Retry" button enables
6. Click "Retry" button
7. Verify upload resumes

**Journey 3: Thumbnail Upload Flow**
1. Navigate to MOC creation page
2. Click on ThumbnailUpload drag zone
3. Select image file via file picker
4. Verify preview displays with file metadata
5. Verify image is resized/compressed (from REPA-004)
6. Submit form
7. Verify thumbnail saved correctly

**Journey 4: Multi-File Instruction Upload Flow**
1. Navigate to instruction upload page
2. Add 3 PDF files to InstructionsUpload queue
3. Start upload
4. Verify files process sequentially (file 2 waits for file 1)
5. Verify progress tracking shows current file + queue position
6. Verify all files complete
7. Verify success message displays

**Journey 5: Unsaved Changes Guard**
1. Start uploading files in InstructionsUpload
2. While upload in progress, attempt to navigate away
3. Verify UnsavedChangesDialog appears
4. Click "Cancel" in dialog
5. Verify navigation is prevented
6. Verify upload continues
7. Wait for upload to complete
8. Attempt navigation again
9. Verify no dialog appears (changes saved)

---

## Notes for Implementation

### Preservation Requirements

**DO**:
- Preserve all existing Tailwind classes exactly as-is
- Preserve all ARIA attributes (role, aria-labelledby, aria-describedby, aria-live, etc.)
- Preserve focus management logic (focus traps, autofocus, focus return)
- Preserve reduced-motion support (prefers-reduced-motion media query checks)
- Preserve all existing component props and APIs (backward compatibility)

**DO NOT**:
- Change component visual appearance or layout
- Add new UI features (out of scope for migration)
- Remove accessibility features
- Simplify or "clean up" existing implementations (risk of regression)

### Component Directory Structure Compliance

All migrated components MUST follow monorepo structure (per CLAUDE.md):

```
ComponentName/
  index.tsx              # Main component file
  __tests__/
    ComponentName.test.tsx
  __types__/
    index.ts             # Zod schemas (if component-specific)
  utils/
    index.ts             # Component-specific utilities
```

**Example**: ConflictModal structure after migration:
```
packages/core/upload/src/components/ConflictModal/
  index.tsx
  __tests__/
    ConflictModal.test.tsx
  __types__/
    index.ts             # ConflictModalPropsSchema, ConflictErrorSchema
```

### Zod-First Types Compliance

All component props MUST be validated with Zod schemas (per CLAUDE.md).

**Correct pattern**:
```tsx
import { z } from 'zod'

const ConflictModalPropsSchema = z.object({
  open: z.boolean(),
  onClose: z.function(),
  conflictError: z.object({
    status: z.literal(409),
    message: z.string(),
    suggested_slug: z.string().optional()
  })
})

type ConflictModalProps = z.infer<typeof ConflictModalPropsSchema>

export function ConflictModal(props: ConflictModalProps) {
  // implementation
}
```

**Incorrect pattern** (DO NOT USE):
```tsx
interface ConflictModalProps {
  open: boolean
  onClose: () => void
  conflictError: { ... }
}
```

### SessionProvider Auth Injection Pattern

SessionProvider has divergent implementations (Redux vs non-Redux). Migration MUST use dependency injection:

**Correct pattern**:
```tsx
type SessionProviderProps = {
  children: React.ReactNode
  isAuthenticated?: boolean  // Optional, for auth mode
  userId?: string            // Optional, for auth mode
}

export function SessionProvider({ children, isAuthenticated, userId }: SessionProviderProps) {
  // Use isAuthenticated and userId props instead of importing Redux directly
  const session = useUploaderSession({ isAuthenticated, userId })
  // ...
}
```

**App usage**:
- main-app: `<SessionProvider isAuthenticated={user.isAuthenticated} userId={user.id}>`
- app-instructions-gallery: `<SessionProvider>` (no props, anonymous mode)

---

## MVP Visual Regression Considerations

Although no new UI is being added, migration introduces risk of accidental visual changes. Recommended checks:

1. **Component Snapshots**: Run Vitest snapshot tests for all migrated components before and after migration. Any differences indicate unintended changes.

2. **Playwright Screenshots**: Capture screenshots of upload flows in both apps before and after migration. Use Playwright visual comparison to detect pixel-level differences.

3. **Manual Smoke Test**: Perform manual upload flow in both main-app and app-instructions-gallery after migration to verify "looks the same, works the same" principle.

**If visual regressions detected**:
- Investigate root cause (missing Tailwind class, incorrect primitive import, etc.)
- Revert to original implementation if needed
- Document any intentional visual changes (should be ZERO for this story)

---

## Non-MVP UI/UX (Out of Scope)

The following are NOT required for this story and should be deferred to future work:

- Storybook documentation for upload components
- Visual polish or redesign of upload UI
- Animation improvements beyond existing reduced-motion support
- New upload component variants (e.g., compact mode, inline mode)
- Drag-and-drop improvements (multi-target, nested folders)
- Upload resumability or pause/resume controls
- Advanced progress indicators (speed, time remaining)
- Bulk upload operations UI (select all, remove all)
- Upload history or recently uploaded files UI

These items can be tracked in `_pm/FUTURE-UIUX.md` (see below).

---
