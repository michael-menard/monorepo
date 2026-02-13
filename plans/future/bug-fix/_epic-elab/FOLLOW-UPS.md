# Follow-Ups: BUGF

Deferred items from epic elaboration on 2026-02-11.

---

## Deferred from MVP

Items deferred from the MVP scope but should be revisited in post-MVP phases.

| Story | Title | Reason | Severity | Review By |
|-------|-------|--------|----------|-----------|
| BUGF-007 | Fix Dashboard Test/Implementation Mismatches | Dashboard test mismatches not blocking core user journeys — not essential for MVP. Requires decision per mismatch (fix tests or fix implementation). | Medium | 2026-03-15 |
| BUGF-011 | Add Test Coverage for Dashboard Components | Dashboard component tests non-blocking for MVP scope. Can be addressed once core gallery and instruction flows are fully tested and deployed. | Medium | 2026-03-15 |

---

## Context

### BUGF-007 Analysis
- **Original findings**: 5 critical test failures in app-dashboard
- **Problem**: Tests don't match actual component implementations
- **Decision required**: For each mismatch, decide to fix test or fix implementation
- **Why deferred**: Dashboard functionality is not part of MVP user journeys (core: gallery, instructions, sets, auth, uploads)
- **Risk if skipped**: Dashboard tests remain unreliable; may cause false positives/negatives
- **Recommendation**: Schedule for Phase 3.5 or Phase 4, after core features stabilize

### BUGF-011 Analysis
- **Original findings**: 8 untested dashboard components (DashboardHeader, charts, tables, FilterBar, etc.)
- **Problem**: No test coverage exists for these components
- **Dependency**: Blocked by BUGF-007 (needs test/implementation alignment first)
- **Why deferred**: Dashboard is not critical for MVP launch; test coverage for gallery/instruction components takes priority
- **Risk if skipped**: Dashboard may have hidden bugs; no automated verification of dashboard functionality
- **Recommendation**: Start after BUGF-007 is resolved and core gallery tests (BUGF-012) pass acceptance

---

## Post-MVP Roadmap

### Phase 3.5 (Post-MVP Quality Pass)
1. Schedule decision workshop for BUGF-007 with product/engineering
2. Resolve BUGF-007 mismatches (2-3 days)
3. Implement BUGF-011 test coverage (3-4 days)

### Phase 4 (Code Quality & Cleanup)
- Integrate BUGF-007/011 results into overall test coverage metrics
- Update CI/CD dashboard monitoring if new tests added

---

## Next Steps

1. **Immediately**: Proceed with MVP stories (BUGF-001 through BUGF-006, and Phase 3 core stories)
2. **Acceptance criteria**: Core user journeys (upload, edit, gallery browsing, auth) fully tested and shipped
3. **Trigger review**: When MVP reaches QA sign-off, schedule BUGF-007 decision workshop
4. **Timeline**: Plan BUGF-007/011 for 2-3 weeks after MVP launch

---

## Rationale Summary

The BUGF epic was analyzed to identify MVP-critical vs. nice-to-have work. The decision framework:

1. **Critical** = blocks core user journeys (upload, edit, delete, authentication, gallery browsing)
2. **Important** = affects multiple apps or security (auth consolidation, logging, rate limiting)
3. **Quality** = improves codebase without blocking users (test coverage, refactoring, debt)
4. **Nice-to-have** = affects non-core features (dashboard)

Dashboard functionality exists but is not part of MVP user flows. Deferring BUGF-007 and BUGF-011 allows the team to focus on:
- Presigned URL API implementation (BUGF-001)
- File upload test infrastructure (BUGF-028)
- Core gallery and instruction test coverage (BUGF-012, BUGF-013)
- Auth security review (BUGF-026) before consolidation

Both stories are still valuable and should be completed in post-MVP phases when the team has capacity and clearer understanding of dashboard requirements.
