# UI/UX Notes: BUGF-015

## Verdict

**PASS-WITH-NOTES**

This is a test coverage story, not a UI implementation story. The components being tested already exist and have established UI/UX patterns. The focus is on ensuring tests validate the existing UI/UX requirements, particularly accessibility and user experience.

Tests must verify that existing components meet accessibility standards and provide good user experience through proper error handling, feedback mechanisms, and keyboard navigation.

## MVP Component Architecture

**Components Under Test (24 total):**

This story tests existing components, organized by priority:

### High Priority (Security Critical & Recently Modified)
1. **Admin Components:**
   - AdminModule.tsx - Admin area wrapper
   - UnblockUserDialog.tsx - User unblock confirmation
   - UserSearchInput.tsx - Admin search with debouncing
   - RevokeTokensDialog.tsx - Token revocation confirmation
   - AdminUserDetailPage.tsx - User detail view

2. **Upload Components:**
   - SessionProvider/index.tsx - Upload session context
   - UploaderFileItem/index.tsx - Individual file item
   - UploaderList/index.tsx - Grouped file list
   - ConflictModal/index.tsx - File conflict resolution
   - RateLimitBanner/index.tsx - Rate limit countdown
   - SessionExpiredBanner/index.tsx - Session expiry warning

### Medium Priority
3. **Module Wrappers:**
   - SetsGalleryModule.tsx - Sets micro-frontend wrapper
   - InspirationModule.tsx - Inspiration micro-frontend wrapper
   - InstructionsCreateModule.tsx - Instructions micro-frontend wrapper

4. **Form Components:**
   - TagInput.tsx - Tag input with validation
   - SlugField.tsx - Slug generation and validation

### Low Priority
5. **Navigation & Layout:**
   - NotFoundHandler.tsx - 404 handling
   - Sidebar.tsx - Main sidebar navigation
   - RootLayout.tsx - Root layout wrapper
   - CacheDashboard.tsx - Cache management

6. **Pages:**
   - InstructionsNewPage.tsx - New instructions wrapper
   - PlaceholderPage.tsx - Generic placeholder
   - UnauthorizedPage.tsx - 401 error page

**Reuse Targets:**
- `@repo/app-component-library` - All UI primitives already used by components
- Existing test patterns from 53 test files provide established UX validation approaches

**shadcn primitives already in use:**
- Dialog (UnblockUserDialog, RevokeTokensDialog, ConflictModal)
- Input (UserSearchInput, TagInput, SlugField)
- Button (all action components)
- Progress (UploaderFileItem, UploaderList)
- Alert/Banner (RateLimitBanner, SessionExpiredBanner)

## MVP Accessibility (Blocking Only)

### Critical Accessibility Requirements Tests Must Verify

**1. Dialog Accessibility (Admin Dialogs, ConflictModal):**
- [ ] Tests verify `role="dialog"` attribute present
- [ ] Tests verify `aria-labelledby` references dialog title
- [ ] Tests verify `aria-describedby` references dialog description
- [ ] Tests verify focus trap within dialog (Tab cycles within modal)
- [ ] Tests verify Escape key closes dialog
- [ ] Tests verify focus returns to trigger element on close
- [ ] Tests verify destructive actions require confirmation (2-step process)

**2. Form Accessibility (TagInput, SlugField, UserSearchInput):**
- [ ] Tests verify all inputs have accessible labels (via `<label>`, `aria-label`, or `aria-labelledby`)
- [ ] Tests verify error messages linked via `aria-describedby`
- [ ] Tests verify error messages have `role="alert"` or `aria-live="assertive"`
- [ ] Tests verify character count displays real-time feedback
- [ ] Tests verify validation errors prevent form submission
- [ ] Tests verify focus moves to first error on validation failure

**3. Progress Feedback (Upload Components):**
- [ ] Tests verify progress bars have `role="progressbar"`
- [ ] Tests verify `aria-valuenow`, `aria-valuemin`, `aria-valuemax` attributes
- [ ] Tests verify progress updates announced via `aria-live="polite"`
- [ ] Tests verify loading states have `aria-busy="true"`
- [ ] Tests verify completion announced to screen readers

**4. Keyboard Navigation (All Interactive Components):**
- [ ] Tests verify all interactive elements focusable via Tab
- [ ] Tests verify Enter key activates buttons
- [ ] Tests verify Space key activates buttons/checkboxes
- [ ] Tests verify Escape key closes modals/dialogs
- [ ] Tests verify tab order follows visual flow
- [ ] Tests verify focus visible on keyboard navigation (`:focus-visible` or custom focus styles)

**5. Error State Accessibility (All Components with API Calls):**
- [ ] Tests verify error messages have `role="alert"` or `aria-live="assertive"`
- [ ] Tests verify error messages reference failed action context
- [ ] Tests verify retry actions available and keyboard accessible
- [ ] Tests verify network errors display user-friendly messages (not raw error codes)

**6. Screen Reader Announcements:**
- [ ] Tests verify dynamic content changes announced (via `aria-live`)
- [ ] Tests verify success actions announced ("User blocked successfully")
- [ ] Tests verify countdown timers announce at intervals (e.g., every 10 seconds)
- [ ] Tests verify file upload status changes announced
- [ ] Tests verify navigation changes announced (route transitions)

## MVP Design System Rules

**Token-Only Colors:**
- Tests do NOT need to verify color values (visual regression not in scope)
- Tests should verify components render without errors (no missing Tailwind classes)

**`_primitives` Import Requirement:**
- Tests verify components use primitives correctly (Dialog, Input, Button, etc.)
- Tests should verify primitive components render expected ARIA attributes
- No hardcoded UI implementation - all components use shadcn primitives

**Component Library Compliance:**
- All components already use `@repo/app-component-library` (mocked in tests via `src/test/setup.ts`)
- Tests verify correct props passed to primitives
- Tests verify component composition follows established patterns

## MVP Playwright Evidence

**NOT REQUIRED** per ADR-006 (E2E tests optional during dev phase).

If E2E tests added in future:
1. **Admin Flow:** Navigate to admin panel → search for user → block user → verify blocked state → unblock user → revoke tokens
2. **Upload Flow:** Start upload → wait for session expiry → verify banner shown → refresh session → complete upload
3. **Form Validation:** Create MOC with tags → add 10 tags → attempt 11th tag → verify error → submit with max tags
4. **Accessibility:** Full keyboard navigation of admin panel, upload page, form inputs

## FUTURE-UIUX.md (Polish)

**Separate file:** `/Users/michaelmenard/Development/monorepo/plans/future/bug-fix/backlog/BUGF-015/_pm/FUTURE-UIUX.md`

# UX Polish Opportunities

**Delighter Ideas:**
1. **Admin Actions:** Add toast notifications for successful admin actions (currently may rely on dialog close)
2. **Upload Progress:** Add confetti animation on upload completion
3. **Tag Input:** Add tag suggestions based on popular tags
4. **Slug Field:** Add real-time URL preview showing final public URL

**Edge Case Handling:**
1. **RateLimitBanner:** Play sound notification when retry available
2. **SessionExpiredBanner:** Auto-refresh session if user is actively typing
3. **ConflictModal:** Suggest alternative filenames based on existing naming patterns
4. **UserSearchInput:** Add keyboard shortcuts (Cmd+K to focus search)

**Animation/Transition Suggestions:**
1. **Dialogs:** Add smooth fade-in/scale-up entrance animation (Framer Motion)
2. **Progress Bars:** Add smooth transition between progress states
3. **Tag Chips:** Add bounce animation when tag added
4. **Error Messages:** Add shake animation on validation error

# Accessibility Enhancements

**Beyond-Basic A11y Improvements:**
1. **Skip Links:** Add skip-to-main-content links for keyboard users
2. **Landmark Regions:** Ensure all pages have proper landmark structure (`<main>`, `<nav>`, `<aside>`)
3. **Reduced Motion:** Respect `prefers-reduced-motion` for all animations
4. **High Contrast:** Test all components in Windows High Contrast mode

**WCAG AAA Considerations:**
1. **Color Contrast:** Verify 7:1 contrast ratio for all text (currently 4.5:1 for WCAG AA)
2. **Focus Indicators:** Increase focus ring thickness to 3px (currently 2px)
3. **Touch Targets:** Ensure all interactive elements minimum 44x44px (mobile)
4. **Timeout Warnings:** Add 2-minute warning before session expiry (currently expires without warning)

# UI Improvements

**Visual Polish:**
1. **Admin Tables:** Add zebra striping for better row scanning
2. **Upload List:** Add file type icons (PDF, JPG, PNG, etc.)
3. **Progress Bars:** Add color coding (blue = in progress, green = complete, red = error)
4. **Empty States:** Add illustrations to empty state messages

**Responsive Refinements:**
1. **Admin Panel:** Optimize table layout for mobile (card view instead of table)
2. **Upload Components:** Stack file items vertically on mobile
3. **Sidebar:** Improve mobile collapse transition (slide from left)
4. **Dialogs:** Full-screen dialogs on small viewports

**Design System Extensions:**
1. **Tag Input:** Create reusable `TagInput` primitive in `@repo/app-component-library`
2. **File Upload:** Extract upload components to `@repo/upload-components` for reuse
3. **Admin Components:** Create `@repo/admin-components` for admin-specific UI patterns
4. **Progress Feedback:** Standardize progress indicator patterns across all upload flows

---

## Test Validation Requirements

Tests must validate the following UX requirements for each component category:

### Admin Components UX Validation
- **Confirmation Flows:** Tests verify 2-step confirmation for destructive actions (block, unblock, revoke tokens)
- **Search Experience:** Tests verify debouncing prevents excessive API calls, search clears on ESC key
- **Error Recovery:** Tests verify retry options available on API failures
- **Loading States:** Tests verify loading indicators during API calls, buttons disabled while loading

### Upload Components UX Validation
- **Progress Feedback:** Tests verify clear progress indication (percentage, visual bar, time remaining)
- **Error Handling:** Tests verify upload errors display actionable messages (retry, remove, change file)
- **Session Management:** Tests verify session expiry warnings before expiration, refresh action available
- **Conflict Resolution:** Tests verify clear conflict messaging, suggested resolution (rename), validation feedback

### Form Components UX Validation
- **Real-Time Validation:** Tests verify validation feedback appears immediately (not just on submit)
- **Character Limits:** Tests verify character count displays, updates in real-time, warns near limit
- **Error Messages:** Tests verify errors are user-friendly ("Tag must be 30 characters or less" not "Validation error")
- **Success States:** Tests verify successful actions communicated clearly (tag added, slug generated)

### Navigation & Layout UX Validation
- **404 Handling:** Tests verify friendly 404 message, clear navigation back to safety
- **Active States:** Tests verify current page highlighted in sidebar navigation
- **Responsive Behavior:** Tests verify mobile sidebar collapses properly, accessible toggle button
- **Cache Management:** Tests verify confirmation before clearing cache, stats display clearly

### Page UX Validation
- **Loading States:** Tests verify skeleton loading or spinner shown while page loads
- **Error States:** Tests verify error boundaries catch errors, display fallback UI
- **Empty States:** Tests verify helpful empty state messages with calls-to-action
- **Unauthorized Access:** Tests verify 401 page displays clear message, sign-in redirect available

## Testing Anti-Patterns to Avoid

**Don't:**
- Test implementation details (internal state, private methods)
- Use `getByTestId` unless semantic queries impossible (use `getByRole`, `getByLabelText`, `getByText`)
- Test styling/CSS classes (focus on user behavior, not visual appearance)
- Mock too deeply (use established MSW handlers, don't mock component internals)
- Write brittle tests tied to exact DOM structure (use accessibility queries)

**Do:**
- Test user behavior (what users see and interact with)
- Use semantic queries that mirror assistive technology
- Test accessibility attributes (ARIA roles, labels, descriptions)
- Test keyboard interactions (Tab, Enter, Escape, Space)
- Test error messages and feedback (user-facing content)
- Test focus management (where focus goes on interactions)
