---
generated: "2026-02-11"
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: true
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: BUGF-015

## Reality Context

### Baseline Status
- Loaded: No
- Date: N/A
- Gaps: No baseline reality file exists at expected path. Seed generated from direct codebase scanning and ADR analysis.

### Relevant Existing Features

**Test Infrastructure:**
- Vitest configured for main-app with coverage reporting
- React Testing Library setup in `src/test/setup.ts`
- Comprehensive global mocks: ResizeObserver, IntersectionObserver, matchMedia, AWS Amplify, TanStack Router, @repo/logger
- @repo/app-component-library fully mocked with all exports
- react-hook-form and zod resolver mocked
- Framer Motion mocked
- RTK Query hooks mocked in @/store
- Lucide React icons mocked

**Existing Test Files:**
- 53 test files across main-app
- Test patterns established for admin components (BlockUserDialog, UserTable, AdminUsersPage)
- Test patterns established for dashboard components (QuickActions, RecentMocsGrid, StatsCards)
- Test patterns established for layout components (Footer, Header, MainArea, MobileSidebar)
- Test patterns established for navigation components (EnhancedBreadcrumb, NavigationProvider, NavigationSearch, UnifiedNavigation)
- Test patterns established for auth pages (EmailVerificationPage, NewPasswordPage, OTPVerificationPage)
- Test patterns established for form components (EditForm)
- Test patterns established for modules (DashboardModule, GalleryModule, InstructionsModule, WishlistModule)
- Test patterns established for pages (ForgotPasswordPage, HomePage, LoginPage, NotFoundPage, ResetPasswordPage, SignupPage)

**Related Test Coverage Stories:**
- BUGF-012 (in-progress): Add test coverage for 18 untested inspiration gallery components
- BUGF-013 (backlog): Add test coverage for instructions gallery upload components
- BUGF-014 (backlog): Add test coverage for sets gallery components

### Active In-Progress Work

**BUGF-012 (in-progress):** Add Test Coverage for Inspiration Gallery Components
- Focus: 18 untested components including main-page.tsx, modals, drag components
- No overlap with BUGF-015 (different app: app-inspiration-gallery vs main-app)

### Constraints to Respect

**Code Quality (CLAUDE.md):**
- Minimum 45% global test coverage required
- Tests must be in `__tests__/` directories following structure: `Component/__tests__/Component.test.tsx`
- Use semantic queries: `getByRole`, `getByLabelText`, `getByText` (avoid `getByTestId`)
- React Testing Library + Vitest framework
- React 19 functional components

**Testing Strategy (ADR-005):**
- Unit tests MUST use MSW for API mocking
- E2E tests optional for test coverage stories (per ADR-006, E2E recommended but not required during dev phase)
- Accessibility tests mandatory for all components

---

## Retrieved Context

### Related Endpoints
None directly - This is a testing story for frontend components

### Related Components

**Untested Components in Main App (27 total):**

**Administrative Components (High Priority - Security Critical):**
1. `src/routes/admin/AdminModule.tsx` - Admin area module wrapper
2. `src/routes/admin/components/UnblockUserDialog.tsx` - User unblock confirmation dialog
3. `src/routes/admin/components/UserSearchInput.tsx` - Admin user search with debouncing
4. `src/routes/admin/components/RevokeTokensDialog.tsx` - Token revocation confirmation dialog
5. `src/routes/admin/pages/AdminUserDetailPage.tsx` - User detail view with action buttons

**Upload Components (High Priority - Recently Modified):**
6. `src/components/Uploader/SessionProvider/index.tsx` - Upload session context provider
7. `src/components/Uploader/UploaderFileItem/index.tsx` - Individual file upload item
8. `src/components/Uploader/RateLimitBanner/index.tsx` - Rate limit countdown banner
9. `src/components/Uploader/ConflictModal/index.tsx` - File conflict resolution dialog
10. `src/components/Uploader/UploaderList/index.tsx` - Grouped file upload list
11. `src/components/Uploader/SessionExpiredBanner/index.tsx` - Session expiry warning

**Module Wrappers (Medium Priority):**
12. `src/routes/modules/SetsGalleryModule.tsx` - Sets gallery micro-frontend wrapper
13. `src/routes/modules/InspirationModule.tsx` - Inspiration gallery micro-frontend wrapper
14. `src/routes/modules/InstructionsCreateModule.tsx` - Instructions creation micro-frontend wrapper

**Form Components (Medium Priority):**
15. `src/components/MocEdit/TagInput.tsx` - Tag input with validation (max 10 tags, max 30 chars each)
16. `src/components/MocEdit/SlugField.tsx` - Slug generation and validation field

**Navigation Components (Medium Priority):**
17. `src/components/Navigation/NotFoundHandler.tsx` - 404 handling in navigation system

**Layout Components (Low Priority):**
18. `src/components/Layout/Sidebar.tsx` - Main sidebar navigation
19. `src/components/Layout/RootLayout.tsx` - Root layout wrapper
20. `src/components/Cache/CacheDashboard.tsx` - Cache management dashboard

**Auth Pages (Low Priority - Placeholder/Basic):**
21. `src/routes/pages/InstructionsNewPage.tsx` - New instructions page wrapper
22. `src/routes/pages/PlaceholderPage.tsx` - Generic placeholder page
23. `src/routes/pages/UnauthorizedPage.tsx` - 401 unauthorized error page
24. `src/routes/pages/LoadingPage.tsx` - Already has test file (false positive from analysis)

**Entry Points (Very Low Priority):**
25. `src/App.tsx` - Main app component (has integration test)
26. `src/main.tsx` - App entry point (not typically tested)
27. `src/test/performance.test.tsx` - Performance test file itself (meta-test, exclude)

**Actually Untested Components:** 24 components (excluding LoadingPage, main.tsx, performance.test.tsx)

### Reuse Candidates

**Test Utilities:**
- `src/test/setup.ts` - Global test setup with comprehensive mocks
- `src/test/test-utils.tsx` - Custom render utilities
- `src/test/mocks.tsx` - Mock data and helpers

**Test Patterns from Existing Tests:**

1. **Admin Component Pattern** (from `BlockUserDialog.test.tsx`, `UserTable.test.tsx`, `AdminUsersPage.test.tsx`):
   - Dialog testing: open/close, confirm/cancel, loading states
   - Table testing: rendering rows, empty states, pagination
   - RTK Query mutation testing with MSW
   - ARIA attribute validation
   - Error handling for API failures

2. **Dashboard Component Pattern** (from `QuickActions.test.tsx`, `RecentMocsGrid.test.tsx`, `StatsCards.test.tsx`):
   - Card component rendering with mock data
   - Loading skeleton states
   - Empty states
   - Click handlers and navigation
   - Responsive grid layouts

3. **Layout Component Pattern** (from `Footer.test.tsx`, `Header.test.tsx`, `MainArea.test.tsx`, `MobileSidebar.test.tsx`):
   - Component hierarchy rendering
   - Conditional rendering based on props
   - Mobile/desktop responsive behavior
   - Accessibility landmarks (nav, main, aside)

4. **Navigation Component Pattern** (from `EnhancedBreadcrumb.test.tsx`, `NavigationProvider.test.tsx`, `NavigationSearch.test.tsx`):
   - Context provider testing
   - Search functionality with debouncing
   - Keyboard shortcuts
   - Focus management
   - Screen reader announcements

5. **Auth Page Pattern** (from `EmailVerificationPage.test.tsx`, `NewPasswordPage.test.tsx`, `OTPVerificationPage.test.tsx`):
   - Form submission handling
   - Validation error display
   - Success/error state feedback
   - AWS Amplify integration mocking
   - Password visibility toggle

6. **Form Component Pattern** (from `EditForm.test.tsx`):
   - react-hook-form integration
   - Zod schema validation
   - Character count validation
   - Real-time validation feedback
   - Form dirty state detection

7. **Module Pattern** (from `DashboardModule.test.tsx`, `GalleryModule.test.tsx`, `InstructionsModule.test.tsx`, `WishlistModule.test.tsx`):
   - Micro-frontend wrapper testing
   - Lazy loading behavior
   - Error boundary testing
   - Module state management

8. **Page Pattern** (from `HomePage.test.tsx`, `LoginPage.test.tsx`, `NotFoundPage.test.tsx`):
   - Full page rendering
   - SEO metadata validation
   - Route navigation integration
   - Authentication state handling

**MSW Handlers:**
- Admin API endpoints already mocked in store setup
- RTK Query hooks for admin operations: `useListUsersQuery`, `useGetUserDetailQuery`, `useRevokeTokensMutation`, `useBlockUserMutation`, `useUnblockUserMutation`
- Dashboard API endpoints: `useGetStatsQuery`, `useGetRecentMocsQuery`
- Gallery/Wishlist API endpoints: comprehensive mocking in store setup

**Shared Packages:**
- `@repo/app-component-library` - All UI components fully mocked
- `@repo/logger` - Logger mocked globally
- `@tanstack/react-router` - Router mocked globally
- `aws-amplify/auth` - Auth methods mocked globally
- `react-hook-form` - Form hooks mocked globally
- `framer-motion` - Motion components mocked globally

---

## Knowledge Context

### Lessons Learned

No knowledge base search performed (KB unavailable). Future implementation should query KB for:
- Past blockers from similar test coverage stories
- Common patterns that caused test failures
- Time sinks in component testing

### Blockers to Avoid (from past stories)

**Common Test Coverage Pitfalls:**
- Missing mock setup for global dependencies (avoid by reusing existing setup.ts)
- Inconsistent use of semantic queries (enforce getByRole/getByLabelText)
- Skipping accessibility tests (make accessibility tests mandatory)
- Not testing error states (require error state coverage for all components with API calls)
- Overly complex mocks (reuse existing MSW handlers from store)

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy | Unit tests MUST use MSW for mocking, MUST NOT use real services |
| ADR-006 | E2E Tests in Dev Phase | E2E tests recommended but not required for test coverage stories |
| ADR-001 | API Path Schema | Frontend uses /api/v2/{domain}, Backend uses /{domain} (via Vite proxy) |

### Patterns to Follow

**From ADR-005:**
- Unit tests: All mocked (MSW, in-memory, stubs)
- Integration tests: Partial mocks allowed
- E2E tests: MSW or live (optional for this story)
- UAT tests: All real services (not in scope)

**From existing test files:**
- BDD structure: `describe('ComponentName')` > `describe('rendering')`, `describe('interactions')`, `describe('accessibility')`
- Use `userEvent.setup()` for interactions, not `fireEvent`
- Use `vi.clearAllMocks()` in `beforeEach` for cleanup
- Use `waitFor()` for async assertions
- Test ARIA attributes: `role`, `aria-label`, `aria-describedby`
- Test keyboard navigation: Tab, Enter, Escape, Arrow keys

### Patterns to Avoid

**Anti-patterns from CLAUDE.md:**
- Don't use `console.log` - use `@repo/logger` (already mocked)
- Don't create barrel files for tests - import directly
- Don't use TypeScript interfaces - use Zod schemas with `z.infer<>`
- Don't import from individual paths for @repo/app-component-library - use single import

**Testing anti-patterns:**
- Don't test implementation details - test user behavior
- Don't use `getByTestId` unless semantic queries impossible
- Don't skip accessibility tests - mandatory for all components
- Don't modify component code to make tests pass (exception: fixing actual bugs → separate story)

---

## Conflict Analysis

No conflicts detected.

**No Overlapping Work:**
- BUGF-012 (in-progress) targets app-inspiration-gallery components
- BUGF-013 (backlog) targets app-instructions-gallery upload components
- BUGF-014 (backlog) targets app-sets-gallery components
- BUGF-015 targets main-app components (no overlap)

**No Blocking Dependencies:**
- All test infrastructure already in place
- All global mocks already configured
- All MSW handlers already set up in store
- No API changes required

---

## Story Seed

### Title
Add Test Coverage for Main App Components

### Description

The main-app currently has 53 test files covering approximately 60% of components, leaving 24 untested components across administrative areas, upload functionality, module wrappers, form inputs, navigation, and layout components. Notable untested components include security-critical admin dialogs (UnblockUserDialog, RevokeTokensDialog, AdminUserDetailPage), recently modified upload components (SessionProvider, UploaderFileItem, ConflictModal, RateLimitBanner), and core form components (TagInput, SlugField).

Without comprehensive test coverage, regressions in admin operations, upload flows, and form validation can go undetected. The existing test infrastructure is robust with comprehensive global mocks and established test patterns, making this a straightforward effort to close coverage gaps.

This story will create unit tests for all 24 untested components following established patterns from the 53 existing test files, achieving minimum 45% global coverage threshold (currently estimated at 36-40% for main-app).

### Initial Acceptance Criteria

**AC-1: Admin Component Test Coverage**
- [ ] AdminModule.tsx has test file with module wrapper rendering tests
- [ ] UnblockUserDialog.tsx has test file with dialog open/close, confirmation flow, API call verification
- [ ] UserSearchInput.tsx has test file with search input, debouncing, results display
- [ ] RevokeTokensDialog.tsx has test file with dialog confirmation, API mutation, error handling
- [ ] AdminUserDetailPage.tsx has test file with user detail rendering, action buttons, API calls
- [ ] All admin components have accessibility tests (ARIA attributes, keyboard navigation)
- [ ] All admin components have error state tests (API failures, network errors)

**AC-2: Upload Component Test Coverage**
- [ ] SessionProvider.tsx has test file with context provision, session state management, persistence
- [ ] UploaderFileItem.tsx has test file with file rendering, progress display, retry/cancel/remove actions
- [ ] UploaderList.tsx has test file with file grouping, aggregate progress, category sections
- [ ] ConflictModal.tsx has test file with conflict display, new title input, validation
- [ ] RateLimitBanner.tsx has test file with countdown timer, retry button enable/disable
- [ ] SessionExpiredBanner.tsx has test file with expired count display, refresh action
- [ ] All upload components have accessibility tests (ARIA live regions, progress announcements)

**AC-3: Module Wrapper Test Coverage**
- [ ] SetsGalleryModule.tsx has test file with lazy loading, error boundary, module state
- [ ] InspirationModule.tsx has test file with lazy loading, error boundary, module state
- [ ] InstructionsCreateModule.tsx has test file with lazy loading, error boundary, module state
- [ ] All module wrappers have loading state tests
- [ ] All module wrappers have error state tests

**AC-4: Form Component Test Coverage**
- [ ] TagInput.tsx has test file with tag add/remove, validation (max 10 tags, max 30 chars), chip display
- [ ] SlugField.tsx has test file with slug generation, format validation (lowercase, hyphens, numbers only), manual editing
- [ ] All form components have real-time validation feedback tests
- [ ] All form components have accessibility tests (aria-describedby for errors)

**AC-5: Navigation and Layout Component Test Coverage**
- [ ] NotFoundHandler.tsx has test file with 404 handling, navigation fallback
- [ ] Sidebar.tsx has test file with navigation items, active states, mobile collapse
- [ ] RootLayout.tsx has test file with layout structure, children rendering
- [ ] CacheDashboard.tsx has test file with cache display, clear actions, stats
- [ ] All navigation/layout components have accessibility tests (landmarks, ARIA labels)

**AC-6: Page Component Test Coverage**
- [ ] InstructionsNewPage.tsx has test file with page rendering, form display, submission
- [ ] PlaceholderPage.tsx has test file with placeholder message, navigation options
- [ ] UnauthorizedPage.tsx has test file with 401 error display, sign-in redirect
- [ ] All page components have SEO metadata validation
- [ ] All page components have route navigation tests

**AC-7: Test Quality Standards**
- [ ] All tests use semantic queries (getByRole, getByLabelText, getByText)
- [ ] All tests follow BDD structure (rendering, interactions, accessibility, keyboard navigation)
- [ ] All tests use userEvent for interactions (not fireEvent)
- [ ] All tests have beforeEach cleanup (vi.clearAllMocks)
- [ ] All async tests use waitFor for assertions
- [ ] All tests reuse existing MSW handlers (no new handlers needed)

**AC-8: Coverage Metrics**
- [ ] main-app achieves minimum 45% line coverage
- [ ] All 24 untested components now have test files
- [ ] All tests pass in CI (`pnpm test --filter main-app`)
- [ ] Lint passes (`pnpm lint --filter main-app`)
- [ ] Type check passes (`pnpm check-types --filter main-app`)

### Non-Goals

**Out of Scope:**
- E2E testing (optional per ADR-006, can be added in future story)
- Testing main.tsx entry point (not typically tested)
- Testing performance.test.tsx itself (meta-test)
- Fixing bugs found during testing (create separate BUGF stories)
- Refactoring components to be more testable (test as-is)
- Testing @repo/app-component-library components (already mocked, tested separately)
- Visual regression testing (not in current test strategy)
- Performance testing (not required for test coverage story)

**Protected Features:**
- Do NOT modify existing 53 test files (already passing, well-established patterns)
- Do NOT modify existing MSW handlers in setup.ts (reuse as-is)
- Do NOT modify component implementations to make tests pass (exception: fixing actual bugs requires separate story)
- Do NOT break existing global mocks (many tests depend on setup.ts configuration)

**Deferred:**
- App.tsx has integration test already (skip additional unit tests)
- LoadingPage.tsx already has test file (confirmed via grep)
- Complex drag-and-drop testing (if needed, create separate story)
- Real API integration testing (covered by E2E/UAT, not unit tests)

### Reuse Plan

**Components from existing tests:**
- All 53 existing test files provide reusable patterns
- AdminUsersPage, BlockUserDialog, UserTable - Admin component patterns
- QuickActions, RecentMocsGrid, StatsCards - Dashboard component patterns
- Footer, Header, MainArea, MobileSidebar - Layout component patterns
- EnhancedBreadcrumb, NavigationProvider, NavigationSearch - Navigation patterns
- EmailVerificationPage, NewPasswordPage, OTPVerificationPage - Auth page patterns
- EditForm - Form validation patterns
- DashboardModule, GalleryModule, InstructionsModule, WishlistModule - Module wrapper patterns

**Test Infrastructure:**
- Reuse `src/test/setup.ts` global mocks (comprehensive, already covers all dependencies)
- Reuse `src/test/test-utils.tsx` custom render utilities
- Reuse `src/test/mocks.tsx` mock data and helpers
- Reuse MSW handlers from store mock (admin API, dashboard API, gallery/wishlist API)
- Reuse RTK Query hook mocks (already configured in setup.ts)

**Patterns to Follow:**
1. BDD structure: `describe('ComponentName')` > `describe('rendering')`, `describe('interactions')`, `describe('accessibility')`
2. Semantic queries: `getByRole`, `getByLabelText`, `getByText` (avoid `getByTestId`)
3. User interactions: `userEvent.setup()` and `await user.click()`, `await user.type()`
4. Cleanup: `beforeEach(() => { vi.clearAllMocks() })`
5. Async assertions: `await waitFor(() => { expect(...) })`
6. ARIA testing: `expect(element).toHaveAttribute('aria-label', 'Expected label')`
7. Accessibility: Test keyboard navigation (Tab, Enter, Escape), focus management, screen reader support

**MSW Handler Reuse:**
- Admin API: `useListUsersQuery`, `useGetUserDetailQuery`, `useRevokeTokensMutation`, `useBlockUserMutation`, `useUnblockUserMutation`
- Dashboard API: `useGetStatsQuery`, `useGetRecentMocsQuery`
- Gallery/Wishlist API: All hooks already mocked in store setup
- No new MSW handlers needed (all APIs already mocked)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

**Test Prioritization:**
1. **Phase 1 - Admin Components (High Priority - Security Critical):**
   - AdminModule, UnblockUserDialog, UserSearchInput, RevokeTokensDialog, AdminUserDetailPage
   - Reason: Security-critical admin operations must be tested thoroughly
   - Estimated effort: 4-6 hours

2. **Phase 2 - Upload Components (High Priority - Recently Modified):**
   - SessionProvider, UploaderFileItem, UploaderList, ConflictModal, RateLimitBanner, SessionExpiredBanner
   - Reason: Recently modified for presigned URL integration (BUGF-032), high regression risk
   - Estimated effort: 4-5 hours

3. **Phase 3 - Module Wrappers (Medium Priority):**
   - SetsGalleryModule, InspirationModule, InstructionsCreateModule
   - Reason: Thin wrappers, straightforward testing
   - Estimated effort: 2-3 hours

4. **Phase 4 - Form Components (Medium Priority):**
   - TagInput, SlugField
   - Reason: Form validation logic, Zod schema testing
   - Estimated effort: 2-3 hours

5. **Phase 5 - Navigation and Layout (Low Priority):**
   - NotFoundHandler, Sidebar, RootLayout, CacheDashboard
   - Reason: Presentational components, lower risk
   - Estimated effort: 2-3 hours

6. **Phase 6 - Pages (Low Priority):**
   - InstructionsNewPage, PlaceholderPage, UnauthorizedPage
   - Reason: Simple page wrappers, low complexity
   - Estimated effort: 1-2 hours

**Total Estimated Effort:** 15-22 hours (approximately 2-3 days)

**Test Infrastructure:**
- All MSW handlers already configured in `src/test/setup.ts`
- All global mocks already configured (ResizeObserver, IntersectionObserver, matchMedia, Amplify, Router, Logger)
- All RTK Query hooks already mocked in store
- No additional setup needed - focus on writing tests

**Coverage Targets:**
- Minimum 45% global coverage (per CLAUDE.md)
- Aim for 70%+ coverage for admin components (security critical)
- Aim for 65%+ coverage for upload components (high complexity)
- Aim for 60%+ coverage for form components (validation logic)
- Aim for 50%+ coverage for layout/navigation components (presentational)

### For UI/UX Advisor

**Accessibility Requirements (Mandatory):**
- All components MUST have ARIA attribute tests
- All interactive components MUST have keyboard navigation tests
- All form components MUST have error message linking via aria-describedby
- All dynamic content MUST have aria-live region tests (progress bars, countdowns, announcements)
- All dialogs MUST have focus trap tests
- All modals MUST have Escape key close tests

**User Experience Validation:**
- Admin dialogs: Test confirmation flow prevents accidental destructive actions
- Upload components: Test progress feedback provides clear status updates
- Form components: Test real-time validation provides immediate feedback
- Navigation: Test keyboard shortcuts work as documented
- Error states: Test all error messages are user-friendly and actionable

**Focus Management:**
- Modal open: Focus moves to first focusable element in modal
- Modal close: Focus restores to trigger element
- Navigation: Tab order follows visual flow
- Error messages: Focus moves to first error on validation failure

### For Dev Feasibility

**Technical Constraints:**
- All dependencies already mocked in setup.ts (no new mocks needed)
- All MSW handlers already configured (no new handlers needed)
- All RTK Query hooks already mocked (no new query mocks needed)
- All UI components already mocked via @repo/app-component-library mock

**Reuse Opportunities:**
- 53 existing test files provide comprehensive patterns
- Test utilities already created (setup.ts, test-utils.tsx, mocks.tsx)
- Semantic query patterns established across all tests
- BDD structure established across all tests

**Risk Areas:**
- **Timer testing:** RateLimitBanner countdown requires `vi.useFakeTimers()` and `vi.advanceTimersByTime()`
  - Mitigation: Reference existing timer tests in codebase (if any) or use standard Vitest fake timers pattern
- **Context provider testing:** SessionProvider requires rendering child components within provider
  - Mitigation: Reference NavigationProvider.test.tsx for context provider pattern
- **Module lazy loading:** Module wrappers use React.lazy which may require special mocking
  - Mitigation: Reference existing module tests (DashboardModule.test.tsx, GalleryModule.test.tsx)
- **Form validation:** react-hook-form + Zod requires triggering validation correctly
  - Mitigation: Reference EditForm.test.tsx for established validation testing pattern

**Estimated Complexity:**
- **High Complexity (4-6 hours):** Admin components (security critical, complex flows)
- **Medium Complexity (4-5 hours):** Upload components (timer logic, progress tracking, error scenarios)
- **Low Complexity (6-9 hours):** Module wrappers, form components, layout, pages (straightforward testing)
- **Total: 14-20 hours (2-3 days)**

**Dependencies:**
- No blocking dependencies
- All infrastructure already in place
- Can start immediately

---

**STORY-SEED COMPLETE WITH WARNINGS: 1 warning**

**Warning:** No baseline reality file exists at expected path. Seed generated from direct codebase scanning and ADR analysis only. Future story generations should include active baseline for improved reality grounding.
