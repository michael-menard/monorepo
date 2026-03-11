# Dev Feasibility Review: KBAR-0040 — Artifact Sync Functions

## Feasibility Summary

- **Feasible for MVP**: Yes
- **Confidence**: High
- **Why**: KBAR-0040 is a purely additive extension of an existing, well-established package (`packages/backend/kbar-sync/`). All required utility functions (`computeChecksum`, `validateFilePath`, `validateNotSymlink`, `validateInput`, `normalizeOptionalField`) are already implemented and exported. The database schema is complete and protected. The sync patterns (create-pending event, update-completed/failed, atomic write, Drizzle transactions) are already proven in KBAR-0030. No new infrastructure, no new schema, no HTTP endpoints, no UI. The work is scoped to writing new TypeScript functions following established patterns.

---

## Likely Change Surface (Core Only)

**Package: `packages/backend/kbar-sync/`**

New files to create:
- `src/sync-artifact-to-database.ts` — single artifact filesystem→DB sync
- `src/sync-artifact-from-database.ts` — single artifact DB→filesystem sync
- `src/batch-sync-artifacts.ts` — batch sync all artifacts for a story
- `src/batch-sync-by-type.ts` — batch sync by artifact type across all stories
- `src/detect-artifact-conflicts.ts` (new) or extend existing — conflict detection for artifacts

Modified files:
- `src/index.ts` — export new functions and Zod schemas
- `src/__types__/index.ts` — add `ARTIFACT_FILENAME_MAP` (filename → artifactType) and new Zod schemas

**Package: `packages/backend/kbar-sync/` test files**
- `src/__tests__/sync-artifact-to-database.test.ts`
- `src/__tests__/sync-artifact-from-database.test.ts`
- `src/__tests__/batch-sync-artifacts.test.ts`
- `src/__tests__/detect-artifact-conflicts.test.ts`
- Integration test files (testcontainers)

**No changes to**:
- `packages/backend/database-schema/` (protected — KBAR-0010)
- `packages/backend/kbar-sync/src/sync-story-to-database.ts` (KBAR-0030 output — read-only)
- `packages/backend/kbar-sync/src/sync-story-from-database.ts` (KBAR-0030 output — read-only)
- `packages/backend/kbar-sync/src/detect-sync-conflicts.ts` (KBAR-0030 output — read-only)
- Any WINT or INFR packages

---

## MVP-Critical Risks (Max 5)

### Risk 1: Path security validation omission (HIGH — from KBAR-0030 lesson)

- **Risk**: KBAR-0030 had path traversal (CWE-22) and symlink following (CWE-59) vulnerabilities found as HIGH blockers in code review.
- **Why it blocks MVP**: Security vulnerabilities in file I/O functions are launch blockers. KBAR-0040 has identical filesystem access patterns.
- **Required mitigation**: Apply `validateFilePath` and `validateNotSymlink` (imported from `__types__/index.ts`) before every `readFile`, `writeFile`, and `rename` call. This is mandatory, not optional. AC-8 is non-negotiable.

### Risk 2: N+1 query pattern in batch operations (HIGH — from KBAR-0030 lesson)

- **Risk**: Batch sync functions processing 100+ artifacts could issue repeated single-row queries for `artifacts` and `stories` lookups.
- **Why it blocks MVP**: At batch scale (the purpose of AC-4 and AC-5 is to bootstrap the database from hundreds of existing artifacts), N+1 queries will cause severe performance degradation and potential timeouts.
- **Required mitigation**: Use Drizzle `.leftJoin()` or batch-fetch artifact rows before the loop. Cache lookup results within a single batch call. Follow the join-over-N+1 pattern from KBAR-0030.

### Risk 3: Version number race condition in `artifactVersions` (MEDIUM)

- **Risk**: When inserting a new `artifactVersions` row, the function must read `MAX(version)` and increment. If two concurrent syncs run for the same artifact, both could read `MAX(version) = 1` and both try to insert `version = 2`, causing a unique constraint violation.
- **Why it blocks MVP**: Version history integrity is a core requirement. Constraint violations cause transaction failures.
- **Required mitigation**: Perform `MAX(version) + 1` read and insert inside the same Drizzle `db.transaction()`. The transaction serialization prevents race conditions. This must be done within the transaction boundary, not before it.

### Risk 4: Batch checkpoint state consistency (MEDIUM)

- **Risk**: The `batchSyncByType` function (AC-5) must update `kbar.syncCheckpoints` after each artifact. If the checkpoint write fails while the artifact sync succeeded, the batch will re-process already-synced artifacts on resumption.
- **Why it blocks MVP**: Incorrect checkpoint state causes redundant processing and potentially incorrect version increments.
- **Required mitigation**: Wrap the artifact sync + checkpoint update in a single transaction per artifact. If the checkpoint update fails, roll back the artifact sync for that artifact and mark it as failed (not skipped).

### Risk 5: `as any` casts for Drizzle transaction types (from KBAR-0030 lesson)

- **Risk**: KBAR-0030 received HIGH type-safety findings for `as any` in Drizzle transaction callbacks and metadata objects.
- **Why it blocks MVP**: HIGH type safety findings are code review blockers per the established review standards.
- **Required mitigation**: Import Drizzle's `ExtractTablesWithRelations`, `NodePgQueryResultHKT`, or use the `typeof db.transaction` inference pattern to type transaction callbacks. Define Zod schemas for all metadata structures and infer types via `z.infer<>`. No `as any` casts allowed.

---

## Missing Requirements for MVP

1. **Artifact filename-to-type mapping**: The story mentions artifact file discovery by "established naming conventions" (e.g., `PLAN.yaml` → `plan`) but does not define the authoritative mapping. Dev must define `ARTIFACT_FILENAME_MAP` in `__types__/index.ts` before writing batch discovery logic. PM should confirm the canonical mapping:
   - `_implementation/PLAN.yaml` → `plan`
   - `_implementation/SCOPE.yaml` → `scope`
   - `_implementation/EVIDENCE.yaml` → `evidence`
   - `_implementation/CHECKPOINT.yaml` → `checkpoint`
   - `_implementation/DECISIONS.yaml` → `decisions`
   - `_implementation/KNOWLEDGE-CONTEXT.yaml` → `knowledge_context`
   - `_pm/STORY-SEED.md` → `elaboration` (or `test_plan`/`decisions` sub-types?)
   - `_pm/TEST-PLAN.md` → `test_plan`
   - `_pm/DEV-FEASIBILITY.md` → `elaboration`
   - `PROOF-*.md` → `review`
   - `REVIEW.yaml` → `review`
   - `QA-VERIFY.yaml` → `review`

2. **5MB file size limit**: AC-1 description and non-goals mention a 5MB limit as acceptable. Is exceeding 5MB a hard error (return `{ success: false }`) or a warning? The test plan covers both but implementation needs a decision.

3. **`story_file` exclusion in batch discovery**: AC-4 discovers "all artifact files" — clarify whether the batch functions should skip the story `.md`/`.yaml` files (handled by KBAR-0030) or if they will never appear in artifact directories. This is likely a non-issue but should be documented in the filename mapping.

---

## MVP Evidence Expectations

- Unit tests: `pnpm test --filter @repo/kbar-sync` passes with >80% coverage (AC-9).
- Integration tests: testcontainers-based tests pass for all AC-1 through AC-6 scenarios.
- No `as any` casts in TypeScript output.
- ESLint and TypeScript strict mode pass with no errors.
- `src/index.ts` exports all new functions and Zod schemas.
- Security: `validateFilePath` and `validateNotSymlink` called before every filesystem operation (verifiable by code review).
- Performance: batch functions verified with 100+ artifacts in integration tests (no timeouts).
