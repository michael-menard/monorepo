# Elaboration Analysis - KBAR-0040

## Audit Results

| # | Check | Status | Severity | Notes |
|---|-------|--------|----------|-------|
| 1 | Scope Alignment | PASS | — | Story scope exactly matches stories.index.md Wave 4 entry: "Artifact Sync Functions ← KBAR-0030, blocks KBAR-0050". Package confined to `packages/backend/kbar-sync/`. No extra endpoints, infra, or unrelated packages. |
| 2 | Internal Consistency | PASS | — | Goals (single-artifact + batch sync), Non-goals (no story file changes, no CLI, no watchers), ACs, and Scope are fully coherent. One minor inconsistency noted below (output schema `syncStatus` enum). |
| 3 | Reuse-First | PASS | — | `computeChecksum`, `validateFilePath`, `validateNotSymlink`, `validateInput`, `normalizeOptionalField` all imported from existing `__types__/index.ts`. Sync event, atomic write, and transaction patterns inherited from KBAR-0030. No one-off utilities introduced. |
| 4 | Ports & Adapters | PASS | — | No HTTP endpoints. Pure library package — transport-agnostic functions. KBAR-0050 (CLI) is the adapter layer. Core logic properly isolated. |
| 5 | Local Testability | PASS | — | No HTTP endpoints; `.http` files not required. Integration tests via testcontainers specified for each AC. Unit test file list complete. ADR-005/006 compliance explicitly stated. |
| 6 | Decision Completeness | CONDITIONAL PASS | Low | Three low-severity open items from DEV-FEASIBILITY remain: (1) 5MB limit behaviour (hard error vs. warning), (2) `story_file` exclusion in batch discovery documentation, (3) `_pm/STORY-SEED.md` and `_pm/DEV-FEASIBILITY.md` both mapped to `elaboration` type — two different files share the same type with no sub-type distinction. None block implementation. |
| 7 | Risk Disclosure | PASS | — | Five MVP-critical risks explicitly documented in DEV-FEASIBILITY.md: path security (HIGH), N+1 queries (HIGH), version number race (MEDIUM), checkpoint consistency (MEDIUM), `as any` type casts (MEDIUM). KBAR-0030 lessons directly integrated. No hidden dependencies. |
| 8 | Story Sizing | CONDITIONAL PASS | Medium | 9 ACs (one over threshold of 8). Both single-artifact and batch work present, touching 6 DB tables. Split risk prediction: 0.7. See split analysis below. |

---

## Issues Found

| # | Issue | Severity | Required Fix |
|---|-------|----------|--------------|
| 1 | AC-1 output schema defines `syncStatus: z.enum(['synced', 'skipped'])` but the existing `SyncStoryToDatabaseOutputSchema` uses `z.enum(['completed', 'failed', 'skipped'])`. The story uses `'synced'` as the success value for artifact sync. This deviation from the established KBAR-0030 pattern must be an intentional decision — it should be explicitly documented in the story or `__types__/index.ts` so reviewers do not flag it as inconsistency. | Low | Document the `syncStatus` enum difference in `__types__/index.ts` with a comment explaining why artifact sync uses `'synced'` vs. story sync's `'completed'`. |
| 2 | `ARTIFACT_FILENAME_MAP` maps both `_pm/STORY-SEED.md` and `_pm/DEV-FEASIBILITY.md` to the type `'elaboration'`. Since both files produce `elaboration` type artifacts, querying "the elaboration artifact for a story" is ambiguous — two rows of the same type would be created. The `kbar.artifacts` unique constraint (if any exists on `storyId + artifactType`) could cause a conflict. | Medium | Verify the `kbar.artifacts` table schema — if there is a unique index on `(storyId, artifactType)`, then having two `elaboration` artifacts per story will violate it. Either (a) confirm no such constraint exists and batch logic handles multiple rows of the same type, or (b) use `filePath` as the disambiguator and document the mapping as "type is not unique per story". This must be resolved before dev starts. |
| 3 | The 5MB file size limit is mentioned in the Non-Goals ("5MB limit is acceptable") but the behavior when the limit is exceeded is unspecified — DEV-FEASIBILITY flags it as an open decision. | Low | PM to decide: hard error returning `{ success: false, error: 'File too large' }` or graceful warning with a `cacheStatus: 'oversized'` flag. Add one sentence to AC-1 and AC-2. |
| 4 | The story specifies AC-9 requires `>80% coverage` but does not list a `batch-sync-by-type.test.ts` unit test file — only an integration test is listed for `batchSyncByType`. The unit test for the batch-by-type function is missing from the file list. | Low | Add `src/__tests__/batch-sync-by-type.test.ts` to the test file list in Scope section so coverage calculation includes unit coverage for AC-5. |

---

## Split Recommendation

The story has a split risk prediction of 0.7 and 9 ACs. However, the split is NOT required as a hard gate because:

- Single-artifact sync (AC-1, AC-2, AC-3, AC-6, AC-7, AC-8) and batch sync (AC-4, AC-5) are technically sequential — batch functions call single-artifact functions internally. Splitting requires delivering single-artifact first, then batch.
- The story is backend-only with no UI, making coordination overhead low.
- All infrastructure (tables, package, utilities) already exists.

A voluntary split would reduce review cycle time and lower integration risk:

| Split | Scope | AC Allocation | Dependency |
|-------|-------|---------------|------------|
| KBAR-0040-A | Single-artifact sync functions: `syncArtifactToDatabase`, `syncArtifactFromDatabase`, `detectArtifactConflicts`, Zod schemas, path security, content cache, unit + integration tests | AC-1, AC-2, AC-3, AC-6, AC-7 (partial), AC-8, AC-9 (partial) | Depends on KBAR-0030 merged |
| KBAR-0040-B | Batch sync functions: `batchSyncArtifactsForStory`, `batchSyncByType`, `ARTIFACT_FILENAME_MAP`, checkpoint resumption, batch tests | AC-4, AC-5, AC-7 (batch schemas), AC-9 (batch tests) | Depends on KBAR-0040-A |

**Recommendation**: Proceed as a single story (KBAR-0040) given the backend-only scope and well-established patterns. If the dev reports > 3 review cycles or scope creep, split at the boundary above retroactively.

---

## Preliminary Verdict

**Verdict**: CONDITIONAL PASS

All 8 audit checks pass or conditionally pass. No MVP-critical issues block implementation. The story is ready to proceed to dev once:

1. The `kbar.artifacts` unique constraint question (Issue #2) is resolved — this is the only item that could cause a runtime defect during dev.
2. The 5MB limit behavior (Issue #3) is documented with one additional sentence.

Issues #1 and #4 are documentation/completeness items that can be resolved during implementation.

---

## MVP-Critical Gaps

| # | Gap | Blocks | Required Fix |
|---|-----|--------|--------------|
| 1 | Ambiguous `kbar.artifacts` unique constraint for multiple `elaboration` type artifacts per story (`_pm/STORY-SEED.md` and `_pm/DEV-FEASIBILITY.md` both map to `'elaboration'`). If a unique index exists on `(storyId, artifactType)`, the second insert will fail with a constraint violation. | AC-4 batch sync for any story that has both elaboration files (nearly all stories) — batch would partially fail or crash | Inspect `packages/backend/database-schema/src/schema/kbar.ts` `artifacts` table definition before dev starts. If unique constraint on `(storyId, artifactType)` exists, the `ARTIFACT_FILENAME_MAP` must be revised to assign distinct types or the constraint must be confirmed absent. PM to confirm. |

---

## Worker Token Summary

- Input: ~18,000 tokens (KBAR-0040.md, platform.stories.index.md, DEV-FEASIBILITY.md, TEST-PLAN.md, STORY-SEED.md, __types__/index.ts, index.ts, sync-story-to-database.ts, elab-analyst.agent.md)
- Output: ~2,200 tokens (ANALYSIS.md + FUTURE-OPPORTUNITIES.md)
