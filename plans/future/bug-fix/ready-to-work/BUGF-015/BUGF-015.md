---
id: BUGF-015
title: "Add Test Coverage for Main App Components"
status: ready-to-work
priority: P2
epic: bug-fix
phase: 3
story_type: test
points: 5
depends_on: []
experiment_variant: control
created_at: "2026-02-11T20:00:00Z"
predictions:
  split_risk: 0.6
  review_cycles: 2
  token_estimate: 140000
  confidence: low
---

# BUGF-015: Add Test Coverage for Main App Components

## Context

The main-app currently has 53 test files covering approximately 60% of components, leaving 24 untested components across administrative areas, upload functionality, module wrappers, form inputs, navigation, and layout components. Notable untested components include:

**Security-Critical Components (High Priority):**
- Admin dialogs: UnblockUserDialog, RevokeTokensDialog
- Admin pages: AdminUserDetailPage, AdminModule
- Admin search: UserSearchInput

**Recently Modified Components (High Priority - BUGF-032):**
- Upload session: SessionProvider
- Upload components: UploaderFileItem, UploaderList
- Upload feedback: ConflictModal, RateLimitBanner, SessionExpiredBanner

**Core Form Components (Medium Priority):**
- TagInput (tag add/remove, validation: max 10 tags, max 30 chars each)
- SlugField (slug generation, format validation: lowercase, hyphens, numbers only)

**Infrastructure Components (Lower Priority):**
- Module wrappers: SetsGalleryModule, InspirationModule, InstructionsCreateModule
- Navigation: NotFoundHandler, Sidebar, RootLayout
- Pages: InstructionsNewPage, PlaceholderPage, UnauthorizedPage

Without comprehensive test coverage, regressions in admin operations, upload flows, and form validation can go undetected. The existing test infrastructure is robust with comprehensive global mocks and established test patterns from 53 existing test files, making this a straightforward effort to close coverage gaps.

**Current State:**
- 53 existing test files with established patterns
- Comprehensive global mocks in `src/test/setup.ts`
- MSW handlers configured for all RTK Query endpoints
- Estimated current coverage: 36-40% (below minimum 45% threshold per CLAUDE.md)

**Related Work:**
- BUGF-012 (in-progress): Test coverage for app-inspiration-gallery (no overlap)
- BUGF-013 (backlog): Test coverage for app-instructions-gallery
- BUGF-014 (backlog): Test coverage for app-sets-gallery
- BUGF-030 (backlog): Comprehensive E2E test suite (E2E optional per ADR-006)

## Goal

Create unit tests for all 24 untested components in main-app following established patterns from 53 existing test files, achieving minimum 45% global coverage threshold. Tests will validate component rendering, user interactions, accessibility (ARIA attributes, keyboard navigation, focus management), and error handling using semantic queries and BDD structure.

## Non-Goals

**Out of Scope:**
- E2E testing (optional per ADR-006, deferred to BUGF-030)
- Testing main.tsx entry point (not typically tested)
- Testing performance.test.tsx itself (meta-test)
- Fixing bugs found during testing (create separate BUGF stories)
- Refactoring components to be more testable (test as-is)
- Testing @repo/app-component-library components (already mocked, tested separately)
- Visual regression testing (not in current test strategy)
- Performance testing (not required for test coverage story)

**Protected Features (Do NOT Modify):**
- Existing 53 test files (already passing, well-established patterns)
- Existing MSW handlers in setup.ts (reuse as-is)
- Component implementations (do NOT modify to make tests pass, exception: actual bugs → separate story)
- Existing global mocks (many tests depend on setup.ts configuration)

**Deferred:**
- App.tsx additional unit tests (has integration test already)
- LoadingPage.tsx (already has test file, confirmed via grep)
- Complex drag-and-drop testing (if needed, create separate story)
- Real API integration testing (covered by E2E/UAT, not unit tests)

## Scope

### Components to Test (24 total)

**Phase 1: Admin Components (High Priority - Security Critical) - 4-6 hours**
1. `src/routes/admin/AdminModule.tsx` - Admin area module wrapper
2. `src/routes/admin/components/UnblockUserDialog.tsx` - User unblock confirmation dialog
3. `src/routes/admin/components/UserSearchInput.tsx` - Admin user search with debouncing
4. `src/routes/admin/components/RevokeTokensDialog.tsx` - Token revocation confirmation dialog
5. `src/routes/admin/pages/AdminUserDetailPage.tsx` - User detail view with action buttons

**Phase 2: Upload Components (High Priority - Recently Modified) - 4-5 hours**
6. `src/components/Uploader/SessionProvider/index.tsx` - Upload session context provider
7. `src/components/Uploader/UploaderFileItem/index.tsx` - Individual file upload item
8. `src/components/Uploader/UploaderList/index.tsx` - Grouped file upload list
9. `src/components/Uploader/ConflictModal/index.tsx` - File conflict resolution dialog
10. `src/components/Uploader/RateLimitBanner/index.tsx` - Rate limit countdown banner
11. `src/components/Uploader/SessionExpiredBanner/index.tsx` - Session expiry warning

**Phase 3: Module Wrappers (Medium Priority) - 2-3 hours**
12. `src/routes/modules/SetsGalleryModule.tsx` - Sets gallery micro-frontend wrapper
13. `src/routes/modules/InspirationModule.tsx` - Inspiration gallery micro-frontend wrapper
14. `src/routes/modules/InstructionsCreateModule.tsx` - Instructions creation micro-frontend wrapper

**Phase 4: Form Components (Medium Priority) - 2-3 hours**
15. `src/components/MocEdit/TagInput.tsx` - Tag input with validation
16. `src/components/MocEdit/SlugField.tsx` - Slug generation and validation field

**Phase 5: Navigation and Layout (Low Priority) - 2-3 hours**
17. `src/components/Navigation/NotFoundHandler.tsx` - 404 handling in navigation system
18. `src/components/Layout/Sidebar.tsx` - Main sidebar navigation
19. `src/components/Layout/RootLayout.tsx` - Root layout wrapper
20. `src/components/Cache/CacheDashboard.tsx` - Cache management dashboard

**Phase 6: Pages (Low Priority) - 1-2 hours**
21. `src/routes/pages/InstructionsNewPage.tsx` - New instructions page wrapper
22. `src/routes/pages/PlaceholderPage.tsx` - Generic placeholder page
23. `src/routes/pages/UnauthorizedPage.tsx` - 401 unauthorized error page
24. (App.tsx, main.tsx, performance.test.tsx excluded - see Non-Goals)

**Total Estimated Effort:** 15-22 hours (2-3 days)

### Test Files Structure

All test files follow component directory structure:
```
{ComponentName}/
  index.tsx              # Component implementation
  __tests__/
    {ComponentName}.test.tsx
```

### Packages Involved

**Main Package:**
- `apps/web/main-app` - All test files created here

**Reused Packages (No Changes):**
- `@repo/app-component-library` - Already mocked globally
- `@repo/logger` - Already mocked globally
- Test utilities in `apps/web/main-app/src/test/`

### Endpoints Touched

**No API endpoints modified** - This is frontend unit testing only.

**MSW handlers already configured for:**
- Admin API: `useListUsersQuery`, `useGetUserDetailQuery`, `useRevokeTokensMutation`, `useBlockUserMutation`, `useUnblockUserMutation`
- Dashboard API: `useGetStatsQuery`, `useGetRecentMocsQuery`
- Gallery/Wishlist API: All hooks already mocked in store setup

## Acceptance Criteria

### AC-1: Admin Component Test Coverage
- [ ] AdminModule.tsx has test file with module wrapper rendering tests
- [ ] UnblockUserDialog.tsx has test file with dialog open/close, confirmation flow, API call verification
- [ ] UserSearchInput.tsx has test file with search input, debouncing (300ms), results display
- [ ] RevokeTokensDialog.tsx has test file with dialog confirmation, API mutation, error handling
- [ ] AdminUserDetailPage.tsx has test file with user detail rendering, action buttons, API calls
- [ ] All admin components have accessibility tests (ARIA attributes, keyboard navigation)
- [ ] All admin components have error state tests (API failures, network errors)
- [ ] Admin components achieve 70%+ line coverage (security critical)

### AC-2: Upload Component Test Coverage
- [ ] SessionProvider.tsx has test file with context provision, session state management, persistence
- [ ] UploaderFileItem.tsx has test file with file rendering, progress display, retry/cancel/remove actions
- [ ] UploaderList.tsx has test file with file grouping, aggregate progress, category sections
- [ ] ConflictModal.tsx has test file with conflict display, new title input, validation
- [ ] RateLimitBanner.tsx has test file with countdown timer (vi.useFakeTimers), retry button enable/disable
- [ ] SessionExpiredBanner.tsx has test file with expired count display, refresh action
- [ ] All upload components have accessibility tests (ARIA live regions, progress announcements)
- [ ] Upload components achieve 65%+ line coverage (high complexity)

### AC-3: Module Wrapper Test Coverage
- [ ] SetsGalleryModule.tsx has test file with lazy loading, error boundary, module state
- [ ] InspirationModule.tsx has test file with lazy loading, error boundary, module state
- [ ] InstructionsCreateModule.tsx has test file with lazy loading, error boundary, module state
- [ ] All module wrappers have loading state tests
- [ ] All module wrappers have error state tests
- [ ] Module wrappers achieve 50%+ line coverage (thin wrappers)

### AC-4: Form Component Test Coverage
- [ ] TagInput.tsx has test file with tag add/remove, validation (max 10 tags, max 30 chars), chip display
- [ ] SlugField.tsx has test file with slug generation, format validation (lowercase, hyphens, numbers only), manual editing
- [ ] All form components have real-time validation feedback tests
- [ ] All form components have accessibility tests (aria-describedby for errors)
- [ ] Form components achieve 60%+ line coverage (validation logic)

### AC-5: Navigation and Layout Component Test Coverage
- [ ] NotFoundHandler.tsx has test file with 404 handling, navigation fallback
- [ ] Sidebar.tsx has test file with navigation items, active states, mobile collapse
- [ ] RootLayout.tsx has test file with layout structure, children rendering
- [ ] CacheDashboard.tsx has test file with cache display, clear actions, stats
- [ ] All navigation/layout components have accessibility tests (landmarks, ARIA labels)
- [ ] Navigation/layout components achieve 50%+ line coverage (presentational)

### AC-6: Page Component Test Coverage
- [ ] InstructionsNewPage.tsx has test file with page rendering, form display, submission
- [ ] PlaceholderPage.tsx has test file with placeholder message, navigation options
- [ ] UnauthorizedPage.tsx has test file with 401 error display, sign-in redirect
- [ ] All page components have SEO metadata validation (where applicable)
- [ ] All page components have route navigation tests
- [ ] Page components achieve 50%+ line coverage (simple wrappers)

### AC-7: Test Quality Standards
- [ ] All tests use semantic queries (getByRole, getByLabelText, getByText) - no getByTestId unless necessary
- [ ] All tests follow BDD structure: `describe('ComponentName')` > `describe('rendering')`, `describe('interactions')`, `describe('accessibility')`
- [ ] All tests use userEvent for interactions (not fireEvent)
- [ ] All tests have beforeEach cleanup (vi.clearAllMocks())
- [ ] All async tests use waitFor for assertions
- [ ] All tests reuse existing MSW handlers (no new handlers created)
- [ ] All tests verify ARIA attributes (role, aria-label, aria-describedby, aria-live)
- [ ] All tests verify keyboard navigation (Tab, Enter, Escape key handling)
- [ ] All tests verify focus management (focus moves correctly on modal open/close)

### AC-8: Coverage Metrics and CI
- [ ] main-app achieves minimum 45% line coverage (Vitest coverage report)
- [ ] All 24 components now have test files in correct `__tests__/` directories
- [ ] All tests pass in CI (`pnpm test --filter main-app`)
- [ ] Lint passes (`pnpm lint --filter main-app`)
- [ ] Type check passes (`pnpm check-types --filter main-app`)
- [ ] Coverage report accessible in CI artifacts

## Reuse Plan

### Test Infrastructure (Reuse Existing)

**Global Test Setup:**
- `src/test/setup.ts` - Comprehensive global mocks (ResizeObserver, IntersectionObserver, matchMedia, Amplify, Router, Logger, Framer Motion, react-hook-form, RTK Query hooks, @repo/app-component-library)
- `src/test/test-utils.tsx` - Custom render utilities with providers
- `src/test/mocks.tsx` - Mock data and helper functions

**MSW Handlers (Already Configured):**
- Admin API: All admin operations (list users, get user detail, block, unblock, revoke tokens)
- Dashboard API: Stats and recent MOCs queries
- Gallery/Wishlist API: All gallery and wishlist operations
- **No new MSW handlers needed** - All APIs already mocked

### Test Patterns (From Existing 53 Test Files)

**1. Admin Component Pattern:**
- Reference: `BlockUserDialog.test.tsx`, `UserTable.test.tsx`, `AdminUsersPage.test.tsx`
- Pattern: Dialog open/close, confirmation flow, RTK Query mutation testing, ARIA validation, error handling for API failures

**2. Dashboard Component Pattern:**
- Reference: `QuickActions.test.tsx`, `RecentMocsGrid.test.tsx`, `StatsCards.test.tsx`
- Pattern: Card rendering with mock data, loading skeleton states, empty states, click handlers, responsive grid layouts

**3. Layout Component Pattern:**
- Reference: `Footer.test.tsx`, `Header.test.tsx`, `MainArea.test.tsx`, `MobileSidebar.test.tsx`
- Pattern: Component hierarchy rendering, conditional rendering based on props, mobile/desktop responsive behavior, accessibility landmarks

**4. Navigation Component Pattern:**
- Reference: `EnhancedBreadcrumb.test.tsx`, `NavigationProvider.test.tsx`, `NavigationSearch.test.tsx`
- Pattern: Context provider testing, search with debouncing, keyboard shortcuts, focus management, screen reader announcements

**5. Auth Page Pattern:**
- Reference: `EmailVerificationPage.test.tsx`, `NewPasswordPage.test.tsx`, `OTPVerificationPage.test.tsx`
- Pattern: Form submission handling, validation error display, success/error state feedback, AWS Amplify mocking, password visibility toggle

**6. Form Component Pattern:**
- Reference: `EditForm.test.tsx`
- Pattern: react-hook-form integration, Zod schema validation, character count validation, real-time validation feedback, form dirty state detection

**7. Module Pattern:**
- Reference: `DashboardModule.test.tsx`, `GalleryModule.test.tsx`, `InstructionsModule.test.tsx`, `WishlistModule.test.tsx`
- Pattern: Micro-frontend wrapper testing, lazy loading behavior, error boundary testing, module state management

**8. Page Pattern:**
- Reference: `HomePage.test.tsx`, `LoginPage.test.tsx`, `NotFoundPage.test.tsx`
- Pattern: Full page rendering, SEO metadata validation, route navigation integration, authentication state handling

### Standard Test Structure (BDD)

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ComponentName } from '../index'

describe('ComponentName', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('rendering', () => {
    it('renders without errors', () => {
      render(<ComponentName />)
      expect(screen.getByRole('...')).toBeInTheDocument()
    })

    it('displays correct content', () => {
      // Test data rendering
    })

    it('shows loading state', () => {
      // Test loading skeleton/spinner
    })

    it('shows empty state', () => {
      // Test empty state message
    })
  })

  describe('interactions', () => {
    it('handles user action', async () => {
      const user = userEvent.setup()
      render(<ComponentName />)
      await user.click(screen.getByRole('button'))
      await waitFor(() => {
        expect(/* assertion */).toBeTruthy()
      })
    })

    it('handles error state', async () => {
      // Test error handling
    })
  })

  describe('accessibility', () => {
    it('has correct ARIA attributes', () => {
      render(<ComponentName />)
      expect(screen.getByRole('...')).toHaveAttribute('aria-label', '...')
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      render(<ComponentName />)
      await user.tab()
      expect(screen.getByRole('button')).toHaveFocus()
      await user.keyboard('{Enter}')
      // Verify action triggered
    })

    it('manages focus correctly', async () => {
      // Test focus trap, focus restore, etc.
    })
  })
})
```

## Architecture Notes

### Testing Strategy (per ADR-005)

**Unit Tests (This Story):**
- Framework: Vitest + React Testing Library
- API Mocking: MSW (all endpoints already configured)
- Environment: happy-dom (headless DOM environment)
- Focus: Component behavior, user interactions, accessibility
- Coverage Target: Minimum 45% line coverage globally
  - **Note (Elaboration Clarification):** Current main-app coverage is ~36-40%. Testing 24 components may not reach 45% threshold. If 45% not reached after Phase 1-2 (admin + upload), assess whether to add utility/hook tests (deferred Gap #4) or accept current coverage as progress toward threshold. 45% is aspirational target, not hard blocker for this story.

**Integration Tests (Future):**
- Not in scope for this story
- Would test component combinations without mocking all dependencies

**E2E Tests (BUGF-030):**
- Optional per ADR-006 (not required during dev phase)
- Deferred to separate story BUGF-030 (Comprehensive E2E Test Suite)
- Would use Playwright for cross-browser testing

### Component Testing Approach

**Admin Components:**
- Test security-critical flows (block, unblock, revoke tokens)
- Verify 2-step confirmation for destructive actions
- Test API error handling and retry logic
- Achieve 70%+ coverage (highest priority)

**Upload Components:**
- Test progress tracking and display
- Test session expiry handling and refresh
- Test file conflict resolution
- Test countdown timer with `vi.useFakeTimers()`
- Achieve 65%+ coverage (high complexity)

**Module Wrappers:**
- Test lazy loading behavior (React.lazy)
- Test error boundary fallback UI
- Test loading state display
- Achieve 50%+ coverage (thin wrappers)

**Form Components:**
- Test real-time validation (Zod schema)
- Test character limits and boundary values
- Test tag add/remove interactions
- Test slug auto-generation and manual edit
- Achieve 60%+ coverage (validation logic)

**Navigation/Layout:**
- Test component structure and landmarks
- Test responsive behavior (mobile collapse)
- Test active state highlighting
- Achieve 50%+ coverage (presentational)

**Pages:**
- Test page rendering and routing
- Test error states (404, 401)
- Test navigation actions
- Achieve 50%+ coverage (simple wrappers)

### Accessibility Testing Requirements

**All Components Must Test:**
1. **ARIA Attributes:**
   - Dialogs: `role="dialog"`, `aria-labelledby`, `aria-describedby`
   - Buttons: Accessible names (text, `aria-label`, or `aria-labelledby`)
   - Form inputs: Labels (via `<label>`, `aria-label`, or `aria-labelledby`)
   - Error messages: Linked via `aria-describedby`

2. **Keyboard Navigation:**
   - Tab key focuses interactive elements
   - Enter key activates buttons/submits forms
   - Escape key closes dialogs/modals
   - Arrow keys navigate lists/menus (where applicable)

3. **Focus Management:**
   - Modal open: Focus moves to first focusable element
   - Modal close: Focus restores to trigger element
   - Form errors: Focus moves to first error on validation failure

4. **Screen Reader Support:**
   - Progress updates: `aria-live="polite"`
   - Error messages: `aria-live="assertive"`
   - Dynamic content changes: Appropriate `aria-live` announcements
   - Loading states: `aria-busy` or `aria-live`

## Infrastructure Notes

### Test Execution

**Local Development:**
```bash
# Run all main-app tests
pnpm test --filter main-app

# Run specific test file
pnpm test --filter main-app AdminModule.test.tsx

# Run tests in watch mode
pnpm test --filter main-app --watch

# Generate coverage report
pnpm test --filter main-app --coverage
```

**CI Pipeline:**
- Tests run automatically on all PRs
- Coverage report generated and attached to PR
- Tests must pass before merge
- Lint and type-check also required

### Coverage Thresholds

**Global Minimum:**
- Line coverage: 45% (per CLAUDE.md requirement)

**Component Type Targets:**
- Admin components: 70%+ (security critical)
- Upload components: 65%+ (high complexity)
- Form components: 60%+ (validation logic)
- Module wrappers: 50%+ (thin wrappers)
- Layout/navigation: 50%+ (presentational)
- Pages: 50%+ (simple wrappers)

### Risk Mitigation

**Timer Testing (RateLimitBanner):**
- Use `vi.useFakeTimers()` at test start
- Advance time with `vi.advanceTimersByTime(ms)`
- Clean up with `vi.useRealTimers()` in afterEach
- Test at 0 seconds, mid-countdown, and completion states

**Context Provider Testing (SessionProvider):**
- Reference NavigationProvider.test.tsx pattern
- Create custom render wrapping children in provider
- Test context values accessible from child components
- Test context updates propagate correctly

**Lazy Module Testing (Module Wrappers):**
- Reference existing module tests (DashboardModule.test.tsx, etc.)
- Use `vi.mock()` for lazy imports if needed
- Test loading states explicitly
- Test error boundaries explicitly

**Form Validation Testing (TagInput, SlugField):**
- Reference EditForm.test.tsx pattern
- Trigger validation with userEvent interactions
- Use `waitFor` for async validation
- Test error message display and linking (aria-describedby)

## Test Plan

**See:** `/Users/michaelmenard/Development/monorepo/plans/future/bug-fix/backlog/BUGF-015/_pm/TEST-PLAN.md`

### Scope Summary
- Endpoints touched: None (frontend testing only)
- UI touched: No new UI (testing existing components)
- Data/storage touched: No (MSW mocks handle all API interactions)

### Execution Phases

**Phase 1: Admin Components (4-6 hours)**
- AdminModule, UnblockUserDialog, UserSearchInput, RevokeTokensDialog, AdminUserDetailPage
- Priority: Highest (security critical)
- Coverage target: 70%+

**Phase 2: Upload Components (4-5 hours)**
- SessionProvider, UploaderFileItem, UploaderList, ConflictModal, RateLimitBanner, SessionExpiredBanner
- Priority: High (recently modified for BUGF-032)
- Coverage target: 65%+

**Phase 3: Module Wrappers (2-3 hours)**
- SetsGalleryModule, InspirationModule, InstructionsCreateModule
- Priority: Medium (thin wrappers)
- Coverage target: 50%+

**Phase 4: Form Components (2-3 hours)**
- TagInput, SlugField
- Priority: Medium (validation logic)
- Coverage target: 60%+

**Phase 5: Navigation and Layout (2-3 hours)**
- NotFoundHandler, Sidebar, RootLayout, CacheDashboard
- Priority: Low (presentational)
- Coverage target: 50%+

**Phase 6: Pages (1-2 hours)**
- InstructionsNewPage, PlaceholderPage, UnauthorizedPage
- Priority: Low (simple wrappers)
- Coverage target: 50%+

**Total Estimated Effort:** 15-22 hours (2-3 days)

### Success Criteria
- [ ] All 24 components have test files
- [ ] All tests pass in CI
- [ ] Global coverage ≥45%
- [ ] All accessibility tests included
- [ ] All tests use semantic queries
- [ ] All tests follow BDD structure
- [ ] Lint and type-check pass

## UI/UX Notes

**See:** `/Users/michaelmenard/Development/monorepo/plans/future/bug-fix/backlog/BUGF-015/_pm/UIUX-NOTES.md`

### Verdict
**PASS-WITH-NOTES** - This is a test coverage story, not UI implementation. Tests must verify existing components meet accessibility standards and provide good user experience.

### Critical Accessibility Requirements Tests Must Verify

**Dialog Accessibility (Admin Dialogs, ConflictModal):**
- Tests verify `role="dialog"`, `aria-labelledby`, `aria-describedby`
- Tests verify focus trap (Tab cycles within modal)
- Tests verify Escape key closes dialog
- Tests verify focus returns to trigger element on close
- Tests verify destructive actions require confirmation

**Form Accessibility (TagInput, SlugField, UserSearchInput):**
- Tests verify inputs have accessible labels
- Tests verify error messages linked via `aria-describedby`
- Tests verify error messages have `role="alert"` or `aria-live="assertive"`
- Tests verify character count displays real-time feedback
- Tests verify focus moves to first error on validation failure

**Progress Feedback (Upload Components):**
- Tests verify progress bars have `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, `aria-valuemax`
- Tests verify progress updates announced via `aria-live="polite"`
- Tests verify loading states have `aria-busy="true"`
- Tests verify completion announced to screen readers

**Keyboard Navigation (All Interactive Components):**
- Tests verify all interactive elements focusable via Tab
- Tests verify Enter/Space activates buttons
- Tests verify Escape closes modals/dialogs
- Tests verify tab order follows visual flow
- Tests verify focus visible on keyboard navigation

**Error State Accessibility:**
- Tests verify error messages have `role="alert"` or `aria-live="assertive"`
- Tests verify error messages reference failed action context
- Tests verify retry actions available and keyboard accessible

**Screen Reader Announcements:**
- Tests verify dynamic content changes announced (via `aria-live`)
- Tests verify success actions announced
- Tests verify countdown timers announce at intervals
- Tests verify file upload status changes announced

## Dev Feasibility

**See:** `/Users/michaelmenard/Development/monorepo/plans/future/bug-fix/backlog/BUGF-015/_pm/DEV-FEASIBILITY.md`

### Feasibility Summary
- **Feasible for MVP:** Yes
- **Confidence:** High
- **Why:** All test infrastructure in place, 53 existing test files provide patterns, all dependencies mocked, straightforward unit testing with established patterns

### MVP-Critical Risks

**Risk 1: Coverage Target May Be Challenging**
- **Mitigation:** Prioritize high-value components (admin, upload), focus on all code paths, may need additional tests beyond 24 components
- **Confidence:** Medium

**Risk 2: Timer Testing Complexity (RateLimitBanner)**
- **Mitigation:** Use standard Vitest fake timers pattern, test at 0 seconds, mid-countdown, and completion
- **Confidence:** Medium

**Risk 3: React.lazy Module Mocking**
- **Mitigation:** Reference existing module tests (DashboardModule.test.tsx, GalleryModule.test.tsx)
- **Confidence:** High

**Risk 4: Large Scope Story Split Risk**
- **Mitigation:** Prioritize admin + upload first, consider split if Phase 1-2 >10 hours
- **Confidence:** Medium

**Risk 5: Context Provider Testing Pattern**
- **Mitigation:** Reference NavigationProvider.test.tsx pattern
- **Confidence:** High

### Evidence Expectations
- [ ] All 24 test files created in correct `__tests__/` directories
- [ ] All tests pass (`pnpm test --filter main-app`)
- [ ] Coverage ≥45% line coverage globally
- [ ] Lint and type-check pass
- [ ] All tests use semantic queries, BDD structure, accessibility assertions

## Reality Baseline

**Baseline Source:** Direct codebase scanning (no baseline reality file exists at expected path)

**Baseline Date:** 2026-02-11

**Test Infrastructure:**
- 53 existing test files in main-app
- Vitest configured with React Testing Library
- Global mocks in `src/test/setup.ts`: ResizeObserver, IntersectionObserver, matchMedia, AWS Amplify, TanStack Router, @repo/logger, @repo/app-component-library, react-hook-form, framer-motion, RTK Query hooks, Lucide React icons
- MSW handlers configured for all admin, dashboard, gallery, wishlist APIs
- Custom render utilities in `src/test/test-utils.tsx`
- Mock data helpers in `src/test/mocks.tsx`

**Established Test Patterns:**
- Admin components: BlockUserDialog.test.tsx, UserTable.test.tsx, AdminUsersPage.test.tsx
- Dashboard components: QuickActions.test.tsx, RecentMocsGrid.test.tsx, StatsCards.test.tsx
- Layout components: Footer.test.tsx, Header.test.tsx, MainArea.test.tsx, MobileSidebar.test.tsx
- Navigation components: EnhancedBreadcrumb.test.tsx, NavigationProvider.test.tsx, NavigationSearch.test.tsx
- Auth pages: EmailVerificationPage.test.tsx, NewPasswordPage.test.tsx, OTPVerificationPage.test.tsx
- Form components: EditForm.test.tsx
- Module wrappers: DashboardModule.test.tsx, GalleryModule.test.tsx, InstructionsModule.test.tsx, WishlistModule.test.tsx
- Pages: HomePage.test.tsx, LoginPage.test.tsx, NotFoundPage.test.tsx

**Related Stories:**
- BUGF-012 (in-progress): Test coverage for app-inspiration-gallery (no overlap)
- BUGF-013 (backlog): Test coverage for app-instructions-gallery
- BUGF-014 (backlog): Test coverage for app-sets-gallery
- BUGF-030 (backlog): Comprehensive E2E test suite

**ADR Constraints:**
- ADR-005: Unit tests MUST use MSW for API mocking
- ADR-006: E2E tests optional during dev phase (not required for this story)
- CLAUDE.md: Minimum 45% global test coverage required
- CLAUDE.md: Tests must use semantic queries (getByRole, getByLabelText, getByText)
- CLAUDE.md: Tests must be in `__tests__/` directories following structure

**Current Coverage Estimate:** 36-40% (below 45% minimum threshold)

**Untested Components:** 24 total across admin (5), upload (6), modules (3), forms (2), navigation/layout (4), pages (3), plus App.tsx/main.tsx/performance.test.tsx (excluded from scope)

**No Blocking Conflicts:** No overlapping work with BUGF-012, BUGF-013, BUGF-014 (different apps)

## QA Discovery Notes (Auto-Generated)

_Added by Autonomous Elaboration on 2026-02-11_

### MVP Gaps Resolved

| # | Finding | Resolution | Notes |
|---|---------|------------|-------|
| — | No MVP-critical gaps found | All 7 gaps non-blocking | Logged to DEFERRED-KB-WRITES.yaml |

### Non-Blocking Items (Logged to KB)

| # | Finding | Category | Status |
|---|---------|----------|--------|
| 1-7 | Gaps: E2E testing, visual regression, performance, utility coverage, drag-drop, API integration, component interactions | edge-case | Deferred to KB (17 items total) |
| 1-10 | Enhancements: coverage dashboard, mutation testing, flakiness monitoring, a11y audits, snapshots, test factories, coverage diff, parallelization, performance, shared utilities | enhancement | Deferred to KB (17 items total) |

### Summary

- ACs added: 0
- KB entries created: 17 (7 gaps + 10 enhancements)
- Mode: autonomous
- Audit verdict: PASS (7/8 checks pass, 1 conditional pass with acceptable mitigation)
- Story status: Ready for implementation
- All test infrastructure in place; phased approach mitigates sizing risk
