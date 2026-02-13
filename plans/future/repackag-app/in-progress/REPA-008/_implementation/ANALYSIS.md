# Elaboration Analysis - REPA-008

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Scope matches stories.index.md exactly: extract keyboard hooks to shared packages |
| 2 | Internal Consistency | PASS | — | Goals, Non-goals, AC, and Test Plan are aligned. No contradictions found |
| 3 | Reuse-First | PASS | — | Properly leverages existing @repo/gallery and @repo/accessibility packages with hooks directories already present |
| 4 | Ports & Adapters | PASS | — | No API endpoints involved. Hooks are pure React logic with no transport concerns |
| 5 | Local Testability | PASS | — | Comprehensive unit tests for all hooks with migration from existing test suites. Manual verification steps included |
| 6 | Decision Completeness | CONDITIONAL PASS | Low | Minor: useGallerySelection is marked OPTIONAL but AC5 checklist items are not clearly marked as optional. Could cause confusion during implementation |
| 7 | Risk Disclosure | PASS | — | Low risk appropriately disclosed. Migration paths clear, no breaking changes, no infrastructure dependencies |
| 8 | Story Sizing | PASS | — | 2 SP is appropriate. 8 ACs but AC5 is optional. Clear phased approach. Touches 2 packages + 2 apps which is within limits |

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| 1 | AC5 optional status unclear | Low | In AC5 section, prefix all checklist items with "(OPTIONAL)" to make the optional nature explicit during implementation |
| 2 | Barrel export pattern conflicts with project guidelines | Medium | Story plans to add hooks to existing barrel exports in index.ts, but CLAUDE.md explicitly states "NO BARREL FILES - import directly from source files". This needs clarification or the story approach must change |
| 3 | Test file migration paths incomplete | Low | Story lists source test files but doesn't document the exact commands/steps for migrating tests with git history preservation |
| 4 | Package build verification commands incomplete | Low | AC1 and AC2 use `pnpm build --filter=@repo/gallery` but should verify if both packages need to be built together due to potential cross-dependencies |

## Split Recommendation

Not applicable - story size is appropriate for 2 SP.

## Preliminary Verdict

**Verdict**: CONDITIONAL PASS

Story is well-structured and ready for implementation with minor fixes required:

1. **Critical Issue**: Resolve barrel export conflict with project guidelines (Issue #2)
2. **Minor Issues**: Clarify optional AC items and improve test migration documentation

---

## MVP-Critical Gaps

| # | Gap | Blocks | Required Fix |
|---|-----|--------|--------------|
| 1 | Barrel export pattern violates CLAUDE.md | Implementation approach conflicts with project standards | Must choose: (A) Update story to use direct imports instead of barrel exports, OR (B) Document exception to barrel file rule for package-level exports in CLAUDE.md |

The core user journey (consolidating duplicate hooks into shared packages) can proceed once the export strategy is clarified. This is a critical architectural decision that must be resolved before implementation begins.

---

## Worker Token Summary

- Input: ~39,000 tokens (story file, index, plan files, agent instructions, codebase verification)
- Output: ~2,500 tokens (ANALYSIS.md + FUTURE-OPPORTUNITIES.md)
- Verification: Checked 4 hook implementations across 2 apps, 2 package structures, test file locations
