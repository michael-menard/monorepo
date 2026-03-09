# Test Plan: BUGF-015

## Scope Summary

- **Endpoints touched:** None (frontend unit testing only)
- **UI touched:** No new UI - testing existing components
- **Data/storage touched:** No - MSW mocks handle all API interactions

## Testing Strategy

This story creates unit tests for 24 untested components in main-app. All tests use:
- **Framework:** Vitest + React Testing Library
- **API Mocking:** MSW (handlers already configured in `src/test/setup.ts`)
- **Global Mocks:** Already configured for ResizeObserver, IntersectionObserver, matchMedia, Amplify, Router, Logger, Framer Motion
- **Test Location:** `{ComponentName}/__tests__/{ComponentName}.test.tsx`
- **Coverage Target:** Minimum 45% global coverage (per CLAUDE.md)

## Happy Path Tests

### Phase 1: Admin Components (Security Critical - High Priority)

#### Test 1.1: AdminModule Renders Successfully
- **Setup:** Mock auth state with admin role
- **Action:** Render AdminModule component
- **Expected:** Component renders without errors, admin routes accessible
- **Evidence:** Component snapshot, no console errors

#### Test 1.2: UnblockUserDialog Confirmation Flow
- **Setup:** Mock blocked user data, render dialog in open state
- **Action:** Click unblock button, confirm in dialog
- **Expected:** `useUnblockUserMutation` called with correct user ID, dialog closes, success message shown
- **Evidence:** RTK Query mutation spy, dialog visibility state, accessibility announcements

#### Test 1.3: UserSearchInput Debouncing
- **Setup:** Render UserSearchInput with mock onChange handler
- **Action:** Type multiple characters rapidly
- **Expected:** onChange called only after debounce delay (300ms), not on every keystroke
- **Evidence:** Mock function call count, timing verification with `vi.useFakeTimers()`

#### Test 1.4: RevokeTokensDialog Destructive Action Confirmation
- **Setup:** Render dialog with user data
- **Action:** Click "Revoke All Tokens" button, confirm action
- **Expected:** `useRevokeTokensMutation` called, confirmation required before API call, dialog closes
- **Evidence:** Mutation spy, confirmation step verification, ARIA announcements

#### Test 1.5: AdminUserDetailPage User Actions
- **Setup:** Mock `useGetUserDetailQuery` with user data
- **Action:** Render page, verify action buttons (Block, Unblock, Revoke Tokens)
- **Expected:** All user details displayed, action buttons visible and clickable, correct permissions checked
- **Evidence:** User data rendering, button states, onClick handlers

### Phase 2: Upload Components (Recently Modified - High Priority)

#### Test 2.1: SessionProvider Context Provision
- **Setup:** Render SessionProvider with child component consuming context
- **Action:** Access session state from context
- **Expected:** Session state available, persistence works, updates propagate to consumers
- **Evidence:** Context values, localStorage calls, child component re-renders

#### Test 2.2: UploaderFileItem Progress Display
- **Setup:** Mock file upload with progress tracking
- **Action:** Render UploaderFileItem with file at 50% progress
- **Expected:** Progress bar shows 50%, file name displayed, cancel/retry buttons visible
- **Evidence:** Progress bar aria-valuenow attribute, button states

#### Test 2.3: UploaderList File Grouping
- **Setup:** Mock multiple files across different categories
- **Action:** Render UploaderList with mixed file types
- **Expected:** Files grouped by category, aggregate progress shown, section headers visible
- **Evidence:** Category sections in DOM, aggregate progress calculation

#### Test 2.4: ConflictModal New Title Input
- **Setup:** Render modal with conflicting filename
- **Action:** Enter new title, submit
- **Expected:** Input validates new title, submit enabled when valid, conflict resolved
- **Evidence:** Form validation errors, submit button disabled state

#### Test 2.5: RateLimitBanner Countdown Timer
- **Setup:** Mock rate limit state with 60 seconds remaining, use `vi.useFakeTimers()`
- **Action:** Advance timers by 30 seconds
- **Expected:** Countdown updates to 30 seconds, retry button disabled until 0
- **Evidence:** Timer display updates, button enabled state changes

#### Test 2.6: SessionExpiredBanner Refresh Action
- **Setup:** Mock expired session with 3 expired files
- **Action:** Click refresh button
- **Expected:** Refresh handler called, expired count displayed correctly
- **Evidence:** onClick handler invocation, expired file count in UI

### Phase 3: Module Wrappers (Medium Priority)

#### Test 3.1: SetsGalleryModule Lazy Loading
- **Setup:** Mock React.lazy module import
- **Action:** Render SetsGalleryModule
- **Expected:** Lazy component loads, loading state shown during import, module renders after load
- **Evidence:** Loading indicator, module content after resolution

#### Test 3.2: InspirationModule Error Boundary
- **Setup:** Mock module import to throw error
- **Action:** Render InspirationModule
- **Expected:** Error boundary catches error, fallback UI shown, error logged
- **Evidence:** Error fallback rendering, console.error (logger) calls

#### Test 3.3: InstructionsCreateModule Module State
- **Setup:** Mock module with initial state
- **Action:** Render module, pass props
- **Expected:** Module receives props correctly, state initializes, no errors
- **Evidence:** Props passed to module, initial state verification

### Phase 4: Form Components (Medium Priority)

#### Test 4.1: TagInput Add Tag
- **Setup:** Render TagInput with empty tags array
- **Action:** Type tag name, press Enter
- **Expected:** Tag added to list, input cleared, chip displayed
- **Evidence:** Tag chip in DOM, form state updated

#### Test 4.2: TagInput Max Tags Validation
- **Setup:** Render TagInput with 10 tags (max limit)
- **Action:** Attempt to add 11th tag
- **Expected:** Validation error shown, tag not added, input disabled or error message
- **Evidence:** Error message text, tag count remains 10

#### Test 4.3: TagInput Max Characters Validation
- **Setup:** Render TagInput
- **Action:** Type tag with 31+ characters
- **Expected:** Validation error shown (max 30 chars), submit disabled
- **Evidence:** aria-describedby error message, character count display

#### Test 4.4: SlugField Auto-Generation
- **Setup:** Render SlugField with title input
- **Action:** Type title "My LEGO Set 2024"
- **Expected:** Slug auto-generated as "my-lego-set-2024", lowercase with hyphens
- **Evidence:** Slug field value, format validation

#### Test 4.5: SlugField Manual Edit
- **Setup:** Render SlugField with auto-generated slug
- **Action:** Manually edit slug field
- **Expected:** Manual edits allowed, format validation enforced (lowercase, hyphens, numbers only)
- **Evidence:** Input value changes, validation errors for invalid characters

### Phase 5: Navigation and Layout (Low Priority)

#### Test 5.1: NotFoundHandler 404 Handling
- **Setup:** Mock route with 404 error
- **Action:** Render NotFoundHandler
- **Expected:** 404 message shown, navigation fallback provided (back to home)
- **Evidence:** Error message text, navigation link href

#### Test 5.2: Sidebar Navigation Items
- **Setup:** Render Sidebar with mock navigation items
- **Action:** Verify navigation items rendered
- **Expected:** All nav items visible, active state highlighted, mobile collapse works
- **Evidence:** Nav links in DOM, active class, mobile viewport behavior

#### Test 5.3: RootLayout Structure
- **Setup:** Render RootLayout with children
- **Action:** Verify layout structure
- **Expected:** Header, sidebar, main content area, footer all present, children rendered in main
- **Evidence:** Layout landmarks (header, nav, main, footer), children in correct position

#### Test 5.4: CacheDashboard Clear Actions
- **Setup:** Mock cache data, render CacheDashboard
- **Action:** Click clear cache button
- **Expected:** Clear handler called, confirmation dialog shown, cache stats updated
- **Evidence:** onClick handler, confirmation UI, stats display

### Phase 6: Pages (Low Priority)

#### Test 6.1: InstructionsNewPage Rendering
- **Setup:** Mock auth state, render page
- **Action:** Verify page renders
- **Expected:** Form displayed, submit button visible, validation active
- **Evidence:** Form elements in DOM, submit button state

#### Test 6.2: PlaceholderPage Message Display
- **Setup:** Render PlaceholderPage
- **Action:** Verify placeholder message
- **Expected:** Placeholder message shown, navigation options available
- **Evidence:** Message text content, navigation links

#### Test 6.3: UnauthorizedPage Sign-In Redirect
- **Setup:** Render UnauthorizedPage
- **Action:** Click sign-in button
- **Expected:** Redirect to login page, 401 error message shown
- **Evidence:** Navigation call to login route, error message text

## Error Cases

### EC-1: Admin API Failures
- **Setup:** Mock RTK Query mutations to return error responses
- **Action:** Trigger block user, unblock user, revoke tokens actions
- **Expected:** Error messages displayed, dialogs remain open, retry option available
- **Evidence:** Error message text, dialog state, aria-live announcements

### EC-2: Upload Session Expiry
- **Setup:** Mock session expired state
- **Action:** Render SessionExpiredBanner
- **Expected:** Banner shown with expired file count, refresh action available
- **Evidence:** Banner visibility, expired count display, refresh button

### EC-3: File Upload Conflicts
- **Setup:** Mock conflicting filename
- **Action:** Render ConflictModal
- **Expected:** Conflict details shown, new title input required, validation enforced
- **Evidence:** Conflict message, input validation, submit disabled until valid

### EC-4: Form Validation Errors
- **Setup:** Render TagInput and SlugField with invalid inputs
- **Action:** Submit form with validation errors
- **Expected:** Error messages shown, form submission blocked, focus moved to first error
- **Evidence:** aria-describedby linking errors, submit button disabled, focus management

### EC-5: Module Load Failures
- **Setup:** Mock module lazy load to reject
- **Action:** Render module wrapper
- **Expected:** Error boundary catches error, fallback UI shown, error logged to @repo/logger
- **Evidence:** Error fallback rendering, logger.error call

## Edge Cases (Reasonable)

### Edge-1: Empty States
- **Setup:** Render components with no data (empty user list, no uploads, no tags)
- **Action:** Verify empty state handling
- **Expected:** Empty state messages shown, no errors, helpful guidance provided
- **Evidence:** Empty state text content, no console errors

### Edge-2: Boundary Values
- **Setup:** Test TagInput with exactly 10 tags (max), exactly 30 characters (max)
- **Action:** Verify boundary validation
- **Expected:** Accepts exactly max values, rejects max + 1
- **Evidence:** Validation messages, tag/character counts

### Edge-3: Timer Edge Cases
- **Setup:** RateLimitBanner with 0 seconds remaining
- **Action:** Verify timer completion
- **Expected:** Retry button enabled, countdown stops at 0, no negative values
- **Evidence:** Button enabled state, timer display

### Edge-4: Concurrent Actions
- **Setup:** Rapidly click admin action buttons (block, unblock, revoke)
- **Action:** Verify double-submit prevention
- **Expected:** Only one request sent, buttons disabled during loading, no duplicate mutations
- **Evidence:** Mutation call count, button disabled state

### Edge-5: Large Data Sets
- **Setup:** UploaderList with 50+ files
- **Action:** Render component
- **Expected:** Performance acceptable, all files grouped correctly, no UI lag
- **Evidence:** Render time < 100ms, correct grouping, no layout shift

## Required Tooling Evidence

### Backend
- **No backend testing required** - This is frontend-only unit testing
- MSW handlers already configured in `src/test/setup.ts` for all RTK Query endpoints

### Frontend
**Vitest Unit Tests (Required):**
- All 24 components must have test files in `{Component}/__tests__/{Component}.test.tsx`
- Tests must follow BDD structure: `describe('ComponentName')` > `describe('rendering')`, `describe('interactions')`, `describe('accessibility')`
- Coverage report must show minimum 45% global coverage

**Test Assertions Required:**
- Semantic queries: `getByRole`, `getByLabelText`, `getByText` (avoid `getByTestId`)
- ARIA attributes: `toHaveAttribute('aria-label')`, `toHaveAttribute('aria-describedby')`
- Keyboard navigation: Tab, Enter, Escape key events
- Focus management: `toHaveFocus()` assertions
- Screen reader announcements: `aria-live` region content

**Coverage Targets by Component Type:**
- Admin components: 70%+ coverage (security critical)
- Upload components: 65%+ coverage (high complexity)
- Form components: 60%+ coverage (validation logic)
- Module wrappers: 50%+ coverage (thin wrappers)
- Layout/navigation: 50%+ coverage (presentational)
- Pages: 50%+ coverage (simple wrappers)

**CI Requirements:**
- `pnpm test --filter main-app` must pass
- `pnpm lint --filter main-app` must pass
- `pnpm check-types --filter main-app` must pass

**Playwright E2E Tests:**
- **NOT REQUIRED** per ADR-006 (E2E tests optional during dev phase)
- If added in future, would test: admin user management flow, upload session expiry handling, form validation end-to-end

## Accessibility Testing Requirements

### Required Accessibility Tests (All Components)
1. **ARIA Attributes:**
   - Dialogs must have `role="dialog"`, `aria-labelledby`, `aria-describedby`
   - Buttons must have accessible names (via text, `aria-label`, or `aria-labelledby`)
   - Form inputs must have labels (via `<label>`, `aria-label`, or `aria-labelledby`)
   - Error messages must be linked via `aria-describedby`

2. **Keyboard Navigation:**
   - All interactive elements focusable via Tab
   - Enter key activates buttons and submits forms
   - Escape key closes dialogs and modals
   - Arrow keys navigate within lists and menus (where applicable)

3. **Focus Management:**
   - Modal open: Focus moves to first focusable element in modal
   - Modal close: Focus restores to trigger element
   - Form errors: Focus moves to first error on validation failure

4. **Screen Reader Support:**
   - Progress updates announced via `aria-live="polite"`
   - Error messages announced via `aria-live="assertive"`
   - Dynamic content changes announced appropriately
   - Loading states communicated via `aria-busy` or `aria-live`

## Risks to Call Out

### Risk 1: Timer Testing Complexity
- **Component:** RateLimitBanner countdown timer
- **Challenge:** Testing timers requires `vi.useFakeTimers()` and careful time advancement
- **Mitigation:** Reference existing timer tests in codebase if available, otherwise use standard Vitest fake timers pattern
- **Impact:** Medium - Could add 1-2 hours to upload component testing

### Risk 2: Context Provider Testing
- **Component:** SessionProvider
- **Challenge:** Testing context requires rendering child components that consume context
- **Mitigation:** Reference NavigationProvider.test.tsx for established context provider testing pattern
- **Impact:** Low - Pattern already established in codebase

### Risk 3: Module Lazy Loading
- **Components:** SetsGalleryModule, InspirationModule, InstructionsCreateModule
- **Challenge:** React.lazy modules may require special mocking
- **Mitigation:** Reference existing module tests (DashboardModule.test.tsx, GalleryModule.test.tsx, etc.)
- **Impact:** Low - Pattern already established in 4 existing module test files

### Risk 4: Form Validation Testing
- **Components:** TagInput, SlugField
- **Challenge:** react-hook-form + Zod validation requires correct triggering
- **Mitigation:** Reference EditForm.test.tsx for established validation testing pattern
- **Impact:** Low - Pattern already established in EditForm.test.tsx

### Risk 5: Large Scope
- **Impact:** 24 components is a large testing effort (estimated 15-22 hours)
- **Mitigation:** Prioritize by phase (admin first, pages last), consider splitting story if scope proves too large during implementation
- **Blocker Status:** Not blocking - scope is large but feasible with established patterns

### Risk 6: Coverage Calculation
- **Challenge:** Coverage may be difficult to measure accurately for module wrappers (thin wrappers)
- **Impact:** Global coverage target may not reach 45% even with all tests written
- **Mitigation:** Focus on high-value components (admin, upload, forms) for coverage boost

## Test Execution Plan

### Phase 1: Admin Components (4-6 hours)
1. AdminModule.tsx
2. UnblockUserDialog.tsx
3. UserSearchInput.tsx
4. RevokeTokensDialog.tsx
5. AdminUserDetailPage.tsx

### Phase 2: Upload Components (4-5 hours)
6. SessionProvider/index.tsx
7. UploaderFileItem/index.tsx
8. UploaderList/index.tsx
9. ConflictModal/index.tsx
10. RateLimitBanner/index.tsx
11. SessionExpiredBanner/index.tsx

### Phase 3: Module Wrappers (2-3 hours)
12. SetsGalleryModule.tsx
13. InspirationModule.tsx
14. InstructionsCreateModule.tsx

### Phase 4: Form Components (2-3 hours)
15. TagInput.tsx
16. SlugField.tsx

### Phase 5: Navigation and Layout (2-3 hours)
17. NotFoundHandler.tsx
18. Sidebar.tsx
19. RootLayout.tsx
20. CacheDashboard.tsx

### Phase 6: Pages (1-2 hours)
21. InstructionsNewPage.tsx
22. PlaceholderPage.tsx
23. UnauthorizedPage.tsx
24. (App.tsx - skip, has integration test already)

**Total Estimated Effort:** 15-22 hours (2-3 days)

## Success Criteria

- [ ] All 24 components have test files
- [ ] All tests pass in CI (`pnpm test --filter main-app`)
- [ ] Global coverage reaches minimum 45%
- [ ] All accessibility tests included (ARIA, keyboard, focus)
- [ ] All tests use semantic queries (no `getByTestId` unless necessary)
- [ ] All tests follow BDD structure
- [ ] Lint and type-check pass
