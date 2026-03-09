---
generated: "2026-02-05"
baseline_used: null
baseline_date: null
lessons_loaded: true
adrs_loaded: true
conflicts_found: 0
blocking_conflicts: 0
---

# Story Seed: INST-1008

## Reality Context

### Baseline Status
- Loaded: **No**
- Date: N/A
- Gaps: No active baseline reality file exists. Analysis based on codebase scanning only.

### Relevant Existing Features

| Feature | Status | Location | Notes |
|---------|--------|----------|-------|
| Instructions API Routes | ✅ Exists | `apps/api/lego-api/domains/instructions/routes.ts` | Backend routes for MOC CRUD operations fully implemented |
| Instructions API Types | ✅ Exists | `apps/api/lego-api/domains/instructions/types.ts` | Comprehensive Zod schemas for MOC operations |
| Instructions API Client | ⚠️ Partial | `packages/core/api-client/src/rtk/instructions-api.ts` | Only GET queries exist (list, getById, toggleFavorite) |
| Wishlist RTK API | ✅ Complete | `packages/core/api-client/src/rtk/wishlist-gallery-api.ts` | Reference pattern for CRUD + mutations with cache invalidation |
| Gallery RTK API | ✅ Complete | `packages/core/api-client/src/rtk/gallery-api.ts` | Reference pattern for enhanced queries with serverless optimizations |

### Active In-Progress Work

| Story ID | Title | Status | Potential Overlap |
|----------|-------|--------|-------------------|
| INST-1003 | Extract Upload Types Package | Ready for Review | ✅ None - different layer |
| INST-1004 | Extract Upload Config Package | Draft | ✅ None - different layer |

### Constraints to Respect

1. **No Baseline**: Cannot validate against current deployed state or in-progress features
2. **Backend Complete**: All MOC CRUD endpoints already exist (`GET /mocs`, `POST /mocs`, `PATCH /mocs/:id`, `DELETE /mocs/:id`)
3. **File Operations Exist**: File upload/delete endpoints already implemented
4. **Frontend Partial**: Only query hooks exist, no mutation hooks
5. **Zod-First Required**: Per CLAUDE.md, must use Zod schemas with `z.infer<>`, never TypeScript interfaces

---

## Retrieved Context

### Related Endpoints

**Backend Routes** (`apps/api/lego-api/domains/instructions/routes.ts`):
- `GET /mocs` - List user's MOCs (pagination, search, filters)
- `GET /mocs/:id` - Get single MOC with files
- `POST /mocs` - Create new MOC (requires quota)
- `PATCH /mocs/:id` - Update MOC metadata
- `DELETE /mocs/:id` - Delete MOC
- `GET /mocs/:id/files` - List files for a MOC
- `POST /mocs/:id/files/instruction` - Upload instruction file
- `POST /mocs/:id/files/parts-list` - Upload parts list file
- `POST /mocs/:id/thumbnail` - Upload thumbnail image
- `DELETE /mocs/:id/files/:fileId` - Delete a file

**Frontend API Client** (`packages/core/api-client/src/rtk/instructions-api.ts`):
- ✅ `useGetInstructionsQuery` - GET /api/instructions (list)
- ✅ `useGetInstructionByIdQuery` - GET /api/instructions/:id
- ✅ `useToggleInstructionFavoriteMutation` - PATCH /api/instructions/:id (favorite only)
- ❌ Missing: Create, Update (full), Delete, File operations

### Related Components

**Existing Schemas**:
- `apps/api/lego-api/domains/instructions/types.ts` - Complete Zod schemas for MOC domain
- `packages/core/api-client/src/schemas/wishlist.ts` - Reference pattern for frontend schemas
- `packages/core/api-client/src/schemas/index.ts` - Schema exports

**Existing RTK Patterns**:
- `wishlist-gallery-api.ts` - Reference for optimistic updates, cache invalidation
- `gallery-api.ts` - Reference for enhanced queries with serverless optimizations

### Reuse Candidates

**Packages**:
- `@repo/api-client` - Base query utilities (`createServerlessBaseQuery`, `getServerlessCacheConfig`)
- `@repo/logger` - Logging utilities (already used in instructions-api.ts)
- `@reduxjs/toolkit/query/react` - RTK Query createApi

**Patterns to Reuse**:
1. **Wishlist mutation pattern**: Optimistic updates with `onQueryStarted`, cache invalidation via tags
2. **Gallery query pattern**: Serverless optimizations, performance monitoring
3. **Zod schema validation**: `transformResponse` with schema parsing
4. **Cache tag structure**: Entity-level tags (`MocInstruction`, `MocFile`) + list tags (`MocList`)

**File Structure Pattern** (from wishlist-gallery-api.ts):
```typescript
export const mocsApi = createApi({
  reducerPath: 'mocsApi',
  baseQuery: createServerlessBaseQuery({ ... }),
  tagTypes: ['Moc', 'MocList', 'MocFile'],
  endpoints: builder => ({
    getMocs: builder.query<...>({ ... }),
    getMoc: builder.query<...>({ ... }),
    createMoc: builder.mutation<...>({
      invalidatesTags: ['MocList'],
      onQueryStarted: ... // optimistic update
    }),
    // ... etc
  })
})
```

---

## Knowledge Context

### Lessons Learned

**From ADR-001: API Endpoint Path Schema**
- *Applies because*: This story wires frontend RTK mutations that must call backend endpoints
- **Lesson**: Frontend RTK Query expects paths like `/api/v2/mocs` while backend Hono routes provide `/mocs`
- **Resolution**: Use Vite proxy OR ensure baseQuery rewrites paths correctly
- **Risk**: Path mismatches cause 404 errors in E2E tests (caught late in dev cycle)

**From ADR-006: E2E Tests Required in Dev Phase**
- *Applies because*: This is infrastructure that enables frontend stories
- **Lesson**: Unit tests pass but E2E tests fail due to config mismatches (MSW vs real API)
- **Resolution**: INST-1008 is infrastructure, so E2E tests are N/A, but dependent stories (INST-1100+) must include E2E tests
- **Context**: This story sets up the mutations that will be used by vertical slice stories

**From Wishlist Implementation (WISH-2005b, WISH-2032)**:
- *Applies because*: Same RTK Query mutation patterns
- **Lesson**: Optimistic updates improve UX but require careful cache management
- **Pattern**: Capture original state before optimistic update, rollback on error via `patchResult.undo()`
- **Pattern**: Provide `onOptimisticError` callback for UI-level error handling

### Blockers to Avoid (from past stories)

- ❌ **Path mismatch**: Ensure `/api/v2/mocs` (frontend) maps to `/mocs` (backend) via Vite proxy
- ❌ **Missing cache invalidation**: Mutations must invalidate relevant tags to refresh queries
- ❌ **TypeScript interfaces**: Must use Zod schemas with `z.infer<>` per CLAUDE.md
- ❌ **Reading serverless.yml**: Don't scan serverless config files (token sink)
- ❌ **Barrel files**: Don't create `index.ts` re-exports (per CLAUDE.md)

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-001 | API Path Schema | Frontend: `/api/v2/mocs`, Backend: `/mocs` - Vite proxy rewrites |
| ADR-005 | Testing Strategy | UAT must use real services, not mocks |
| ADR-006 | E2E Tests Required | Infrastructure stories exempt, but consuming stories must test E2E |

### Patterns to Follow

1. **Zod-First Types**: Define schemas, infer types with `z.infer<>`
2. **Cache Tags**: Use entity-level (`{ type: 'Moc', id }`) + list-level (`{ type: 'MocList', id: 'LIST' }`)
3. **Optimistic Updates**: Capture state → update cache → wait for API → rollback on error
4. **Import Policy** (CLAUDE.md):
   - Use `@repo/logger` for logging (never `console.log`)
   - Use `createServerlessBaseQuery` from `./base-query`
   - Use Zod from `zod`

### Patterns to Avoid

- ❌ TypeScript `interface` or `type` without Zod schema
- ❌ Direct `console.log` calls
- ❌ Barrel file (`index.ts`) re-exports
- ❌ Hard-coded API URLs (use config)
- ❌ Skipping `transformResponse` validation

---

## Conflict Analysis

**No conflicts detected.**

All checks passed:
- ✅ No overlapping work with active stories (INST-1003, INST-1004 are different layers)
- ✅ No protected area violations (backend routes already exist, this adds frontend layer)
- ✅ No pattern violations (follows Zod-first, RTK Query patterns)
- ✅ No ADR violations (respects API path schema via baseQuery)

---

## Story Seed

### Title
Wire RTK Query Mutations for MOC Instructions API

### Description

**Context**: The Instructions feature has a complete backend API (`apps/api/lego-api/domains/instructions/routes.ts`) with full CRUD operations for MOCs and file management. The frontend API client (`packages/core/api-client/src/rtk/instructions-api.ts`) exists but only includes GET queries (`useGetInstructionsQuery`, `useGetInstructionByIdQuery`, `useToggleInstructionFavoriteMutation`).

Vertical slice stories (INST-1100+) require mutation hooks to create, update, and delete MOCs and files. These mutations must be wired before the UI stories can begin.

**Problem**: Frontend lacks RTK Query mutation hooks for:
- Creating MOCs (`POST /mocs`)
- Updating MOC metadata (`PATCH /mocs/:id`)
- Deleting MOCs (`DELETE /mocs/:id`)
- Uploading files (`POST /mocs/:id/files`)
- Deleting files (`DELETE /mocs/:id/files/:fileId`)

Without these hooks, frontend components cannot mutate data or invalidate caches properly.

**Solution**: Add RTK Query mutation endpoints to `instructions-api.ts` with:
1. Zod schema validation for request/response bodies
2. Cache invalidation tags to refresh queries after mutations
3. Optimistic updates where appropriate (create, reorder)
4. Error handling and rollback on failure
5. Consistent patterns from `wishlist-gallery-api.ts`

This is infrastructure work that enables all vertical slice stories in Phase 1.

### Initial Acceptance Criteria

- [ ] **AC-1**: Add `useCreateMocMutation` hook
  - Query: `POST /mocs`
  - Request validation: `CreateMocInputSchema` from backend types
  - Response validation: `MocInstructionsSchema`
  - Cache invalidation: `['MocList']`
  - Optimistic update: Add temp MOC to list cache before API response

- [ ] **AC-2**: Add `useUpdateMocMutation` hook
  - Query: `PATCH /mocs/:id`
  - Request validation: `UpdateMocInputSchema`
  - Response validation: `MocInstructionsSchema`
  - Cache invalidation: `[{ type: 'Moc', id }, 'MocList']`
  - Optimistic update: Update MOC in cache before API response

- [ ] **AC-3**: Add `useDeleteMocMutation` hook
  - Query: `DELETE /mocs/:id`
  - Response: `void` (204 No Content)
  - Cache invalidation: `[{ type: 'Moc', id }, 'MocList']`
  - Optimistic update: Remove MOC from list cache before API response

- [ ] **AC-4**: Add `useUploadFileMutation` hook
  - Query: `POST /mocs/:id/files` (multipart/form-data)
  - Request: `{ mocId: string, file: File, fileType: FileType }`
  - Response validation: `MocFileSchema`
  - Cache invalidation: `[{ type: 'Moc', id: mocId }, { type: 'MocFile', id: mocId }]`

- [ ] **AC-5**: Add `useDeleteFileMutation` hook
  - Query: `DELETE /mocs/:id/files/:fileId`
  - Response: `void` (204 No Content)
  - Cache invalidation: `[{ type: 'Moc', id: mocId }, { type: 'MocFile', id: fileId }]`

- [ ] **AC-6**: Update `tagTypes` to include `['Moc', 'MocList', 'MocFile']`

- [ ] **AC-7**: Update existing `getInstructions` query to use tag `MocList` (currently uses `InstructionList`)

- [ ] **AC-8**: Update existing `getInstructionById` query to use tag `{ type: 'Moc', id }` (currently uses `{ type: 'Instruction', id }`)

- [ ] **AC-9**: Export all new hooks from `instructions-api.ts`

- [ ] **AC-10**: Add Zod response schemas to `packages/core/api-client/src/schemas/instructions.ts` (create if doesn't exist)

### Non-Goals

- ❌ **UI Components**: This story does NOT create any React components (handled by INST-1100+)
- ❌ **Backend Routes**: Backend API already exists, no changes needed
- ❌ **Presigned Upload Flow**: Direct upload only (presigned handled by INST-1105)
- ❌ **Multipart Upload Sessions**: Session-based uploads handled by INST-1105
- ❌ **E2E Tests**: Infrastructure story, no user-facing UI to test (consuming stories will test E2E)
- ❌ **Database Schema**: No schema changes (tables already exist)
- ❌ **File Storage Logic**: Backend already handles S3 upload/delete

### Reuse Plan

**Components**:
- N/A (infrastructure only)

**Patterns**:
- RTK Query mutation pattern from `wishlist-gallery-api.ts`
- Optimistic update flow from `reorderWishlist` mutation
- Cache tag structure from `useAddWishlistItemMutation`
- Zod schema validation from `transformResponse` pattern

**Packages**:
- `@reduxjs/toolkit/query/react` - RTK Query
- `zod` - Schema validation
- `@repo/logger` - Logging
- `@repo/api-client/rtk/base-query` - Base query utilities

**Existing Code to Modify**:
- `packages/core/api-client/src/rtk/instructions-api.ts` - Add mutations
- `packages/core/api-client/src/schemas/` - Add/update instructions schemas

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

**Unit Tests**:
- Test location: `packages/core/api-client/src/rtk/__tests__/instructions-api.test.ts`
- Test cases:
  - Mutation configs generate correct request URLs and methods
  - Cache tags correctly defined for invalidation
  - Zod schemas validate responses correctly
  - Optimistic updates patch cache before API call
  - Rollback on error restores original cache state

**Integration Tests**:
- Test location: `packages/core/api-client/src/rtk/__tests__/instructions-api.integration.test.ts`
- Framework: Vitest + MSW
- Test cases:
  - MSW handlers return mock responses
  - Mutations invalidate cache and trigger query refetch
  - Optimistic updates reflected in UI state
  - Error responses handled gracefully

**E2E Tests**:
- N/A - Infrastructure story
- **Note**: Consuming stories (INST-1100, INST-1102, etc.) MUST include E2E tests per ADR-006

### For UI/UX Advisor

**Not applicable** - This is an infrastructure story with no UI component.

UI/UX work begins in INST-1100 (View MOC Gallery) and INST-1102 (Create Basic MOC).

### For Dev Feasibility

**Complexity**: Low - straightforward RTK Query mutation wiring following established patterns.

**Dependencies**:
- Backend API: ✅ Already complete
- Schemas: ✅ Exist in backend, need to import/adapt for frontend
- Base query: ✅ Already configured

**Implementation Approach**:
1. Create `packages/core/api-client/src/schemas/instructions.ts` if it doesn't exist
2. Import Zod schemas from backend or define compatible frontend schemas
3. Add mutation endpoints to `instructions-api.ts` following wishlist pattern
4. Configure cache tags and invalidation logic
5. Add optimistic update logic for create/update/delete operations
6. Export mutation hooks
7. Write unit tests for mutation configs
8. Write integration tests with MSW handlers

**Estimated Effort**: 4-6 hours (includes tests)

**Risks**:
- ⚠️ **Path mismatch**: Frontend expects `/api/v2/mocs`, backend provides `/mocs` → Mitigate with Vite proxy config
- ⚠️ **Schema drift**: Backend schemas may evolve → Mitigate by importing from backend types or keeping aligned
- ⚠️ **Cache invalidation bugs**: Incorrect tags won't refresh UI → Mitigate with thorough integration tests

**Blockers**:
- None - backend complete, schemas exist, patterns established

**Technical Decisions**:
1. **File Upload**: Use `FormData` for multipart upload (follow `uploadGalleryImage` pattern from gallery-api.ts)
2. **Optimistic Updates**: Use for create/update/delete to improve perceived performance
3. **Cache Tags**: Follow wishlist pattern - entity-level + list-level tags
4. **Error Handling**: Rollback optimistic updates on error, log failures

**Config Considerations**:
- Vite proxy must rewrite `/api/v2/mocs` → `/mocs` (check `apps/web/main-app/vite.config.ts`)
- MSW handlers must match frontend paths (`/api/v2/mocs`) for integration tests
- Ensure `VITE_SERVERLESS_API_BASE_URL` is set correctly in env
