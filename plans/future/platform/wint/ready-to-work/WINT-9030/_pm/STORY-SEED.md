---
generated: "2026-03-08"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 2
blocking_conflicts: 1
---

# Story Seed: WINT-9030

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Baseline predates WINT-4010 implementation and current UAT state; cohesion sidecar progress not captured

### Relevant Existing Features

| Feature | Location | Notes |
|---------|----------|-------|
| Cohesion Sidecar (WINT-4010) | `packages/backend/sidecars/cohesion/` | Status: failed-code-review (per story context); provides `computeCheck`, `computeAudit` via POST /cohesion/check and /cohesion/audit. Types in `__types__/index.ts`. |
| @repo/workflow-logic (WINT-9010) | `packages/backend/workflow-logic/` | Status: in-qa (near completion). Shared business logic: `isValidStoryId`, `toDbStoryStatus`, `getValidTransitions`, `getStatusFromDirectory`. |
| LangGraph doc-sync node (WINT-9020) | `packages/backend/orchestrator/src/nodes/sync/doc-sync.ts` | Status: UAT. Canonical reference for native LangGraph node porting pattern — 7-phase sequential architecture, `createToolNode`, `updateState`, injectable deps. |
| LangGraph story nodes | `packages/backend/orchestrator/src/nodes/story/` | Existing: `attack.ts`, `fanout-pm.ts`, `fanout-qa.ts`, `fanout-ux.ts`, `gap-hygiene.ts`, `readiness-score.ts`, `seed.ts`, `synthesize.ts`. Target directory for this story. |
| Orchestrator node factory | `packages/backend/orchestrator/src/runner/node-factory.ts` | `createNode`, `createToolNode`, `createLLMNode`, `createSimpleNode`, `createLLMPoweredNode` — fully established. |
| Orchestrator GraphState | `packages/backend/orchestrator/src/state/index.ts` | Canonical state type for all nodes. |
| Graph schema (WINT-0020) | Drizzle `features`, `capabilities` tables in graph schema | Underlying data store queried by cohesion sidecar. |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|-------------|
| WINT-9010 | in-qa | DIRECT DEPENDENCY — exports `@repo/workflow-logic` consumed by orchestrator nodes (e.g., `isValidStoryId` already used in doc-sync node). Story must resolve before WINT-9030 can finalize imports. |
| WINT-4010 | failed-code-review | DIRECT DEPENDENCY — the cohesion sidecar whose compute functions this story must wrap or replicate. Failed code review state means implementation may change before stabilizing. |

### Constraints to Respect

- `packages/backend/database-schema/` and graph schema tables (`features`, `capabilities`) are protected — do not modify schemas.
- Orchestrator artifact schemas are protected — do not modify.
- `@repo/db` client API surface is protected.
- The cohesion node must not reinvent the DB query logic; it must delegate to or import from the cohesion sidecar's compute functions (`computeCheck`, `computeAudit`) or replicate the same Drizzle query patterns against the same tables.

---

## Retrieved Context

### Related Endpoints
- `POST /cohesion/audit` — provided by `packages/backend/sidecars/cohesion/src/routes/` via `computeAudit`
- `POST /cohesion/check` — provided by `packages/backend/sidecars/cohesion/src/routes/` via `computeCheck`

### Related Components

| Component | Path | Relevance |
|-----------|------|-----------|
| `computeCheck` | `packages/backend/sidecars/cohesion/src/compute-check.ts` | Core logic for per-feature cohesion check — queries `capabilities` table via Drizzle, injectable `db`, returns `CohesionCheckResult`. |
| `computeAudit` | `packages/backend/sidecars/cohesion/src/compute-audit.ts` | Core logic for full audit — leftJoin `features` + `capabilities`, returns `CohesionAuditResult` with franken-features + coverage summary. |
| `__types__/index.ts` | `packages/backend/sidecars/cohesion/src/__types__/index.ts` | All Zod schemas: `CohesionCheckResultSchema`, `CohesionAuditResultSchema`, `CohesionCheckRequestSchema`, `CapabilityCoverageSchema`, etc. |
| `doc-sync.ts` | `packages/backend/orchestrator/src/nodes/sync/doc-sync.ts` | Canonical porting reference — native TypeScript node, `createToolNode`, `updateState`, injectable config, `GraphStateWithDocSync` extension pattern. |
| `attack.ts` | `packages/backend/orchestrator/src/nodes/story/attack.ts` | Sibling node in the `nodes/story/` target directory — shows correct import paths, Zod schema convention, node factory usage. |

### Reuse Candidates

- `createToolNode` from `packages/backend/orchestrator/src/runner/node-factory.ts` — correct preset for DB/sidecar-call operations (2 retries, 10s timeout)
- `updateState` from `packages/backend/orchestrator/src/runner/state-helpers.ts` — canonical state update helper used in doc-sync
- `computeCheck` and `computeAudit` from `packages/backend/sidecars/cohesion/src/` — inject or import directly to avoid duplicating DB query logic
- Zod schemas from `packages/backend/sidecars/cohesion/src/__types__/index.ts` — reuse `CohesionCheckResultSchema`, `CohesionAuditResultSchema`, `CohesionStatusSchema`
- `@repo/workflow-logic` (WINT-9010) — for any story ID validation needed
- `GraphState` type from `packages/backend/orchestrator/src/state/index.ts`

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| LangGraph node porting (native TypeScript, tool preset) | `packages/backend/orchestrator/src/nodes/sync/doc-sync.ts` | Gold standard for porting an agent to a LangGraph node: `createToolNode`, injectable config, `GraphStateWith*` Zod extension schema, sequential phase structure, graceful error handling. |
| Sibling story node structure | `packages/backend/orchestrator/src/nodes/story/attack.ts` | Correct import paths for the `nodes/story/` directory, Zod schema naming, `createToolNode` usage pattern within the target directory. |
| Cohesion compute logic (injectable db) | `packages/backend/sidecars/cohesion/src/compute-check.ts` | Canonical DB query pattern for per-feature check — injectable `DrizzleDb`, Drizzle `eq()` filter, `CohesionCheckResult` return shape. Replicate or import. |
| Cohesion Zod types | `packages/backend/sidecars/cohesion/src/__types__/index.ts` | Source of truth for all cohesion Zod schemas — import these rather than redeclaring to avoid type drift. |

---

## Knowledge Context

### Lessons Learned

- **[WINT-9020]** Native 7-phase LangGraph node implementation proves viable for subprocess-delegating agents (*category: architecture*)
  - *Applies because*: WINT-9030 similarly ports an agent (cohesion-prosecutor) to a native TypeScript LangGraph node. The sequential phase approach and injectable deps pattern from WINT-9020 is the template.

- **[WINT-9090]** TypeScript interfaces in LangGraph node files must be converted to Zod schemas before code review (*category: other*)
  - *Applies because*: State extension type `GraphStateWithCohesionCheck` must be a `z.object()` with `z.infer<>` — never a TypeScript `interface`. This caused a fix cycle in WINT-9090.

- **[APIP-3030]** LangGraph node handler index.ts files are not unit-testable in isolation (*category: testing*)
  - *Applies because*: The `cohesion-check.ts` node handler (using `createToolNode`) cannot be unit-tested directly. Tests must target the inner compute functions instead. Use integration tests for the assembled node.

- **[WINT-4010 + sidecar lessons]** Shared sidecar utility extraction is effective for code reuse (*category: architecture*)
  - *Applies because*: The cohesion sidecar's `computeCheck`/`computeAudit` functions are already extracted with injectable `db`. The LangGraph node should import these directly rather than re-implementing the DB query logic.

- **[AUDT-0010]** LangGraph external context handling — external context like repoRoot or DB should be added to state at invocation time, not passed through graph state mid-flight (*category: architecture*)
  - *Applies because*: The cohesion node needs a DB client. This should be injected via config (the established `DrizzleDb` injectable pattern from compute-check.ts) rather than threaded through graph state.

- **[WINT-2120 / various]** Single cast point pattern — use `toStateUpdate` or `updateState` helper for the single point where node return values are cast to `Partial<GraphState>` (*category: architecture*)
  - *Applies because*: The cohesion node's return path must use `updateState` consistently rather than inline casts.

### Blockers to Avoid (from past stories)

- Do not re-implement Drizzle queries for `features`/`capabilities` — import `computeCheck`/`computeAudit` from the cohesion sidecar or copy with the same injectable DB pattern.
- Do not declare `GraphStateWithCohesionCheck` as a TypeScript `interface` — use `z.object()` + `z.infer<>`.
- Do not attempt to unit-test the node handler factory wrapper directly — target inner functions.
- Do not import from `@repo/workflow-logic` until WINT-9010 is out of qa and confirmed stable.
- Do not assume WINT-4010 (failed-code-review) has a stable public API — check whether its compute functions are importable from their current package boundary before finalizing the import strategy.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-001 | API Path Schema | Not directly applicable — this is a backend-only LangGraph node, no HTTP endpoint exposed. |
| ADR-005 | Testing Strategy | UAT must use real services, not mocks. Unit tests use injectable mocks for DB. Integration tests should run against live graph schema. |

### Patterns to Follow

- `createToolNode` preset (not `createLLMNode`) — cohesion check is a DB query, not an LLM call
- Zod-first types — all state extension schemas via `z.object()` + `z.infer<>`
- Injectable `db` parameter in inner compute functions — do not import `@repo/db` globally in the node
- `updateState` for return values
- Sequential named phases with `logger.info` at each phase boundary (WINT-9020 pattern)
- Tests in `__tests__/cohesion-check.test.ts` alongside the node file

### Patterns to Avoid

- TypeScript `interface` for `GraphStateWithCohesionCheck` (code review blocker)
- Barrel files (no `index.ts` re-exports)
- `console.log` — use `@repo/logger`
- Global DB import — db must be injectable for testability
- Duplicating Drizzle query logic that already exists in `compute-check.ts` / `compute-audit.ts`

---

## Conflict Analysis

### Conflict: Blocking Dependency — WINT-4010 in failed-code-review

- **Severity**: blocking
- **Description**: WINT-4010 (Create Cohesion Sidecar) is in `failed-code-review` state. The cohesion-prosecutor LangGraph node (WINT-9030) must consume the sidecar's compute functions (`computeCheck`, `computeAudit`) or at minimum replicate the same DB query contract. If WINT-4010's code review failures result in API changes to `computeCheck`/`computeAudit` or their type signatures, WINT-9030's implementation must track those changes.
- **Resolution Hint**: Do not start WINT-9030 implementation until WINT-4010 passes code review and has a stable package boundary. Alternatively, scope WINT-9030 to self-contain the compute logic (copy pattern from sidecar) and accept a future deduplication task once WINT-4010 stabilizes. Mark the story with a dependency gate on WINT-4010 reaching at least `needs-code-review` → `ready-for-qa`.

### Conflict: Warning — WINT-9010 in-qa (workflow-logic not yet stable)

- **Severity**: warning
- **Description**: WINT-9010 (`@repo/workflow-logic`) is in `in-qa`. The doc-sync node already imports `isValidStoryId` from `@repo/workflow-logic`. If WINT-9030 needs any shared workflow validation functions, it must wait for WINT-9010 to complete QA and publish a stable API.
- **Resolution Hint**: Audit WINT-9030's implementation plan — if the cohesion node only needs cohesion-specific logic (no story ID validation or status transitions), the WINT-9010 dependency may be satisfied at the package-boundary level (the package exists) rather than requiring new exports. Confirm with WINT-9010's in-qa scope before adding imports.

---

## Story Seed

### Title

Create cohesion-prosecutor LangGraph Node (`nodes/story/cohesion-check.ts`)

### Description

The cohesion-prosecutor is a Product Owner agent that enforces feature completeness by ensuring every feature in the capability graph has all required CRUD lifecycle stages before being marked done. It currently exists as a pending agent-file story (WINT-4070). In the LangGraph parity phase (Phase 9), we need to port its core business logic to a native TypeScript LangGraph node so that feature cohesion checks operate identically in both the Claude Code agent workflow and the LangGraph orchestration workflow.

The node at `packages/backend/orchestrator/src/nodes/story/cohesion-check.ts` wraps the cohesion sidecar's compute logic (`computeCheck` for per-feature checks, `computeAudit` for full graph audits) as an injectable, testable LangGraph node. It follows the doc-sync node's established native porting pattern: sequential named phases, `createToolNode` preset, `updateState` for state returns, and Zod-first state extension types.

The critical risk is that WINT-4010 (the sidecar providing the compute functions) is currently in failed-code-review. The implementation plan must account for either: (a) gating on WINT-4010's stabilization, or (b) self-containing the compute logic with a clear deduplication path once WINT-4010 is stable.

### Initial Acceptance Criteria

- [ ] AC-1: Node file exists at `packages/backend/orchestrator/src/nodes/story/cohesion-check.ts` and exports a `cohesionCheckNode` (default config) and `createCohesionCheckNode(config)` factory function
- [ ] AC-2: Node accepts a `featureId` from graph state (or config) and calls the cohesion check compute logic, returning `CohesionCheckResult` merged into graph state
- [ ] AC-3: Node accepts an optional `packageName` filter for full-audit mode, calling compute audit logic and returning `CohesionAuditResult` merged into graph state
- [ ] AC-4: The state extension type `GraphStateWithCohesionCheck` is defined as a `z.object()` schema with `z.infer<>` (no TypeScript `interface` keyword)
- [ ] AC-5: The node uses `createToolNode` preset (2 retries, 10s timeout) — cohesion check is a DB query, not an LLM call
- [ ] AC-6: DB client is injectable (not imported globally) — inner compute functions accept `db: DrizzleDb` parameter
- [ ] AC-7: `unknown` feature ID (no capabilities rows) returns `{ status: 'unknown', violations: [], capabilityCoverage: {} }` gracefully (same contract as sidecar AC-8)
- [ ] AC-8: Node returns `{ status: 'complete', violations: [], capabilityCoverage: { create: true, read: true, update: true, delete: true } }` for a fully-covered feature
- [ ] AC-9: Node returns `{ status: 'incomplete', violations: ['missing X capability'], capabilityCoverage: {...} }` for a partially-covered feature
- [ ] AC-10: Unit tests exist at `packages/backend/orchestrator/src/nodes/story/__tests__/cohesion-check.test.ts` targeting the inner compute functions (not the node handler wrapper)
- [ ] AC-11: Coverage meets or exceeds 45% global threshold for the orchestrator package after this story
- [ ] AC-12: `index.ts` at `packages/backend/orchestrator/src/nodes/story/index.ts` is updated to export the new node (if a barrel export pattern exists in that directory — confirm first; if no index.ts, do not create one)
- [ ] AC-13: No TypeScript compilation errors; no ESLint errors on new/changed files
- [ ] AC-14: Graph queries produce identical results whether invoked via the cohesion sidecar HTTP API or directly via the LangGraph node (parity requirement)

### Non-Goals

- Do NOT create the cohesion-prosecutor agent file (`.claude/agents/cohesion-prosecutor.agent.md`) — that is WINT-4070's scope
- Do NOT modify the cohesion sidecar (`packages/backend/sidecars/cohesion/`) — consume it, do not modify it
- Do NOT modify database schemas in `packages/backend/database-schema/`
- Do NOT expose an HTTP endpoint — the node is a pure LangGraph node, not a sidecar
- Do NOT integrate the node into workflow graphs (WINT-9060 handles batch-coordinator graph integration)
- Do NOT add authentication or authorization — auth is deferred at the sidecar level and the same deferral applies here
- Do NOT implement the full cohesion-prosecutor agent behavior (PM role reasoning, blocking/warning thresholds, filing backlog items) — only the DB-query compute layer that feeds such reasoning

### Reuse Plan

- **Components**: `computeCheck` and `computeAudit` from `packages/backend/sidecars/cohesion/src/` (import or copy with same injectable DB pattern, pending WINT-4010 stabilization)
- **Patterns**: `createToolNode` factory, `updateState`, sequential named phases with logger boundary calls — from `nodes/sync/doc-sync.ts`
- **Packages**: `@repo/logger`, `@repo/workflow-logic` (for `isValidStoryId` if needed), `@repo/database-schema` (for `features`, `capabilities` Drizzle schemas), Zod schemas from `packages/backend/sidecars/cohesion/src/__types__/index.ts`

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- Unit tests must target inner compute functions (injectable `db` mock), NOT the `createToolNode` wrapper — see APIP-3030 lesson.
- Two modes need testing: per-feature `featureId` check and full-graph `packageName` audit.
- Edge cases: empty graph (no features), `unknown` feature ID (no capabilities rows), all-CRUD-complete feature, feature with only create+read capabilities.
- Integration tests (if written) should run against live graph schema with `fileParallelism: false` and `singleThread: true` — same pattern as rules-registry sidecar.
- Parity test: same featureId input to node compute function and to sidecar's `POST /cohesion/check` must produce identical output.

### For UI/UX Advisor

- This is a pure backend LangGraph node with no UI surface. No UI/UX recommendations applicable.

### For Dev Feasibility

- **Critical gate**: WINT-4010 must reach at least `ready-for-qa` (stable API) before finalizing the import strategy. Two options:
  1. Import `computeCheck`/`computeAudit` directly from `packages/backend/sidecars/cohesion/src/` (cross-package import within monorepo — check if cohesion sidecar package.json exports allow this, or if it needs to expose a library entry point).
  2. Self-contain the compute logic by copying the Drizzle query pattern from `compute-check.ts` and `compute-audit.ts` into the node, with a `// TODO: deduplicate with WINT-4010 once stable` comment.
- **WINT-9010 gate**: Confirm whether `@repo/workflow-logic` is needed for any imports. If cohesion node only calls `computeCheck`/`computeAudit` with Drizzle, it may not need workflow-logic at all — reducing risk from WINT-9010 in-qa state.
- **State extension schema**: Define `GraphStateWithCohesionCheckSchema = z.object({ cohesionCheck: CohesionCheckResultSchema.optional(), cohesionAudit: CohesionAuditResultSchema.optional() })` extending `GraphStateSchema`. Confirm the established extension pattern from `doc-sync.ts` (`GraphStateWithDocSync` extending `GraphState`).
- **Canonical references for subtask decomposition**:
  - ST-1: Define `GraphStateWithCohesionCheck` Zod schema and `CohesionCheckConfig` schema
  - ST-2: Implement `cohesionCheckImpl()` inner function with injectable `db` (two modes: check + audit)
  - ST-3: Export `cohesionCheckNode` via `createToolNode` and `createCohesionCheckNode(config)` factory
  - ST-4: Write unit tests targeting `cohesionCheckImpl()` with mock db
  - ST-5: Verify parity between node output and sidecar HTTP response for same inputs
