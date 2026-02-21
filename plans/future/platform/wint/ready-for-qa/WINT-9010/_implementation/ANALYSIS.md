# Elaboration Analysis - WINT-9010

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Story scope matches index entry exactly. No extra endpoints or infrastructure introduced. Correctly defers MCP tool refactoring to WINT-9020+. |
| 2 | Internal Consistency | CONDITIONAL PASS | Medium | `StoryStatus` type referenced in AC-2/AC-3 is ambiguous — three divergent state models exist in codebase. Goals do not contradict non-goals. |
| 3 | Reuse-First | PASS | — | Correctly identifies existing `SWIM_LANE_TO_STATE`, `STORY_ID_REGEX`, and `validTransitions` in source files. DEBT-RU-002/DEBT-RU-003 comments in mcp-tools explicitly validate extraction need. No `workflow-logic` package exists yet — creation is justified. |
| 4 | Ports & Adapters | PASS | — | AC-6 prohibits all runtime-specific SDKs. Three functions are pure computation. `detectMonorepoRoot()` (uses `fs`) must NOT be extracted. |
| 5 | Local Testability | PASS | — | Three pure functions with no I/O — straightforward to test. 80%+ coverage is easily achievable. |
| 6 | Decision Completeness | CONDITIONAL PASS | Medium | Blocking unresolved: which state model does `@repo/workflow-logic` canonicalize? Not explicitly stated in story. |
| 7 | Risk Disclosure | CONDITIONAL PASS | Medium | Story identifies pnpm workspace wiring risk. Misses state model divergence risk and AC-7 type compatibility risk. |
| 8 | Story Sizing | PASS | — | 11 ACs is borderline but ACs 1-4 are boilerplate scaffold, ACs 5-6 are constraints, ACs 7-8 are wiring, ACs 9-11 are quality gates. Functional scope is 3 pure functions. Split not required. |

---

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| 1 | `StoryStatus` type ambiguity: AC-2 and AC-3 use `StoryStatus` but three divergent models exist: (a) 17-value hyphenated model in `orchestrator/src/state/story-state-machine.ts`, (b) 8-value `StoryState` in `orchestrator/src/state/enums/story-state.ts`, (c) 8-value snake_case DB model in `mcp-tools/src/story-management/__types__/index.ts` | Critical | Add design decision to story specifying which model `@repo/workflow-logic` uses. Recommendation: use 17-value model from `story-state-machine.ts` (Claude Code primary path) |
| 2 | AC-3 return type mismatch: `getStatusFromDirectory` described as returning `StoryStatus \| null` but `SWIM_LANE_TO_STATE` in story-compatibility produces snake_case DB values incompatible with the hyphenated `StoryStatus` from story-state-machine.ts | Critical | Align AC-3 return type with decision from Issue #1. If using 17-value model, update `getStatusFromDirectory` to return the hyphenated form. |
| 3 | AC-7 integration: `story-compatibility/index.ts` uses snake_case state values but `story-state-machine.ts` uses hyphenated values. Direct import may fail type-checking without an adapter. | Medium | Specify in story whether AC-7 requires a type adapter or whether the shared package provides both forms. |
| 4 | `getValidTransitions` (AC-2) near-duplicates existing `validTransitions` record in `story-state-machine.ts`. Story does not address whether this function replaces or wraps the existing implementation. | Medium | Add note: `@repo/workflow-logic` provides canonical implementation; orchestrator's existing code imports from it. |
| 5 | `detectMonorepoRoot()` and `resolveStoriesRoot()` in story-compatibility use `fs` — must NOT be extracted into shared package per AC-6. Story scope does not attempt this, but implementation risk exists. | Low | Add explicit note to story that these two utilities are excluded from extraction scope. |

---

## Split Recommendation

Not applicable — split not required.

---

## Preliminary Verdict

**Verdict**: CONDITIONAL PASS

Story is well-scoped with correctly identified extraction candidates. Package structure is sound. Two blocking type ambiguities (Issues #1 and #2) must be resolved before safe implementation. These determine the type signatures of the core deliverables (AC-2, AC-3, AC-7).

---

## MVP-Critical Gaps

| # | Gap | Blocks | Required Fix |
|---|-----|--------|--------------|
| 1 | No explicit decision on which `StoryStatus` type the shared package canonicalizes. Three models exist in the codebase and the story references `StoryStatus` without disambiguation. | AC-2, AC-3, AC-7 | Add AC: "The shared package defines `WorkflowStoryStatus` using the 17-value model from `story-state-machine.ts`. The snake_case DB state enum used by mcp-tools is bridged via a `toDbStatus(s: WorkflowStoryStatus): string` adapter exported alongside." |
| 2 | AC-7 requires `story-compatibility/index.ts` to import from `@repo/workflow-logic`, but story-compatibility currently uses snake_case state values. An adapter is needed and not scoped. Without it, AC-7 cannot be satisfied without a type mismatch. | AC-7 (integration proof) | Add a `toDbStoryStatus(status: WorkflowStoryStatus): DbStoryStatus` adapter function to the shared package scope. This is a 5-line pure function but must be explicit in ACs. |

---

## Worker Token Summary

- Input: ~15k tokens (story file, index, PLAN.md, 4 source files, package configs)
- Output: ~4k tokens (ANALYSIS.md + FUTURE-OPPORTUNITIES.md)
