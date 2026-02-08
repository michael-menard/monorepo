# INST-1008 Setup Summary

**Story**: Wire RTK Query Mutations for MOC Instructions API
**Phase**: 0 - Infrastructure
**Status**: Setup Complete → Ready for Implementation
**Setup Date**: 2026-02-05

---

## Analysis Complete

The setup phase has analyzed:

1. **Story Requirements** (INST-1008.md frontmatter + context)
   - Small story, 6 effort hours, low complexity, low risk
   - Blocks 8 Phase 1 stories (INST-1100, INST-1102-1104, INST-1106, INST-1108-1110)
   - No blocking dependencies
   - Infrastructure work (no E2E tests required per ADR-006)

2. **Backend API** (apps/api/lego-api/domains/instructions/routes.ts)
   - Complete CRUD API exists: 8 endpoints total
   - All routes authenticated + require 'moc' feature
   - Request/response validation via Zod schemas in backend types.ts

3. **Frontend API Client** (packages/core/api-client/src/rtk/instructions-api.ts)
   - Exists with GET queries only (`useGetInstructionsQuery`, `useGetInstructionByIdQuery`, `useToggleInstructionFavoriteMutation`)
   - Uses RTK Query createApi pattern with authenticated base query
   - Currently tags only `['Instruction', 'InstructionList']`

4. **Reference Implementation** (packages/core/api-client/src/rtk/wishlist-gallery-api.ts)
   - Shows best practices for mutations:
     - Zod schema validation via `transformResponse`
     - Cache invalidation with `invalidatesTags`
     - Optimistic updates via `onQueryStarted` with rollback on error
     - Proper error handling patterns
     - Logging via @repo/logger

5. **Existing Schema Patterns** (packages/core/api-client/src/schemas/)
   - Schemas directory contains: feature-flags, sets, wishlist, permissions, admin, inspiration
   - No instructions.ts schema file yet (to be created)
   - Backend already has comprehensive schemas in apps/api/lego-api/domains/instructions/types.ts

---

## Implementation Plan

### Phase 1: Schema Creation
**File**: `packages/core/api-client/src/schemas/instructions.ts`

Create Zod schemas for API contracts:

```typescript
// Re-export backend types (already have Zod schemas)
export { MocInstructions, MocFile, ... } from backend types

// Request schemas
export const CreateMocRequestSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  type: z.enum(['moc', 'set']).default('moc'),
  // ... other fields
})

// Response wrappers (if needed)
// File upload forms handled separately
```

### Phase 2: RTK Mutations
**File**: `packages/core/api-client/src/rtk/instructions-api.ts`

Update structure:
1. Change `tagTypes: ['Instruction', 'InstructionList']` → `['Moc', 'MocList', 'MocFile']`
2. Update existing queries to use new tag names
3. Add 8 mutation endpoints:

#### MOC CRUD Mutations (3)
```typescript
useCreateMocMutation: POST /api/v2/mocs
  - Optimistic update (add to list, replace on success)
  - Invalidates: MocList

useUpdateMocMutation: PATCH /api/v2/mocs/{id}
  - No optimistic update (safer for metadata)
  - Invalidates: Moc, MocList

useDeleteMocMutation: DELETE /api/v2/mocs/{id}
  - No optimistic update (safer for destructive op)
  - Invalidates: Moc, MocList
```

#### File Upload Mutations (3)
```typescript
useUploadInstructionFileMutation: POST /api/v2/mocs/{mocId}/files/instruction
  - FormData request body
  - Invalidates: Moc, MocFile

useUploadPartsListFileMutation: POST /api/v2/mocs/{mocId}/files/parts-list
  - FormData request body
  - Invalidates: Moc, MocFile

useUploadThumbnailMutation: POST /api/v2/mocs/{mocId}/thumbnail
  - FormData request body
  - Invalidates: Moc
```

#### File Delete Mutation (1)
```typescript
useDeleteFileMutation: DELETE /api/v2/mocs/{mocId}/files/{fileId}
  - No optimistic update
  - Invalidates: Moc, MocFile
```

### Phase 3: Exports & Testing
**Files**:
- `packages/core/api-client/src/schemas/index.ts` — Export instruction schemas
- `packages/core/api-client/src/rtk/__tests__/instructions-api.test.ts` — 45%+ coverage
- `packages/core/api-client/src/schemas/__tests__/instructions.test.ts` — Schema validation

---

## Key Design Decisions

### 1. Tag Types Change: `Instruction` → `Moc`
**Rationale**:
- Backend entities are "MOCs" not "Instructions"
- Aligns terminology with API routes (/mocs, /mocs/:id)
- Reduces confusion between instructions (UI docs) and MOCs (data entities)

### 2. Optimistic Update Only on Create
**Rationale**:
- Create: Safe to optimistically add with temp ID (usual pattern)
- Update: Risky to assume new values without server validation (metadata)
- Delete: Risky to remove immediately (data loss perception)
- File uploads: Risky (server validates file type/size)
- Per ADR-006 + wishlist patterns, only create gets optimistic update

### 3. FormData for File Uploads
**Rationale**:
- Backend routes use multipart/form-data (c.req.formData())
- RTK Query handles FormData correctly (don't set Content-Type header)
- No Zod schema validation for FormData (runtime handling)

### 4. Separate Mutation for Each File Type
**Rationale**:
- Backend has separate routes: /files/instruction vs /files/parts-list vs /thumbnail
- Each route validates different file types
- Clearer API surface for consumers

---

## Protected Elements (Do NOT Modify)

- ❌ **Backend routes**: `apps/api/lego-api/domains/instructions/routes.ts`
- ❌ **Backend types**: `apps/api/lego-api/domains/instructions/types.ts`
- ❌ **Existing queries**: `useGetInstructionsQuery`, `useGetInstructionByIdQuery`, `useToggleInstructionFavoriteMutation` (update tags only)
- ❌ **Database schema**: No changes
- ❌ **Backend file storage**: Already handles S3 upload/delete

---

## Quality Standards

### Code Style (CLAUDE.md)
- No semicolons, single quotes, trailing commas, 100 char line width
- Strict TypeScript, Zod-first types (z.infer<>)
- Named exports, no barrel files
- Logging via @repo/logger only

### Testing
- Minimum 45% global coverage
- Unit tests for all mutations
- Schema validation tests
- No E2E tests (infrastructure story, per ADR-006)

### Git
- Conventional commit: `feat: Wire RTK Query mutations for MOC Instructions API`
- One commit, includes schema + mutations + tests + exports

---

## Artifacts Created

| File | Purpose |
|------|---------|
| `_implementation/CHECKPOINT.yaml` | Phase tracking (setup → plan) |
| `_implementation/SCOPE.yaml` | Detailed scope + file list |
| `.agent/working-set.md` | Agent context (constraints, files, checklist) |
| `_implementation/SETUP-SUMMARY.md` | This document |

---

## Next Agent Instructions

Once implementation phase begins:

1. **Create schema file** first
   - Export from backend types where possible
   - Write only new request/response schemas

2. **Update RTK API**
   - Import new schemas
   - Change tagTypes
   - Update existing queries
   - Add 8 mutations (copy patterns from wishlist-gallery-api.ts)
   - Export all new hooks

3. **Add tests**
   - 45%+ coverage target
   - Test mutation calls, tag invalidation, error cases

4. **Verify**
   - `pnpm lint` passes
   - `pnpm check-types` passes
   - `pnpm test` passes
   - Commit message follows convention

---

## Blocking Stories

This story unblocks:
- INST-1100: Upload MOC Instructions UI
- INST-1102: MOC Detail Page
- INST-1103: Edit MOC Form
- INST-1104: Delete MOC Confirmation
- INST-1106: File Management UI
- INST-1108: File Upload Progress
- INST-1109: File Preview
- INST-1110: Bulk File Operations

**Do NOT start Phase 1 stories until INST-1008 is complete.**

---

**Status**: Ready for implementation phase
**Setup Completed By**: dev-setup-leader
**Timestamp**: 2026-02-05T00:00:00Z
