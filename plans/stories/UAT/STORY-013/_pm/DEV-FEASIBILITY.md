# DEV-FEASIBILITY: STORY-013 - MOC Instructions Edit (No Files)

## Summary

**Risk Level: LOW**

This story is a straightforward 1:1 port of the existing AWS Lambda handler to Vercel. The AWS handler is well-tested (27 test cases), has clear validation logic, and follows established patterns. No new business logic is introduced.

---

## Change Surface

### Files to Create

| File | Description | Complexity |
|------|-------------|------------|
| `apps/api/platforms/vercel/api/mocs/[id]/edit.ts` | Vercel handler for PATCH | Low |

### Files to Modify

| File | Description | Complexity |
|------|-------------|------------|
| `apps/api/platforms/vercel/vercel.json` | Add route rewrite | Low |
| `__http__/mocs.http` | Add PATCH request examples | Low |

### Files to Reference (No Changes)

| File | Purpose |
|------|---------|
| `apps/api/platforms/aws/endpoints/moc-instructions/edit/handler.ts` | Source of truth for behavior |
| `packages/core/upload-types/src/slug.ts` | `findAvailableSlug` function |
| `apps/api/platforms/vercel/api/mocs/[id].ts` | Handler structure pattern |

---

## Dependencies Analysis

### External Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| `@repo/upload-types` | EXISTS | Exports `findAvailableSlug` for slug conflict resolution |
| `@repo/logger` | EXISTS | Logging |
| `pg` + `drizzle-orm/node-postgres` | EXISTS | Database access |

### Internal Dependencies

| Dependency | Status | Notes |
|------------|--------|-------|
| `mocInstructions` table | EXISTS | Schema already defined |
| Auth bypass pattern | EXISTS | DEV_USER_SUB / AUTH_BYPASS env vars |
| Response helpers | INLINE | Use inline response patterns per STORY-011/012 |

### OpenSearch Dependency

**Decision: SKIP for Vercel MVP**

The AWS handler calls `updateMocIndex()` after successful update for OpenSearch re-indexing. However:

1. STORY-011 explicitly deferred OpenSearch integration
2. The AWS implementation is already fail-open (doesn't throw on error)
3. Vercel MVP uses PostgreSQL ILIKE for search

**Recommendation**: Do NOT include OpenSearch re-indexing in Vercel handler. Document as intentional omission. Reconciliation job will catch up when OpenSearch integration is added.

---

## Risk Analysis

### Low Risks

| Risk | Mitigation |
|------|------------|
| Handler structure differs from AWS | Follow STORY-011/012 Vercel patterns |
| Slug conflict detection logic | Reuse `findAvailableSlug` from `@repo/upload-types` |
| Validation schema differences | Port Zod schemas directly from AWS handler |

### Zero Risks (Already Solved)

| Item | Status |
|------|--------|
| Auth bypass for local dev | Pattern established in STORY-011 |
| Database connection singleton | Pattern established in STORY-011 |
| Route configuration | Pattern established in STORY-011/012 |

---

## Implementation Approach

### Recommended Pattern

1. **Copy Zod schemas** from AWS handler (PatchMocRequestSchema, PatchMocResponseSchema)
2. **Follow STORY-011 structure**: Inline DB schema, singleton pattern, AUTH_BYPASS
3. **Reuse slug utility**: Import `findAvailableSlug` from `@repo/upload-types`
4. **Skip OpenSearch**: Intentional omission per STORY-011 decision

### Handler Flow

```
1. Validate method is PATCH (405 otherwise)
2. Extract userId from auth (401 if missing)
3. Parse and validate request body (400 on validation failure)
4. Check MOC exists and ownership (404/403)
5. If slug change: check uniqueness (409 with suggestion if conflict)
6. Update database with provided fields + updatedAt
7. Return updated MOC
```

---

## AC Coverage Assessment

All ACs are implementable without blockers:

| AC | Feasibility | Notes |
|----|-------------|-------|
| Auth required | YES | Pattern from STORY-011 |
| Ownership check | YES | Same pattern as GET |
| Validation | YES | Port Zod schemas |
| Slug conflict | YES | Use `findAvailableSlug` |
| Partial updates | YES | Standard Drizzle pattern |
| Response format | YES | Port response schema |

---

## Missing AC / Gaps

**None identified.** The story scope is well-defined and matches the existing AWS implementation.

---

## Blockers

**None.** This story is ready for implementation.

---

## Recommendations for PM

1. **No core package extraction**: Keep handler inline per STORY-011/012 pattern
2. **No OpenSearch re-indexing**: Document as intentional omission
3. **Seed data**: Existing seed is sufficient (has editable MOCs for dev-user)
4. **HTTP contracts**: Add 10 PATCH requests to `mocs.http`
