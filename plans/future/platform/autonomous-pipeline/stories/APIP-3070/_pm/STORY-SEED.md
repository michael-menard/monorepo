---
generated: "2026-02-25"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 3
blocking_conflicts: 0
---

# Story Seed: APIP-3070

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Neither the `PipelineModelRouter` v1 (APIP-0040) nor the `wint.model_affinity` table (APIP-3020) nor the Learning-Aware Model Router (APIP-3040) exists in the codebase. APIP-3070 is the final story on the critical path and all three upstream stories must complete before APIP-3070 can be implemented. The `wint.model_assignments` table pattern (APIP-0040) provides a reference for DB-backed config structure. No cold-start or exploration-budget mechanism exists anywhere in the pipeline today.

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| `PipelineModelRouter` v1 (static escalation chain) | `packages/backend/orchestrator/src/pipeline/model-router.ts` (post-APIP-0040 merge) | APIP-3070 adds cold-start defaults and exploration budget on top of this class; it is the entry point for all model dispatches |
| Learning-Aware Model Router (affinity-guided routing) | `packages/backend/orchestrator/src/pipeline/model-router.ts` (post-APIP-3040 merge) | APIP-3070 extends the three-tier routing precedence from APIP-3040 with a fourth layer: exploration assignment. The `invalidateAffinityCache()` pattern from APIP-3040 is reused for the exploration state. |
| `wint.model_affinity` table + Pattern Miner cron | `packages/backend/database-schema/src/schema/wint.ts` + `packages/backend/orchestrator/src/graphs/pattern-miner.ts` (post-APIP-3020 merge) | The Profile Confidence Gate in AC-3 reads `confidence_level` and `sample_size` from this table; the cold-start state (zero rows) triggers conservative OpenRouter defaults |
| `wint.model_assignments` DB-backed config pattern | `packages/backend/database-schema/src/schema/wint.ts` (post-APIP-0040 merge) | Pattern for storing router configuration in a DB-backed table; APIP-3070's manual seeding feature (AC-5) follows this precedent — seed data is structured config, not dynamic affinity data |
| `PipelineModelRouterConfig` Zod schema | `packages/backend/orchestrator/src/pipeline/model-router.ts` (post-APIP-3040 merge) | APIP-3070 extends this config with: `conservativeOpenRouterModel`, `explorationBudgetFraction`, and `manualSeedingEnabled` flags. All config values are named constants, never magic numbers. |
| `@repo/logger` | Throughout `packages/backend/orchestrator/` | All routing decision logs: cold-start fallback, exploration assignment, seed override |
| Drizzle ORM + `wint` pgSchema namespace | `packages/backend/database-schema/src/schema/wint.ts` | Any new config/seed tables must live in `wintSchema = pgSchema('wint')`; drizzle-zod for all type generation |
| LangGraph graph patterns | `packages/backend/orchestrator/src/graphs/metrics.ts` | Reference for cron-style graph structure if a seeding graph is needed (APIP-3070 seed import is optional, not a cron) |

### Active In-Progress Work

| Story | Status | Area | Potential Impact |
|-------|--------|------|-----------------|
| APIP-0040 | needs-code-review | `PipelineModelRouter` v1 | Hard prerequisite — APIP-3070 cannot begin until APIP-0040 is merged and `PipelineModelRouter` is available |
| APIP-3010 | elaboration | `wint.change_telemetry` table + instrumentation | Upstream dependency for APIP-3020 → APIP-3040 → APIP-3070 critical path |
| APIP-3020 | backlog | `wint.model_affinity` table + Pattern Miner cron | Prerequisite for APIP-3040; indirectly prerequisite for APIP-3070 profile confidence gate |
| APIP-3040 | backlog | Learning-Aware Model Router | Direct prerequisite for APIP-3070 — APIP-3070 extends the three-tier routing logic from APIP-3040 |
| APIP-5007 | in-progress | Database Schema Versioning and Migration Strategy | Any new `wint.*` table for manual seed storage must follow the migration naming convention established by APIP-5007 |
| APIP-3090 | backlog | Cron Job Infrastructure | The Pattern Miner cron (APIP-3020) that feeds affinity profiles is registered by APIP-3090; APIP-3070 exploration budget resets may need to hook into cron lifecycle signals |

### Constraints to Respect

- **Do NOT modify `packages/backend/orchestrator/src/models/`**: `ModelRouterFactory`, `task-selector.ts`, `strategy-loader.ts`, `unified-interface.ts` are protected by active WINT/MODL UAT coverage. APIP-3070 works exclusively through `PipelineModelRouter`.
- **All three upstream stories must merge before APIP-3070 implementation**: APIP-0040 (router v1), APIP-3020 (model_affinity table), APIP-3040 (learning-aware router). APIP-3070 is additive on top of all three.
- **Zod-first types (REQUIRED)**: No TypeScript interfaces anywhere. All types are `z.infer<typeof SomeZodSchema>`.
- **`@repo/logger` for all logging**: No `console.log`.
- **Protected DB client API**: `@repo/db` client API surface must not change.
- **Single dedicated server (APIP ADR-001 Decision 4)**: In-memory exploration state is valid for single-process Phase 0–3 architecture. No distributed cache required.
- **Exploration budget must not cause unbounded cost spikes**: The 10% random Ollama assignment must be capped to prevent Ollama from consuming too many attempts on change types where it has a known poor track record. The budget fraction must be a named constant in config.
- **Conservative OpenRouter defaults must exist before any affinity data**: Day-1 operation must never route through Ollama for change types with unknown success rates (cost risk). OpenRouter is the conservative safe default.

---

## Retrieved Context

### Related Endpoints

None — APIP-3070 is an internal pipeline routing extension. No HTTP endpoints.

### Related Components

None — no UI components. The cold-start and exploration logic is invisible to end users. Operator visibility of exploration decisions is deferred to APIP-5005 (Minimal Operator CLI).

### Reuse Candidates

| Candidate | Location | How to Reuse |
|-----------|----------|--------------|
| `PipelineModelRouter.dispatch()` | `packages/backend/orchestrator/src/pipeline/model-router.ts` (post-APIP-3040) | Extend with exploration probability check before affinity lookup; add cold-start default path |
| `PipelineModelRouterConfig` Zod schema | `packages/backend/orchestrator/src/pipeline/model-router.ts` (post-APIP-3040) | Extend with `explorationBudgetFraction`, `conservativeOpenRouterModel`, `manualSeedEnabled` fields |
| `invalidateAffinityCache()` pattern | `packages/backend/orchestrator/src/pipeline/model-router.ts` (post-APIP-3040) | Apply same pattern for exploration state reset: `resetExplorationState()` clears per-storyId exploration counters |
| `wint.model_affinity` `confidence_level` enum | `packages/backend/database-schema/src/schema/wint.ts` (post-APIP-3020) | Profile confidence gate reads `confidence_level` field; `'none'` or `'low'` triggers conservative defaults |
| `wint.model_assignments` DB-backed config | `packages/backend/orchestrator/src/pipeline/model-router.ts` (post-APIP-0040) | Pattern for optional manual seeding config table; if AC-5 needs a DB-backed seed table, follow this precedent |
| `CONFIDENCE_THRESHOLDS` named constants | `packages/backend/orchestrator/src/graphs/pattern-miner.ts` (post-APIP-3020) | Reuse threshold values (`LOW_MAX=19`, `MEDIUM_MAX=49`) for consistent confidence gating across APIP-3040 and APIP-3070 |
| `@repo/logger` | Throughout orchestrator | Structured logging: `{ source: 'cold_start' \| 'exploration' \| 'seed_override', model, provider, change_type, file_type }` |
| Drizzle ORM migration structure | `apps/api/knowledge-base/src/db/migrations/` | `BEGIN`/`COMMIT` pattern for any new seed config table migration |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| `PipelineModelRouter` v1 with DB-backed config + singleton factory | `packages/backend/orchestrator/src/pipeline/model-router.ts` (post-APIP-0040) | Exact file APIP-3070 extends; the exploration budget and cold-start default are new code paths within this class |
| Learning-aware routing three-tier precedence + cache invalidation | `packages/backend/orchestrator/src/pipeline/model-router.ts` (post-APIP-3040) | APIP-3070 adds exploration and cold-start as a fourth tier below affinity; follows the same structured-log and named-constant patterns |
| Confidence-gated behavior (`confidence_level` enum usage) | `packages/backend/orchestrator/src/graphs/pattern-miner.ts` (post-APIP-3020) | `CONFIDENCE_THRESHOLDS` constants and the `confidence_level` enum must be imported consistently — APIP-3070 must not redefine them |
| Zod-first artifact schema with named config constants | `packages/backend/orchestrator/src/artifacts/story.ts` | Pattern for any new config or seed type schemas added in APIP-3070 (e.g., `ManualSeedEntrySchema`, `ExplorationBudgetConfigSchema`) |

---

## Knowledge Context

### Lessons Learned

- **[WKFL-007 cold-start pattern]** Define explicit fallback values for all heuristics when no data has accumulated. Document day-1 defaults as named constants so they are discoverable, not buried in inline logic. (*category: pattern*)
  - *Applies because*: APIP-3070's "conservative OpenRouter defaults" are exactly this — named fallbacks for the cold-start period before telemetry accumulates enough data for high-confidence routing. Every fallback value must be a named constant in `PipelineModelRouterConfig`.

- **[APIP-0040 known limitation — cache invalidation is single-process only]** The `invalidateAssignmentsCache()` pattern works only for single-process deployments (Phase 0–3 per ADR-001 Decision 4). The same limitation applies to any in-memory exploration state in APIP-3070. (*category: constraint*)
  - *Applies because*: The exploration budget counter (`explorationCountPerStory`) is per-process in-memory state. If APIP-3080 (parallel worktrees) runs multiple processes, exploration counters will not be shared. APIP-3070 must document this limitation explicitly — no action needed for Phase 0–3.

- **[WKFL-007 future opportunity — explicit else branches for cold-start]** When `similar_stories.length === 0`, return formula-only results rather than undefined/NaN. This is the exact same principle for the exploration budget: when `sample_size = 0` for all profiles, return the conservative OpenRouter default rather than attempting any affinity or exploration logic. (*category: pattern*)
  - *Applies because*: The routing dispatch must short-circuit to conservative defaults immediately when the affinity table is empty, rather than running through affinity logic that will always produce null results. This avoids unnecessary DB queries on every dispatch during cold-start.

- **[APIP-0040 elaboration — threshold calibration risk]** The 85% success-rate threshold is documented as needing calibration (APIP-3040). The 10% exploration budget fraction has the same property — it is a starting estimate. Both must be externalized as named constants in `PipelineModelRouterConfig`, injectable via config for testing and future calibration. (*category: time_sink*)
  - *Applies because*: The story.yaml risk_notes explicitly flag: "10% exploration budget may spike costs during cold start." Exposing the fraction as a configurable named constant (`explorationBudgetFraction: z.number().min(0).max(1).default(0.1)`) allows operator tuning without code changes.

- **[APIP-3040 seed — cold-start fallback is APIP-3070's responsibility]** APIP-3040 explicitly defers the cold-start exploration budget mechanism to APIP-3070. The APIP-3040 story seed states: "APIP-3070 extends this with exploration budget logic." APIP-3070 must design its routing tier as an extension to APIP-3040's three-tier chain, not a replacement. (*category: pattern*)
  - *Applies because*: The routing precedence after APIP-3070 should be: (1) `wint.model_assignments` DB override → (2) affinity-guided (confidence ≥ medium) → (3) exploration slot (10% random Ollama, when budget allows) → (4) conservative OpenRouter default.

### Blockers to Avoid (from past stories)

- **Starting APIP-3070 before APIP-3040 merges**: The entire value of APIP-3070 is extending the learning-aware routing. Implementing cold-start logic without the base three-tier structure means duplicating or conflicting with APIP-3040's routing logic.
- **Hardcoding the 10% exploration fraction or OpenRouter model names**: Both must be named constants in `PipelineModelRouterConfig`. Magic numbers make calibration a code-change event.
- **Using the Ollama exploration slot for change types with zero affinity data**: On cold-start day 1, there is no evidence that Ollama succeeds for any change type. The exploration budget is for discovering new data points — but if Ollama is used as the primary change-loop model before any profile exists, failures will block the pipeline. The exploration slot should supplement (not replace) the conservative OpenRouter default.
- **Making manual profile seeding a required step**: The story.yaml explicitly marks seeding as "optional manual profile seeding from model benchmark data." If seeding is not performed, the system must still operate safely using conservative OpenRouter defaults.
- **Treating the exploration budget as per-story-type rather than per-ChangeSpec-attempt**: The 10% budget is randomized at the individual ChangeSpec dispatch level — each attempt independently has a 10% chance of being routed to Ollama for exploration. It is not a 10%-of-all-stories allocation.
- **Not capping exploration on failing models**: If Ollama is repeatedly failing (high failure rate visible in `wint.change_telemetry`), the exploration budget should not continue routing to it. The exploration gate must respect a minimum success-rate floor even for exploration attempts (e.g., never explore a model with a known success_rate < 0.3 from early data).

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| APIP ADR-001 Decision 4 | Local Dedicated Server | `PipelineModelRouter` runs on-process. In-memory exploration state (counters, flags) is valid for single-process Phase 0–3. Document limitation for Phase 4+ multi-process scale. |
| APIP ADR-001 Decision 2 | Plain TypeScript Supervisor | Exploration and cold-start logic lives in `PipelineModelRouter`, called from within worker graph nodes via config injection. Supervisor does not directly call routing logic. |
| ADR-002 | Infrastructure-as-Code Strategy | Any new DB table for manual seed storage must use a standalone SQL migration file (APIP-5007 naming convention), not CloudFormation changes. |
| ADR-005 | Testing Strategy — UAT Must Use Real Services | Integration tests for routing behavior (cold-start → conservative default, exploration slot → Ollama) must use real test PostgreSQL with `wint.model_affinity` fixture rows (or intentionally empty table) — no in-memory fakes. |
| ADR-006 | E2E Tests Required in Dev Phase | No frontend impact. ADR-006 E2E Playwright requirement does not apply. Skip condition: `frontend_impacted: false`. |

### Patterns to Follow

- Extend `PipelineModelRouter` in-place — cold-start and exploration are new code paths within `dispatch()`, not new classes
- Four-tier routing precedence: (1) `wint.model_assignments` DB override → (2) affinity-guided (confidence ≥ medium, success_rate ≥ threshold) → (3) exploration slot (10% random Ollama when budget not exhausted) → (4) conservative OpenRouter default
- Named constants for all configuration values: `explorationBudgetFraction`, `conservativeOpenRouterModel`, `explorationMinSuccessRateFloor`
- Cold-start detection: check if `wint.model_affinity` has zero qualifying rows (all `confidence_level = 'none'`) — if so, skip tiers 2 and 3, go directly to tier 4 (conservative default)
- Per-ChangeSpec-attempt random exploration: use a seeded PRNG or `Math.random()` at dispatch time; if random value < `explorationBudgetFraction`, route to Ollama exploration
- Structured log on every routing decision: `{ source: 'cold_start' | 'exploration' | 'affinity' | 'db_assignment' | 'fallback', model, provider, change_type, file_type, confidence_level, success_rate }`
- Zod-first types for any new schema types
- Unit tests for each routing tier and cold-start short-circuit path
- Integration test against real test DB with empty `wint.model_affinity` (cold-start scenario) and partially-filled (mixed confidence scenario)

### Patterns to Avoid

- Replacing or removing any existing routing tier — APIP-3070 is additive only
- Routing on profiles with `confidence_level = 'none'` or `'low'` without the exploration budget mechanism
- Hardcoding model names, budget fractions, or success-rate floors as inline literals
- Modifying any file in `packages/backend/orchestrator/src/models/` — protected
- TypeScript interfaces — Zod schemas with `z.infer<>` only
- `console.log` — use `@repo/logger` only
- Making manual seeding required — it is always optional

---

## Conflict Analysis

### Conflict: Three upstream stories not yet merged (APIP-0040, APIP-3020, APIP-3040)
- **Severity**: warning
- **Description**: APIP-3070 is the twelfth and final story on the critical path. It depends on APIP-3040 (Learning-Aware Model Router), which in turn depends on APIP-3020 (Model Affinity Profiles) and APIP-0040 (Model Router v1). None of these are merged to main. APIP-3070 cannot be implemented until all three predecessors are complete. Even elaboration should be treated as forward-planning until APIP-3040 is in progress.
- **Resolution Hint**: Gate APIP-3070 implementation on APIP-3040 merging. Elaboration and seed documentation can proceed now. The story.yaml `depends_on: ["APIP-3040"]` already encodes this dependency. The PM seed may be written freely, but the dev feasibility and test plan authors should note the implementation gate explicitly.

### Conflict: Manual benchmark seeding data source is undefined
- **Severity**: warning
- **Description**: The story.yaml feature description mentions "optional manual profile seeding from model benchmark data." No benchmark dataset, data format, or seeding mechanism exists in the codebase today. The shape of "model benchmark data" is undefined — it is unclear whether this refers to external benchmark suites (e.g., HumanEval scores), internal test harness results, or manually curated `wint.model_affinity` rows. The seeding format must be specified before implementation.
- **Resolution Hint**: During elaboration, define the seeding format as a Zod-validated YAML or JSON seed file that maps `(model, change_type, file_type)` → `(success_rate, sample_size, confidence_level)` tuples. The seed import should be a one-shot CLI command or script that writes directly to `wint.model_affinity` using the existing `ModelAffinityInsertSchema` — no new table required. The data source is left to operator judgment.

### Conflict: Exploration budget cost spike risk is not bounded by a success-rate floor
- **Severity**: warning
- **Description**: The story.yaml risk_notes flag: "10% exploration budget may spike costs during cold start." A purely random 10% Ollama allocation with no floor on minimum known success rate could repeatedly send ChangeSpecs to Ollama models that have already demonstrated poor performance in early telemetry. The exploration budget needs a minimum success-rate floor (or a minimum-samples guard) to prevent runaway failures from a poor-performing Ollama model.
- **Resolution Hint**: Add `explorationMinSuccessRateFloor: z.number().min(0).max(1).default(0.3)` to `PipelineModelRouterConfig`. Before assigning an exploration slot to Ollama, check if any early affinity data shows `success_rate < floor` — if so, skip exploration and fall through to conservative OpenRouter default. When `sample_size = 0`, exploration is always allowed (no evidence of failure yet).

---

## Story Seed

### Title

Cold Start Bootstrapping and Exploration Budget

### Description

The autonomous pipeline's Learning-Aware Model Router (APIP-3040) delivers empirically-guided model routing once `wint.model_affinity` accumulates high-confidence profiles (sample_size ≥ 20). However, on day 1 before any telemetry flows through the system, every profile has `confidence_level = 'none'` and `sample_size = 0`. Without an explicit cold-start strategy, the pipeline would fall back to the static Ollama → OpenRouter → Anthropic escalation chain for 100% of dispatches — potentially routing to Ollama (cheapest but least reliable) for all code generation tasks where Ollama has no empirical track record.

APIP-3070 solves this by adding two complementary mechanisms on top of APIP-3040's three-tier routing:

**1. Conservative OpenRouter defaults** — When `wint.model_affinity` has zero qualifying profiles for a given `(change_type, file_type)` combination (cold-start state), the router bypasses the static escalation chain and routes directly to a pre-configured conservative OpenRouter model. This ensures cost-effective, reliable code generation from day one without relying on Ollama's unverified performance.

**2. 10% random Ollama exploration budget** — While conservative defaults handle the primary routing path, APIP-3070 introduces a configurable exploration budget: on each individual ChangeSpec dispatch, a random 10% of attempts are routed to Ollama (or another exploration model) to accumulate telemetry data. This controlled exploration feeds `wint.change_telemetry` → Pattern Miner → `wint.model_affinity` with real performance data, accelerating the ramp-up to high-confidence affinity profiles.

**3. Optional manual profile seeding** — Operators may optionally pre-populate `wint.model_affinity` from external model benchmark data (e.g., published HumanEval scores, internal spike results) to accelerate the transition from cold-start to affinity-guided routing. Seeding is always optional — the system operates safely without it.

**4. Profile confidence gating** — The router's affinity-guided tier (tier 2) gates on `confidence_level IN ('medium', 'high')`. APIP-3040 defines this gate. APIP-3070 extends it with the exploration budget mechanics and makes the transition from "exploration mode" to "affinity mode" observable via structured log fields.

The four-tier routing precedence after APIP-3070:
1. `wint.model_assignments` DB override (always wins, operator control)
2. Affinity-guided selection (confidence ≥ medium, success_rate ≥ threshold — from APIP-3040)
3. Exploration slot (10% random Ollama, only when success-rate floor not violated)
4. Conservative OpenRouter default (cold-start and all other fallbacks)

No cold-start mechanism, exploration budget, or seeding capability exists anywhere in the pipeline today.

### Initial Acceptance Criteria

- [ ] AC-1: `PipelineModelRouterConfig` (Zod schema, post-APIP-3040) is extended with the following new named-constant fields: `conservativeOpenRouterModel: z.string().min(1).default('openrouter/anthropic/claude-3-haiku')`, `explorationBudgetFraction: z.number().min(0).max(1).default(0.1)`, `explorationMinSuccessRateFloor: z.number().min(0).max(1).default(0.3)`, and `manualSeedEnabled: z.boolean().default(false)`. No TypeScript interfaces. All values are injectable via config for tests.

- [ ] AC-2: `PipelineModelRouter.dispatch()` implements a cold-start detection check before running affinity lookup: if `wint.model_affinity` has zero rows with `confidence_level IN ('medium', 'high')` for all `(change_type, file_type)` combinations (i.e., the affinity cache is empty or all profiles are 'none'/'low'), the router short-circuits directly to the conservative OpenRouter default (tier 4) without executing tier 2 or tier 3. This avoids unnecessary DB queries on every dispatch during cold-start.

- [ ] AC-3: The Profile Confidence Gate is implemented as the routing entry point to tier 2: a profile is considered qualifying only when both `confidence_level IN ('medium', 'high')` AND `sample_size >= affinityMinSampleSize` (from APIP-3040 config). If no qualifying profile exists for the dispatched `(change_type, file_type)`, the router proceeds to tier 3 (exploration) rather than falling through to tier 4 directly.

- [ ] AC-4: The 10% exploration budget is implemented as a per-ChangeSpec-attempt probabilistic gate in tier 3: at each `dispatch()` call that reaches tier 3, the router samples `Math.random()` (or an injected PRNG for testing) and if the value is less than `explorationBudgetFraction`, routes the attempt to the configured exploration model (Ollama). The exploration assignment is skipped (falls to tier 4) if: (a) the exploration model has any `wint.model_affinity` entry for the `(change_type, file_type)` with `success_rate < explorationMinSuccessRateFloor` and `sample_size > 0`, or (b) the Ollama provider is unavailable.

- [ ] AC-5: Optional manual profile seeding is implemented as a standalone utility function `importAffinitySeeds(seeds: ManualAffinitySeedEntry[], db: Db): Promise<SeedImportResult>` exported from a new file `packages/backend/orchestrator/src/pipeline/affinity-seeder.ts`. The function accepts a Zod-validated array of `ManualAffinitySeedEntrySchema` objects (each containing `model`, `change_type`, `file_type`, `success_rate`, `sample_size`, `confidence_level`) and upserts them into `wint.model_affinity` using the same `ON CONFLICT (model, change_type, file_type) DO UPDATE SET` pattern defined by APIP-3020. Returns `{ seeded: number, skipped: number, errors: SeedImportError[] }`.

- [ ] AC-6: `importAffinitySeeds()` applies the same confidence level assignment logic (`CONFIDENCE_THRESHOLDS` from APIP-3020's pattern-miner.ts) to any seed entries that provide `sample_size` but not an explicit `confidence_level`, ensuring consistency between mined and seeded profiles.

- [ ] AC-7: Every `dispatch()` call that routes via the cold-start default (tier 4) logs a structured `@repo/logger` entry with `{ source: 'cold_start', model: conservativeOpenRouterModel, provider: 'openrouter', change_type, file_type, reason: 'no_qualifying_profiles' }`. Every exploration slot assignment (tier 3) logs `{ source: 'exploration', model: ollamaModel, provider: 'ollama', change_type, file_type, exploration_fraction: explorationBudgetFraction }`. These fields extend the existing routing-decision log format from APIP-3040 (AC-7 of that story).

- [ ] AC-8: An `invalidateAffinityCache()` call (defined by APIP-3040) also resets the cold-start detection state, so that after the Pattern Miner runs and populates new high-confidence profiles, the next dispatch re-evaluates whether cold-start mode still applies rather than serving a stale "all profiles empty" result.

- [ ] AC-9: Unit tests (Vitest) cover: (a) cold-start detection triggers tier-4 conservative default when affinity cache is empty, (b) exploration slot assigned when `Math.random() < explorationBudgetFraction` (inject mock PRNG returning 0.05), (c) exploration slot skipped when `Math.random() >= explorationBudgetFraction` (inject mock PRNG returning 0.5) — falls through to tier 4, (d) exploration skipped when known `success_rate < explorationMinSuccessRateFloor`, (e) exploration allowed when `sample_size = 0` (no floor violation), (f) `importAffinitySeeds()` upserts valid seed entries and returns correct counts, (g) `invalidateAffinityCache()` resets cold-start detection state, (h) `PipelineModelRouterConfig` extension fields accept valid values and apply correct defaults.

- [ ] AC-10: Integration test (Vitest, real APIP-5001 test PostgreSQL): (a) dispatch with empty `wint.model_affinity` → logs `source: 'cold_start'`, routes to `conservativeOpenRouterModel`; (b) after `importAffinitySeeds()` inserts one high-confidence seed, dispatch routes via affinity (not cold-start); (c) dispatch with only low-confidence profiles present → exploration slot test with injected PRNG returning 0.05 → routes to Ollama; (d) after `invalidateAffinityCache()` with newly high-confidence profiles, cold-start detection no longer triggers.

- [ ] AC-11: All existing APIP-0040 and APIP-3040 unit tests continue to pass. No file in `packages/backend/orchestrator/src/models/` is modified. Rate limiting, budget accumulation, escalation chain, and affinity routing behaviors from APIP-0040 and APIP-3040 are unaffected by APIP-3070's additive changes.

- [ ] AC-12: `ManualAffinitySeedEntrySchema` is defined in `packages/backend/orchestrator/src/pipeline/affinity-seeder.ts` using Zod: `z.object({ model: z.string().min(1), change_type: z.string().min(1), file_type: z.string().min(1), success_rate: z.number().min(0).max(1), sample_size: z.number().int().min(0), confidence_level: z.enum(['none', 'low', 'medium', 'high']).optional() })`. No TypeScript interfaces.

### Non-Goals

- Implementing the `wint.model_affinity` table or Pattern Miner cron — that is APIP-3020
- Implementing the three-tier affinity-guided routing — that is APIP-3040
- Implementing automatic threshold calibration or online learning — thresholds are configurable but not auto-tuned
- Building a UI or operator CLI for cold-start status — that is APIP-5005
- Building a general cron scheduling framework — that is APIP-3090
- Implementing per-provider cost tracking or budget accounting beyond the existing token budget from APIP-0040
- Making manual seeding required — it is always optional (AC-5 is an additive utility)
- Supporting multi-process exploration state sharing — Phase 0–3 is single-process per APIP ADR-001 Decision 4; this is a documented limitation
- Implementing exploration for non-Ollama models — the exploration slot targets Ollama (cheapest local model) as the primary exploration candidate; other models are future scope
- Modifying any file in `packages/backend/orchestrator/src/models/` (protected)
- Adding HTTP endpoints — no API surface

### Reuse Plan

- **Components**: None (no UI)
- **Patterns**: Extend `PipelineModelRouter.dispatch()` with cold-start detection and exploration probability gate; follow `PipelineModelRouterConfig` named-constant pattern from APIP-3040; reuse `CONFIDENCE_THRESHOLDS` from APIP-3020's pattern-miner.ts; reuse `invalidateAffinityCache()` invalidation pattern for cold-start state reset; follow `wint.model_assignments` DB-backed config pattern for any seed storage
- **Packages**: `packages/backend/orchestrator` (modify `src/pipeline/model-router.ts`; new file `src/pipeline/affinity-seeder.ts`); `@repo/logger` for all routing decision logging; `@repo/db` for Drizzle seed upsert

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- **No UI impact**: ADR-006 E2E Playwright requirement does not apply (`frontend_impacted: false`).
- **Three test tiers**:
  - *Unit tests* (Vitest, mocked DB): Cover all 8 AC-9 sub-cases. Inject a mock PRNG for deterministic exploration slot testing. Inject a mock affinity reader to simulate empty cache (cold-start), low-confidence profiles, and high-confidence profiles. All unit tests must run in CI without a real database.
  - *Integration tests* (Vitest + real APIP-5001 test PostgreSQL, tagged `@integration`): AC-10 four sub-cases: empty affinity table → cold-start default, seed import → affinity routing, low-confidence only → exploration, cache invalidation → cold-start re-evaluation.
  - *Regression tests*: Run full APIP-0040 and APIP-3040 test suites unchanged (AC-11).
- **Key edge cases**:
  - `explorationBudgetFraction = 0.0` (disable exploration entirely) → always falls to tier 4
  - `explorationBudgetFraction = 1.0` (always explore, testing scenario) → always routes to Ollama unless floor violated
  - Ollama provider unavailable during exploration slot → graceful fallthrough to tier 4 with `source: 'cold_start'` log
  - `importAffinitySeeds()` with duplicate entries → idempotent upsert, returns correct `seeded` count
- **Per ADR-005**: Integration tests for seed import and cold-start detection must use real PostgreSQL — no in-memory substitute.
- **Timing**: All AC tests are gated on APIP-3040 merging. Unit tests can be written against spec during elaboration; integration tests require the real `wint.model_affinity` table from APIP-3020.

### For UI/UX Advisor

- No UI impact. APIP-3070 is entirely headless.
- The primary operator-visible output is structured log entries from `@repo/logger`. The new fields `source: 'cold_start' | 'exploration'` extend the existing APIP-3040 routing log. These fields should feed APIP-5005 (Minimal Operator CLI) for observability of the cold-start → affinity transition.
- Consider defining a human-readable "pipeline maturity level" concept based on the fraction of `(change_type, file_type)` combinations with `confidence_level = 'high'`: a percentage that indicates how far the system has progressed from cold-start. This is observability-only and deferred to APIP-5005.
- The manual seeding feature (`importAffinitySeeds()`) could benefit from a simple CLI command in APIP-5005 (`pipeline seed-affinity --file seeds.yaml`) to make it operator-accessible without requiring a custom script.

### For Dev Feasibility

- **Implementation gate**: APIP-3040 must be merged before APIP-3070 implementation begins. Confirm that `PipelineModelRouterConfig`, `PipelineModelRouter.dispatch()`, and `invalidateAffinityCache()` exist and are stable before writing any APIP-3070 code.
- **Routing tier extension point**: The exploration budget (tier 3) should be inserted between tier 2 (affinity) and tier 4 (conservative default) in `dispatch()`. The implementation requires adding a single `else if` branch after the affinity check, using `Math.random()` (or injected PRNG) and calling an internal `_checkExplorationEligibility(changeType, fileType)` helper.
- **PRNG injection for tests**: `Math.random()` is not injectable. The implementation should accept an optional `randomFn: () => number = Math.random` in `PipelineModelRouterConfig` or as a constructor argument. This enables deterministic unit test coverage of the exploration slot.
- **Cold-start detection strategy**: The simplest implementation is: check if `this._affinityCache` (Map from APIP-3040) has any entry with a qualifying profile after `queryAffinityProfile()` returns null for the current `(change_type, file_type)`. This avoids an additional full-table scan. An alternative is a cached flag `this._hasAnyHighConfidenceProfile: boolean` that is populated lazily and reset on `invalidateAffinityCache()`.
- **Affinity seeder as separate file**: `affinity-seeder.ts` is a standalone utility, not a graph. It exports a single async function. No `StateGraph` or cron structure needed. Import and call directly from scripts or the operator CLI (APIP-5005).
- **Canonical references for subtask decomposition**:
  - Router to extend: `packages/backend/orchestrator/src/pipeline/model-router.ts` (post-APIP-3040)
  - Confidence threshold constants to reuse: `packages/backend/orchestrator/src/graphs/pattern-miner.ts` (post-APIP-3020)
  - Seed upsert pattern: `wint.model_affinity` `ON CONFLICT DO UPDATE` from APIP-3020's pattern-miner.ts
  - Zod-first type pattern: `packages/backend/orchestrator/src/artifacts/story.ts`
- **Risk — exploration budget during cold-start cost spike**: Mitigated by `explorationMinSuccessRateFloor` (AC-4). When `sample_size = 0`, exploration is allowed regardless of floor (no evidence of failure). Monitor `wint.change_telemetry` after deployment; if Ollama failure rate is high, lower `explorationBudgetFraction` via config update.
- **Risk — `Math.random()` non-determinism in production vs test**: Always inject a PRNG via config. In production, `Math.random` is the default. In unit tests, inject a deterministic function.
- **File to create**: `packages/backend/orchestrator/src/pipeline/affinity-seeder.ts` (new file for seeding utility)
- **File to modify**: `packages/backend/orchestrator/src/pipeline/model-router.ts` (additive changes to `dispatch()` and `PipelineModelRouterConfig`)
