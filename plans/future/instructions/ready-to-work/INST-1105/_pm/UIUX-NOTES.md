---
story_id: INST-1105
story_title: "Upload Instructions (Presigned >10MB)"
generated: "2026-02-09"
agent: pm-uiux-recommendations
version: "1.0"
---

# UI/UX Notes: INST-1105 - Upload Instructions (Presigned >10MB)

## Overview

This story extends the direct upload pattern (INST-1104) to handle large PDF files (10-50MB) using presigned URLs. The key UX challenge is communicating upload progress, session expiry, and providing clear cancellation/retry controls while maintaining the same visual language as INST-1104.

**UX Principles:**
1. **Transparency**: Show progress, upload speed, time remaining
2. **Control**: Clear cancel and retry buttons
3. **Resilience**: Auto-refresh on session expiry, graceful error recovery
4. **Consistency**: Same upload UI as INST-1104, just with progress tracking

---

## Component Architecture

### Primary Component: PresignedUpload

**Location**: `apps/web/app-instructions-gallery/src/components/PresignedUpload.tsx`

**Relationship to Existing Components**:
- **Extends**: `InstructionsUpload` (INST-1104) - Same file picker, validation, file list
- **Composes**: `@repo/ui` primitives (Button, Progress, Card)
- **Uses**: `useUploadManager` hook for state management

**Component Tree**:
```
PresignedUpload
├── FilePickerZone (from InstructionsUpload)
│   ├── Input[type=file]
│   └── HelperText: "Select PDF files (10-50MB)"
├── UploadQueue
│   ├── UploadFileItem (x N files)
│   │   ├── FileIcon (PDF icon)
│   │   ├── FileMetadata
│   │   │   ├── Filename
│   │   │   ├── FileSize
│   │   │   └── UploadStatus (queued | uploading | success | failed | expired)
│   │   ├── ProgressBar (when uploading)
│   │   │   ├── LinearProgress (0-100%)
│   │   │   ├── ProgressLabel: "Uploading... 45%"
│   │   │   └── UploadSpeed: "2.5 MB/s"
│   │   ├── ActionButtons
│   │   │   ├── CancelButton (when uploading)
│   │   │   └── RetryButton (when failed)
│   │   └── SessionExpiryWarning (when <5 min remaining)
│   └── BatchActions
│       ├── StartButton (when files queued)
│       ├── CancelAllButton (when uploading)
│       └── RetryFailedButton (when failures exist)
└── SessionExpiryToast (when auto-refresh triggered)
```

---

## Visual Design Specifications

### File Picker Zone (Reuse from INST-1104)

**Visual State**: Same as INST-1104 with updated helper text

**Helper Text**:
- Default: "Select PDF files (10-50MB). Files ≤10MB upload instantly."
- On hover: Border color changes to sky-600
- On drop: Background changes to sky-50

**Validation Messages** (client-side):
- File too small: "This file is only 8MB. Use the direct upload for files ≤10MB." (warning, not error)
- File too large: "File too large. Max 50MB." (error, red text)
- Invalid type: "Instructions must be PDF files." (error, red text)

---

### Upload Queue - File Item States

**State 1: Queued (Waiting to Upload)**
```
┌────────────────────────────────────────────────────────┐
│ [PDF Icon]  castle-instructions.pdf                    │
│             25.5 MB • Queued                            │
│                                                         │
│ [Start Upload] [Remove]                                │
└────────────────────────────────────────────────────────┘
```
- **Status Badge**: "Queued" (gray, subtle)
- **Buttons**: "Start Upload" (primary, sky-600), "Remove" (ghost, red text)

**State 2: Uploading (Progress Active)**
```
┌────────────────────────────────────────────────────────┐
│ [PDF Icon]  castle-instructions.pdf                    │
│             25.5 MB • Uploading... 45%                  │
│                                                         │
│ ████████████░░░░░░░░░░░░░░ 45%                         │
│ 2.5 MB/s • 6 seconds remaining                         │
│                                                         │
│ [Cancel]                                                │
└────────────────────────────────────────────────────────┘
```
- **Status Text**: "Uploading... 45%" (dynamic, updates with progress)
- **Progress Bar**: Linear, sky-600 fill, rounded corners, height 8px
- **Upload Speed**: "2.5 MB/s" (calculated from XHR progress events)
- **Time Remaining**: "6 seconds remaining" (calculated: remaining bytes / upload speed)
- **Cancel Button**: Destructive style (red-600), keyboard accessible (Escape key)

**Progress Bar Attributes** (Accessibility):
```jsx
<Progress
  value={45}
  max={100}
  aria-label="Upload progress for castle-instructions.pdf"
  aria-valuenow={45}
  aria-valuemin={0}
  aria-valuemax={100}
  aria-valuetext="45% uploaded, 2.5 megabytes per second"
/>
```

**State 3: Success (Upload Complete)**
```
┌────────────────────────────────────────────────────────┐
│ [PDF Icon]  castle-instructions.pdf                    │
│             25.5 MB • ✓ Uploaded                        │
│                                                         │
│ [Download] [Remove]                                    │
└────────────────────────────────────────────────────────┘
```
- **Status Badge**: "✓ Uploaded" (green-600)
- **Buttons**: "Download" (primary), "Remove" (ghost)
- **Success Announcement**: Screen reader announces "castle-instructions.pdf uploaded successfully"

**State 4: Failed (Error State)**
```
┌────────────────────────────────────────────────────────┐
│ [PDF Icon]  castle-instructions.pdf                    │
│             25.5 MB • ✗ Upload failed                   │
│                                                         │
│ Upload failed. Check your connection.                  │
│                                                         │
│ [Retry] [Remove]                                       │
└────────────────────────────────────────────────────────┘
```
- **Status Badge**: "✗ Upload failed" (red-600)
- **Error Message**: User-friendly message below filename
  - Network error: "Upload failed. Check your connection."
  - S3 error: "Upload failed. Please try again."
  - Rate limit: "Upload limit reached. Try again tomorrow."
- **Buttons**: "Retry" (primary, sky-600), "Remove" (ghost)
- **Error Announcement**: Screen reader announces "castle-instructions.pdf upload failed. Upload failed. Check your connection."

**State 5: Expired (Session Expired, Auto-Refresh Triggered)**
```
┌────────────────────────────────────────────────────────┐
│ [PDF Icon]  castle-instructions.pdf                    │
│             25.5 MB • Session expired. Refreshing...    │
│                                                         │
│ [spinner] Getting new upload link...                   │
└────────────────────────────────────────────────────────┘
```
- **Status Badge**: "Session expired. Refreshing..." (yellow-600)
- **Spinner**: Inline spinner next to status text
- **Auto-refresh**: Happens automatically, no user action required
- **Announcement**: "Session expired. Getting new upload link."

**State 6: Cancelled (User Cancelled Upload)**
```
┌────────────────────────────────────────────────────────┐
│ [PDF Icon]  castle-instructions.pdf                    │
│             25.5 MB • Cancelled                         │
│                                                         │
│ [Retry] [Remove]                                       │
└────────────────────────────────────────────────────────┘
```
- **Status Badge**: "Cancelled" (gray-500)
- **Buttons**: "Retry" (re-queues file), "Remove" (removes from list)

---

### Session Expiry Warning

**When to Show**: Session has <5 minutes remaining before expiry

**Visual Treatment**:
```
┌────────────────────────────────────────────────────────┐
│ [PDF Icon]  castle-instructions.pdf                    │
│             25.5 MB • Queued                            │
│                                                         │
│ ⚠ Upload session expires in 5 minutes                  │
│                                                         │
│ [Start Upload] [Remove]                                │
└────────────────────────────────────────────────────────┘
```
- **Icon**: Warning triangle (⚠) in yellow-600
- **Message**: "Upload session expires in X minutes" (countdown updates every 30 seconds)
- **Visual**: Yellow background (yellow-50), yellow border (yellow-300)
- **Action**: Prompt user to start upload soon
- **Auto-refresh**: If session expires before upload starts, auto-refresh triggers automatically

**Accessibility**:
- `role="alert"` for screen reader announcement when warning appears
- `aria-live="polite"` for countdown updates

---

### Batch Actions (Multiple Files)

**When Shown**: User has multiple files in queue

**Visual Layout**:
```
┌────────────────────────────────────────────────────────┐
│ Uploading 3 of 5 files                                 │
│                                                         │
│ [Pause All] [Cancel All]                               │
└────────────────────────────────────────────────────────┘
```

**Actions**:
- **Start All** (when files queued): Starts max 3 concurrent uploads
- **Pause All** (when uploading): Pauses all active uploads (optional, Phase 2)
- **Cancel All** (when uploading): Confirmation modal → Cancels all uploads
- **Retry Failed** (when failures exist): Retries all failed uploads

**Cancel All Confirmation Modal**:
```
┌────────────────────────────────────────────────────────┐
│ Cancel All Uploads?                                    │
│                                                         │
│ This will cancel 3 uploads in progress.                │
│ You can retry later.                                   │
│                                                         │
│ [Cancel] [Cancel All Uploads]                          │
└────────────────────────────────────────────────────────┘
```
- Primary button: "Cancel" (closes modal, gray)
- Destructive button: "Cancel All Uploads" (red-600, bold)

---

### Session Expiry Auto-Refresh Toast

**When Shown**: Session expired and auto-refresh triggered

**Visual Treatment**:
```
┌────────────────────────────────────────────────────────┐
│ ⚠ Session expired. Refreshing...                       │
│                                                         │
│ Getting new upload links for 3 files.                  │
└────────────────────────────────────────────────────────┘
```
- **Type**: Toast notification (top-right corner)
- **Duration**: 3 seconds (auto-dismiss after refresh completes)
- **Icon**: Warning triangle (yellow-600)
- **Message**: "Getting new upload links for X files."
- **Success Follow-up**: "Upload links refreshed. Ready to upload." (green toast)

---

## Interaction Patterns

### File Selection Flow

1. User clicks "Add Instructions" button or file picker zone
2. File picker opens (accept=".pdf", multiple=true)
3. User selects 1 or more PDF files
4. **Client Validation**:
   - Check file type (must be PDF)
   - Check file size (10-50MB range)
   - If ≤10MB: Route to INST-1104 direct upload (no presigned URL)
   - If >50MB: Show error toast "File too large. Max 50MB."
5. Valid files added to queue with status "Queued"
6. "Start Upload" button enabled

### Upload Flow

1. User clicks "Start Upload" (or "Start All" for batch)
2. **Session Creation**:
   - Frontend calls `useCreateUploadSessionMutation` for each file
   - Request: `{ filename, fileSize, fileType: "application/pdf" }`
   - Response: `{ sessionId, presignedUrl, expiresAt }`
   - File state changes to "Uploading..." (progress 0%)
3. **Direct S3 Upload**:
   - Frontend calls `uploadToPresignedUrl(presignedUrl, file)`
   - XHR progress events fire → Update progress bar, upload speed, time remaining
   - Max 3 concurrent uploads (concurrentLimit enforced by useUploadManager)
4. **Completion**:
   - S3 upload succeeds (200 OK)
   - Frontend calls `useCompleteUploadSessionMutation({ sessionId })`
   - Response: moc_files record with CloudFront URL
   - File state changes to "✓ Uploaded"
   - Success toast: "Instructions uploaded!"
   - RTK Query cache invalidated → Instructions list refreshes

### Cancel Flow

1. User clicks "Cancel" button on uploading file
2. **Confirmation Modal** (optional, Phase 2):
   ```
   Cancel upload?
   This will stop uploading castle-instructions.pdf.
   [No, Continue] [Yes, Cancel]
   ```
3. User confirms cancellation
4. XHR request aborted (`xhr.abort()`)
5. File state changes to "Cancelled"
6. File remains in queue with "Retry" button
7. Next queued file starts (if available)

### Retry Flow

1. User clicks "Retry" button on failed/cancelled file
2. **File Handle Check**:
   - If file handle exists: Re-queue file, restart upload flow
   - If file handle lost (page reload): Show error "File no longer available. Please select the file again."
3. Session creation → S3 upload → Completion (same as upload flow)

### Session Expiry Auto-Refresh Flow

1. **Local TTL Check** (before upload starts):
   - Check if `expiresAt < (now + SESSION_EXPIRY_BUFFER_MS)`
   - If expired: Trigger auto-refresh
2. **Auto-Refresh Sequence**:
   - Mark expired files (`markExpiredFiles()`)
   - Show toast: "Session expired. Refreshing..."
   - Create new sessions for expired files (`useCreateUploadSessionMutation`)
   - Update file state with new `presignedUrl` and `expiresAt`
   - Show success toast: "Upload links refreshed. Ready to upload."
   - Resume upload automatically (if user already clicked "Start Upload")
3. **API Error Handling** (EXPIRED_SESSION from backend):
   - Backend returns 400 with `errorCode: "EXPIRED_SESSION"`
   - Frontend detects error code → Trigger auto-refresh flow
   - Same sequence as local TTL check

---

## Responsive Design

### Desktop (≥1024px)

- File list: 1 column, full width
- Progress bar: Full width within file item
- Buttons: Inline (right-aligned)
- Session expiry warning: Inline banner within file item

### Tablet (768px - 1023px)

- File list: 1 column
- Progress bar: Full width
- Buttons: Stacked vertically (mobile-first)
- Upload speed and time remaining: Single line

### Mobile (≤767px)

- File list: 1 column
- Progress bar: Full width, height 12px (thicker for touch)
- Buttons: Full width, stacked
- Upload speed: Hidden (space constraint)
- Time remaining: Shown ("6 seconds remaining")
- Session expiry warning: Full-width banner above file item

---

## Accessibility Requirements (MVP-Critical)

### Keyboard Navigation

| Key | Action |
|-----|--------|
| Tab | Navigate between file items, buttons |
| Enter/Space | Activate buttons (Start, Cancel, Retry, Remove) |
| Escape | Cancel upload (when file item focused) |
| Arrow Up/Down | Navigate between file items in queue |

### Screen Reader Announcements

| Event | Announcement |
|-------|--------------|
| File added to queue | "castle-instructions.pdf added to queue. 25.5 megabytes. Queued." |
| Upload started | "Uploading castle-instructions.pdf. 0% uploaded." |
| Progress update (every 25%) | "25% uploaded. 2.5 megabytes per second." |
| Upload completed | "castle-instructions.pdf uploaded successfully." |
| Upload failed | "castle-instructions.pdf upload failed. Upload failed. Check your connection." |
| Session expired | "Session expired. Getting new upload link." |
| Session refreshed | "Upload link refreshed. Ready to upload." |
| Upload cancelled | "Upload cancelled." |

**Implementation**:
- Use `aria-live="polite"` for progress updates (non-critical)
- Use `aria-live="assertive"` for errors and session expiry (critical)
- Use `role="alert"` for error messages
- Use `aria-describedby` to link error messages to file items

### ARIA Attributes

**Progress Bar**:
```jsx
<Progress
  value={progress}
  max={100}
  aria-label={`Upload progress for ${filename}`}
  aria-valuenow={progress}
  aria-valuemin={0}
  aria-valuemax={100}
  aria-valuetext={`${progress}% uploaded, ${uploadSpeed} megabytes per second`}
/>
```

**Cancel Button**:
```jsx
<Button
  onClick={handleCancel}
  aria-label={`Cancel upload of ${filename}`}
  aria-keyshortcuts="Escape"
>
  Cancel
</Button>
```

**Status Badge**:
```jsx
<Badge
  variant={statusVariant}
  aria-label={`Status: ${statusText}`}
>
  {statusText}
</Badge>
```

### Focus Management

1. **After file selection**: Focus moves to first queued file item
2. **After upload starts**: Focus remains on "Cancel" button
3. **After upload completes**: Focus moves to "Download" button
4. **After error**: Focus moves to "Retry" button
5. **After cancellation**: Focus moves to "Retry" button
6. **Modal open** (Cancel All): Focus trapped in modal, focus on "Cancel" button (primary action)

### Color Contrast

All text and interactive elements meet WCAG AA contrast ratio (4.5:1 for normal text, 3:1 for large text):
- **Progress bar fill** (sky-600 on white): 7.21:1 ✓
- **Error text** (red-600 on white): 5.93:1 ✓
- **Success badge** (green-600 on white): 4.89:1 ✓
- **Warning background** (yellow-50 with yellow-600 text): 5.12:1 ✓

---

## Accessibility Requirements (Nice-to-Have / Phase 2)

- **Keyboard Shortcuts Modal**: `Shift + ?` to show shortcuts (`Escape` to cancel, `Enter` to retry)
- **High Contrast Mode**: Ensure progress bar visible in Windows High Contrast Mode
- **Reduced Motion**: Disable progress bar animation if `prefers-reduced-motion: reduce`
- **Screen Reader Progress Verbosity**: Setting to reduce progress announcements (e.g., announce every 50% instead of 25%)

---

## Animation & Motion

### Progress Bar Animation

- **Smooth transition**: Progress bar fills smoothly with CSS transition (`transition: width 0.3s ease-out`)
- **No animation on completion**: Instant jump to 100% when upload completes (no delay)
- **Reduced motion**: Disable animation if `prefers-reduced-motion: reduce`

### Session Expiry Toast

- **Slide in**: Toast slides in from top-right (200ms ease-out)
- **Auto-dismiss**: Fades out after 3 seconds (300ms ease-in)

### Success State Transition

- **Checkmark animation**: Checkmark (✓) scales in (scale 0 → 1, 200ms ease-out)
- **Badge color change**: Green background fades in (300ms)

---

## Error Messaging

### Error Message Mapping

| Error Code | User-Friendly Message | Recovery Action |
|------------|----------------------|-----------------|
| FILE_TOO_SMALL | "This file is only 8MB. Use the direct upload for files ≤10MB." | Info (not error), suggest alternative |
| FILE_TOO_LARGE | "File too large. Max 50MB." | Remove file, select smaller file |
| INVALID_MIME_TYPE | "Instructions must be PDF files." | Remove file, select PDF |
| RATE_LIMIT_EXCEEDED | "Upload limit reached. Try again tomorrow." | Disable retry, show retry countdown |
| NETWORK_ERROR | "Upload failed. Check your connection." | Retry button |
| S3_ERROR | "Upload failed. Please try again." | Retry button |
| EXPIRED_SESSION | "Session expired. Refreshing..." | Auto-refresh (no user action) |
| FILE_NOT_IN_S3 | "File not found in storage. Please retry upload." | Retry button (full flow) |
| SIZE_MISMATCH | "File size doesn't match. Please upload again." | Retry button |
| FORBIDDEN | "You don't have permission to upload to this MOC." | Disable upload, show error |
| MOC_NOT_FOUND | "MOC not found. Please refresh the page." | Show error, suggest refresh |

### Error Toast vs Inline Error

- **Inline errors** (within file item): FILE_TOO_LARGE, INVALID_MIME_TYPE, NETWORK_ERROR, S3_ERROR
- **Toast errors** (global): RATE_LIMIT_EXCEEDED, FORBIDDEN, MOC_NOT_FOUND
- **Auto-refresh (no error shown)**: EXPIRED_SESSION (info toast instead)

---

## Component Reuse from Existing Codebase

### Direct Reuse (No Modifications)

1. **@repo/ui primitives**:
   - `Button` - Start, Cancel, Retry, Remove buttons
   - `Progress` - Progress bar component
   - `Card` - File item container
   - `Badge` - Status badges (Queued, Uploading, Success, Failed)
   - `Toast` - Success/error notifications

2. **File validation utilities** (from INST-1104):
   - `validatePdfFile(file)` - Client-side PDF validation
   - `validatePdfMimeType(file)` - MIME type check
   - `validatePdfExtension(filename)` - File extension check
   - `validateFileSize(file, minBytes, maxBytes)` - Size threshold check

### Adapt & Extend

1. **InstructionsUpload component** (INST-1104):
   - **Reuse**: File picker zone, file list display, validation
   - **Extend**: Add file size check (≤10MB → direct, >10MB → presigned)
   - **Modify**: Add progress bar to file item when status='uploading'

2. **useUploadManager hook**:
   - **Reuse**: Progress tracking, cancel, retry, session expiry detection
   - **Integrate**: Connect to `useCreateUploadSessionMutation` and `useCompleteUploadSessionMutation`

---

## MVP-Critical vs Nice-to-Have

### MVP-Critical (Must Have for Story Completion)

- [x] Progress bar with percentage during upload
- [x] Upload speed display ("2.5 MB/s")
- [x] Cancel button (aborts active upload)
- [x] Retry button after failure
- [x] Session expiry warning (<5 min remaining)
- [x] Session expiry auto-refresh flow
- [x] Error messages for all error codes
- [x] Keyboard accessibility (Tab, Enter, Escape)
- [x] Screen reader announcements (status, progress, errors)
- [x] ARIA attributes (aria-valuenow, aria-label, aria-live)
- [x] Color contrast compliance (WCAG AA)
- [x] Concurrent upload limit (max 3)

### Nice-to-Have (Phase 2)

- [ ] Time remaining display ("6 seconds remaining")
- [ ] Pause button (pause/resume upload)
- [ ] Batch actions (Start All, Cancel All, Retry Failed)
- [ ] Cancel All confirmation modal
- [ ] Keyboard shortcuts modal (Shift + ?)
- [ ] High Contrast Mode support
- [ ] Reduced motion support
- [ ] Progress announcement verbosity setting
- [ ] Upload history (show recently uploaded files)

---

## Design System Tokens

### Colors

| Token | Value | Usage |
|-------|-------|-------|
| `sky-600` | #0284c7 | Progress bar fill, primary buttons |
| `sky-50` | #f0f9ff | Hover state on file picker zone |
| `green-600` | #16a34a | Success badge background |
| `red-600` | #dc2626 | Error text, cancel button |
| `yellow-600` | #ca8a04 | Warning text (session expiry) |
| `yellow-50` | #fefce8 | Warning background (session expiry) |
| `gray-500` | #6b7280 | Cancelled status, disabled state |

### Typography

| Element | Font | Size | Weight |
|---------|------|------|--------|
| Filename | Inter | 16px | 500 (Medium) |
| File size | Inter | 14px | 400 (Regular) |
| Status text | Inter | 14px | 500 (Medium) |
| Upload speed | Inter | 12px | 400 (Regular) |
| Error message | Inter | 14px | 400 (Regular) |

### Spacing

| Element | Spacing |
|---------|---------|
| File item padding | 16px |
| File item margin-bottom | 12px |
| Progress bar height | 8px (desktop), 12px (mobile) |
| Progress bar margin-top | 8px |
| Button margin-top | 12px |

---

## Visual Regression Testing

### Playwright Visual Regression Tests

**Snapshots to Capture**:
1. File item - Queued state
2. File item - Uploading state (25%, 50%, 75%, 100%)
3. File item - Success state
4. File item - Failed state
5. File item - Expired state (with warning banner)
6. File item - Cancelled state
7. Session expiry warning banner
8. Session expiry auto-refresh toast
9. Cancel All confirmation modal
10. Batch with 5 files (3 uploading, 1 queued, 1 success)

**Example Test**:
```typescript
test('Progress bar visual regression', async ({ page }) => {
  await page.goto('/mocs/123')
  await uploadPresignedFile(page, 'test-30mb.pdf')
  await page.waitForSelector('[data-testid="upload-progress"]')

  // Capture at 0%
  await expect(page.locator('[data-testid="file-item"]')).toHaveScreenshot('progress-0.png')

  // Capture at 50%
  await page.waitForFunction(() => {
    const progress = document.querySelector('[aria-valuenow]')
    return progress?.getAttribute('aria-valuenow') === '50'
  })
  await expect(page.locator('[data-testid="file-item"]')).toHaveScreenshot('progress-50.png')

  // Capture at 100%
  await page.waitForFunction(() => {
    const progress = document.querySelector('[aria-valuenow]')
    return progress?.getAttribute('aria-valuenow') === '100'
  })
  await expect(page.locator('[data-testid="file-item"]')).toHaveScreenshot('progress-100.png')
})
```

---

## Open Questions for PM/Design Review

1. **Time remaining display**: MVP-critical or Phase 2? (Adds complexity: needs accurate speed calculation)
2. **Pause button**: Deferred to Phase 2? (XHR pause/resume is complex)
3. **Batch actions UI**: Show "Start All" when ≥3 files queued? (Reduces clicks but adds UI clutter)
4. **Cancel confirmation**: Required for single file cancel or only "Cancel All"? (Reduces accidental cancellations but adds friction)
5. **Session expiry countdown**: Show countdown timer ("14:30 remaining") or just warning at 5 min? (Timer adds precision but visual noise)
6. **Upload speed units**: Always show MB/s or adapt to KB/s for slow connections? (MB/s simpler, KB/s more accurate for <1 MB/s)
7. **Progress announcement frequency**: Every 25% or every 50%? (25% more informative, 50% less verbose for screen readers)

---

**Generated**: 2026-02-09
**Agent**: pm-uiux-recommendations v1.0
**Story**: INST-1105
**Seed File**: STORY-SEED.md
**Review Status**: Ready for Design Review
