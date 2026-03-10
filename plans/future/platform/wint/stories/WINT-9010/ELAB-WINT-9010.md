# Elaboration Report - WINT-9010

**Date**: 2026-02-17
**Verdict**: CONDITIONAL PASS

## Summary

WINT-9010 establishes a shared business logic package (`@repo/workflow-logic`) to enable LangGraph nodes and Claude Code MCP tools to call the same functions without duplication. The story is well-scoped with correctly identified extraction candidates (story status transitions, swim-lane directory mapping, story ID validation). Two critical type ambiguities regarding `StoryStatus` canonicalization and AC-7 DB adapter requirements have been resolved via new ACs 12 and 13.

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Story scope matches index entry exactly. No extra endpoints or infrastructure introduced. Correctly defers MCP tool refactoring to WINT-9020+. |
| 2 | Internal Consistency | CONDITIONAL PASS → RESOLVED | Medium | `StoryStatus` type referenced in AC-2/AC-3 is now disambiguated. AC-12 establishes WorkflowStoryStatus as the 17-value hyphenated model. Goals do not contradict non-goals. |
| 3 | Reuse-First | PASS | — | Correctly identifies existing `SWIM_LANE_TO_STATE`, `STORY_ID_REGEX`, and `validTransitions` in source files. DEBT-RU-002/DEBT-RU-003 comments in mcp-tools explicitly validate extraction need. No `workflow-logic` package exists yet — creation is justified. |
| 4 | Ports & Adapters | PASS | — | AC-6 prohibits all runtime-specific SDKs. Three functions are pure computation. `detectMonorepoRoot()` (uses `fs`) must NOT be extracted. |
| 5 | Local Testability | PASS | — | Three pure functions with no I/O — straightforward to test. 80%+ coverage is easily achievable. |
| 6 | Decision Completeness | CONDITIONAL PASS → RESOLVED | Medium | Blocking unresolved question resolved: `@repo/workflow-logic` canonicalizes the 17-value hyphenated model from story-state-machine.ts as WorkflowStoryStatus. |
| 7 | Risk Disclosure | CONDITIONAL PASS → RESOLVED | Medium | State model divergence risk and AC-7 type compatibility risk now explicitly disclosed via new ACs 12 and 13. pnpm workspace wiring risk previously documented. |
| 8 | Story Sizing | PASS | — | 13 ACs (11 original + 2 new). ACs 1-4 are boilerplate scaffold, ACs 5-6 are constraints, ACs 7-8 are wiring, ACs 9-11 are quality gates, ACs 12-13 are critical pre-implementation guards. Split not required. |

---

## Issues & Required Fixes

| # | Issue | Severity | Required Fix | Status |
|---|-------|----------|--------------|--------|
| 1 | `StoryStatus` type ambiguity: AC-2 and AC-3 use `StoryStatus` but three divergent models exist in codebase | Critical | AC-12: Specify WorkflowStoryStatus uses 17-value hyphenated model from story-state-machine.ts | Resolved via AC-12 |
| 2 | AC-3 return type mismatch: `getStatusFromDirectory` returns values incompatible between hyphenated and snake_case models | Critical | AC-12/AC-13: Return type must align with WorkflowStoryStatus choice; adapter bridges DB model | Resolved via AC-12/AC-13 |
| 3 | AC-7 integration: story-compatibility uses snake_case state values, incompatible with hyphenated WorkflowStoryStatus without adapter | Medium | AC-13: `toDbStoryStatus(status: WorkflowStoryStatus): DbStoryStatus` adapter function explicitly scoped | Resolved via AC-13 |
| 4 | `getValidTransitions` near-duplicates existing `validTransitions` record in story-state-machine.ts | Medium | Story scope addresses correctly: shared package provides canonical implementation; orchestrator imports from it | Acknowledged |
| 5 | `detectMonorepoRoot()` and `resolveStoriesRoot()` use `fs` — risk of incorrect extraction | Low | Story scope correctly excludes these per AC-6 (no runtime-specific dependencies) | Acknowledged |

---

## Discovery Findings

### Gaps Identified

| # | Finding | Decision | Notes |
|---|---------|----------|-------|
| 1 | No explicit decision on which StoryStatus type the shared package canonicalizes — three divergent models exist | Add as AC | Resolved by adopting the 17-value hyphenated model from story-state-machine.ts as WorkflowStoryStatus. AC-12 captures this decision explicitly. |
| 2 | AC-7 integration requires adapter function to bridge 17-value model to snake_case DB model | Add as AC | A `toDbStoryStatus(status: WorkflowStoryStatus): DbStoryStatus` pure function is a 5-line computation fully compatible with AC-6. AC-13 captures this requirement. |

### Enhancement Opportunities

| # | Finding | Decision | Notes |
|---|---------|----------|-------|
| 1 | DEBT-RU-002/003 deduplication across mcp-tools files | Tech Debt | Non-blocking. Recommend follow-on story after WINT-9010 to deduplicate DB state enum across mcp-tools. Logged for future reference. |
| 2 | workspace-utils extraction for detectMonorepoRoot/resolveStoriesRoot | Architecture | Non-blocking. Deferred. These utilities are explicitly excluded from WINT-9010 extraction scope per AC-6. |
| 3 | State model consolidation (3 models → 1 canonical) | Architecture | Non-blocking. WINT-9010 bridges but does not unify. Full canonicalization is deferred to a dedicated Phase 9 architectural story. |
| 4 | Reverse directory mapping getDirectoryFromStatus | Future Work | Non-blocking. Add to @repo/workflow-logic in follow-on story or during WINT-9020 if needed. |
| 5 | Extend STORY_ID_REGEX to 5-digit suffixes | Edge Case | Low priority. Recommend extending regex to \\d{3,5} during WINT-9010 implementation — trivial change, zero risk. |
| 6 | Property-based tests with fast-check | Testing | Low priority. Consider for WINT-9010 test suite if coverage target is met with fewer manual cases. |
| 7 | Export raw validTransitions record | API Design | Low priority. Only add if a WINT-9020+ story explicitly requests it — adds API surface area without confirmed consumer. |
| 8 | StoryLifecycle namespace grouping | DX | Deferred. Start with flat exports per project conventions (no barrel files rule). Refactor if import ergonomics become a pain point. |

### Follow-up Stories Suggested

- None (autonomous mode — WINT-9020 through WINT-9050 are pre-planned blockers)

### Items Marked Out-of-Scope

- LangGraph node porting (WINT-9020+)
- MCP tool refactoring to use new package (optional per story, WINT-9020+)
- fs-based utilities (detectMonorepoRoot, resolveStoriesRoot)
- Runtime-specific dependencies

### KB Entries Created (Autonomous Mode Only)

- KB status: unavailable (8 findings recorded in DECISIONS.yaml for future KB write)

---

## Proceed to Implementation?

**YES** — story may proceed to ready-to-work. Type resolution (AC-12) and adapter scope (AC-13) are the pre-implementation guards. Both have been documented in the story file and must be honored during implementation to ensure type safety across execution paths.
