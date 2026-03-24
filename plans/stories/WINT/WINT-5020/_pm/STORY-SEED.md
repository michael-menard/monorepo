---
generated: "2026-03-23"
baseline_used: null
baseline_date: null
lessons_loaded: true
adrs_loaded: false
conflicts_found: 2
blocking_conflicts: 0
---

# Story Seed: WINT-5020

## Reality Context

### Baseline Status
- Loaded: no
- Date: N/A
- Gaps: No baseline directory exists at `plans/baselines/`. All context derived from direct codebase scan and KB search. The agent-pattern and ML pipeline infrastructure is well-established; gaps are around the classification agent's exact scope (training vs. inference vs. agent-file-only).

### Relevant Existing Features

| Feature | Location | Status | Notes |
|---------|----------|--------|-------|
| ML Pipeline MCP Tools (WINT-0140) | `apps/api/knowledge-base/src/ml-pipeline/` | Deployed | 7 tools: `mlModelRegister`, `mlModelGetActive`, `mlMetricsRecord`, `mlPredictionRecord`, `mlPredictionGetByEntity`, `trainingDataIngest`, `trainingDataMarkValidated` |
| `workflow.ml_models` table | `apps/api/knowledge-base/src/db/schema/workflow.ts:450` | Deployed | `modelType` enum: `quality_predictor`, `effort_estimator`, `risk_classifier`, `pattern_recommender` |
| `workflow.model_predictions` table | `apps/api/knowledge-base/src/db/schema/workflow.ts:481` | Deployed | `features` (jsonb), `prediction` (jsonb), `actualValue` (jsonb), `predictionType`, `entityType`, `entityId` |
| `workflow.training_data` table | `apps/api/knowledge-base/src/db/schema/workflow.ts:497` | Deployed | `dataType`, `features` (jsonb), `labels` (jsonb), `validated` |
| HiTL Interview Sidecar (WINT-5010) | `packages/backend/sidecars/hitl-interview/` | In-progress / implemented | Writes `hitl_interview` rows to `workflow.training_data`; **primary upstream data supplier for WINT-5020** |
| Cohesion Sidecar (WINT-4010) | `packages/backend/sidecars/cohesion/` | Deployed | ARCH-001 pattern: MCP tool calls compute function directly (no HTTP self-call) |
| Role-pack Sidecar (WINT-2010) | `packages/backend/sidecars/role-pack/` | Deployed | Canonical sidecar package structure template |
| `@repo/sidecar-http-utils` | `packages/backend/sidecars/http-utils/src/index.ts` | Deployed | `sendJson`, `readBody`; 1MB body limit |
| Weekly Analyst Agent (WINT-6060) | `.claude/agents/weekly-analyst.agent.md` | Deployed | Agent frontmatter/structure pattern for leader agents with KB tool declarations |
| `mlModelGetActive` function | `apps/api/knowledge-base/src/ml-pipeline/ml-model-get-active.ts` | Deployed | Query active ML model by type; returns model UUID for prediction recording |
| `mlPredictionRecord` function | `apps/api/knowledge-base/src/ml-pipeline/ml-prediction-record.ts` | Deployed | Append-only prediction insert; accepts `modelId`, `features`, `prediction`, `entityId` |

### Active In-Progress Work

| Story | Area | Potential Overlap |
|-------|------|-------------------|
| WINT-5010 (HiTL Interview Sidecar) | ML pipeline | **Upstream dependency** — WINT-5020 consumes the `hitl_interview` training rows that WINT-5010 writes. WINT-5010 source files already exist at `packages/backend/sidecars/hitl-interview/`. |
| WINT-5040 (ML Training Data Collection) | ML pipeline | Sibling story — may cover export/batch collection of training data; must coordinate on `workflow.training_data` query patterns |
| WINT-6060 (Weekly Analyst Agent) | Agent tooling | Completed — agent already exists, establishes `type: leader` / `type: worker` frontmatter conventions |

### Constraints to Respect

- **No barrel files** — import directly from source files
- **Zod-first types** — no TypeScript interfaces; all types via `z.infer<>`
- **No `console.log`** — use `@repo/logger`
- **45% minimum test coverage** (globally enforced)
- **Agent files are exempt from 45% coverage threshold** (KB lesson 6bc29a85) — content-inspection tests only if story delivers an agent file
- **ARCH-001** (from WINT-5010): MCP tool wrappers call compute function directly — no HTTP self-calls
- **ARCH-002** (from WINT-5010): No cross-sidecar HTTP calls
- **MCP server must run via `tsx`** — never from `dist/` (MEMORY.md critical note)
- **wint/kbar schemas are dead** — do NOT create new `wint.*` or `kbar.*` references (MEMORY.md)
- Sidecar ports 3090–3094 are taken; if a new sidecar is created, port must be ≥3095

---

## Retrieved Context

### Related Endpoints

No existing HTTP endpoints for ML classification/inference exist in the codebase. The `ml-pipeline` functions in `apps/api/knowledge-base/src/ml-pipeline/` are callable as MCP tools but not exposed as HTTP routes.

### Related Components

This is a backend/agent story — no UI components are involved.

### Reuse Candidates

| Item | Location | How to Reuse |
|------|----------|--------------|
| `mlModelGetActive` | `apps/api/knowledge-base/src/ml-pipeline/ml-model-get-active.ts` | Query active `risk_classifier` or `quality_predictor` model to get `modelId` for prediction recording |
| `mlPredictionRecord` | `apps/api/knowledge-base/src/ml-pipeline/ml-prediction-record.ts` | Record classification result: `{ modelId, predictionType, entityType: 'story', entityId: storyId, features, prediction }` |
| `trainingDataIngest` | `apps/api/knowledge-base/src/ml-pipeline/training-data-ingest.ts` | Reference for how WINT-5010 writes labeled training rows (READ context; do not duplicate) |
| `MlModelTypeSchema` | `apps/api/knowledge-base/src/ml-pipeline/__types__/index.ts` | Enum: `quality_predictor`, `effort_estimator`, `risk_classifier`, `pattern_recommender` |
| `MlPredictionRecordInputSchema` | `apps/api/knowledge-base/src/ml-pipeline/__types__/index.ts` | Input shape for recording a classification prediction |
| Cohesion MCP tool pattern | `packages/backend/sidecars/cohesion/src/mcp-tools/cohesion-audit.ts` | ARCH-001: MCP tool wrapper → direct compute function call |
| Agent frontmatter structure | `.claude/agents/weekly-analyst.agent.md` | `type: worker`, `permission_level: read-only`, `kb_tools`, `shared` fields |
| Agent frontmatter structure (leader) | `.claude/agents/workflow-retro.agent.md` | `type: leader`, `permission_level: orchestrator`, `triggers`, full structure |
| Role-pack server pattern | `packages/backend/sidecars/role-pack/src/server.ts` | If sidecar delivery is in scope: `createServer`, PORT env var, error catch |
| Role-pack `__types__` pattern | `packages/backend/sidecars/role-pack/src/__types__/index.ts` | Zod-first schema file structure for sidecar types |
| HiTL interview sidecar types | `packages/backend/sidecars/hitl-interview/src/__types__/index.ts` | Upstream type shapes for `hitl_interview` training data features/labels |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Agent file structure (worker) | `.claude/agents/weekly-analyst.agent.md` | Current established agent format: YAML frontmatter, Role, Mission, Inputs, Execution phases, Output, Completion Signal |
| MCP tool calling compute function directly | `packages/backend/sidecars/cohesion/src/mcp-tools/cohesion-audit.ts` | ARCH-001: direct compute call, no HTTP self-call; injectable DB pattern |
| ML prediction record (MCP tool) | `apps/api/knowledge-base/src/ml-pipeline/ml-prediction-record.ts` | How to append a prediction row using Drizzle; includes Zod parse + error handling |
| ML model get active (MCP tool) | `apps/api/knowledge-base/src/ml-pipeline/ml-model-get-active.ts` | How to query an active model by type; injectable `eq/and` filter pattern |

---

## Knowledge Context

### Lessons Learned

- **[WINT-0230 OPP-001]** Heuristic text analysis is adequate for MVP quality evaluation; LLM-as-judge is an enhancement. (category: architecture)
  - *Applies because*: WINT-5020 may need to decide between heuristic rule-based classification and actual ML model inference. Given the KB lesson that heuristics are sufficient for MVP, the Classification Agent should start with rule-based or heuristic scoring rather than requiring a trained model.
- **[KB 16646789]** Heuristic rule-based scoring is the correct MVP approach for quality evaluation. Deterministic, fully testable, zero training data required.
  - *Applies because*: Unless WINT-5010's training data has been collected and validated at scale, a trained ML model may not be available. The agent should support a fallback to heuristic scoring when no active model is found via `mlModelGetActive`.
- **[KB 6c19e91f]** Self-contain compute logic when upstream dependency chain is unstable. Injectable DrizzleDb prevents build failures.
  - *Applies because*: If WINT-5020 depends on `@repo/sidecar-hitl-interview`, that package may not be stable yet. The classification logic should be self-contained or injectable.
- **[KB 6d9d79f8]** Testing agent instruction logic as pure functions is effective for behavioral coverage.
  - *Applies because*: If WINT-5020 delivers an agent file, behavioral tests should mock KB tool calls and assert state transitions rather than requiring a live agent runtime.

### Blockers to Avoid (from past stories)

- Phantom dependency on a prerequisite story that does not exist (WINT-6060 blocker lesson) — if this story needs WINT-5010's training data, verify WINT-5010 is actually deployed before assuming classification is possible
- Calling `mlModelGetActive` and finding no active model — must have a fallback path (heuristic or deferred prediction)
- Writing predictions to `model_predictions` without a valid `modelId` (foreign key constraint on `mlModels.id` via `onDelete: cascade`)
- Cross-sidecar HTTP calls (ARCH-002) — any shared compute must go through `@repo/db` or shared packages

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ARCH-001 (from WINT-5010) | MCP Tool Direct Call | MCP tool wrappers call compute function directly — never via HTTP fetch to localhost |
| ARCH-002 (from WINT-5010) | No Cross-Sidecar HTTP | Sidecars must not issue HTTP calls to other sidecars |
| MEMORY.md | MCP Server via tsx | MCP server must run via `tsx ...src/mcp-server/index.ts`, never from `dist/` |

### Patterns to Follow

- Agent frontmatter with `type`, `permission_level`, `model`, `kb_tools`, `shared`, `story_id` fields
- Injectable function dependencies (DrizzleDb, MCP tool functions) for testability
- Zod schema validation before any DB write
- `@repo/logger` exclusively (no `console.*`)
- `mlModelGetActive({ modelType: 'risk_classifier' })` → check for active model → fallback gracefully if none

### Patterns to Avoid

- Requiring a trained ML model to be present without a fallback — this is a cold-start risk
- Writing to `workflow.training_data` from this story — that is WINT-5010's scope (WINT-5020 reads training data at most, does not produce it)
- Filesystem path references in agent Output section (KB lesson fac0d1b6 — use `kb_write_artifact`)
- Creating `wint.*` or `kbar.*` schema references (deprecated per MEMORY.md)

---

## Conflict Analysis

### Conflict: Upstream Dependency — WINT-5010 Not Confirmed Deployed
- **Severity**: warning
- **Description**: WINT-5020 is documented in WINT-5010 as a downstream consumer of HiTL interview training data. The `hitl-interview` sidecar package exists at `packages/backend/sidecars/hitl-interview/` with source files, suggesting active implementation. However, there is no confirmation that WINT-5010 is fully deployed and writing validated training rows to `workflow.training_data`. If WINT-5020 requires real training data to function, it may need to operate in a "no-model" fallback mode initially.
- **Resolution Hint**: Explicitly design WINT-5020 to handle the case where `mlModelGetActive({ modelType: 'risk_classifier' })` returns an empty array. Log a warning and return a deferred/null prediction rather than failing. This makes the story deliverable independently of WINT-5010's production state.

### Conflict: Scope Ambiguity — Agent vs. Sidecar vs. LangGraph Node
- **Severity**: warning
- **Description**: The title "Create Classification Agent" does not clearly specify whether the deliverable is (a) a `.claude/agents/*.agent.md` file (like WINT-6060), (b) a new sidecar package (like WINT-5010), (c) a LangGraph node in the orchestrator (like nodes in `packages/backend/orchestrator/src/nodes/`), or (d) a combination. The WINT feature area has used all three patterns. This ambiguity must be resolved in elaboration before implementation begins.
- **Resolution Hint**: Recommend defaulting to a `.claude/agents/classification.agent.md` file (agent-prompt-only) backed by existing `mlModelGetActive` and `mlPredictionRecord` MCP tools. This aligns with the WINT-6060 precedent (weekly-analyst) and avoids creating a new sidecar with port allocation concerns. If inference compute is required beyond KB tool calls, a LangGraph node or TypeScript compute function should be added as a sub-task.

---

## Story Seed

### Title

Create Classification Agent

### Description

The WINT workflow platform has a fully deployed ML pipeline infrastructure (`workflow.ml_models`, `workflow.model_predictions`, `workflow.training_data`) with 7 MCP tools (WINT-0140) and an HiTL Interview Sidecar (WINT-5010) that produces labeled `hitl_interview` training rows. The Classification Agent is the next layer in this pipeline: it applies classification logic to workflow entities (stories, decisions) and records structured predictions via `mlPredictionRecord`.

The primary classification targets are quality assessment (`quality_predictor`), risk scoring (`risk_classifier`), or effort estimation (`effort_estimator`) for stories as they move through the pipeline. Given the ML pipeline's maturity, the agent should use `mlModelGetActive` to query for a registered active model, apply its classification logic, and record the result. Since no trained model may be active at MVP, the agent must also support a heuristic fallback mode.

The recommended deliverable is a `.claude/agents/classification.agent.md` file (agent-prompt-only pattern, per WINT-6060) that orchestrates `mlModelGetActive`, classification logic, and `mlPredictionRecord` calls. If compute logic is required beyond KB tool calls, a TypeScript compute helper should accompany the agent, following the cohesion sidecar's ARCH-001 pattern.

### Initial Acceptance Criteria

- [ ] AC-1: `.claude/agents/classification.agent.md` exists with valid YAML frontmatter including `type`, `permission_level`, `model`, `kb_tools` (at minimum `mlModelGetActive`, `mlPredictionRecord`), `shared`, and `story_id: WINT-5020`
- [ ] AC-2: Agent defines a Mission covering: query active ML model by type, apply classification to a workflow entity, record prediction via `mlPredictionRecord` with `entityType: 'story'`, `entityId: storyId`, `features`, `prediction`
- [ ] AC-3: Agent defines Inputs section specifying at minimum: `storyId` (required), `classificationTarget` (enum: `quality`, `risk`, `effort`), optional `features` override
- [ ] AC-4: Agent defines graceful fallback when `mlModelGetActive` returns an empty array: log a warning, return a heuristic-based prediction or skip prediction recording, and emit a warning signal to the caller rather than failing
- [ ] AC-5: Agent defines an Output section that references KB tool calls (e.g., `mlPredictionRecord`) rather than filesystem paths
- [ ] AC-6: Agent defines Completion Signal section with one of the three standard strings
- [ ] AC-7: Content-validation test `.claude/agents/__tests__/classification.test.ts` verifies required frontmatter fields and sections are present (same pattern as WINT-6060's weekly-analyst test)
- [ ] AC-8: If a TypeScript compute helper is required, it follows ARCH-001 (direct function call, no HTTP self-call) and achieves ≥45% test coverage
- [ ] AC-9: No `console.*` usage in any TypeScript files; `@repo/logger` exclusively
- [ ] AC-10: No new `wint.*` or `kbar.*` schema references created

### Non-Goals

- Training the ML model itself — model training is a separate concern (likely WINT-5040 or a future ML training story)
- Writing to `workflow.training_data` — that is WINT-5010's scope; WINT-5020 only reads models and records predictions
- Creating a new sidecar with a dedicated HTTP server (unless elaboration confirms this is required)
- Implementing batch classification across all stories in bulk — the initial scope is per-story, on-demand classification
- Providing a web UI for classification results
- Authentication/authorization for any HTTP endpoints
- Modifying existing ML pipeline MCP tools (WINT-0140 tooling is complete and deployed)
- Backfilling `model_predictions.actual_value` (mlPredictionUpdateActual) — that is a future story per KB entry 0edd9442

### Reuse Plan

- **Agent structure**: `.claude/agents/weekly-analyst.agent.md` and `.claude/agents/workflow-retro.agent.md` as structural templates
- **MCP tools**: `mlModelGetActive` + `mlPredictionRecord` from `apps/api/knowledge-base/src/ml-pipeline/`
- **Compute pattern**: `packages/backend/sidecars/cohesion/src/mcp-tools/cohesion-audit.ts` (ARCH-001: direct call, no HTTP)
- **Test pattern**: `.claude/agents/__tests__/` content-inspection tests (established by WINT-2080, referenced in WINT-6060)
- **Types**: `MlModelTypeSchema`, `MlPredictionRecordInputSchema` from `apps/api/knowledge-base/src/ml-pipeline/__types__/index.ts`
- **Packages**: No new packages required for agent-only deliverable; `@repo/logger` for any TypeScript compute helpers

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

The primary deliverable is likely an agent file (agent-prompt-only pattern, same as WINT-6060). Per KB lesson 6bc29a85, agent files are exempt from the 45% coverage threshold — tests should be content-inspection only, verifying frontmatter fields and required section headings. If a TypeScript compute helper is included (classification logic, heuristic fallback), standard Vitest unit tests apply with ≥45% coverage.

Critical test cases:
1. Agent file has all required frontmatter fields (`type`, `permission_level`, `model`, `kb_tools`, `story_id`)
2. Agent file contains all required sections (Role, Mission, Inputs, Execution, Output, Completion Signal)
3. If compute helper exists: `mlModelGetActive` returns empty → heuristic fallback fires, no exception
4. If compute helper exists: prediction recording path with valid `modelId` → `mlPredictionRecord` called with correct shape

### For UI/UX Advisor

Skipped: true — no UI surface. This story delivers an agent markdown file and optionally a TypeScript compute helper. All classification results are written to `workflow.model_predictions` and retrievable via `mlPredictionGetByEntity`.

### For Dev Feasibility

Key questions for dev feasibility to resolve before elaboration:
1. **Scope decision**: Is the deliverable (a) agent file only, (b) agent + TypeScript compute helper, or (c) agent + new LangGraph node? Recommend (a) or (b) for MVP.
2. **Classification logic**: What features define the classification input? The `hitl_interview` training data has `storyComplexityScore`, `agentPhase`, `decisionType`, `confidence` as potential feature vectors. The agent should specify a concrete feature schema.
3. **Model availability**: Is there a registered active `risk_classifier` or `quality_predictor` in `workflow.ml_models`? If not, the heuristic fallback path must be the primary path at launch.
4. **Integration with existing orchestrator graphs**: Does the Classification Agent need to be wired into the LangGraph pipeline (e.g., triggered at `qa_gate` or `code_review` checkpoints), or is it invoked on-demand via CLI/skill?

Canonical references for subtask decomposition:
- Agent file authoring: `.claude/agents/weekly-analyst.agent.md` as structural template
- TypeScript compute helper (if needed): `packages/backend/sidecars/cohesion/src/compute-audit.ts` (injectable DB pattern)
- MCP tool wiring (if needed): `apps/api/knowledge-base/src/ml-pipeline/ml-prediction-record.ts` (Drizzle insert pattern)
- Agent content test: `.claude/agents/__tests__/` (existing test files)
