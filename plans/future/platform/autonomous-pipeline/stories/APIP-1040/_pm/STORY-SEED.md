---
generated: "2026-02-25"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 3
blocking_conflicts: 0
---

# Story Seed: APIP-1040

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No Documentation Graph exists in the autonomous pipeline. No `DocGraphState` annotation exists. No post-merge trigger mechanism exists in the pipeline yet (merge graph APIP-1070 not yet built). The 6 parallel doc workers (API docs, component docs, architecture docs, README/guides, KB sync, changelog) must be designed from scratch. The existing `nodes/sync/doc-sync.ts` and `nodes/workflow/doc-sync.ts` nodes provide proven patterns for documentation file discovery and update logic but operate as single-phase nodes, not a 6-worker parallel fan-out graph.

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| `doc-sync.ts` (native 7-phase node) | `packages/backend/orchestrator/src/nodes/sync/doc-sync.ts` | Proven 7-phase sequential doc sync pattern (File Discovery → Frontmatter Parsing → Section Mapping → Documentation Updates → Mermaid Regen → Changelog Drafting → SYNC-REPORT). Workers in APIP-1040 may reuse these phases. |
| `createToolNode` factory | `packages/backend/orchestrator/src/runner/node-factory.ts` | All orchestrator nodes use this factory — each of the 6 doc workers must use `createToolNode('doc-worker-{name}', ...)`. |
| `createPersistLearningsNode` | `packages/backend/orchestrator/src/nodes/completion/persist-learnings.ts` | The KB Sync Worker has analogous safety requirements — must not overwrite valid learnings. This node's deduplication logic (0.85 similarity threshold) is directly reusable. |
| Elaboration graph fan-out (fanout-pm, fanout-qa, fanout-ux nodes) | `packages/backend/orchestrator/src/nodes/story/fanout-*.ts` | Existing fan-out worker pattern with `createToolNode` factory and aggregation — the 6 doc workers should follow this exact pattern. The PM/QA/UX fan-out architecture is the structural model for 6-way parallelism. |
| `ElaborationStateAnnotation` extension pattern | `packages/backend/orchestrator/src/graphs/elaboration.ts` | Pattern for extending graph state annotations with `Annotation<T>({ reducer: overwrite, default: () => null })` — `DocGraphStateAnnotation` must follow this exactly. |
| Orchestrator artifact schemas | `packages/backend/orchestrator/src/artifacts/` | Zod-first artifact schema patterns — `DocWorkerResultSchema`, `DocReviewResultSchema`, `DocGraphResultSchema` must follow this structure. |
| `DocSyncConfigSchema` + `DocSyncResultSchema` | `packages/backend/orchestrator/src/nodes/sync/doc-sync.ts` | Existing Zod config and result schemas for doc sync — workers should reuse or extend these types rather than re-inventing doc-related schema structures. |
| Knowledge Base (pgvector) | `apps/api/knowledge-base/` | KB Sync Worker writes to this instance. Must use the same deduplication guard as `persist-learnings` to avoid overwriting valid entries. |

### Active In-Progress Work

| Story | Area | Potential Impact |
|-------|------|-----------------|
| APIP-0020 (In Elaboration) | Supervisor Graph | Supervisor dispatches worker graphs. The Documentation Graph must register with the supervisor as a post-merge trigger (triggered by APIP-1070's merge event). APIP-0020 implementation should not be blocked, but the dispatch interface must accommodate a `doc_graph` worker type for future integration. |
| APIP-5006 (In Elaboration) | LangGraph Server Infrastructure | Documentation Graph LLM calls run on the dedicated server — no blocker for unit tests, but integration tests require the server. |
| APIP-5003 (In Elaboration) | Security Hardening | Documentation Graph worker nodes that commit files (API docs, changelog, README) perform git operations — these fall within the security boundary defined by APIP-5003. |

### Constraints to Respect

- **APIP ADR-001 Decision 4**: All pipeline components run on the dedicated local server, not Lambda. Documentation Graph workers run as LangGraph nodes on the server — no Lambda.
- **APIP ADR-001 Decision 2**: Supervisor is plain TypeScript; Documentation Graph is a LangGraph worker graph (correct layer).
- **APIP ADR-001 Decision 3**: ChangeSpec spike (APIP-1020) runs before integration — Documentation Graph does not depend on ChangeSpec schema; it reads the merge commit diff, not the ChangeSpec.
- **Do not touch protected features**: `packages/backend/database-schema/`, `@repo/db` client API surface, Orchestrator artifact schemas (extend, don't modify). KB Sync Worker uses KB MCP APIs only; no direct schema mutation.
- **Sizing warning active**: The story.yaml marks `sizing_warning: true`. The 6 parallel workers represent distinct concerns. If the Doc Review aggregation node proves non-trivial, this story must be split: (a) workers-only story and (b) Doc Review aggregation story.
- **KB Sync Worker must not overwrite valid learnings**: The 0.85 similarity deduplication threshold from `persist-learnings.ts` must be applied in the KB Sync Worker.
- **Zod-first types**: All new schemas (DocWorkerConfigSchema, DocWorkerResultSchema, DocReviewResultSchema, DocGraphConfigSchema, DocGraphResultSchema) must use Zod. No TypeScript interfaces.

---

## Retrieved Context

### Related Endpoints

None — APIP-1040 is a headless documentation automation graph triggered post-merge. No HTTP routes.

### Related Components

None — no UI components. This is a headless orchestration graph.

### Reuse Candidates

| Candidate | Location | How to Reuse |
|-----------|----------|--------------|
| `createToolNode` factory | `packages/backend/orchestrator/src/runner/node-factory.ts` | Each of the 6 doc workers must use `createToolNode('doc-worker-api-docs', ...)`, etc. |
| `DocSyncConfigSchema` + `DocSyncResultSchema` | `packages/backend/orchestrator/src/nodes/sync/doc-sync.ts` | Base config and result schemas for doc operations — extend or adapt for each worker's specific config. |
| `DocSyncNode` 7-phase logic | `packages/backend/orchestrator/src/nodes/sync/doc-sync.ts` | File discovery (Phase 1), frontmatter parsing (Phase 2), section mapping (Phase 3), changelog drafting (Phase 6), and SYNC-REPORT generation (Phase 7) are all reusable within individual workers. |
| `persistLearnings` deduplication logic | `packages/backend/orchestrator/src/nodes/completion/persist-learnings.ts` | KB Sync Worker must apply the same 0.85 similarity dedup threshold to avoid overwriting valid KB entries. |
| Fan-out node pattern | `packages/backend/orchestrator/src/nodes/story/fanout-pm.ts` | Structural pattern for creating parallel worker nodes that return `Partial<GraphState>` updates — each doc worker follows this. |
| `Annotation<T>({ reducer: overwrite, default: () => null })` | `packages/backend/orchestrator/src/graphs/elaboration.ts` | State extension pattern for new graph state fields. |
| `@repo/logger` | Used throughout orchestrator | Structured logging; workers must log `storyId`, `workerName`, `filesUpdated`, `durationMs`. |
| LangGraph `Send` API | `@langchain/langgraph` | The parallel fan-out of 6 workers must use the LangGraph `Send` API (not separate graph invocations) to dispatch all 6 workers simultaneously from the dispatch node. |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Fan-out node with Zod schema + createToolNode factory | `/Users/michaelmenard/Development/monorepo/packages/backend/orchestrator/src/nodes/story/fanout-pm.ts` | Canonical pattern for a worker node in a parallel fan-out graph. Each doc worker (API docs, component docs, etc.) should mirror this structure: Zod schemas at top, pure analysis/generation function, `createToolNode` factory, `createFanout*Node(config)` factory with optional config. |
| Native 7-phase doc sync node (file discovery, frontmatter, changelog) | `/Users/michaelmenard/Development/monorepo/packages/backend/orchestrator/src/nodes/sync/doc-sync.ts` | Proven doc sync implementation with Zod config/result schemas, injectable DB queries for testing, graceful fallback, and SYNC-REPORT generation. Workers reuse these phase implementations rather than re-implementing file discovery and changelog logic. |
| KB deduplication and safe write pattern | `/Users/michaelmenard/Development/monorepo/packages/backend/orchestrator/src/nodes/completion/persist-learnings.ts` | The KB Sync Worker must replicate this deduplication guard (0.85 threshold, `kbSearchFn` before `kbAddFn`) to prevent overwriting valid KB learnings. |
| Graph state annotation extension + graph wiring | `/Users/michaelmenard/Development/monorepo/packages/backend/orchestrator/src/graphs/elaboration.ts` | Shows `Annotation<T>({ reducer, default })` pattern for extending state and `.addNode()` + conditional edge wiring. `DocGraph` (`doc-graph.ts`) follows this structure with its own `DocGraphStateAnnotation`. |

---

## Knowledge Context

### Lessons Learned

- **[WINT-9020 / architecture]** Native TypeScript LangGraph node with sequential 7-phase architecture is viable and achieves high coverage (42 unit tests, 86% coverage).
  - *Applies because*: Each of the 6 doc workers can implement a subset of the 7-phase doc-sync pattern (File Discovery → Section Mapping → Updates → Changelog/SYNC-REPORT) as a native TypeScript node. The proven phase architecture avoids subprocess delegation and adds better error observability.

- **[WINT-9020 / architecture]** `createToolNode('doc_sync', async (state) => docSyncImpl(state, config))` and `createDocSyncNode(config)` factory pattern extends cleanly via DI. Config injected at construction; mock functions for testing.
  - *Applies because*: All 6 doc workers must follow `createToolNode('doc-worker-{name}', ...)` with `create{WorkerName}Node(config)` factory. KB Sync Worker especially needs injectable `kbSearchFn` and `kbAddFn` for testing without live KB.

- **[AUDT-0010 / testing]** Graph compilation tests can validate LangGraph routing without running the full pipeline. Test `graph.compile()` succeeds and verify routing paths with mock state objects.
  - *Applies because*: The Documentation Graph has complex routing: dispatch node → 6 parallel workers (via `Send` API) → Doc Review aggregation → commit node. Graph tests must verify this routing compiles and conditional edges work correctly without executing LLM calls.

- **[AUDT-0010 / testing]** LangGraph graph tests should target compiled graph routing, not dynamic node imports.
  - *Applies because*: The 6-worker fan-out creates a risk of test fragility if individual workers are dynamically imported in graph tests. Test routing functions directly; mock all 6 worker node implementations in graph-level tests.

- **[WINT-9020 / architecture]** Agent+TypeScript node pairs must always be updated together when extending functionality.
  - *Applies because*: If the Documentation Graph ships alongside or replaces any existing Claude Code doc-sync agent, both the agent markdown and the TypeScript LangGraph node must be updated together. Track this as a non-goal or explicit AC if doc-sync agent migration is in scope.

### Blockers to Avoid (from past stories)

- **6 concerns bundled into 1 story (sizing_warning)**: The story carries an explicit `sizing_warning: true`. Scope must be actively managed: if Doc Review aggregation logic (hallucination detection, quality scoring) proves non-trivial, it must be split into a follow-up story. Do not attempt to fully implement all 6 workers AND a sophisticated Doc Review node in a single story.
- **KB Sync Worker overwriting valid learnings**: The KB Sync Worker's content generation path could hallucinate or overwrite KB entries that represent hard-won knowledge. The `persist-learnings` deduplication guard (0.85 similarity threshold, `kbSearchFn` before `kbAddFn`) is mandatory — not optional — for the KB Sync Worker.
- **Doc Review hallucination on auto-committed content**: The Doc Review aggregation node is the primary quality gate before any file commit. If Doc Review is a shallow pass (just checking worker completion status), auto-committed content may contain errors. AC must require Doc Review to perform content spot-checks, not just existence checks.
- **Workers without graceful fallback**: Each of the 6 workers performs LLM calls. A model failure in one worker must not block the other 5 or the overall graph. Each worker must catch errors and return a `WorkerResult` with `success: false` rather than throwing. The Doc Review aggregation node decides whether to commit, skip, or flag based on worker outcomes.
- **Git operation conflicts from parallel commit workers**: If multiple workers attempt to commit changes to the same repository simultaneously, git conflicts arise. The commit step must be centralized in a single post-aggregation node, not distributed across workers. Workers generate file content (in state); only the commit node writes to git.
- **Missing node export in graph index**: After creating each worker file, it must be exported from the relevant `nodes/` index. Forgetting this breaks downstream imports.
- **LangGraph Send API dispatch pattern**: The parallel fan-out must use `Send` (not `addEdge`) from the dispatch node to send all 6 workers simultaneously. Incorrect use of `addEdge` for fan-out would serialize the workers, losing the parallelism benefit.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| APIP ADR-001 Decision 2 | Plain TypeScript Supervisor | Documentation Graph is a LangGraph worker graph (correct layer). Supervisor only triggers it via BullMQ job dispatch post-merge. |
| APIP ADR-001 Decision 4 | Local Dedicated Server | Documentation Graph runs on the dedicated server — no Lambda. All 6 workers and Doc Review node execute locally. |
| APIP ADR-001 Decision 3 | ChangeSpec Spike Before Integration | Documentation Graph does NOT depend on ChangeSpec schema. It reads the merge commit diff (from APIP-1070 merge graph output) directly. ChangeSpec is an implementation-phase concern, not a doc-phase concern. |

### Patterns to Follow

- `createToolNode('doc-worker-{name}', fn)` factory for each of the 6 workers; `create{WorkerName}Node(config)` factory with injectable config
- All schemas defined at file top using Zod before any function definitions
- Each worker config schema has: `enabled: z.boolean().default(true)`, `dryRun: z.boolean().default(false)`, `timeoutMs: z.number().positive().default(120000)`, `model: z.string().default('cheap-model-id')`
- Each worker result schema has: `workerName: z.string()`, `success: z.boolean()`, `filesUpdated: z.array(z.string())`, `durationMs: z.number()`, `error: z.string().nullable()`, `warnings: z.array(z.string())`
- Doc Review aggregation node reads all 6 `WorkerResult` objects from state; returns `docReviewPassed: boolean`, `commitBlocked: boolean`, `commitBlockedReason: string | null`
- Centralized commit node — workers write proposed file content to graph state, NOT to the filesystem. A single post-review commit node applies all writes atomically (or skips on dry-run).
- `@repo/logger` for all logging; structured fields: `storyId`, `workerName`, `filesUpdated`, `durationMs`, `commitBlocked`
- LangGraph `Send` API for dispatching all 6 workers simultaneously from dispatch node
- KB Sync Worker uses `kbSearchFn` (dedup check) before `kbAddFn` (write) with 0.85 similarity threshold
- `Annotation<T>({ reducer: overwrite, default: () => null })` for all new graph state fields

### Patterns to Avoid

- TypeScript interfaces — all types must be `z.infer<typeof Schema>`
- Distributed git commits across workers — all commits must go through the single post-review commit node
- KB Sync Worker writing without deduplication check — always search before write
- Making any single worker's failure terminal for the whole graph — workers return `success: false`, Doc Review aggregates
- Dynamic imports of worker nodes in graph-level tests — mock worker implementations in routing tests
- Modifying protected schemas or the `@repo/db` client API surface
- LLM calls as synchronous blockers inside workers without timeout and fallback
- Hardcoding model IDs — all worker model references must come from `WorkerConfig.model` (fed by Model Router APIP-0040)

---

## Conflict Analysis

### Conflict: Depends on APIP-1030 (Implementation Graph) which is not yet built
- **Severity**: warning
- **Description**: APIP-1040 is triggered post-merge, and the merge event is produced by APIP-1070 (Merge Graph), which itself depends on APIP-1060, APIP-1050, and APIP-1030 through the critical path. None of these graphs exist yet. APIP-1040 cannot be fully integration-tested (end-to-end) until the merge event payload structure from APIP-1070 is defined. However, APIP-1040 can be designed and unit-tested independently — the dispatch node can accept a `MergeEventPayload` with the merge commit SHA and story ID as its input contract.
- **Resolution Hint**: Design APIP-1040 with a well-defined `MergeEventPayloadSchema` as the graph entry contract. This schema becomes the interface contract that APIP-1070 must fulfill. Integration testing across the full chain is deferred to APIP-5002 (E2E Test Plan).

### Conflict: Sizing warning — 6 workers + Doc Review aggregation may exceed one story
- **Severity**: warning
- **Description**: The story.yaml explicitly flags `sizing_warning: true`. The 6 parallel workers represent distinct implementation concerns (different targets, different model prompts, different file patterns). The Doc Review aggregation node adds non-trivial logic (content spot-checks, hallucination heuristics). If all 6 workers and Doc Review are implemented together, the story likely runs 3-5x the token estimate.
- **Resolution Hint**: Structure the story in two discrete phases: Phase A (graph scaffold, dispatch node, 6 worker stubs with real file discovery logic, basic Doc Review pass/fail by worker success count) and Phase B (content quality spot-checks in Doc Review, per-worker prompt refinement). If Phase A fills the story, cut Phase B to a follow-up. Define a clear AC split point so the story can ship with stub workers that have correct scaffolding even if prompt quality is low.

### Conflict: KB Sync Worker hallucination risk for auto-committed content
- **Severity**: warning
- **Description**: The KB Sync Worker generates new KB entries based on the diff from a merged story. If the LLM generating KB content hallucinates incorrect facts (wrong file paths, wrong behavior descriptions), these entries pollute the KB with invalid learnings that downstream stories may rely on. Auto-committing without human review amplifies this risk.
- **Resolution Hint**: Require KB Sync Worker to (a) tag all auto-generated entries with `auto-generated: true` and a source story ID, (b) never delete or overwrite existing entries (only add new ones), and (c) include confidence metadata in the entry content. Doc Review node must check that KB Sync Worker did not attempt entry deletion or modification of existing entries.

---

## Story Seed

### Title

Documentation Graph (Post-Merge)

### Description

After a story merges via the Merge Graph (APIP-1070), project documentation drifts unless manually updated. Today all documentation updates are human-authored, creating a bottleneck and a persistent gap between code reality and documentation state. This story builds the **Documentation Graph** — a post-merge LangGraph worker graph that automatically keeps all project documentation in sync with every merged story, without human authoring effort.

The Documentation Graph is triggered by a merge event (merge commit SHA + story ID) dispatched from the Merge Graph. It uses the LangGraph `Send` API to fan out 6 parallel documentation workers simultaneously, each targeting a different documentation surface:

1. **API Docs Worker** — updates OpenAPI specs and endpoint documentation based on changed handlers
2. **Component Docs Worker** — updates component-level JSDoc and Storybook entries for changed UI components
3. **Architecture Docs Worker** — updates architecture diagrams (Mermaid) and ADR index entries
4. **README/Guides Worker** — updates top-level README, onboarding guides, and how-to docs
5. **KB Sync Worker** — generates new Knowledge Base entries from the story's learnings and diff summary (with mandatory deduplication guard — does NOT overwrite existing entries)
6. **Changelog Worker** — drafts a semver changelog entry for the merged story

Workers propose file content changes (writing to graph state, NOT to the filesystem). A **Doc Review aggregation node** evaluates all 6 worker results before any commit is made: it checks for worker failures, content quality, and KB Sync safety. Only after Doc Review passes does a single centralized commit node write all proposed changes atomically.

Workers use cheap models (via the Model Router from APIP-0040), keeping per-story doc cost minimal. The Doc Review node uses a stronger model for quality assessment.

This graph replaces no existing human workflows in Phase 1 — it supplements them. All workers support `dryRun: true` for safe local testing.

### Initial Acceptance Criteria

- [ ] AC-1: A `DocGraphStateAnnotation` exists in `packages/backend/orchestrator/src/graphs/doc-graph.ts` with fields: `mergeEvent: Annotation<MergeEventPayload | null>`, `workerResults: Annotation<DocWorkerResult[]>({ reducer: append })`, `docReviewResult: Annotation<DocReviewResult | null>`, `proposedFileChanges: Annotation<ProposedFileChange[]>({ reducer: append })`, `commitResult: Annotation<DocCommitResult | null>`, `docGraphComplete: Annotation<boolean>`
- [ ] AC-2: A `MergeEventPayloadSchema` Zod schema exists with: `storyId: z.string()`, `mergeCommitSha: z.string()`, `mergedBranch: z.string()`, `mergedAt: z.string().datetime()`, `diffSummary: z.string()`, `changedFiles: z.array(z.string())`
- [ ] AC-3: A `DocWorkerResultSchema` Zod schema exists with: `workerName: z.enum(['api-docs', 'component-docs', 'architecture-docs', 'readme-guides', 'kb-sync', 'changelog'])`, `success: z.boolean()`, `filesUpdated: z.array(z.string())`, `proposedChanges: z.array(ProposedFileChangeSchema)`, `durationMs: z.number()`, `error: z.string().nullable()`, `warnings: z.array(z.string())`, `model: z.string()`
- [ ] AC-4: A `DocWorkerConfigSchema` Zod schema exists with: `enabled: z.boolean().default(true)`, `dryRun: z.boolean().default(false)`, `timeoutMs: z.number().positive().default(120000)`, `model: z.string()` — each of the 6 workers has its own config schema extending this base
- [ ] AC-5: Six worker node files exist, one per documentation surface: `packages/backend/orchestrator/src/nodes/doc-workers/api-docs-worker.ts`, `component-docs-worker.ts`, `architecture-docs-worker.ts`, `readme-guides-worker.ts`, `kb-sync-worker.ts`, `changelog-worker.ts` — each implementing `createToolNode('doc-worker-{name}', ...)` and `create{WorkerName}Node(config)` factory
- [ ] AC-6: Each worker function: (a) reads `state.mergeEvent` and `state.mergeEvent.changedFiles` to determine relevant files, (b) generates proposed file content changes (NOT writing to filesystem), (c) returns a `DocWorkerResult` with `success: true/false` regardless of internal errors (errors are captured in `result.error`, not thrown), (d) appends `DocWorkerResult` to `state.workerResults` and proposed changes to `state.proposedFileChanges`
- [ ] AC-7: The KB Sync Worker applies the deduplication guard from `persist-learnings.ts`: searches KB for similar content (0.85 similarity threshold) before proposing a new entry; never proposes deletion or modification of existing KB entries; tags auto-generated entries with `['auto-generated', 'source:{storyId}']`
- [ ] AC-8: A dispatch node exists that uses the LangGraph `Send` API to fan out all 6 enabled workers simultaneously: `return [...enabledWorkers.map(worker => new Send(worker.nodeName, state))]` — disabled workers (via config) are skipped without error
- [ ] AC-9: A `DocReviewNode` aggregation node exists that: (a) reads all `state.workerResults`, (b) counts success/failure per worker, (c) checks that KB Sync Worker did not propose entry deletions, (d) sets `docReviewPassed: true` if >= 4 of 6 workers succeeded (configurable threshold), (e) sets `commitBlocked: true` with a reason if review fails
- [ ] AC-10: A post-review commit node exists that: (a) reads `state.proposedFileChanges` and `state.docReviewResult.docReviewPassed`, (b) if `dryRun: true` or `commitBlocked: true`, logs proposed changes without writing to filesystem, (c) if review passed and not dry-run, writes all proposed changes atomically (all files or none), then creates a git commit with message `docs(auto): sync documentation for {storyId}`
- [ ] AC-11: The Documentation Graph wires the full flow: `START` → `dispatch` → `Send([6 workers])` → `aggregate` (via edges from all 6 workers) → `doc-review` → `commit` → `END`. Routing: after `doc-review`, if `commitBlocked` → log-and-exit node → `END`; otherwise → `commit` → `END`
- [ ] AC-12: A `DocGraphConfigSchema` Zod schema exists with: `workerConfigs: { apiDocs: ApiDocsWorkerConfigSchema, componentDocs: ..., architectureDocs: ..., readmeGuides: ..., kbSync: ..., changelog: ... }`, `docReview: DocReviewConfigSchema` (with `minSuccessThreshold: z.number().int().min(1).max(6).default(4)`), `dryRun: z.boolean().default(false)`, `commitMessage: z.string().default('docs(auto): sync documentation for {storyId}')`
- [ ] AC-13: All 6 worker node files, the `DocReviewNode`, the commit node, and the graph schemas are exported from `packages/backend/orchestrator/src/nodes/doc-workers/index.ts` and `packages/backend/orchestrator/src/graphs/doc-graph.ts`
- [ ] AC-14: Unit tests exist for each of the 6 workers in `packages/backend/orchestrator/src/nodes/doc-workers/__tests__/` covering: (a) happy path — worker produces `success: true` with proposed changes, (b) empty `changedFiles` — worker returns `success: true` with empty `proposedChanges` and a warning, (c) worker error — returns `success: false` with `error` set, does NOT throw
- [ ] AC-15: Unit tests exist for `DocReviewNode` covering: (a) all workers succeeded → `docReviewPassed: true`, (b) 3 of 6 workers failed → `commitBlocked: true` (below threshold), (c) KB Sync Worker proposed a deletion → `commitBlocked: true` regardless of other workers
- [ ] AC-16: Graph-level test in `packages/backend/orchestrator/src/graphs/__tests__/doc-graph.test.ts` verifies: `graph.compile()` succeeds, dispatch node correctly routes to all 6 worker nodes (mock), all 6 worker edges converge to `aggregate`, routing after `doc-review` correctly gates the commit node
- [ ] AC-17: `DocGraphConfigSchema` includes `dryRun: z.boolean().default(false)` at the top level; all workers inherit this flag; when `dryRun: true`, no filesystem writes occur in any worker or the commit node — this is verifiable in unit tests without filesystem mocking

### Non-Goals

- Integrating with the Merge Graph (APIP-1070) as a triggered caller — APIP-1040 delivers the graph itself; trigger wiring is deferred to the integration story or APIP-1070
- Sophisticated content quality scoring in Doc Review (beyond success count and KB safety checks) — defer to a follow-up if needed
- LLM-generated API documentation from scratch — workers update existing doc files based on diff context; they do not generate complete API docs from zero
- Storybook integration or component rendering for Component Docs Worker — file-based JSDoc updates only
- Deleting or archiving outdated KB entries — KB Sync Worker is append-only in Phase 1
- Changelog publishing (npm publish, GitHub release) — changelog drafting only; publishing is out of scope
- Any UI/dashboard for documentation update status — deferred to APIP-2020
- Operator CLI visibility for doc graph runs — deferred to APIP-5005
- Modifying `packages/backend/database-schema/` or `@repo/db` client — protected
- Migration of existing Claude Code doc-sync agent (`.claude/agents/`) — Documentation Graph is a new parallel track; agent migration is a separate concern

### Reuse Plan

- **Components**: None (no UI)
- **Patterns**: `createToolNode('doc-worker-{name}', fn)` + `create{WorkerName}Node(config)` factory for all 6 workers; Zod-first schemas at file top; `Annotation<T>({ reducer: overwrite/append, default: () => null })` for state fields; LangGraph `Send` API for parallel fan-out dispatch; KB deduplication guard (0.85 threshold) from `persist-learnings.ts`; `@repo/logger` structured logging with `storyId`, `workerName`, `filesUpdated`, `durationMs`
- **Packages**: `packages/backend/orchestrator` (createToolNode, state annotations, graph wiring patterns); `packages/backend/orchestrator/src/nodes/sync/doc-sync.ts` (7-phase logic for file discovery and changelog); `packages/backend/orchestrator/src/nodes/completion/persist-learnings.ts` (KB dedup guard); `@repo/logger`

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- **No UI impact**: No Playwright E2E required (`frontend_impacted: false`).
- **No UAT needed**: Headless orchestration graph — no user-facing surface.
- **Three test scopes required**:
  - *Unit tests* (Vitest, no external deps): One test file per worker (`api-docs-worker.test.ts`, etc.) + `doc-review.test.ts`. Mock `changedFiles`, test happy path, empty input, and error path. Target >75% coverage per worker file.
  - *Graph routing tests* (Vitest, real LangGraph `graph.compile()`): `doc-graph.test.ts` — verify compilation succeeds, `Send` dispatch routes to all 6 workers, aggregation edges all converge, post-review conditional edge gates commit. Mock all 6 worker implementations. Do NOT require real LLM calls.
  - *Dry-run integration test*: One test that runs the full graph with `dryRun: true` using a mock `MergeEventPayload` — verifies no filesystem writes occur and all workers complete.
- **Critical regression guard**: AC-17 (dry-run prevents filesystem writes) is the primary safety gate for integration testing.
- **KB Sync Worker test priority**: AC-7 and AC-15 (KB dedup guard and Doc Review KB safety check) are the highest-risk test targets — these protect against hallucinated KB pollution.
- **Sizing guard**: If implementing all 6 workers with real prompt logic pushes the story past ~14 ACs of meaningful work, the remaining workers should ship as stubs (correct interface, no-op prompt logic) and prompt quality becomes a follow-up.

### For UI/UX Advisor

- No UI impact in this story.
- Future visibility concern: The `DocCommitResult` should include a human-readable summary of what was updated (e.g., "Updated 3 files: CHANGELOG.md, docs/api/endpoints.md, README.md") that can surface in the operator CLI (APIP-5005) and Monitor UI (APIP-2020) without additional data transformation.
- The `docReviewResult.commitBlockedReason` string must be human-readable and actionable for the operator: "Doc Review blocked commit: KB Sync Worker proposed entry deletion (not permitted in Phase 1). Manual review required for story APIP-1030."

### For Dev Feasibility

- **File placement**: New directory `packages/backend/orchestrator/src/nodes/doc-workers/` with one file per worker + `__tests__/` subdirectory. New graph file `packages/backend/orchestrator/src/graphs/doc-graph.ts`. New test file `packages/backend/orchestrator/src/graphs/__tests__/doc-graph.test.ts`.
- **Graph wiring sequence**: `START` edges to `dispatch`; `dispatch` uses `Send` to fan out to 6 worker nodes; each worker node edges to `aggregate` node; `aggregate` edges to `doc-review`; `doc-review` uses `addConditionalEdges` to route to `commit` (if passed) or `log-blocked` (if blocked); both `commit` and `log-blocked` edge to `END`.
- **LangGraph Send API pattern**: The dispatch node function returns an array of `Send` objects: `return enabledWorkers.map(w => new Send(w.nodeName, state))`. Each worker's node name must be registered with `.addNode()` in the graph.
- **Aggregate node**: The aggregate node simply validates that all expected `workerResults` are present in state (since LangGraph does not provide a built-in join barrier for `Send`-dispatched nodes). The `reducer: append` on `workerResults` accumulates results as workers complete; the aggregate node waits until count matches expected workers. Consider using a sentinel count in state (`expectedWorkers: number`) to detect when all workers have reported.
- **Commit atomicity**: Use a write-then-rename pattern (or a single `fs.writeFile` per proposed change) inside the commit node. If any write fails mid-way, log and report partial failure — do not leave git in a dirty state. Append `--no-verify` to git commit only if explicitly configured (default: run hooks).
- **Model assignment**: Workers receive their model ID from `DocWorkerConfig.model`. In Phase 1, this is a hardcoded cheap model string (e.g., `'claude-haiku-4'`). In Phase 3, APIP-0040 (Model Router) will supply the model dynamically. Design `DocWorkerConfig.model` as a required string (not optional) so callers always explicitly set it.
- **Sizing risk mitigation**: Implement AC-1 through AC-11 first (graph scaffold, dispatch, aggregation, review, commit, 6 worker stubs with file discovery). Ship this as Phase A. AC-12 through AC-17 (config schema, exports, full test suite) constitute Phase B. If Phase A fills the story token budget, Phase B becomes a follow-up story.
- **Canonical references for subtask decomposition**:
  - Worker node pattern to replicate: `packages/backend/orchestrator/src/nodes/story/fanout-pm.ts`
  - Doc sync 7-phase logic to reuse: `packages/backend/orchestrator/src/nodes/sync/doc-sync.ts`
  - KB dedup guard to replicate in KB Sync Worker: `packages/backend/orchestrator/src/nodes/completion/persist-learnings.ts`
  - Graph state extension + wiring pattern: `packages/backend/orchestrator/src/graphs/elaboration.ts`
  - Graph test pattern: `packages/backend/orchestrator/src/graphs/__tests__/elaboration.test.ts`
