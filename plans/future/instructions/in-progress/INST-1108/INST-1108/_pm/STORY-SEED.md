---
generated: "2026-02-09"
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: true
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: INST-1108

## Reality Context

### Baseline Status
- Loaded: No
- Date: N/A
- Gaps: No baseline file found in the repository. Proceeding with codebase scanning only.

### Relevant Existing Features

| Feature | Status | Relevance |
|---------|--------|-----------|
| INST-1100: View MOC Gallery | Completed (2026-02-07) | Gallery navigation pattern established |
| INST-1101: View MOC Details | Ready to Work | **Blocks E2E testing** - detail page with edit button |
| INST-1102: Create Basic MOC | In QA (2026-02-07) | MocForm component exists, can be reused for edit |
| CreateMocPage | Implemented | Established form pattern with recovery, validation |
| MocForm Component | Implemented | Reusable form component with title, description, theme, tags |
| RTK Query Mutations | Implemented | `useUpdateMocMutation` available in instructions-api.ts |
| Backend PATCH Endpoint | **Missing** | No PATCH /mocs/:id route in routes.ts |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|--------------|
| INST-1101: View MOC Details | Ready to Work | **Dependency** - provides detail page where edit button lives |
| INST-1102: Create Basic MOC | In QA | None - form component is complete and reusable |

### Constraints to Respect

1. **ADR-001**: API paths must follow `/api/v2/mocs` (frontend) → `/mocs` (backend) pattern
2. **ADR-006**: E2E tests required during dev phase using live API (no MSW)
3. **Zod-first types**: All schemas must be Zod with inferred TypeScript types
4. **Component reuse**: MocForm component MUST be reused, not duplicated
5. **Blocker constraint**: INST-1101 must be completed for E2E testing (edit button location)

---

## Retrieved Context

### Related Endpoints

**Frontend (RTK Query)**
- `useUpdateMocMutation` - **EXISTS** in `packages/core/api-client/src/rtk/instructions-api.ts` (lines 227-242)
  - Endpoint: `PATCH /instructions/mocs/:id`
  - Input: `{ id: string; input: UpdateMocInput }`
  - Response: `MocInstructions`
  - Cache invalidation: `Moc` (by id), `MocList`

**Backend (API Routes)**
- `PATCH /mocs/:id` - **MISSING** (not in `apps/api/lego-api/domains/mocs/routes.ts`)
  - Routes file has: GET /mocs, POST /mocs, GET /mocs/:id, POST /mocs/:id/thumbnail
  - **Gap identified**: Update endpoint needs to be implemented

### Related Components

**Existing Components (Reuse)**
- `CreateMocPage` - `/apps/web/app-instructions-gallery/src/pages/CreateMocPage.tsx`
  - Pattern: Form recovery with localStorage, error handling with retry, navigation
  - **Reuse pattern**: Edit page should mirror create page structure

- `MocForm` - `/apps/web/app-instructions-gallery/src/components/MocForm/index.tsx`
  - Props: `initialValues`, `onSubmit`, `onCancel`, `isSubmitting`, `apiError`
  - Fields: title (min 3), description (optional), theme (required), tags (max 20)
  - Features: Auto-focus, validation, Cmd+Enter shortcut, field-level errors
  - **MUST REUSE**: Do not duplicate this component

**Missing Components**
- `EditMocPage` - New page at `/apps/web/app-instructions-gallery/src/pages/EditMocPage.tsx`
- Edit button integration in detail page (INST-1101)

### Reuse Candidates

**High Priority Reuse**
1. **MocForm component** (100% reuse)
   - Pass `initialValues` from `useGetMocDetailQuery`
   - Same validation schema (CreateMocInput matches UpdateMocInput fields)
   - Same submit handler pattern

2. **CreateMocPage patterns**
   - Form recovery with `useLocalStorage` hook
   - Error toast with retry button (`showErrorToastWithRetry`)
   - Navigation patterns (back to detail, escape key handler)
   - Loading state management

3. **RTK Query patterns**
   - `useUpdateMocMutation` hook (already exists)
   - Cache invalidation (already configured)
   - Optimistic updates (optional enhancement)

**Packages to Leverage**
- `@repo/app-component-library` - Button, Input, Textarea, Label, Select
- `@repo/api-client/rtk/instructions-api` - useUpdateMocMutation, useGetMocDetailQuery
- `@repo/api-client/schemas/instructions` - UpdateMocInput, MocInstructions schemas
- `@repo/logger` - Structured logging

---

## Knowledge Context

### Lessons Learned

**Note**: Knowledge Base tools unavailable during seed generation. Lessons deferred to later phases.

### Blockers to Avoid (from past stories)

1. **API path mismatch** (ADR-001)
   - Frontend expects: `/api/v2/mocs/:id`
   - Backend provides: `/mocs/:id`
   - Vite proxy must rewrite paths correctly

2. **Backend route not implemented**
   - **Current gap**: PATCH /mocs/:id route missing from backend
   - Must implement before frontend work to enable E2E tests (ADR-006)

3. **Schema validation mismatch**
   - Frontend UpdateMocInput must match backend validation schema
   - Use Zod schemas for both sides

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-001 | API Path Schema | Frontend: `/api/v2/mocs`, Backend: `/mocs` |
| ADR-005 | Testing Strategy | UAT must use real services, not mocks |
| ADR-006 | E2E Tests Required in Dev Phase | At least one happy-path E2E test during dev |

### Patterns to Follow

1. **Form component reuse**: Use MocForm with initialValues, not duplicate code
2. **Error handling with retry**: Toast with retry button pattern from CreateMocPage
3. **Form recovery**: localStorage backup for session persistence
4. **Navigation guards**: Warn on unsaved changes (will be added in INST-1200)
5. **Optimistic updates**: RTK Query cache update before API response (optional)

### Patterns to Avoid

1. **Duplicating MocForm**: Do not create a new form component, reuse existing
2. **Skipping backend implementation**: Backend route must exist before E2E tests
3. **Hardcoded navigation**: Use relative paths, not absolute URLs where possible
4. **Ignoring validation**: Match backend validation rules exactly

---

## Conflict Analysis

### Conflict: Dependency Blocker
- **Severity**: Warning (non-blocking for story creation)
- **Description**: INST-1101 (View MOC Details) is in "Ready to Work" status but not yet implemented. Edit button will be placed on the detail page, which doesn't exist yet. E2E tests cannot be completed without the detail page.
- **Resolution Hint**:
  - Create EditMocPage and edit route independently
  - E2E test for "Edit button on detail page" will be deferred until INST-1101 completes
  - Alternative: Create standalone E2E test navigating directly to `/mocs/:id/edit` URL
  - Track dependency in story metadata: `blocked_by: INST-1101`

---

## Story Seed

### Title
Edit MOC Metadata

### Description

**Context**: Users need to update their MOC's metadata (title, description, theme, tags) after initial creation. The MocForm component exists and is reusable. The `useUpdateMocMutation` RTK Query hook is already implemented and wired for cache invalidation.

**Problem**: There is no edit page or edit functionality. The backend PATCH /mocs/:id endpoint is also missing.

**Solution**:
1. **Backend**: Implement PATCH /mocs/:id route with validation and authorization
2. **Frontend**: Create EditMocPage that reuses MocForm component with pre-populated values
3. **Integration**: Wire edit button on detail page (INST-1101 dependency)
4. **Testing**: Unit tests for edit page, integration tests for mutation, E2E tests for full flow

### Initial Acceptance Criteria

**Backend (API)**
- [ ] AC-1: PATCH /mocs/:id endpoint exists and accepts { title?, description?, theme?, tags? }
- [ ] AC-2: Endpoint validates userId matches MOC owner (authorization)
- [ ] AC-3: Endpoint validates request body with UpdateMocInputSchema (Zod)
- [ ] AC-4: Title validation: min 3 chars, max 500 chars, required if provided
- [ ] AC-5: Description validation: max 5000 chars, optional
- [ ] AC-6: Theme validation: non-empty string, required if provided
- [ ] AC-7: Tags validation: array, max 20 tags, optional
- [ ] AC-8: Update mocs.updatedAt timestamp on successful update
- [ ] AC-9: Return 200 with updated MOC data on success
- [ ] AC-10: Return 400 with validation errors on invalid input
- [ ] AC-11: Return 404 if MOC not found or user unauthorized
- [ ] AC-12: Return 500 on database errors

**Frontend (EditMocPage)**
- [ ] AC-13: EditMocPage component exists at `/mocs/:id/edit` route
- [ ] AC-14: Page fetches MOC data using `useGetMocDetailQuery(mocId)`
- [ ] AC-15: Page shows loading skeleton while fetching MOC data
- [ ] AC-16: Page shows 404 error if MOC not found
- [ ] AC-17: MocForm component is reused (not duplicated) with initialValues from fetched MOC
- [ ] AC-18: Form fields pre-populate with current MOC values (title, description, theme, tags)
- [ ] AC-19: Save button triggers `useUpdateMocMutation` with changed fields
- [ ] AC-20: Cancel button navigates back to detail page (/mocs/:id)
- [ ] AC-21: Success shows toast "MOC updated!" and navigates to detail page
- [ ] AC-22: Error shows toast with retry button (pattern from CreateMocPage)
- [ ] AC-23: Form recovery: Save draft to localStorage on error, restore on return
- [ ] AC-24: Validation matches create page rules (client-side)
- [ ] AC-25: Submit button disabled while submitting or form invalid
- [ ] AC-26: Escape key cancels and returns to detail page
- [ ] AC-27: Cmd/Ctrl+Enter submits form (reused from MocForm)

**Integration (Detail Page)**
- [ ] AC-28: Edit button appears on MOC detail page (INST-1101 integration point)
- [ ] AC-29: Edit button navigates to `/mocs/:id/edit`
- [ ] AC-30: Edit button hidden if user is not MOC owner

**RTK Query Integration**
- [ ] AC-31: `useUpdateMocMutation` called with `{ id: mocId, input: { ...changes } }`
- [ ] AC-32: Cache invalidated for `Moc` tag (by id) on successful update
- [ ] AC-33: Cache invalidated for `MocList` tag on successful update
- [ ] AC-34: Optimistic update applied (optional enhancement)

**Testing**
- [ ] AC-35: Unit test: EditMocPage renders with pre-populated form
- [ ] AC-36: Unit test: Form validation enforced (title min 3 chars)
- [ ] AC-37: Unit test: Save button disabled when form invalid
- [ ] AC-38: Unit test: Cancel navigates back to detail page
- [ ] AC-39: Integration test: PATCH /mocs/:id called with correct body
- [ ] AC-40: Integration test: Success updates cache and redirects
- [ ] AC-41: Integration test: Error displays toast with retry
- [ ] AC-42: E2E test: Navigate to edit page, change title, save, verify detail page shows new title
- [ ] AC-43: E2E test: Cancel returns to detail page without saving
- [ ] AC-44: E2E test: Validation error prevents submission

### Non-Goals

- **Navigation guards for unsaved changes**: Deferred to INST-1200 (Unsaved Changes Guard)
- **Optimistic UI updates**: Optional, not required for MVP
- **Edit history/audit trail**: Not part of this story
- **Bulk edit multiple MOCs**: Single MOC edit only
- **Edit files/thumbnails**: File management is separate stories (INST-1103, 1104, 1110)
- **Edit slug**: Slug is auto-generated, not editable
- **Edit visibility/status**: Only metadata fields (title, description, theme, tags)

### Reuse Plan

**Components**
- `MocForm` (100% reuse) - Pass initialValues from fetched MOC
- `Button`, `Input`, `Textarea`, `Label`, `Select` from `@repo/app-component-library`
- `showSuccessToast`, `showErrorToastWithRetry` pattern from CreateMocPage
- `useLocalStorage` hook for form recovery

**Patterns**
- Page structure from CreateMocPage (header, back link, form wrapper)
- Error handling with retry from CreateMocPage
- Navigation patterns (escape key, back button, post-submit redirect)
- Validation schema (CreateMocInput ≈ UpdateMocInput fields)

**Packages**
- `@repo/api-client/rtk/instructions-api` - useUpdateMocMutation, useGetMocDetailQuery
- `@repo/api-client/schemas/instructions` - UpdateMocInput schema
- `@repo/logger` - Structured logging

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

1. **Backend tests priority**:
   - Authorization test (user can only edit own MOCs)
   - Validation tests (title min 3, max 500; tags max 20)
   - Partial update tests (only title changed, only tags changed, etc.)
   - Error cases (404 not found, 400 validation)

2. **Frontend tests priority**:
   - Pre-population test (form loads with current values)
   - Form validation test (matches create page rules)
   - Cancel workflow test (no save, navigate back)
   - Error recovery test (localStorage recovery on retry)

3. **E2E tests priority**:
   - Happy path: Edit title, save, verify on detail page
   - Cancel path: Make changes, cancel, verify not saved
   - Validation path: Invalid input prevented

4. **Coverage targets**:
   - Backend route: 90% (standard for API routes)
   - EditMocPage component: 80% (UI component standard)
   - Integration: 80% (RTK Query mutation flow)

### For UI/UX Advisor

1. **Design consistency**:
   - Match CreateMocPage layout and styling
   - Reuse MocForm component exactly as-is for consistency
   - Use same button styles and spacing

2. **User experience**:
   - Clear "Editing: [MOC Title]" header
   - Pre-populated form gives immediate context
   - Cancel vs Save buttons clearly distinguished
   - Success/error feedback via toasts

3. **Accessibility**:
   - Same ARIA labels as create form (reused component)
   - Keyboard navigation (Tab, Escape, Cmd+Enter)
   - Focus management on page load

4. **Edge cases**:
   - Loading state while fetching MOC data
   - 404 state if MOC not found or unauthorized
   - Form recovery toast if localStorage has saved draft

### For Dev Feasibility

1. **Backend implementation**:
   - Estimate: 2-3 hours
   - Reuse patterns from POST /mocs route
   - Add validation for partial updates (UpdateMocInputSchema)
   - Ensure userId authorization check

2. **Frontend implementation**:
   - Estimate: 3-4 hours
   - Reuse MocForm (95% code reuse)
   - Add MOC data fetching logic
   - Wire up update mutation
   - Handle navigation and error states

3. **Integration risks**:
   - **High risk**: PATCH endpoint missing (backend gap)
   - **Medium risk**: INST-1101 dependency for edit button placement
   - **Low risk**: MocForm reuse (component is stable)

4. **E2E testing**:
   - **Blocker**: Cannot test "Edit button on detail page" until INST-1101 complete
   - **Workaround**: Test direct navigation to `/mocs/:id/edit` URL
   - **Estimate**: 2-3 hours for E2E tests

5. **Total estimate**: 8-10 hours (2-3 backend + 3-4 frontend + 2-3 testing)
