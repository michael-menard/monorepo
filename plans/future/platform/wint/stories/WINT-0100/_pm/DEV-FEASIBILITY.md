# Dev Feasibility: WINT-0100 - Create Context Cache MCP Tools

**Generated**: 2026-02-16
**Story**: WINT-0100
**Epic**: WINT (Winter - AI Platform Workflow Integration)
**Confidence**: High

---

## Feasibility Summary

**Feasible for MVP**: Yes

**Confidence**: High

**Why**:
- Direct pattern reuse from WINT-0110 (Session Management MCP Tools) - same tech stack, same package, same testing approach
- Table schema already deployed and protected (WINT-0010) - no schema changes needed
- Drizzle ORM supports upsert with composite unique indexes via `.onConflictDoUpdate({ target: [table.packType, table.packKey] })`
- All required packages already in use (@repo/db, @repo/logger, drizzle-orm, drizzle-zod, zod)
- JSONB operations well-supported in PostgreSQL and Drizzle
- No external dependencies or new infrastructure required
- Clear acceptance criteria with testable outcomes
- Established error handling pattern (log warnings, return null) proven in WINT-0110

---

## Likely Change Surface (Core Only)

### Packages Modified

**Primary Package**: `packages/backend/mcp-tools`

**New Files**:
- `src/context-cache/__types__/index.ts` - Zod schemas for tool inputs
- `src/context-cache/context-cache-get.ts` - Retrieval tool implementation
- `src/context-cache/context-cache-put.ts` - Create/update tool implementation
- `src/context-cache/context-cache-invalidate.ts` - Invalidation tool implementation
- `src/context-cache/context-cache-stats.ts` - Statistics tool implementation
- `src/context-cache/__tests__/context-cache-get.test.ts` - Get tests
- `src/context-cache/__tests__/context-cache-put.test.ts` - Put tests
- `src/context-cache/__tests__/context-cache-invalidate.test.ts` - Invalidate tests
- `src/context-cache/__tests__/context-cache-stats.test.ts` - Stats tests
- `src/context-cache/__tests__/integration.test.ts` - Workflow integration test

**Modified Files**:
- `src/index.ts` - Export new context cache tools

**Estimated File Count**: 10 new files, 1 modified file

---

### Database Surface

**Tables Accessed**:
- `wint.contextPacks` (read, write, update, delete)

**Operations**:
- SELECT with WHERE (packType, packKey), expiresAt checks
- INSERT with JSONB content
- UPDATE with upsert pattern, hitCount increment, soft delete (expiresAt update)
- DELETE for hard invalidation
- Aggregate queries (COUNT, SUM, AVG) for statistics

**Indexes Used**:
- Unique composite index: (packType, packKey)
- Index on expiresAt for expiration filtering
- Index on lastHitAt for age-based invalidation
- Index on packType for type-filtered queries

**No Schema Changes Required** - table deployed and protected per WINT-0010

---

### Deployment Touchpoints

**CI/CD**: None (code changes only, no infrastructure)

**Environment Variables**: None (uses existing database connection from @repo/db)

**Database Migrations**: None (schema already deployed)

**Dependencies**: None (all packages already in pnpm-lock.yaml)

---

## MVP-Critical Risks

### Risk 1: Upsert Pattern with Composite Unique Index

**Why it might block MVP**:
If Drizzle ORM's `.onConflictDoUpdate()` doesn't properly handle the composite unique index (packType, packKey), the put operation will fail on duplicate key errors instead of updating existing rows.

**Required mitigation**:
- Write comprehensive upsert test early (Test 2 in test plan)
- Verify Drizzle syntax: `.onConflictDoUpdate({ target: [contextPacks.packType, contextPacks.packKey], set: { content, version, expiresAt } })`
- If Drizzle limitation found, fallback to manual SELECT-then-INSERT-or-UPDATE pattern
- Estimated mitigation effort: 1-2 hours (low probability, well-documented Drizzle feature)

---

### Risk 2: Concurrent Hit Count Increments

**Why it might block MVP**:
If hitCount updates use read-modify-write pattern instead of atomic increment, concurrent `context_cache_get` calls may lose increments, corrupting cache effectiveness metrics.

**Required mitigation**:
- Use SQL-level increment: `UPDATE SET hitCount = hitCount + 1` instead of reading current value and writing new value
- Drizzle syntax: `.set({ hitCount: sql`${contextPacks.hitCount} + 1` })`
- Test with concurrent access (Edge Case 2 in test plan)
- Estimated mitigation effort: 2 hours (straightforward SQL pattern)

---

### Risk 3: Expired Pack Filtering in GET Operation

**Why it might block MVP**:
If expiresAt filtering is incorrect, expired packs may be returned to callers, defeating the cache expiration mechanism and potentially injecting stale context into agent prompts.

**Required mitigation**:
- WHERE clause must include: `AND expiresAt > NOW()`
- Test boundary conditions (Test 5, Edge 6 in test plan)
- Verify timezone handling (PostgreSQL NOW() vs JavaScript Date.now())
- Estimated mitigation effort: 1 hour (careful WHERE clause validation)

---

## Missing Requirements for MVP

### Missing Requirement 1: Default TTL Value

**Concrete decision needed**:
What is the default TTL when `context_cache_put` is called without explicit ttl parameter?

**PM must specify**:
- Recommended: 7 days (604800 seconds) for general context packs
- Alternative: 24 hours (86400 seconds) for more aggressive expiration
- Rationale: Balance between cache effectiveness and staleness risk

**Impact if not decided**:
Implementation blocked on default value selection.

---

### Missing Requirement 2: Soft Delete vs Hard Delete Default

**Concrete decision needed**:
Should `context_cache_invalidate` default to soft delete (update expiresAt) or hard delete (physical DELETE)?

**PM must specify**:
- Recommended: Soft delete by default (update expiresAt to past), with explicit `hardDelete: true` flag for physical deletion
- Rationale: Preserves audit trail, allows recovery, safer default
- Trade-off: Database growth over time, requires periodic cleanup

**Impact if not decided**:
Implementation can proceed with recommended soft delete default, but should be confirmed to avoid rework.

---

## MVP Evidence Expectations

### Proof of Work

**Required Evidence**:
1. **All 4 tools operational**:
   - `context_cache_get` retrieves valid packs, returns null for expired/missing
   - `context_cache_put` creates and updates packs with upsert
   - `context_cache_invalidate` soft deletes or hard deletes matching packs
   - `context_cache_stats` returns accurate aggregate metrics

2. **Test coverage ≥80%**:
   - Vitest coverage report showing line coverage
   - All happy path, error cases, edge cases passing

3. **Integration workflow test**:
   - Put → Get → Invalidate → Get (null) sequence
   - Demonstrates end-to-end cache lifecycle

4. **Database state verification**:
   - Manual PostgreSQL queries confirm:
     - Upsert creates/updates correctly
     - Hit counts increment accurately
     - Expiration filtering works
     - Stats aggregation correct

---

### Critical CI/Deploy Checkpoints

**CI Gates** (must pass):
- TypeScript compilation (pnpm check-types)
- ESLint (pnpm lint)
- All tests passing (pnpm test packages/backend/mcp-tools)
- Coverage threshold ≥80%

**Deploy Gates** (N/A for this story):
- No deployment changes (code-only story)
- No environment variables
- No database migrations

---

## Implementation Estimate

**Effort**: 10-14 hours

**Breakdown**:
- Zod schemas (__types__): 1 hour
- context_cache_get: 2 hours (including tests)
- context_cache_put: 3 hours (upsert complexity, including tests)
- context_cache_invalidate: 2 hours (soft vs hard delete, including tests)
- context_cache_stats: 2 hours (aggregate queries, including tests)
- Integration test: 1 hour
- Documentation + exports: 1 hour
- Buffer for edge cases: 2 hours

**Comparison to WINT-0110** (Session Management MCP Tools):
- WINT-0110: 12-16 hours (5 tools, CRUD operations)
- WINT-0100: 10-14 hours (4 tools, upsert adds complexity but fewer tools overall)
- Confidence: High (direct pattern reuse, same developer, same package)

---

## Reuse Plan

### Components to Reuse

**From WINT-0110 (Session Management MCP Tools)**:

1. **Directory Structure**:
   ```
   src/context-cache/
     __types__/index.ts
     __tests__/
     context-cache-get.ts
     context-cache-put.ts
     context-cache-invalidate.ts
     context-cache-stats.ts
   ```

2. **Zod Validation Pattern**:
   ```typescript
   import { z } from 'zod'

   export const ContextCacheGetInputSchema = z.object({
     packType: z.string().min(1),
     packKey: z.string().min(1)
   })

   export type ContextCacheGetInput = z.infer<typeof ContextCacheGetInputSchema>
   ```

3. **Error Handling Pattern** (from session-create.ts):
   ```typescript
   import { logger } from '@repo/logger'

   export async function contextCacheGet(input: ContextCacheGetInput) {
     try {
       const validated = ContextCacheGetInputSchema.parse(input)
       // ... database operation
     } catch (error) {
       logger.warn('Context cache get failed', { error })
       return null
     }
   }
   ```

4. **Database Access Pattern**:
   ```typescript
   import { db } from '@repo/db'
   import { contextPacks } from '@repo/db/schema'

   const result = await db.select()
     .from(contextPacks)
     .where(/* conditions */)
   ```

5. **Test Setup Pattern** (PostgreSQL database):
   ```typescript
   import { describe, it, expect, beforeEach } from 'vitest'
   import { db } from '@repo/db'
   import { contextPacks } from '@repo/db/schema'

   beforeEach(async () => {
     await db.delete(contextPacks) // Clean database
   })
   ```

6. **Auto-generated Type Usage**:
   ```typescript
   import type { SelectContextPack } from '@repo/db/schema'

   export function contextCacheGet(): Promise<SelectContextPack | null> {
     // ...
   }
   ```

---

### Packages to Leverage

- **@repo/db**: Database connection, schema exports, drizzle-zod types
- **@repo/logger**: Structured logging (replaces console.log)
- **drizzle-orm**: Type-safe queries, upsert, aggregate functions
- **drizzle-zod**: Auto-generated Zod schemas for database tables
- **zod**: Input validation, type inference

**All packages already installed** - no pnpm add required.

---

**DEV-FEASIBILITY COMPLETE**
