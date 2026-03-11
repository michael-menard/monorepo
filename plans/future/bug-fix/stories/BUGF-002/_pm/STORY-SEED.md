---
generated: "2026-02-11"
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: true
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: BUGF-002

## Reality Context

### Baseline Status
- Loaded: no
- Date: N/A
- Gaps: No baseline reality file exists for this epic. Proceeding with codebase analysis only.

### Relevant Existing Features

| Feature | Location | Status | Notes |
|---------|----------|--------|-------|
| RTK Query Instructions API | `packages/core/api-client/src/rtk/instructions-api.ts` | Complete | All mutations defined including `useUpdateMocMutation` |
| Backend Update Endpoint | `apps/api/lego-api/domains/instructions/routes.ts` | Complete | `PATCH /mocs/:id` endpoint implemented (line 125) |
| Instructions Edit Pages | `apps/web/*/src/pages/*edit-page.tsx` | Stubbed | Both main-app and app-instructions-gallery have edit pages with TODO comments |
| MocForm Component | `apps/web/app-instructions-gallery/src/components/MocForm/index.tsx` | Complete | Reusable form for MOC creation with validation |
| Update Schema | `packages/core/api-client/src/schemas/instructions/api.ts` | Complete | `UpdateMocInputSchema` defined (line 248) |
| Endpoint Configuration | `packages/core/api-client/src/config/endpoints.ts` | Complete | UPDATE endpoint path defined as `/instructions/mocs/{id}` |

### Active In-Progress Work

No active in-progress work detected that would conflict with this story.

### Constraints to Respect

1. **Zod-First Types**: All form validation must use Zod schemas, not TypeScript interfaces (per CLAUDE.md)
2. **API Path Schema (ADR-001)**: Frontend uses `/api/v2/...` paths, backend uses `/instructions/...` paths
3. **Testing Strategy (ADR-005)**: UAT must use real services, not MSW mocks
4. **E2E Tests Required (ADR-006)**: At least one happy-path E2E test must be implemented during dev phase
5. **Logger Usage**: Must use `@repo/logger`, never `console.log`
6. **Component Architecture**: UI components must be imported from `@repo/app-component-library`

---

## Retrieved Context

### Related Endpoints

Backend (Hono):
- `PATCH /mocs/:id` - Update MOC instruction (line 125 in `apps/api/lego-api/domains/instructions/routes.ts`)
  - Uses `UpdateMocInputSchema` for validation
  - Returns updated MOC or error responses (404, 403, 409, 500)
  - Invalidates cache on success

Frontend (RTK Query):
- `MOC.UPDATE: '/instructions/mocs/{id}'` - Defined in endpoint config
- `useUpdateMocMutation` hook - Exported from `instructions-api.ts` (line 442)
  - Method: PATCH
  - Invalidates `Moc` and `MocList` tags on success
  - Returns validated `MocInstructions` response

### Related Components

**Edit Pages (Both Need Integration):**
1. `apps/web/app-instructions-gallery/src/pages/edit-page.tsx`
   - Line 124: `// TODO: Implement save via RTK Query mutation`
   - Has form structure with react-hook-form + Zod validation
   - Uses `MocEditFormSchema` (simplified schema for edit)

2. `apps/web/main-app/src/routes/pages/InstructionsEditPage.tsx`
   - Line 124: `// TODO: Implement save via RTK Query mutation`
   - Identical structure to app-instructions-gallery edit page
   - Both pages need the same mutation integration

**Reusable Components:**
- `MocForm` (`apps/web/app-instructions-gallery/src/components/MocForm/index.tsx`)
  - Already implements create flow with `useCreateMocMutation`
  - Could be adapted for edit mode or used as pattern reference

**Related Modules:**
- `InstructionsEditModule` (`apps/web/main-app/src/routes/modules/InstructionsEditModule.tsx`)
  - Lazy loads InstructionsEditPage
  - Uses `useGetMocDetailQuery` to fetch MOC data
  - Already has query integration, just needs mutation

### Reuse Candidates

**Schemas:**
- `UpdateMocInputSchema` - Already defined and validated in backend
- `MocInstructionsSchema` - Response type for successful updates
- `MocEditFormSchema` - Form validation schema (in edit pages)

**Hooks:**
- `useUpdateMocMutation` - Already exported and ready to use
- Pattern from `CreateMocPage.tsx` (lines 157-195) - Shows proper async mutation handling with error recovery

**Patterns:**
- Error handling with toast notifications (from CreateMocPage)
- Form recovery using localStorage (from CreateMocPage, lines 95-115)
- Optimistic UI with loading states (from CreateMocPage)
- Navigation after successful save (from edit pages, lines 130-134)

---

## Knowledge Context

### Lessons Learned

No lesson-learned documents found for this epic.

### Blockers to Avoid (from past stories)

No past blockers documented. Key risks to watch:
- API path mismatches (ADR-001)
- Form validation schema misalignment with backend
- Cache invalidation edge cases
- Missing error states

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-001 | API Path Schema | Frontend: `/api/v2/instructions/mocs/{id}`, Backend: `/mocs/{id}` via proxy |
| ADR-005 | Testing Strategy | UAT must use real services, not mocks |
| ADR-006 | E2E Tests Required in Dev Phase | At least one happy-path E2E test per story |

### Patterns to Follow

1. **RTK Query Mutation Pattern:**
   ```typescript
   const [updateMoc, { isLoading }] = useUpdateMocMutation()

   const handleSave = async (data: MocEditFormInput) => {
     try {
       await updateMoc({ id: moc.id, input: data }).unwrap()
       // Success handling
     } catch (error) {
       // Error handling
     }
   }
   ```

2. **Form Data Transformation:**
   - Tags: Convert comma-separated string to array (`tags.split(',').map(t => t.trim())`)
   - Optionals: Use `|| undefined` for optional fields
   - Nullables: Backend accepts nullable for clearing values

3. **Error Handling:**
   - Show toast notifications for API errors
   - Preserve form state for retry
   - Navigate only on success

4. **Zod Validation:**
   - Use `zodResolver` from `@hookform/resolvers/zod`
   - Validate on blur for live feedback (`mode: 'onBlur'`)
   - Match backend constraints in frontend schema

### Patterns to Avoid

1. Don't use TypeScript interfaces - use Zod schemas
2. Don't use `console.log` - use `@repo/logger`
3. Don't navigate before async mutation completes
4. Don't skip cache invalidation tags
5. Don't ignore 409 conflict errors (duplicate title)

---

## Conflict Analysis

No conflicts detected.

---

## Story Seed

### Title

Implement Edit Save Functionality for Instructions

### Description

**Context:**
The Instructions Gallery has edit pages in both `main-app` and `app-instructions-gallery` that allow users to modify MOC metadata (title, description, theme, tags). These pages are currently stubbed with TODO comments indicating that the RTK Query mutation integration is incomplete. The backend API endpoint (`PATCH /mocs/:id`) and RTK Query mutation (`useUpdateMocMutation`) are both fully implemented and ready for integration.

**Problem:**
Users cannot save edits to their MOC instructions. The edit pages display the form and allow editing, but clicking "Save Changes" does not persist the changes to the backend. The TODO comments at line 124 in both edit pages indicate this is a known gap:
```typescript
// TODO: Implement save via RTK Query mutation
// await updateMoc({ id: moc.id, data }).unwrap()
```

**Solution:**
Wire the `useUpdateMocMutation` hook into both edit pages (`InstructionsEditPage.tsx` in main-app and `edit-page.tsx` in app-instructions-gallery) to enable saving of MOC metadata edits. The implementation will:
1. Import and use the existing `useUpdateMocMutation` hook
2. Transform form data to match the `UpdateMocInput` schema
3. Handle success cases with navigation and toast notifications
4. Handle error cases (404, 403, 409, 500) with appropriate user feedback
5. Preserve form state for retry on failure
6. Follow the established pattern from `CreateMocPage.tsx`

### Initial Acceptance Criteria

- [ ] AC-1: User can save edits to MOC title, description, theme, and tags in app-instructions-gallery edit page
- [ ] AC-2: User can save edits to MOC title, description, theme, and tags in main-app edit page
- [ ] AC-3: Form data is validated using Zod schema before submission
- [ ] AC-4: Success: User sees success toast and is navigated to MOC detail page
- [ ] AC-5: Error 409 (duplicate title): User sees error message with suggestion to use different title
- [ ] AC-6: Error 403 (not owner): User sees appropriate error message
- [ ] AC-7: Error 404 (MOC not found): User sees appropriate error message
- [ ] AC-8: Error 500: User sees generic error message with retry option
- [ ] AC-9: Form state is preserved on error for easy retry
- [ ] AC-10: "Save Changes" button is disabled when form is pristine (no changes)
- [ ] AC-11: "Save Changes" button shows loading state during API call
- [ ] AC-12: Cache is invalidated on successful save (MOC list and detail views refresh)

### Non-Goals

- Editing files (instruction PDFs, thumbnails, parts lists) - files are read-only in edit page
- Implementing edit for Sets Gallery - this story focuses on Instructions Gallery only
- Creating new edit pages - both edit pages already exist
- Changing the backend API contract - backend endpoint is complete and correct
- Adding new form fields - scope limited to existing fields (title, description, theme, tags)

### Reuse Plan

**Components:**
- `useUpdateMocMutation` - RTK Query hook from `@repo/api-client`
- `MocEditFormSchema` - Zod validation schema (already in edit pages)
- UI components from `@repo/app-component-library` (Button, Input, Alert, etc.)
- `LoadingPage` component for loading states
- Toast notifications (pattern from CreateMocPage)

**Patterns:**
- Async mutation handling from `CreateMocPage.tsx` (lines 157-195)
- Form recovery pattern from `CreateMocPage.tsx` (lines 95-115)
- Error toast with retry button from `CreateMocPage.tsx` (lines 27-80)
- Navigation after success from existing edit pages (lines 130-134)

**Packages:**
- `@hookform/resolvers/zod` - Form validation integration
- `react-hook-form` - Form state management (already imported)
- `@repo/logger` - Structured logging
- `zod` - Schema validation (already imported)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

**Unit Tests:**
- Test form submission with valid data
- Test form validation with invalid data
- Test error handling for each error type (404, 403, 409, 500)
- Test form state preservation on error
- Test button disabled states (pristine form, loading)
- Test data transformation (tags string to array)

**Integration Tests:**
- Test RTK Query mutation with MSW handlers
- Test cache invalidation after successful update
- Test navigation after successful save

**E2E Tests (Required per ADR-006):**
- Happy path: Edit MOC title and save successfully
- Error path: Attempt to save duplicate title (409 conflict)
- Must use live API (no MSW mocking per ADR-005)
- Record results in EVIDENCE.yaml

**Edge Cases:**
- Empty optional fields (description, tags) should send `undefined`
- Null values for clearing fields
- Very long strings at max length boundaries
- Special characters in title and tags
- Concurrent edits from different sessions

### For UI/UX Advisor

**User Flows:**
1. Navigate to edit page from detail view
2. Edit form fields
3. Click "Save Changes"
4. See loading state
5. On success: See toast and navigate to detail page
6. On error: See error message with context-specific guidance

**Accessibility:**
- Error messages must be announced to screen readers
- Save button must show loading state visually and to assistive tech
- Form validation errors must be associated with inputs via aria-describedby
- Success toast must be announced with aria-live

**Error Messaging:**
- 404: "MOC not found. It may have been deleted."
- 403: "You don't have permission to edit this MOC."
- 409: "A MOC with this title already exists. Please choose a different title."
- 500: "Failed to save changes. Please try again."

**Loading States:**
- Button: "Saving..." with spinner icon
- Disable all form inputs during save
- Prevent double-submission with button disabled state

### For Dev Feasibility

**Implementation Approach:**
1. Import `useUpdateMocMutation` at top of each edit page
2. Add mutation call to existing `handleSave` function
3. Transform `MocEditFormInput` to `UpdateMocInput`:
   - Convert tags string to array: `tags?.split(',').map(t => t.trim()).filter(Boolean)`
   - Pass optional fields as `undefined` if empty
4. Add error handling with specific error type detection
5. Add success handling with toast and navigation
6. Test with real backend endpoint

**Technical Risks:**
- **Low Risk:** RTK Query mutation and backend endpoint already tested and working
- **Low Risk:** Form structure already complete
- **Medium Risk:** Data transformation (tags string to array) needs careful testing
- **Low Risk:** Error handling patterns well-established from CreateMocPage

**Time Estimate:**
- Implementation: 2-3 hours (straightforward mutation integration)
- Testing: 2-3 hours (unit + integration + E2E)
- Total: 4-6 hours

**Dependencies:**
- Backend API must be running for E2E tests
- Both apps use same pattern, so implementation can be duplicated after first is complete

**Blocked By:**
None - all dependencies are complete

