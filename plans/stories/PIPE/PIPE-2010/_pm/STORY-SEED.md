---
generated: '2026-03-18'
baseline_used: null
baseline_date: null
lessons_loaded: true
adrs_loaded: false
conflicts_found: 2
blocking_conflicts: 0
---

# Story Seed: PIPE-2010

## Reality Context

### Baseline Status

- Loaded: no
- Date: N/A
- Gaps: No baseline reality file exists for this story. Codebase scanning was performed directly to establish ground truth.

### Relevant Existing Features

| Feature                                     | Location                                                 | Status                                                                                                                                |
| ------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `PipelineJobDataSchema` discriminated union | `packages/backend/pipeline-queue/src/__types__/index.ts` | Exists — covers elaboration, story-creation, implementation, review, qa                                                               |
| `StorySnapshotPayloadSchema`                | `packages/backend/pipeline-queue/src/__types__/index.ts` | Exists — used by implementation/review/qa as `payload` field                                                                          |
| Supervisor `__types__/index.ts` re-export   | `apps/api/pipeline/src/supervisor/__types__/index.ts`    | Re-exports from `@repo/pipeline-queue` with comment "F002: pipeline-queue is now the single source of truth"                          |
| Local elaboration payload stubs             | `apps/api/pipeline/src/supervisor/__types__/index.ts`    | `SynthesizedStoryPayloadSchema` and `StoryRequestPayloadSchema` — local types not in pipeline-queue                                   |
| `SchedulerLoop.dispatchStory()`             | `apps/api/pipeline/src/scheduler/index.ts`               | Only dispatches `implementation` stage; imports `ImplementationJobDataSchema` from `@repo/pipeline-queue`                             |
| `dispatch-router.ts` review stage           | `apps/api/pipeline/src/supervisor/dispatch-router.ts`    | Casts `ReviewJobDataSchema.payload` as `StorySnapshotPayload & { worktreePath?: string; featureDir?: string }` — fields not in schema |
| `BullMQ work queue`                         | `packages/backend/pipeline-queue/src/index.ts`           | `createPipelineQueue` validates at enqueue time via `PipelineJobDataSchema.parse()`                                                   |

### Active In-Progress Work

| Story     | Area                                                 | Overlap Risk                                                                                                     |
| --------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| PIPE-2020 | Dispatch router: dev/review/QA branches              | HIGH — will consume `ReviewJobDataSchema` and `QaJobDataSchema`; schema shape must be finalized before PIPE-2020 |
| PIPE-2030 | Completion/failure callbacks                         | MEDIUM — callback payloads reference job data; unified schema helps define callback types                        |
| PIPE-2040 | Finish-before-new-start + double-dispatch prevention | LOW — uses scheduler dispatch path; already uses `ImplementationJobDataSchema`                                   |
| PIPE-2050 | Scheduler loop                                       | LOW — scheduler currently only dispatches implementation; review/QA dispatch payloads will need unified schema   |

### Constraints to Respect

- `PIPELINE_QUEUE_NAME = 'apip-pipeline'` is a stable contract — downstream workers reference it
- Thread ID convention `{storyId}:{stage}:{attemptNumber}` is IRREVERSIBLE (documented ADR in dispatch-router)
- BullMQ v5 requires `maxRetriesPerRequest: null` on IORedis connections (lesson-learned pattern)
- Schema changes to `PipelineJobDataSchema` post-Phase 0 require coordinated updates across tests, README, and all consumers
- No `z.any()` — Zod-first architecture requires typed schemas throughout

---

## Retrieved Context

### Related Endpoints

- None — this is a backend package story with no HTTP API surface.

### Related Components

- None — purely a TypeScript shared package story.

### Reuse Candidates

- `packages/backend/pipeline-queue/src/__types__/index.ts` — the current `PipelineJobDataSchema` discriminated union is the target file; this story extends/refines it
- `StorySnapshotPayloadSchema` — existing reusable payload shape for implementation/review/qa stages
- `apps/api/pipeline/src/supervisor/__types__/index.ts` — local `SynthesizedStoryPayloadSchema` and `StoryRequestPayloadSchema` (currently parallel/redundant; may be absorbed or cross-referenced)
- `apps/api/pipeline/src/supervisor/dispatch-router.ts` — consumer of job schemas; cast site for `worktreePath`/`featureDir` fields that need formalization

### Similar Stories

- APIP-0010 (BullMQ Work Queue Setup) — created `PipelineJobDataSchema` discriminated union and `@repo/pipeline-queue` package
- APIP-0020 (Supervisor Loop) — established `StorySnapshotPayload` and per-stage job shapes; original context for "two schemas" finding

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern                                              | File                                                                        | Why                                                                                                             |
| ---------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| Zod discriminated union with stage-specific payloads | `packages/backend/pipeline-queue/src/__types__/index.ts`                    | Canonical source of truth for `PipelineJobDataSchema`; this story extends it directly                           |
| Per-stage Zod schema with passthrough                | `apps/api/pipeline/src/supervisor/__types__/index.ts`                       | Shows the `SynthesizedStoryPayloadSchema` / `StoryRequestPayloadSchema` local types that may need consolidation |
| Schema consumer (dispatch-router) with type casts    | `apps/api/pipeline/src/supervisor/dispatch-router.ts`                       | Lines 228–235 show `worktreePath`/`featureDir` type-cast workaround that proper schema should eliminate         |
| Schema test file pattern                             | `packages/backend/pipeline-queue/src/__tests__/pipeline-job-schema.test.ts` | Demonstrates the test structure for discriminated union Zod validation                                          |

---

## Knowledge Context

### Lessons Learned

- **[APIP-0020/schema-drift]** Schema drift with discriminated unions requires atomic test and README updates (category: edge-cases)
  - _Applies because_: This story modifies `PipelineJobDataSchema`. Any field additions or changes to the discriminated union must be updated atomically across `pipeline-job-schema.test.ts`, `pipeline-queue.test.ts`, `pipeline-queue.integration.test.ts`, and `README.md` in a single commit. Piecemeal updates caused schema mismatch failures in the prior APIP-0010 fix iteration.

- **[APIP-1031]** Accept authoritative shared schemas — do not re-declare types already exported from canonical packages (category: edge-cases)
  - _Applies because_: The local `SynthesizedStoryPayloadSchema` and `StoryRequestPayloadSchema` in `apps/api/pipeline/src/supervisor/__types__/index.ts` may be redundant with types from `@repo/orchestrator`. The implementation should verify and consolidate rather than create parallel definitions.

- **[APIP-0010]** Schema breaking changes post-Phase 0 are coordination-heavy across producers and consumers (category: architecture)
  - _Applies because_: PIPE-2010 modifies a schema that is imported by the supervisor, scheduler, and dispatch-router. All import sites must be updated together. Additive changes (new optional fields) are preferred over structural changes.

- **[INFR-0041]** Discriminated union pattern for heterogeneous event payload validation (category: architecture)
  - _Applies because_: The review stage currently type-casts extra fields (`worktreePath`, `featureDir`) that are not in the Zod schema. The proper approach is to extend `ReviewJobDataSchema.payload` to include these fields, making the discriminated union fully exhaustive and type-safe at parse time.

### Blockers to Avoid (from past stories)

- Do not make structural changes to `PipelineJobDataSchema` without updating all consumers (scheduler, supervisor, dispatch-router) in the same PR
- Do not use `z.any()` or untyped casts — the `as StorySnapshotPayload & { worktreePath?: string }` cast in dispatch-router is a known tech-debt site to fix
- Do not leave local payload stubs (`SynthesizedStoryPayloadSchema`, `StoryRequestPayloadSchema`) duplicating types from the canonical schema
- Do not change the `stage` discriminant values — they are serialized in BullMQ and referenced in thread ID convention

### Architecture Decisions (ADRs)

| ADR                                     | Title                     | Constraint                                                                             |
| --------------------------------------- | ------------------------- | -------------------------------------------------------------------------------------- |
| Thread ID ADR (dispatch-router comment) | Thread ID Convention      | Format `{storyId}:{stage}:{attemptNumber}` is IRREVERSIBLE post-Phase 0                |
| F002 comment in supervisor/**types**    | Canonical source of truth | `@repo/pipeline-queue` is the single source; supervisor must re-export, not re-declare |
| Zod-first (CLAUDE.md)                   | TypeScript Schemas        | ALWAYS use Zod schemas; never use TypeScript interfaces                                |

### Patterns to Follow

- Discriminated union on `stage` literal field — already established in `PipelineJobDataSchema`
- Additive-only changes to existing discriminants (add optional fields rather than changing required fields)
- Export all schema variants AND the union from `packages/backend/pipeline-queue/src/index.ts`
- Atomic schema + test + README updates in a single commit
- `passthrough()` on payload schemas that need extension by consumers (review payload with worktreePath)

### Patterns to Avoid

- Parallel Zod schema declarations for the same concept in different packages
- Untyped `as X & { extra?: field }` casts in dispatch-router — fix at the schema level instead
- `z.record(z.unknown())` for payload fields that have a known shape (elaboration/story-creation stages currently use this — acceptable for now, but review/qa should use typed payloads)

---

## Conflict Analysis

### Conflict: Partial Completion

- **Severity**: warning
- **Description**: The story description references audit finding AUDIT-4-F002 ("two incompatible job payload schemas"). Code inspection reveals that F002 was partially resolved in a prior iteration: `apps/api/pipeline/src/supervisor/__types__/index.ts` now re-exports from `@repo/pipeline-queue` with a comment "F002: pipeline-queue is now the single source of truth." However, three gaps remain: (1) `ReviewJobDataSchema.payload` lacks `worktreePath` and `featureDir` fields that dispatch-router needs and currently type-casts unsafely; (2) local `SynthesizedStoryPayloadSchema` and `StoryRequestPayloadSchema` in the supervisor remain as parallel types; (3) the QA and review dispatch payloads are not yet used by the scheduler (only `implementation` is dispatched). PIPE-2010 should address these residual gaps rather than repeat work already done.
- **Resolution Hint**: Scope the story to the three remaining gaps. Define reviewer and QA payload schemas fully (including `worktreePath`, `featureDir` for review; confirm QA payload shape). Verify whether `SynthesizedStoryPayloadSchema`/`StoryRequestPayloadSchema` can be removed or should cross-reference orchestrator types.

### Conflict: PIPE-2020 Dependency

- **Severity**: warning
- **Description**: PIPE-2020 (Dispatch Router: dev/review/QA branches) is the immediate consumer of the unified schema this story produces. If PIPE-2020 begins implementation before PIPE-2010 finalizes the review and QA payload shapes, PIPE-2020 will have to work around the type-cast pattern again.
- **Resolution Hint**: PIPE-2010 must complete and be merged before PIPE-2020 implementation begins. The story should explicitly note this sequencing constraint.

---

## Story Seed

### Title

Unified BullMQ Job Payload Schema for Dev, Review, and QA Dispatch

### Description

**Context**: The `@repo/pipeline-queue` package defines `PipelineJobDataSchema`, a Zod discriminated union covering all BullMQ job stages (`elaboration`, `story-creation`, `implementation`, `review`, `qa`). A prior fix (F002) consolidated the supervisor to re-export from this package. However, three schema gaps remain that prevent the dispatch router from being type-safe for all stages:

1. `ReviewJobDataSchema.payload` is typed as `StorySnapshotPayload` (only `storyId`, `title`, `description`, `feature`, `state`), but `dispatch-router.ts` requires `worktreePath` and `featureDir` for the review graph — these are added via an unsafe `as` type cast at lines 228–235 of `dispatch-router.ts`.

2. `ElaborationJobDataSchema` and `StoryCreationJobDataSchema` use `payload: z.record(z.unknown())` — the payload shape is opaque. Local parallel types (`SynthesizedStoryPayloadSchema`, `StoryRequestPayloadSchema`) exist in the supervisor `__types__` as informal documentation of expected shape but are not enforced at the schema boundary.

3. The scheduler currently only dispatches the `implementation` stage. PIPE-2020 will add review/QA dispatch, but cannot do so safely without a finalized payload schema for those stages.

**Problem**: The "two incompatible schemas" finding (AUDIT-4-F002) was partially remediated but the residual gaps leave the review and QA dispatch paths untyped and prone to runtime shape mismatches.

**Proposed Solution**: Extend `PipelineJobDataSchema` in `packages/backend/pipeline-queue/src/__types__/index.ts` to formalize the review and QA payload shapes, including the `worktreePath` and `featureDir` fields needed by the review graph. Update `ReviewJobDataSchema.payload` to use a `ReviewPayloadSchema` (extends `StorySnapshotPayload` with optional worktree fields). Verify the QA payload shape against the QA graph's actual input requirements. Eliminate the unsafe type cast in `dispatch-router.ts`. Document whether local elaboration/story-creation payload stubs should be kept, consolidated, or cross-referenced.

### Initial Acceptance Criteria

- [ ] AC-1: `packages/backend/pipeline-queue/src/__types__/index.ts` defines a `ReviewPayloadSchema` that extends `StorySnapshotPayloadSchema` with optional `worktreePath: z.string().optional()` and `featureDir: z.string().optional()` fields, and `ReviewJobDataSchema.payload` uses this schema.
- [ ] AC-2: `packages/backend/pipeline-queue/src/__types__/index.ts` defines a `QaPayloadSchema` aligned with the actual `runQAVerify()` input shape; `QaJobDataSchema.payload` uses this schema (may remain `StorySnapshotPayload` if no additional fields are needed — must be explicitly verified).
- [ ] AC-3: `dispatch-router.ts` eliminates the `as StorySnapshotPayload & { worktreePath?: string; featureDir?: string }` type cast by using the typed `ReviewPayloadSchema` directly.
- [ ] AC-4: All new and updated schemas are exported from `packages/backend/pipeline-queue/src/index.ts` alongside existing exports.
- [ ] AC-5: `PipelineJobDataSchema.parse()` accepts a valid review payload including `worktreePath` and `featureDir`; a test case verifies this in `pipeline-job-schema.test.ts`.
- [ ] AC-6: `PipelineJobDataSchema.parse()` rejects a review payload with a missing required `storyId`; existing rejection tests remain passing.
- [ ] AC-7: All tests in `packages/backend/pipeline-queue/src/__tests__/` pass after schema changes (no regressions).
- [ ] AC-8: `README.md` in `packages/backend/pipeline-queue/` is updated to document the `ReviewPayloadSchema` and `QaPayloadSchema` shapes.
- [ ] AC-9: A decision is recorded (in the PR or KB) on whether `SynthesizedStoryPayloadSchema` and `StoryRequestPayloadSchema` in `apps/api/pipeline/src/supervisor/__types__/index.ts` should be removed, retained as local documentation, or cross-referenced from `@repo/orchestrator`.
- [ ] AC-10: TypeScript compilation (`pnpm check-types`) passes with zero errors after all changes.

### Non-Goals

- Do not change the `stage` discriminant values (`elaboration`, `story-creation`, `implementation`, `review`, `qa`) — these are serialized in BullMQ jobs and the thread ID convention.
- Do not implement the dispatch router itself — that is PIPE-2020.
- Do not implement scheduler dispatch for review/QA stages — that is PIPE-2050.
- Do not change `ElaborationJobDataSchema.payload` or `StoryCreationJobDataSchema.payload` from `z.record(z.unknown())` — these stages pass complex orchestrator graph input objects and the opaque type is intentional until ORCH stories formalize those boundaries.
- Do not modify the `PIPELINE_QUEUE_NAME` constant or connection factory.
- Do not add new BullMQ stage types beyond the existing five.

### Reuse Plan

- **Components**: `StorySnapshotPayloadSchema` (base for `ReviewPayloadSchema`); `PipelineJobDataSchema` discriminated union (extended, not replaced)
- **Patterns**: Zod `.extend()` to add fields to snapshot payload for review stage; `z.string().optional()` for worktree fields that have defaults in dispatch-router
- **Packages**: `packages/backend/pipeline-queue` (primary target); `apps/api/pipeline/src/supervisor/dispatch-router.ts` (consumer to fix); `packages/backend/orchestrator/src/nodes/review/types.ts` (verify QA/review graph input types)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- The primary test surface is `packages/backend/pipeline-queue/src/__tests__/pipeline-job-schema.test.ts`. New test cases needed: (1) valid review payload WITH `worktreePath` and `featureDir`, (2) valid review payload WITHOUT optional fields (defaults), (3) confirm `QaPayloadSchema` shape matches actual `runQAVerify()` params.
- Integration test `pipeline-queue.integration.test.ts` should verify `createPipelineQueue().add()` accepts the extended review payload at the queue wrapper level.
- No DB or Redis fixtures required — all tests are pure Zod parse/safeParse unit tests.
- Coverage threshold: existing 45% global threshold applies; `packages/backend/pipeline-queue` already achieves well above threshold (30/30 tests pass per EVIDENCE.yaml).

### For UI/UX Advisor

- Not applicable. This is a backend shared-package schema story with no UI surface.

### For Dev Feasibility

- **Primary change file**: `packages/backend/pipeline-queue/src/__types__/index.ts` — add `ReviewPayloadSchema` extending `StorySnapshotPayloadSchema`, update `ReviewJobDataSchema.payload`, verify `QaJobDataSchema.payload`.
- **Secondary change file**: `apps/api/pipeline/src/supervisor/dispatch-router.ts` — replace type cast at lines 228–235 with typed `ReviewPayload` from re-export.
- **Verify before implementing**: Read `packages/backend/orchestrator/src/nodes/review/types.ts` to confirm whether `runReview()` requires only `worktreePath`/`featureDir` or additional fields. Read `runQAVerify()` input type to confirm `QaPayloadSchema` shape.
- **Risk**: The existing `passthrough()` on `StorySnapshotPayloadSchema` means extra fields are not rejected today. Removing `passthrough()` from the base schema would be a breaking change — instead, extend the schema explicitly for review. Keep `passthrough()` on the base or make `ReviewPayloadSchema` a standalone extension.
- **Canonical references for subtask decomposition**:
  1. Read `packages/backend/pipeline-queue/src/__types__/index.ts` — current schema (primary edit target)
  2. Read `apps/api/pipeline/src/supervisor/dispatch-router.ts` lines 206–245 — cast site to fix
  3. Read `packages/backend/orchestrator/src/nodes/review/types.ts` — verify review graph input contract
  4. Read `packages/backend/pipeline-queue/src/__tests__/pipeline-job-schema.test.ts` — test pattern to extend
