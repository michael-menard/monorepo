# Elaboration Report - WISH-2042

**Date**: 2026-01-27
**Verdict**: CONDITIONAL PASS

## Summary

Story WISH-2042 (Purchase/"Got It" Flow) presents a well-scoped cross-domain feature with comprehensive acceptance criteria, test plans, and risk analysis. However, critical architecture mismatches and type inconsistencies between the story specification and actual lego-api implementation must be resolved before development begins. All 12 identified issues have been converted to Acceptance Criteria to ensure implementation correctness.

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | FAIL | Critical | Story scope references non-existent lego-api architecture that conflicts with documented API layer architecture |
| 2 | Internal Consistency | FAIL | High | Architecture notes reference services in wrong location, contradict actual lego-api structure |
| 3 | Reuse-First | PASS | — | Good reuse of existing patterns from WISH-2041 |
| 4 | Ports & Adapters | FAIL | Critical | Story plans business logic in wishlist service that should coordinate through separate services; violates API layer architecture doc |
| 5 | Local Testability | PASS | — | Comprehensive test plan with .http tests, frontend tests, E2E tests |
| 6 | Decision Completeness | PASS | — | No blocking TBDs or unresolved design decisions |
| 7 | Risk Disclosure | PASS | — | Good risk analysis with 7 identified risks and mitigation strategies |
| 8 | Story Sizing | PASS | — | 15 ACs is high but justified for cross-domain transaction complexity |

## Issues & Required Fixes

| # | Issue | Severity | Required Fix | Status |
|---|-------|----------|--------------|--------|
| 1 | Architecture Mismatch: Story references `lego-api` paths that don't match documented API layer architecture | Critical | Must align with `/docs/architecture/api-layer.md` which specifies `services/{domain}/` not `domains/wishlist/services.ts` | Added as AC |
| 2 | Service Location Contradiction: Story says route in `apps/api/lego-api/domains/wishlist/routes.ts` but API layer doc requires `apps/api/routes/{domain}.ts` | Critical | Must clarify which architecture is authoritative. Current lego-api uses domains/* structure but conflicts with api-layer.md | Added as AC |
| 3 | Cross-Domain Coordination Anti-Pattern: wishlistService.markAsPurchased directly calls setsService methods, creating tight coupling | High | Should use dependency injection of SetsService port, or create shared transaction coordinator service | Added as AC |
| 4 | S3 Service Abstraction Missing: Story plans direct S3 operations in wishlist service but no S3 port/adapter defined in wishlist domain | High | Must define S3 storage port in wishlist ports or reuse imageStorage adapter pattern | Added as AC |
| 5 | Transaction Semantics Unclear: Story mentions "atomic transaction" but doesn't specify database transaction boundaries or isolation level | Medium | Must clarify: single DB transaction across both domains, or eventual consistency with compensation? | Added as AC |
| 6 | Image Copy Strategy Incomplete: Story says "copy S3 object" but doesn't handle case where wishlist item has no image | Low | Add explicit handling: if no imageUrl, create Set without image | Added as AC |
| 7 | Zod Schema Missing: Story doesn't define `MarkAsPurchasedInputSchema` in types section | Medium | Must add schema definition matching request body spec (lines 64-73) | Added as AC |
| 8 | Architecture Notes Reference Wrong Paths: Lines 194-258 show service in `apps/api/lego-api/domains/wishlist/services.ts` but actual lego-api structure uses `application/services.ts` | High | Must correct all path references to match actual lego-api structure: `domains/wishlist/application/services.ts` | Added as AC |
| 9 | Sets Service Type Mismatch: Story shows setsService.createSet receiving different parameters than actual Sets service (which requires userId as first parameter, not embedded in data) | Critical | Must match actual signature: `createSet(userId: string, input: CreateSetInput)` where input does NOT include userId | Added as AC |
| 10 | DELETE /api/sets/:id Endpoint Missing: Undo logic requires deleting Set but no DELETE endpoint mentioned in Sets domain scope | High | Must verify Sets domain has DELETE endpoint or add to story scope | Added as AC |
| 11 | Frontend Architecture Missing Service Import: Story doesn't specify RTK Query endpoint definition location or import path | Medium | Should specify: endpoints in `packages/core/api-client/src/rtk/wishlist-gallery-api.ts` | Added as AC |
| 12 | Decimal Handling Inconsistency: Sets service expects purchasePrice/tax/shipping as strings (Drizzle decimal), but story request schema shows numbers | High | Must align types: either accept numbers and convert to strings, or document string format requirement | Added as AC |

## Discovery Findings

### Gaps Identified

| # | Finding | User Decision | Notes |
|---|---------|---------------|-------|
| 1 | Architecture Mismatch: lego-api vs api-layer.md documentation conflict | Add as AC | Stores must clarify authoritative architecture before implementation |
| 2 | Service Location Contradiction: Routes and services in wrong paths | Add as AC | All path references must match actual lego-api structure |
| 3 | Cross-Domain Coordination Anti-Pattern: Tight coupling between wishlist and sets services | Add as AC | Must implement proper DI or coordinator pattern |
| 4 | S3 Service Abstraction Missing: Direct S3 operations bypass abstraction layer | Add as AC | S3 must be abstracted as port/adapter in wishlist domain |
| 5 | Transaction Semantics Unclear: Database transaction boundaries not defined | Add as AC | Must specify isolation level and rollback strategy |
| 6 | Image Copy Strategy Incomplete: No handling for missing images | Add as AC | Must add conditional logic for missing imageUrl |
| 7 | Zod Schema Missing: MarkAsPurchasedInputSchema not defined | Add as AC | Schema required for type safety and validation |
| 8 | Architecture Notes Reference Wrong Paths: Incorrect service paths in examples | Add as AC | All code examples must match actual lego-api structure |
| 9 | Sets Service Type Mismatch: Parameter structure doesn't match actual Sets service | Add as AC | Implementation must use correct Sets service signature |
| 10 | DELETE /api/sets/:id Endpoint Missing: Undo functionality undefined | Add as AC | Must verify or add DELETE endpoint to Sets domain |
| 11 | Frontend Architecture Missing Service Import: RTK Query endpoint location not specified | Add as AC | Must specify endpoint definition location and imports |
| 12 | Decimal Handling Inconsistency: Number vs string type mismatch | Add as AC | Must align numeric type handling with Sets service expectations |

### Enhancement Opportunities

None identified - story is feature-complete for MVP scope.

### Follow-up Stories Suggested

None - all requirements captured in this story.

### Items Marked Out-of-Scope

None - all identified issues converted to ACs for this story.

## Proceed to Implementation?

**YES - story may proceed** with the following preconditions:

1. **Before development starts**, PM must review and confirm these 12 ACs are acceptable additions to the story
2. **Architecture alignment** must be resolved (lego-api vs api-layer.md) at the team level
3. **Cross-domain coordination strategy** must be documented (DI, coordinator, or events)
4. **All service signatures** must be verified against actual implementations before coding

The story has sufficient detail and risk analysis to guide implementation, but architectural clarifications will prevent rework during code review.

---

## Conditional Pass Rationale

**Passed** on content quality:
- Comprehensive acceptance criteria (15 ACs covering happy path, error cases, accessibility, undo)
- Detailed test plan spanning unit, integration, and E2E tests
- Good risk analysis with 7 identified risks and mitigation strategies
- Clear reuse strategy from WISH-2041 (undo pattern, modal structure)
- Proper emphasis on transaction safety and data loss prevention

**Conditional on** resolving architecture and type mismatches:
- 12 issues converted to ACs ensure implementation correctness
- Issues are correctible through clarification and schema definition
- No fundamental scope or design problems
- Team can proceed once ACs are reviewed and baseline decisions are documented
