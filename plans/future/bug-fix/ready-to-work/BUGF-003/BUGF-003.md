---
id: BUGF-003
title: "Implement Delete API and Edit Page for Sets Gallery"
status: ready-to-work
priority: P1
phase: 1
story_type: bug
experiment_variant: control
epic: bug-fix
points: 5
surfaces:
  - frontend
  - api-client
dependencies: []
blocked_by: []
touches_backend: false
touches_frontend: true
touches_database: false
touches_infra: false
created: "2026-02-11"
updated: "2026-02-11"
elab_verdict: PASS
elab_date: "2026-02-11"
---

# BUGF-003: Implement Delete API and Edit Page for Sets Gallery

## Context

The Sets Gallery has a complete "add set" flow with backend APIs for PATCH and DELETE operations deployed. However, the frontend lacks the RTK Query mutations for delete and update, and there is no edit page to allow users to modify existing sets. Delete buttons in both the main gallery and detail pages are stubbed with placeholder handlers that don't call the API.

**Reality Baseline:**
- Backend DELETE endpoint: `apps/api/lego-api/domains/sets/routes.ts` (lines 132-144) - deployed and functional
- Backend PATCH endpoint: `apps/api/lego-api/domains/sets/routes.ts` (lines 108-127) - deployed and functional (not PUT)
- Frontend GET queries: `useGetSetsQuery`, `useGetSetByIdQuery` exist in `packages/core/api-client/src/rtk/sets-api.ts`
- Frontend POST mutation: `useAddSetMutation` exists with cache invalidation
- Zod schemas: `UpdateSetSchema`, `UpdateSetInput` already defined in `packages/core/api-client/src/schemas/sets.ts` (lines 88-90)
- Delete stubs: Both `main-page.tsx` (lines 123-129) and `set-detail-page.tsx` (lines 213-223) have confirmation dialogs wired but no API calls
- Edit navigation: Detail page edit button (lines 208-211) navigates to `/sets/:id/edit` but page doesn't exist
- No edit route: `Module.tsx` routing does not include edit route

## Problem

Users cannot delete sets they've added to their collection, and they cannot edit set metadata after creation. This creates a poor user experience where mistakes are permanent and unwanted sets cannot be removed.

**User Impact:**
- Typo in set name or number? Cannot fix it
- Set added by mistake? Cannot remove it
- Changed theme or status? Cannot update it
- Database slowly fills with test/erroneous data

## Goal

Enable users to:
1. Delete sets from their collection with proper confirmation flow
2. Edit set metadata (name, number, theme, status, tags, purchase info) via dedicated edit page
3. See immediate UI feedback via optimistic updates and toast notifications

**Success Metrics:**
- Delete flow: User clicks delete → confirms → set removed from list and detail views within 500ms
- Edit flow: User clicks edit → form loads with current data → saves changes → redirected to detail page with updated data
- Both flows show appropriate loading states and error messages

## Non-Goals

- Image editing/reordering within edit page (images can be deleted via existing delete image API but not reordered)
- Undo functionality for delete operation (future enhancement, not MVP)
- Bulk delete operations (single delete only)
- Validation of duplicate set numbers (backend concern)
- E2E tests (per BUGF stories index, test coverage is Phase 3 - deferred to BUGF-014)
- Converting existing wishlist item to set (separate feature)
- Edit page image upload flow differs from add page - keep separate for now
- Real-time conflict detection if set is edited by another session
- Audit log of changes to set metadata

**Protected Features (from seed):**
- Existing image delete functionality (working correctly)
- Existing add set flow (don't break it)
- Backend API contracts (already deployed and stable)

## Scope

### Packages Modified

| Package | Files Modified | Purpose |
|---------|---------------|---------|
| `@repo/api-client` | `src/rtk/sets-api.ts` | Add `useDeleteSetMutation`, `useUpdateSetMutation` |
| `app-sets-gallery` | `src/pages/edit-set-page.tsx` | Create new edit page (NEW FILE) |
| `app-sets-gallery` | `src/pages/main-page.tsx` | Wire delete handler to mutation |
| `app-sets-gallery` | `src/pages/set-detail-page.tsx` | Wire delete handler to mutation |
| `app-sets-gallery` | `src/Module.tsx` | Add `/sets/:id/edit` route |

### API Endpoints Used

| Endpoint | Method | Purpose | Backend Status |
|----------|--------|---------|----------------|
| `/api/v2/sets/:id` | DELETE | Delete a set | Deployed (proxied from `/sets/:id`) |
| `/api/v2/sets/:id` | PATCH | Update set metadata | Deployed (proxied from `/sets/:id`) |
| `/api/v2/sets/:id` | GET | Load set data for edit form | Deployed (proxied from `/sets/:id`) |

**Note:** Backend uses PATCH not PUT. Frontend mutation must use PATCH method per backend implementation.

### Dependencies

**Internal:**
- `@repo/app-component-library` - Form primitives (Button, Card, Input, Textarea, Select, etc.)
- `@repo/upload` - `uploadToPresignedUrl` helper for new images in edit flow
- `@repo/api-client/schemas/sets` - `UpdateSetSchema`, `UpdateSetInput`, `CreateSetInput`
- `@repo/logger` - Structured logging instead of console

**External:**
- RTK Query (already in use)
- React Router (already in use)
- Zod (already in use)

## Acceptance Criteria

### API Client (packages/core/api-client/src/rtk/sets-api.ts)

- [ ] **AC-1**: `useDeleteSetMutation` hook exists and sends DELETE request to `/api/v2/sets/:id`
- [ ] **AC-2**: Delete mutation invalidates 'Set' and 'SetList' cache tags on success
- [ ] **AC-3**: Delete mutation uses optimistic update pattern to remove item from list immediately
- [ ] **AC-4**: `useUpdateSetMutation` hook exists and sends PATCH request to `/api/v2/sets/:id`
- [ ] **AC-5**: Update mutation accepts `UpdateSetInput` partial object as input
- [ ] **AC-6**: Update mutation invalidates 'Set' cache tag for the updated item
- [ ] **AC-7**: Both mutations handle 404 (set not found) and 403 (unauthorized) errors gracefully
- [ ] **AC-8**: Both mutations return typed error responses using RTK Query error handling

### Edit Page (apps/web/app-sets-gallery/src/pages/edit-set-page.tsx)

- [ ] **AC-9**: Edit page component exists and renders form pre-filled with existing set data
- [ ] **AC-10**: Page uses `useGetSetByIdQuery` with `skip: !setId` pattern to load data
- [ ] **AC-11**: Loading skeleton displays while fetching set data (reuse pattern from detail page)
- [ ] **AC-12**: Form reuses `TagInput` component from add-set-page
- [ ] **AC-13**: Form reuses `ImageUploadZone` component from add-set-page
- [ ] **AC-14**: Form follows 3-card layout pattern (Set Information, Purchase Information, Images)
- [ ] **AC-15**: Form validates input with `UpdateSetSchema` before submission
- [ ] **AC-16**: Form shows loading state during mutation (disabled inputs, spinner on save button)
- [ ] **AC-17**: Form shows success toast and navigates to detail page after successful update
- [ ] **AC-18**: Success toast includes set title for context (e.g., "Medieval Castle updated")
- [ ] **AC-19**: Form shows error toast with specific error message on mutation failure
- [ ] **AC-20**: Back/Cancel button navigates to set detail page without saving
- [ ] **AC-21**: "Unsaved changes" warning displays if user navigates away with unsaved changes

### Routing (apps/web/app-sets-gallery/src/Module.tsx)

- [ ] **AC-22**: Route exists for `/sets/:id/edit` path that renders `EditSetPage`
- [ ] **AC-23**: Route is properly typed with route params

### Main Page Delete Integration (apps/web/app-sets-gallery/src/pages/main-page.tsx)

- [ ] **AC-24**: Delete confirmation dialog `handleConfirmDelete` calls `useDeleteSetMutation`
- [ ] **AC-25**: Successful delete shows success toast with set title
- [ ] **AC-26**: Failed delete shows error toast with error message
- [ ] **AC-27**: Delete button shows loading state during mutation
- [ ] **AC-28**: List view updates immediately after delete (optimistic update or cache invalidation)
- [ ] **AC-29**: Confirmation dialog includes set name/number for clarity

### Detail Page Integration (apps/web/app-sets-gallery/src/pages/set-detail-page.tsx)

- [ ] **AC-30**: Delete button handler calls `useDeleteSetMutation`
- [ ] **AC-31**: Successful delete navigates to main gallery page with success toast
- [ ] **AC-32**: Failed delete shows error toast and remains on detail page
- [ ] **AC-33**: Delete button shows loading state during mutation
- [ ] **AC-34**: Edit button navigation to `/sets/:id/edit` continues to work (verify no regression)

### Exports (packages/core/api-client/src/rtk/sets-api.ts)

- [ ] **AC-35**: `useDeleteSetMutation` is exported from sets-api
- [ ] **AC-36**: `useUpdateSetMutation` is exported from sets-api

### Code Quality

- [ ] **AC-37**: All types use Zod schemas with `z.infer<>` (no TypeScript interfaces)
- [ ] **AC-38**: All logging uses `@repo/logger` instead of console
- [ ] **AC-39**: No barrel files created (direct imports only)
- [ ] **AC-40**: Component follows functional component with function declaration pattern
- [ ] **AC-41**: Named exports used throughout

## Reuse Plan

### Components to Reuse

1. **TagInput** (`apps/web/app-sets-gallery/src/components/TagInput.tsx`)
   - Already used in add-set-page (lines 271-278)
   - Handles tag creation, deletion, validation

2. **ImageUploadZone** (`apps/web/app-sets-gallery/src/components/ImageUploadZone.tsx`)
   - Already used in add-set-page (lines 347-352)
   - Handles drag-and-drop, file validation, preview generation

3. **Form Layout Pattern** (from `apps/web/app-sets-gallery/src/pages/add-set-page.tsx`)
   - Three card structure: Set Information, Purchase Information, Images
   - Glassmorphism styling with backdrop blur
   - Responsive grid layout

4. **Loading Skeleton** (from `apps/web/app-sets-gallery/src/pages/set-detail-page.tsx`)
   - Card-based skeleton for loading states
   - Consistent with detail page loading experience

### Patterns to Follow

1. **Cache Invalidation** (from `addSet` mutation, lines 91-97)
   ```typescript
   invalidatesTags: (result, error, arg) =>
     error ? [] : [{ type: 'Set', id: result.id }, { type: 'SetList' }]
   ```

2. **Optimistic Update** (from `deleteSetImage`, lines 162-176)
   ```typescript
   onQueryStarted: async (arg, { dispatch, queryFulfilled }) => {
     const patchResult = dispatch(
       setsApi.util.updateQueryData('getSetById', arg.setId, (draft) => {
         // Optimistically update cache
       })
     )
     try {
       await queryFulfilled
     } catch {
       patchResult.undo()
     }
   }
   ```

3. **Form Validation** (from `add-set-page.tsx`, line 99)
   ```typescript
   const candidate = CreateSetSchema.parse({
     // Form data
   })
   ```

4. **Toast Notifications** (from `add-set-page.tsx`, lines 126, 130)
   ```typescript
   toast.success(`Set "${result.name}" created successfully`)
   toast.error(`Failed to create set: ${error.message}`)
   ```

5. **Navigation** (from detail page, lines 208-211)
   ```typescript
   const handleEdit = () => navigate(`/sets/${setId}/edit`)
   ```

### Packages to Leverage

- **@repo/app-component-library**: All UI primitives (Button, Card, Input, Textarea, Select, Dialog, Toast)
- **@repo/upload**: `uploadToPresignedUrl` for new images in edit flow
- **@repo/api-client/schemas/sets**: `UpdateSetSchema`, `UpdateSetInput`, `CreateSetInput`
- **@repo/api-client/rtk/sets-api**: Extend with `deleteSet` and `updateSet` mutations
- **@repo/logger**: Use instead of console.log for any logging

## Architecture Notes

### RTK Query Mutation Design

**Delete Mutation:**
```typescript
deleteSet: builder.mutation<void, string>({
  query: (id) => ({
    url: `/sets/${id}`,
    method: 'DELETE',
  }),
  invalidatesTags: (result, error, id) =>
    error ? [] : [{ type: 'Set', id }, { type: 'SetList' }],
  onQueryStarted: async (id, { dispatch, queryFulfilled }) => {
    // Optimistic update to remove from list
    const patchResults = dispatch(
      setsApi.util.updateQueryData('getSets', undefined, (draft) => {
        const index = draft.findIndex(set => set.id === id)
        if (index !== -1) draft.splice(index, 1)
      })
    )
    try {
      await queryFulfilled
    } catch {
      patchResults.undo()
    }
  },
})
```

**Update Mutation:**
```typescript
updateSet: builder.mutation<Set, { id: string; updates: UpdateSetInput }>({
  query: ({ id, updates }) => ({
    url: `/sets/${id}`,
    method: 'PATCH', // IMPORTANT: Backend uses PATCH, not PUT
    body: updates,
  }),
  invalidatesTags: (result, error, { id }) =>
    error ? [] : [{ type: 'Set', id }],
})
```

### Edit Page Data Flow

1. **Load Phase**: Component mounts → extract `id` from route params → `useGetSetByIdQuery(id)` → show skeleton or form
2. **Edit Phase**: User modifies fields → local state updates → validation on blur/submit
3. **Save Phase**: Form submit → validate with `UpdateSetSchema` → call `useUpdateSetMutation` → show loading state
4. **Success**: Mutation succeeds → cache invalidated → toast shown → navigate to detail page
5. **Error**: Mutation fails → undo optimistic update → show error toast → remain on page

### Form Pre-filling Strategy

```typescript
const { data: set, isLoading } = useGetSetByIdQuery(setId, { skip: !setId })

// Initialize form with existing data
const [formData, setFormData] = useState<UpdateSetInput>({})

useEffect(() => {
  if (set) {
    setFormData({
      name: set.name,
      setNumber: set.setNumber,
      theme: set.theme,
      status: set.status,
      tags: set.tags,
      // ... other fields
    })
  }
}, [set])
```

### Unsaved Changes Detection

```typescript
const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

useEffect(() => {
  const isModified = JSON.stringify(formData) !== JSON.stringify(initialData)
  setHasUnsavedChanges(isModified)
}, [formData, initialData])

// Prompt before navigation
useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (hasUnsavedChanges) {
      e.preventDefault()
      e.returnValue = ''
    }
  }
  window.addEventListener('beforeunload', handleBeforeUnload)
  return () => window.removeEventListener('beforeunload', handleBeforeUnload)
}, [hasUnsavedChanges])
```

## Infrastructure Notes

**No infrastructure changes required.**

Backend APIs and database tables already deployed. This is purely frontend integration work.

## HTTP Contract Plan

### DELETE /api/v2/sets/:id

**Request:**
```http
DELETE /api/v2/sets/123e4567-e89b-12d3-a456-426614174000
Authorization: Bearer {token}
```

**Success Response (204 No Content):**
```http
HTTP/1.1 204 No Content
```

**Error Responses:**
- `404 Not Found`: Set doesn't exist
- `403 Forbidden`: User doesn't own the set
- `500 Internal Server Error`: Database error

### PATCH /api/v2/sets/:id

**Request:**
```http
PATCH /api/v2/sets/123e4567-e89b-12d3-a456-426614174000
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Updated Set Name",
  "theme": "Castle",
  "status": "built",
  "tags": ["medieval", "knights"]
}
```

**Success Response (200 OK):**
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "name": "Updated Set Name",
  "setNumber": "10305",
  "theme": "Castle",
  "status": "built",
  "tags": ["medieval", "knights"],
  "pieceCount": 4500,
  "minifigCount": 22,
  "purchaseDate": "2024-01-15",
  "purchasePrice": 399.99,
  "createdAt": "2024-01-10T10:00:00Z",
  "updatedAt": "2026-02-11T14:30:00Z"
}
```

**Error Responses:**
- `400 Bad Request`: Invalid input (Zod validation failed)
- `404 Not Found`: Set doesn't exist
- `403 Forbidden`: User doesn't own the set
- `500 Internal Server Error`: Database error

**Validation Rules (UpdateSetSchema):**
- All fields optional (partial update)
- `name`: min 1 char if provided
- `setNumber`: string if provided
- `theme`: must be valid theme from enum if provided
- `status`: must be 'wishlist' | 'ordered' | 'built' | 'displayed' if provided
- `tags`: array of strings if provided

## Test Plan

### Unit Tests (Required - 45% Coverage Minimum)

**Location:** `packages/core/api-client/src/rtk/__tests__/sets-api.test.ts`

**Tests for Delete Mutation:**
1. Sends DELETE request to correct endpoint
2. Invalidates 'Set' and 'SetList' cache tags on success
3. Optimistically removes item from list cache
4. Undoes optimistic update on error
5. Handles 404 error (set not found)
6. Handles 403 error (unauthorized)
7. Handles network error gracefully

**Tests for Update Mutation:**
1. Sends PATCH request (not PUT) to correct endpoint
2. Includes partial updates in request body
3. Invalidates 'Set' cache tag for updated item
4. Returns updated set data on success
5. Handles validation errors (400)
6. Handles 404 error (set not found)
7. Handles 403 error (unauthorized)

**Location:** `apps/web/app-sets-gallery/src/pages/__tests__/edit-set-page.test.tsx`

**Tests for Edit Page:**
1. Shows loading skeleton while fetching set data
2. Pre-fills form with existing set data
3. Validates form with UpdateSetSchema before submission
4. Calls useUpdateSetMutation on form submit
5. Shows loading state during mutation (disabled inputs)
6. Shows success toast with set title on successful update
7. Navigates to detail page after successful update
8. Shows error toast on mutation failure
9. Remains on page after error
10. Back button navigates to detail page without saving
11. Shows unsaved changes warning on navigation attempt
12. Handles set not found (404) gracefully

**Location:** `apps/web/app-sets-gallery/src/pages/__tests__/main-page.test.tsx`

**Tests for Main Page Delete Integration:**
1. Confirmation dialog includes set name/number
2. Calls useDeleteSetMutation on confirm
3. Shows success toast with set title
4. Shows error toast on failure
5. Shows loading state during mutation
6. List updates immediately (optimistic)

**Location:** `apps/web/app-sets-gallery/src/pages/__tests__/set-detail-page.test.tsx`

**Tests for Detail Page Delete Integration:**
1. Calls useDeleteSetMutation on delete click
2. Navigates to main page on success
3. Shows success toast on successful delete
4. Remains on page on error
5. Shows error toast on failure

### Integration Tests

**Cache Invalidation Behavior:**
1. Delete mutation invalidates both list and detail caches
2. Update mutation invalidates detail cache
3. List view refetches after delete
4. Detail view refetches after update

### MSW Mocking Strategy

**Setup:** `apps/web/app-sets-gallery/src/test/setup.ts`

Mock handlers for:
- `DELETE /api/v2/sets/:id` → 204 success or error responses
- `PATCH /api/v2/sets/:id` → 200 with updated set data or error responses
- `GET /api/v2/sets/:id` → 200 with set data for edit page loading

**Test Scenarios:**
- Happy path (204/200 responses)
- 404 errors (set not found)
- 403 errors (unauthorized)
- 400 errors (validation failed)
- Network errors (fetch fails)

### E2E Tests (Deferred to BUGF-014)

E2E tests for delete and edit flows will be implemented in BUGF-014 as part of comprehensive test coverage for Sets Gallery components.

**Deferred E2E Scenarios:**
- Full delete flow from main page (click → confirm → verify removal)
- Full delete flow from detail page (click → confirm → navigate → verify)
- Full edit flow (navigate → edit form → save → verify changes in detail page)
- Edit flow with validation errors
- Unsaved changes warning on navigation

## UI/UX Notes

### Design System Adherence

**Theme:** LEGO-inspired Sky/Teal color palette
**Styling:** Glassmorphism with backdrop blur (consistent with main-page.tsx)
**Accessibility:** WCAG 2.1 AA compliance required

### Edit Page UX Requirements

1. **Loading State:**
   - Show card-based skeleton while fetching set data
   - Match skeleton structure to form layout (3 cards)
   - Skeleton duration: typically <500ms on good connection

2. **Form Layout:**
   - **Card 1 - Set Information**: Name, Set Number, Theme, Status, Tags
   - **Card 2 - Purchase Information**: Purchase Date, Price, Piece Count, Minifig Count
   - **Card 3 - Images**: Existing images with delete buttons + ImageUploadZone for new images
   - Each card has glassmorphism backdrop with blur effect
   - Responsive: stack vertically on mobile, 2-column on desktop

3. **Form Pre-filling:**
   - All fields populated with existing data on load
   - Tags rendered as chips with delete buttons
   - Status shows current value in select dropdown
   - Images show thumbnails with existing delete functionality

4. **Input Validation:**
   - Inline validation on blur (not on every keystroke)
   - Error messages below fields in red
   - Schema validation with Zod before submission
   - Disable submit button if form invalid

5. **Loading State (during save):**
   - Disable all inputs during mutation
   - Save button shows spinner + "Saving..." text
   - Prevent navigation during save

6. **Success Feedback:**
   - Green toast notification: "Medieval Castle updated successfully"
   - Auto-navigate to detail page after 500ms delay
   - Toast remains visible for 3 seconds

7. **Error Feedback:**
   - Red toast notification: "Failed to update set: {error message}"
   - Remain on edit page to allow retry
   - Toast auto-dismisses after 5 seconds

8. **Unsaved Changes Warning:**
   - Browser native "You have unsaved changes" prompt
   - Trigger on Back button click if form dirty
   - Also trigger on browser navigation (beforeunload event)

9. **Back/Cancel Button:**
   - Navigate to detail page: `/sets/:id`
   - Show unsaved changes warning if form dirty

### Delete Flow UX Requirements

1. **Confirmation Dialog (already exists):**
   - Title: "Delete Set?"
   - Message: "Are you sure you want to delete {setName} (#{setNumber})? This action cannot be undone."
   - Actions: "Cancel" (secondary), "Delete" (destructive/red)

2. **Loading State:**
   - Delete button shows spinner during mutation
   - Dialog remains open during deletion
   - Prevent closing dialog during mutation

3. **Success Feedback:**
   - Green toast: "{setName} deleted successfully"
   - From main page: list updates immediately (optimistic)
   - From detail page: navigate to main page after 300ms delay

4. **Error Feedback:**
   - Red toast: "Failed to delete set: {error message}"
   - Dialog closes
   - User remains on current page

### Accessibility Requirements

1. **Keyboard Navigation:**
   - All form inputs reachable via Tab
   - Enter key submits form
   - Escape key closes unsaved changes dialog
   - Delete confirmation dialog keyboard navigable

2. **Screen Reader Support:**
   - Form labels associated with inputs via `htmlFor`
   - Error messages announced via `aria-describedby`
   - Loading states announced via `aria-live="polite"`
   - Success/error toasts announced

3. **Focus Management:**
   - Focus first input on page load (set name)
   - Focus error field on validation failure
   - Return focus to trigger button on dialog close

4. **ARIA Labels:**
   - Delete button: `aria-label="Delete {setName}"`
   - Edit button: `aria-label="Edit {setName}"`
   - Loading state: `aria-busy="true"`

### Visual Consistency

- Use same glassmorphism card style as add-set-page
- Match button styling (primary for save, secondary for cancel, destructive for delete)
- Consistent spacing and typography
- Same toast notification style as existing pages

## Reality Baseline

### Existing Features to Preserve

| Feature | Location | Status | Notes |
|---------|----------|--------|-------|
| Get Sets Query | `packages/core/api-client/src/rtk/sets-api.ts` | Working | Don't break cache tags |
| Get Set By ID Query | `packages/core/api-client/src/rtk/sets-api.ts` | Working | Use for edit page data loading |
| Add Set Mutation | `packages/core/api-client/src/rtk/sets-api.ts` | Working | Don't break cache invalidation |
| Delete Set Image | `packages/core/api-client/src/rtk/sets-api.ts` | Working | Keep optimistic update pattern |
| Add Set Page | `apps/web/app-sets-gallery/src/pages/add-set-page.tsx` | Working | Reuse form structure |
| Set Detail Page | `apps/web/app-sets-gallery/src/pages/set-detail-page.tsx` | Working | Wire delete handler |
| Main Page | `apps/web/app-sets-gallery/src/pages/main-page.tsx` | Working | Wire delete handler |
| TagInput Component | `apps/web/app-sets-gallery/src/components/TagInput.tsx` | Working | Reuse in edit page |
| ImageUploadZone | `apps/web/app-sets-gallery/src/components/ImageUploadZone.tsx` | Working | Reuse in edit page |

### Constraints from Reality

1. **Backend API Contract:**
   - DELETE endpoint returns 204 No Content (not 200)
   - PATCH endpoint (not PUT) for updates
   - Both endpoints require authentication
   - Both enforce ownership (user can only delete/edit their own sets)

2. **Frontend Routing:**
   - Edit navigation already wired: `/sets/:id/edit`
   - Must add route to Module.tsx to match

3. **Cache Tag Structure:**
   - `{ type: 'Set', id: string }` for individual sets
   - `{ type: 'SetList' }` for list queries
   - Delete must invalidate both
   - Update must invalidate specific Set tag

4. **Form Validation:**
   - Use Zod schemas (UpdateSetSchema exists)
   - No TypeScript interfaces allowed
   - Validation happens before API call

5. **Code Style:**
   - Functional components with function declarations
   - Named exports only
   - No barrel files
   - Use @repo/logger instead of console

### Active Work to Coordinate With

**None identified.** No baseline reality file available to detect conflicts.

### Known Blockers

**None.** All dependencies deployed and stable.

### Changed Constraints Since Planning

1. **API Method**: Index entry says "PUT /api/sets/:id" but backend actually uses PATCH. Frontend must use PATCH.
2. **No baseline reality**: Story seed generated without active baseline, so no conflict detection possible.

---

## Risk Assessment

### Split Risk

**Probability:** Low
**Rationale:** Story scope is well-defined with 40 ACs. Delete mutation, update mutation, and edit page are logically separable but sized appropriately for single story.

**If split needed:**
- Story A: Delete functionality only (mutations + main/detail page wiring)
- Story B: Edit page + update mutation

### Review Cycles

**Predicted:** 1-2 cycles
**Rationale:**
- Well-defined scope with existing patterns to follow
- Reuse of existing components reduces unknowns
- Backend APIs stable (no contract changes needed)
- Primary risk: form validation edge cases and unsaved changes UX

### Token Estimate

**Planning Phase:** ~25k tokens (seed generation, worker coordination, story synthesis)
**Implementation Phase:** ~60k tokens (mutations, edit page, testing, integration)
**Total Estimated:** ~85k tokens

### Implementation Complexity

**Delete Mutation:** Low (follow deleteSetImage pattern)
**Update Mutation:** Low (similar to addSet pattern)
**Edit Page:** Medium (form pre-filling, validation, unsaved changes detection)
**Route Wiring:** Low
**Overall:** Medium complexity

---

## Dependencies

**Depends On:** None
**Blocked By:** None
**Blocks:** None

---

## Related Stories

- **BUGF-001**: Implement Presigned URL API (image upload pattern reusable)
- **BUGF-014**: Add Test Coverage for Sets Gallery Components (E2E tests deferred here)
- **BUGF-017**: Convert TypeScript Interfaces to Zod Schemas (this story already uses Zod)

---

## Estimated Effort

**Story Points:** 5
**Developer Hours:** 4-6 hours breakdown:
- Delete mutation: 1h (implementation + tests)
- Update mutation: 1h (implementation + tests)
- Edit page: 3h (component + form logic + unsaved changes + tests)
- Integration/wiring: 1h (main/detail page handlers + routing)

**QA Hours:** 2-3 hours (manual testing of all flows + edge cases)

---

## Seed Requirements

Not applicable. This is a frontend bug fix story, not a feature requiring seed data.

---

## Implementation Notes

### File Creation Checklist

- [ ] Create `apps/web/app-sets-gallery/src/pages/edit-set-page.tsx`
- [ ] Create `apps/web/app-sets-gallery/src/pages/__tests__/edit-set-page.test.tsx`
- [ ] Update `packages/core/api-client/src/rtk/sets-api.ts` (add mutations)
- [ ] Update `packages/core/api-client/src/rtk/__tests__/sets-api.test.ts` (add mutation tests)
- [ ] Update `apps/web/app-sets-gallery/src/Module.tsx` (add edit route)
- [ ] Update `apps/web/app-sets-gallery/src/pages/main-page.tsx` (wire delete handler)
- [ ] Update `apps/web/app-sets-gallery/src/pages/set-detail-page.tsx` (wire delete handler)
- [ ] Update main page tests (verify delete integration)
- [ ] Update detail page tests (verify delete integration)

### Testing Checklist

- [ ] Unit tests for deleteSet mutation (7 test cases)
- [ ] Unit tests for updateSet mutation (7 test cases)
- [ ] Unit tests for edit-set-page (12 test cases)
- [ ] Integration tests for cache invalidation (2 test cases)
- [ ] MSW mock handlers for DELETE and PATCH endpoints
- [ ] Manual testing of delete flow from main page
- [ ] Manual testing of delete flow from detail page
- [ ] Manual testing of full edit flow
- [ ] Manual testing of unsaved changes warning
- [ ] Accessibility audit (keyboard nav, screen reader, ARIA)

### Common Pitfalls to Avoid

1. **Don't use PUT** - Backend uses PATCH, not PUT
2. **Don't skip cache invalidation** - Both delete and update must invalidate properly
3. **Don't forget optimistic updates** - Delete should remove from list immediately
4. **Don't use TypeScript interfaces** - All types from Zod schemas
5. **Don't skip unsaved changes warning** - Required for good UX
6. **Don't forget loading states** - All buttons need loading spinners during mutations
7. **Don't use console.log** - Use @repo/logger
8. **Don't create barrel files** - Direct imports only

---

**Story Status:** Ready for implementation (all dependencies deployed, no blockers)

---

## QA Discovery Notes (Auto-Generated)

_Added by Autonomous Elaboration on 2026-02-11_

### MVP Gaps Resolved

| # | Finding | Resolution | AC Added |
|---|---------|------------|----------|
| — | All core acceptance criteria addressed | Story is complete | No |

### Non-Blocking Items (Logged to KB)

| # | Finding | Category | KB Entry |
|---|---------|----------|----------|
| 1 | No undo functionality for delete operation | future-work | BUGF-003-GAP-001 |
| 2 | No bulk delete operations | enhancement | BUGF-003-GAP-002 |
| 3 | No real-time conflict detection if set edited by another session | edge-case | BUGF-003-GAP-003 |
| 4 | No audit log of changes to set metadata | observability | BUGF-003-GAP-004 |
| 5 | Image reordering not supported in edit page | ux-polish | BUGF-003-GAP-005 |
| 6 | Validation of duplicate set numbers | edge-case | BUGF-003-GAP-006 |
| 7 | Edit page image upload flow differs from add page | future-work | BUGF-003-GAP-007 |
| 8 | No conversion from wishlist item to set | integration | BUGF-003-GAP-008 |
| 9 | Optimistic update for set mutations | performance | BUGF-003-ENH-001 |
| 10 | Auto-save draft functionality | ux-polish | BUGF-003-ENH-002 |
| 11 | Keyboard shortcut for save (Cmd/Ctrl+S) | ux-polish | BUGF-003-ENH-003 |
| 12 | Field-level validation feedback during typing | ux-polish | BUGF-003-ENH-004 |
| 13 | Change preview before saving | ux-polish | BUGF-003-ENH-005 |
| 14 | Batch edit functionality | future-work | BUGF-003-ENH-006 |
| 15 | Edit history / version control | observability | BUGF-003-ENH-007 |
| 16 | Mobile-optimized edit page layout | ux-polish | BUGF-003-ENH-008 |
| 17 | Duplicate set functionality | future-work | BUGF-003-ENH-009 |
| 18 | Smart defaults based on set number | integration | BUGF-003-ENH-010 |

### Summary

- ACs added: 0
- KB entries created: 18
- Mode: autonomous
- Audit status: 8/8 checks passed
- Implementation readiness: READY
