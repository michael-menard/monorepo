---
generated: "2026-02-25"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: true
conflicts_found: 3
blocking_conflicts: 0
---

# Story Seed: APIP-3050

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No `structurer.ts` file exists in `packages/backend/orchestrator/src/nodes/elaboration/` — APIP-1010 (the story that builds the Structurer node) is currently In Progress but the implementation has not yet landed. No affinity profile reading capability exists anywhere in the elaboration graph. No `wint.model_affinity` table exists (APIP-3020 backlog). No affinity-guided heuristics exist in any orchestrator node. The elaboration graph does not yet have a Structurer node wired into it — that deliverable is in-flight under APIP-1010.

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| Elaboration Graph | `packages/backend/orchestrator/src/graphs/elaboration.ts` | APIP-3050 adds a new capability path into an existing node (the Structurer from APIP-1010). Graph wiring does not change — only the Structurer node's internal heuristic logic is extended to read affinity profiles. |
| `ElaborationConfigSchema` | `packages/backend/orchestrator/src/graphs/elaboration.ts` | Will need a new optional sub-object (`affinityConfig`) for enabling/disabling affinity-guided structuring and setting minimum confidence threshold. Must follow existing sub-object pattern with `.default({})`. |
| `StructurerConfigSchema` (post APIP-1010) | `packages/backend/orchestrator/src/nodes/elaboration/structurer.ts` | Does not yet exist. APIP-3050 extends it by adding `affinityEnabled: z.boolean().default(true)` and `minAffinityConfidence: z.enum([...]).default('low')`. |
| `ChangeOutlineItemSchema` (post APIP-1010) | `packages/backend/orchestrator/src/nodes/elaboration/structurer.ts` | Does not yet exist. APIP-3050 may augment with `preferredChangePattern` field (e.g., `'create-new-file' | 'modify-existing' | 'split-component'`) driven by affinity data. |
| `wint.model_affinity` table (post APIP-3020) | `packages/backend/database-schema/src/schema/` | Does not yet exist. APIP-3050 depends on APIP-3020 having defined `ModelAffinitySelectSchema` and the query interface for affinity profiles. |
| `createToolNode` factory | `packages/backend/orchestrator/src/runner/node-factory.ts` | Every orchestrator node is created with this factory. APIP-3050 modifications to the Structurer node stay within this pattern. |
| `@repo/logger` | Used throughout orchestrator | All logging in affinity-reader and updated Structurer logic must use `@repo/logger`. |
| `delta-detect.ts` (canonical elaboration node pattern) | `packages/backend/orchestrator/src/nodes/elaboration/delta-detect.ts` | Canonical pattern to follow for the new affinity-reading helper module structure if introduced as a separate file. |
| `metrics.ts` aggregation graph | `packages/backend/orchestrator/src/graphs/metrics.ts` | Shows how a node can read from Aurora (injected via config) — relevant if affinity profiles are fetched from the DB inside the Structurer node. |

### Active In-Progress Work

| Story | Status | Area | Potential Impact |
|-------|--------|------|-----------------|
| APIP-1010 | In Progress | Structurer Node in Elaboration Graph | **Hard upstream dependency.** APIP-3050 modifies the Structurer node built by APIP-1010. APIP-3050 cannot begin implementation until APIP-1010 merges. `structurer.ts`, `StructurerConfigSchema`, `ChangeOutlineItemSchema`, and `createStructurerNode` must all exist first. |
| APIP-3020 | backlog | Model Affinity Profiles Table and Pattern Miner Cron | **Hard upstream dependency.** APIP-3050's core logic reads from `wint.model_affinity`. That table, its Drizzle schema, and its Zod types do not exist until APIP-3020 ships. The query interface for affinity profiles (e.g., `getAffinityProfile(model, changeType, fileType)`) must be agreed upon before APIP-3050 implements the reader. |
| APIP-3010 | backlog | Change Telemetry Table and Instrumentation | Indirect dependency (APIP-3020 depends on APIP-3010). APIP-3050 does not directly read `change_telemetry`, but the entire affinity chain starts here. No blocking impact on APIP-3050 design. |
| APIP-1020 | Ready to Work | ChangeSpec Schema Design Spike | The ChangeSpec ADR may add fields to `ChangeOutlineItemSchema` (via the `extensions` escape hatch). If APIP-3050 adds `preferredChangePattern` to `ChangeOutlineItemSchema`, this must be coordinated with any APIP-1020 additions to avoid schema conflicts. |
| APIP-0040 | Needs Code Review | Model Router v1 | Defines how models are selected; shares model names/identifiers with the affinity system. APIP-3050 must use the same model identifier strings as APIP-0040 to ensure affinity profile lookups use consistent keys. |

### Constraints to Respect

- **APIP ADR-001 Decision 4**: All components run on the dedicated local server. No Lambda. Affinity profile reads happen from inside the elaboration graph — DB access is via injected connection, same pattern as other orchestrator nodes.
- **APIP ADR-001 Decision 2**: Structurer is a LangGraph node inside the elaboration graph — this is the correct layer. No supervisor concern.
- **Zod-first types (REQUIRED)**: All new schemas (`AffinityReadResultSchema`, any extensions to `StructurerConfigSchema`) must be Zod schemas with `z.infer<>`. No TypeScript interfaces.
- **Non-blocking / graceful degradation required**: The risk note states "over-optimizing for model strengths may produce sub-optimal architectural decompositions." The affinity-guided path must have a fallback: if no affinity data exists (cold-start, APIP-3020 not yet populated), the Structurer silently falls back to its existing heuristic behavior. Affinity guidance is an enhancement, never a hard requirement.
- **Do not modify `FinalAcceptanceCriterionSchema` or `SynthesizedStory`**: Structurer reads, does not modify ACs.
- **Do not write to Aurora from the Structurer node directly**: Affinity profile reads are read-only from the Structurer. The write path is APIP-3020 (Pattern Miner cron).
- **Protected areas**: `packages/backend/database-schema/` is additive only; `@repo/db` API surface must not change; `packages/backend/orchestrator/src/models/` must not be modified.
- **Cold-start contract from APIP-3020**: APIP-3020 specifies that `sample_size = 0` and `confidence_level = 'none'` represents "no data yet." APIP-3050 must treat `confidence_level = 'none'` or absent rows as "skip affinity guidance" and proceed with the plain heuristic path — this is the cold-start guard rail.

---

## Retrieved Context

### Related Endpoints

None — APIP-3050 is a purely internal orchestrator node enhancement. No HTTP endpoints.

### Related Components

None — no UI components. This is a headless orchestration enhancement.

### Reuse Candidates

| Candidate | Location | How to Reuse |
|-----------|----------|--------------|
| `createStructurerNode` (post APIP-1010) | `packages/backend/orchestrator/src/nodes/elaboration/structurer.ts` | Primary target — APIP-3050 extends this factory to accept and apply affinity profiles |
| `StructurerConfigSchema` (post APIP-1010) | `packages/backend/orchestrator/src/nodes/elaboration/structurer.ts` | Extend with `affinityEnabled` and `minAffinityConfidence` fields; must use `.default({})` optional sub-object pattern |
| `ModelAffinitySelectSchema` (post APIP-3020) | `packages/backend/database-schema/src/schema/` | Affinity row type — use for typing the profile lookup result; no interfaces |
| `createToolNode` | `packages/backend/orchestrator/src/runner/node-factory.ts` | If introducing a separate `affinity-reader.ts` helper node, use the same factory pattern |
| `ElaborationConfigSchema` | `packages/backend/orchestrator/src/graphs/elaboration.ts` | Extend with affinity DB connection / config passthrough |
| `metrics.ts` DB injection pattern | `packages/backend/orchestrator/src/graphs/metrics.ts` | Shows how a LangGraph graph accepts a DB connection via config for read queries |
| `delta-detect.ts` node file structure | `packages/backend/orchestrator/src/nodes/elaboration/delta-detect.ts` | Canonical pattern if a new `affinity-reader.ts` helper module is created |
| `@repo/logger` | Throughout orchestrator | All structured logging |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Elaboration node extension (Zod + createToolNode) | `/Users/michaelmenard/Development/monorepo/packages/backend/orchestrator/src/nodes/elaboration/delta-detect.ts` | Canonical pattern for an elaboration node file: Zod schemas at top, pure logic functions, `createToolNode` factory, exported types. Any new `affinity-reader.ts` or extension to `structurer.ts` should mirror this file's structure exactly. |
| Graph config sub-object with DB injection | `/Users/michaelmenard/Development/monorepo/packages/backend/orchestrator/src/graphs/metrics.ts` | Only existing graph that accepts a DB connection via config for read operations. Affinity profile reads from Structurer require the same injection pattern — `db` passed via `config.configurable`, not imported directly. |
| Graph state + config extension | `/Users/michaelmenard/Development/monorepo/packages/backend/orchestrator/src/graphs/elaboration.ts` | Shows how to add an optional config sub-object to `ElaborationConfigSchema` with `.default({})`. The `affinityConfig` sub-object follows the same `deltaDetectionConfig` / `escapeHatchConfig` pattern already present. |
| Zod-first schema pattern | `/Users/michaelmenard/Development/monorepo/packages/backend/orchestrator/src/artifacts/story.ts` | Canonical Zod artifact schema structure — any new `AffinityGuidanceSchema` or extensions to existing schemas must follow this naming and structural pattern. No TypeScript interfaces. |

---

## Knowledge Context

### Lessons Learned

Knowledge base search was unavailable during seed generation (`INTERNAL_ERROR`). The following lessons are inferred from APIP ADR-001, patterns from existing APIP story seeds (APIP-1010, APIP-3020), and the in-progress APIP-1010 story notes:

- **[APIP-1010 QA notes]** Future opportunities deferred to APIP-3050: "affinity-guided change pattern selection" was explicitly flagged as a Phase 3 enhancement in the APIP-1010 QA pass. The `ChangeOutlineItem.extensions` escape hatch field was added specifically to allow APIP-3050 to inject `preferredChangePattern` without a schema-breaking migration. (*category: pattern*)
  - *Applies because*: APIP-3050 should use the `extensions` field to carry the affinity-guided change pattern preference (`'create-new-file' | 'modify-existing' | 'split-component'`) into `ChangeOutlineItem` records. This was the intended forward-compatibility mechanism.

- **[APIP-3020 seed / risk]** Cold-start day 1 — no affinity profiles exist. Downstream consumers must define "no profile" unambiguously. APIP-3020 specifies `sample_size = 0`, `confidence_level = 'none'` as the cold-start sentinel. (*category: constraint*)
  - *Applies because*: APIP-3050 must guard against absent or low-confidence affinity profiles. The affinity-guidance path should silently skip when `confidence_level` is `'none'` or `'low'` (configurable minimum threshold). This prevents cold-start from producing garbage structuring decisions.

- **[APIP-3020 seed / risk]** Downstream consumers must have a default/fallback path for missing affinity data. APIP-3050's ACs must explicitly define what the Structurer does when the affinity DB is unreachable, returns no rows, or returns only `'none'` confidence rows. (*category: blocker-to-avoid*)
  - *Applies because*: The elaboration pipeline must never be blocked by the affinity system. Affinity guidance is an optimization overlay, not a hard dependency. If the DB query times out or returns no usable data, the Structurer must fall back to its plain heuristic path transparently.

- **[APIP-1010 lessons]** Stories with complex algorithmic logic exceed token estimates by up to 8x. The affinity-guided path adds a second decision branch (read profile → apply pattern preference) on top of an already-complex heuristic. (*category: time_sink*)
  - *Applies because*: Sizing for APIP-3050 must account for: the affinity reader module, integration with `StructurerConfigSchema`, the fallback path, tests for all three branches (affinity active, affinity fallback, cold-start), and regression against APIP-1010's Structurer test suite.

- **[APIP-1010 architecture]** `createToolNode`'s `NodeImplementation` type uses `(state: GraphState, config?) => ...`, not `ElaborationState`. Cast `state` to `ElaborationState` inside the implementation body — do NOT type the outer parameter as `ElaborationState`. (*category: pattern*)
  - *Applies because*: APIP-3050 modifies the Structurer node implementation. The DB injection for affinity reads will arrive via `config.configurable` — the same TypeScript constraint from GAP-004 in APIP-1010 applies here. Pattern: `createToolNode('structurer', async (state: GraphState, config?) => { const s = state as ElaborationState; const db = config?.configurable?.db; ... })`.

### Blockers to Avoid (from past stories)

- **Starting APIP-3050 before APIP-1010 merges**: The Structurer node file (`structurer.ts`), `StructurerConfigSchema`, `ChangeOutlineItemSchema`, and `createStructurerNode` do not exist yet. Any APIP-3050 implementation attempt without APIP-1010 is building on nothing. Gate the work item strictly.
- **Starting APIP-3050 before APIP-3020 merges**: `wint.model_affinity` and `ModelAffinitySelectSchema` do not exist yet. The affinity reader has no data source to query. The query interface (`getAffinityProfile(model, changeType, fileType)`) cannot be implemented until the table and Zod types are available.
- **Coupling affinity guidance to a hard DB dependency**: If the Structurer node errors on affinity DB unavailability, the entire elaboration pipeline fails. The affinity reader must be wrapped in try/catch with a silent fallback — log a `warn`, return `null`, proceed with plain heuristic. This is non-negotiable per the risk note in the story.
- **Producing architecturally poor decompositions in pursuit of cheap-model optimization**: The risk note explicitly calls out "over-optimizing for model strengths may produce sub-optimal architectural decompositions." Guard rails are required: (a) affinity guidance only applies to change pattern selection (`extensions.preferredChangePattern`), not to file count, complexity tier, or split threshold decisions; (b) the guidance must be weighted, not deterministic — it should bias the pattern choice, not override the structural analysis.
- **Using a different model identifier format than APIP-0040**: Affinity profiles are keyed by `(model, change_type, file_type)`. The `model` key must match exactly what APIP-0040's model router uses as model identifiers. If the lookup key format differs (e.g., `claude-haiku-4-5` vs `haiku`), all affinity queries will return no data. Confirm the model identifier convention with APIP-0040 before writing the query.
- **Hardcoding the minimum confidence threshold**: The threshold for "sufficient affinity data to trust" must be configurable (`minAffinityConfidence` in `StructurerConfig`) and default to `'low'` (per APIP-3020 spec: `low` = 1–19 samples). This allows the threshold to be raised as the learning system matures.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| APIP ADR-001 Decision 2 | Plain TypeScript Supervisor | Affinity-guided Structurer is a LangGraph node (correct layer). Supervisor does not interact with affinity data — it reads `ElaborationResult.changeOutline` which now contains affinity-informed suggestions, but supervisor logic is unchanged. |
| APIP ADR-001 Decision 4 | Local Dedicated Server | Affinity profile reads happen via direct Aurora PostgreSQL connection on the dedicated server. No Lambda. DB injected via graph config. |
| APIP ADR-001 Decision 3 | ChangeSpec Spike before integration | `ChangeOutlineItem.extensions` escape hatch was added in APIP-1010 specifically for APIP-1020 spike and APIP-3050 additions. Use `extensions.preferredChangePattern` to carry affinity guidance without breaking the schema contract established by the APIP-1020 spike. Do not add a top-level `preferredChangePattern` field to `ChangeOutlineItemSchema` until the APIP-1020 spike confirms the schema. |
| ADR-005 | Testing Strategy — UAT Uses Real Services | Integration tests for the affinity reader must run against a real PostgreSQL test instance with `wint.model_affinity` rows inserted as fixtures. No in-memory SQLite for testing the affinity query logic. |
| ADR-006 | E2E Tests Not Required | `frontend_impacted: false` — Playwright E2E does not apply. Unit + integration tests only. |

### Patterns to Follow

- `StructurerConfigSchema` extended with `affinityEnabled: z.boolean().default(true)` and `minAffinityConfidence: z.enum(['none', 'low', 'medium', 'high']).default('low')` — all config fields have defaults, no breaking change
- Affinity profile read wrapped in try/catch: errors produce `logger.warn()` and return `null`; never propagate to graph error state
- Use `extensions.preferredChangePattern` on `ChangeOutlineItem` to carry affinity guidance — do not add a top-level field until APIP-1020 spike confirms the schema
- `createToolNode('structurer', async (state: GraphState, config?) => { const s = state as ElaborationState; const db = config?.configurable?.db; ... })` — DB injected via `config.configurable`, not imported directly
- All affinity-guided logic is additive to the existing heuristic path, not a replacement
- `@repo/logger` structured logging with fields: `storyId`, `affinityEnabled`, `profilesLoaded`, `patternsApplied`, `fallbackUsed`, `durationMs`
- Zod schemas first, all types via `z.infer<>`, no TypeScript interfaces

### Patterns to Avoid

- TypeScript interfaces anywhere in the affinity reader or updated Structurer
- Hardcoding confidence thresholds — use named enum from APIP-3020's `confidenceLevelEnum`
- Making affinity guidance a blocking requirement — always provide fallback to plain heuristic
- Overriding structural analysis (file count, complexity tier) based on affinity — affinity guidance applies to change pattern selection only
- Using a different model identifier format than APIP-0040
- Importing the DB connection directly in the Structurer node — inject via `config.configurable`
- `console.log` — use `@repo/logger` only

---

## Conflict Analysis

### Conflict: Hard dependency on APIP-1010 (not yet merged)
- **Severity**: warning
- **Description**: APIP-3050 modifies the Structurer node built by APIP-1010. As of 2026-02-25, `structurer.ts` does not exist in the codebase — APIP-1010 is In Progress. No implementation work on APIP-3050 can begin until APIP-1010 merges and `structurer.ts`, `StructurerConfigSchema`, `ChangeOutlineItemSchema`, and `createStructurerNode` are all available. The story design and elaboration (this seed and subsequent PM artifacts) can proceed, but the dev subtasks require APIP-1010 as a hard gate.
- **Resolution Hint**: Mark APIP-3050 as `depends_on: [APIP-1010, APIP-3020]` in story.yaml. Do not move to ready-to-work until both are merged. During elaboration, base all schema extension plans on APIP-1010's finalized ACs (which are fully defined in the APIP-1010 story document).

### Conflict: Hard dependency on APIP-3020 (backlog — model_affinity table not built)
- **Severity**: warning
- **Description**: The core feature of APIP-3050 is reading `wint.model_affinity` profiles to inform change pattern selection. This table, its Drizzle schema, and `ModelAffinitySelectSchema` do not exist. APIP-3020 is also in backlog, with its own upstream dependency on APIP-3010 (also backlog). The actual affinity query logic in APIP-3050 cannot be validated until both APIP-3010 and APIP-3020 are complete. APIP-3050 will sit in backlog/ready-to-work for a significant period while the Phase 3 dependency chain unblocks.
- **Resolution Hint**: Design the affinity reader interface against the APIP-3020 story spec (confirmed column names and schema). Write the query as a standalone function that takes an injected `db: Db` — this allows unit testing with mocked DB calls before APIP-3020 completes integration.

### Conflict: Risk of architectural degradation from affinity over-optimization
- **Severity**: warning
- **Description**: The story's own `risk_notes` flag that "over-optimizing for model strengths may produce sub-optimal architectural decompositions." If the Structurer always favors `create-new-file` over `modify-existing` (because cheap models succeed more often on file creation), the codebase could accumulate excessive small components that would be better as modifications to existing files. This is a design quality risk, not an implementation conflict.
- **Resolution Hint**: ACs must encode guard rails: (a) affinity guidance is applied to the `extensions.preferredChangePattern` field only — it does not alter complexity tier, file count, or split threshold; (b) a maximum affinity influence percentage should be configurable (e.g., `maxAffinityWeight: z.number().min(0).max(1).default(0.5)` — only 50% of the pattern decision is affinity-driven, 50% remains structural); (c) the operator can disable affinity guidance entirely via `affinityEnabled: false` in config.

---

## Story Seed

### Title

Story Structurer Feedback (Affinity-Guided)

### Description

After the autonomous pipeline's learning system (Phase 3) begins accumulating per-model affinity profiles in `wint.model_affinity` (APIP-3020), the change pattern preferences encoded in those profiles should feed back into the story structuring stage — before implementation even begins. Currently, the Structurer node (APIP-1010) uses heuristic complexity estimation only: it identifies what changes are needed, but it does not know which models will execute those changes or which change patterns those models handle most reliably.

APIP-3050 extends the Structurer node to read affinity profiles from `wint.model_affinity` and use them to bias the `preferredChangePattern` field in each `ChangeOutlineItem.extensions`. For example: if the affinity data shows that a given model has a 90% success rate on `create-new-file` changes to TypeScript files but only 40% on `modify-complex-existing`, the Structurer should prefer decompositions that favor the former pattern — splitting "modify the UserProfile component to add sub-components" into "create new SubProfileCard component" + "import SubProfileCard into UserProfile" — before the diff planner ever runs.

This is purely an optimization overlay on top of APIP-1010's heuristic path. If affinity data is absent (cold start), unavailable (DB error), or below the minimum confidence threshold, the Structurer falls back to its existing behavior with no user-visible effect. The affinity guidance never overrides the structural analysis: file count, complexity tier, and split threshold decisions remain heuristic-driven. Only `extensions.preferredChangePattern` is affinity-influenced.

The story depends on both APIP-1010 (Structurer node) and APIP-3020 (model affinity profiles table and Pattern Miner). It cannot begin implementation until both are merged.

### Initial Acceptance Criteria

- [ ] **AC-1**: `StructurerConfigSchema` (from APIP-1010) is extended with two new optional fields: `affinityEnabled: z.boolean().default(true)` and `minAffinityConfidence: z.enum(['none', 'low', 'medium', 'high']).default('low')`. No existing callers are affected — both fields have defaults.

- [ ] **AC-2**: A `readAffinityProfiles(changeOutline, db, config)` function (or equivalent) is added to `structurer.ts` (or a new `affinity-reader.ts` helper). Given a `ChangeOutlineItem[]` and an injected `db: Db`, it queries `wint.model_affinity` for each `(model, changeType, fileType)` combination in the outline. It returns a map of `changeOutlineItemId → AffinityGuidance | null`. The function is wrapped in try/catch: on DB error, it logs `logger.warn()` and returns an all-null map (silently falls back).

- [ ] **AC-3**: `AffinityGuidanceSchema` is a new Zod schema with fields: `changeOutlineItemId` (string), `preferredPattern` (enum: `'create-new-file' | 'modify-existing' | 'split-component' | 'no-preference'`), `confidenceLevel` (from APIP-3020's `confidenceLevelEnum`: `'none' | 'low' | 'medium' | 'high'`), `successRate` (number, 0–1), `sampleSize` (integer). All types are `z.infer<typeof AffinityGuidanceSchema>` — no TypeScript interfaces.

- [ ] **AC-4**: When `affinityEnabled === true` and a profile exists with `confidence_level >= minAffinityConfidence`, the Structurer sets `ChangeOutlineItem.extensions.preferredChangePattern` to the affinity-recommended pattern. When no profile exists, or `confidence_level` is below the minimum threshold, `extensions.preferredChangePattern` is omitted (or set to `'no-preference'`).

- [ ] **AC-5**: The affinity-guided path never modifies `complexity`, `estimatedAtomicChanges`, `filePath`, `changeType`, `description`, or `relatedAcIds` on a `ChangeOutlineItem`. Only `extensions.preferredChangePattern` (and optionally `extensions.affinityMeta: { confidenceLevel, successRate, sampleSize }`) is set by affinity guidance. Structural fields remain heuristic-driven.

- [ ] **AC-6**: A configurable `maxAffinityWeight: z.number().min(0).max(1).default(0.5)` parameter in `StructurerConfig` controls how strongly affinity data influences pattern selection. At weight 1.0, affinity fully determines the pattern; at weight 0.0, affinity is ignored (equivalent to `affinityEnabled: false`). This guard rail prevents over-optimization and ensures human-readable structural quality.

- [ ] **AC-7**: When `affinityEnabled === false`, the Structurer behaves identically to the APIP-1010 implementation — no affinity reads, no `extensions.preferredChangePattern` set, no DB access. This is verified by a unit test that asserts no DB call is made when `affinityEnabled: false`.

- [ ] **AC-8**: When `affinityEnabled === true` but the DB is unavailable (connection error, timeout), the Structurer: (a) catches the error, (b) calls `logger.warn({ storyId, error }, 'affinity profile read failed — using plain heuristic')`, (c) completes with `fallbackUsed: true` on `StructurerResult`, (d) produces a `changeOutline` with no `extensions.preferredChangePattern` fields. The elaboration is NOT blocked.

- [ ] **AC-9**: When `affinityEnabled === true` but no affinity rows exist for any `(model, changeType, fileType)` combination in the outline (cold-start state — APIP-3020 not yet populated), the Structurer completes successfully with `fallbackUsed: true`, logs `logger.info({ storyId, reason: 'cold-start — no affinity data' }, 'affinity guidance skipped')`, and returns the outline with no `extensions.preferredChangePattern` fields.

- [ ] **AC-10**: The DB instance is injected into the Structurer node via `config.configurable.db` — not imported directly. Unit tests mock this injection. Integration tests provide a real test DB instance with `wint.model_affinity` fixture rows.

- [ ] **AC-11**: Unit tests cover: (a) affinity-guided pattern selection with mock affinity data producing expected `extensions.preferredChangePattern`; (b) cold-start path (no rows returned → `fallbackUsed: true`, no extensions set); (c) DB error path (thrown → `fallbackUsed: true`, `logger.warn` called); (d) `affinityEnabled: false` (no DB call made); (e) `minAffinityConfidence: 'high'` gate (rows with `'low'` confidence are not applied); (f) `maxAffinityWeight: 0.0` (no patterns applied despite data present).

- [ ] **AC-12**: Integration test (against APIP-5001 test DB with `wint.model_affinity` fixture rows) verifies: inserting profiles for `(model='haiku', change_type='create', file_type='tsx', confidence='high', success_rate=0.92)` results in `ChangeOutlineItem.extensions.preferredChangePattern = 'create-new-file'` for matching TSX create-type items in the outline.

- [ ] **AC-13**: All existing APIP-1010 Structurer tests pass unchanged after APIP-3050 modifications. New fields added to `StructurerConfigSchema` are optional with defaults — no existing test fixtures need updating.

- [ ] **AC-14**: New schemas (`AffinityGuidanceSchema`) and updated `StructurerConfigSchema` are exported from `packages/backend/orchestrator/src/nodes/elaboration/index.ts`. `pnpm check-types --filter packages/backend/orchestrator` passes with zero errors.

### Non-Goals

- Modifying the diff planner (APIP-1030) or any graph downstream of elaboration — APIP-3050 only affects the Structurer node
- Implementing the affinity profile table or Pattern Miner cron — that is APIP-3020
- Implementing the change telemetry writer — that is APIP-3010
- Implementing the Learning-Aware Diff Planner (APIP-3030) or Learning-Aware Model Router (APIP-3040) — those are separate Phase 3 stories
- Automated story splitting based on affinity data — APIP-1010's split-flagging mechanism is unchanged; APIP-3050 only influences change pattern selection within an item
- Any UI / operator dashboard changes — APIP-2020 / APIP-5005
- Writing to `wint.model_affinity` from the Structurer — read-only; writes are APIP-3020's Pattern Miner
- Modifying `packages/backend/database-schema/` directly — no new tables in this story; APIP-3020 owns the `model_affinity` table
- Defining the model identifier convention — that is APIP-0040's domain; APIP-3050 consumes it

### Reuse Plan

- **Components**: None (no UI)
- **Patterns**: Extend `StructurerConfigSchema` with optional sub-fields and defaults; affinity reader as a pure function injectable by tests; `createToolNode` + `config.configurable.db` injection for DB access; `ChangeOutlineItem.extensions` escape hatch for `preferredChangePattern`; `logger.warn` + `fallbackUsed: true` for graceful degradation; Zod-first schemas for `AffinityGuidanceSchema`
- **Packages**: `packages/backend/orchestrator` (Structurer node extension); `packages/backend/database-schema` (read only — `ModelAffinitySelectSchema` from APIP-3020); `@repo/logger` for all logging

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- **No UI impact**: ADR-006 E2E Playwright does not apply. Unit + integration tests only.
- **Three test tiers**:
  - *Unit tests* (Vitest, mocked DB): Test all six AC-11 scenarios. Key cases: `affinityEnabled: false` (no DB call at all), cold-start (empty result), DB error (fallbackUsed + warn called), successful affinity application (extensions.preferredChangePattern set correctly), confidence gate (low-confidence rows not applied when `minAffinityConfidence: 'medium'`), `maxAffinityWeight: 0.0` (no patterns applied).
  - *Integration tests* (Vitest + APIP-5001 test DB): Requires `wint.model_affinity` table from APIP-3020 to be present. Insert fixture rows covering multiple `(model, change_type, file_type)` combinations. Run Structurer with real DB injection. Verify `ChangeOutlineItem.extensions.preferredChangePattern` populated correctly. Verify cold-start behavior when no rows exist.
  - *Regression tests*: Run full `pnpm test --filter packages/backend/orchestrator` to confirm all APIP-1010 Structurer tests still pass.
- **Integration test gate**: Mark integration tests with `@integration` tag or separate Vitest config. They require the APIP-5001 test DB with `wint.model_affinity` populated (APIP-3020 must be complete). Do not block unit tests on this gate.
- **Regression guard (AC-13)**: Mandatory — existing Structurer tests must pass without modification. New config fields are optional with defaults, so no fixture updates should be needed.

### For UI/UX Advisor

- No user-facing impact. APIP-3050 is invisible to end users.
- The `ChangeOutlineItem.extensions.preferredChangePattern` and `extensions.affinityMeta` fields will eventually surface to the operator CLI (APIP-5005) when viewing change outlines. Use human-readable values: `'create-new-file'`, `'modify-existing'`, `'split-component'`, `'no-preference'`.
- Logger output (structured fields: `storyId`, `affinityEnabled`, `profilesLoaded`, `patternsApplied`, `fallbackUsed`) should be consistent and parseable by the minimal operator CLI.

### For Dev Feasibility

- **APIP-1010 and APIP-3020 are hard gates**: Do not attempt implementation subtasks until both stories are merged. The elaboration plan and test plan can be written against the finalized ACs of those stories, but no code can be written.
- **Confirm model identifier format with APIP-0040**: Before writing the affinity query, verify the exact format of model identifier strings used in `wint.model_affinity` (e.g., is it `'claude-haiku-4-5'` or `'haiku'`?). These must match exactly. Document the convention in a code comment.
- **Affinity reader isolation**: Consider placing the `readAffinityProfiles` function in a separate `affinity-reader.ts` file within `packages/backend/orchestrator/src/nodes/elaboration/`. This makes it independently testable and avoids bloating `structurer.ts`. Follow the `delta-detect.ts` file structure.
- **Schema extension pattern for `StructurerConfigSchema`**: Add `affinityConfig` as a nested sub-object with its own schema (following `deltaDetectionConfig` / `escapeHatchConfig` pattern in `ElaborationConfigSchema`). Example:
  ```typescript
  affinityConfig: z.object({
    enabled: z.boolean().default(true),
    minConfidence: z.enum(['none', 'low', 'medium', 'high']).default('low'),
    maxWeight: z.number().min(0).max(1).default(0.5),
  }).default({})
  ```
- **DB injection in Structurer**: The Structurer node is created via `createToolNode('structurer', async (state: GraphState, config?) => { ... })`. DB access is `const db = config?.configurable?.db ?? null`. If `db` is null and `affinityEnabled: true`, log a warn and fall back. This is the same pattern as the metrics graph.
- **Extensions field usage**: APIP-1010 added `extensions: z.record(z.unknown()).optional()` to `ChangeOutlineItemSchema` for this purpose. Use it as:
  ```typescript
  item.extensions = {
    preferredChangePattern: 'create-new-file',
    affinityMeta: { confidenceLevel: 'high', successRate: 0.92, sampleSize: 45 }
  }
  ```
  Do NOT add a top-level `preferredChangePattern` field to `ChangeOutlineItemSchema` — use the extensions escape hatch until the APIP-1020 spike confirms the schema.
- **Affinity query SQL** (based on APIP-3020 schema):
  ```sql
  SELECT model, change_type, file_type, success_rate, confidence_level, sample_size
  FROM wint.model_affinity
  WHERE change_type = $1 AND file_type = $2 AND confidence_level != 'none'
  ORDER BY success_rate DESC
  LIMIT 1
  ```
  Run this once per distinct `(changeType, fileType)` pair in the `changeOutline`, not once per item.
- **Canonical references for subtask decomposition**:
  - Elaboration node file structure: `packages/backend/orchestrator/src/nodes/elaboration/delta-detect.ts`
  - Structurer node to extend (post APIP-1010): `packages/backend/orchestrator/src/nodes/elaboration/structurer.ts`
  - DB injection via config.configurable pattern: `packages/backend/orchestrator/src/graphs/metrics.ts`
  - Affinity table schema (post APIP-3020): `packages/backend/database-schema/src/schema/` (model-affinity.ts)
  - Zod-first type pattern: `packages/backend/orchestrator/src/artifacts/story.ts`
