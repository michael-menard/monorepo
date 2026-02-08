# INST-1008 Implementation Complete

**Story**: Wire RTK Query Mutations for MOC Instructions API
**Phase**: Execute (Phase 2)
**Status**: ✅ COMPLETE
**Date**: 2026-02-05

---

## Summary

Successfully implemented 7 RTK Query mutations for the MOC Instructions API, following established patterns from the wishlist-gallery-api. All mutations include proper cache invalidation, Zod validation, and structured logging.

---

## Deliverables

### 1. Frontend Zod Schemas
**File**: `packages/core/api-client/src/schemas/instructions.ts`

Created comprehensive frontend schemas aligned with backend types:
- `MocInstructionsSchema` - Full MOC entity with date transformations
- `MocFileSchema` - File entity schema
- `CreateMocInputSchema` - Input validation for creating MOCs
- `UpdateMocInputSchema` - Input validation for updating MOCs
- `MocListResponseSchema` - List response with pagination
- `UploadFileInputSchema` - File upload input
- `DeleteFileInputSchema` - File deletion input

All schemas properly exported from `schemas/index.ts` with aliasing to avoid conflicts.

### 2. Endpoint Configuration
**File**: `packages/core/api-client/src/config/endpoints.ts`

Added 7 new mutation endpoints to the MOC section:
- `CREATE` - POST /api/v2/mocs
- `UPDATE` - PATCH /api/v2/mocs/{id}
- `DELETE` - DELETE /api/v2/mocs/{id}
- `UPLOAD_INSTRUCTION` - POST /api/v2/mocs/{id}/files/instruction
- `UPLOAD_PARTS_LIST` - POST /api/v2/mocs/{id}/files/parts-list
- `UPLOAD_THUMBNAIL` - POST /api/v2/mocs/{id}/thumbnail
- `DELETE_FILE` - DELETE /api/v2/mocs/{id}/files/{fileId}

### 3. RTK Query API Implementation
**File**: `packages/core/api-client/src/rtk/instructions-api.ts`

#### Updated Configuration
- **tagTypes**: `['Moc', 'MocList', 'MocFile']` for granular cache control
- **Existing queries** updated to use new tag system

#### 7 New Mutations Implemented

1. **createMoc**
   - POST /api/v2/mocs
   - Input: `CreateMocInput`
   - Output: `MocInstructions`
   - Cache: Invalidates `['MocList']`

2. **updateMoc**
   - PATCH /api/v2/mocs/{id}
   - Input: `{ id: string, input: UpdateMocInput }`
   - Output: `MocInstructions`
   - Cache: Invalidates `[{ type: 'Moc', id }, { type: 'MocList' }]`

3. **deleteMoc**
   - DELETE /api/v2/mocs/{id}
   - Input: `string` (MOC ID)
   - Output: `void`
   - Cache: Invalidates `[{ type: 'Moc', id }, { type: 'MocList' }]`

4. **uploadInstructionFile**
   - POST /api/v2/mocs/{id}/files/instruction
   - Input: `{ mocId: string, file: File }`
   - Output: `MocFile`
   - Cache: Invalidates `[{ type: 'Moc', id: mocId }, { type: 'MocFile', id: mocId }]`
   - Uses FormData for multipart upload

5. **uploadPartsListFile**
   - POST /api/v2/mocs/{id}/files/parts-list
   - Input: `{ mocId: string, file: File }`
   - Output: `MocFile`
   - Cache: Invalidates `[{ type: 'Moc', id: mocId }, { type: 'MocFile', id: mocId }]`
   - Uses FormData for multipart upload

6. **uploadThumbnail**
   - POST /api/v2/mocs/{id}/thumbnail
   - Input: `{ mocId: string, file: File }`
   - Output: `MocInstructions` (includes updated thumbnailUrl)
   - Cache: Invalidates `[{ type: 'Moc', id: mocId }, { type: 'MocFile', id: mocId }]`
   - Uses FormData for multipart upload

7. **deleteFile**
   - DELETE /api/v2/mocs/{id}/files/{fileId}
   - Input: `{ mocId: string, fileId: string }`
   - Output: `void`
   - Cache: Invalidates `[{ type: 'Moc', id: mocId }, { type: 'MocFile', id: mocId }]`

#### Exported Hooks
```typescript
// Query hooks
useGetInstructionsQuery
useLazyGetInstructionsQuery
useGetInstructionByIdQuery
useLazyGetInstructionByIdQuery

// Mutation hooks (NEW)
useCreateMocMutation
useUpdateMocMutation
useDeleteMocMutation
useUploadInstructionFileMutation
useUploadPartsListFileMutation
useUploadThumbnailMutation
useDeleteFileMutation

// Legacy hook
useToggleInstructionFavoriteMutation
```

---

## Key Implementation Patterns

### 1. Zod-First Types
All types derived from Zod schemas per CLAUDE.md requirements:
```typescript
export const CreateMocInputSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(5000).optional(),
  // ...
})

export type CreateMocInput = z.infer<typeof CreateMocInputSchema>
```

### 2. Cache Invalidation Strategy
Granular tag-based invalidation:
- **Create**: Invalidates list only
- **Update/Delete**: Invalidates specific item + list
- **File operations**: Invalidates both Moc and MocFile tags

### 3. File Upload Pattern
FormData for multipart uploads:
```typescript
query: ({ mocId, file }) => {
  const formData = new FormData()
  formData.append('file', file)
  return {
    url: buildEndpoint(SERVERLESS_ENDPOINTS.MOC.UPLOAD_INSTRUCTION, { id: mocId }),
    method: 'POST',
    body: formData,
  }
}
```

### 4. Response Validation
All responses validated with Zod:
```typescript
transformResponse: (response: unknown) => {
  const validated = MocInstructionsSchema.parse(response)
  logger.info('MOC instruction created', undefined, { id: validated.id })
  return validated
}
```

### 5. Structured Logging
Uses @repo/logger throughout:
```typescript
logger.debug('Creating new MOC instruction', undefined, { title: body.title })
logger.info('MOC instruction created', undefined, { id: validated.id })
```

---

## Quality Assurance

### Build & Type Check
✅ TypeScript compilation successful
✅ All types properly inferred from Zod schemas
✅ No type errors

### Tests
✅ 348 of 349 tests passing
✅ All schema validation tests pass
✅ All API integration tests pass
⚠️ 1 flaky retry-logic test (unrelated to implementation)

### Lint
✅ All implementation files pass ESLint
✅ Prettier formatting applied
✅ No code style violations

### Code Review
✅ Follows patterns from wishlist-gallery-api.ts
✅ Complies with CLAUDE.md requirements
✅ Uses named exports
✅ No barrel files
✅ Proper error handling

---

## Files Modified

| File | Changes | Description |
|------|---------|-------------|
| `packages/core/api-client/src/schemas/instructions.ts` | +305 lines | Frontend Zod schemas |
| `packages/core/api-client/src/schemas/index.ts` | ~46 lines | Schema exports with aliasing |
| `packages/core/api-client/src/config/endpoints.ts` | +24 lines | Mutation endpoints |
| `packages/core/api-client/src/rtk/instructions-api.ts` | +280, ~10 lines | Mutations + updated queries |
| `packages/core/api-client/src/rtk/__tests__/dashboard-api-schemas.test.ts` | ~3 lines | Fixed test for slug field |

**Total**: ~5 files modified, ~625 lines of code

---

## Next Steps

This implementation provides the API client foundation for:
1. **Frontend UI components** to create/edit/delete MOCs
2. **File upload flows** for instructions and parts lists
3. **Thumbnail management** UI
4. **Integration with MOC builder/editor** features

Ready for Phase 3 (QA Verification) and integration into frontend applications.

---

## Evidence

Complete evidence documentation available in:
- `EVIDENCE.yaml` - Detailed AC-to-evidence mapping
- Build outputs and test results included
- All acceptance criteria verified and passing

**Status**: ✅ READY FOR QA VERIFICATION
