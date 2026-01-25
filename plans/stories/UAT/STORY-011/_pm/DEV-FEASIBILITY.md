# STORY-011: Dev Feasibility Review

## Summary

**FEASIBLE with MODERATE complexity.** The migration follows well-established patterns from gallery-core and sets-core. The main complexity lies in the comprehensive MOC data model (50+ fields, 7+ JSONB columns) and the dual-access pattern (owner vs. public) in the get-moc endpoint. OpenSearch deferral to PostgreSQL simplifies scope significantly.

## Code Surface Analysis

### New Files to Create

| Path | Purpose |
|------|---------|
| `packages/backend/moc-instructions-core/package.json` | Package configuration with Zod, drizzle-orm deps |
| `packages/backend/moc-instructions-core/tsconfig.json` | TypeScript config extending base |
| `packages/backend/moc-instructions-core/src/index.ts` | Package barrel exports |
| `packages/backend/moc-instructions-core/src/__types__/index.ts` | Zod schemas for MOC operations (may reuse @repo/api-types/moc) |
| `packages/backend/moc-instructions-core/src/get-moc.ts` | Get single MOC with ownership-aware response |
| `packages/backend/moc-instructions-core/src/list-mocs.ts` | List MOCs with pagination, search, filtering |
| `packages/backend/moc-instructions-core/src/get-moc-stats-by-category.ts` | Stats by theme/tags |
| `packages/backend/moc-instructions-core/src/get-moc-uploads-over-time.ts` | Time-series upload data |
| `packages/backend/moc-instructions-core/src/__tests__/get-moc.test.ts` | Unit tests with mock DB |
| `packages/backend/moc-instructions-core/src/__tests__/list-mocs.test.ts` | Unit tests with mock DB |
| `packages/backend/moc-instructions-core/src/__tests__/get-moc-stats-by-category.test.ts` | Unit tests |
| `packages/backend/moc-instructions-core/src/__tests__/get-moc-uploads-over-time.test.ts` | Unit tests |
| `apps/api/platforms/vercel/api/mocs/[id].ts` | GET /api/mocs/:id handler |
| `apps/api/platforms/vercel/api/mocs/list.ts` | GET /api/mocs handler |
| `apps/api/platforms/vercel/api/mocs/stats/by-category.ts` | GET /api/mocs/stats/by-category |
| `apps/api/platforms/vercel/api/mocs/stats/uploads-over-time.ts` | GET /api/mocs/stats/uploads-over-time |

### Files to Modify

| Path | Change |
|------|--------|
| `packages/backend/db/src/index.ts` | May need to export mocInstructions, mocFiles schemas if not already |
| `pnpm-lock.yaml` | Auto-updated when adding new package |
| `turbo.json` | May need task pipeline for new package (optional) |

## Reuse Assessment

### From Existing AWS Handlers

| Source | Reusable? | Notes |
|--------|-----------|-------|
| `moc-service.ts:listMocs()` | **YES** | Core query logic reusable: pagination, search (ILIKE fallback), tag filtering. Remove OpenSearch calls. |
| `moc-service.ts:getMocDetail()` | **PARTIAL** | Authorization logic reusable. Eager loading pattern (files, gallery images, parts lists) transfers well. |
| `get/handler.ts` (dedicated GET) | **YES** | Ownership-aware URL generation pattern (presigned vs CDN) is valuable reference. |
| `get-stats/handler.ts` | **YES** | Theme/tag aggregation queries are straightforward SQL. |
| `get-uploads-over-time/handler.ts` | **YES** | DATE_TRUNC grouping query is portable. |
| `opensearch-moc.ts` | **NO** | Deferred per story scope - use PostgreSQL ILIKE. |
| Response schemas | **YES** | `@repo/api-types/moc` already has comprehensive Zod schemas. |

### From Shared Packages

| Package | Usage |
|---------|-------|
| `@repo/api-types/moc` | Import existing Zod schemas (MocInstructionSchema, MocListQuerySchema, etc.) |
| `@repo/vercel-adapter` | Use `getJwtClaims()` for optional auth extraction |
| `@repo/logger` | Use for consistent logging |
| `packages/backend/db` | Import schema definitions (mocInstructions, mocFiles, galleryImages, etc.) |

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| **Complex ownership logic in get-moc** | MEDIUM | The AWS handler has intricate logic: published MOCs visible to anyone, drafts only to owner, presigned URLs for owners, CDN URLs for others. Need careful port to core function with clear isOwner parameter. |
| **Large data model (50+ fields)** | LOW | Existing `@repo/api-types/moc` has complete Zod schemas. Reuse directly - no new schema creation needed. |
| **JSONB column handling** | LOW | Drizzle handles JSONB well. Existing schema in `packages/backend/db/src/schema.ts` already defines `$type<>` for all JSONB fields. |
| **S3 presigned URL generation** | MEDIUM | The owner-access presigned URL logic in AWS handler uses `@aws-sdk/s3-request-presigner`. For Vercel, may need to defer to a simpler approach (CDN-only) or add AWS SDK as dependency. |
| **PostgreSQL search performance** | LOW | With OpenSearch deferred, ILIKE searches on title/description are acceptable for MVP. Existing indexes (`idx_moc_instructions_title`) help. |
| **Auth bypass for local dev** | LOW | Follow existing Vercel handler pattern using `AUTH_BYPASS` env var. |
| **Inline schema duplication in Vercel handlers** | LOW | Current pattern duplicates schema in each handler. Follow existing convention but consider future refactor. |

## Missing AC / Gaps

1. **Presigned URL handling not specified**: The AWS handler generates presigned S3 URLs for owners (24h TTL). Story should clarify if this is required for Vercel migration or if CDN URLs suffice for MVP.

2. **Cache invalidation not mentioned**: AWS handlers reference Redis caching (5-10 min TTL). Story should clarify if caching is deferred or required.

3. **Error response format not specified**: Need to ensure Vercel handlers return consistent error format matching AWS (`{ error: string, message: string }`).

4. **Soft-delete filtering**: The `mocFiles` table has `deletedAt` column. Existing AWS handler filters `WHERE deletedAt IS NULL`. Ensure this is preserved.

5. **isOwner field in response**: GET /api/mocs/:id should return `isOwner: boolean` to indicate ownership. Frontend may depend on this.

6. **Search endpoint scope**: Is search via query param on list endpoint only, or is there a dedicated search endpoint?

## Recommended AC Additions

### For GET /api/mocs/:id

```markdown
- [ ] Return `isOwner: boolean` in response to indicate ownership
- [ ] Published MOCs visible to anyone (anonymous or authenticated)
- [ ] Draft/archived MOCs return 404 for non-owners (prevent existence leak)
- [ ] Owner responses include full file URLs (CDN for MVP, defer presigned URLs)
- [ ] Non-owner responses include CDN URLs only
- [ ] Exclude soft-deleted files (`deletedAt IS NULL` filter)
- [ ] Include eager-loaded: files, gallery images, parts lists
```

### For GET /api/mocs (List)

```markdown
- [ ] Support pagination: `page` (default 1), `limit` (default 20, max 100)
- [ ] Support search via `search` query param (PostgreSQL ILIKE on title, description)
- [ ] Support tag filtering via `tag` query param
- [ ] Return only authenticated user's MOCs (userId filter required)
- [ ] Sort by `updatedAt DESC` (most recent first)
- [ ] Response includes `total` count for pagination
```

### For Stats Endpoints

```markdown
- [ ] Both stats endpoints require authentication (no anonymous access)
- [ ] Return stats only for authenticated user's MOCs
- [ ] GET /api/mocs/stats/by-category returns top 10 categories by count
- [ ] GET /api/mocs/stats/uploads-over-time returns last 12 months of data
```

### Test Coverage

```markdown
- [ ] Unit tests for each core function with mock DB client
- [ ] Test ownership scenarios (owner vs. non-owner access)
- [ ] Test pagination edge cases (empty results, last page)
- [ ] Test search with special characters
- [ ] Test stats with no data
```

## Blockers

None identified. All dependencies are available:
- `@repo/api-types/moc` exists with complete schemas
- `packages/backend/db` has schema definitions
- Pattern established by gallery-core and sets-core
- Vercel deployment infrastructure in place

## Implementation Notes

### Recommended Approach

1. **Start with list-mocs.ts** - Most straightforward, follows list-albums.ts pattern closely
2. **Then get-moc.ts** - Port ownership logic carefully, defer presigned URLs to future story
3. **Then stats endpoints** - Simple aggregation queries
4. **Finally Vercel handlers** - Wire up core functions to HTTP layer

### Database Client Interface Pattern

Follow the gallery-core pattern with minimal DB interface for testability:

```typescript
export interface ListMocsDbClient {
  select: (fields: Record<string, unknown>) => {
    from: (table: unknown) => {
      where: (condition: unknown) => Promise<Array<{ count: number }>> & {
        orderBy: (...orders: unknown[]) => {
          limit: (n: number) => {
            offset: (n: number) => Promise<MocRow[]>
          }
        }
      }
    }
  }
}
```

### Type Reuse Strategy

Rather than duplicating types in `moc-instructions-core/__types__`, import directly from `@repo/api-types/moc`:

```typescript
import {
  MocInstructionSchema,
  MocListQuerySchema,
  MocDetailResponse,
  type MocInstruction
} from '@repo/api-types/moc'
```

Create only operation-specific types (filters, DB row shapes) in the core package.
