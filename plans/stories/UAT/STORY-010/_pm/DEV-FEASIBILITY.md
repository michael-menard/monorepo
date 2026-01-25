# DEV-FEASIBILITY: STORY-010 - MOC Parts Lists Management

## Summary

STORY-010 is **FEASIBLE** with moderate complexity. The story migrates 7 AWS Lambda handlers to Vercel, following established patterns from STORY-002 through STORY-007.

---

## Risk Assessment

### Overall Risk: **MEDIUM**

| Risk Area | Level | Notes |
|-----------|-------|-------|
| Code complexity | Medium | CSV parsing adds complexity |
| Data integrity | Medium | Transaction rollback needed for parse |
| Auth patterns | Low | Established pattern exists |
| Database changes | None | Schema exists, no migrations needed |
| External dependencies | Low | csv-parser is well-established |

---

## Change Surface Analysis

### Files to Create

| File | Purpose |
|------|---------|
| `packages/backend/moc-parts-lists-core/` | New core package (7 functions) |
| `apps/api/platforms/vercel/api/moc-instructions/[mocId]/parts-lists/index.ts` | Create + Get endpoints |
| `apps/api/platforms/vercel/api/moc-instructions/[mocId]/parts-lists/[id].ts` | Update + Delete endpoints |
| `apps/api/platforms/vercel/api/moc-instructions/[mocId]/parts-lists/[id]/status.ts` | Status update endpoint |
| `apps/api/platforms/vercel/api/moc-instructions/[mocId]/parts-lists/[id]/parse.ts` | CSV parse endpoint |
| `apps/api/platforms/vercel/api/user/parts-lists/summary.ts` | User summary endpoint |
| `__http__/moc-parts-lists.http` | HTTP test file |

### Files to Reference (No Changes)

| File | Purpose |
|------|---------|
| `apps/api/core/database/schema/index.ts` | DB schema (mocPartsLists, mocParts) |
| `apps/api/platforms/aws/endpoints/moc-parts-lists/*/handler.ts` | Reference implementations |

---

## Dependencies

### Existing Packages to Reuse

| Package | Purpose |
|---------|---------|
| `@repo/logger` | Structured logging |
| `@repo/vercel-adapter` | JWT validation, request transform |
| `@repo/lambda-responses` | Error/success response patterns |
| `@repo/file-validator` | File validation utilities |
| `drizzle-orm` | Database ORM |
| `csv-parser` | CSV parsing (npm dependency) |

### New Package Required

**`@repo/moc-parts-lists-core`** - Must be created following `@repo/gallery-core` pattern.

Core functions needed:
- `createPartsList(db, { mocId, userId, input })`
- `getPartsLists(db, { mocId, userId })`
- `getUserPartsSummary(db, { userId })`
- `updatePartsList(db, { mocId, partsListId, userId, input })`
- `updatePartsListStatus(db, { mocId, partsListId, userId, status })`
- `deletePartsList(db, { mocId, partsListId, userId })`
- `parsePartsCsv(db, { mocId, partsListId, userId, csvContent })`

---

## Key Technical Considerations

### 1. CSV Parsing Complexity

The parse endpoint has special requirements:
- Stream-based CSV parsing with `csv-parser`
- Validation of CSV structure (required columns)
- Row limit enforcement (max 10,000 rows)
- Batch insert pattern (1,000 row chunks)
- Transaction for atomicity (all-or-nothing)

**Mitigation:** Existing AWS handler provides proven implementation. Port logic directly.

### 2. Transaction Support

Parse operation requires database transaction:
```typescript
await db.transaction(async tx => {
  // Delete existing parts
  await tx.delete(mocParts).where(eq(mocParts.partsListId, id))
  // Batch insert new parts
  for (let i = 0; i < parts.length; i += 1000) {
    await tx.insert(mocParts).values(parts.slice(i, i + 1000))
  }
})
```

**Risk:** Vercel serverless has max 10s execution for hobby, 60s for pro. Large CSV files may timeout.

**Mitigation:** Document Vercel tier requirement. Consider chunking indicator in response.

### 3. Nested Route Structure

Vercel file-based routing requires careful structure:
```
api/
  moc-instructions/
    [mocId]/
      parts-lists/
        index.ts       → POST (create) + GET (list)
        [id].ts        → PUT (update) + DELETE
        [id]/
          status.ts    → PATCH
          parse.ts     → POST
```

**Risk:** Deep nesting may complicate routing.

**Mitigation:** Test routing thoroughly. Vercel supports this pattern.

### 4. User Summary Endpoint

The `/api/user/parts-lists/summary` endpoint is at a different path (not under MOC ID).

**Structure:**
```
api/
  user/
    parts-lists/
      summary.ts
```

**Risk:** Aggregation query across all user MOCs may be slow.

**Mitigation:** Add database index on (user_id) for moc_instructions. Already indexed.

---

## Hidden Dependencies

### MOC Instructions Table

Parts lists depend on MOC instructions existing:
- `mocPartsLists.mocId` → `mocInstructions.id` (FK)
- Ownership verification requires MOC lookup first

**Requirement:** Test data must include seeded MOC instructions for the test user.

### Authentication Pattern

All endpoints except parse require standard auth:
- Cognito JWT validation via `@repo/vercel-adapter`
- User ID extraction from token
- Ownership verification via MOC lookup

---

## Missing AC Candidates

Based on feasibility review, suggest adding to AC:

1. **AC: CSV row limit is enforced** - Parse returns 400 if > 10,000 rows
2. **AC: Transaction atomicity** - Parse failure rolls back all changes
3. **AC: Batch insert performance** - Large CSV completes within timeout
4. **AC: Parts cascade delete** - Deleting parts list removes associated parts

---

## Recommended Mitigations (for PM to bake into story)

1. **Require Vercel Pro tier** for parse endpoint (60s timeout vs 10s)
2. **Add explicit row limit AC** (400 error if exceeded)
3. **Require seed data** including MOC instructions owned by test user
4. **Specify transaction requirement** in architecture notes

---

## Blockers

**None identified.**

The story is implementable as written with the above mitigations baked into AC.
