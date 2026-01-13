# Story sets-2003: Edit Set Flow

## Status

Ready for Dev

## Consolidates

- sets-1005: Update Set Endpoint
- sets-1011: Edit Set Form

## Story

**As a** user,
**I want** to edit my set's information,
**So that** I can correct or update details.

## PRD Reference

See [Epic 7: Sets Gallery PRD](/docs/prd/epic-7-sets-gallery.md) - CRUD Operations > Update

## Dependencies

- **sets-2000**: Database Schema & Shared Types
- **sets-2001**: Sets Gallery MVP (for detail page)
- **sets-2002**: Add Set Flow (for shared form components and image endpoints)

## User Flows

1. View an existing set in the sets gallery and navigate to its detail page (`/sets/:id`).
2. For each editable field (title, set number, piece count, theme, tags, build status, quantity, purchase details, notes), hovering or focusing the field reveals a pencil icon.
3. Clicking the pencil icon converts that field into an appropriate input (text input, textarea, select, TagInput, QuantityStepper, SegmentedControl, etc.) while the rest of the page remains read-only.
4. The user can edit multiple fields inline before saving.
5. A page-level "Save changes" / "Cancel" control area appears whenever there are unsaved edits.
6. Clicking **Save** validates all edited fields, sends a `PATCH /api/sets/:id` request, and keeps the new values visible immediately using optimistic updates.
7. If the request succeeds, the optimistic values become the confirmed data and the unsaved-changes controls disappear.
8. If the request fails, the UI rolls back to the last saved values and shows an error toast.
9. Clicking **Cancel** at any time discards all unsaved edits and restores the last saved values, hiding the unsaved-changes controls.

## Acceptance Criteria

### Update Endpoint

1. [ ] PATCH /api/sets/:id updates set fields
2. [ ] Validates request body with UpdateSetSchema
3. [ ] Returns 404 if set not found
4. [ ] Returns 403 if set belongs to different user
5. [ ] Supports partial updates (only provided fields updated)
6. [ ] Updates updatedAt timestamp
7. [ ] RTK Query mutation hook created and exported

### Inline Edit on Set Detail Page

8. [ ] Set detail page (`/sets/:id`) shows read-only view by default
9. [ ] Each editable field shows a pencil icon on hover or focus
10. [ ] Clicking the pencil icon converts only that field into an appropriate control (input, textarea, select, TagInput, QuantityStepper, SegmentedControl, etc.) while the rest of the page remains read-only
11. [ ] Multiple fields can be edited before saving, and a page-level "Save changes" / "Cancel" area appears when there are unsaved edits
12. [ ] Submitting changes issues `PATCH /api/sets/:id` and, where practical, sends only the fields that changed
13. [ ] The UI uses optimistic updates: edited values remain visible immediately while the request is in flight and are rolled back on error
14. [ ] Validation errors are shown inline per field and block save
15. [ ] While a save is in progress, relevant controls show a loading/disabled state and prevent duplicate submissions
16. [ ] (Optional) Navigating away from the page while there are unsaved changes prompts the user to confirm discarding edits

## Tasks / Subtasks

### Task 1: Create Update Endpoint (AC: 1-6)

- [ ] Create `apps/api/endpoints/sets/update/handler.ts`
- [ ] Extract setId from path params
- [ ] Verify ownership before update
- [ ] Validate body with UpdateSetSchema
- [ ] Partial update: only update provided fields
- [ ] Update updatedAt timestamp
- [ ] Return updated set with images

### Task 2: RTK Query Mutation (AC: 7)

- [ ] Add `updateSet` mutation to setsApi
- [ ] Accept setId and partial data
- [ ] Configure cache invalidation
- [ ] Export `useUpdateSetMutation` hook

### Task 3: Inline Edit Mode on Set Detail Page (AC: 8-17)

- [ ] Introduce inline edit session state in `apps/web/app-sets-gallery/src/pages/set-detail-page.tsx` to track which fields are being edited and whether there are unsaved changes
- [ ] For each editable field, render a hoverable/focusable container that reveals a pencil icon button (keyboard accessible)
- [ ] Clicking the pencil icon toggles that field into edit mode using form controls that match the Add Set flow (sets-2002)
- [ ] Initialize field values from the currently loaded set data when a field enters edit mode
- [ ] Add a page-level "Save changes" / "Cancel" control area that appears only when there are unsaved edits
- [ ] Wire Save to `useUpdateSetMutation` and implement optimistic updates via RTK Query (e.g., `onQueryStarted`/`updateQueryData`) so the UI updates immediately
- [ ] On error, roll back optimistic changes to the last saved values and show an error toast
- [ ] On Cancel, reset all edited fields to the last saved values and clear the inline edit session state without calling the API
- [ ] Implement inline image editing (add/remove/reorder) in the existing gallery section, following the same optimistic pattern where feasible
- [ ] Ensure loading, not-found, and forbidden states behave the same as before

## Dev Notes

### Update Endpoint Handler

```typescript
// apps/api/endpoints/sets/update/handler.ts
import { UpdateSetSchema, SetSchema } from '@repo/api-client'

export const handler = async (event: APIGatewayEvent) => {
  const userId = getUserIdFromEvent(event)
  const setId = event.pathParameters?.id

  if (!setId) {
    return badRequest('Set ID required')
  }

  // Verify ownership
  const existingSet = await getSetById(setId)
  if (!existingSet) {
    return notFound('Set not found')
  }
  if (existingSet.userId !== userId) {
    return forbidden('Not authorized to update this set')
  }

  const input = UpdateSetSchema.parse(JSON.parse(event.body || '{}'))

  // Partial update - only update provided fields
  const [updated] = await db.update(sets)
    .set({
      ...input,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(sets.id, setId))
    .returning()

  // Fetch with images
  const images = await db.select()
    .from(setImages)
    .where(eq(setImages.setId, setId))
    .orderBy(asc(setImages.position))

  return success(SetSchema.parse({ ...updated, images }))
}
```

### RTK Query Mutation

```typescript
// In sets-api.ts
updateSet: builder.mutation<Set, { id: string; data: UpdateSetInput }>({
  query: ({ id, data }) => ({
    url: `/sets/${id}`,
    method: 'PATCH',
    body: data,
  }),
  transformResponse: (response) => SetSchema.parse(response),
  invalidatesTags: (result, error, { id }) => [
    { type: 'Set', id },
    { type: 'Set', id: 'LIST' },
  ],
}),
```

### Inline Edit Mode on Set Detail Page

- Single source of truth for set data is the existing `SetDetailPage` using the real Sets API.
- Use a form state (e.g., via `react-hook-form`) scoped to this page to manage an inline edit session; do not create a separate edit route.
- Represent per-field edit state (e.g., which fields are currently in edit mode) instead of a single global "edit page" toggle.
- For each editable field, render a read-only view and a pencil-icon-triggered input state, keeping the display and input markup adjacent.
- When a field enters edit mode, initialize its value from the currently loaded set data.
- On Cancel, reset all form state back to the latest known-good values and clear any per-field edit state.
- On Save, use RTK Query optimistic updates (e.g., `onQueryStarted`/`updateQueryData`) to update the cached `Set` immediately and roll back on error.
- Consider guarding navigation away from the page when there are unsaved edits to avoid accidental loss of changes.

## Testing

### API Tests

- [ ] PATCH /api/sets/:id updates all fields
- [ ] PATCH /api/sets/:id with single field only updates that field
- [ ] Preserves unchanged fields
- [ ] Updates updatedAt timestamp
- [ ] Returns 404 for non-existent ID
- [ ] Returns 403 for unauthorized user
- [ ] Validates partial data correctly
- [ ] Empty body is valid (no changes)
- [ ] Invalid data returns validation error

### Component Tests

- [ ] Inline edit controls render correctly on the detail page and match the existing read-only layout
- [ ] Pencil icon becomes visible on hover/focus for each editable field and is keyboard accessible
- [ ] Clicking the pencil icon swaps the field into edit mode and focuses the control
- [ ] TagInput adds/removes tags and updates the tags shown in read-only mode after save
- [ ] QuantityStepper increments/decrements and syncs with displayed quantity
- [ ] SegmentedControl toggles build status and updates the displayed badge

### Page Tests

- [ ] Route `/sets/:id` renders with valid set ID
- [ ] Detail page shows read-only view by default
- [ ] Hovering or focusing an editable field reveals a pencil icon
- [ ] Clicking a field's pencil icon enables editing for that field with values pre-populated from the existing set
- [ ] Multiple fields can be edited before saving, and a page-level "Save changes" / "Cancel" area appears when there are unsaved edits
- [ ] Form validates on submit and blocks invalid changes (including server-side validation errors)
- [ ] Valid changes save successfully, update the UI optimistically, and remain after the server confirms
- [ ] On API failure, the UI rolls back to the last saved values and shows an error toast
- [ ] Cancel discards all unsaved edits and restores the original values without saving
- [ ] (If implemented) Attempting to navigate away with unsaved changes shows a confirmation prompt
- [ ] Shows 404 for non-existent set
- [ ] Error toast on API failure (non-validation errors)
- [ ] Partial updates work (unchanged fields preserved)
- [ ] Images can be added/removed/reordered in edit mode
- [ ] Image deletions and additions persist on save

## Definition of Done

- [ ] Sets can be updated with partial data
- [ ] Images can be added/removed on edit
- [ ] Inline edit mode on the set detail page matches fields and validation from the Add flow
- [ ] Inline edit flow uses optimistic updates and handles API failures by rolling back to the last saved values
- [ ] All tests pass
- [ ] Code reviewed

## Change Log

| Date       | Version | Description                              | Author |
| ---------- | ------- | ---------------------------------------- | ------ |
| 2025-12-27 | 0.1     | Initial draft                            | Claude |
| 2025-12-27 | 0.2     | Consolidated from sets-1005, 1011        | Claude |
