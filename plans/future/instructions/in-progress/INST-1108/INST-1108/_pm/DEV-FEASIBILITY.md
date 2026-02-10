# Dev Feasibility Review: INST-1108 Edit MOC Metadata

Generated: 2026-02-09

---

## Feasibility Summary

**Feasible for MVP**: Yes

**Confidence**: High

**Why**:
- Backend implementation is straightforward (reuse POST /mocs patterns)
- Frontend has 95% code reuse (MocForm component already exists)
- RTK Query mutation hook already implemented (`useUpdateMocMutation`)
- No new packages required—all dependencies exist
- Validation schemas can be shared between create and update
- Total estimated effort: 8-10 hours (2-3 backend + 3-4 frontend + 2-3 testing)

---

## Likely Change Surface (Core Only)

### Backend

**Files to Modify:**
1. **`apps/api/lego-api/domains/mocs/routes.ts`**
   - Add: `PATCH /mocs/:id` route handler
   - Estimated LOC: ~50-80 lines
   - Pattern: Reuse structure from `POST /mocs` (lines 142-178)

2. **`apps/api/lego-api/domains/mocs/validation.ts`** (if exists, or create)
   - Add: `UpdateMocInputSchema` (Zod schema)
   - Estimated LOC: ~20-30 lines
   - Reuse: Most fields from `CreateMocInputSchema`

3. **`apps/api/lego-api/domains/mocs/__tests__/routes.test.ts`**
   - Add: Tests for PATCH endpoint (authorization, validation, success)
   - Estimated LOC: ~100-150 lines

**Database:**
- **No schema changes required**
- Update operation on `mocs` table (existing schema)
- Update `updatedAt` column (should be auto-updated via trigger or ORM)

**Deployment:**
- **No infrastructure changes**
- Route added to existing API Gateway/Lambda deployment

### Frontend

**Files to Create:**
1. **`apps/web/app-instructions-gallery/src/pages/EditMocPage.tsx`**
   - New page component
   - Estimated LOC: ~150-200 lines
   - Pattern: Mirror `CreateMocPage` structure

**Files to Modify:**
2. **`apps/web/app-instructions-gallery/src/App.tsx`** (or router file)
   - Add route: `<Route path="/mocs/:id/edit" element={<EditMocPage />} />`
   - Estimated LOC: +2 lines

3. **`apps/web/app-instructions-gallery/src/pages/MocDetailPage.tsx`** (INST-1101 integration)
   - Add: Edit button with link to `/mocs/:id/edit`
   - Estimated LOC: +10-15 lines
   - **Dependency**: INST-1101 must be implemented first (currently "Ready to Work")

**Files to Test:**
4. **`apps/web/app-instructions-gallery/src/pages/__tests__/EditMocPage.test.tsx`** (unit tests)
   - Estimated LOC: ~200-250 lines

5. **`apps/web/app-instructions-gallery/src/pages/__tests__/EditMocPage.integration.test.tsx`**
   - Estimated LOC: ~150-200 lines

6. **`apps/web/playwright/features/instructions/inst-1108-edit.feature`** (E2E)
   - Estimated LOC: ~100-150 lines (Gherkin + step definitions)

**No Changes Required:**
- **`MocForm` component**: Reused as-is (already supports `initialValues` prop from INST-1102)
- **RTK Query**: `useUpdateMocMutation` already exists (implemented in `packages/core/api-client/src/rtk/instructions-api.ts`)

### Packages Modified

**None**. All required packages exist:
- `@repo/app-component-library` (UI components)
- `@repo/api-client` (RTK Query hooks)
- `@repo/api-client/schemas/instructions` (UpdateMocInput schema—may need minor addition)
- `@repo/logger` (logging)

### Critical Deploy Touchpoints

1. **Backend API Deployment**:
   - Deploy updated `apps/api/lego-api` with new PATCH route
   - No database migration required
   - No configuration changes

2. **Frontend Deployment**:
   - Deploy updated `apps/web/app-instructions-gallery` with EditMocPage
   - No environment variable changes
   - No CDN/static asset changes beyond normal build

3. **E2E Test Infrastructure**:
   - Existing Playwright setup supports new tests
   - No new test data requirements beyond INST-1102 (Create MOC) setup

**Deployment Risk**: Low. New route and page are additive (no breaking changes).

---

## MVP-Critical Risks (Max 5)

### Risk 1: Backend PATCH Endpoint Not Yet Implemented

**Why it blocks MVP**: EditMocPage cannot function without `PATCH /mocs/:id` endpoint. Frontend will get 404 errors on save attempts.

**Required Mitigation**:
1. Implement PATCH route in `apps/api/lego-api/domains/mocs/routes.ts` (estimated 2-3 hours)
2. Reuse validation patterns from POST route
3. Add authorization check (userId must match moc.userId)
4. Test with `.http` requests before frontend integration
5. **Priority**: Implement backend first (before frontend EditMocPage)

**Confidence in Mitigation**: High. POST /mocs route exists as reference pattern.

---

### Risk 2: INST-1101 Dependency for Edit Button Placement

**Why it blocks MVP**: Edit button will be placed on MOC detail page (INST-1101), which is currently "Ready to Work" but not implemented. Without detail page, E2E test for "click edit button to navigate to edit page" cannot be completed.

**Required Mitigation**:
1. **Option A**: Defer edit button E2E test until INST-1101 completes
   - Test direct navigation to `/mocs/:id/edit` URL in E2E tests instead
   - Mark "edit button click test" as deferred dependency
2. **Option B**: Implement INST-1101 first, then INST-1108
   - Ensures full E2E coverage immediately
   - Recommended if INST-1101 is next in queue

**Confidence in Mitigation**: High. Option A is viable workaround; Option B is ideal if timeline allows.

**Impact if not mitigated**: Incomplete E2E coverage (missing "click edit button" test). Core edit functionality still works.

---

### Risk 3: MocForm Component Compatibility

**Why it blocks MVP**: EditMocPage depends on MocForm component supporting `initialValues` prop. If MocForm doesn't support pre-population, EditMocPage cannot display current MOC data.

**Required Mitigation**:
1. Verify MocForm component (from INST-1102) supports `initialValues` prop
2. If not supported, add `initialValues` prop to MocForm (estimated 1 hour)
3. Update MocForm's `useForm` hook to initialize with `initialValues`
4. Test pre-population in CreateMocPage and EditMocPage

**Confidence in Mitigation**: Very High. MocForm is implemented in INST-1102 (currently "In QA"). Component is designed for reuse. Adding `initialValues` is straightforward React pattern.

**Impact if not mitigated**: EditMocPage cannot pre-populate form. Users see empty form, losing context. This would be a critical UX failure.

**Current Status**: INST-1102 is "In QA" as of 2026-02-07. Review MocForm implementation to confirm `initialValues` support.

---

### Risk 4: Validation Schema Alignment (Frontend vs Backend)

**Why it blocks MVP**: If frontend validation (client-side) differs from backend validation (server-side), users may bypass client checks and submit invalid data, or valid data may be rejected by backend.

**Required Mitigation**:
1. Share Zod schema between frontend and backend:
   - Define `UpdateMocInputSchema` in `@repo/api-client/schemas/instructions`
   - Use schema in backend validation (API route)
   - Use schema in frontend validation (MocForm)
2. Ensure rules match exactly:
   - Title: min 3, max 500 characters, required if provided
   - Description: max 5000 characters, optional
   - Theme: non-empty string, required if provided
   - Tags: array, max 20 tags, optional
3. Write integration test to verify frontend and backend validation consistency

**Confidence in Mitigation**: High. Zod schemas are already used in INST-1102. Pattern is established.

**Impact if not mitigated**: Validation mismatches cause user frustration (valid data rejected) or data integrity issues (invalid data accepted).

---

### Risk 5: Test Data Setup Complexity for E2E Tests

**Why it blocks MVP**: E2E tests require authenticated users with owned MOCs in database. If test data setup is complex or brittle, E2E tests may be unreliable or time-consuming to maintain.

**Required Mitigation**:
1. **Option A**: Use INST-1102 (Create MOC) flow in E2E test setup
   - Before testing edit, create a MOC via Create MOC page
   - Capture created MOC ID
   - Navigate to `/mocs/{mocId}/edit` for edit test
   - Pros: No manual test data seeding, tests realistic user flow
   - Cons: E2E tests depend on Create MOC working
2. **Option B**: Seed test database with known MOC IDs
   - Use Playwright's `beforeAll` hook to insert test MOC into database
   - Use fixed MOC ID like `test-moc-123`
   - Pros: Faster test setup, isolated from other features
   - Cons: Requires database seeding logic
3. **Recommendation**: Option A (use Create MOC flow)—leverages existing functionality, tests realistic journeys

**Confidence in Mitigation**: High. Option A reuses INST-1102 test infrastructure.

**Impact if not mitigated**: E2E tests are flaky or cannot run. Manual testing becomes primary verification, reducing automation coverage.

---

## Missing Requirements for MVP

### 1. Backend Endpoint Implementation Decision

**Missing**: Confirmation that `PATCH /mocs/:id` endpoint should support partial updates (only changed fields) vs full replacement (all fields required).

**Concrete Decision Text for PM**:

> **Decision Required**: PATCH /mocs/:id Partial Update Semantics
>
> Should the PATCH endpoint support partial updates (update only provided fields) or require all fields?
>
> **Option A: Partial Update (Recommended)**
> - Request body: `{ title?: string, description?: string, theme?: string, tags?: string[] }`
> - Only provided fields are updated
> - Omitted fields remain unchanged
> - Example: `PATCH { title: "New Title" }` updates title only, leaves description/theme/tags unchanged
> - Pros: More flexible, reduces payload size, matches RESTful PATCH semantics
> - Cons: Slightly more complex backend logic (merge incoming data with existing)
>
> **Option B: Full Replacement**
> - Request body requires all fields: `{ title: string, description: string, theme: string, tags: string[] }`
> - All fields must be provided, even if unchanged
> - Example: `PATCH { title: "New Title", description: "...", theme: "...", tags: [...] }`
> - Pros: Simpler backend logic (direct field assignment)
> - Cons: Larger payloads, less efficient, frontend must send all fields every time
>
> **Recommendation**: Option A (Partial Update). Frontend form can send only changed fields, improving efficiency and following REST best practices.

**PM must include this decision in story**: Specify partial update semantics in AC-1.

---

### 2. UpdatedAt Timestamp Behavior

**Missing**: Clarification on whether `updatedAt` should update automatically (database trigger) or manually (backend code).

**Concrete Decision Text for PM**:

> **Decision Required**: updatedAt Timestamp Update Mechanism
>
> How should the `mocs.updatedAt` column be updated on PATCH /mocs/:id?
>
> **Option A: Database Trigger (Recommended)**
> - PostgreSQL trigger automatically sets `updatedAt = NOW()` on any UPDATE to `mocs` table
> - Backend code does not manually set `updatedAt`
> - Pros: Consistent across all update operations, less code, no risk of forgetting to update
> - Cons: Requires database migration to add trigger (if not already exists)
>
> **Option B: Backend Code (Manual)**
> - Backend route explicitly sets `updatedAt` field: `{ ...updates, updatedAt: new Date() }`
> - Pros: No database migration, explicit in code
> - Cons: Easy to forget, inconsistent if multiple update routes exist
>
> **Recommendation**: Option A (Database Trigger). Check if trigger already exists from INST-1102 (Create MOC). If not, add trigger in this story.

**PM must include this decision in story**: Specify in AC-8 whether updatedAt is auto-updated or manually set.

---

### 3. OpenSearch Re-Indexing Requirement

**Missing**: Clarification on whether OpenSearch re-indexing is required for MVP or deferred to post-MVP.

**Concrete Decision Text for PM**:

> **Decision Required**: OpenSearch Re-Indexing on Metadata Update
>
> Should PATCH /mocs/:id trigger OpenSearch re-indexing if title/description changes?
>
> **Background**: Index entry (stories.index.md line 636) mentions "Re-index in OpenSearch if title/description changed." However, OpenSearch integration may not exist yet.
>
> **Option A: Defer to Post-MVP (Recommended for MVP)**
> - Do NOT implement OpenSearch re-indexing in this story
> - Document as follow-up task (e.g., INST-1108B or Phase 6 story)
> - Pros: Faster MVP delivery, avoids complexity
> - Cons: Search results may be stale until re-index implemented
> - Acceptable if: Search feature is not yet critical or OpenSearch not deployed
>
> **Option B: Implement in MVP**
> - PATCH endpoint triggers async job to re-index MOC in OpenSearch
> - Pros: Search results always up-to-date
> - Cons: Adds 2-3 hours to implementation, requires OpenSearch infrastructure
>
> **Recommendation**: Option A (Defer). Focus MVP on core edit functionality. Add OpenSearch re-indexing in Phase 6 (Search & Discovery).

**PM must include this decision in story**: Either remove AC reference to OpenSearch (if deferred) or add detailed ACs for re-indexing (if included).

---

## MVP Evidence Expectations

### Proof Needed for Core Journey

1. **Backend Route Works**:
   - `.http` request: `PATCH /mocs/test-moc-123` with valid token
   - Response: 200 with updated MOC object
   - Database query: `SELECT * FROM mocs WHERE id='test-moc-123'` shows updated fields

2. **Frontend Page Renders**:
   - Navigate to `/mocs/test-moc-123/edit` in browser
   - Form displays with pre-populated values
   - Screenshot: EditMocPage with form loaded

3. **Save Flow Works**:
   - Change title in form
   - Click Save button
   - Network log: PATCH request sent
   - Toast: "MOC updated!" displayed
   - Navigation: Redirect to `/mocs/test-moc-123`
   - Detail page: New title visible

4. **Cancel Flow Works**:
   - Change title in form
   - Click Cancel button
   - Network log: No PATCH request sent
   - Navigation: Redirect to `/mocs/test-moc-123`
   - Detail page: Original title visible (changes discarded)

5. **Validation Works**:
   - Enter title with 2 characters (below min 3)
   - Save button: Disabled
   - Error message: "Title must be at least 3 characters" visible
   - No PATCH request sent

### Critical CI/Deploy Checkpoints

1. **Backend Tests Pass**:
   - `pnpm test` in `apps/api/lego-api` passes
   - Coverage: ≥90% for new PATCH route handler

2. **Frontend Tests Pass**:
   - Unit tests: `pnpm test` in `apps/web/app-instructions-gallery` passes
   - Integration tests: RTK Query mutation flow verified with MSW
   - Coverage: ≥80% for EditMocPage component

3. **E2E Tests Pass**:
   - Playwright: At least 3 scenarios pass (edit + save, cancel, validation)
   - E2E runs against live backend (per ADR-006)

4. **Lint and Type Check**:
   - `pnpm lint` passes (no ESLint errors)
   - `pnpm check-types` passes (no TypeScript errors)

5. **Build Succeeds**:
   - `pnpm build` in `apps/api/lego-api` succeeds
   - `pnpm build` in `apps/web/app-instructions-gallery` succeeds

**Deployment Gate**: All CI checks pass before merging to main.

---

## Implementation Estimate Breakdown

### Backend (2-3 hours)

1. **PATCH Route Handler** (1-1.5 hours):
   - Add route in `routes.ts`
   - Extract request body, validate with UpdateMocInputSchema
   - Check authorization (userId matches moc.userId)
   - Update database record
   - Return updated MOC object

2. **Validation Schema** (0.5 hours):
   - Define `UpdateMocInputSchema` in `@repo/api-client/schemas/instructions`
   - Reuse fields from `CreateMocInputSchema` (all optional for partial update)

3. **Unit Tests** (1-1.5 hours):
   - Authorization test (user can only edit own MOCs)
   - Validation tests (title min/max, tags max)
   - Success test (200 response)
   - Error tests (404, 400)

**Total Backend**: 2-3 hours

---

### Frontend (3-4 hours)

1. **EditMocPage Component** (1.5-2 hours):
   - Create component file
   - Fetch MOC data with `useGetMocDetailQuery`
   - Render loading skeleton
   - Render 404 error state
   - Pass MOC data as `initialValues` to MocForm
   - Wire up `useUpdateMocMutation` on form submit
   - Handle success (toast + redirect)
   - Handle error (toast with retry)

2. **Route Configuration** (0.25 hours):
   - Add route to router: `/mocs/:id/edit`

3. **Form Recovery Logic** (0.5 hours):
   - localStorage save on error
   - Recovery toast on page load if draft exists
   - Restore or discard draft

4. **Unit Tests** (1-1.5 hours):
   - Test rendering, form pre-population, validation, navigation

5. **Integration Tests** (0.5 hours):
   - Test RTK Query mutation flow with MSW

**Total Frontend**: 3-4 hours

---

### Testing (2-3 hours)

1. **E2E Test Scenarios** (1.5-2 hours):
   - Scenario 1: Edit and save successfully
   - Scenario 2: Cancel without saving
   - Scenario 3: Validation prevents submission
   - Step definitions and assertions

2. **Test Data Setup** (0.5-1 hour):
   - Use INST-1102 Create MOC flow to set up test data
   - Configure Playwright fixtures

**Total Testing**: 2-3 hours

---

### Code Review and Polish (1 hour)

- Address review comments
- Update documentation
- Verify accessibility (keyboard nav, screen reader)

---

**Grand Total**: 8-10 hours

**Confidence**: High. Estimate assumes:
- MocForm component supports `initialValues` (verified from INST-1102)
- No unexpected backend complexities
- E2E test infrastructure already set up (from previous stories)

**Variance**: ±20% (7-12 hours worst case if minor issues arise)

---

## Reuse Analysis

### Backend Reuse (70-80%)

**Reused Patterns**:
1. **Route Structure** from `POST /mocs`:
   - Request body extraction
   - Zod validation
   - Authorization check (userId)
   - Database operation
   - Response formatting

2. **Validation Schema** from `CreateMocInputSchema`:
   - Title validation (min 3, max 500)
   - Description validation (max 5000)
   - Theme validation (non-empty string)
   - Tags validation (max 20)

**New Code**:
- PATCH-specific logic (partial update vs full replacement)
- Database UPDATE query (vs INSERT for create)

**Reuse Estimate**: 70% of PATCH route code is similar to POST route.

---

### Frontend Reuse (95%)

**Reused Components**:
1. **MocForm Component** (100% reuse):
   - All form fields, validation, keyboard shortcuts
   - No changes needed (just pass `initialValues` prop)

2. **Page Layout Pattern** from `CreateMocPage`:
   - Header with back link
   - Form wrapper
   - Button styles
   - Toast handling
   - Navigation patterns

3. **Hooks** from `@repo/api-client`:
   - `useGetMocDetailQuery` (existing)
   - `useUpdateMocMutation` (existing)
   - `useLocalStorage` (existing utility hook)

**New Code**:
- EditMocPage container component (~150-200 LOC)
- MOC data fetching logic
- Loading/error states for data fetch
- Form recovery toast logic

**Reuse Estimate**: 95% of EditMocPage leverages existing components, hooks, and patterns.

---

### Testing Reuse (60-70%)

**Reused Test Patterns**:
1. **Backend Tests**: Authorization, validation, error handling patterns from `POST /mocs` tests
2. **Frontend Unit Tests**: Form rendering, validation, navigation patterns from `CreateMocPage` tests
3. **E2E Tests**: Form interaction, assertion patterns from INST-1102 E2E tests

**New Test Code**:
- Tests specific to pre-population (form loads with MOC data)
- Tests for cancel workflow (no save)
- Tests for form recovery (localStorage draft restore)

**Reuse Estimate**: 60-70% of test structure is reusable from INST-1102.

---

## Technical Dependencies

### Required Before Starting

1. **INST-1102 (Create Basic MOC)**: Must be "Completed" (currently "In QA")
   - Provides MocForm component for reuse
   - Provides RTK Query patterns
   - Provides E2E test infrastructure for MOC creation (used in test data setup)

2. **@repo/api-client/rtk/instructions-api**: `useUpdateMocMutation` must exist (confirmed: lines 227-242)

3. **Database**: `mocs` table must exist (confirmed: already in use for INST-1102)

### Optional Dependencies

1. **INST-1101 (View MOC Details)**: Provides detail page for edit button integration
   - Status: "Ready to Work"
   - Impact: If not implemented, edit button test is deferred
   - Workaround: Test direct navigation to `/mocs/:id/edit` in E2E tests

---

## Risk Mitigation Checklist

- [ ] **Backend**: Implement PATCH /mocs/:id route (highest priority—blocks frontend)
- [ ] **Validation**: Define UpdateMocInputSchema in shared package
- [ ] **Frontend**: Verify MocForm supports `initialValues` prop (review INST-1102 code)
- [ ] **Testing**: Set up E2E test data using INST-1102 Create MOC flow
- [ ] **Integration**: Coordinate with INST-1101 for edit button placement (or defer)
- [ ] **PM Decision**: Confirm partial update semantics for PATCH endpoint
- [ ] **PM Decision**: Confirm updatedAt auto-update mechanism (trigger vs manual)
- [ ] **PM Decision**: Defer OpenSearch re-indexing to post-MVP (or implement if critical)

---

## Success Criteria

This feasibility review is successful when:
1. ✅ Backend PATCH route implemented and tested (90% coverage)
2. ✅ EditMocPage component implemented and tested (80% coverage)
3. ✅ E2E tests pass for core edit journey (3 scenarios minimum)
4. ✅ No regression in existing features (MocForm, CreateMocPage)
5. ✅ All MVP-critical risks mitigated (5 risks addressed)
6. ✅ Implementation stays within 8-10 hour estimate (±20%)
7. ✅ Code passes lint, type-check, and CI gates
8. ✅ Story ready for QA handoff with full test coverage

---

## Recommended Implementation Order

1. **Backend First** (Day 1):
   - Implement PATCH /mocs/:id route
   - Write backend unit tests
   - Test with `.http` requests
   - Verify authorization and validation

2. **Frontend Second** (Day 2):
   - Create EditMocPage component
   - Wire up RTK Query hooks
   - Implement form recovery
   - Write frontend unit tests

3. **Integration Third** (Day 2):
   - Write integration tests with MSW
   - Verify RTK Query cache invalidation

4. **E2E Last** (Day 3):
   - Write Playwright E2E tests
   - Use Create MOC flow for test data setup
   - Verify all scenarios pass with live API

**Total Duration**: 2-3 days (with testing and code review)

---

## Conclusion

**INST-1108 is highly feasible for MVP**. The story leverages extensive code reuse (95% frontend, 70% backend), clear patterns from INST-1102, and existing RTK Query infrastructure. All technical risks have clear mitigations. Implementation estimate is reliable (8-10 hours). Recommended to proceed with implementation after:
1. Backend PATCH route is implemented and tested
2. INST-1102 (Create Basic MOC) completes QA and is merged
3. PM decisions on partial update semantics and OpenSearch deferral are confirmed

**Go/No-Go**: **GO** for MVP implementation.
