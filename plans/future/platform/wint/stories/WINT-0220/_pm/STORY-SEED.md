---
generated: "2026-03-02"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: WINT-0220

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Baseline does not include post-2026-02-13 implementation artifacts. A prior complete implementation exists at `plans/future/platform/UAT/WINT-0220/` with QA verdict PASS (2026-02-14). The story has been fully implemented and validated. This backlog seed is being generated from the wint stories.index.md which still lists status as `uat`.

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| Model Assignments Config (YAML) | `.claude/config/model-assignments.yaml` | **Live** - Currently active agent→model mapping file used by all agents |
| Model Assignments TypeScript Loader | `packages/backend/orchestrator/src/config/model-assignments.ts` | **Live** - TypeScript consumer; `getModelForAgent()`, `parseOllamaModel()` |
| LLM Provider Factory | `packages/backend/orchestrator/src/config/llm-provider.ts` | **Live** - Ollama availability checks with 30s cache, Claude fallback |
| Pipeline Model Router | `packages/backend/orchestrator/src/pipeline/model-router.ts` | **Live** - `PipelineModelRouter` with escalation chain + budget tracking (APIP-0040) |
| Model Strategy Document | `packages/backend/orchestrator/docs/WINT-0220-STRATEGY.md` | **Delivered** - Formal human-readable strategy from prior WINT-0220 implementation |
| Model Strategy YAML | `packages/backend/orchestrator/docs/WINT-0220-STRATEGY.yaml` | **Delivered** - Machine-readable tier definitions, mappings, escalation rules (v1.0.0) |
| Validation Script | `packages/backend/orchestrator/scripts/validate-strategy.ts` | **Delivered** - Zod schema validation for strategy YAML |
| Strategy Loader | `packages/backend/orchestrator/src/models/strategy-loader.ts` | **Delivered** - Loads and validates WINT-0220-STRATEGY.yaml at runtime |
| wint.model_assignments DB Table | `packages/backend/database-schema/src/schema/wint.ts` (line 1996) | **Live** - DB-backed model assignment overrides with in-memory cache (APIP-0040) |
| Generated MODEL-ASSIGNMENTS Docs | `docs/generated/MODEL-ASSIGNMENTS.md` | **Live** - Auto-generated documentation from current assignments |
| Ollama Model Fleet Docs | `docs/tech-stack/ollama-model-fleet.md` | **Live** - Reference for local model capabilities and resource requirements |
| MODEL_STRATEGY.md (Informal) | `packages/backend/orchestrator/MODEL_STRATEGY.md` | **Reference** - Informal predecessor, still present as baseline context |

### Active In-Progress Work

| Story ID | Title | Status | Potential Overlap |
|----------|-------|--------|-------------------|
| WINT-0230 | Create Unified Model Interface | uat | Blocked by WINT-0220 — strategy document feeds routing logic design |
| WINT-0240 | Configure Ollama Model Fleet | uat | Blocked by WINT-0220 — minimum model requirements derived from strategy |
| WINT-0250 | Define Escalation Triggers | uat | Blocked by WINT-0220 — strategy-defined thresholds feed trigger implementation |
| APIP-0040 | PipelineModelRouter | uat | Consumes `wint.model_assignments` table defined as part of WINT strategy |

### Constraints to Respect

1. **No breaking changes to existing agent invocations**: The `model:` frontmatter in 100+ agent files must remain honored.
2. **wint.model_assignments table is live**: APIP-0040 implemented DB-backed overrides; any strategy changes must remain compatible with `wint.model_assignments` schema.
3. **model-assignments.yaml is canonical for Claude-side agents**: This file is the live active config; changes here take immediate effect.
4. **Strategy YAML review date (2026-03-15) passed**: The `WINT-0220-STRATEGY.yaml` review_date is 2026-03-15. As of today (2026-03-02), the review is imminent. Any implementation work should flag that a strategy review is due in 13 days.
5. **Single-process cache limitation**: `PipelineModelRouter.invalidateAssignmentsCache()` works only in single-process mode (OPP-2 from APIP-0040). Multi-process invalidation is deferred.

---

## Retrieved Context

### Related Endpoints

N/A — This is a documentation/configuration story with no HTTP API surface.

### Related Components

| Component | Path | Purpose |
|-----------|------|---------|
| `model-assignments.yaml` | `.claude/config/model-assignments.yaml` | Live agent→model assignments (primary active config) |
| `model-assignments.ts` | `packages/backend/orchestrator/src/config/model-assignments.ts` | TypeScript loader and utility functions |
| `llm-provider.ts` | `packages/backend/orchestrator/src/config/llm-provider.ts` | Provider factory with Ollama availability checks |
| `model-router.ts` | `packages/backend/orchestrator/src/pipeline/model-router.ts` | Pipeline-level router with escalation and budget tracking |
| `strategy-loader.ts` | `packages/backend/orchestrator/src/models/strategy-loader.ts` | Loads WINT-0220-STRATEGY.yaml for runtime use |
| `validate-strategy.ts` | `packages/backend/orchestrator/scripts/validate-strategy.ts` | Zod validation script for strategy YAML |
| `WINT-0220-STRATEGY.md` | `packages/backend/orchestrator/docs/WINT-0220-STRATEGY.md` | Human-readable strategy (v1.0.0, effective 2026-02-15) |
| `WINT-0220-STRATEGY.yaml` | `packages/backend/orchestrator/docs/WINT-0220-STRATEGY.yaml` | Machine-readable tier definitions and escalation rules |
| `wint.ts` (modelAssignments) | `packages/backend/database-schema/src/schema/wint.ts` | Drizzle ORM schema for DB-backed model assignment overrides |

### Reuse Candidates

1. **`WINT-0220-STRATEGY.yaml`** — Fully implemented v1.0.0 strategy YAML. Any revision should build on this file, not replace it.
2. **`model-assignments.yaml`** — Active agent→model mapping. Primary touch point for any assignment corrections.
3. **`validate-strategy.ts`** — Existing Zod validation script can be rerun after any YAML update.
4. **`strategy-loader.ts`** — Runtime loader already integrates strategy YAML into the pipeline.
5. **`PipelineModelRouter`** — APIP-0040 implementation already enforces DB-backed assignments with in-memory cache.

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| YAML config with Zod validation | `packages/backend/orchestrator/scripts/validate-strategy.ts` | Shows how strategy YAML is validated; exemplary for any YAML schema work |
| Agent model assignment config | `.claude/config/model-assignments.yaml` | Live example of agent→model mapping format; all new assignments follow this format |
| Drizzle schema for wint tables | `packages/backend/database-schema/src/schema/wint.ts` (modelAssignments table, line 1996) | Shows wint schema pattern; use for any future DB-backed model override work |
| Pipeline model router | `packages/backend/orchestrator/src/pipeline/model-router.ts` | Reference for how model assignments are consumed at pipeline execution time |

---

## Knowledge Context

### Lessons Learned

- **[APIP-0040]** Model assignment cache invalidation is single-process only in Phase 0 (`wint.model_assignments` in-memory cache). *Applies because*: Any story touching the model assignments DB table or the strategy runtime must be aware that multi-process invalidation is not yet implemented. (category: constraint)

- **[APIP-3050]** Model identifier format must match APIP-0040's convention exactly — if identifiers don't match between the router and any affinity table, lookups silently return empty results (cold-start behavior). *Applies because*: If this story adjusts model names or identifiers in the strategy YAML or assignments YAML, those changes must use the exact string conventions established by APIP-0040. (category: blocker-risk)

- **[WINT-1050/1060]** Sibling story patterns are highly effective for docs-only stories in the same epic. *Applies because*: WINT-0220 is a documentation/configuration story; reading WINT-0230, WINT-0240, and WINT-0250 implementations first will clarify format and structure expectations for any strategy revision. (category: workflow)

- **[ARCH-001]** wint schema lives in lego_dev (port 5432), not the KB database (port 5433). *Applies because*: `wint.model_assignments` is in lego_dev. Any integration tests for model assignment DB queries must target port 5432 with DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lego_dev. (category: architecture)

### Blockers to Avoid (from past stories)

- **Mismatched model identifier strings**: Changing model identifiers in YAML files without updating ALL consumers (router, affinity tables, loader) causes silent mismatches and cold-start fallback behavior.
- **Breaking existing agent invocations**: The `model:` frontmatter in agent .md files must remain compatible. Changes to model-assignments.yaml must preserve all currently-listed agent names.
- **Targeting wrong database for wint tests**: wint.model_assignments is in lego_dev (port 5432), not port 5433. A lesson from WINT-1120 where tests initially targeted the wrong DB.
- **Assuming Ollama uniform availability**: Ollama model availability varies by developer machine; any assignments to Ollama models must include verified fallback paths.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy — UAT Must Use Real Services | Any UAT validation of the model strategy must test with real Ollama/Claude connections, not mocks |
| ADR-006 | E2E Tests Required in Dev Phase | If this story produces code changes (validation scripts, loaders), at least one happy-path E2E test is required |
| N/A (wint-specific) | wint schema in lego_dev (port 5432) | wint.model_assignments integration tests must target DATABASE_URL on port 5432 |

---

## Conflict Analysis

### Conflict: Story Already Fully Implemented (Warning)

- **Severity**: warning (non-blocking)
- **Description**: WINT-0220 was previously implemented, QA-verified (PASS, 2026-02-14), and all deliverables exist. The story appears in the wint index as status `uat`, and a revision cycle has been initiated given the approaching strategy review_date (2026-03-15).
- **Resolution Hint**: Implementation agents should treat this as a **revision story**. Begin by reading the existing deliverables (`WINT-0220-STRATEGY.yaml`, `WINT-0220-STRATEGY.md`) and identifying gaps versus the current pipeline state. The strategy YAML review_date of 2026-03-15 is the trigger for this cycle.

---

*Story Seed Generated*: 2026-03-02
*Baseline Reality*: 2026-02-13
*Knowledge Base*: Loaded (lessons from APIP-0040, APIP-3050, WINT-1050/1060, WINT-1120)
*ADRs Loaded*: ADR-005, ADR-006
*Prior Implementation*: `plans/future/platform/UAT/WINT-0220/` (QA PASS, 2026-02-14)
*Blocking Dependencies*: None
*Blocked Stories*: WINT-0230, WINT-0240, WINT-0250 (all currently in UAT; will benefit from strategy updates)
