# Elaboration Analysis - WISH-2121

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Story scope matches stories.index.md (WISH-2121: Playwright E2E MSW Setup). No extra endpoints or features introduced. |
| 2 | Internal Consistency | PASS | — | Goals align with Non-goals. AC matches Scope. Local Testing Plan matches AC. No contradictions found. |
| 3 | Reuse-First | PASS | — | Story explicitly reuses MSW handlers from WISH-2011 (`src/test/mocks/handlers.ts`), fixtures from `src/test/fixtures/s3-mocks.ts`, and Zod schemas from `@repo/api-client`. No per-story one-off utilities. |
| 4 | Ports & Adapters | PASS | — | Test infrastructure only (no API endpoints). Follows separation: browser worker setup (adapter) + handler definitions (core logic). No business logic violations. API layer architecture not applicable. |
| 5 | Local Testability | PASS | — | Story includes concrete E2E test plan (AC7: upload flow test). Test assertions verify MSW interception. Debug mode logs available (AC10). |
| 6 | Decision Completeness | CONDITIONAL | Medium | One unresolved detail: Browser context isolation approach (AC9) mentions "each browser context has isolated MSW instance" but doesn't specify mechanism. See Issue #1. |
| 7 | Risk Disclosure | PASS | — | 4 risks explicitly documented: worker script serving, Service Worker persistence, Node/browser handler differences, CI browser permissions. Mitigations provided for all. |
| 8 | Story Sizing | PASS | — | 13 AC, all focused on single infrastructure setup. No indicators of oversizing. Reasonable for Medium complexity (2-3 points). |

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| 1 | Browser Context Isolation Mechanism Unclear | Medium | AC9 states "each browser context has isolated MSW instance" but doesn't explain how isolation is achieved. Need to clarify: Does Playwright's default context isolation suffice, or does each test need explicit worker registration? Add implementation note or reference Playwright documentation on context isolation. |
| 2 | Worker Lifecycle Ambiguity | Low | AC5 says "MSW worker starts before each test" but AC2 says "global setup runs" worker registration. Clarify if worker is registered once (global setup) and persists, or restarted per test. Recommend: Document that worker.start() happens in global setup once, and handler.resetHandlers() runs before each test. |
| 3 | Error Injection Pattern Not Documented | Low | AC8 requires error injection ("test configures MSW to return 500 error") but doesn't explain how. Should this use server.use() runtime handlers, or predefined error fixtures? Add example or reference WISH-2011 error injection patterns. |

## Split Recommendation (if applicable)

N/A - Story does not require splitting. All AC are cohesive and focused on browser-mode MSW infrastructure setup.

## Preliminary Verdict

**Verdict**: CONDITIONAL PASS

**Reasoning**:
- Story is well-scoped, reuses existing infrastructure from WISH-2011, and follows test-first principles
- 3 medium/low severity issues require clarification before implementation
- No blocking gaps, but implementation guidance gaps could cause developer friction
- Once issues addressed (see Required Fixes), story is ready for implementation

**Required Actions**:
1. Clarify browser context isolation mechanism (Issue #1)
2. Document worker lifecycle (Issue #2)
3. Provide error injection example or reference (Issue #3)

---

## MVP-Critical Gaps

None - core journey is complete.

**Analysis**: This is an infrastructure story enabling E2E testing without AWS dependencies. The core journey is:
1. Developer runs Playwright tests
2. MSW intercepts API/S3 requests in browser
3. Tests pass without real backend

All AC support this journey. The 3 issues identified are implementation guidance gaps, not missing functionality. The story is complete for MVP; developers can implement the feature with reasonable assumptions.

**Non-MVP Enhancements**: See FUTURE-OPPORTUNITIES.md for polish items (error injection convenience helpers, debugging utilities, etc.)

---

## Worker Token Summary

- Input: ~27,000 tokens (files read: WISH-2121.md, stories.index.md, api-layer.md, WISH.plan.exec.md, WISH-2011.md, agent instructions)
- Output: ~2,500 tokens (ANALYSIS.md + FUTURE-OPPORTUNITIES.md)
