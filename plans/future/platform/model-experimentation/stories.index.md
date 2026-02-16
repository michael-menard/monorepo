# MODL Stories Index

## Progress Summary

| Status | Count |
|--------|-------|
| Pending | 4 |
| **Total** | **4** |

## Ready to Start (No Blockers)

- MODL-001: Provider Adapters

---

### MODL-001: Provider Adapters

**Status:** `pending`
**Priority:** P0
**Dependencies:** None
**Blocks:** MODL-002

**Description:**
Unified interface to call any model from any provider. OpenRouter (200+ models), Ollama (local/free), Anthropic direct.

**Key Deliverables:**
- `providers/base.ts` — Abstract provider interface + Zod schemas (ProviderConfig, ProviderResponse)
- `providers/openrouter.ts` — OpenRouter adapter (API key via OPENROUTER_API_KEY env)
- `providers/ollama.ts` — Ollama adapter (local, configurable base URL, cost always 0.0)
- `providers/anthropic.ts` — Anthropic direct adapter (ANTHROPIC_API_KEY env)
- `providers/index.ts` — Provider factory (createProvider from config)

**Acceptance Criteria:**
- [ ] All 3 providers implement same ProviderResponse schema
- [ ] Provider factory creates correct adapter from config
- [ ] Response includes tokens_in, tokens_out, latency_ms, cost_usd
- [ ] Ollama cost_usd is always 0.0
- [ ] Error handling with provider-specific retry logic
- [ ] Integration test with Ollama (if available locally)

---

### MODL-002: Task Contracts & Model Selector

**Status:** `pending`
**Priority:** P0
**Dependencies:** MODL-001
**Blocks:** MODL-003

**Description:**
Nodes declare requirements via Task Contracts. Multi-armed bandit selector picks the best model at runtime based on historical performance.

**Key Deliverables:**
- `model-selector/contracts.ts` — TaskContract Zod schema
- `model-selector/registry.ts` — Model capability catalog (which models support which requirements)
- `model-selector/selector.ts` — Multi-armed bandit (exploration → exploitation → convergence)
- `model-selector/index.ts` — `createModelNode()` factory for LangGraph integration

**Acceptance Criteria:**
- [ ] Task Contract schema validates with test fixtures
- [ ] Registry filters models by requirements (e.g., code_understanding: deep filters out small models)
- [ ] Selector round-robins during exploration phase (first 20 runs per task)
- [ ] Selector uses Thompson Sampling after exploration phase
- [ ] Exploration rate reduces to 5% after convergence (95%+ confidence)
- [ ] `createModelNode()` integrates with LangGraph StateGraph

---

### MODL-003: Quality Evaluator

**Status:** `pending`
**Priority:** P0
**Dependencies:** MODL-002
**Blocks:** MODL-004

**Description:**
Automatically assess model output quality. Four evaluation layers: schema compliance, completeness, baseline comparison, and human feedback.

**Key Deliverables:**
- `quality/evaluator.ts` — Quality evaluation pipeline
- `quality/baseline.ts` — Baseline comparison logic (against Claude Sonnet reference)
- `quality/scoring.ts` — Composite scoring with configurable weights

**Evaluation Layers:**

| Layer | Weight | Method |
|-------|--------|--------|
| Schema compliance | 30% | Zod `.safeParse()` — 1.0 if valid, 0.0 if not |
| Completeness | 20% | Ratio of non-empty required fields |
| Baseline comparison | 30% | Structural diff or cosine similarity to reference |
| Human feedback | 20% | From WKFL-004 `/feedback` (when available) |

**Acceptance Criteria:**
- [ ] Schema compliance: 1.0 for valid output, 0.0 for parse failure
- [ ] Completeness: correctly counts non-empty fields
- [ ] Baseline comparison: works with and without reference output
- [ ] Human feedback integration via KB query (graceful when no feedback exists)
- [ ] Composite score weights are configurable
- [ ] Scores persisted for leaderboard consumption

---

### MODL-004: Model Leaderboards

**Status:** `pending`
**Priority:** P1
**Dependencies:** MODL-003
**Blocks:** None (but LERN and SDLC epics depend on MODL completion)

**Description:**
Per-task quality/cost/latency tracking that converges on optimal model selection. Persistent storage and reporting.

**Key Deliverables:**
- `model-selector/leaderboard.ts` — Tracking, persistence, convergence detection
- `model-selector/reports.ts` — Report generation (summary, per-task, per-model)
- `.claude/commands/model-leaderboard.md` — Prototype command for viewing results

**Leaderboard Entry:**
- task_id, model, provider
- runs count, avg_quality, avg_cost_usd, avg_latency_ms
- quality_trend (improving | stable | degrading)
- value_score (quality / cost ratio)
- convergence status + confidence

**Acceptance Criteria:**
- [ ] Tracks quality, cost, latency per model per task
- [ ] Value score computed correctly (quality / cost)
- [ ] Convergence detection (95%+ confidence in best model)
- [ ] Degradation alert when quality drops > 10%
- [ ] Leaderboard persisted (initially YAML, later Postgres via INFRA)
- [ ] Report generation works for all filter modes (by task, by model, overall)
