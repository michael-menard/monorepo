# Implementation Blockers - SETS-MVP-002

## Blocker 1: Backend Query Schema Missing Status Parameter

### Issue
PLAN.yaml states "backend already supports status filtering" and "no changes needed", but verification reveals:

**Missing**: `ListWishlistQuerySchema` (lines 206-252 in types.ts) does NOT include a `status` field
**Exists**: Service layer supports status filtering (services.ts lines 156-191)
**Exists**: ItemStatusSchema enum definition (types.ts line 71)

### Impact
- AC9, AC10, AC11 cannot be implemented without status query parameter
- Frontend cannot filter by status='owned' for collection view
- HTTP tests cannot verify status filtering

### Options

**Option A: Add status field to ListWishlistQuerySchema** (Recommended)
```typescript
// In ListWishlistQuerySchema after priceRange field
status: ItemStatusSchema.optional(),
```
- Pros: Minimal change, follows existing pattern, service layer ready
- Cons: Contradicts plan's "no backend changes" assertion
- Effort: 5 minutes (1 line in types.ts, pass through in routes.ts line 162-175)

**Option B: Defer story and update plan**
- Pros: Maintains strict plan adherence
- Cons: Blocks entire story, wastes planning effort
- Effort: High (re-planning, re-estimation)

**Option C: Use workaround (filter client-side)**
- Pros: No backend changes
- Cons: Inefficient, breaks AC specs, poor UX at scale
- Effort: Medium (more frontend code)

### Recommendation
**Option A** - Add status parameter following existing pattern. This is a Tier 1 decision (has reasonable default, clear implementation path) masked as "no changes needed" in plan.

### Decision Required
Which option should we proceed with?

---

## Decision Tier Classification
**Tier**: 3 (Ambiguous scope interpretation - plan says no changes, reality requires changes)
**Autonomy Level**: conservative
**Action**: Escalated per decision-handling.md

