# Future UI/UX: REPA-005 - Migrate Upload Components

This file tracks polish opportunities and enhancements that are NOT required for the core migration story (REPA-005) but may be valuable in future iterations.

---

## UX Polish Opportunities

### Upload Progress Enhancements
- Show estimated time remaining for uploads
- Display current upload speed (KB/s or MB/s)
- Add pause/resume controls for long uploads
- Show retry count for failed uploads

### Drag-and-Drop Improvements
- Multi-target drag zones (e.g., thumbnail + instructions in one view)
- Visual feedback for valid vs invalid drop targets
- Nested folder support for bulk uploads
- Drag reordering within upload queue

### Bulk Operations UI
- "Select All" checkbox in UploaderList
- "Remove All" button with confirmation
- "Retry All Failed" button
- Batch progress indicator (e.g., "3 of 10 files uploaded")

### Empty States
- Illustration for empty upload queue
- Contextual tips for first-time users
- Suggested actions when no files selected

### Success States
- Confetti animation on successful upload completion
- Toast notifications for background uploads
- Quick actions after upload (e.g., "View uploaded instructions", "Upload another")

---

## Accessibility Enhancements

### Beyond-Basic A11y Improvements
- High contrast mode support (Windows High Contrast Mode)
- Larger touch targets for mobile (48x48px minimum)
- Voice control landmarks for advanced screen reader users
- Keyboard shortcuts for power users (e.g., Ctrl+U to open upload dialog)

### WCAG AAA Considerations
- 7:1 contrast ratio for all text (currently meets AA at 4.5:1)
- Enhanced focus indicators (3px outline instead of 2px)
- Audio announcements for upload completion (optional, user preference)
- Detailed error explanations with remediation steps (beyond current error messages)

### Screen Reader Optimizations
- Live region announcements for queue updates (e.g., "File added to queue", "File removed")
- Detailed status descriptions (e.g., "Uploading file 2 of 5: MyDocument.pdf, 65% complete")
- Skip links for long upload queues (e.g., "Skip to upload controls")

---

## UI Improvements

### Visual Polish
- Smooth transitions for progress bar updates (currently instant)
- Fade-in animations for success/error states
- Skeleton loaders for thumbnail previews
- Hover effects for drag zones (subtle glow or border color change)

### Responsive Refinements
- Mobile-optimized upload UI (larger buttons, stacked layout)
- Tablet layout for upload queue (2-column grid)
- Improved file picker for mobile devices (camera integration)

### Design System Extensions
- Upload component variants:
  - Compact mode (smaller, for tight layouts)
  - Inline mode (embedded in forms)
  - Full-screen mode (for large batch uploads)
- Themed upload components (light/dark mode toggle)
- Custom branding options (logo, colors, fonts)

---

## Component-Specific Enhancements

### ConflictModal
- Show slug history (previously used slugs)
- Slug availability indicator (green checkmark if available)
- Slug suggestions based on content analysis (AI-powered)

### RateLimitBanner
- Show rate limit quota (e.g., "5 uploads remaining this hour")
- Graphical countdown (circular progress indicator)
- Email notification option for long rate limits

### SessionExpiredBanner
- One-click session refresh (no redirect to login)
- Session expiry countdown before 401 occurs
- Background session refresh (silent, no banner)

### ThumbnailUpload
- Image cropping tool (adjust aspect ratio before upload)
- Filter presets (grayscale, sepia, etc.)
- Multiple thumbnail sizes (small, medium, large)

### InstructionsUpload
- PDF preview before upload (first page thumbnail)
- Page count validation (e.g., max 100 pages)
- File size optimization (compress large PDFs)

### UploaderFileItem
- Expandable file details (file size, dimensions, upload time)
- Drag handle for queue reordering
- File type icons with brand colors (PDF red, PNG orange, etc.)

### UploaderList
- Sort options (name, size, upload progress)
- Filter options (completed, in-progress, failed)
- Export queue as JSON (for debugging or analytics)

### SessionProvider
- Session persistence indicator (icon showing "auto-save active")
- Manual save button (for paranoid users)
- Session conflict resolution (multiple tabs open)

---

## Animation/Transition Suggestions

All animations below should respect `prefers-reduced-motion` media query.

### Delightful Micro-Interactions
- Upload button pulse effect when files dragged over page
- File item "slide in" animation when added to queue
- Progress bar "ease-out" transition for smoother visual updates
- Success checkmark draw animation (SVG path animation)
- Error icon shake animation (subtle, 2-3 iterations)

### Page Transitions
- Fade-in for modal overlays (100ms duration)
- Slide-up for banners (200ms duration)
- Scale-up for thumbnail previews (150ms duration)

### Loading States
- Shimmer effect for thumbnail placeholder
- Pulsing dot animation for "uploading" status
- Spinner with brand colors for slow uploads

---

## Storybook Documentation (Deferred)

Future work to document upload components in Storybook:

### Stories to Create
- ConflictModal (default, with suggested slug, without suggested slug)
- RateLimitBanner (30s countdown, 5min countdown, 1hr countdown)
- SessionExpiredBanner (default, with refresh action)
- UnsavedChangesDialog (default, with custom message)
- UploaderFileItem (uploading, completed, failed, cancelled)
- UploaderList (empty, single file, multiple files, mixed states)
- SessionProvider (auth mode, anonymous mode)
- ThumbnailUpload (empty, with preview, with error)
- InstructionsUpload (empty, single file, multiple files, with errors)

### Interactive Demos
- Full upload flow (drag file → progress → success)
- Error handling flow (upload → fail → retry → success)
- Rate limit flow (upload → 429 error → countdown → retry)
- Conflict flow (upload → 409 error → resolve → success)

### Design Tokens Documentation
- Upload component color palette
- Progress bar styles and variants
- Icon set for file types and status indicators
- Spacing and sizing guidelines

---

## Implementation Priority (Future)

If these enhancements are pursued post-REPA-005, suggested prioritization:

**High Priority** (User Impact):
1. Upload progress enhancements (time remaining, speed)
2. Bulk operations UI (select all, retry all)
3. Mobile-optimized upload UI

**Medium Priority** (Polish):
1. Visual polish (transitions, animations)
2. Empty states with illustrations
3. Storybook documentation

**Low Priority** (Nice-to-Have):
1. WCAG AAA enhancements
2. Custom branding options
3. Advanced drag-and-drop features

---

## Cross-References

- **Test Plan**: Plans/future/repackag-app/backlog/REPA-005/_pm/TEST-PLAN.md
- **Dev Feasibility**: Plans/future/repackag-app/backlog/REPA-005/_pm/DEV-FEASIBILITY.md
- **Story File**: Plans/future/repackag-app/backlog/REPA-005/REPA-005.md (to be generated)

---

**Note**: None of these enhancements are required for REPA-005 to PASS. This file exists to capture ideas for future iterations without bloating the core migration story.
