# Backend Implementation Log - INST-1101

Story: View MOC Details
Timestamp: 2026-02-06T21:45:00Z
Agent: dev-implement-implementation-leader

## Status
IN PROGRESS

## Implementation Progress

### Step 1: Define Zod schemas for GET /mocs/:id (PLAN step 1)

**Objective**: Define GetMocDetailResponse schema with MOC metadata, files array, and stats (AC-13, AC-14, AC-15)

**Analysis**:
- `MocInstructionsSchema` already exists in packages/core/api-client/src/schemas/instructions.ts
- `MocFileSchema` already exists
- Need to create `GetMocDetailResponseSchema` that combines these with stats

**Files to modify**:
- `packages/core/api-client/src/schemas/instructions.ts` - Add GetMocDetailResponseSchema
- `packages/core/api-client/src/schemas/index.ts` - Export new schema

**Implementation starting**...

**Files Modified**:
1. `packages/core/api-client/src/schemas/instructions.ts`
   - Added `MocDetailFileSchema` for file metadata with downloadUrl (AC-14)
   - Added `MocStatsSchema` for pieceCount and fileCount (AC-15)
   - Added `GetMocDetailResponseSchema` for complete MOC detail response (AC-13)

2. `packages/core/api-client/src/schemas/index.ts`
   - Exported new schemas and types: `MocDetailFileSchema`, `MocStatsSchema`, `GetMocDetailResponseSchema`
   - Exported inferred types: `MocDetailFile`, `MocStats`, `GetMocDetailResponse`

**Schema Structure**:
```typescript
GetMocDetailResponse = {
  id, userId, title, description, theme, tags, thumbnailUrl,
  createdAt, updatedAt,
  files: MocDetailFile[], // name, size, type, uploadedAt, downloadUrl
  stats: MocStats         // pieceCount, fileCount
}
```

**Fast-fail verification**: ✓ Type check passed for @repo/api-client

**Reuse compliance**:
- Reused: Zod schema patterns from existing wishlist.ts and instructions.ts
- New: `GetMocDetailResponseSchema` - new API endpoint requires new response schema
- Why necessary: GET /mocs/:id returns different shape than list endpoint (includes full file metadata and stats)

**Notes**:
- Schemas follow Zod-first pattern per CLAUDE.md
- downloadUrl field included for future file download story (INST-1107)
- Type transformations applied for Date fields (createdAt, updatedAt, uploadedAt)

---

### Step 2: Add getMocById to MocRepository (PLAN step 2)

**Objective**: Add getMocById method to MocRepository port and Drizzle adapter (AC-17, AC-18, AC-22)

**Files to check**:
- apps/api/lego-api/domains/mocs/ports/index.ts
- apps/api/lego-api/domains/mocs/adapters/repositories.ts

**Files Modified**:
1. `apps/api/lego-api/domains/mocs/ports/index.ts`
   - Added `MocFile` interface for file metadata
   - Added `MocWithFiles` interface extending Moc with files array and totalPieceCount (AC-18, AC-19, AC-22)
   - Added `getMocById(id, userId)` method signature to MocRepository interface

2. `apps/api/lego-api/domains/mocs/adapters/repositories.ts`
   - Implemented `getMocById` using Drizzle query builder (AC-17)
   - Query filters by id AND userId for authorization (AC-17)
   - Uses `.with({ files })` for automatic join with moc_files table (AC-18)
   - Filters out soft-deleted files with `isNull(files.deletedAt)` (AC-19)
   - Maps file rows to MocFile interface with all required metadata (AC-19)
   - Returns MocWithFiles with full file details

**Query Structure**:
```typescript
db.query.mocInstructions.findFirst({
  where: and(eq(id), eq(userId)),  // Authorization check
  with: { files: { where: isNull(deletedAt) } }  // Join + filter
})
```

**Fast-fail verification**: ✓ Type check passed - no errors in domains/mocs/**

**Reuse compliance**:
- Reused: Drizzle ORM patterns from existing repository methods (create, findBySlug)
- Reused: Drizzle relations defined in database schema (mocInstructions.files)
- New: `getMocById` method - new query pattern for fetching MOC with related files
- Why necessary: GET /mocs/:id endpoint requires fetching MOC with all file metadata

**Ports & Adapters**:
- Port (interface): `MocRepository.getMocById` defines contract
- Adapter (implementation): Drizzle query implementation in `createMocRepository`
- Business logic stays in port interface, data access in adapter

**Notes**:
- Used Drizzle relational query API for clean syntax
- Soft-delete support via `isNull(deletedAt)` filter
- Authorization enforced at repository layer (userId filter)
- Returns null for non-existent or unauthorized MOCs (security best practice per ARCH-003)

---

## Checkpoint - Steps 1-2 Complete

**Completed**: 
- ✓ Step 1: Zod schemas in api-client 
- ✓ Step 2: getMocById in repository

**Type Check Status**: PASSING (mocs domain)

**Next Steps**:
- Step 3: Add getMoc to MocService
- Step 4: Add GET /mocs/:id route handler
- Step 5: Add response types to backend types.ts
- Step 12: Service tests

**Risk Assessment**: LOW - following established patterns, no architectural decisions needed

