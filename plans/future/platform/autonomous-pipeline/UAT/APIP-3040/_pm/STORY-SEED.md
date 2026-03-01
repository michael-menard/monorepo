---
generated: "2026-02-25"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: true
conflicts_found: 3
blocking_conflicts: 0
---

# Story Seed: APIP-3040

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Neither `wint.model_affinity` (from APIP-3020) nor the `PipelineModelRouter` learning extension exists in the codebase. APIP-0040 (`PipelineModelRouter` v1) is at `needs-code-review` status — its implementation lives in `packages/backend/orchestrator/src/pipeline/` but has not yet merged. APIP-3020 (model affinity table + Pattern Miner cron) is in backlog with no implementation yet. APIP-3010 (change telemetry table) is also in backlog. KB search was unavailable during seed generation — lessons are inferred from codebase patterns and ADR documents.

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| `PipelineModelRouter` v1 (static escalation chain) | `packages/backend/orchestrator/src/pipeline/model-router.ts` (per APIP-0040 scope) | This is the exact module APIP-3040 upgrades — the static `['ollama', 'openrouter', 'anthropic']` escalation chain is replaced with affinity-guided selection |
| `wint.model_assignments` table | `packages/backend/database-schema/src/schema/wint.ts` (additive, APIP-0040) | Establishes the DB-backed config precedence pattern; APIP-3040 adds a second DB read path (`wint.model_affinity`) alongside this existing one |
| `ModelRouterFactory` (static tier router) | `packages/backend/orchestrator/src/models/unified-interface.ts` | Protected WINT/MODL router — APIP-3040 must not modify this file; `PipelineModelRouter` wraps it |
| Token-bucket rate limiter / budget accumulator | `packages/backend/orchestrator/src/pipeline/token-bucket.ts`, `budget-accumulator.ts` (APIP-0040) | Part of `PipelineModelRouter` v1 — APIP-3040 extends routing logic while preserving rate limiting and budget enforcement |
| `wint` pgSchema namespace | `packages/backend/database-schema/src/schema/wint.ts` | All APIP tables use `wintSchema = pgSchema('wint')` — `wint.model_affinity` from APIP-3020 is the source of truth for APIP-3040 routing decisions |
| Drizzle ORM + drizzle-zod patterns | `packages/backend/database-schema/src/schema/` | `createInsertSchema`/`createSelectSchema`, Zod-first types — query pattern for reading `wint.model_affinity` from `PipelineModelRouter` |
| `@repo/logger` | Throughout orchestrator | Required for all routing decision logging |
| LangGraph graph patterns | `packages/backend/orchestrator/src/graphs/metrics.ts`, `elaboration.ts` | Reference for any graph-level routing integration if needed |

### Active In-Progress Work

| Story | Status | Area | Potential Impact |
|-------|--------|------|-----------------|
| APIP-0040 | needs-code-review | `PipelineModelRouter` v1 in `packages/backend/orchestrator/src/pipeline/` | APIP-3040 directly extends or modifies the module defined by APIP-0040; must not begin until APIP-0040 is merged |
| APIP-3020 | backlog | `wint.model_affinity` table + Pattern Miner cron | APIP-3040 reads from `wint.model_affinity` which APIP-3020 creates and populates; hard dependency |
| APIP-3010 | backlog | `wint.change_telemetry` table + instrumentation | Upstream dependency for APIP-3020; no affinity data exists until APIP-3010 and APIP-3020 complete |
| APIP-3070 | backlog | Cold Start Bootstrapping and Exploration Budget | APIP-3070 depends on APIP-3040 — it extends the routing fallback logic for exploration; APIP-3040 must define the cold-start fallback contract that APIP-3070 enhances |
| APIP-5007 | backlog | Database Schema Versioning and Migration Strategy | Migration convention for any additional `wint.model_affinity` indexes added for APIP-3040 queries |
| APIP-1010 | in-progress | Structurer Node in Elaboration Graph | APIP-3040's routing will eventually be called from within worker graphs; confirms that LangGraph node wiring must accept `PipelineModelRouter` via graph config injection |

### Constraints to Respect

- **Do NOT modify `packages/backend/orchestrator/src/models/`**: `ModelRouterFactory`, `task-selector.ts`, `strategy-loader.ts`, and `unified-interface.ts` are protected by active WINT/MODL UAT coverage. APIP-3040 operates exclusively through `PipelineModelRouter` which wraps them.
- **APIP-0040 must merge before APIP-3040 begins**: `PipelineModelRouter` is defined by APIP-0040. APIP-3040 cannot safely extend what does not yet exist in main.
- **APIP-3020 must complete before APIP-3040**: The `wint.model_affinity` table is the sole source of affinity data. Without it, there is nothing to query.
- **Zod-first types (REQUIRED)**: No TypeScript interfaces. All types are `z.infer<typeof SomeZodSchema>`.
- **`@repo/logger` for all logging**: No `console.log` — all routing decision logs must use `@repo/logger` with structured fields.
- **Low-confidence fallback is mandatory (risk_notes)**: Profiles with `sample_size < 20` (confidence_level = 'none' or 'low') must fall back to conservative defaults (existing static escalation chain). 85% threshold may need calibration — it should be an externally configurable constant, not a magic number.
- **Protected DB client API**: `@repo/db` client API surface must not change.
- **APIP-3090 cron infrastructure**: The Pattern Miner cron that feeds `wint.model_affinity` runs out-of-band. APIP-3040 reads the latest profiles on each dispatch — no blocking dependency on the cron scheduler itself.
- **Dedicated local server only (APIP ADR-001 Decision 4)**: No AWS Lambda. `PipelineModelRouter` runs on the same dedicated server as the rest of the pipeline.

---

## Retrieved Context

### Related Endpoints

None — APIP-3040 is an internal pipeline routing module. No HTTP endpoints.

### Related Components

None — no UI components. The Learning-Aware Model Router is invisible to end users. Operator visibility of routing decisions is deferred to APIP-5005 (Minimal Operator CLI).

### Reuse Candidates

| Candidate | Location | How to Reuse |
|-----------|----------|--------------|
| `PipelineModelRouter` / `PipelineModelRouterFactory` | `packages/backend/orchestrator/src/pipeline/model-router.ts` (APIP-0040) | Extend this class — add affinity-guided selection path before the static escalation chain fallback |
| `wint.model_assignments` query pattern | `packages/backend/orchestrator/src/pipeline/model-router.ts` (APIP-0040) | Follow the same DB-read-on-init + in-memory cache + `invalidateCache()` pattern for `wint.model_affinity` queries |
| `ModelAffinitySelectSchema` + `confidence_level` enum | `packages/backend/database-schema/src/schema/` (APIP-3020) | Import and use for typed reads from `wint.model_affinity`; confidence_level enum (`'none' \| 'low' \| 'medium' \| 'high'`) drives fallback routing decisions |
| `invalidateAssignmentsCache()` pattern | `packages/backend/orchestrator/src/pipeline/model-router.ts` | Apply same cache invalidation contract for affinity profile cache — `invalidateAffinityCache()` — so external callers can trigger re-fetch after Pattern Miner runs |
| `BudgetExhaustedError`, `ProviderChainExhaustedError` | `packages/backend/orchestrator/src/pipeline/__types__/index.ts` (APIP-0040) | Reuse these typed error classes unchanged; APIP-3040 adds routing logic, not new error contracts |
| `checkTokenBudget()` / budget accumulator | `packages/backend/orchestrator/src/utils/token-budget.ts`, `pipeline/budget-accumulator.ts` | Unmodified; budget enforcement continues to operate after model is selected |
| `TaskContract` / `TaskContractSchema` | `packages/backend/orchestrator/src/models/__types__/task-contract.ts` | `change_type` and `file_type` fields must be available on the dispatch call for affinity lookup |
| `@repo/logger` | Throughout orchestrator | Structured logging for every routing decision: `{ model_selected, change_type, file_type, confidence_level, source: 'affinity' \| 'fallback' }` |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| `PipelineModelRouter` DB-backed config + caching pattern | `packages/backend/orchestrator/src/pipeline/model-router.ts` | The exact file APIP-3040 extends; shows `wint.model_assignments` DB read on init, in-memory cache, `invalidateAssignmentsCache()` pattern that the affinity query must mirror |
| Zod-first module with singleton factory + logger | `packages/backend/orchestrator/src/models/unified-interface.ts` | Canonical singleton factory pattern and Zod schema structure to follow for any new types added in APIP-3040 |
| `wint` schema table with numeric/enum columns | `packages/backend/database-schema/src/schema/telemetry.ts` | Pattern for reading Drizzle ORM `wint`-namespace tables with typed Zod results; mirrors what reading `wint.model_affinity` rows will look like |
| LangGraph node injection via graph config | `packages/backend/orchestrator/src/nodes/elaboration/index.ts` | Pattern for injecting `PipelineModelRouter` as a graph config dependency so nodes call `router.dispatch()` — prevents hard imports and enables unit test mocking |

---

## Knowledge Context

### Lessons Learned

Knowledge base search was unavailable during seed generation (INTERNAL_ERROR — same condition as APIP-3020 seed). Lessons are inferred from codebase patterns, ADR documents, and adjacent APIP story seeds (APIP-0040, APIP-3020):

- **[APIP-0040 elaboration pattern]** When extending `PipelineModelRouter`, keep the static escalation chain as the mandatory fallback path. Learning-based routing is an overlay, not a replacement. If the affinity lookup fails (DB unavailable, no profile, low confidence), the router must silently fall back to the existing chain without error propagation. (*category: pattern*)
  - *Applies because*: The 85% threshold in the story.yaml is a routing preference, not a hard constraint. Days 1–N before profiles accumulate sufficient sample_size, the system must still function correctly.

- **[APIP-3020 seed blocker pattern]** Downstream consumers of `wint.model_affinity` must handle the cold-start case explicitly — `sample_size = 0`, `confidence_level = 'none'`. Do not assume profiles exist on day 1. (*category: constraint*)
  - *Applies because*: APIP-3020 defines the cold-start data state; APIP-3040 must implement the fallback routing contract. APIP-3070 (Cold Start Bootstrapping) extends this with exploration budget logic.

- **[APIP-0040 pattern — DB config override precedence]** The `wint.model_assignments` query establishes DB-first, YAML-second precedence. The affinity query must not override `model_assignments` DB entries. Precedence order must be explicit: (1) DB model_assignments override → (2) affinity-guided selection (if confidence ≥ medium) → (3) static escalation fallback. (*category: pattern*)
  - *Applies because*: An operator-level `model_assignments` override should always win over learned affinity, preserving manual control.

- **[APIP-0040 risk pattern — cache invalidation coupling]** `invalidateAssignmentsCache()` must be called by any code that writes to `wint.model_assignments`. By analogy, `invalidateAffinityCache()` (or equivalent) should be callable by the Pattern Miner cron job after each aggregation run, so the router picks up fresh profiles without restarting the process. (*category: pattern*)
  - *Applies because*: Without cache invalidation, the router will serve stale profiles until process restart.

- **[Threshold calibration risk]** The 85% success-rate threshold is a starting estimate and may need adjustment based on real pipeline data. Hard-coding it as a magic number in the routing logic creates a code change requirement for every calibration attempt. (*category: time_sink*)
  - *Applies because*: The story.yaml risk_notes explicitly call out: "85% threshold may need calibration." Store the threshold as a named constant in the config/types layer, injectable via `PipelineModelRouterConfig`.

### Blockers to Avoid (from past stories)

- **Starting APIP-3040 before APIP-0040 merges**: `PipelineModelRouter` v1 defines the interface, singleton, and error contract that APIP-3040 extends. Implementing the learning layer against an unreviewd/unmerged v1 risks a conflicting redesign at code review time.
- **Starting APIP-3040 before APIP-3020 completes**: `wint.model_affinity` does not exist without APIP-3020. APIP-3040's integration tests cannot run. Implementing the query against a non-existent table means writing to a spec rather than reality.
- **Replacing the static escalation chain**: The existing Ollama → OpenRouter → Anthropic chain must remain as the fallback. Removing it breaks the system during cold-start and on any DB failure.
- **Routing decision based on raw success_rate float without confidence check**: Querying `wint.model_affinity` and selecting the cheapest model above 85% without checking `confidence_level` would route on statistically meaningless single-sample profiles. Always gate affinity-based routing on `confidence_level IN ('medium', 'high')` (i.e., `sample_size >= 20`).
- **Storing the 85% threshold as a magic number**: Hardcoding `0.85` inline makes future calibration require a code change. Extract as a named constant in `PipelineModelRouterConfig` (`affinitySuccessRateThreshold`).
- **Querying `wint.model_affinity` on every single dispatch without caching**: `wint.model_affinity` is updated by the Pattern Miner cron (runs infrequently, e.g., hourly). Querying the DB on every model dispatch will cause unnecessary latency and load. Cache profiles in memory; invalidate on Pattern Miner completion signal.
- **Not logging the routing decision source**: Operators need to distinguish whether a model was selected via affinity, DB assignment override, or static fallback. Log `source: 'affinity' | 'db_assignment' | 'fallback'` with every routing decision.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| APIP ADR-001 Decision 2 | Plain TypeScript Supervisor | Supervisor dispatches to worker graphs; `PipelineModelRouter` is called within graph nodes — not by the supervisor directly. APIP-3040 must preserve the injection pattern (router passed via graph config). |
| APIP ADR-001 Decision 4 | Local Dedicated Server | `PipelineModelRouter` runs on-process on the dedicated local server — no Lambda. In-memory affinity cache is valid for single-process architecture (Phase 0–3). |
| ADR-002 | Infrastructure-as-Code Strategy | Any additional DB index added for `wint.model_affinity` affinity queries must be in a standalone SQL migration file following the APIP-5007 migration naming convention — not a CloudFormation stack change. |
| ADR-005 | Testing Strategy — UAT Must Use Real Services | Integration tests for affinity-guided routing must use a real test PostgreSQL instance with `wint.model_affinity` rows pre-inserted — no in-memory fakes for affinity query testing. |
| ADR-006 | E2E Tests Required in Dev Phase | No frontend impact. ADR-006 E2E Playwright requirement does not apply. Skip condition: `frontend_impacted: false`. |

### Patterns to Follow

- Extend `PipelineModelRouter` in-place (or via a clearly named subclass/extension), preserving all v1 functionality unchanged
- Three-tier routing precedence: (1) `wint.model_assignments` DB override → (2) affinity-guided (confidence ≥ medium, success_rate ≥ threshold) → (3) static escalation fallback
- In-memory cache for `wint.model_affinity` profiles, populated on first dispatch call (lazy load) or on explicit `invalidateAffinityCache()` call
- Named constant for success-rate threshold (`affinitySuccessRateThreshold: number`) in `PipelineModelRouterConfig`
- Structured log on every routing decision: `{ source, model, provider, change_type, file_type, confidence_level, success_rate, sample_size }`
- `z.infer<typeof Schema>` for all TypeScript types — no interfaces
- `@repo/logger` for all logging with domain `'pipeline_model_router'`
- Unit tests for each routing tier, cold-start fallback, and cache invalidation
- Integration test against real test DB with pre-inserted `wint.model_affinity` fixture rows

### Patterns to Avoid

- Replacing or removing the static escalation chain — it is a required safety fallback
- Routing on profiles with `confidence_level = 'none'` or `'low'` (sample_size < 20)
- Hardcoding `0.85` as a magic number — externalize as a configurable constant
- Querying `wint.model_affinity` on every dispatch without caching
- Modifying any file in `packages/backend/orchestrator/src/models/` — protected by WINT/MODL UAT
- TypeScript interfaces — Zod schemas with `z.infer<>` only
- `console.log` — use `@repo/logger` only
- Silently ignoring routing failures — log all fallback events with reason

---

## Conflict Analysis

### Conflict: APIP-0040 not yet merged (PipelineModelRouter v1 baseline unavailable)
- **Severity**: warning
- **Description**: APIP-0040 is at `needs-code-review` status. Its implementation defines `PipelineModelRouter`, `PipelineModelRouterFactory`, `BudgetExhaustedError`, `ProviderChainExhaustedError`, and the `wint.model_assignments` DB-backed config pattern that APIP-3040 extends. Beginning APIP-3040 implementation before APIP-0040 merges means developing against an unreviewed interface that may change at code review.
- **Resolution Hint**: Gate APIP-3040 elaboration on APIP-0040 merging. Dev feasibility can proceed but implementation must not start until v1 is in main. Include a dependency verification step in the implementation plan.

### Conflict: APIP-3020 not yet implemented (wint.model_affinity table unavailable)
- **Severity**: warning
- **Description**: `wint.model_affinity` is the sole source of affinity profiles. APIP-3020 is in backlog with no implementation. APIP-3040 integration tests cannot run against real data. The `ModelAffinitySelectSchema` type contract is defined in APIP-3020's story seed but not yet in code.
- **Resolution Hint**: APIP-3040 unit tests should mock the affinity profile data layer (inject a mock reader). Integration tests are gated on APIP-3020 completion. Document the contract between APIP-3020's `ModelAffinitySelectSchema` and APIP-3040's routing query as a first-class deliverable in elaboration.

### Conflict: Knowledge base unavailable for lesson retrieval
- **Severity**: warning
- **Description**: KB search returned INTERNAL_ERROR during seed generation. Lessons from past APIP stories could not be retrieved. The Knowledge Context section is based on inferences from codebase patterns and ADR documents.
- **Resolution Hint**: Retry KB search before elaboration begins. Queries to try: `"model router affinity learning routing"`, `"pipeline routing fallback defaults"`, `"PipelineModelRouter escalation chain"`. Supplement seed with any relevant KB entries found.

---

## Story Seed

### Title

Learning-Aware Model Router

### Description

The autonomous pipeline currently dispatches all LLM model calls through a static escalation chain (`PipelineModelRouter` v1, APIP-0040): Ollama → OpenRouter → Anthropic, with DB-level `wint.model_assignments` overrides. This is cost-conservative but cost-inefficient — every change attempt uses the same fallback hierarchy regardless of how well a given model has historically performed for a specific change type and file type.

After APIP-3020 delivers the `wint.model_affinity` table (continuously updated by the Pattern Miner cron), each `(model, change_type, file_type)` combination has an empirical success rate and confidence level. APIP-3040 upgrades `PipelineModelRouter` to use these profiles: for each dispatch call, the router looks up the cheapest model with `success_rate >= affinitySuccessRateThreshold` (default 85%) and `confidence_level IN ('medium', 'high')` for the specific `(change_type, file_type)` combination from the ChangeSpec, and routes to that model directly — bypassing the static escalation chain when affinity evidence is strong enough.

Three-tier routing precedence (highest to lowest):
1. `wint.model_assignments` DB override (operator-level manual control — always wins)
2. Affinity-guided selection from `wint.model_affinity` (confidence_level >= medium, success_rate >= threshold)
3. Static escalation chain fallback (cold-start, low-confidence, DB unavailable)

The routing decision source is logged for every dispatch, enabling the operator CLI (APIP-5005) to surface routing attribution. The affinity cache is in-memory (per APIP ADR-001 Decision 4 — single dedicated server) and invalidated on explicit signal from the Pattern Miner cron run.

No `wint.model_affinity` table or learning-based routing exists in the codebase today. APIP-0040 must merge before APIP-3040 can begin implementation.

### Initial Acceptance Criteria

- [ ] AC-1: `PipelineModelRouter.dispatch()` accepts `change_type` and `file_type` fields (from the ChangeSpec, via `TaskContract` or a new `PipelineDispatchOptionsSchema` extension) and uses them to perform an affinity lookup against `wint.model_affinity` before invoking the static escalation chain.

- [ ] AC-2: A `queryAffinityProfile(changeType: string, fileType: string): Promise<AffinityProfile | null>` method (or equivalent internal function) queries `wint.model_affinity` for all rows matching the `(change_type, file_type)` combination, filtered to `confidence_level IN ('medium', 'high')` and ordered by `success_rate DESC, cost_per_token ASC` (cheapest high-confidence model first). Returns `null` if no qualifying profile exists.

- [ ] AC-3: When `queryAffinityProfile` returns a qualifying row with `success_rate >= affinitySuccessRateThreshold`, `PipelineModelRouter` selects that model and provider, bypassing the static escalation chain (unless a `wint.model_assignments` DB override is in effect for the matching `agent_pattern`). `wint.model_assignments` overrides take absolute precedence.

- [ ] AC-4: When no qualifying affinity profile exists (cold-start, `confidence_level = 'none'` or `'low'`, no matching row, `success_rate < threshold`), `PipelineModelRouter` falls back to the static Ollama → OpenRouter → Anthropic escalation chain exactly as implemented in APIP-0040 v1. No error is thrown or logged for this fallback — it is the expected path during ramp-up.

- [ ] AC-5: The success-rate routing threshold is stored as a named constant `affinitySuccessRateThreshold` in `PipelineModelRouterConfig` (Zod-validated). Default value: `0.85`. The threshold must not be hardcoded inline. Config injection allows tests to set a different threshold without code changes.

- [ ] AC-6: Affinity profiles are cached in memory after first load. The cache is keyed by `(change_type, file_type)` and populated lazily on first dispatch for a given combination. An `invalidateAffinityCache()` method is exposed on `PipelineModelRouter` (matching the pattern of `invalidateAssignmentsCache()` from APIP-0040) for the Pattern Miner cron to call after each aggregation run.

- [ ] AC-7: Every `dispatch()` call logs a structured routing decision record via `@repo/logger` with domain `'pipeline_model_router'` and fields: `{ source: 'affinity' | 'db_assignment' | 'fallback', model, provider, change_type, file_type, confidence_level: string | null, success_rate: number | null, sample_size: number | null }`. This enables post-hoc analysis of routing attribution.

- [ ] AC-8: The existing `PipelineModelRouterFactory` singleton pattern from APIP-0040 is preserved. No breaking changes to the `dispatch()` call signature — `change_type` and `file_type` are optional fields (defaulting to `'unknown'` if not provided) so that graph nodes not yet ChangeSpec-aware can still call the router without modification.

- [ ] AC-9: A `PipelineModelRouterConfig` Zod schema update (additive) includes: `affinitySuccessRateThreshold: z.number().min(0).max(1).default(0.85)` and `affinityMinSampleSize: z.number().int().min(1).default(20)` (the minimum sample_size threshold before affinity is considered). No TypeScript interfaces.

- [ ] AC-10: Unit tests (Vitest) cover: (a) affinity routing selected when qualifying profile exists with correct confidence and success_rate, (b) fallback to static chain when no profile exists (cold-start), (c) fallback to static chain when confidence_level is 'none' or 'low', (d) fallback to static chain when success_rate < threshold, (e) `wint.model_assignments` DB override taking precedence over an affinity match, (f) `invalidateAffinityCache()` causes re-query on next dispatch, (g) `change_type`/`file_type` defaulting to `'unknown'` when not provided.

- [ ] AC-11: Integration test (Vitest, real test PostgreSQL — APIP-5001 test DB) with `wint.model_affinity` fixture rows pre-inserted: verifies that a dispatch call with a matching `(change_type, file_type)` combination routes to the model from the fixture row (not the static chain default). Fixture rows must include at least one high-confidence row and one low-confidence row to verify fallback.

- [ ] AC-12: All existing APIP-0040 unit tests continue to pass. No file in `packages/backend/orchestrator/src/models/` is modified. Existing `PipelineModelRouter` behaviors (rate limiting, budget accumulation, escalation chain, `BudgetExhaustedError`, `ProviderChainExhaustedError`) are unaffected.

- [ ] AC-13: `PipelineModelRouter.dispatch()` handles `wint.model_affinity` DB query failure gracefully — if the affinity query throws (e.g., DB unavailable), the router logs a warning and falls through to the static escalation chain without re-throwing. Budget enforcement and rate limiting continue to operate on the fallback path.

### Non-Goals

- Implementing the `wint.model_affinity` table or Pattern Miner cron — that is APIP-3020
- Implementing the cold-start exploration budget mechanism — that is APIP-3070 (APIP-3040 defines the fallback contract; APIP-3070 adds exploration logic on top)
- Implementing affinity-guided diff planning — that is APIP-3030
- Implementing affinity-guided story structuring — that is APIP-3050
- Implementing the bake-off engine for model experiments — that is APIP-3060
- Adding UI or operator CLI visibility for routing decisions — that is APIP-5005
- Implementing online learning or real-time profile updates during the change loop — profiles are only updated by the Pattern Miner cron (out-of-band)
- Modifying any file in `packages/backend/orchestrator/src/models/` (protected)
- Changing the `wint.model_assignments` table schema or query logic defined by APIP-0040
- Per-story or per-ChangeSpec telemetry writes — that is APIP-3010
- Implementing dynamic threshold adjustment — threshold is configurable but not auto-tuned in this story
- Adding HTTP endpoints — no API surface

### Reuse Plan

- **Components**: None (no UI)
- **Patterns**: Extend `PipelineModelRouter` (APIP-0040) with additive affinity layer; follow `wint.model_assignments` DB-read + in-memory cache + `invalidateCache()` pattern; three-tier routing precedence; Zod-validated config with named constants; structured logging with routing source attribution; lazy-load cache with explicit invalidation signal
- **Packages**: `packages/backend/orchestrator` (modify `src/pipeline/model-router.ts`); `packages/backend/database-schema` (read `wint.model_affinity` via Drizzle schema types from APIP-3020); `@repo/logger` for all routing logs; `@repo/db` for Drizzle affinity query

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- **No UI impact**: ADR-006 E2E Playwright requirement does not apply. Skip condition: `frontend_impacted: false`. No Playwright tests needed.
- **Three test tiers**:
  - *Unit tests* (Vitest, mocked DB): Cover all 7 AC-10 sub-cases. Use a mock `affinityReader` injected via config — do not require a real database. Use `vi.fn()` to simulate qualifying profiles, low-confidence profiles, and query errors. All unit tests should run in CI without any database.
  - *Integration test* (Vitest + real APIP-5001 test PostgreSQL): One happy-path test (AC-11) — insert `wint.model_affinity` fixture rows (one high-confidence, one low-confidence), dispatch with matching `change_type`/`file_type`, verify affinity routing is used for high-confidence and fallback for low-confidence. Mark with `@integration` vitest tag.
  - *Regression test*: Run full existing APIP-0040 test suite — confirm zero regressions. All rate-limiting, budget accumulation, and escalation chain tests must still pass (AC-12).
- **Per ADR-005**: Integration test for affinity query must use real PostgreSQL with actual `wint.model_affinity` rows — no in-memory SQLite substitute.
- **Cache invalidation test**: Unit test that calls `dispatch()` (populates cache), calls `invalidateAffinityCache()`, then calls `dispatch()` again and asserts a new DB query was made (not cached response).
- **DB failure resilience test**: Unit test that mocks the affinity query to throw, confirms dispatch succeeds via fallback, confirms `logger.warn` called once (AC-13).

### For UI/UX Advisor

- No UI impact. The Learning-Aware Model Router is a headless internal component.
- The only operator-visible output is structured log entries from `@repo/logger`. Ensure the log fields `{ source, model, provider, change_type, file_type, confidence_level, success_rate, sample_size }` use snake_case naming consistent with existing `pipeline_model_router` log domain. APIP-5005 (Minimal Operator CLI) will surface these fields.
- Consider whether `invalidateAffinityCache()` needs an operator-callable mechanism (e.g., CLI command) to force cache refresh without process restart. Out of scope for APIP-3040 but the method signature should be designed to be CLI-accessible.

### For Dev Feasibility

- **Interface contract with APIP-3020**: Before writing any query code, confirm the final column names of `wint.model_affinity` from the APIP-3020 story seed. Required fields for APIP-3040: `model` (text), `change_type` (text), `file_type` (text), `success_rate` (numeric), `confidence_level` (enum), `sample_size` (integer), `avg_cost_usd` (numeric for cheapest-model selection), `last_aggregated_at` (timestamp). The APIP-3020 seed defines these — use it as the contract.
- **Dispatch options extension**: `PipelineDispatchOptionsSchema` (defined in APIP-0040 `pipeline/__types__/index.ts`) should be extended with `changeType: z.string().default('unknown')` and `fileType: z.string().default('unknown')`. This is a backward-compatible additive change.
- **Affinity query structure**: The routing query is:
  ```sql
  SELECT model, success_rate, avg_cost_usd, confidence_level, sample_size
  FROM wint.model_affinity
  WHERE change_type = $1 AND file_type = $2
    AND confidence_level IN ('medium', 'high')
    AND success_rate >= $3
  ORDER BY avg_cost_usd ASC, success_rate DESC
  LIMIT 1;
  ```
  The cheapest qualifying model wins. If multiple models tie on cost, prefer higher success_rate.
- **Cache structure**: Use `Map<string, AffinityProfile | null>` where key is `\`${changeType}:${fileType}\``. `null` means "queried but no qualifying profile" (avoid re-querying). TTL is managed by `invalidateAffinityCache()` which clears the entire Map.
- **Provider derivation**: `wint.model_affinity` stores `model` as a string (e.g., `'ollama/qwen2.5-coder:7b'`, `'openrouter/gpt-4o-mini'`). Parse `provider` from the `model` string prefix (same pattern as `unified-interface.ts`). Use `getProviderForModel()` from `packages/backend/orchestrator/src/config/llm-provider.ts` to obtain the `ILLMProvider` instance.
- **Singleton impact**: `PipelineModelRouterFactory.getInstance()` creates the singleton on first call. The affinity cache is an instance-level `Map` initialized as empty. No DB query on construction — lazy-load on first dispatch.
- **File to modify**: `packages/backend/orchestrator/src/pipeline/model-router.ts` (additive changes) and `packages/backend/orchestrator/src/pipeline/__types__/index.ts` (additive Zod schema fields). No new files required unless complexity warrants splitting to `packages/backend/orchestrator/src/pipeline/affinity-reader.ts`.
- **Canonical references for subtask decomposition**:
  - v1 model router to extend: `packages/backend/orchestrator/src/pipeline/model-router.ts`
  - Zod-first singleton factory pattern: `packages/backend/orchestrator/src/models/unified-interface.ts`
  - `wint` schema read pattern (Drizzle + typed result): `packages/backend/database-schema/src/schema/telemetry.ts`
  - Graph config injection pattern: `packages/backend/orchestrator/src/nodes/elaboration/index.ts`
- **Risk — APIP-3020 not merged at implementation time**: If `wint.model_affinity` table does not exist when APIP-3040 begins, structure the implementation so the Drizzle query type import can be mocked. Add a compile-time type import guard and a runtime `IF table EXISTS` check. Document the integration test as `@integration` so it is skipped in CI when the APIP-5001 test DB does not have the APIP-3020 migration applied.
- **Risk — APIP-3010 ChangeSpec enum not finalized**: `change_type` and `file_type` use `'unknown'` as placeholder until APIP-1020 ChangeSpec ADR is published. APIP-3040 must handle `'unknown'` gracefully — it will never match any affinity profile, so it falls through to the static chain. This is the correct behavior.
