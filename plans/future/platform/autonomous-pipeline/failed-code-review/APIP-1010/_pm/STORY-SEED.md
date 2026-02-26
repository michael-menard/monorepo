---
generated: "2026-02-25"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 2
blocking_conflicts: 0
---

# Story Seed: APIP-1010

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No Structurer node exists in any graph. No `change_outline` schema exists. No complexity estimation or split-flagging logic exists anywhere in the codebase. The elaboration graph (`packages/backend/orchestrator/src/graphs/elaboration.ts`) currently terminates at `aggregate_findings` → `update_readiness` → `save_to_db` → `complete` with no downstream structured output suitable for diff planning.

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| Elaboration Graph | `packages/backend/orchestrator/src/graphs/elaboration.ts` | Primary graph APIP-1010 extends — Structurer node runs after `aggregate_findings`, reading the elaborated story's acceptance criteria and producing a `change_outline` |
| `ElaborationStateAnnotation` | `packages/backend/orchestrator/src/graphs/elaboration.ts` | LangGraph state annotation that must be extended with `changeOutline`, `complexityEstimates`, `splitRequired`, `splitReason` fields |
| `ElaborationResultSchema` | `packages/backend/orchestrator/src/graphs/elaboration.ts` | Zod result schema returned by `runElaboration()` — must be extended to carry `changeOutline` output to the supervisor |
| `FinalAcceptanceCriterion` | `packages/backend/orchestrator/src/nodes/story/synthesize.ts` | Schema for ACs that the Structurer node reads as its primary input |
| `SynthesizedStory` | `packages/backend/orchestrator/src/nodes/story/synthesize.ts` | Full story type available in elaboration graph state — input to Structurer |
| `AggregatedFindings` | `packages/backend/orchestrator/src/graphs/elaboration.ts` | Structurer may read `sectionsNeedingAttention` and `passed` from aggregated findings to inform complexity estimates |
| Existing node pattern | `packages/backend/orchestrator/src/nodes/elaboration/delta-detect.ts` | Canonical `createToolNode` factory + Zod schema pattern for new elaboration nodes |
| `createToolNode` | `packages/backend/orchestrator/src/runner/node-factory.ts` | Node factory all orchestrator nodes use — Structurer must follow this pattern |
| Orchestrator artifact schemas | `packages/backend/orchestrator/src/artifacts/` | Zod-first artifact pattern; `change_outline` output schema should follow this convention |

### Active In-Progress Work

| Story | Area | Potential Impact |
|-------|------|-----------------|
| APIP-0020 (In Elaboration) | Supervisor Loop | Supervisor dispatches to the elaboration graph and reads `ElaborationResult`. APIP-1010 adds `changeOutline` to `ElaborationResult` — supervisor APIP-0020 implementation must be aware this field will be present post-APIP-1010. No rework needed now, but dev of APIP-0020 should treat `changeOutline` as an optional field they do not yet consume. |
| APIP-5006 (In Elaboration) | LangGraph Server Infrastructure | Structurer node's LLM calls run on the dedicated server — no blocker for unit tests, but integration testing requires the server. Same constraint as APIP-0020. |
| APIP-5007 (In Elaboration) | DB Schema Versioning | No direct conflict — Structurer node does not write to Aurora directly. |

### Constraints to Respect

- **APIP ADR-001 Decision 4**: All pipeline components run on the dedicated local server, not Lambda. Structurer is a LangGraph node inside the elaboration graph — inherits this constraint.
- **APIP ADR-001 Decision 2**: Supervisor is a plain TypeScript process; the Structurer node is correctly placed inside a LangGraph worker graph (elaboration). This is the right layer for LangGraph checkpointing.
- **Do not regress elaboration graph**: Structurer must be added to the graph without breaking existing `runElaboration()` call signature, `ElaborationConfig`, or existing test suites (`elaboration.test.ts`, elaboration node tests).
- **Protected areas**: Do NOT touch `packages/backend/database-schema/` or `@repo/db` client. Structurer has no Aurora DB writes — its output lives in LangGraph state and is returned through `ElaborationResult`.
- **Split threshold (15 changes)**: This is a configurable parameter, not a hard constant — the Structurer config schema must expose `splitThreshold` with default 15.
- **Zod-first types**: All new schemas (ChangeOutlineItem, ComplexityEstimate, StructurerResult, StructurerConfig) must use Zod. No TypeScript interfaces.

---

## Retrieved Context

### Related Endpoints

None — APIP-1010 produces a LangGraph node inside the elaboration graph. No HTTP routes or API endpoints.

### Related Components

None — no UI components. This is a headless orchestration node.

### Reuse Candidates

| Candidate | Location | How to Reuse |
|-----------|----------|--------------|
| `createToolNode` | `packages/backend/orchestrator/src/runner/node-factory.ts` | Factory for creating typed LangGraph nodes — Structurer must use `createToolNode('structurer', async (state) => ...)` |
| `ElaborationStateAnnotation` | `packages/backend/orchestrator/src/graphs/elaboration.ts` | Extend with new Structurer output fields: `changeOutline`, `splitRequired`, `splitReason`, `structurerComplete` |
| `ElaborationResultSchema` | `packages/backend/orchestrator/src/graphs/elaboration.ts` | Extend to carry `changeOutline` and `splitRequired` in the result returned to the supervisor |
| `ElaborationConfigSchema` | `packages/backend/orchestrator/src/graphs/elaboration.ts` | Add `structurerConfig` sub-object with `splitThreshold`, `maxChangesPerItem`, `enabled` fields |
| `delta-detect.ts` node pattern | `packages/backend/orchestrator/src/nodes/elaboration/delta-detect.ts` | Canonical pattern: Zod schemas at top, `create*Node()` factory, exported result type, tests in `__tests__/` |
| `FinalAcceptanceCriterionSchema` | `packages/backend/orchestrator/src/nodes/story/synthesize.ts` | Primary input type — iterate over `state.currentStory.acceptanceCriteria` |
| `@repo/logger` | Used throughout orchestrator | Structured logging for node execution — use `logger.info/warn/error` with `storyId`, `changeCount`, `splitRequired` fields |
| Artifact Zod pattern | `packages/backend/orchestrator/src/artifacts/story.ts` | Model `ChangeOutlineSchema` and `StructurerResultSchema` after existing artifact schemas |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Elaboration node: Zod schema + createToolNode + tests | `/Users/michaelmenard/Development/monorepo/packages/backend/orchestrator/src/nodes/elaboration/delta-detect.ts` | Canonical pattern for a new elaboration node — Zod schemas at top, pure functions, `createToolNode` factory, exported types. Structurer node file (`structurer.ts`) should mirror this structure exactly. |
| Graph state extension + graph wiring | `/Users/michaelmenard/Development/monorepo/packages/backend/orchestrator/src/graphs/elaboration.ts` | Shows how to extend `ElaborationStateAnnotation`, add a new node with `.addNode()`, wire conditional edges with `addConditionalEdges`, and extend `ElaborationResultSchema`. The Structurer node slots in after `aggregate_findings`. |
| Zod-first artifact schema | `/Users/michaelmenard/Development/monorepo/packages/backend/orchestrator/src/artifacts/story.ts` | Canonical Zod artifact schema structure — `ChangeOutlineItemSchema`, `StructurerResultSchema` should follow this file's naming and structural conventions. |
| Graph test pattern (routing + compilation) | `/Users/michaelmenard/Development/monorepo/packages/backend/orchestrator/src/graphs/__tests__/elaboration.test.ts` | Test `graph.compile()` succeeds, verify routing paths through the new `structurer` node, mock node implementations to test routing without LLM calls. |

---

## Knowledge Context

### Lessons Learned

- **[WINT-9020 / architecture]** Native TypeScript LangGraph node with sequential phase architecture is viable and testable. Sequential phase design (e.g., `parse ACs → estimate complexity per change → flag splits → produce outline`) with graceful fallback is robust.
  - *Applies because*: Structurer follows the same native TypeScript LangGraph node pattern — not a subprocess delegation. The sequential decomposition (read ACs, produce change items, estimate per-item, aggregate, flag) mirrors the 7-phase pattern proven in WINT-9020.

- **[AUDT-0010 / testing]** LangGraph graph tests should target compiled graph routing logic, not dynamic lens imports.
  - *Applies because*: Structurer node tests must test (a) the node's pure functions in isolation and (b) graph routing that includes the `structurer` node, without invoking real LLM calls. Follow `elaboration.test.ts` pattern.

- **[createToolNode / architecture]** `createToolNode('name', fn)` factory pattern extends cleanly via DI. Config injected at construction, mocked functions for testing.
  - *Applies because*: Structurer must use `createToolNode('structurer', ...)` with `createStructurerNode(config)` factory. Config (`splitThreshold`, etc.) injected at construction, not hardcoded. This matches every other node in the orchestrator.

- **[WKFL retro / workflow]** Stories with complex algorithms (multi-phase, statistical) exceed token estimates by up to 8x. Complexity estimation logic is in this category.
  - *Applies because*: The complexity-per-change estimation logic is non-trivial. Sizing must account for: schema design, heuristic or LLM-based estimation logic, integration into graph, tests. If estimation uses an LLM call, this adds significant token cost per elaboration run — consider a heuristic-first approach.

### Blockers to Avoid (from past stories)

- **Regressing `runElaboration()` call signature**: The supervisor (APIP-0020) calls `runElaboration()` with `(currentStory, previousStory, config)`. Adding Structurer must not change this signature. New fields in `ElaborationConfig` must be optional with defaults. New fields in `ElaborationResult` must also be optional (`z.nullable()` with null default) to maintain backward compatibility.
- **Tight-coupling Structurer to LLM calls without fallback**: If the Structurer uses a model call to estimate complexity, a model failure will block the entire elaboration pipeline. Design a heuristic fallback (e.g., estimate complexity as `medium` for all items if LLM call fails) so Structurer can gracefully degrade rather than fail the elaboration.
- **Hardcoding split threshold**: The 15-change threshold is stated in the story feature but must be configurable via `StructurerConfig.splitThreshold`. Teams may need to tune this; hardcoding it makes the node inflexible and couples tests to a magic number.
- **Missing node export in elaboration index**: After adding `structurer.ts`, it must be exported from `packages/backend/orchestrator/src/nodes/elaboration/index.ts` — forgetting this breaks downstream imports.
- **LangGraph graph tests importing dynamic nodes**: Per AUDT-0010 lesson, structurer graph tests must not import dynamic lens paths. Test the routing function (`afterAggregate → structurer`) and the compiled graph, not the node internals via dynamic import.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| APIP ADR-001 Decision 2 | Plain TypeScript Supervisor | Structurer is a LangGraph node (correct layer), not a supervisor concern. Supervisor only reads `changeOutline` from `ElaborationResult`. |
| APIP ADR-001 Decision 4 | Local Dedicated Server | Structurer runs on the dedicated server as part of the elaboration graph — no Lambda. |
| APIP ADR-001 Decision 3 | ChangeSpec Spike before integration | APIP-1020 is a spike to validate the ChangeSpec schema. Structurer's `change_outline` feeds into that spike as raw material. APIP-1010 does NOT need to anticipate APIP-1020's final schema — it produces a `change_outline` (ordered file change list); the diff planner spike will define how that maps to a `ChangeSpec`. Keep these concerns separate. |
| ADR-005 | Testing: UAT Uses Real Services | No frontend; ADR-006 E2E Playwright skipped. Integration tests must use real LangGraph invocation with real node — no stubbing the graph runtime itself. |
| ADR-006 | E2E Tests Required in Dev Phase | `frontend_impacted: false` — ADR-006 E2E Playwright requirement does not apply. |

### Patterns to Follow

- `createStructurerNode(config)` factory with `createToolNode('structurer', async (state) => ...)` — follows every other node in the orchestrator
- All schemas defined at file top using Zod (`z.object`, `z.array`, `z.enum`, `z.number`) before any function definitions
- `StructurerConfigSchema` with `splitThreshold: z.number().int().positive().default(15)` and `enabled: z.boolean().default(true)`
- Heuristic-first complexity estimation with optional LLM enhancement — avoids model failure blocking elaboration
- `@repo/logger` for all logging; structured fields: `storyId`, `changeCount`, `splitRequired`, `durationMs`
- Extend `ElaborationStateAnnotation` with new fields using `Annotation<T>({ reducer: overwrite, default: () => null })` pattern
- Node placed in elaboration graph after `aggregate_findings` node, before `update_readiness` — new conditional edge: `afterAggregate` routes to `structurer` if enabled, then to `update_readiness`
- Export new node and schemas from `packages/backend/orchestrator/src/nodes/elaboration/index.ts`

### Patterns to Avoid

- TypeScript interfaces — all types must be `z.infer<typeof Schema>`
- Hardcoded `15` constant for split threshold — must be in config
- Making Structurer a blocking step that fails the elaboration on model error — use graceful fallback
- Adding Structurer as a mandatory step that breaks backward compat of `ElaborationResult` — new result fields are nullable
- Dynamic imports of Structurer node in graph-level tests — test routing functions directly
- Modifying existing AC schemas (`FinalAcceptanceCriterionSchema`) — Structurer reads but does not modify ACs
- Writing to Aurora/database from the Structurer node — output lives in LangGraph state only

---

## Conflict Analysis

### Conflict: Dependency on APIP-0020 (supervisor not yet built)
- **Severity**: warning
- **Description**: APIP-1010 extends the elaboration graph that APIP-0020's supervisor dispatches to. APIP-0020 reads `ElaborationResult` and will encounter the new `changeOutline` field once APIP-1010 merges. Since APIP-0020 is still in elaboration, its implementation must treat `changeOutline` as an unknown optional field (which it will be, since it is nullable in `ElaborationResult`). No rework required — supervisor ignores fields it does not consume.
- **Resolution Hint**: Document in APIP-1010 dev notes that `changeOutline` is added as a nullable field to `ElaborationResult` for forward compatibility. APIP-0020 implementation should not assert on `ElaborationResult` shape beyond what it needs.

### Conflict: ChangeSpec schema not yet defined (APIP-1020 spike deferred)
- **Severity**: warning
- **Description**: APIP-1010's `change_outline` is the primary input to APIP-1020 (ChangeSpec Schema Design Spike). However, APIP-1020 was restructured as a research spike (ADR-001 Decision 3) that runs after APIP-1010. This means APIP-1010 must define its `ChangeOutlineItem` schema independently, without knowing the final ChangeSpec contract. There is a risk that APIP-1020's spike concludes the `change_outline` structure needs modification — which would require a follow-up story to update APIP-1010's schema.
- **Resolution Hint**: Design `ChangeOutlineItem` with the minimum viable fields that the spike will need: `filePath`, `changeType`, `description`, `complexity` (low/medium/high), `estimatedAtomicChanges`. Keep the schema intentionally minimal and document that APIP-1020 may add fields via a follow-up. Do not anticipate ChangeSpec internals in `ChangeOutlineItem`.

---

## Story Seed

### Title

Structurer Node in Elaboration Graph

### Description

The autonomous pipeline's diff planner (APIP-1020+) requires structured, machine-readable decomposition of a story's acceptance criteria into an ordered list of expected file changes before implementation can proceed. Currently, the elaboration graph (`packages/backend/orchestrator/src/graphs/elaboration.ts`) produces human-readable aggregate findings but no structured change outline that a downstream diff planner can consume.

This story adds a **Structurer node** to the existing elaboration graph. The node runs after `aggregate_findings`, reads the elaborated story's acceptance criteria from `ElaborationState.currentStory.acceptanceCriteria`, and produces a `change_outline`: an ordered list of `ChangeOutlineItem` records, each describing an expected file change with a complexity estimate (`low` / `medium` / `high`) and approximate atomic change count. If the total estimated atomic changes across all items exceeds the configurable `splitThreshold` (default: 15), the Structurer sets `splitRequired: true` and provides a `splitReason` — flagging the story for human review before it advances to implementation.

The Structurer node is a new LangGraph node placed inside the elaboration graph. It follows the established `createToolNode('structurer', fn)` factory pattern used by all other orchestrator nodes. Its output is persisted in `ElaborationState` and surfaced in `ElaborationResult` as nullable fields, maintaining full backward compatibility with the existing `runElaboration()` call signature.

Complexity estimation is heuristic-first (AC word count, referenced file patterns, cross-cutting concerns from escape hatch result) with optional LLM enhancement. If estimation fails, the node gracefully degrades: it returns a `change_outline` with `complexity: 'unknown'` per item and does not block the elaboration from completing.

### Initial Acceptance Criteria

- [ ] AC-1: A `StructurerConfigSchema` Zod schema exists in `packages/backend/orchestrator/src/nodes/elaboration/structurer.ts` with fields: `enabled: z.boolean().default(true)`, `splitThreshold: z.number().int().positive().default(15)`, `maxChangesPerItem: z.number().int().positive().default(50)`, `nodeTimeoutMs: z.number().positive().default(60000)`
- [ ] AC-2: A `ChangeOutlineItemSchema` Zod schema exists with fields: `id` (string, e.g. "CO-1"), `filePath` (string), `changeType` (enum: `'create' | 'modify' | 'delete'`), `description` (string), `complexity` (enum: `'low' | 'medium' | 'high' | 'unknown'`), `estimatedAtomicChanges` (number, integer, min 1), `relatedAcIds` (array of AC IDs that drive this change)
- [ ] AC-3: A `StructurerResultSchema` Zod schema exists with fields: `storyId`, `changeOutline` (array of `ChangeOutlineItem`), `totalEstimatedAtomicChanges` (number), `splitRequired` (boolean), `splitReason` (string, nullable), `structuredAt` (ISO datetime), `durationMs`, `fallbackUsed` (boolean — true if heuristic fallback was used instead of LLM estimation)
- [ ] AC-4: A `createStructurerNode(config)` factory function exists, implementing `createToolNode('structurer', async (state: ElaborationState) => ...)`. It reads `state.currentStory.acceptanceCriteria` and `state.escapeHatchResult` (for cross-cutting context), produces a `StructurerResult`, and returns state updates: `changeOutline`, `splitRequired`, `splitReason`, `structurerComplete: true`
- [ ] AC-5: The Structurer node is wired into the elaboration graph in `packages/backend/orchestrator/src/graphs/elaboration.ts`: added via `.addNode('structurer', createStructurerNode(fullConfig.structurerConfig))`, positioned after `aggregate_findings` (the `afterAggregate` conditional edge routes to `structurer` when `structurerConfig.enabled === true`, then `structurer` edges to `update_readiness`)
- [ ] AC-6: `ElaborationStateAnnotation` is extended with: `changeOutline: Annotation<ChangeOutlineItem[] | null>`, `splitRequired: Annotation<boolean>`, `splitReason: Annotation<string | null>`, `structurerComplete: Annotation<boolean>`
- [ ] AC-7: `ElaborationResultSchema` is extended with nullable fields: `changeOutline: z.array(ChangeOutlineItemSchema).nullable().default(null)`, `totalEstimatedAtomicChanges: z.number().nullable().default(null)`, `splitRequired: z.boolean().default(false)`, `splitReason: z.string().nullable().default(null)` — `runElaboration()` call signature is unchanged
- [ ] AC-8: `ElaborationConfigSchema` is extended with `structurerConfig: StructurerConfigSchema.default({})` (optional sub-object with defaults) — no change to existing callers
- [ ] AC-9: When `totalEstimatedAtomicChanges > splitThreshold`, `splitRequired` is `true` and `splitReason` contains a human-readable explanation naming the contributing changes; when at or below threshold, `splitRequired` is `false` and `splitReason` is `null`
- [ ] AC-10: When `state.currentStory` is null or `state.currentStory.acceptanceCriteria` is empty, the Structurer returns `changeOutline: []`, `splitRequired: false`, `structurerComplete: true`, and appends a warning to `state.warnings` — it does NOT set `currentPhase: 'error'`
- [ ] AC-11: When Structurer encounters a model error (if LLM path used), it catches the error, sets `fallbackUsed: true`, produces a heuristic-based outline (one `ChangeOutlineItem` per AC with `complexity: 'unknown'`, `estimatedAtomicChanges: 1`), and completes normally — elaboration is not blocked
- [ ] AC-12: New Structurer schemas and factory are exported from `packages/backend/orchestrator/src/nodes/elaboration/index.ts`
- [ ] AC-13: Unit tests exist in `packages/backend/orchestrator/src/nodes/elaboration/__tests__/structurer.test.ts` covering: (a) happy path with multiple ACs producing correct `changeOutline` structure, (b) split flagging when estimated total > threshold, (c) no-split when estimated total <= threshold, (d) empty ACs fallback (warning, no error), (e) model error fallback path sets `fallbackUsed: true`, (f) `splitThreshold` config is respected (test with threshold of 5 and 3 items)
- [ ] AC-14: Elaboration graph tests in `packages/backend/orchestrator/src/graphs/__tests__/elaboration.test.ts` are extended to verify: `graph.compile()` still succeeds, the routing path through `structurer` is reachable, and existing elaboration tests continue to pass unchanged

### Non-Goals

- Defining the ChangeSpec schema (the diff planner's input contract) — that is APIP-1020's research spike
- Integrating the `change_outline` into any downstream graph (diff planner, implementation) — those are Phase 1+ stories (APIP-1020, APIP-1030)
- Automated story splitting (creating two stories from one) — APIP-1010 only flags for human review; actual splitting is a human operator action
- LLM-based complexity estimation as the primary path (heuristic-first is acceptable for Phase 1; LLM enhancement is optional)
- Writing `changeOutline` to Aurora — output lives in LangGraph state and `ElaborationResult` only
- Modifying `FinalAcceptanceCriterionSchema` or `SynthesizedStory` schemas — Structurer reads these, does not modify them
- Operator CLI visibility for split-flagged stories — APIP-5005
- Any UI/dashboard changes — APIP-2020
- Modifying `packages/backend/database-schema/` — protected

### Reuse Plan

- **Components**: None (no UI)
- **Patterns**: `createToolNode('structurer', fn)` factory pattern; Zod-first schemas at file top; `Annotation<T>({ reducer: overwrite, default: () => null })` for new state fields; `@repo/logger` structured logging with `storyId`, `changeCount`, `splitRequired` fields; heuristic-first estimation with graceful LLM fallback
- **Packages**: `packages/backend/orchestrator` (elaboration graph, `createToolNode`, `ElaborationStateAnnotation`, `ElaborationResultSchema`, `ElaborationConfigSchema`, `FinalAcceptanceCriterionSchema`, `EscapeHatchResult`); `@repo/logger`

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- **No UI impact**: ADR-006 E2E Playwright requirement does not apply (`frontend_impacted: false`).
- **No UAT needed**: This is a pure backend orchestration node with no user-facing surface.
- **Two test scopes required**:
  - *Unit tests* (Vitest, no external deps): `structurer.test.ts` — test the node function with mock `ElaborationState`. Cover happy path, split flagging, threshold config, empty ACs fallback, error fallback. Target >80% coverage on structurer.ts.
  - *Graph integration tests* (Vitest, real LangGraph `graph.compile()`): extend `elaboration.test.ts` to verify the new node is in the compiled graph, routing reaches `structurer` from `aggregate_findings`, and existing routes still pass. Do NOT require a real LLM call in graph tests — mock the Structurer node implementation.
- **Regression guard**: AC-14 is mandatory — existing elaboration tests must still pass. This is the primary regression risk.
- **Coverage focus**: The heuristic estimation logic (AC complexity scoring, cross-cutting change detection) is the most testable pure logic in this story. Write parametric tests with multiple AC configurations to validate threshold boundary conditions.
- **Do not test `runElaboration()` end-to-end** with a real LLM in CI — this is an integration concern for the server environment, not a unit test concern.

### For UI/UX Advisor

- No UI impact. This story is invisible to end users.
- The `splitReason` string in `ElaborationResult` will eventually surface to an operator (via APIP-5005 CLI). Keep `splitReason` human-readable and actionable: "Story exceeds split threshold: 22 estimated atomic changes (threshold: 15). Contributing changes: [CO-3: modify AuthService (8), CO-7: create UserQuotaAdapter (9)]."

### For Dev Feasibility

- **File placement**: New file `packages/backend/orchestrator/src/nodes/elaboration/structurer.ts`. Tests in `packages/backend/orchestrator/src/nodes/elaboration/__tests__/structurer.test.ts`. No new package or app directory needed.
- **Graph wiring sequence**: The `afterAggregate` conditional edge in `elaboration.ts` currently routes to either `update_readiness` or `save_to_db`. With Structurer added, the routing becomes: `aggregate_findings` → `structurer` (if enabled) → `update_readiness` → `save_to_db`. The conditional edge logic needs updating: `afterAggregate` returns `'structurer'` when `structurerConfig.enabled`, or `'update_readiness'` otherwise.
- **State extension pattern**: Follow the existing `Annotation<T>({ reducer: overwrite, default: () => null })` pattern exactly. New fields: `changeOutline: Annotation<ChangeOutlineItem[] | null>`, `splitRequired: Annotation<boolean>({ ..., default: () => false })`, `splitReason: Annotation<string | null>`, `structurerComplete: Annotation<boolean>({ ..., default: () => false })`.
- **Heuristic estimation approach**: A reasonable v1 heuristic — for each AC, parse the description for file/module references, count distinct systems mentioned, apply a lookup: 1 system = `low` (1-3 changes), 2 systems = `medium` (3-8 changes), 3+ systems or cross-cutting = `high` (8-15 changes). `estimatedAtomicChanges` = midpoint of range. Complexity from `escape_hatch` cross-cutting flag can bump estimates up.
- **Backward compatibility check**: After extending `ElaborationResultSchema`, run `pnpm test:all` against orchestrator package to confirm no existing test breaks on schema parse. The new nullable fields with defaults should be transparent to existing callers.
- **Risk: APIP-1020 schema drift**: `ChangeOutlineItem` schema may need fields added or modified once APIP-1020 spike completes. Design `ChangeOutlineItem` with an `extensions: z.record(z.unknown()).optional()` escape hatch field so the spike can add structured data without requiring a schema-breaking migration.
- **Canonical references for subtask decomposition**:
  - Node pattern to replicate: `packages/backend/orchestrator/src/nodes/elaboration/delta-detect.ts`
  - Graph wiring to modify: `packages/backend/orchestrator/src/graphs/elaboration.ts` (specifically `afterAggregate`, `.addNode()` chain, `ElaborationStateAnnotation`, `ElaborationResultSchema`)
  - Test pattern to follow: `packages/backend/orchestrator/src/graphs/__tests__/elaboration.test.ts`
  - Artifact schema pattern: `packages/backend/orchestrator/src/artifacts/story.ts`
