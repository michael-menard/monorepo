# DEV FEASIBILITY — STORY-0005: Wishlist Write Operations

## Overall Assessment: LOW RISK ✅

This story follows established patterns from STORY-004 (Wishlist Read) and STORY-003 (Sets Create). The architecture is well-understood and the path is clear.

---

## 1. Change Surface Analysis

### Files to Create

| File | Purpose | Risk |
|------|---------|------|
| `packages/backend/wishlist-core/src/create-wishlist-item.ts` | Core create logic | Low |
| `packages/backend/wishlist-core/src/update-wishlist-item.ts` | Core update logic | Low |
| `packages/backend/wishlist-core/src/delete-wishlist-item.ts` | Core delete logic | Low |
| `packages/backend/wishlist-core/src/reorder-wishlist-items.ts` | Core reorder logic | Medium |
| `packages/backend/wishlist-core/src/__tests__/create-wishlist-item.test.ts` | Unit tests | Low |
| `packages/backend/wishlist-core/src/__tests__/update-wishlist-item.test.ts` | Unit tests | Low |
| `packages/backend/wishlist-core/src/__tests__/delete-wishlist-item.test.ts` | Unit tests | Low |
| `packages/backend/wishlist-core/src/__tests__/reorder-wishlist-items.test.ts` | Unit tests | Low |
| `apps/api/platforms/vercel/api/wishlist/create.ts` | Vercel endpoint | Low |
| `apps/api/platforms/vercel/api/wishlist/update.ts` | Vercel endpoint | Low |
| `apps/api/platforms/vercel/api/wishlist/delete.ts` | Vercel endpoint | Low |
| `apps/api/platforms/vercel/api/wishlist/reorder.ts` | Vercel endpoint | Low |

### Files to Modify

| File | Change | Risk |
|------|--------|------|
| `packages/backend/wishlist-core/src/__types__/index.ts` | Add Create/Update input schemas | Low |
| `__http__/wishlist.http` | Add write operation tests | Low |

---

## 2. Dependency Analysis

### Required Packages (Already Exist)

| Package | Usage | Status |
|---------|-------|--------|
| `@repo/logger` | Logging | ✅ Available |
| `drizzle-orm` | Database operations | ✅ Available |
| `zod` | Input validation | ✅ Available |
| `pg` | PostgreSQL client | ✅ Available |

### No New Dependencies Required

All required dependencies are already in use by the read operations in STORY-004.

---

## 3. Architecture Compliance

### Ports & Adapters Pattern

Following the established pattern from `wishlist-core`:

```
┌─────────────────────────────────────────────────────────┐
│                    Vercel Endpoint                       │
│  apps/api/platforms/vercel/api/wishlist/create.ts       │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                    Core Function                         │
│  packages/backend/wishlist-core/src/create-wishlist.ts  │
│  - Receives DB client via dependency injection          │
│  - Returns discriminated union result                    │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│              Database Interface (Port)                   │
│  CreateWishlistDbClient { insert, select }              │
│  - Abstract interface, not Drizzle-specific             │
└─────────────────────────────────────────────────────────┘
```

### Reuse Verification

| Concern | Reuse Source | Notes |
|---------|--------------|-------|
| Logging | `@repo/logger` | Already used in list/search/get |
| Response shaping | Local transform | Matches existing pattern |
| Auth | `getAuthUserId()` | Same pattern as read endpoints |
| DB connection | `getDb()` singleton | Same pattern as read endpoints |
| Input validation | Zod schemas | Same pattern as read endpoints |

---

## 4. Risk Analysis

### Medium Risk: Reorder Operation

**Concern**: The reorder operation updates multiple rows in a single request.

**Mitigations**:
1. Validate all item IDs belong to the authenticated user before updating
2. Use a transaction if atomicity is required (PM decision: transactions NOT required for MVP)
3. Filter out items that don't exist rather than failing entirely
4. Consider batch size limit (e.g., max 100 items per reorder request)

**PM Decision**: For MVP, reorder will:
- Validate all items exist and belong to user
- Update items individually (no transaction)
- Return success if all updates succeed
- Return 400 if any validation fails (fail-fast)

### Low Risk: sortOrder Assignment on Create

**Concern**: New items need a `sortOrder` value.

**Options**:
1. **Client provides sortOrder** — More flexible but requires client logic
2. **Server calculates next sortOrder** — `MAX(sortOrder) + 1` for user
3. **Always append to end** — Use timestamp-based ordering

**PM Decision**: Server calculates `sortOrder = MAX(sortOrder) + 1` for the user. Client can reorder afterward.

### Low Risk: Update Partial vs Full

**Concern**: Should UPDATE accept partial updates (PATCH semantics) or require full replacement?

**PM Decision**: Accept partial updates. Only fields provided in the request body are updated. This matches common REST API patterns and provides better UX.

---

## 5. Hidden Dependencies

### None Identified

The wishlist table has no foreign key relationships to other tables. Deleting a wishlist item does not cascade to any other data.

**Note**: Future stories may link wishlist items to sets (via `wishlistItemId` on sets table). This is OUT OF SCOPE for STORY-0005.

---

## 6. Missing AC Gaps

### Gap 1: Input Validation Specifics

**Issue**: AC should specify validation rules for:
- `store` field: Is it an enum or free text?
- `priority` field: Range 0-5 or unbounded?
- `price` field: String format requirements?

**PM Decision**:
- `store`: Free text (not enum) — matches existing seed data pattern
- `priority`: Integer 0-5 inclusive, default 0
- `price`: Optional string, no format validation (client responsibility)

### Gap 2: Delete Response Format

**Issue**: Should DELETE return 200 with body or 204 No Content?

**PM Decision**: Return 200 with `{ success: true }` — matches Sets pattern and provides explicit confirmation.

### Gap 3: Concurrency Handling

**Issue**: What happens with concurrent updates to the same item?

**PM Decision**: Last-write-wins (no optimistic locking for MVP). This is acceptable for a single-user application.

---

## 7. Recommended Mitigations

1. **Add Zod schemas for create/update input** to `__types__/index.ts`
2. **Follow Sets create pattern** in `packages/backend/sets-core/src/create-set.ts`
3. **Use discriminated union results** (`{ success: true, data } | { success: false, error }`)
4. **Include comprehensive unit tests** matching the pattern in `wishlist-core/__tests__/`
5. **Add `.http` test requests** to `__http__/wishlist.http` for all operations

---

## 8. Conclusion

STORY-0005 is **feasible** with **low risk**. All patterns are established, dependencies exist, and the change surface is well-defined. The reorder operation has slightly higher complexity but the PM decisions above provide clear guidance.

### Estimated Complexity

| Operation | Core Logic | Vercel Endpoint | Tests | Total |
|-----------|------------|-----------------|-------|-------|
| Create | Simple | Simple | Medium | Low |
| Update | Simple | Simple | Medium | Low |
| Delete | Simple | Simple | Simple | Low |
| Reorder | Medium | Simple | Medium | Medium |

**Overall**: Straightforward implementation following established patterns.
