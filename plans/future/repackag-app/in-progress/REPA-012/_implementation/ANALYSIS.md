# Elaboration Analysis - REPA-012

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Story scope matches index entry exactly: Create @repo/auth-hooks, implement useModuleAuth, move usePermissions/useTokenRefresh, delete 6 stubs |
| 2 | Internal Consistency | PASS | — | Goals, Non-goals, AC all align. No contradictions found |
| 3 | Reuse-First | PASS | — | Moves existing code from main-app, references @repo/upload structure, imports from @repo/api-client |
| 4 | Ports & Adapters | PASS | — | Frontend-only package, no API endpoints. Hooks read from Redux (adapter pattern). No business logic violations |
| 5 | Local Testability | PASS | — | Comprehensive test migration plan. 451 LOC of existing tests to migrate + new useModuleAuth tests. Vitest + RTL specified |
| 6 | Decision Completeness | CONDITIONAL | Medium | One unresolved design question: circular dependency mitigation for useTokenRefresh → useToast |
| 7 | Risk Disclosure | PASS | — | All risks disclosed: RTK Query dependency, Redux store dependency, test migration fragility, circular dependency |
| 8 | Story Sizing | PASS | — | 5 SP appropriate: 3 migrations (2.5 SP) + 1 new implementation (1.5 SP) + cleanup (0.5 SP). No split needed |

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| 1 | Circular dependency risk: @repo/auth-hooks → @repo/app-component-library (useToast) → @repo/auth-hooks (usePermissions) | Medium | Mitigation strategy required: Either extract toast to separate package, use @repo/logger instead, or accept circular import with careful packaging |
| 2 | TypeScript interface in stub files needs Zod conversion | Low | Convert `interface UseModuleAuthReturn` to Zod schema in AC-2 (already planned) |
| 3 | Story uses term "delete" for stub files but doesn't specify git tracking cleanup | Low | Clarify in AC-5: "Delete 6 stub files and remove from git" |

## Split Recommendation

**Not Required**

Story is appropriately sized at 5 SP:
- Clear boundaries: 3 migrations + 1 implementation + cleanup
- Each AC independently testable
- No bundled features
- Single package creation (not multiple systems)

## Preliminary Verdict

**CONDITIONAL PASS**

**Rationale:**
- Story is well-scoped, testable, and follows established patterns
- All quality gates defined, dependencies identified
- Test migration strategy preserves 451 LOC of existing tests
- One **Medium severity** issue requires resolution before implementation: circular dependency mitigation

**Required Pre-Implementation Decision:**
Resolve circular dependency strategy for useTokenRefresh → useToast import. Options:
1. Extract toast to separate `@repo/notifications` package (cleanest, more work)
2. Replace useToast with @repo/logger toast utilities (simplest, less user-friendly)
3. Accept circular dependency with careful package.json configuration (pragmatic, risky)

Recommend **Option 2** for MVP: Replace useToast with logger-based notifications. Track Option 1 as future enhancement.

---

## MVP-Critical Gaps

**None - core journey is complete**

All MVP-critical requirements are addressed:
- Package structure creation (AC-1) ✓
- Real useModuleAuth implementation connected to Redux (AC-2) ✓
- usePermissions migration with all helper hooks (AC-3) ✓
- useTokenRefresh migration preserving functionality (AC-4) ✓
- Stub deletion and import updates (AC-5) ✓
- Testing and documentation (AC-6, AC-7) ✓

The circular dependency issue is **not MVP-blocking** because:
- Workaround exists (use @repo/logger instead of useToast)
- Functionality preserved (users still see notifications)
- Can be enhanced post-MVP (extract to @repo/notifications)

---

## Worker Token Summary

- Input: ~60,000 tokens (story file, seed, agent instructions, codebase files, test files)
- Output: ~2,500 tokens (ANALYSIS.md + FUTURE-OPPORTUNITIES.md)
