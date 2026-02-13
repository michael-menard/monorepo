---
id: BUGF-002
title: "Implement Edit Save Functionality for Instructions"
status: uat
priority: P2
experiment_variant: control
story_type: bug
epic: bug-fix
points: 3
touches_frontend: true
touches_backend: false
touches_database: false
touches_infra: false
created: 2026-02-11
---

# BUGF-002: Implement Edit Save Functionality for Instructions

## Context

The Instructions Gallery has edit pages in both `main-app` and `app-instructions-gallery` that allow users to modify MOC metadata (title, description, theme, tags). These pages are currently stubbed with TODO comments at line 124 indicating that the RTK Query mutation integration is incomplete.

**Current State:**
- Backend API endpoint `PATCH /mocs/:id` is fully implemented (line 125 in `apps/api/lego-api/domains/instructions/routes.ts`)
- RTK Query mutation `useUpdateMocMutation` is exported and ready to use (line 442 in `packages/core/api-client/src/rtk/instructions-api.ts`)
- Both edit pages have complete form structure with react-hook-form + Zod validation
- Edit pages display the form and allow editing, but clicking "Save Changes" does not persist changes

**Problem:**
Users cannot save edits to their MOC instructions. The TODO comments indicate:
```typescript
// TODO: Implement save via RTK Query mutation
// await updateMoc({ id: moc.id, data }).unwrap()
```

**Root Cause:**
The mutation integration was intentionally left incomplete during initial development. The infrastructure (API, schemas, hooks) is all in place, but the final wiring in the edit page handlers is missing.

## Goal

Wire the `useUpdateMocMutation` hook into both edit pages to enable saving of MOC metadata edits, following the established pattern from `CreateMocPage.tsx`.

## Non-Goals

- Editing files (instruction PDFs, thumbnails, parts lists) - files are read-only in edit page
- Implementing edit for Sets Gallery - this story focuses on Instructions Gallery only
- Creating new edit pages - both edit pages already exist
- Changing the backend API contract - backend endpoint is complete and correct
- Adding new form fields - scope limited to existing fields (title, description, theme, tags)

## Scope

### Frontend Changes

**Files to Modify:**
1. `apps/web/app-instructions-gallery/src/pages/edit-page.tsx` (line 124)
2. `apps/web/main-app/src/routes/pages/InstructionsEditPage.tsx` (line 124)

**Implementation:**
- Import and use `useUpdateMocMutation` hook
- Transform form data from `MocEditFormInput` to `UpdateMocInput` schema
- Handle success cases with navigation and toast notifications
- Handle error cases (404, 403, 409, 500) with appropriate user feedback
- Preserve form state for retry on failure

### Backend

No backend changes required. Existing endpoint:
- `PATCH /mocs/:id` - Update MOC instruction (apps/api/lego-api/domains/instructions/routes.ts:125)

### Packages

Using existing packages:
- `@repo/api-client` - RTK Query hooks
- `@repo/app-component-library` - UI components
- `@repo/logger` - Structured logging
- `@hookform/resolvers/zod` - Form validation
- `react-hook-form` - Form state management
- `zod` - Schema validation

## Acceptance Criteria

- [ ] **AC-1**: User can save edits to MOC title, description, theme, and tags in app-instructions-gallery edit page
  - **Verify**: Edit a field, click "Save Changes", verify API call succeeds, user navigated to detail page

- [ ] **AC-2**: User can save edits to MOC title, description, theme, and tags in main-app edit page
  - **Verify**: Same as AC-1 but in main-app

- [ ] **AC-3**: Form data is validated using Zod schema before submission
  - **Verify**: Submit invalid data (empty title), verify validation error shown before API call

- [ ] **AC-4**: Success: User sees success toast and is navigated to MOC detail page
  - **Verify**: Successful save shows "Changes saved successfully" toast and navigates to `/instructions/{id}`

- [ ] **AC-5**: Error 409 (duplicate title): User sees error message with suggestion to use different title
  - **Verify**: Mock 409 response, verify error toast shows "A MOC with this title already exists. Please choose a different title."

- [ ] **AC-6**: Error 403 (not owner): User sees appropriate error message
  - **Verify**: Mock 403 response, verify error toast shows "You don't have permission to edit this MOC."

- [ ] **AC-7**: Error 404 (MOC not found): User sees appropriate error message
  - **Verify**: Mock 404 response, verify error toast shows "MOC not found. It may have been deleted."

- [ ] **AC-8**: Error 500: User sees generic error message with retry option
  - **Verify**: Mock 500 response, verify error toast shows "Failed to save changes. Please try again."

- [ ] **AC-9**: Form state is preserved on error for easy retry
  - **Verify**: Trigger error, verify form fields still contain user's edits

- [ ] **AC-10**: "Save Changes" button is disabled when form is pristine (no changes)
  - **Verify**: Load edit page, verify button disabled until user makes a change

- [ ] **AC-11**: "Save Changes" button shows loading state during API call
  - **Verify**: Click save, verify button shows "Saving..." with spinner during API call

- [ ] **AC-12**: Cache is invalidated on successful save (MOC list and detail views refresh)
  - **Verify**: Save changes, verify `Moc` and `MocList` tags invalidated, detail page shows updated data

## Reuse Plan

### Components
- `useUpdateMocMutation` - RTK Query hook from `@repo/api-client` (already exported)
- `MocEditFormSchema` - Zod validation schema (already in edit pages)
- UI components from `@repo/app-component-library` (Button, Input, Alert, etc.)
- `LoadingPage` component for loading states
- Toast notifications (pattern from CreateMocPage)

### Patterns
- **Async mutation handling** from `CreateMocPage.tsx` (lines 157-195)
  - Use try/catch with `.unwrap()`
  - Show loading state during mutation
  - Navigate on success
  - Show error toast on failure

- **Form recovery pattern** from `CreateMocPage.tsx` (lines 95-115)
  - Preserve form state in component state
  - Don't clear form on error

- **Error toast with retry** from `CreateMocPage.tsx` (lines 27-80)
  - Detect error type (404, 403, 409, 500)
  - Show context-specific error message
  - Keep form open for retry

- **Navigation after success** from existing edit pages (lines 130-134)
  - Use `navigate('/instructions/' + moc.id)`

### Data Transformation Pattern

```typescript
// Form data to API input transformation
const formDataToUpdateInput = (data: MocEditFormInput): UpdateMocInput => ({
  title: data.title,
  description: data.description || undefined,
  theme: data.theme || undefined,
  tags: data.tags ? data.tags.split(',').map(t => t.trim()).filter(Boolean) : undefined,
})
```

## Architecture Notes

### RTK Query Mutation Pattern

```typescript
const [updateMoc, { isLoading }] = useUpdateMocMutation()

const handleSave = async (data: MocEditFormInput) => {
  try {
    const input = formDataToUpdateInput(data)
    await updateMoc({ id: moc.id, input }).unwrap()

    // Success: Show toast and navigate
    toast.success('Changes saved successfully')
    navigate(`/instructions/${moc.id}`)
  } catch (error) {
    // Error: Show context-specific message
    const message = getErrorMessage(error)
    toast.error(message)
    logger.error('Failed to save MOC edits', { error, mocId: moc.id })
  }
}
```

### Error Handling Strategy

Detect error types using RTK Query error structure:
- `error.status === 404` → "MOC not found. It may have been deleted."
- `error.status === 403` → "You don't have permission to edit this MOC."
- `error.status === 409` → "A MOC with this title already exists. Please choose a different title."
- `error.status === 500` or unknown → "Failed to save changes. Please try again."

### Cache Invalidation

RTK Query automatically invalidates tags on successful mutation:
- `Moc` tag → Detail page refreshes
- `MocList` tag → List page refreshes

No manual cache invalidation needed (already configured in `instructions-api.ts`).

### Form State Management

- Use `react-hook-form`'s `formState.isDirty` to disable "Save Changes" button when form is pristine
- Use mutation's `isLoading` to show loading state on button
- Preserve form state on error (don't reset form)

## Infrastructure Notes

### API Path Schema (ADR-001)

Frontend uses proxy path: `/api/v2/instructions/mocs/{id}`
Backend path: `/mocs/{id}`

No changes needed - already configured in endpoint config.

### Schemas

All schemas already defined:
- `UpdateMocInputSchema` - Backend validation (packages/core/api-client/src/schemas/instructions/api.ts:248)
- `MocInstructionsSchema` - Response type
- `MocEditFormSchema` - Frontend form validation (already in edit pages)

## Test Plan

### Unit Tests

**Form Submission (edit-page.test.tsx)**
- Test: Submit valid form data
  - Verify: `updateMoc` called with correct arguments
  - Verify: Navigation called on success
  - Verify: Success toast shown

- Test: Submit with invalid data (empty title)
  - Verify: Validation error shown
  - Verify: `updateMoc` not called

- Test: Form pristine state disables save button
  - Verify: Button disabled when `formState.isDirty === false`

- Test: Loading state during submission
  - Verify: Button shows "Saving..." when `isLoading === true`
  - Verify: Form inputs disabled during loading

**Data Transformation**
- Test: Tags string converted to array
  - Input: `"tag1, tag2, tag3"`
  - Expected: `["tag1", "tag2", "tag3"]`

- Test: Empty optional fields send undefined
  - Input: `{ description: "" }`
  - Expected: `{ description: undefined }`

**Error Handling**
- Test: 404 error shows correct message
  - Mock: API returns 404
  - Verify: Error toast shows "MOC not found. It may have been deleted."
  - Verify: Form state preserved

- Test: 403 error shows correct message
  - Mock: API returns 403
  - Verify: Error toast shows "You don't have permission to edit this MOC."

- Test: 409 error shows correct message
  - Mock: API returns 409
  - Verify: Error toast shows "A MOC with this title already exists. Please choose a different title."

- Test: 500 error shows generic message
  - Mock: API returns 500
  - Verify: Error toast shows "Failed to save changes. Please try again."

- Test: Form state preserved on error
  - Mock: API returns error
  - Verify: Form fields still contain user's edited values

### Integration Tests

**RTK Query Integration (edit-page.integration.test.tsx)**
- Test: Successful update invalidates cache
  - Setup: MSW handler for `PATCH /mocs/:id` returns success
  - Verify: `Moc` and `MocList` tags invalidated
  - Verify: Cache refetch triggered

- Test: Mutation with network error
  - Setup: MSW handler throws network error
  - Verify: Error toast shown
  - Verify: Form state preserved

### E2E Tests (Required per ADR-006)

**Happy Path (instructions-edit.e2e.test.ts)**
- Test: Edit MOC title and save successfully
  - Navigate to edit page for existing MOC
  - Change title field
  - Click "Save Changes"
  - Verify: Success toast appears
  - Verify: Navigated to detail page with updated title
  - **Must use live API** (no MSW mocking per ADR-005)

**Error Path**
- Test: Attempt to save duplicate title
  - Navigate to edit page
  - Change title to match existing MOC title
  - Click "Save Changes"
  - Verify: 409 error toast shown
  - Verify: Form state preserved for retry

### Edge Cases

- Very long strings at max length boundaries (255 chars for title)
- Special characters in title and tags (`&`, `<`, `>`, quotes)
- Empty string vs null vs undefined for optional fields
- Concurrent edits from different sessions (last write wins)
- Navigation away during mutation (abort signal)

## UI/UX Notes

### User Flows

1. Navigate to edit page from detail view (click "Edit" button)
2. Edit form fields (title, description, theme, tags)
3. Click "Save Changes"
4. See loading state on button ("Saving..." with spinner)
5. On success: See success toast and navigate to detail page
6. On error: See error message with context-specific guidance

### Accessibility

**ARIA Labels:**
- Save button: `aria-label="Save changes to MOC"`
- Loading state: `aria-busy="true"` during mutation

**Error Announcements:**
- Error messages announced to screen readers via `aria-live="polite"` region
- Form validation errors associated with inputs via `aria-describedby`

**Success Toast:**
- Success message announced with `aria-live="polite"`

**Keyboard Support:**
- Save button keyboard accessible (already implemented)
- Form inputs support standard keyboard navigation
- Error focus management (focus first invalid input on validation error)

### Error Messaging

**404 Not Found:**
```
MOC not found. It may have been deleted.
```

**403 Forbidden:**
```
You don't have permission to edit this MOC.
```

**409 Conflict:**
```
A MOC with this title already exists. Please choose a different title.
```

**500 Server Error:**
```
Failed to save changes. Please try again.
```

### Loading States

**Button Loading State:**
- Text: "Saving..."
- Icon: Spinner animation
- Disabled: true

**Form Inputs:**
- Disabled during save to prevent editing mid-mutation

**Prevent Double-Submission:**
- Button disabled while `isLoading === true`

### Button State Logic

```typescript
const saveButtonDisabled = !formState.isDirty || isLoading
```

- Pristine form (no changes): Disabled
- Loading: Disabled
- Has changes and not loading: Enabled

## Reality Baseline

### Existing Features

| Feature | Location | Status | Notes |
|---------|----------|--------|-------|
| RTK Query Instructions API | `packages/core/api-client/src/rtk/instructions-api.ts` | Complete | All mutations defined including `useUpdateMocMutation` |
| Backend Update Endpoint | `apps/api/lego-api/domains/instructions/routes.ts` | Complete | `PATCH /mocs/:id` endpoint implemented (line 125) |
| Instructions Edit Pages | `apps/web/*/src/pages/*edit-page.tsx` | Stubbed | Both main-app and app-instructions-gallery have edit pages with TODO comments |
| MocForm Component | `apps/web/app-instructions-gallery/src/components/MocForm/index.tsx` | Complete | Reusable form for MOC creation with validation |
| Update Schema | `packages/core/api-client/src/schemas/instructions/api.ts` | Complete | `UpdateMocInputSchema` defined (line 248) |
| Endpoint Configuration | `packages/core/api-client/src/config/endpoints.ts` | Complete | UPDATE endpoint path defined as `/instructions/mocs/{id}` |

### Constraints

1. **Zod-First Types (CLAUDE.md)**: All form validation must use Zod schemas, not TypeScript interfaces
2. **API Path Schema (ADR-001)**: Frontend uses `/api/v2/...` paths, backend uses `/instructions/...` paths
3. **Testing Strategy (ADR-005)**: UAT must use real services, not MSW mocks
4. **E2E Tests Required (ADR-006)**: At least one happy-path E2E test must be implemented during dev phase
5. **Logger Usage**: Must use `@repo/logger`, never `console.log`
6. **Component Architecture**: UI components must be imported from `@repo/app-component-library`

### Protected Features

None - this story does not touch any protected features.

### Active In-Progress Work

No active in-progress work detected that would conflict with this story.

---

**Generated**: 2026-02-11
**Experiment Variant**: control
**Story Points**: 3 (Medium complexity - 12 ACs, straightforward mutation integration)

---

## QA Discovery Notes (Auto-Generated)

_Added by Autonomous Elaboration on 2026-02-11_

### MVP Gaps Resolved

None - no MVP-critical gaps identified. Story is complete and ready for implementation.

### Non-Blocking Items (Logged to KB)

| # | Finding | Category | Notes |
|---|---------|----------|-------|
| 1 | Concurrent Edits Detection | edge-case | 'Last write wins' scenario - rare in practice, deferred to Phase 2 |
| 2 | Navigation Abort Signal | edge-case | Feature works without abort signal, prevents console errors only |
| 3 | Edit Page Test Coverage | test-gap | No existing tests - can ship with manual testing, automate post-launch |
| 4 | Form Crash Recovery | enhancement | localStorage pattern not needed for MVP - basic error preservation (AC-9) sufficient |
| 5 | Unsaved Changes Warning | ux-polish | beforeunload prompt - low effort, medium impact, good Phase 1.5 enhancement |
| 6 | Auto-save Drafts | ux-polish | Requires backend versioning support - high effort, defer to Phase 2 |
| 7 | Change Preview/Diff | ux-polish | Nice-to-have for power users - low effort, defer to Phase 2 |
| 8 | Optimistic Updates | performance | Not needed for MVP (save is fast) - defer to Phase 2 |
| 9 | Save Analytics | observability | Post-launch feature for user behavior tracking - low effort, defer to Phase 2 |
| 10 | Keyboard Shortcuts (Ctrl+S) | a11y-enhancement | Small UX improvement - low effort, good follow-up |
| 11 | Edit History / Audit Log | integration | Requires backend changes - medium impact, high effort, good Phase 2 feature |

### Summary

- **ACs added**: 0 (all 12 ACs verified as complete)
- **KB entries created**: 0 (findings documented for manual KB entry)
- **Mode**: autonomous
- **Verdict**: PASS - No blocking issues. Story ready to proceed directly to ready-to-work status.

**Post-MVP Recommendations (Priority Order)**:
1. **HIGH**: Unsaved changes warning (Enhancement #5) - quick UX win
2. **MEDIUM**: Concurrent edit detection (Gap #1) - prevents data loss
3. **MEDIUM**: Test coverage for edit pages (Gap #3) - follow existing patterns
4. **LOW**: Auto-save drafts (Enhancement #2) - requires backend work
5. **LOW**: Edit history (Enhancement #11) - large feature, good Phase 2 candidate
