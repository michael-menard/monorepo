# Elaboration Analysis - SETS-MVP-0310

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | FAIL | Critical | Story plans endpoint `PATCH /api/wishlist/:id/purchase` but stories.index.md references this as "Status Update Flow" - endpoint naming mismatch with unified model concept. Also, story mentions WISH-2004 migration but doesn't specify clear migration strategy. |
| 2 | Internal Consistency | PASS | — | Goals, non-goals, AC, and test plan are consistent. Purchase details form fields match AC3, backend updates match AC8. |
| 3 | Reuse-First | PASS | — | Correctly reuses existing GotItModal, @repo/ui components, auth middleware, and Zod schemas. New PurchaseDetailsStep is appropriately scoped. |
| 4 | Ports & Adapters | FAIL | Critical | **CRITICAL VIOLATION**: Story plans service method `markAsPurchased()` but service file already has `markAsPurchased()` from WISH-2004 (creates Set + deletes wishlist). The story doesn't specify whether to replace existing method or create new one. No clarity on coexistence with WISH-2004 endpoint `POST :id/purchased`. |
| 5 | Local Testability | PASS | — | Backend integration tests specified, Playwright E2E tests specified, unit tests for PurchaseDetailsStep specified. All concrete and executable. |
| 6 | Decision Completeness | FAIL | High | **BLOCKING TBD**: "Decision needed: Replace existing endpoint OR run parallel with feature flag?" (line 178-179). This is a BLOCKING decision that must be resolved before implementation. |
| 7 | Risk Disclosure | CONDITIONAL PASS | Medium | Risks are disclosed (SETS-MVP-001 dependency, WISH-2004 migration, service layer pattern). However, missing risk: what happens to existing POST :id/purchased consumers? |
| 8 | Story Sizing | PASS | — | 10 ACs, single domain (wishlist), backend + frontend but tightly scoped. No split needed. |

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| 1 | **Endpoint naming inconsistency** | Critical | Story title is "Status Update Flow" suggesting unified model approach, but endpoint is `/purchase` instead of `/status` or `/transition`. This creates confusion about whether this is status update or purchase-specific. Clarify: is this a status transition endpoint or purchase-specific endpoint? |
| 2 | **Service method conflict** | Critical | Story plans `markAsPurchased()` service method but this already exists from WISH-2004 with different behavior (creates Set, deletes wishlist). Story must specify: (a) Replace existing method? (b) Rename to `updateStatusToOwned()`? (c) Keep both with feature flag? |
| 3 | **WISH-2004 migration strategy undefined** | Critical | Story mentions "clarify migration strategy before implementation" but doesn't provide decision criteria or recommendation. Must specify: (a) Will WISH-2004 endpoint be deprecated? (b) Timeline for deprecation? (c) Feature flag approach? (d) Backward compatibility requirements? |
| 4 | **SETS-MVP-001 dependency not verified** | High | Story is blocked on SETS-MVP-001 (status: ready-to-work, NOT implemented). Story lists required fields (status, purchaseDate, buildStatus, etc.) but doesn't verify they exist. Cannot proceed until SETS-MVP-001 is implemented. |
| 5 | **Missing consumer impact analysis** | High | Existing `POST :id/purchased` endpoint has consumers (frontend GotItModal). Story doesn't address how to migrate GotItModal from POST to PATCH, or how to handle parallel endpoints during transition. |
| 6 | **Incomplete architecture alignment** | Medium | Story shows Drizzle update in architecture notes but doesn't verify schema supports status='owned' enum value. Unified model implies status transitions, but story doesn't reference status state machine or valid transitions. |
| 7 | **Form UX edge case unresolved** | Low | Story notes "User enters tax/shipping without price: Total calculation may be confusing (clarify UX)" but doesn't resolve this. Should be decided before implementation. |

## Split Recommendation

Not applicable - story is appropriately sized.

## Preliminary Verdict

**Verdict**: FAIL

**Reasoning**: Story has CRITICAL blocking issues that prevent implementation:
1. SETS-MVP-001 dependency is NOT implemented (status: ready-to-work)
2. WISH-2004 migration strategy is undefined (explicit TBD in story)
3. Service method naming conflict with existing implementation
4. Endpoint naming doesn't align with "status update" concept

Story CANNOT proceed to implementation until:
- SETS-MVP-001 is implemented and verified (schema fields exist)
- WISH-2004 migration strategy is documented and decided
- Service method approach is clarified (replace, rename, or parallel)
- Endpoint naming is reconciled with unified model architecture

---

## MVP-Critical Gaps

Only gaps that **block the core user journey**:

| # | Gap | Blocks | Required Fix |
|---|-----|--------|--------------|
| 1 | SETS-MVP-001 not implemented | Core journey: cannot update status to 'owned' if field doesn't exist | SETS-MVP-001 must be implemented first. Verify schema has: status enum with 'owned', purchaseDate, purchasePrice, purchaseTax, purchaseShipping, buildStatus enum, statusChangedAt. |
| 2 | WISH-2004 migration strategy undefined | Core journey: unclear which endpoint to use, how to migrate existing flow | Must decide: (a) Replace POST :id/purchased with PATCH :id/purchase? (b) Run parallel with feature flag? (c) Deprecation timeline? Document decision in story. |
| 3 | Service method conflict | Implementation blocked: service layer already has markAsPurchased() with different behavior | Must decide: (a) Replace existing method (breaking change)? (b) Rename new method to updateStatusToOwned()? (c) Use feature flag to switch behavior? Document decision. |
| 4 | Endpoint semantic mismatch | Architecture: story is "Status Update Flow" but endpoint is purchase-specific | Decide: Is this a generic status transition endpoint (/status or /transition) or purchase-specific (/purchase)? Current naming suggests purchase-specific but unified model suggests status transition. |

---

## Worker Token Summary

- Input: ~38,000 tokens (story file, stories.index.md, api-layer.md, agent instructions, existing routes.ts, types.ts)
- Output: ~2,500 tokens (ANALYSIS.md + FUTURE-OPPORTUNITIES.md)
