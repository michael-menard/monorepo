---
generated: "2026-02-11"
baseline_used: null
baseline_date: null
lessons_loaded: false
adrs_loaded: true
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: BUGF-003

## Reality Context

### Baseline Status
- Loaded: No
- Date: N/A
- Gaps: No active baseline reality file found. Story seed generated using codebase analysis only.

### Relevant Existing Features

| Feature | Status | Location | Notes |
|---------|--------|----------|-------|
| Sets API (GET endpoints) | Deployed | `packages/core/api-client/src/rtk/sets-api.ts` | `useGetSetsQuery`, `useGetSetByIdQuery` exist |
| Sets API (POST endpoint) | Deployed | `packages/core/api-client/src/rtk/sets-api.ts` | `useAddSetMutation` implemented |
| Sets API (Image operations) | Deployed | `packages/core/api-client/src/rtk/sets-api.ts` | Presign, register, and delete image mutations exist |
| Backend DELETE endpoint | Deployed | `apps/api/lego-api/domains/sets/routes.ts` | Line 132-144: DELETE /:id route implemented |
| Backend PATCH endpoint | Deployed | `apps/api/lego-api/domains/sets/routes.ts` | Line 108-127: PATCH /:id route implemented (not PUT) |
| Zod schemas for update | Deployed | `packages/core/api-client/src/schemas/sets.ts` | `UpdateSetSchema`, `UpdateSetInput` exist (line 88-90) |
| Add Set Page | Deployed | `apps/web/app-sets-gallery/src/pages/add-set-page.tsx` | Complete form implementation with image upload |
| Main Page (delete stub) | Deployed | `apps/web/app-sets-gallery/src/pages/main-page.tsx` | Line 123-129: Delete confirmation dialog wired but no API call |
| Set Detail Page (delete stub) | Deployed | `apps/web/app-sets-gallery/src/pages/set-detail-page.tsx` | Line 213-223: Delete handler logs but doesn't call API |
| Set Detail Page (edit nav) | Deployed | `apps/web/app-sets-gallery/src/pages/set-detail-page.tsx` | Line 208-211: Edit button navigates to `/sets/:id/edit` |
| Main Page (edit nav) | Deployed | `apps/web/app-sets-gallery/src/pages/main-page.tsx` | Line 115-117: Edit handler navigates to `/sets/:id/edit` |

### Active In-Progress Work
Unknown - no baseline reality file available to identify conflicting work.

### Constraints to Respect

| Constraint | Source | Details |
|------------|--------|---------|
| Backend uses PATCH not PUT | Codebase analysis | Backend implements PATCH /:id, not PUT. Frontend must use PATCH method. |
| No edit-set-page.tsx exists | Codebase analysis | Edit page file does not exist; must be created from scratch |
| No edit route in Module.tsx | Codebase analysis | Module routing does not include edit route; must be added |
| Form reuse pattern | Add Set Page analysis | Should reuse form components/logic from add-set-page.tsx |
| Zod-first validation | CLAUDE.md | All types must use Zod schemas with `z.infer<>` |
| API path schema | ADR-001 | Frontend uses `/api/v2/sets`, backend uses `/sets` |

---

## Retrieved Context

### Related Endpoints

**Backend (apps/api/lego-api/domains/sets/routes.ts):**
- Line 132-144: `DELETE /:id` - Deletes set, returns 204 on success
- Line 108-127: `PATCH /:id` - Updates set with partial data, returns updated set

**Frontend (packages/core/api-client/src/rtk/sets-api.ts):**
- Lines 41-65: `getSets` query with cache tags
- Lines 72-77: `getSetById` query with cache tags
- Lines 84-98: `addSet` mutation with cache invalidation
- Lines 157-181: `deleteSetImage` mutation with optimistic updates
- **Missing:** `deleteSet` mutation
- **Missing:** `updateSet` mutation

### Related Components

**Pages:**
- `apps/web/app-sets-gallery/src/pages/main-page.tsx` - Gallery list view with delete dialog stub
- `apps/web/app-sets-gallery/src/pages/set-detail-page.tsx` - Detail view with edit/delete button stubs
- `apps/web/app-sets-gallery/src/pages/add-set-page.tsx` - Form implementation to reuse for edit

**Components:**
- `apps/web/app-sets-gallery/src/components/SetCard.tsx` - Likely has edit/delete action buttons
- `apps/web/app-sets-gallery/src/components/TagInput.tsx` - Form component used in add-set-page
- `apps/web/app-sets-gallery/src/components/ImageUploadZone.tsx` - Form component used in add-set-page

**Routing:**
- `apps/web/app-sets-gallery/src/Module.tsx` - Routes configuration (missing edit route)

**Schemas:**
- `packages/core/api-client/src/schemas/sets.ts` - Contains `UpdateSetSchema` and `UpdateSetInput` (line 88-90)

### Reuse Candidates

**Components to Reuse:**
1. `TagInput` - Already used in add-set-page (line 271-278)
2. `ImageUploadZone` - Already used in add-set-page (line 347-352)
3. Form layout pattern from `AddSetPage` - Three cards: Set Information, Purchase Information, Images
4. Delete image mutation pattern from `sets-api.ts` (line 157-181) - Shows optimistic update + undo pattern

**Patterns to Follow:**
1. Optimistic cache updates (from `deleteSetImage`, line 162-176)
2. Cache invalidation strategy (from `addSet`, line 91-97)
3. Form validation with Zod (from `add-set-page.tsx`, line 99)
4. Navigation patterns (from detail page edit handler, line 208-211)
5. Toast notifications (from `add-set-page.tsx`, line 126, 130)

**Packages to Leverage:**
1. `@repo/app-component-library` - Form primitives, buttons, cards, dialogs
2. `@repo/upload` - `uploadToPresignedUrl` helper (already used in add-set-page, line 113)
3. `@repo/api-client/schemas/sets` - `UpdateSetSchema`, `CreateSetSchema` for validation
4. `@repo/api-client/rtk/sets-api` - Extend with new mutations

---

## Knowledge Context

### Lessons Learned
No lessons loaded - knowledge base query not performed due to missing baseline context.

### Blockers to Avoid (from codebase analysis)
- **API path mismatch**: Backend uses `/sets`, frontend expects `/api/v2/sets` (mitigated by ADR-001 proxy setup)
- **HTTP method mismatch**: Backend uses PATCH not PUT - frontend mutation must use PATCH
- **Missing route registration**: Edit page route must be added to Module.tsx or navigation will fail
- **Cache invalidation**: Delete mutation must invalidate both 'Set' and 'SetList' tags to refresh UI

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-001 | API Path Schema | Frontend: `/api/v2/sets`, Backend: `/sets` (proxy rewrites in Vite) |
| ADR-005 | Testing Strategy | UAT must use real services, not mocks (applies to E2E tests) |
| ADR-006 | E2E Tests in Dev Phase | E2E tests required during development phase (deferred for this bug fix) |

### Patterns to Follow
- Use Zod schemas for all type definitions (per CLAUDE.md)
- Named exports for components (per CLAUDE.md)
- Functional components with function declarations (per CLAUDE.md)
- RTK Query mutations with proper cache invalidation (per existing API patterns)
- Optimistic updates with undo capability for delete operations (per `deleteSetImage` pattern)
- Toast notifications for success/error feedback (per add-set-page pattern)

### Patterns to Avoid
- Don't use TypeScript interfaces without Zod schemas (per CLAUDE.md)
- Don't use console.log - use `@repo/logger` (per CLAUDE.md)
- Don't create barrel files (per CLAUDE.md)
- Don't use PUT method - backend uses PATCH (per backend routes analysis)
- Don't skip cache invalidation - causes stale data in list/detail views

---

## Conflict Analysis

No conflicts detected. Story can proceed.

---

## Story Seed

### Title
Implement Delete API and Edit Page for Sets Gallery

### Description

**Context:**
The Sets Gallery has a complete "add set" flow with backend APIs for PATCH and DELETE operations deployed. However, the frontend lacks the RTK Query mutations for delete and update, and there is no edit page to allow users to modify existing sets. Delete buttons in both the main gallery and detail pages are stubbed with placeholder handlers that don't call the API.

**Problem:**
Users cannot delete sets they've added to their collection, and they cannot edit set metadata after creation. This creates a poor user experience where mistakes are permanent and unwanted sets cannot be removed.

**Solution:**
1. Create `useDeleteSetMutation` and `useUpdateSetMutation` hooks in the Sets API client
2. Build a new `edit-set-page.tsx` that reuses the form structure from `add-set-page.tsx`
3. Wire the edit route into `Module.tsx` routing configuration
4. Connect delete handlers in `main-page.tsx` and `set-detail-page.tsx` to the delete mutation
5. Implement proper cache invalidation to refresh list and detail views after mutations
6. Add optimistic updates and loading states for better UX

### Initial Acceptance Criteria

**API Client (packages/core/api-client/src/rtk/sets-api.ts):**
- [ ] AC-1: `useDeleteSetMutation` hook exists and sends DELETE request to `/sets/:id`
- [ ] AC-2: Delete mutation invalidates 'Set' and 'SetList' cache tags on success
- [ ] AC-3: Delete mutation uses optimistic update pattern to remove item from list immediately
- [ ] AC-4: `useUpdateSetMutation` hook exists and sends PATCH request to `/sets/:id`
- [ ] AC-5: Update mutation accepts `UpdateSetInput` partial object as input
- [ ] AC-6: Update mutation invalidates 'Set' cache tag for the updated item

**Edit Page (apps/web/app-sets-gallery/src/pages/edit-set-page.tsx):**
- [ ] AC-7: Edit page component exists and renders form pre-filled with existing set data
- [ ] AC-8: Form reuses `TagInput` and `ImageUploadZone` components from add-set-page
- [ ] AC-9: Form validates input with `UpdateSetSchema` before submission
- [ ] AC-10: Form shows loading state during mutation
- [ ] AC-11: Form shows success toast and navigates to detail page after successful update
- [ ] AC-12: Form shows error toast with specific error message on mutation failure
- [ ] AC-13: Back button navigates to set detail page without saving

**Routing (apps/web/app-sets-gallery/src/Module.tsx):**
- [ ] AC-14: Route exists for `/sets/:id/edit` path that renders `EditSetPage`

**Main Page Delete Integration (apps/web/app-sets-gallery/src/pages/main-page.tsx):**
- [ ] AC-15: Delete confirmation dialog `handleConfirmDelete` calls `useDeleteSetMutation`
- [ ] AC-16: Successful delete shows success toast with set title
- [ ] AC-17: Failed delete shows error toast with error message
- [ ] AC-18: Delete button shows loading state during mutation
- [ ] AC-19: List view updates immediately after delete (optimistic or refetch)

**Detail Page Integration (apps/web/app-sets-gallery/src/pages/set-detail-page.tsx):**
- [ ] AC-20: Delete button handler calls `useDeleteSetMutation`
- [ ] AC-21: Successful delete navigates to main gallery page with success toast
- [ ] AC-22: Failed delete shows error toast and remains on detail page
- [ ] AC-23: Edit button navigation to `/sets/:id/edit` continues to work (no changes needed)

**Exports (packages/core/api-client/src/rtk/sets-api.ts):**
- [ ] AC-24: `useDeleteSetMutation` is exported from sets-api
- [ ] AC-25: `useUpdateSetMutation` is exported from sets-api

### Non-Goals
- Image editing/reordering within edit page (images can be deleted via existing delete image API but not reordered)
- Undo functionality for delete operation (future enhancement, not MVP)
- Bulk delete operations (single delete only)
- Validation of duplicate set numbers (backend concern)
- E2E tests (per BUGF stories index, test coverage is Phase 3)
- Converting existing wishlist item to set (separate feature)
- Edit page image upload flow differs from add page - keep separate for now
- Real-time conflict detection if set is edited by another session
- Audit log of changes to set metadata

### Reuse Plan

**Components:**
- `TagInput` from `apps/web/app-sets-gallery/src/components/TagInput.tsx`
- `ImageUploadZone` from `apps/web/app-sets-gallery/src/components/ImageUploadZone.tsx`
- Form layout structure (3 cards) from `apps/web/app-sets-gallery/src/pages/add-set-page.tsx`

**Patterns:**
- Cache invalidation pattern from `addSet` mutation (line 91-97 of sets-api.ts)
- Optimistic update pattern from `deleteSetImage` mutation (line 162-176 of sets-api.ts)
- Form validation pattern from `add-set-page.tsx` (line 99: `CreateSetSchema.parse(candidate)`)
- Toast notification pattern from `add-set-page.tsx` (line 126, 130)
- Navigation pattern from detail page (line 208-211: `navigate(\`/sets/${setId}/edit\`)`)

**Packages:**
- `@repo/app-component-library` - All UI primitives (Button, Card, Input, Textarea, Select, etc.)
- `@repo/upload` - `uploadToPresignedUrl` for new images in edit flow
- `@repo/api-client/schemas/sets` - `UpdateSetSchema`, `UpdateSetInput`, `CreateSetInput`
- `@repo/api-client/rtk/sets-api` - Extend with `deleteSet` and `updateSet` mutations
- `@repo/logger` - Use instead of console.log for any logging

---

## Recommendations for Subsequent Phases

### For Test Plan Writer
- **Context:** Backend APIs already exist and have service-level tests. Frontend mutations need unit tests but E2E tests are Phase 3 (BUGF-014).
- **Constraints:**
  - Minimum 45% test coverage required per CLAUDE.md
  - ADR-005 requires UAT to use real services (MSW for unit tests, real API for E2E)
  - Focus on RTK Query mutation hooks and form component logic
- **Priorities:**
  1. Unit tests for `deleteSet` and `updateSet` mutations with MSW mocks
  2. Unit tests for `edit-set-page.tsx` form validation and submission
  3. Integration test for cache invalidation behavior after delete/update
  4. Test error handling paths (404, 403, network errors)
- **Defer to BUGF-014:** E2E tests for delete/edit flows in Playwright

### For UI/UX Advisor
- **Context:** Edit page should mirror add-set-page design for consistency. Delete flow already has confirmation dialog in place.
- **Constraints:**
  - LEGO-inspired theme (Sky/Teal color palette) per CLAUDE.md
  - Accessibility-first: ARIA labels, keyboard nav, focus management
  - Use glassmorphism design from main-page.tsx for consistency
- **Considerations:**
  1. Edit page should pre-fill form with existing data (use `useGetSetByIdQuery` to load)
  2. Loading skeleton while fetching set data for edit form
  3. "Unsaved changes" warning if user navigates away from edit form (see BUGF-019 for similar pattern)
  4. Success toast should include set title for context ("Medieval Castle updated")
  5. Delete confirmation dialog already exists - verify copy is clear
  6. Consider loading states for delete button during mutation

### For Dev Feasibility
- **Context:** Backend APIs are fully implemented. Frontend work is primarily RTK Query integration and form component creation.
- **Constraints:**
  - Backend uses PATCH not PUT (must use correct HTTP method)
  - No barrel files allowed (per CLAUDE.md)
  - Zod-first validation required (per CLAUDE.md)
- **Implementation Notes:**
  1. **Delete mutation:** Follow `deleteSetImage` pattern (lines 157-181) for optimistic updates
  2. **Update mutation:** Use `UpdateSetSchema` (already exists in schemas/sets.ts)
  3. **Edit page:** Clone add-set-page.tsx structure, add data loading logic
  4. **Route registration:** Add to Module.tsx routes array (line 38-40)
  5. **Form pre-filling:** Use `useGetSetByIdQuery` with `skip: !setId` pattern
  6. **Image handling:** Edit page only needs to support adding new images, deletion handled by existing delete image button
- **Complexity:**
  - Low: Delete mutation (similar to existing deleteSetImage)
  - Low: Update mutation (similar to existing addSet)
  - Medium: Edit page (form pre-filling and validation logic)
  - Low: Route wiring
- **Estimated Effort:** 4-6 hours (2h mutations, 3h edit page, 1h integration/testing)
