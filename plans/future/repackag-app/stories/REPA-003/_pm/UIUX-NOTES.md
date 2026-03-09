# UI/UX Notes: REPA-003 - Migrate Upload Hooks

## Summary

**User-Facing Changes:** NONE

This story is a pure implementation migration with **zero user-facing changes**. The upload hooks (useUploadManager, useUploaderSession) are being consolidated from app-level implementations into a shared package (@repo/upload/hooks), but the API surface and behavior remain identical.

---

## UI Components Consuming These Hooks

### main-app
- **InstructionsNewPage** (`apps/web/main-app/src/routes/pages/InstructionsNewPage.tsx`)
  - Uses: useUploadManager, useUploaderSession
  - Behavior: Multi-file upload with progress tracking, session persistence

- **Uploader Component Tree** (`apps/web/main-app/src/components/Uploader/`)
  - SessionProvider, UploaderList, UploaderFileItem, ConflictModal, RateLimitBanner, SessionExpiredBanner, UnsavedChangesDialog
  - All consume useUploadManager and/or useUploaderSession

### app-instructions-gallery
- **upload-page** (`apps/web/app-instructions-gallery/src/pages/upload-page.tsx`)
  - Uses: useUploadManager, useUploaderSession (anonymous mode only)
  - Behavior: Same as main-app but without authenticated user context

---

## Behaviors to Preserve (User-Facing)

### 1. Session Restoration Toast Notification
**Current Behavior:**
- When a user returns to an upload page with a saved session (< 24 hours old), a toast notification appears:
  - **Message:** "Previous session restored"
  - **Type:** Info toast (blue)
  - **Timing:** Shown immediately on mount if restoration successful

**Migration Requirement:**
- **MUST preserve** this notification
- Hook already calls `useToast` from `@repo/app-component-library`
- No changes to toast behavior or messaging

**Verification:**
- Manual test: Start upload, refresh page, verify toast appears
- E2E test: Assert toast visible after page reload with session

---

### 2. Upload Progress Indicators
**Current Behavior:**
- Each file shows:
  - Progress bar (0-100%)
  - Status badge (Queued, Uploading, Success, Failed, Canceled, Expired)
  - File size and name
  - Cancel button (while uploading)
  - Retry button (if failed)

**Migration Requirement:**
- **MUST preserve** all progress states and transitions
- Callbacks (onProgress, onComplete) must fire with identical data shape
- No changes to progress calculation or status transitions

**Verification:**
- Manual test: Upload multiple files, observe progress bars update smoothly
- Unit test: Assert onProgress callbacks fire with correct percentages

---

### 3. Error Messaging Consistency
**Current Behavior:**
- Upload failures show specific error messages:
  - Network errors: "Failed to upload {filename}. Please try again."
  - 401 expired session: "Your session has expired. Please save your work and refresh."
  - Rate limiting: "Too many uploads. Please wait a moment."
  - File size errors: "{filename} exceeds maximum file size (50MB)."

**Migration Requirement:**
- **MUST preserve** existing error messages
- Error text should remain identical across apps after migration
- useUploadManager already stores `file.error` string - no changes needed

**Verification:**
- Manual test: Trigger each error type, verify message text unchanged
- Unit test: Assert error messages match expected strings

---

### 4. Session Expiry UI Flow
**Current Behavior:**
- When upload returns 401 (session expired):
  1. Upload stops immediately
  2. File status changes to "Expired"
  3. SessionExpiredBanner appears at top of uploader
  4. User must save draft and refresh page to continue

**Migration Requirement:**
- **MUST preserve** this exact flow
- onSessionExpired callback must fire correctly
- SessionExpiredBanner rendering logic stays in consuming components (out of scope)

**Verification:**
- Manual test: Mock 401 response, verify banner appears
- Unit test: Assert onSessionExpired callback invoked on 401

---

### 5. Concurrent Upload Visual Feedback
**Current Behavior:**
- If concurrency = 3, user sees:
  - First 3 files show "Uploading" status with progress bars
  - Remaining files show "Queued" status with no progress
  - As files complete, queued files automatically start

**Migration Requirement:**
- **MUST preserve** concurrency visualization
- Hook state.files array must maintain correct status values
- isUploading boolean must reflect active uploads

**Verification:**
- Manual test: Upload 10 files, observe 3 active at a time
- Unit test: Assert state.uploadingCount never exceeds concurrency limit

---

### 6. Cancel/Retry Button Interactions
**Current Behavior:**
- **Cancel:** Immediately aborts XHR, changes status to "Canceled", removes file from queue
- **Retry:** Re-queues failed file, starts upload if concurrency allows

**Migration Requirement:**
- **MUST preserve** cancel and retry button behavior
- AbortController usage must work identically
- File status transitions must match current behavior

**Verification:**
- Manual test: Cancel mid-upload, verify immediate stop and status change
- Manual test: Retry failed file, verify re-upload starts
- Unit test: Assert AbortController.abort() called on cancel

---

## Accessibility (No Changes)

Current accessibility features remain unchanged:
- **Keyboard navigation:** Already implemented in UploaderList (out of scope for this story)
- **Screen reader announcements:** Files list has proper ARIA labels (out of scope)
- **Focus management:** Upload buttons and file items are keyboard accessible (out of scope)

This story only touches hooks (business logic), not UI components, so accessibility is unaffected.

---

## Design System Compliance (No Changes)

Upload UI components already use:
- **Tailwind CSS** for styling
- **shadcn/ui primitives** (Button, Progress, Badge) from @repo/app-component-library
- **Framer Motion** for progress bar animations

Hook migration does not touch any design system elements.

---

## Mobile/Responsive Behavior (No Changes)

Current responsive behavior:
- Upload UI adapts to mobile viewports (stacked layout, larger touch targets)
- Progress bars scale to screen width
- Toast notifications position correctly on mobile

Hook migration does not affect responsive layout (hooks are viewport-agnostic).

---

## User Testing Checklist (Post-Migration)

**Manual Verification Required:**
- [ ] Start upload, refresh page → session restoration toast appears
- [ ] Upload multiple files → progress bars update smoothly
- [ ] Cancel file mid-upload → status changes to "Canceled" immediately
- [ ] Trigger 401 error → SessionExpiredBanner appears
- [ ] Upload fails → error message matches existing text
- [ ] Retry failed file → re-upload starts correctly
- [ ] Upload exceeds concurrency → files queue correctly
- [ ] Mobile viewport → upload UI remains functional

**Apps to Test:**
- [ ] main-app: /instructions/new page
- [ ] app-instructions-gallery: /upload page

**Browsers to Test:**
- [ ] Chrome (primary)
- [ ] Safari (secondary)
- [ ] Mobile Safari (iOS)

---

## Risk: Subtle Behavior Changes

**Low Risk, But Monitor:**

Even though APIs are identical, subtle timing differences could emerge:
- **Debounce timing:** localStorage writes debounced at 300ms. If package import changes React render cycles, debounce behavior could shift slightly (unlikely but possible).
- **Toast timing:** useToast is mocked in tests but real in production. If toast context changes between apps, restoration notification might behave differently.
- **File handle lifecycle:** File objects tracked via useRef. If React reconciliation changes due to package boundary, file handles might invalidate earlier than expected (rare edge case).

**Mitigation:**
- Extensive manual testing in both apps
- Visual regression testing (if available)
- Monitor user reports for 2 weeks post-deployment

---

## Documentation Updates (Out of Scope for This Story)

Future stories may need to document:
- How apps should import upload hooks (`@repo/upload/hooks` instead of `@/hooks`)
- How to configure authenticated vs anonymous upload sessions
- Session key naming conventions for new apps

These are not user-facing changes, so no end-user documentation is needed. Developer docs will be handled in follow-up stories (e.g., REPA-005 for upload components).

---

## Conclusion

**No UI/UX changes required or expected.** This story is purely an implementation consolidation. All user-facing behaviors, error messages, visual feedback, and accessibility features remain identical. Post-migration manual testing should verify zero regressions in upload flows across both apps.
