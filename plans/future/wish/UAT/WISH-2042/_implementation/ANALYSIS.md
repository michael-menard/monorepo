# Elaboration Analysis - WISH-2042

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

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| 1 | Architecture Mismatch: Story references `lego-api` paths that don't match documented API layer architecture | Critical | Must align with `/Users/michaelmenard/Development/Monorepo/docs/architecture/api-layer.md` which specifies `services/{domain}/` not `domains/wishlist/services.ts` |
| 2 | Service Location Contradiction: Story says route in `apps/api/lego-api/domains/wishlist/routes.ts` but API layer doc requires `apps/api/routes/{domain}.ts` | Critical | Must clarify which architecture is authoritative. Current lego-api uses domains/* structure but conflicts with api-layer.md |
| 3 | Cross-Domain Coordination Anti-Pattern: wishlistService.markAsPurchased directly calls setsService methods, creating tight coupling | High | Should use dependency injection of SetsService port, or create shared transaction coordinator service |
| 4 | S3 Service Abstraction Missing: Story plans direct S3 operations in wishlist service but no S3 port/adapter defined in wishlist domain | High | Must define S3 storage port in wishlist ports or reuse imageStorage adapter pattern |
| 5 | Transaction Semantics Unclear: Story mentions "atomic transaction" but doesn't specify database transaction boundaries or isolation level | Medium | Must clarify: single DB transaction across both domains, or eventual consistency with compensation? |
| 6 | Image Copy Strategy Incomplete: Story says "copy S3 object" but doesn't handle case where wishlist item has no image | Low | Add explicit handling: if no imageUrl, create Set without image |
| 7 | Zod Schema Missing: Story doesn't define `MarkAsPurchasedInputSchema` in types section | Medium | Must add schema definition matching request body spec (lines 64-73) |
| 8 | Architecture Notes Reference Wrong Paths: Lines 194-258 show service in `apps/api/lego-api/domains/wishlist/services.ts` but actual lego-api structure uses `application/services.ts` | High | Must correct all path references to match actual lego-api structure: `domains/wishlist/application/services.ts` |
| 9 | Sets Service Type Mismatch: Story shows setsService.createSet receiving different parameters than actual Sets service (which requires userId as first parameter, not embedded in data) | Critical | Must match actual signature: `createSet(userId: string, input: CreateSetInput)` where input does NOT include userId |
| 10 | DELETE /api/sets/:id Endpoint Missing: Undo logic requires deleting Set but no DELETE endpoint mentioned in Sets domain scope | High | Must verify Sets domain has DELETE endpoint or add to story scope |
| 11 | Frontend Architecture Missing Service Import: Story doesn't specify RTK Query endpoint definition location or import path | Medium | Should specify: endpoints in `packages/core/api-client/src/rtk/wishlist-gallery-api.ts` |
| 12 | Decimal Handling Inconsistency: Sets service expects purchasePrice/tax/shipping as strings (Drizzle decimal), but story request schema shows numbers | High | Must align types: either accept numbers and convert to strings, or document string format requirement |

## Split Recommendation (if applicable)

N/A - Story sizing is acceptable at 15 ACs given the complexity of cross-domain transaction logic. Split was already performed from parent WISH-2004.

## Preliminary Verdict

**Verdict**: FAIL

**Rationale**: Multiple critical architecture violations that would lead to implementation confusion and technical debt:

1. **Architecture Authority Conflict**: Story references two conflicting architecture patterns:
   - `docs/architecture/api-layer.md` (authoritative) specifies `apps/api/services/{domain}/` and `apps/api/routes/{domain}.ts`
   - Actual `lego-api` implementation uses `apps/api/lego-api/domains/{domain}/application/services.ts` and `domains/{domain}/routes.ts`
   - Story inconsistently references both patterns

2. **Service Coupling**: Direct cross-domain service calls (wishlistService → setsService) violate hexagonal architecture principles. Should use:
   - Dependency injection of SetsService port
   - OR shared transaction coordinator
   - OR domain events with eventual consistency

3. **Type Mismatches**: Story shows service signatures that don't match actual implementations (Sets.createSet parameter structure, decimal types)

**Required Fixes Before Implementation**:
- Clarify authoritative architecture (lego-api pattern vs api-layer.md pattern)
- Define cross-domain coordination strategy (DI, coordinator, or events)
- Align all service signatures with actual implementations
- Add missing Zod schema definitions
- Correct all path references to match chosen architecture

---

## MVP-Critical Gaps

Only gaps that **block the core user journey**:

| # | Gap | Blocks | Required Fix |
|---|-----|--------|--------------|
| 1 | Missing MarkAsPurchasedInputSchema Zod schema | Core purchase flow cannot validate requests | Add schema to `apps/api/lego-api/domains/wishlist/types.ts` with validation rules from lines 64-73 |
| 2 | Sets DELETE endpoint undefined | Undo functionality blocked - cannot delete created Set | Verify Sets domain has `deleteSet` method and DELETE route, or add to this story's scope |
| 3 | Cross-domain dependency injection not defined | Service cannot coordinate between Wishlist and Sets | Define SetsService port in wishlist domain or use composition root to inject dependency |
| 4 | Image copy when no imageUrl present | Purchase fails or creates broken Set record | Add conditional: if no imageUrl, skip S3 copy and create Set without image |
| 5 | Decimal type conversion undefined | Purchase request validation fails due to number vs string mismatch | Add validation layer to convert number inputs to string decimals before passing to Sets service |

---

## Worker Token Summary

- Input: ~8,200 tokens (story file, api-layer.md, existing services, stories.index.md, WISH-2041 reference)
- Output: ~2,100 tokens (ANALYSIS.md + FUTURE-OPPORTUNITIES.md)
