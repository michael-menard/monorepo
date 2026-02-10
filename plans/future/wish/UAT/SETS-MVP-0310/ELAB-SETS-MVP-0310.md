# Elaboration Report - SETS-MVP-0310

**Date**: 2026-02-01
**Verdict**: CONDITIONAL PASS

## Summary

Story SETS-MVP-0310 (Status Update Flow) demonstrates solid architectural alignment with the unified model approach but has 7 critical findings that must be resolved before implementation. All findings have been elevated to Acceptance Criteria to ensure proper resolution during development. The story may proceed to implementation once these ACs are implemented and verified.

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

## Issues & Required Fixes

| # | Issue | Severity | Required Fix | Status |
|---|-------|----------|--------------|--------|
| 1 | Endpoint naming inconsistency | Critical | Story title is "Status Update Flow" suggesting unified model approach, but endpoint is `/purchase` instead of `/status` or `/transition`. This creates confusion about whether this is status update or purchase-specific. **ADDED AS AC11**: Clarify endpoint semantics: is this a status transition endpoint or purchase-specific endpoint? Document decision and naming rationale. | AC Added |
| 2 | Service method conflict | Critical | Story plans `markAsPurchased()` service method but this already exists from WISH-2004 with different behavior (creates Set, deletes wishlist). **ADDED AS AC12**: Specify service method approach: (a) Replace existing method? (b) Rename to `updateStatusToOwned()`? (c) Keep both with feature flag? Document decision in implementation. | AC Added |
| 3 | WISH-2004 migration strategy undefined | Critical | Story mentions "clarify migration strategy before implementation" but doesn't provide decision criteria. **ADDED AS AC13**: Define WISH-2004 migration strategy: (a) Will `POST :id/purchased` be deprecated? (b) Timeline for deprecation? (c) Feature flag approach? (d) Backward compatibility requirements? Document in story before starting implementation. | AC Added |
| 4 | SETS-MVP-001 dependency not verified | High | Story is blocked on SETS-MVP-001 (status: ready-to-work, NOT implemented). **ADDED AS AC14**: Before implementation start, verify SETS-MVP-001 is implemented and schema includes all required fields: status enum (with 'owned'), purchaseDate, buildStatus, purchasePrice, purchaseTax, purchaseShipping, statusChangedAt. | AC Added |
| 5 | Missing consumer impact analysis | High | Existing `POST :id/purchased` endpoint has consumers (frontend GotItModal). **ADDED AS AC15**: Document migration plan for existing GotItModal consumers: how to transition from POST to PATCH? How to handle parallel endpoints during transition? Document impact analysis. | AC Added |
| 6 | Incomplete architecture alignment | Medium | Story shows Drizzle update in architecture notes but doesn't verify schema supports status='owned' enum value. **ADDED AS AC16**: Verify architecture alignment: (a) Schema supports status='owned' enum? (b) Unified model includes status state machine or valid transitions? (c) Document any schema gaps. | AC Added |
| 7 | Form UX edge case unresolved | Low | Story notes "User enters tax/shipping without price: Total calculation may be confusing" but doesn't resolve this. **ADDED AS AC17**: Resolve form UX edge case: clarify UX behavior when user enters tax/shipping without price. Document total calculation logic and UI feedback. | AC Added |

## Split Recommendation

Not applicable - story is appropriately sized for implementation.

## Discovery Findings

### Gaps Identified

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | Endpoint naming inconsistency | Add as AC (AC11) | Clarity needed on whether this is status transition endpoint or purchase-specific endpoint |
| 2 | Service method conflict | Add as AC (AC12) | Must resolve naming and coexistence strategy with existing WISH-2004 method |
| 3 | WISH-2004 migration strategy undefined | Add as AC (AC13) | Must document deprecation timeline and backward compatibility approach |
| 4 | SETS-MVP-001 dependency not verified | Add as AC (AC14) | Must verify implementation and schema fields before starting work |
| 5 | Missing consumer impact analysis | Add as AC (AC15) | Must document migration path for existing GotItModal consumers |

### Enhancement Opportunities

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 6 | Incomplete architecture alignment | Add as AC (AC16) | Verify schema supports all required fields and document state machine |
| 7 | Form UX edge case unresolved | Add as AC (AC17) | Clarify total calculation logic and UI feedback for edge cases |

### Follow-up Stories Suggested

- [ ] WISH-2004 deprecation and migration timeline (post-SETS-MVP-0310)
- [ ] Advanced form validation edge cases (already covered: SETS-MVP-0340)
- [ ] Consumer notification and migration guide for API endpoint transition

### Items Marked Out-of-Scope

- Undo functionality (SETS-MVP-0330)
- Success toast and animations (SETS-MVP-0320)
- Advanced form validation (SETS-MVP-0340)
- Quantity > 1 in single purchase (future iteration)
- Keeping item on wishlist after purchase (future iteration)

## Proceed to Implementation?

**YES - with conditions**: Story may proceed to implementation once all 7 added ACs are completed and verified. These ACs must be resolved during development to ensure:
1. Endpoint semantics are clarified and aligned with unified model
2. Service method conflicts are resolved
3. WISH-2004 migration strategy is documented
4. SETS-MVP-001 implementation is verified
5. Consumer impact is documented
6. Architecture alignment is confirmed
7. Form UX edge cases are resolved

---

## Implementation Readiness Checklist

**Before starting development:**
- [ ] AC11: Endpoint naming strategy documented
- [ ] AC12: Service method approach decided and documented
- [ ] AC13: WISH-2004 migration strategy documented
- [ ] AC14: SETS-MVP-001 implementation verified
- [ ] AC15: Consumer impact analysis completed
- [ ] AC16: Architecture alignment verified
- [ ] AC17: Form UX edge cases resolved

**During development:**
- [ ] All 17 ACs implemented and tested
- [ ] Code review confirms AC compliance
- [ ] No regressions in existing WISH-2004 flow

**Before QA handoff:**
- [ ] All tests passing (unit, integration, E2E)
- [ ] Code review approved
- [ ] AC verification completed
