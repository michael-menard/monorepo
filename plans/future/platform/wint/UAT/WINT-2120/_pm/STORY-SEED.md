---
generated: "2026-03-06"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: WINT-2120

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Baseline predates WINT-2030/2040/2050/2060 completion; active story state sourced from index instead

### Relevant Existing Features

| Feature | Status | Relevance |
|---------|--------|-----------|
| Knowledge Base (pgvector) — `apps/api/knowledge-base/` | Deployed | KB search is the primary context source being supplemented/replaced by cache |
| Context Cache tables — `wint.context_packs` | Deployed (WINT-0010, WINT-0030) | The cache being measured; hitCount column tracks usage |
| `context_cache_get` MCP tool | UAT-verified (WINT-0100) | Used by agents to retrieve packs; hitCount incremented on each call |
| `context_cache_stats` MCP tool | UAT-verified (WINT-0100) | Returns `totalPacks`, `hitCount`, `avgHitsPerPack`, `expiredCount` — the primary measurement tool for this story |
| WINT-2110: Update 5 High-Volume Agents to Use Cache | needs-code-review | Direct dependency; provides AC-6 baseline token estimates and wires agents to use cache |
| WINT-2030/2040/2050/2060: Cache population stories | needs-code-review or failed-code-review | Populate the packs that agents will query; absence of populated packs makes before/after measurement partially synthetic |
| Orchestrator telemetry infrastructure | Pending (Phase 3) | Structured telemetry for agent invocations not yet available; benchmark must use proxy measures |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|--------------|
| WINT-2110 | needs-code-review | Direct dependency — baseline token estimates (AC-6) live in this story's artifacts; benchmark design must align with those baselines |
| WINT-2040 | failed-code-review | Populates `agent_missions` pack; cache miss expected until resolved; benchmark must handle null packs gracefully |
| WINT-3010 (Gatekeeper Sidecar) | pending | Phase 3 — no overlap |
| WINT-0120 (Telemetry MCP Tools) | pending | If available, structured invocation logging would strengthen measurement; not yet ready |

### Constraints to Respect

- `wint.context_packs` table schema is protected (WINT-0010) — do not alter
- `context_cache_get` and `context_cache_stats` MCP tools are deployed and UAT-verified — consume, do not modify
- ADR-005: benchmark scripts that run against real DB must not use mocking
- Token estimates from WINT-2110 AC-6 are rough approximations (file-size-based); the benchmark must acknowledge this and not treat them as precise measurements
- Phase 3 telemetry infrastructure (WINT-0040, WINT-0120) is not yet available — no `agent_invocations` table to query for actual token counts

---

## Retrieved Context

### Related Endpoints

None — this story is tooling/scripts only, no new HTTP endpoints.

### Related Components

- `packages/backend/mcp-tools/src/context-cache/context-cache-stats.ts` — returns `totalPacks`, `hitCount`, `avgHitsPerPack`, `expiredCount`; primary measurement input
- `packages/backend/mcp-tools/src/context-cache/context-cache-get.ts` — the tool whose invocation patterns are being measured
- `packages/backend/mcp-tools/src/context-cache/__types__/index.ts` — `packTypeValues` array; defines which pack types exist
- Agent files modified by WINT-2110 (7 `.agent.md` files) — the integration points that produce cache hits

### Reuse Candidates

- `calculateP95` and `calculateMedian` utilities from `packages/backend/orchestrator/src/adapters/__tests__/integration/performance-benchmarks.integration.test.ts` — established pattern for latency/performance measurement in this codebase
- WINT-2110 AC-6 baseline table (in story body) — the "before" side of the comparison; provides per-agent rough estimates (~2,000–6,500 tokens/invocation)
- WINT-2110 opp-1 KB entry recommends `_implementation/BASELINE-TOKENS.yaml` machine-readable format — this story should consume that artifact if WINT-2110 produces it
- `context_cache_stats()` MCP tool — already abstracts the DB query for cache metrics; use it rather than raw SQL
- `@repo/logger` — logging standard; all benchmark output must use this, not `console.log`

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Performance benchmark script structure | `packages/backend/orchestrator/src/adapters/__tests__/integration/performance-benchmarks.integration.test.ts` | Established p95/median calculation pattern, iteration-based measurement, advisory (non-blocking) benchmark assertions |
| Context cache stats usage | `packages/backend/mcp-tools/src/context-cache/context-cache-stats.ts` | The tool to query for cache hit metrics; shows input schema and return shape (`hitCount`, `avgHitsPerPack`, etc.) |
| Benchmark output as YAML evidence artifact | `packages/backend/orchestrator/src/adapters/__tests__/integration/performance-benchmarks.integration.test.ts` | Advisory benchmarks logged to EVIDENCE-style artifacts rather than hard test assertions |

---

## Knowledge Context

### Lessons Learned

- **[WINT-2110 opp-1]** Token baseline estimates should be a structured `BASELINE-TOKENS.yaml` artifact in `_implementation/` rather than a table in the story body — machine-readable format enables WINT-2120 to automate before/after comparison. (*category: observability*)
  - *Applies because*: This story IS the consumer of that artifact. If WINT-2110 produced `BASELINE-TOKENS.yaml`, the benchmark script should read it; if not, the story must define its own baseline ingestion strategy.

- **[WINT-2110 opp-3]** Token budget guards should be differentiated by model tier — haiku agents should have tighter injection limits (~500 tokens) than sonnet agents (~2,000 tokens). (*category: performance*)
  - *Applies because*: The 80% reduction target may be misleading as a single aggregate. Reduction percentages will differ by model tier; the benchmark should report per-agent or per-tier results rather than a single aggregate.

- **[APIP benchmarks]** Token cost benchmarks for LLM operations should acknowledge inherent measurement uncertainty; range estimates (e.g., 4-8x variability) are more honest than point estimates. (*category: performance*)
  - *Applies because*: The 80% reduction target is a goal, not a guarantee. The benchmark report should present a range and flag if estimates were used as a proxy for actual measurements.

- **[WINT-2050 opp-2]** Structured telemetry for cache population monitoring was deferred — current logging is via `@repo/logger` only. (*category: tooling*)
  - *Applies because*: Without Phase 3 telemetry, before/after token counts must use proxy measures (file sizes, manual estimates) rather than actual invocation logs. The story must clearly state measurement methodology and its limitations.

- **[WINT-9090 future opp]** No structured metrics for context cache nodes — cache hit rate and session latency are currently unobservable in production without log-scraping. (*category: observability*)
  - *Applies because*: `context_cache_stats()` hitCount is the best available proxy for cache usage; actual per-invocation token savings cannot be measured directly until Phase 3 telemetry exists.

### Blockers to Avoid (from past stories)

- Do not assume Phase 3 telemetry (`agent_invocations` table) is available — it is not yet implemented
- Do not require WINT-2040 agent_missions pack to be populated — it is in failed-code-review; benchmark must handle partial cache population gracefully
- Do not produce a benchmark script that can only run with all 7 agent packs populated — design for partial availability
- Do not use `console.log` — use `@repo/logger`
- Do not create hard-blocking test assertions for the 80% target — use advisory assertions (log result, do not fail CI) since baseline estimates are rough

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy | Benchmark integration tests that run against real DB must use real PostgreSQL; no mocking of `context_cache_stats` results |
| ADR-006 | E2E Tests Required in Dev Phase | Not directly applicable — no UI surface; benchmark is a script/test file |

### Patterns to Follow

- Advisory benchmark pattern: measure, log to artifact, do not hard-fail CI on token reduction percentage (reduction depends on pack population state)
- p95/median calculation pattern from `performance-benchmarks.integration.test.ts`
- YAML evidence artifact for benchmark results (matches EVIDENCE.yaml schema conventions)
- Report per-agent results, not only a single aggregate, to expose model-tier differences
- Clearly separate "estimated baseline" (WINT-2110 proxy figures) from "measured actuals" (cache hit counts from `context_cache_stats`)

### Patterns to Avoid

- Hard CI assertions that fail the build when 80% reduction is not met — the target is aspirational given proxy-measure limitations
- Single aggregate percentage that hides per-agent variation
- Requiring all cache packs to be populated before running — graceful partial-population handling required
- Conflating cache hit count with token reduction (they are correlated, not equivalent; document the proxy relationship)

---

## Conflict Analysis

### Conflict: Warning — Dependency in unstable state

- **Severity**: warning
- **Description**: WINT-2110 (direct dependency) is in `needs-code-review`. Its AC-6 baseline token estimates exist in the story body (and possibly as `BASELINE-TOKENS.yaml`), but the story is not yet merged. WINT-2040 is in `failed-code-review`, meaning the `agent_missions` pack will not be available. Benchmark design must not assume a clean state with all packs populated and all baseline artifacts finalized.
- **Resolution Hint**: Design the benchmark to read WINT-2110 AC-6 baseline data from a static input (YAML file or hardcoded table), query `context_cache_stats()` for actual hit counts, and report reduction as an estimate with stated assumptions. The benchmark should run and produce a valid report even with only partial pack population.

---

## Story Seed

### Title

Measure Token Reduction via Cache Hit Rate Benchmark

### Description

**Context**: WINT-2110 has wired the 5 highest-invocation agent workflows (7 agent files) to call `context_cache_get()` for pre-distilled context packs instead of re-reading source documents and re-querying KB on every invocation. WINT-2030/2040/2050/2060 have populated the `wint.context_packs` table with project conventions, architecture patterns, library snippets, and agent missions content.

**Problem**: We have no validated measurement of whether the cache integration actually achieves the 80% token reduction target. The WINT-2110 AC-6 baselines are rough file-size-derived estimates. The only live observability we have is `context_cache_stats()` (hit count, avg hits per pack) and the pack content sizes in the database. Phase 3 telemetry (`agent_invocations` table) is not yet implemented.

**Proposed Solution**: Create a benchmark script (or Vitest integration test file) that:
1. Reads the WINT-2110 pre-implementation baseline estimates (from BASELINE-TOKENS.yaml or hardcoded table)
2. Queries `context_cache_stats()` for per-pack-type hit counts and average hits
3. Reads actual pack content sizes from the DB (proxy for tokens saved per cache hit)
4. Computes estimated token reduction per agent per invocation (cache-hit tokens avoided vs. KB-search + filesystem-read baseline)
5. Reports per-agent and aggregate before/after comparison
6. Produces a `BENCHMARK-RESULTS.yaml` artifact with findings, methodology notes, and a pass/needs-tuning verdict against the 80% target
7. If the target is not met, identifies which agents and pack types to tune

This story does not require Phase 3 telemetry. It operates on proxy measures: pack content size (as a token proxy) and hit count from `context_cache_stats()`. The methodology and its limitations must be clearly documented in the output artifact.

### Initial Acceptance Criteria

- [ ] **AC-1:** Benchmark script reads WINT-2110 pre-implementation baseline token estimates (from `BASELINE-TOKENS.yaml` if produced by WINT-2110, otherwise from a static table defined in the benchmark) and outputs them as the "before" side of the comparison
- [ ] **AC-2:** Benchmark script calls `context_cache_stats({ packType })` for each of the registered pack types and collects `hitCount`, `avgHitsPerPack`
- [ ] **AC-3:** Benchmark script reads actual pack content sizes (character count or estimated token count) from the `wint.context_packs` table to estimate tokens-per-cache-hit
- [ ] **AC-4:** Benchmark computes estimated token reduction per agent workflow: `(pack_token_size × hit_count) / (baseline_input_tokens × invocation_count)` — clearly documenting this formula and its assumptions in the output
- [ ] **AC-5:** Benchmark produces a `BENCHMARK-RESULTS.yaml` artifact in `_implementation/` with: per-agent before/after table, aggregate reduction percentage, methodology statement, pack population status (which packs had hits vs. were empty), and a verdict (`PASS` if ≥80% estimated reduction, `NEEDS-TUNING` otherwise)
- [ ] **AC-6:** If aggregate estimated reduction is below 80%, the benchmark identifies the top 2-3 agents or pack types to tune (e.g., packs with zero hits, agents with low injection coverage) and logs them as tuning recommendations in the artifact
- [ ] **AC-7:** Benchmark handles partial cache population gracefully — packs with zero hits are reported as "not yet populated" and excluded from reduction percentage calculation with a note
- [ ] **AC-8:** Benchmark script runs without error when executed with `pnpm` against the live PostgreSQL KB database (ADR-005: no mocking of DB calls)
- [ ] **AC-9:** All benchmark output uses `@repo/logger`, not `console.log`
- [ ] **AC-10:** `pnpm check-types` passes on the benchmark script file; no TypeScript errors

### Non-Goals

- Do not implement Phase 3 telemetry or agent_invocations logging — that is WINT-3010/0120 scope
- Do not modify agent .agent.md files — WINT-2110 scope
- Do not modify `context_cache_stats` or other MCP tools — consume only
- Do not require actual LLM invocations to measure token usage — use proxy measures (content size + hit count)
- Do not hard-fail CI on the 80% target — advisory result only
- Do not implement cache tuning — this story produces a report; tuning is a follow-on story if needed
- Do not run benchmarks for agents outside the 5 workflows covered by WINT-2110

### Reuse Plan

- **Scripts**: `calculateP95`/`calculateMedian` pattern from `packages/backend/orchestrator/src/adapters/__tests__/integration/performance-benchmarks.integration.test.ts`
- **Tool**: `contextCacheStats()` from `packages/backend/mcp-tools/src/context-cache/context-cache-stats.ts` — primary data source for hit counts
- **Input artifact**: WINT-2110 `_implementation/BASELINE-TOKENS.yaml` (if produced) or AC-6 table from WINT-2110 story body
- **Patterns**: YAML evidence artifact structure from orchestrator artifacts (`packages/backend/orchestrator/src/artifacts/`)
- **Logger**: `@repo/logger` for all output

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- The benchmark is its own test artifact — the "test plan" is the benchmark execution itself
- Happy-path: script runs, produces BENCHMARK-RESULTS.yaml, reports a verdict
- Error cases: DB unavailable (script exits with clear error), zero packs populated (all agents show "not yet populated", aggregate excluded from percentage), WINT-2110 baseline not found (script falls back to hardcoded estimates from AC-6 table)
- Manual cases: reviewer inspects `BENCHMARK-RESULTS.yaml` for methodology correctness, reasonableness of proxy calculation, and accuracy of tuning recommendations
- ADR-005 applies: benchmark integration test must use real PostgreSQL (port 5433)
- No UI surface — ADR-006 E2E requirement does not apply
- Consider: a unit test for the reduction calculation formula (pure function, no DB) to verify math correctness independent of live data

### For UI/UX Advisor

Not applicable — this story has no UI surface. The "output" is a YAML artifact consumed by PM/dev roles.

### For Dev Feasibility

- **Primary complexity**: Defining the proxy measurement formula precisely and documenting its assumptions clearly. The 80% target is an estimate; actual reduction requires Phase 3 telemetry (not yet available).
- **Implementation surface**: One TypeScript script file (e.g., `packages/backend/orchestrator/src/benchmark/token-reduction-benchmark.ts` or a Vitest integration test) + one YAML output artifact
- **DB access**: Uses `contextCacheStats()` from `@repo/mcp-tools` and potentially a direct Drizzle query for pack content sizes from `wint.contextPacks`
- **Key decision**: Where to locate the benchmark script — as a standalone `packages/backend/orchestrator/src/benchmark/` script vs. a Vitest integration test file (prefer integration test file to leverage existing test harness patterns)
- **Risk**: If WINT-2040 (agent_missions pack) remains in failed-code-review at implementation time, that pack will show zero hits, reducing the measurable sample. Design the graceful-exclusion logic upfront.
- **Canonical references for subtask decomposition**:
  - Benchmark structure: `packages/backend/orchestrator/src/adapters/__tests__/integration/performance-benchmarks.integration.test.ts`
  - DB query for content sizes: `packages/backend/mcp-tools/src/context-cache/context-cache-stats.ts` (shows Drizzle ORM pattern for `wint.contextPacks`)
  - YAML artifact output: `packages/backend/orchestrator/src/artifacts/` (evidence schema conventions)
- **Estimated complexity**: Low–Medium (2–3 points). Primary work is data collection + calculation + artifact writing, not complex logic.
- **Token estimate**: ~25,000–40,000 tokens for implementation (script is bounded; risk of overrun if DB schema spelunking is needed)
