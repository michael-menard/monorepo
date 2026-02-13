# Elaboration Analysis - BUGF-012

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Story scope matches stories.index.md entry. 18 untested components + main-page.tsx identified. Module-layout.tsx correctly excluded per BUGF-045. |
| 2 | Internal Consistency | PASS | — | Goals, Non-goals, ACs, and Scope are internally consistent. No contradictions found. Test plan aligns with 8 ACs. |
| 3 | Reuse-First | PASS | — | Story mandates reusing existing test patterns (BulkActionsBar, InspirationCard tests), MSW handlers, and test utilities. No new test infrastructure required. |
| 4 | Ports & Adapters | N/A | — | Not applicable - test-only story, no API endpoints or business logic. |
| 5 | Local Testability | PASS | — | Tests ARE the deliverable. Vitest framework already configured. MSW handlers exist for all API endpoints. |
| 6 | Decision Completeness | PASS | — | @dnd-kit mocking approach documented (needs implementation research but not blocking). No other TBDs or blocking decisions. |
| 7 | Risk Disclosure | PASS | — | Main risks identified: @dnd-kit mocking complexity (Medium), main-page test breadth (Medium), test suite performance (Low). |
| 8 | Story Sizing | PASS | — | 5 points justified. 18 components + 885-line main-page + @dnd-kit research + 70% coverage target = high effort. Not oversized. |

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| 1 | Component count discrepancy | Low | Story claims 23 total components (3 tested, 18 untested = 21). Actual count: 21 component directories with index.tsx + 2 standalone files (module-layout.tsx, MiniInspirationCard.tsx). Counts align when module-layout excluded. AC table shows 19 untested (typo). Update to 18 untested for consistency. |
| 2 | @repo/hooks import reference | Low - Informational | Story mentions testing `@repo/hooks/useMultiSelect` through integration. Verified: package exists and is imported correctly in main-page.tsx. No issue, just confirming package is functional despite BUGF-050 noting "zero imports" (appears outdated). |
| 3 | Missing pages/__tests__ directory | Low - Informational | Story assumes test file creation in `src/pages/__tests__/main-page.test.tsx`. Directory doesn't exist yet (expected for new tests). Implementation will create it. |
| 4 | Modal count accuracy | Low | Story lists 7 modals, but counts 6 modal directories + UploadModal. Verified: 7 modals exist and are correctly listed in AC-2. No issue. |

## Split Recommendation

**Not Required**

Story is appropriately sized at 5 points. While 18 components is a large scope, the story follows established test patterns and can be executed in phases (P0-P3 prioritization already defined in Scope section).

## Preliminary Verdict

**PASS**

- All 8 audit checks pass
- 4 low-severity informational issues (no blocking fixes required)
- Scope aligns with stories.index.md
- Story ready for implementation

**Verdict**: PASS

---

## MVP-Critical Gaps

None - core journey is complete.

**Analysis:**

This is a test coverage story. The "core journey" is writing comprehensive unit/integration tests for 18 untested components. The story provides:

1. **Complete test scope**: All 18 components explicitly listed
2. **Test patterns**: References to existing test files (BulkActionsBar, InspirationCard, AlbumCard)
3. **Test infrastructure**: MSW handlers exist, vitest.config.ts configured, global mocks in setup.ts
4. **Acceptance criteria**: 8 detailed ACs covering all component types and quality metrics
5. **Coverage targets**: 70% line coverage, 65% branch coverage (above 45% global minimum)
6. **Prioritization**: P0-P3 phases for implementation order

**No MVP-critical gaps identified** because:

- Test infrastructure is complete (MSW, vitest, global mocks)
- Test patterns are established (3 existing test files to follow)
- All components are clearly scoped
- Coverage metrics are defined
- @dnd-kit mocking is documented as needing research but not blocking (can test drag handlers in isolation)

The story is ready to implement as-is.

---

## Codebase Validation

### Component Inventory Verification

**Claimed in Story:**
- 23 total components
- 3 tested (BulkActionsBar, InspirationCard, AlbumCard)
- 18 untested
- 1 excluded (module-layout.tsx - deferred to BUGF-045)

**Actual Codebase State (Verified):**
```
src/components/ directory:
- 21 component directories with index.tsx
- 2 standalone files (module-layout.tsx, AlbumCard/MiniInspirationCard.tsx)

Component directories (21):
1. AddToAlbumModal
2. AlbumCard (tested ✓)
3. AlbumCardSkeleton
4. AlbumContextMenu
5. AlbumDragPreview
6. BulkActionsBar (tested ✓)
7. CreateAlbumModal
8. DeleteAlbumModal
9. DeleteInspirationModal
10. DraggableInspirationGallery
11. EditInspirationModal
12. EmptyState
13. GalleryLoadingSkeleton
14. InspirationCard (tested ✓)
15. InspirationCardSkeleton
16. InspirationContextMenu
17. InspirationDragPreview
18. LinkToMocModal
19. SortableAlbumCard
20. SortableInspirationCard
21. UploadModal

Standalone files:
- module-layout.tsx (excluded per Non-Goals)
- AlbumCard/MiniInspirationCard.tsx (sub-component, not counted separately)

Pages:
- main-page.tsx (885 lines - verified)
```

**Component Count Reconciliation:**
- 21 directories - 3 tested = 18 untested ✓ (matches story)
- module-layout.tsx correctly excluded
- MiniInspirationCard.tsx is a sub-component of AlbumCard (not a separate test target)

**Verdict:** Component counts are accurate. Story table showing "19 untested" is a typo (should be 18).

### Test Infrastructure Verification

**MSW Handlers (verified in src/test/mocks/handlers.ts):**
- ✓ GET /inspiration (paginated list)
- ✓ GET /inspiration/:id
- ✓ POST /inspiration
- ✓ PATCH /inspiration/:id
- ✓ DELETE /inspiration/:id
- ✓ GET /inspiration/albums
- ✓ GET /inspiration/albums/:id
- ✓ POST /inspiration/albums
- ✓ PATCH /inspiration/albums/:id
- ✓ DELETE /inspiration/albums/:id
- ✓ POST /inspiration/presign

**Global Mocks (verified in src/test/setup.ts):**
- ✓ ResizeObserver
- ✓ IntersectionObserver
- ✓ window.matchMedia
- ✓ @tanstack/react-router (useNavigate, useLocation, useParams, useSearch)
- ✓ @repo/logger

**Vitest Configuration (verified in vitest.config.ts):**
- ✓ globals: true
- ✓ environment: jsdom
- ✓ setupFiles: ['./src/test/setup.ts']
- ✓ coverage: v8 provider with text/json/html reporters
- ✓ Mock environment variables configured

**Package Dependencies (verified in package.json):**
- ✓ @testing-library/react: ^16.2.0
- ✓ @testing-library/user-event: ^14.6.1
- ✓ @testing-library/jest-dom: ^6.6.3
- ✓ vitest: ^3.0.5
- ✓ msw: ^2.6.4
- ✓ @dnd-kit/core: 6.3.1 (for drag testing)
- ✓ @dnd-kit/sortable: 10.0.0

**Existing Test Files (verified):**
1. **BulkActionsBar/__tests__/BulkActionsBar.test.tsx** (207 lines)
   - BDD structure: rendering, interactions, accessibility
   - Multi-select state testing
   - Keyboard shortcuts (Delete, Escape, Select All)
   - Toast notification verification
   - RTK Query mutation testing

2. **InspirationCard/__tests__/InspirationCard.test.tsx** (342 lines)
   - GalleryCard integration testing
   - Hover overlay interactions
   - Selection mode testing
   - Context menu triggering
   - Keyboard navigation (arrow keys, Enter, Space)
   - Accessibility assertions (ARIA labels, roles)

3. **AlbumCard/__tests__/AlbumCard.test.tsx** (verified exists)
   - Card metadata display testing
   - Click handler verification

**Verdict:** Test infrastructure is complete and production-ready. No new dependencies or setup required.

### Main Page Complexity Analysis

**main-page.tsx metrics (verified):**
- Line count: 885 lines ✓
- React hooks: 27 hook calls
- State variables: 21 useState declarations
- API queries: 2 (useGetInspirationsQuery, useGetAlbumsQuery)
- Mutations: 6 (create/update/delete for inspirations/albums, presign URL)
- Multi-select: 2 instances (inspirations, albums) via `useMultiSelect` from @repo/hooks
- Keyboard shortcuts: Uses `useGalleryKeyboard` from @repo/gallery
- Modals: 7 modal state toggles

**Complexity factors:**
- Tab switching (All Inspirations / Albums)
- Search + sort + filter state management
- 7 modals with independent state
- Multi-select mode for bulk operations
- Keyboard shortcuts (Escape, Delete, Ctrl+A, Cmd+N, Cmd+U, Cmd+L, Cmd+M)
- Context menu integration
- Drag-sort integration (DraggableInspirationGallery)
- Empty state variants (first-time, no results, no items)
- Loading states (skeleton components)
- Error handling for API failures

**Test Approach Recommendation:**
The story's AC-1 correctly breaks down main-page testing into logical sections:
- Tab switching
- Search/sort/filter
- View mode toggle
- Empty states (3 variants)
- Loading states
- Error states
- Multi-select mode
- Keyboard shortcuts (8 shortcuts)
- Modal opening/closing (7 modals)
- Card click handlers
- Context menu opening
- Bulk actions bar visibility

This is a comprehensive integration test strategy. Estimated 400-600 lines of test code for main-page.test.tsx alone.

### Shared Package Validation

**@repo/hooks usage (verified):**
- ✓ useMultiSelect imported and used in main-page.tsx
- ✓ Package exists at /packages/core/hooks/
- ✓ Source file: src/useMultiSelect.ts (functional implementation)
- Note: BUGF-050 mentions "@repo/hooks has zero imports" - this appears outdated or incorrect. Package is actively used.

**@repo/gallery usage (verified from main-page.tsx imports):**
- ✓ useGalleryKeyboard (keyboard shortcuts)
- Note: Story mentions useRovingTabIndex but only used in DraggableInspirationGallery, not main-page

**@repo/accessibility usage (verified):**
- ✓ useAnnouncer used in DraggableInspirationGallery for screen reader announcements

**@repo/api-client RTK Query hooks (verified):**
- ✓ useGetInspirationsQuery
- ✓ useGetAlbumsQuery
- ✓ useCreateInspirationMutation
- ✓ useCreateAlbumMutation
- ✓ useUpdateInspirationMutation
- ✓ useDeleteInspirationMutation
- ✓ useDeleteAlbumMutation
- ✓ useGetInspirationImagePresignUrlMutation

**Verdict:** All shared packages referenced in the story are functional and correctly integrated.

### Component Size Analysis

**Large Components (>250 lines) requiring comprehensive tests:**
1. DraggableInspirationGallery (644 lines) - Complex drag/drop with undo, error handling, rollback
2. UploadModal (437 lines) - File upload, URL import, drag-drop, form validation
3. EditInspirationModal (297 lines) - Form with validation, tags, async save
4. AddToAlbumModal (282 lines) - Album selection, membership management
5. LinkToMocModal (288 lines) - MOC search/selection flow

**Medium Components (100-250 lines) requiring standard tests:**
6. CreateAlbumModal (219 lines)
7. DeleteAlbumModal (192 lines)
8. EmptyState (186 lines)
9. DeleteInspirationModal (179 lines)
10. SortableAlbumCard (176 lines)
11. SortableInspirationCard (173 lines)

**Simple Components (<100 lines) requiring basic tests:**
12. InspirationContextMenu (118 lines)
13. AlbumContextMenu (115 lines)
14. AlbumDragPreview (100 lines)
15. GalleryLoadingSkeleton (72 lines)
16. InspirationDragPreview (68 lines)
17. AlbumCardSkeleton (58 lines)
18. InspirationCardSkeleton (52 lines)

**Total LOC for untested components:** ~4,167 lines (excluding main-page.tsx)

**Coverage Target Feasibility:**
- 70% line coverage of 4,167 lines = ~2,917 lines must be covered
- Main-page.tsx adds 885 lines (target 75% = 664 lines)
- Total coverage target: ~3,581 lines across all components
- Estimated test code: 1,800-2,400 lines (roughly 50% of covered code)

This sizing validates the 5-point estimate (3-5 days).

---

## Architecture Compliance

### Test-Only Story Validation

**Ports & Adapters Check:** N/A - No API endpoints or business logic in this story. Test files only.

**Reuse-First Compliance:**
- ✓ Reuses existing MSW handlers (no new handlers needed)
- ✓ Reuses existing test setup (src/test/setup.ts)
- ✓ Reuses existing test patterns (BulkActionsBar, InspirationCard)
- ✓ No new test infrastructure packages created
- ✓ Tests @repo/gallery components as black boxes (integration, not isolation)

**Testing Strategy Compliance (CLAUDE.md):**
- ✓ Minimum 45% coverage global target (story targets 70% for this app)
- ✓ Vitest + React Testing Library
- ✓ Semantic queries (getByRole, getByLabelText) mandated in AC-7
- ✓ Tests in __tests__/ directories (per AC-1 through AC-5)
- ✓ BDD structure required (rendering, interactions, accessibility, keyboard)

**Non-Goals Validation:**
- ✓ E2E tests excluded (per ADR-005, Phase 3 unit/integration only)
- ✓ Backend API tests excluded (backend has own suite)
- ✓ Visual regression excluded (not in test strategy)
- ✓ Performance tests excluded (not required)
- ✓ Drag-and-drop real browser behavior excluded (mocked in unit tests)
- ✓ Bug fixing excluded (create separate BUGF stories)
- ✓ Component refactoring excluded (test as-is)

**Protected Features:**
- ✓ Existing test files not modified (only new tests added)
- ✓ MSW handlers reused as-is (unless API contract changed)
- ✓ Test setup not broken (no changes to src/test/setup.ts)
- ✓ Component implementations not changed (readonly testing)

---

## Risk Assessment

### Technical Risks

**1. @dnd-kit Mocking Complexity (Medium)**
- **Risk:** @dnd-kit testing not well-documented, may require trial-and-error
- **Mitigation in Story:** Story documents mocking approach and suggests testing drag handlers in isolation
- **Status:** Documented but requires implementation research. Not blocking - can proceed with other tests first.

**2. Main Page Test Breadth (Medium)**
- **Risk:** 885-line integration test may be too broad, hard to debug failures
- **Mitigation in Story:** AC-1 breaks main-page tests into 14 subsections with clear scoping
- **Recommendation:** Use `within()` for modal tests, `describe()` blocks for logical grouping
- **Status:** Adequately mitigated by detailed AC breakdown.

**3. Test Suite Performance (Low)**
- **Risk:** 18 new test files could slow CI/CD pipeline
- **Mitigation in Story:** Story mentions monitoring test run time, using test.concurrent
- **Status:** Low risk - existing tests run fast, vitest is optimized for speed.

**4. Modal Test Duplication (Low)**
- **Risk:** 7 modal tests may have repetitive open/close/validation patterns
- **Mitigation in Story:** AC-8 suggests creating reusable modal test helper
- **Status:** Optional enhancement, not blocking.

### Scope Risks

**1. Incomplete Coverage After Implementation (Low)**
- **Risk:** 70% coverage target may not be achieved
- **Mitigation:** AC-6 requires coverage report verification, gaps must be filled
- **Status:** Well-mitigated by coverage metrics in ACs.

**2. BUGF-032 Conflict (Low)**
- **Risk:** UploadModal testing may conflict with in-progress presigned URL work
- **Mitigation in Story:** "Related Work" section notes BUGF-032 non-blocking (different scope)
- **Codebase Check:** UploadModal currently uses placeholder onUpload callback, not presigned URL API
- **Status:** No conflict - UploadModal tests will mock onUpload handler.

---

## Decision Completeness

### Open Questions

**Q1: @dnd-kit Testing Approach**
- **Status:** Documented in story but requires implementation research
- **Blocking:** No - story provides fallback approach (test handlers in isolation)
- **Recommendation:** Start with handler testing, research @dnd-kit docs during implementation

**Q2: Modal Test Helper Pattern**
- **Status:** Optional enhancement mentioned in AC-8
- **Blocking:** No - can implement modals individually first, refactor if duplication high
- **Recommendation:** Defer decision until after 2-3 modals tested

### Resolved Decisions

**D1: Test Framework**
- Vitest ✓ (already configured)

**D2: Test Patterns**
- BDD structure from existing tests ✓
- Semantic queries (getByRole preferred) ✓
- userEvent for interactions ✓

**D3: Coverage Target**
- 70% line coverage ✓
- 65% branch coverage ✓
- Above global 45% minimum ✓

**D4: E2E Testing**
- Excluded per ADR-005 ✓

**D5: Component Modifications**
- Test as-is, no refactoring ✓

**No blocking decisions remaining.**

---

## Quality Gate Compliance

### Pre-Implementation Checklist

- [x] All acceptance criteria are testable and verifiable
- [x] Test infrastructure exists (MSW, vitest, mocks)
- [x] Test patterns documented (existing test files)
- [x] Coverage targets defined (70% line, 65% branch)
- [x] Component inventory verified against codebase
- [x] No blocking technical decisions
- [x] No scope conflicts with in-progress work
- [x] Story sized appropriately (5 points)

### Implementation Readiness

**Ready to implement:** YES

**Recommended start order:**
1. Phase 1 (P0): main-page.tsx, DraggableInspirationGallery
2. Phase 2 (P1): Modal components (7 modals)
3. Phase 3 (P1): Context menus (2 components)
4. Phase 4 (P2): Drag components (4 components)
5. Phase 5 (P3): UI components (4 skeletons + empty state)

**Blockers:** None

**Dependencies:** None

---

## Worker Token Summary

- Input: ~67,000 tokens (files read: story, seed, agent instructions, 15+ codebase files)
- Output: ~8,000 tokens (ANALYSIS.md + FUTURE-OPPORTUNITIES.md)
- Total: ~75,000 tokens
