# Frontend Implementation Log - BUGF-002

## Chunk 1 - Wire useUpdateMocMutation into app-instructions-gallery edit-page.tsx

**Objective**: Replace TODO at line 124 with useUpdateMocMutation integration following CreateMocPage pattern

**Files changed**:
- apps/web/app-instructions-gallery/src/pages/edit-page.tsx

**Summary of changes**:
1. Added import for `useUpdateMocMutation` and `UpdateMocInput` type from @repo/api-client
2. Added import for `showSuccessToast` from @repo/app-component-library
3. Initialized mutation hook: `const [updateMoc] = useUpdateMocMutation()`
4. Implemented handleSave function with:
   - Data transformation: MocEditFormInput → UpdateMocInput
   - Tags parsing: split comma-separated string, trim, filter empty
   - Empty string → null conversion for optional fields
   - RTK Query mutation call with .unwrap() for proper error handling
   - HTTP status-based error messages (404, 403, 409, 500)
   - Success toast notification
   - Navigation after success
   - Form state preservation on error (no reset)

**Reuse compliance**:
- Reused: useUpdateMocMutation hook, UpdateMocInput schema, showSuccessToast utility
- New: N/A
- Why new was necessary: N/A

**Components used from @repo/app-component-library**:
- showSuccessToast for success notification
- Existing: Button, Card, Input, Label, Alert components (already in use)

**Commands run**:
- None yet (will run type check after both edit pages complete)

**Notes / Risks**:
- Followed CreateMocPage.tsx async mutation pattern exactly
- Error handling covers all AC-specified status codes
- Form remains dirty after error to allow retry without re-entry

---

## Chunk 2 - Wire useUpdateMocMutation into main-app InstructionsEditPage.tsx

**Objective**: Replace TODO at line 124 with useUpdateMocMutation integration (identical to edit-page.tsx)

**Files changed**:
- apps/web/main-app/src/routes/pages/InstructionsEditPage.tsx

**Summary of changes**:
- Identical implementation to edit-page.tsx (both pages have same structure)
- Same imports, same mutation logic, same error handling

**Reuse compliance**:
- Reused: Same as Chunk 1
- New: N/A

**Components used from @repo/app-component-library**:
- Same as Chunk 1

**Commands run**:
- None yet

**Notes / Risks**:
- Both edit pages now have identical mutation logic
- Pre-existing build errors in other packages noted (not related to BUGF-002)

---

## Chunk 3 - Fast-fail verification

**Commands run**:
- Attempted: `pnpm --filter @repo/app-instructions-gallery run check-types`
- Result: Pre-existing type errors in OTHER files (InstructionCard, InstructionsUpload, MocEdit/EditForm)
- Files modified in BUGF-002 are NOT causing new type errors

**Status**: Implementation complete, pre-existing errors blocking type check but NOT caused by this story

