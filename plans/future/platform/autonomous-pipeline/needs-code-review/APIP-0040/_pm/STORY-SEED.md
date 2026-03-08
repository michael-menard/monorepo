---
generated: "2026-02-25"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: true
conflicts_found: 3
blocking_conflicts: 0
---

# Story Seed: APIP-0040

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No knowledge-base lessons available (KB query not available in this agent context); ADR-LOG and APIP epic ADRs loaded manually.

### Relevant Existing Features

| Feature | Location | Status | Notes |
|---------|----------|--------|-------|
| ModelRouter (tier-based selection) | `packages/backend/orchestrator/src/models/unified-interface.ts` | Deployed/Active | Full tier 0–3 selection, escalation, quality-trigger de-escalation, provider caching |
| Task-based selector | `packages/backend/orchestrator/src/models/task-selector.ts` | Deployed/Active | TaskContract-driven tier escalation with Ollama filter |
| Strategy loader + cache | `packages/backend/orchestrator/src/models/strategy-loader.ts` | Deployed/Active | YAML-driven 4-tier config, 30s TTL cache, Zod validated, DFS circular-path check |
| Token budget schemas + check | `packages/backend/orchestrator/src/utils/token-budget.ts` | Deployed/Active | Phase-level limits (advisory/warning/soft_gate/hard_gate), no cross-story accumulation yet |
| model-assignments.ts | `packages/backend/orchestrator/src/config/model-assignments.ts` | Deployed/Active | Legacy YAML-backed agent→model map; Zod-validated |
| Provider adapters | `packages/backend/orchestrator/src/providers/` | Deployed/Active | Anthropic, OpenRouter, Ollama with `ILLMProvider` interface |
| BullMQ work queue (APIP-0010) | `packages/backend/orchestrator/src/` (to be built) | Backlog | Dependency; queue dispatch is the callers that invoke the model router |
| `wint` DB schema | `packages/backend/database-schema/src/schema/wint.ts` | Deployed/Active | pgSchema 'wint', story management, telemetry, ML pipeline tables |

### Active In-Progress Work

| Story | Status | Overlap Risk | Notes |
|-------|--------|--------------|-------|
| APIP-5006 | In Elaboration | Low | Server infrastructure baseline; orthogonal concern — model router is process-local |
| APIP-0010 | Backlog | Medium | BullMQ queue — APIP-0040 must expose a callable interface usable by the BullMQ job processor spawned in APIP-0020 |

### Constraints to Respect

- BullMQ is the queue backend (ADR-001 Decision 1); no `wint.work_queue` PostgreSQL table. Queue state lives in Redis.
- Plain TypeScript supervisor for Phase 0 (ADR-001 Decision 2); the model router is invoked from worker graph nodes, not a LangGraph supervisor node.
- All pipeline components run on a dedicated local server — no AWS Lambda (ADR-001 Decision 4).
- Zod-first types (REQUIRED per CLAUDE.md) — no TypeScript interfaces.
- `@repo/logger` for all logging; never `console.log`.
- No barrel files — import directly from source files.
- Protected features: do NOT modify `ModelRouter`, `task-selector`, or `strategy-loader` in `packages/backend/orchestrator/src/models/`. APIP-0040 wraps/extends, it does not replace.
- COST-CONTROL-001 (epic review concern, severity high): APIP-0040 AC must include circuit breaker enforcement **before APIP-1030 starts**. This is the primary scope driver for this story.
- APIP-5004 (Secrets Engine) depends on APIP-0040 and will inject API keys at deployment; APIP-0040 must not hard-code provider credentials — read from environment.

---

## Retrieved Context

### Related Endpoints

Not applicable — this is internal pipeline infrastructure with no HTTP API surface.

### Related Components

**Existing model infrastructure to build upon:**

- `packages/backend/orchestrator/src/models/unified-interface.ts` — `ModelRouter` + `ModelRouterFactory` (singleton). Rate limiting and token budgets slot in alongside this class, not inside it.
- `packages/backend/orchestrator/src/models/task-selector.ts` — `selectModelForTask()` handles contract-based tier selection + Ollama filtering. Budget de-escalation (`budgetTokens` field in `TaskContract`) already partially wired; this story completes the runtime enforcement.
- `packages/backend/orchestrator/src/utils/token-budget.ts` — `checkTokenBudget()` with phase limits, enforcement levels (`hard_gate` → `action: 'fail'`). Currently used per-phase in the workflow orchestrator; APIP-0040 adapts this to per-story accumulation across all pipeline phases.
- `packages/backend/orchestrator/src/config/model-assignments.ts` — legacy YAML config; APIP-0040 introduces a DB-backed `wint.model_assignments` table to make model assignment configurable without code deploys.

### Reuse Candidates

| Item | Location | Reuse Rationale |
|------|----------|-----------------|
| `checkTokenBudget()` | `packages/backend/orchestrator/src/utils/token-budget.ts` | Phase-level enforcement logic is directly reusable for per-story accumulation |
| `ModelRouter` / `ModelRouterFactory` | `packages/backend/orchestrator/src/models/unified-interface.ts` | Wrap in `PipelineModelRouter` that adds rate limiting + budget tracking |
| `ILLMProvider` interface | `packages/backend/orchestrator/src/providers/base.ts` | Provider abstraction must be preserved through the new routing layer |
| `TaskContract` / `TaskContractSchema` | `packages/backend/orchestrator/src/models/__types__/task-contract.ts` | Budget token field already exists; extend for story-level budget reference |
| Drizzle ORM pattern | `packages/backend/database-schema/src/schema/wint.ts` | Follow exact pattern for new `wint.model_assignments` table |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Zod-first TypeScript module with logger | `packages/backend/orchestrator/src/models/unified-interface.ts` | Clean Zod schemas, singleton factory, `@repo/logger` throughout, async initialization pattern |
| Token budget enforcement logic | `packages/backend/orchestrator/src/utils/token-budget.ts` | Phase limits, enforcement levels, hard-gate action logic — directly extensible |
| Drizzle schema in wint pgSchema | `packages/backend/database-schema/src/schema/wint.ts` | Pattern for adding new table to the `wint` pgSchema namespace with drizzle-zod |
| Task-contract driven selection | `packages/backend/orchestrator/src/models/task-selector.ts` | Escalation/de-escalation logic with budget awareness — the call site for the new rate limiter |

---

## Knowledge Context

### Lessons Learned

KB query was not available. The following lessons are inferred from the epic elaboration artifacts and existing code review:

- **[WINT-0230]** Singleton factory pattern for `ModelRouter` was essential — multiple instantiations caused strategy-file re-reads. APIP-0040's `PipelineModelRouter` or equivalent must use the same singleton pattern.
  - *Applies because*: Rate limiter state (token bucket counters) must be shared across all callers; a new instance per call would break isolation.

- **[MODL-0020]** Strategy YAML loaded with 30s TTL cache. Cache invalidation on hot-reload was a source of test flakiness.
  - *Applies because*: DB-backed `wint.model_assignments` config needs its own TTL or invalidation strategy. Invalidating on write avoids stale config without polling overhead.

- **[Epic COST-CONTROL-001]** No hard-cap token budget circuit breaker defined — runaway token costs are HIGH risk.
  - *Applies because*: This is the primary driver for APIP-0040. The circuit breaker (`action: 'fail'` at hard_gate) must be wired to a hard stop that surfaces to the BullMQ job processor as a non-retriable failure.

### Blockers to Avoid (from past stories)

- Do not implement provider API key reads inside the model router — APIP-5004 owns secrets injection. Read from environment variables only.
- Do not modify `ModelRouter.selectModelForAgent()` or `selectModelForTask()` in place — APIP-0040 wraps them. Changing the existing router risks breaking WINT/MODL stories currently in UAT.
- Token bucket state must be process-persistent (in-memory Map or Redis). A naive per-request instantiation will reset buckets on every call and provide no actual rate limiting.
- The escalation chain (Ollama → OpenRouter → Claude) must not silently swallow errors when a provider is rate-limited or unavailable. Each level must log explicitly and rethrow or return a structured error — never fall through to success.
- Budget cap hard-stop must produce a distinct error type (not generic `Error`) so the BullMQ job processor can distinguish budget exhaustion (permanent, do not retry) from transient failures (retry eligible).

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-001 (APIP) Decision 1 | BullMQ for queue | No `wint.work_queue` table. Model router is invoked inside BullMQ job processor callbacks. |
| ADR-001 (APIP) Decision 2 | Plain TS supervisor | Model router is called from worker graph nodes, not a supervisor node. |
| ADR-001 (APIP) Decision 4 | Local dedicated server | No Lambda — no 15-min timeout concern for the router itself. |
| ADR-002 (platform) | Infrastructure as Code | New `wint.model_assignments` table needs a migration SQL file in `apps/api/knowledge-base/src/db/migrations/` or the main schema migration path. |
| ADR-005 (platform) | UAT uses real services | UAT tests for APIP-0040 must invoke real Ollama/OpenRouter/Claude endpoints; no MSW mocking. |

### Patterns to Follow

- Zod-first types throughout — `z.infer<typeof Schema>` for all exported types.
- `@repo/logger` structured logging with domain string (`'pipeline_model_router'`, `'rate_limiter'`, `'budget_enforcer'`).
- `ModelRouterFactory` singleton pattern for the new pipeline router wrapper.
- Drizzle ORM for `wint.model_assignments` table; `drizzle-zod` for schema-derived validation.
- `checkTokenBudget()` as the core enforcement primitive; APIP-0040 adds a per-story accumulator that feeds into it.
- Hard-gate budget exhaustion produces a typed error class (`BudgetExhaustedError extends Error`) so callers can distinguish it.

### Patterns to Avoid

- Do not use `console.log` anywhere.
- Do not create barrel files (`index.ts` re-exports).
- Do not hard-code API keys or provider credentials.
- Do not instantiate `ModelRouter` directly inside rate-limiting or budget-tracking logic (creates multiple strategy loads). Always go through `ModelRouterFactory.getInstance()`.
- Do not use TypeScript `interface` — use Zod schemas.
- Do not implement a polling loop to watch for config changes in `wint.model_assignments` — invalidate on write only.

---

## Conflict Analysis

### Conflict: Protected area — existing ModelRouter

- **Severity**: warning
- **Description**: `packages/backend/orchestrator/src/models/unified-interface.ts` (ModelRouter) and `task-selector.ts` are in UAT/active use by WINT and MODL stories. APIP-0040 must not modify these files.
- **Resolution Hint**: Create a new `PipelineModelRouter` class (or `RateLimitedModelRouter`) in `packages/backend/orchestrator/src/pipeline/` that wraps `ModelRouterFactory.getInstance()`. This keeps WINT/MODL unaffected and gives APIP-0040 its own extension point.

### Conflict: DB-backed model_assignments vs existing YAML config

- **Severity**: warning
- **Description**: The existing `model-assignments.ts` reads from a YAML file (`model-assignments.yaml`). The story.yaml specifies a `wint.model_assignments` DB table. These two configs will coexist during transition.
- **Resolution Hint**: Implement `wint.model_assignments` as an additive layer — the DB table overrides YAML config for pipeline-specific agents. Legacy YAML config remains untouched and continues to serve the non-pipeline workflow.

### Conflict: APIP-5004 dependency direction

- **Severity**: warning
- **Description**: APIP-5004 (Secrets Engine) lists `APIP-0040` as its dependency, implying the model router must exist before secrets injection is wired. However, the model router needs API keys to call providers. During Phase 0, keys must be read from environment variables (`.env` file); APIP-5004 replaces this with vault injection in a follow-up.
- **Resolution Hint**: Document the env-var interface (e.g., `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`) as the accepted contract for Phase 0. APIP-5004 satisfies this interface via secrets injection without any code changes to APIP-0040.

---

## Story Seed

### Title

Model Router v1 with Rate Limiting and Token Budgets

### Description

**Context**: The autonomous pipeline dispatches AI model calls for every phase of story development (elaboration, implementation, review, QA, merge). Without cost controls, a single runaway story could exhaust monthly model budgets. The existing `ModelRouter` in `packages/backend/orchestrator/src/models/` provides tier-based model selection and escalation logic, but has no per-provider rate limiting, no per-story token budget tracking, and no DB-backed configuration surface.

**Problem**: When APIP-1030 (Implementation Graph) begins executing real stories, each story can spawn dozens of LLM calls across multiple providers. Without a hard budget cap circuit breaker, a single implementation loop failure causing infinite retries could cost hundreds of dollars. The epic review (COST-CONTROL-001, severity: high) mandates that APIP-0040 provides this cap before APIP-1030 starts.

**Proposed Solution**: Build a `PipelineModelRouter` wrapper (in a new `pipeline/` subdirectory of the orchestrator) that:
1. Wraps the existing `ModelRouter` with a **token-bucket rate limiter** per provider (Ollama, OpenRouter, Claude/Anthropic)
2. Tracks **per-story cumulative token spend** and enforces a configurable hard budget cap using the existing `checkTokenBudget()` `hard_gate` enforcement level
3. Implements the **Ollama → OpenRouter → Claude escalation chain** with explicit error logging at each step (no silent swallowing)
4. Reads **model assignment overrides** from a new `wint.model_assignments` DB table (DB-backed config, no code deploy needed to swap models)
5. Surfaces **budget exhaustion** as a typed `BudgetExhaustedError` so BullMQ job processors can mark the job as permanently failed (no retry)

### Initial Acceptance Criteria

- [ ] AC-1: A `PipelineModelRouter` class is implemented in `packages/backend/orchestrator/src/pipeline/` with a singleton factory, wrapping `ModelRouterFactory.getInstance()` from the existing model router.
- [ ] AC-2: Token-bucket rate limiting is implemented per provider (Ollama, OpenRouter, Anthropic). Bucket capacity and refill rate are configurable via constructor options with documented defaults. Requests that exceed the rate limit wait (with configurable max-wait timeout) or throw `RateLimitExceededError`.
- [ ] AC-3: Per-story token budget accumulation is implemented. Each call to `PipelineModelRouter.dispatch()` records input + output tokens against the story's running total.
- [ ] AC-4: When a story's cumulative token spend reaches the configured hard cap, `PipelineModelRouter.dispatch()` throws `BudgetExhaustedError` (a distinct named error class). The error must include `storyId`, `tokensUsed`, and `budgetCap` fields.
- [ ] AC-5: The escalation chain (Ollama → OpenRouter → Claude) is implemented. Each escalation step logs the provider, failure reason, and next provider attempted via `@repo/logger`. Exhausting all providers without success throws `ProviderChainExhaustedError`.
- [ ] AC-6: A `wint.model_assignments` table is added via a new Drizzle migration. Schema: `id uuid PK`, `agent_pattern text` (glob-style), `provider text`, `model text`, `tier int`, `effective_from timestamptz`, `created_at timestamptz`. `PipelineModelRouter` queries this table on initialization and caches results with cache-invalidation on write.
- [ ] AC-7: `PipelineModelRouter` reads provider API keys exclusively from environment variables (`ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`). No credentials in source code.
- [ ] AC-8: Unit tests cover: token-bucket rate limiting (bucket fills, bucket exhaustion, refill), per-story budget accumulation, `BudgetExhaustedError` thrown at cap, escalation chain iteration, `ProviderChainExhaustedError` when all providers fail, DB config override precedence over YAML fallback.
- [ ] AC-9: Integration test verifies the full `Ollama → OpenRouter → Claude` escalation path against a test harness (not real providers). Mock providers use the `ILLMProvider` interface.
- [ ] AC-10: `PipelineModelRouter` does not modify any file in `packages/backend/orchestrator/src/models/`. Existing WINT/MODL tests continue to pass.

### Non-Goals

- Do not implement AI-driven model affinity or learning-based routing (deferred to APIP-3040, Learning-Aware Model Router).
- Do not implement concurrency limits for parallel story execution (deferred to APIP-3080).
- Do not implement secrets vault integration — use environment variables only. APIP-5004 handles vault.
- Do not add a UI or CLI surface for the model router configuration — operator visibility is out of scope (deferred to APIP-5005).
- Do not modify `packages/backend/orchestrator/src/models/` files (ModelRouter, task-selector, strategy-loader). Those are protected by active WINT/MODL UAT coverage.
- Do not implement cron-based budget reset (deferred; Phase 0 budget is per-story lifetime, not per-day).

### Reuse Plan

- **Components**: `ModelRouterFactory.getInstance()` from `unified-interface.ts`; `checkTokenBudget()` from `token-budget.ts`; `ILLMProvider` from `providers/base.ts`; `TaskContract` / `TaskContractSchema` from `models/__types__/task-contract.ts`
- **Patterns**: Singleton factory (`ModelRouterFactory` pattern); Zod schema first; structured logging with domain string; typed error classes extending `Error`; Drizzle ORM in `wint` pgSchema
- **Packages**: `packages/backend/orchestrator` (extend, not modify); `packages/backend/database-schema` (add `wint.model_assignments` table); `@repo/logger`; `drizzle-orm`; `zod`

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- Rate limiting tests require deterministic time control — use `vi.useFakeTimers()` (Vitest) to simulate token bucket refill without wall-clock delays.
- `BudgetExhaustedError` and `ProviderChainExhaustedError` must have distinct `.name` properties so error classification in BullMQ job handlers can use `instanceof` checks reliably (prototype chains matter in transpiled TypeScript).
- Per ADR-005, UAT tests must invoke real Ollama, OpenRouter, and Anthropic endpoints — no MSW. Provide UAT skip condition for CI environments lacking live provider access (`e2e: not_applicable` unless provider credentials available in CI).
- Integration test for `wint.model_assignments` should use the test DB infrastructure established in APIP-5001 (Test Database Setup). Coordinate with that story's completion timeline.
- Key coverage gaps to fill: concurrent dispatch under rate limit (goroutine-style parallelism test using `Promise.all`), budget accumulation across multiple dispatches to same story, escalation chain when OpenRouter rate-limits mid-chain.

### For UI/UX Advisor

- No UI surface in this story. The story is pure backend infrastructure.
- The closest operator-visible surface is the Bull Board dashboard (from APIP-0010) which will display job failure reasons. Ensure `BudgetExhaustedError` and `RateLimitExceededError` messages are human-readable and include actionable details (storyId, cap value, usage amount).
- Future APIP-5005 (Operator CLI) will surface model routing decisions and budget consumption; ensure the `PipelineModelRouter` emits sufficient structured log events for that CLI to query.

### For Dev Feasibility

- **Recommended module location**: `packages/backend/orchestrator/src/pipeline/model-router.ts` (new file). Tests at `packages/backend/orchestrator/src/pipeline/__tests__/model-router.test.ts`.
- **Token bucket implementation**: Implement an in-memory `TokenBucket` class (Zod schema + class). Redis-backed token buckets are out of scope for Phase 0; in-memory is acceptable for the single dedicated server. If the supervisor is restarted, buckets reset — acceptable given BullMQ job persistence handles restart recovery separately.
- **DB migration**: Follow the pattern of existing migrations in `apps/api/knowledge-base/src/db/migrations/` (numbered SQL files). New file: `016_wint_model_assignments.sql`. The schema must use `CREATE TABLE IF NOT EXISTS wint.model_assignments (...)` to be idempotent.
- **Canonical reference for DB pattern**: `packages/backend/database-schema/src/schema/wint.ts` — copy the `wintSchema` import, use Drizzle column types, add `createInsertSchema`/`createSelectSchema` from `drizzle-zod`.
- **Escalation chain implementation**: The chain is a simple ordered array `['ollama', 'openrouter', 'anthropic']` tried in sequence. Each step calls `ModelRouterFactory.getInstance().getProvider(modelString)` then `provider.complete(...)`. On failure, log and try next. This is straightforward — estimated 1–2 days for full implementation + tests.
- **Sizing**: Story is well-scoped. No sizing warning in `story.yaml`. The DB migration + rate limiter + budget accumulator + escalation chain fits in a single story. Do not attempt to add Learning-aware routing or concurrency limits; those are separate stories.
- **Canonical references for implementation**:
  - `packages/backend/orchestrator/src/models/unified-interface.ts` — singleton factory, async init, Zod schemas
  - `packages/backend/orchestrator/src/utils/token-budget.ts` — phase limits, enforcement levels, `hard_gate` pattern
  - `packages/backend/orchestrator/src/models/task-selector.ts` — escalation logic, Ollama filter, structured logging
  - `packages/backend/database-schema/src/schema/wint.ts` — Drizzle table definition in `wint` pgSchema
