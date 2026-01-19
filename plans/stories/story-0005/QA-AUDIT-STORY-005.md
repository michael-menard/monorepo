# QA AUDIT — STORY-005: Wishlist - Write Operations (No Images)

**Audit Date:** 2026-01-18
**Auditor:** QA Agent
**Story Version:** 2026-01-18T20:49:00-07:00

---

## Overall Verdict: CONDITIONAL PASS

STORY-005 may proceed to implementation **after the required fixes** listed below are addressed.

---

## Audit Summary

| Checklist Item | Status | Notes |
|----------------|--------|-------|
| 1. Scope Alignment | ✅ PASS | Matches `stories.index.md` |
| 2. Internal Consistency | ⚠️ CONDITIONAL | Minor inconsistencies identified |
| 3. Reuse-First Enforcement | ✅ PASS | Properly reuses established packages |
| 4. Ports & Adapters Compliance | ✅ PASS | Architecture correctly documented |
| 5. Local Testability | ✅ PASS | Concrete `.http` test plan |
| 6. Decision Completeness | ⚠️ CONDITIONAL | One ambiguous decision |
| 7. Risk Disclosure | ✅ PASS | Risks appropriately documented |

---

## Issues

### Issue #1: Endpoint Path Mismatch

**Severity:** High

**Location:** Section 4 (Scope) vs `stories.index.md`

**Description:**
- Story defines `PUT /api/wishlist/:id` for updates
- Story defines `DELETE /api/wishlist/:id` for deletes
- Existing Vercel file-based routing uses `[id].ts` for GET by ID (see `apps/api/platforms/vercel/api/wishlist/[id].ts`)

**Problem:** The same file cannot handle GET, PUT, and DELETE. Vercel file-based routing requires either:
1. Method dispatch within `[id].ts` (supported)
2. Separate files with explicit method handling

**Required Fix:** Clarify in Architecture Notes that `[id].ts` will handle GET/PUT/DELETE via method dispatch, OR define separate endpoint files.

**Recommendation:** Add to Section 7 (Architecture Notes):
```
### Vercel Routing Note
The existing `[id].ts` handles GET requests. This file MUST be extended
to handle PUT and DELETE via method dispatch (switch on req.method).
```

---

### Issue #2: Core Function Pattern Inconsistency

**Severity:** Medium

**Location:** Section 7 vs established patterns

**Description:**
The story specifies `create-wishlist-item.ts` as the core function filename, but the existing wishlist-core pattern uses hyphenated names matching the entity:
- `list-wishlist-items.ts` (plural)
- `get-wishlist-item.ts` (singular)
- `search-wishlist-items.ts` (plural)

The sets-core pattern uses:
- `create-set.ts` (without "item" suffix)

**Required Fix:** Update Section 4 filenames to match existing wishlist-core pattern:
- `create-wishlist-item.ts` ✅ (already correct)
- `update-wishlist-item.ts` ✅ (already correct)
- `delete-wishlist-item.ts` ✅ (already correct)
- `reorder-wishlist-items.ts` ✅ (already correct - plural for bulk)

**Status:** Acceptable as-is after verification.

---

### Issue #3: Empty Request Body Handling Ambiguity

**Severity:** Medium

**Location:** Section 5 (AC-2) and TEST-PLAN.md

**Description:**
TEST-PLAN.md line 67 lists "Empty request body `{}` | 400 Bad Request OR 200 (no-op)".

The AC does not explicitly state which behavior is expected.

**Required Fix:** Add explicit decision to AC-2:
- `PUT /api/wishlist/:id` with empty body `{}` returns 200 OK (no-op, only updatedAt changes)

---

### Issue #4: Discriminated Union Error Types Incomplete

**Severity:** Low

**Location:** Section 7 (Architecture Notes)

**Description:**
The sample `CreateWishlistResult` type shows:
```typescript
| { success: false; error: 'VALIDATION_ERROR' | 'DB_ERROR'; message: string }
```

But the AC specifies additional error conditions:
- `NOT_FOUND` (for update/delete)
- `FORBIDDEN` (for ownership check)
- `INVALID_ID` (for UUID validation)

**Required Fix:** Update Section 7 to show complete discriminated union types for each operation. Add note that each core function defines its own result type with appropriate error variants.

---

### Issue #5: Proof File Path Inconsistency

**Severity:** Low

**Location:** Section 9 vs Section 11

**Description:**
- Section 9 states: "Proof saved in `plans/stories/story-0005/_dev/proof.md`"
- Section 11 states: "Proof document at `plans/stories/story-0005/_dev/proof.md`"

This is consistent, but deviates from the pattern in `vercel.migration.plan.exec.md` which mentions `PROOF-STORY-XXX.md` at the story root level (see STORY-001 through STORY-004).

**Required Fix:** Update to match established pattern: `plans/stories/story-0005/PROOF-STORY-005.md`

---

### Issue #6: Missing Vercel Endpoint File for Create

**Severity:** Low

**Location:** Section 4 (Scope)

**Description:**
Section 4 lists 4 new endpoint files in `apps/api/platforms/vercel/api/wishlist/`:
- `create.ts` — but Vercel file routing would need this to be a POST handler

**Clarification Needed:** For `POST /api/wishlist`, does the file need to be:
- `wishlist.ts` (handles POST to `/api/wishlist`)
- `create.ts` (would create `/api/wishlist/create` endpoint — differs from AC path)

**Required Fix:** Clarify the actual Vercel file structure. Based on standard patterns:
- `POST /api/wishlist` → `apps/api/platforms/vercel/api/wishlist/index.ts` OR a method handler in an existing file
- Current `list.ts` is at `/api/wishlist/list`

The story should explicitly state that `POST /api/wishlist` requires an `index.ts` file that handles POST method.

---

## What Is Acceptable As-Is

1. **Reuse Plan** — Correctly identifies existing packages and patterns
2. **Test Plan** — Comprehensive coverage of happy path, error cases, edge cases
3. **Seed Data** — Existing seed is sufficient, no new data needed
4. **Environment Variables** — Correctly references existing vars
5. **Non-Goals** — Clearly scoped out image uploads and other concerns
6. **Risk Disclosure** — DEV-FEASIBILITY.md appropriately flags reorder complexity

---

## Required Fixes Summary

| Issue | Severity | Fix Required |
|-------|----------|--------------|
| #1 | High | Clarify that `[id].ts` handles GET/PUT/DELETE via method dispatch |
| #3 | Medium | State that empty body returns 200 (no-op) |
| #4 | Low | Document complete error type variants |
| #5 | Low | Update proof path to `PROOF-STORY-005.md` |
| #6 | Low | Clarify POST endpoint file is `index.ts` |

---

## Verdict Details

### Can STORY-005 Proceed to Implementation?

**YES, with conditions.**

The story may proceed if the PM acknowledges the following clarifications:

1. **High Priority:** `[id].ts` will be extended to handle PUT and DELETE via `req.method` dispatch
2. **Medium Priority:** Empty body on PUT returns 200 with only `updatedAt` changed
3. **Low Priority:** Create endpoint uses `index.ts` for `POST /api/wishlist`

These are clarifications, not design changes. The Dev can proceed with the understood intent.

### Blocking Issues

None. All issues are documentation/clarification gaps, not design flaws.

### Pass Criteria Met

- ✅ Scope matches `stories.index.md` (4 endpoints: create, update, delete, reorder)
- ✅ Goals and Non-Goals are consistent
- ✅ Reuse plan is compliant
- ✅ Ports & Adapters pattern is followed
- ✅ Local testing via `.http` is executable
- ✅ No blocking TBDs
- ✅ Risks appropriately documented

---

## Agent Log

| Timestamp (America/Denver) | Agent | Action | Outputs |
|---|---|---|---|
| 2026-01-18T21:15:00-07:00 | QA | Completed audit of STORY-005 | `QA-AUDIT-STORY-005.md` |
