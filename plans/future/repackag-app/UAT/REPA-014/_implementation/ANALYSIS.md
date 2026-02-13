# Elaboration Analysis - REPA-014

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Story scope matches stories.index.md exactly. Four hooks identified: useLocalStorage, useUnsavedChangesPrompt, useDelayedShow, useMultiSelect. No extra features or infrastructure introduced. |
| 2 | Internal Consistency | PASS | — | Goals and Non-goals are consistent. ACs match scope. No contradictions found. Test plan aligns with unit testing focus (no user-facing changes). |
| 3 | Reuse-First | PASS | — | Story IS reuse-first - creates shared package to eliminate duplicates. Follows REPA-001 pattern. Uses existing @repo/logger dependency. No per-story one-offs created. |
| 4 | Ports & Adapters | PASS | — | Not applicable - no backend/API changes. Hooks are transport-agnostic React utilities. No HTTP layer involved. |
| 5 | Local Testability | PASS | — | Comprehensive unit tests exist (815 lines total). Tests migrate with hooks. AC-9, AC-10, AC-11 verify tests pass in new location. Build verification in AC-15, AC-16. |
| 6 | Decision Completeness | PASS | — | All design decisions made. TanStack Router dependency accepted (peer dep). Export pattern specified (named exports, no barrel files). Migration strategy defined (3-step). No blocking TBDs. |
| 7 | Risk Disclosure | PASS | — | Risks properly disclosed: TanStack Router version alignment, circular dependency check, missing tests for useUnsavedChangesPrompt. All risks verified during analysis (see MVP-Critical Gaps section). No hidden dependencies. |
| 8 | Story Sizing | PASS | — | 14 ACs total. Touches 4 packages (within limit). Frontend-only work. No bundled independent features. Clear single purpose (consolidate hooks). Size is appropriate for 5 SP estimate. |

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| 1 | Consumer count mismatch | Low | Story claims "21 files" but actual count is 18 files: 6 hook definitions (to delete), 8 consumer files (import updates), 3 test files (to migrate), 1 re-export file (index.ts). Close enough for planning purposes but AC-12 should reference "8 consumer files" for clarity. The "101 import references" claim could not be verified - may include internal hook calls. |
| 2 | Missing test verification AC for useUnsavedChangesPrompt | Medium | AC-11 stops at useMultiSelect tests. Add AC to explicitly verify useUnsavedChangesPrompt imports correctly (type checking only since no tests exist). Current AC-16 covers this implicitly but should be explicit. |
| 3 | Export pattern inconsistency | Medium | Story specifies individual exports in AC-3 (`./useLocalStorage`, etc.) but REPA-001 pattern (@repo/upload) uses subdirectory barrel exports. Need to clarify: are these file-level exports or do we need index.ts re-exports per hook? CLAUDE.md says "no barrel files" but example in AC-3 shows direct file exports which is correct. |
| 4 | Missing explicit confirmation of risk verification | Low | Story identifies TanStack Router and circular dependency risks but doesn't require explicit pre-flight verification. Recommend adding checkpoint: "Verify all apps use compatible @tanstack/react-router versions" and "Verify @repo/logger has no imports from apps/web/**". NOTE: Both verified during analysis - all apps use ^1.130.2, no circular deps found. |
| 5 | Incomplete test coverage for useUnsavedChangesPrompt | Medium | Story acknowledges "no test file exists" (Test Plan line 319, Risk 3) but mitigation is vague ("add smoke test OR add basic unit test"). Should specify which approach is required for MVP. Recommend: make type-check verification explicit as minimum bar. |

## Split Recommendation

Not applicable - story is appropriately sized.

## Preliminary Verdict

**Verdict**: PASS

**Reasoning:**
- All 8 audit checks pass
- Core journey is well-defined (create package → migrate hooks → update consumers → delete duplicates)
- No MVP-critical gaps found - all identified risks verified during analysis:
  - TanStack Router versions aligned (all apps use ^1.130.2)
  - No circular dependency risk (@repo/logger has no imports from apps/web/**)
  - Missing tests for useUnsavedChangesPrompt acknowledged, type-checking mitigation specified
- Issues found are documentation/clarity improvements, not blockers
- Story is ready for implementation

---

## MVP-Critical Gaps

None - core journey is complete.

**Note on identified risks:**
- **Risk 1 (TanStack Router version alignment):** ✅ VERIFIED - All 6 consuming apps use `^1.130.2`, versions are aligned
- **Risk 2 (Circular dependency with @repo/logger):** ✅ VERIFIED - Checked packages/core/logger/src/, no imports from apps/web/** found
- **Risk 3 (Missing tests for useUnsavedChangesPrompt):** Acknowledged in story, mitigation is type-checking (AC-16). Not MVP-blocking since hook is already in production use without tests in current locations.

---

## Worker Token Summary

- Input: ~48,077 tokens (files read: story, seed, stories.index, PLAN.exec.md, agent instructions, hook implementations, test files, package.json files, architecture docs)
- Output: ~4,500 tokens (ANALYSIS.md + FUTURE-OPPORTUNITIES.md)
