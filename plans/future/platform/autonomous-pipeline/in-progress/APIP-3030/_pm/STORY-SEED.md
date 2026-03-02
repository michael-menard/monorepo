---
generated: "2026-02-25"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: true
conflicts_found: 2
blocking_conflicts: 0
---

# Story Seed: APIP-3030

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps:
  - Knowledge base unavailable during seed generation (KB search returned internal error); lessons_loaded = false
  - No active in-progress stories for the platform epic at baseline date — dependency stories (APIP-3020, APIP-1020) are still in backlog

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| Orchestrator artifact schemas (Zod-validated) | `packages/backend/orchestrator/src/artifacts/` | ChangeSpec schema (APIP-1020 output) will be co-located here; Diff Planner node reads it |
| YAML artifact persistence | `packages/backend/orchestrator/src/persistence/yaml-artifact-bridge.ts` | Pattern for reading/writing profile data and decomposition artifacts |
| Model leaderboard (per-task quality/cost tracking) | `packages/backend/orchestrator/src/model-selector/leaderboard.ts` | Closest existing analog to model affinity — uses `task_id`/`model` keyed entries with `avg_quality`, `convergence_status`, `quality_trend` |
| Plan schema with `z.literal(1)` versioning | `packages/backend/orchestrator/src/artifacts/plan.ts` | Schema versioning pattern the Diff Planner node's output must follow |
| Elaboration delta detection node | `packages/backend/orchestrator/src/nodes/elaboration/delta-detect.ts` | LangGraph node structure pattern (`createToolNode`, `updateState`, typed state extension) |
| `z.discriminatedUnion` pattern | `packages/backend/orchestrator/src/nodes/story/fanout-ux.ts` (line 134) | Change type variant dispatching in the planner prompt |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|--------------|
| APIP-1010 | In Progress | Defines `ChangeOutlineItem` format consumed by APIP-1020, which feeds APIP-3030 |
| APIP-1070 | In Elaboration | Merge graph — downstream of APIP-3030; no overlap |
| APIP-5005 | In Elaboration | Operator CLI — no overlap |
| APIP-2020 | In Elaboration | Monitor UI — no overlap |

### Constraints to Respect

- APIP-3030 is Phase 3 — all Phase 0 and Phase 1 foundation stories (including APIP-1020 and APIP-3020) must complete first
- No Lambda, no AWS service changes — pipeline runs locally on Docker (ADR-002 pattern)
- Protected: all production DB schemas in `packages/backend/database-schema/`; `@repo/db` API surface; orchestrator artifact schemas
- ChangeSpec schema (ADR-002 output from APIP-1020) must be stable before Diff Planner node integration is written
- Model affinity table (`wint.model_affinity`) must exist and be populated (APIP-3020 output) before this node can query it at runtime

---

## Retrieved Context

### Related Endpoints

None. APIP-3030 is a pipeline-internal node with no HTTP endpoints. All data access is via internal DB queries against `wint.model_affinity` (Aurora PostgreSQL, local Docker).

### Related Components

| Component | Path | Relevance |
|-----------|------|-----------|
| Diff Planner node (to-be-created) | `packages/backend/orchestrator/src/nodes/` | Primary deliverable — new LangGraph node |
| Model leaderboard | `packages/backend/orchestrator/src/model-selector/leaderboard.ts` | Closest analog: per-(task, model) scoring; affinity profile lookup will follow similar pattern |
| Delta detection node | `packages/backend/orchestrator/src/nodes/elaboration/delta-detect.ts` | LangGraph node implementation pattern to follow |
| YAML artifact bridge | `packages/backend/orchestrator/src/persistence/yaml-artifact-bridge.ts` | Reading/writing YAML artifacts (ChangeSpec decompositions) |
| Plan artifact schema | `packages/backend/orchestrator/src/artifacts/plan.ts` | Schema versioning and `FileChangeSchema` field patterns |

### Reuse Candidates

- **`createToolNode` + `updateState`** from `packages/backend/orchestrator/src/runner/` — standard LangGraph node scaffolding
- **`LeaderboardSchema` / `LeaderboardEntry`** types from `packages/backend/orchestrator/src/model-selector/__types__/index.ts` — conceptual model for affinity entry shape (not imported directly; affinity schema comes from APIP-3020)
- **`z.discriminatedUnion('change_type', [...])`** from fanout-ux.ts — dispatch pattern for change_type variants in decomposition prompt logic
- **`yaml-artifact-bridge.ts`** — for persisting decomposition outputs if Diff Planner node writes intermediate artifacts
- **`@repo/db`** client — for querying `wint.model_affinity` at planning time

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| LangGraph node implementation (createToolNode, updateState, typed state extension) | `packages/backend/orchestrator/src/nodes/elaboration/delta-detect.ts` | Complete LangGraph node pattern: Zod schemas for result, typed state extension, createToolNode wrapper, async handler, graceful error fallback |
| Per-(task, model) scoring data with convergence/trend tracking | `packages/backend/orchestrator/src/model-selector/leaderboard.ts` | Closest existing analog to affinity profiles: YAML-persisted, Zod-validated, keyed by (task_id, model), with quality + trend fields — informs how to structure affinity lookups |
| `z.discriminatedUnion` on typed variant field | `packages/backend/orchestrator/src/nodes/story/fanout-ux.ts` (line 134) | Exact pattern for dispatching on `change_type` variants in the diff planner prompt generation logic |
| Zod schema with `z.literal(1)` versioning | `packages/backend/orchestrator/src/artifacts/plan.ts` | `PlanSchema` versioning pattern — Diff Planner node output schema must follow same convention |

---

## Knowledge Context

### Lessons Learned

Knowledge base was unavailable during seed generation (internal error). No lessons were retrieved. The following inferences are drawn from codebase inspection and story context:

- **Profile freshness**: The model affinity table is populated by a daily cron (APIP-3020). The Diff Planner node must tolerate missing/stale profiles gracefully — fall back to change_type-agnostic decomposition when no profile exists for a (model, change_type) pair.
- **Prompt complexity creep**: Adding affinity-aware instructions to the decomposition prompt increases token cost and risk of instruction-following degradation. Constraints on profile injection volume (e.g., top-N patterns only) should be enforced.
- **RISK-001 and RISK-002 both implicate this story**: Cheap models executing poor decompositions (RISK-001) and the Diff Planner producing poor ChangeSpecs (RISK-002) are the primary risks. The affinity-aware decomposition is specifically intended to mitigate RISK-001 by avoiding change types the assigned model handles poorly.

### Blockers to Avoid (from past stories)

- Do not write Diff Planner node integration code before ADR-002 (ChangeSpec schema) is published — APIP-1020 non-goal explicitly prohibits this; integration before schema stability causes cascading schema-breaking rework
- Do not hardcode model names or change_type logic — all routing decisions must flow through the affinity profile query so they stay data-driven
- Do not make affinity profile DB queries synchronous-blocking on the critical path — profile lookup failures must not halt the planning step; fallback to default decomposition

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-001 | API Endpoint Path Schema | Not directly applicable — no HTTP endpoints |
| ADR-002 | Infrastructure-as-Code Strategy | All pipeline components run locally on Docker; no Lambda or AWS service changes |
| ADR-005 | Testing Strategy - UAT Must Use Real Services | Unit + integration tests for the node; no mocking in UAT |
| ADR-006 | E2E Tests Required in Dev Phase | No UI impact; E2E skip condition applies (`frontend_impacted: false`) |

### Patterns to Follow

- Zod-first types — no TypeScript interfaces; all schemas use `z.object` with `z.infer<>`
- `createToolNode` wrapper for LangGraph node registration
- Graceful degradation: node must return a valid (possibly degraded) result even if affinity lookup fails
- Atomic YAML writes via `yaml-artifact-bridge.ts` if the node persists intermediate artifacts
- `@repo/logger` for all logging; no `console.log`
- No barrel files — import directly from source

### Patterns to Avoid

- Do not import affinity schema directly from APIP-3020 artifacts until that story is complete; use placeholder type during development
- Do not add the affinity profile injection unconditionally to every prompt invocation — add a `profile_confidence` gate (only inject when confidence threshold met)
- Do not assume `change_type` covers all decomposition axes — the schema has 4 variants (`file_change`, `migration_change`, `config_change`, `test_change`) and the planner must handle each distinctly

---

## Conflict Analysis

### Conflict: Upstream dependency not yet started (APIP-1020)
- **Severity**: warning (non-blocking at seed stage; blocks implementation)
- **Description**: APIP-1020 (ChangeSpec Schema Design and Validation Spike) is in backlog status. The Diff Planner node's core deliverable is an updated decomposition prompt that produces ChangeSpec-typed outputs and applies affinity-guided routing. Without a stable ADR-002 (APIP-1020 output), the integration code cannot be written safely.
- **Resolution Hint**: APIP-3030 elaboration and planning can proceed in parallel with APIP-1020 execution, but implementation must be gated on ADR-002 publication. The ELAB artifact should document this explicit gate.

### Conflict: Upstream dependency not yet started (APIP-3020)
- **Severity**: warning (non-blocking at seed stage; blocks runtime behavior)
- **Description**: APIP-3020 (Model Affinity Profiles Table and Pattern Miner Cron) is in backlog status. The `wint.model_affinity` table and Pattern Miner cron must exist and have accumulated data before the learning-aware planner can produce non-trivial routing decisions. Cold-start behavior (no profiles on day 1) must be explicitly handled.
- **Resolution Hint**: Implement the node with a cold-start fallback path that behaves identically to the pre-APIP-3030 diff planner when no affinity profiles exist. Document the cold-start threshold (minimum confidence or run count) in the node's config schema.

---

## Story Seed

### Title

Learning-Aware Diff Planner

### Description

**Context**: The autonomous pipeline's Diff Planner node (introduced in APIP-1030) decomposes a story's change outline into a list of ChangeSpecs — atomic, typed change contracts consumed by the implementation loop, review graph, QA graph, and other downstream systems. As of Phase 1, this decomposition is model-agnostic: the planner does not consider which model will execute the changes or whether that model is known to struggle with particular change patterns.

Phase 3 introduces a learning system: the change telemetry table (APIP-3010) records every model-executed change attempt with outcome, and the Pattern Miner cron (APIP-3020) aggregates this data into per-(model, change_type, file_type) affinity profiles stored in `wint.model_affinity`. Each profile carries a `success_rate`, `avg_attempts`, `avg_tokens`, and a `confidence` level.

**Problem**: Without awareness of model affinity profiles, the Diff Planner may decompose a story in ways that assign weak change types to cheap models — leading to escalation, retry loops, and elevated token costs. RISK-001 (cheap models producing incorrect code that passes micro-verify but fails QA) and RISK-002 (Diff Planner producing poor ChangeSpec decompositions) both implicate this node.

**Proposed Solution**: Update the Diff Planner node to:
1. Query `wint.model_affinity` for the assigned model's strength/weakness profile at planning time
2. Inject a concise affinity summary into the decomposition prompt — biasing decomposition toward change types the model handles reliably and away from known weaknesses
3. When a change must use a weak pattern (unavoidable), pre-assign the escalation model to that specific ChangeSpec rather than discovering the need for escalation at execution time
4. Fall back to the existing model-agnostic decomposition when no profile exists (cold-start) or when profile confidence is below a configurable threshold

The result is a planner that produces decompositions informed by observed telemetry, reducing escalation rate and improving first-attempt success for cheap models.

### Initial Acceptance Criteria

- [ ] **AC-1**: The Diff Planner node queries `wint.model_affinity` for the assigned model before generating the decomposition prompt. The query is keyed by `(model_id, change_type, file_type)` and retrieves `success_rate`, `avg_attempts`, `confidence`, and any recorded weak patterns.

- [ ] **AC-2**: When profile confidence meets or exceeds a configurable threshold (`AFFINITY_CONFIDENCE_MIN`, default `medium`), the decomposition prompt includes a concise affinity summary: listed weak change_type/file_type combinations the planner should minimize, and strong combinations it should prefer when there is decomposition latitude.

- [ ] **AC-3**: When a ChangeSpec must use a change_type/file_type the assigned model is known to handle poorly (success_rate below configurable `WEAKNESS_THRESHOLD`), the ChangeSpec is annotated with `escalation_model: <model_id>` rather than leaving escalation to be discovered at execution time.

- [ ] **AC-4**: When no affinity profile exists for the assigned model (cold-start) or profile confidence is below threshold, the node falls back to the existing model-agnostic decomposition without error. A `profile_used: false` field is set on the decomposition metadata.

- [ ] **AC-5**: The affinity query is non-blocking: if the DB query fails (connection error, timeout), the node logs a warning via `@repo/logger` and falls back to model-agnostic decomposition. The planning step does not fail due to affinity lookup errors.

- [ ] **AC-6**: The Diff Planner node output schema is Zod-validated and includes a `profile_metadata` field recording: `profile_used` (boolean), `model_id` (string), `confidence_level` (enum), `weak_patterns_injected` (number), `escalation_preassigned` (number). This field is optional/defaulted to allow the existing code path to remain valid.

- [ ] **AC-7**: Unit tests cover: (a) decomposition with a populated affinity profile (happy path), (b) cold-start fallback (no profile), (c) DB error fallback, (d) weak pattern pre-assignment, (e) profile confidence gate rejection. All tests pass via `pnpm test --filter @repo/orchestrator -- diff-planner`.

- [ ] **AC-8**: The node does not modify `wint.model_affinity` — it is read-only from this node. All writes to affinity data remain exclusively in the Pattern Miner cron (APIP-3020 scope).

### Non-Goals

- Writing the Pattern Miner cron or modifying the `wint.model_affinity` schema (APIP-3020 scope)
- Defining or modifying the ChangeSpec schema (APIP-1020 scope)
- Updating the model router's runtime routing decisions (APIP-3040 scope)
- Building any UI or dashboard for affinity profiles (APIP-2020 scope)
- Implementing the change telemetry instrumentation (APIP-3010 scope)
- Modifying production database schemas in `packages/backend/database-schema/`
- Building the bake-off engine for model experiments (APIP-3060 scope)
- Making any Lambda, APIGW, or AWS service changes
- Providing operator visibility for affinity-guided planning decisions (APIP-5005 scope)

### Reuse Plan

- **Node scaffolding**: `createToolNode` + `updateState` from `packages/backend/orchestrator/src/runner/` — exact pattern from `delta-detect.ts`
- **DB client**: `@repo/db` for Aurora PostgreSQL queries against `wint.model_affinity`
- **Schema versioning**: `z.literal(1)` pattern from `packages/backend/orchestrator/src/artifacts/plan.ts`
- **Discriminated union dispatch**: `z.discriminatedUnion('change_type', [...])` from `fanout-ux.ts` (line 134) — for change_type-specific prompt injection logic
- **YAML artifact persistence**: `packages/backend/orchestrator/src/persistence/yaml-artifact-bridge.ts` — if decomposition metadata is persisted as YAML artifacts
- **Leaderboard types as conceptual model**: `packages/backend/orchestrator/src/model-selector/leaderboard.ts` — `LeaderboardEntry` fields (`avg_quality`, `convergence_status`, `quality_trend`) mirror the conceptual structure of affinity profile entries; do not import directly but use as reference for schema design
- **Logging**: `@repo/logger` for all structured logging; no `console.log`

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- This story has no HTTP endpoints and no UI impact — ADR-006 E2E skip condition applies (`frontend_impacted: false`). Testing scope is unit + integration only.
- The five test cases in AC-7 are the minimum required; the test plan should additionally include: (f) prompt injection volume gate (verify affinity summary is truncated when > N weak patterns), (g) escalation pre-assignment for mixed-strength decompositions, (h) schema regression against ChangeSpec variants.
- Profile confidence gate logic (AC-2) should be tested with all three confidence levels (`low`, `medium`, `high`) to verify threshold behavior.
- DB error fallback (AC-5) should be tested with a mocked `@repo/db` that throws on query — verify the node returns a valid decomposition result, not an error.
- Key risk: if APIP-1020's ChangeSpec schema has not finalized by the time test cases are written, tests may need placeholder ChangeSpec fixtures. Note this dependency explicitly.

### For UI/UX Advisor

- No UI surface. APIP-3030 is a pipeline-internal node.
- The operator visibility story (APIP-5005) is the appropriate place to surface affinity-guided planning decisions to users. If that story is in elaboration, flag the `profile_metadata` field in AC-6 as the data source for future operator visibility.
- The Monitor UI (APIP-2020) may eventually want to display escalation pre-assignment rates — the `escalation_preassigned` count in AC-6 provides this signal. No action required in this story.

### For Dev Feasibility

- **Primary risk**: ChangeSpec schema (APIP-1020 ADR-002) must be stable before the Diff Planner's output schema can be finalized. Recommend implementing the node with a documented placeholder ChangeSpec type (mirroring the APIP-1020 placeholder pattern) and flagging re-validation as a required step before merge.
- **Secondary risk**: `wint.model_affinity` schema from APIP-3020 is not yet defined. The affinity query in AC-1 must match actual column names. Recommend reviewing APIP-3020's story.yaml and infrastructure notes to confirm expected schema shape before writing the DB query.
- **Profile freshness lag**: Profiles are updated daily by the Pattern Miner cron. The Diff Planner node queries the current state — there is an inherent lag of up to 24 hours. This is acceptable and documented in the story's `risk_notes`. No mitigation needed beyond documentation.
- **Token cost impact**: Injecting affinity profile summaries into the decomposition prompt will increase token cost per planning invocation. Recommend implementing a `MAX_WEAK_PATTERNS_INJECTED` cap (e.g., 5) to prevent unbounded prompt growth. This cap should be configurable and tested in the test plan.
- **Canonical references for subtask decomposition**:
  1. `packages/backend/orchestrator/src/nodes/elaboration/delta-detect.ts` — LangGraph node scaffold (ST-1: node skeleton + config schema)
  2. `packages/backend/orchestrator/src/model-selector/leaderboard.ts` — DB query + Zod parse pattern for affinity data (ST-2: affinity profile query)
  3. `packages/backend/orchestrator/src/artifacts/plan.ts` — Output schema versioning (ST-3: output schema with `profile_metadata`)
  4. `packages/backend/orchestrator/src/nodes/story/fanout-ux.ts` — Discriminated union dispatch (ST-4: prompt injection logic per change_type)
