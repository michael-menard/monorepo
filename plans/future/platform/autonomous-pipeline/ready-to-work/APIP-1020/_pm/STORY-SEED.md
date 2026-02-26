---
generated: "2026-02-25"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: true
conflicts_found: 1
blocking_conflicts: 0
---

# Story Seed: APIP-1020

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No autonomous pipeline components exist yet (all APIP work is pre-implementation). Baseline describes the orchestrator package at `packages/backend/orchestrator/` as actively deployed with elaboration and story-creation graphs, circuit breakers, and DB-persistence nodes — this is the closest existing code to what APIP-1020 needs to inform.

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| LangGraph elaboration graph | `packages/backend/orchestrator/src/graphs/elaboration.ts` | Existing LangGraph StateGraph with nodes, annotations, and conditional edges — the same pattern APIP-1020's integration follow-up will use |
| Orchestrator artifact schemas (Zod) | `packages/backend/orchestrator/src/artifacts/` | `plan.ts` defines `FileChangeSchema`, `PlanStepSchema` — directly related to what a ChangeSpec schema must represent |
| Story artifact schema | `packages/backend/orchestrator/src/artifacts/story.ts` | Acceptance criteria schema, risk schema, story types — all inputs to the ChangeSpec spike |
| YAML artifact persistence | `packages/backend/orchestrator/src/persistence/` | Established pattern: Zod-validated YAML artifacts persisted in `plans/future/` feature directories |
| Circuit breaker | `packages/backend/orchestrator/src/runner/circuit-breaker.ts` | Existing error-classification and circuit-breaking patterns to reference during spike |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|-------------|
| APIP-0020 (Supervisor Graph Minimal Loop) | In Elaboration | None — APIP-1020 depends on APIP-1010 which depends on APIP-0020. Spike is pure research, no integration code. |
| APIP-5006 (LangGraph Server Infrastructure Baseline) | In Elaboration | None — spike work is local, no server dependency. |
| APIP-5004 (Secrets Engine) | In Elaboration | None — spike does not call external model APIs in a production context. |

### Constraints to Respect

- **ADR Decision 3 (APIP ADR-001):** APIP-1020 is explicitly classified as `type: spike`. Integration code (connecting diff planner to implementation graph) must NOT be written until the spike validates the schema. Integration moves to a follow-up story.
- **ENG-001 (accepted blocker):** ChangeSpec schema review gates APIP-1020 start. The schema is the most irreversible Phase 1 decision.
- **No Lambda / No AWS:** All pipeline components run on a dedicated local Docker server (ADR Decision 4). Spike deliverables are documents + scripts, not Lambda handlers.
- **Zod-first types:** All schema definitions must use Zod with `z.infer<>` — no TypeScript interfaces.
- **No barrel files:** Import directly from source files.
- **YAML artifact persistence:** Spike output artifacts (schema ADR, decomposition results) should be persisted as YAML under the feature directory following the established orchestrator pattern.

---

## Retrieved Context

### Related Endpoints

None. APIP-1020 is a research spike. There are no HTTP endpoints to create or modify.

### Related Components

| Component | Path | Notes |
|-----------|------|-------|
| Elaboration graph | `packages/backend/orchestrator/src/graphs/elaboration.ts` | Shows how a LangGraph StateGraph node is structured; the Structurer node (APIP-1010) and eventual DiffPlanner node will follow this pattern |
| Plan artifact schema | `packages/backend/orchestrator/src/artifacts/plan.ts` | `FileChangeSchema` and `PlanStepSchema` are the closest existing analogue to ChangeSpec fields |
| Story artifact schema | `packages/backend/orchestrator/src/artifacts/story.ts` | Acceptance criteria and risk schemas are the primary inputs to decomposition |
| Delta-detect node | `packages/backend/orchestrator/src/nodes/elaboration/delta-detect.ts` | Demonstrates node input/output contracts with Zod schemas |

### Reuse Candidates

- **`FileChangeSchema`** in `packages/backend/orchestrator/src/artifacts/plan.ts`: Fields `path`, `action` (`create | modify | delete`), `reason` — strong candidates for reuse or inspiration in ChangeSpec `file_change` sub-schema.
- **`PlanStepSchema`** in the same file: `id`, `description`, `files`, `dependencies`, `slice` fields — inform how atomic steps are structured.
- **YAML artifact persistence pattern**: `packages/backend/orchestrator/src/persistence/yaml-artifact-bridge.ts` — spike deliverables (schema ADR YAML, decomposition samples) should use this established pattern.
- **Zod discriminated union pattern**: Used throughout `packages/backend/orchestrator/src/runner/error-classification.ts` for error types — same pattern should be considered for ChangeSpec variant types (e.g., `file_change | config_change | migration_change`).

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Zod schema with inferred type (for schema design) | `packages/backend/orchestrator/src/artifacts/plan.ts` | Well-structured Zod schemas for `FileChangeSchema`, `PlanStepSchema`, `PlanSchema` with `z.literal` for versioning — direct model for ChangeSpec schema structure |
| LangGraph node with typed state contract | `packages/backend/orchestrator/src/nodes/elaboration/delta-detect.ts` | Shows how a node exposes a typed input/output contract; ChangeSpec must be designed to be an unambiguous node-to-node contract |
| YAML artifact persistence | `packages/backend/orchestrator/src/persistence/yaml-artifact-bridge.ts` | How spike deliverable YAML artifacts are written and read with Zod validation |
| Story artifact with acceptance criteria | `packages/backend/orchestrator/src/artifacts/story.ts` | `StoryAcceptanceCriterionSchema` and `StoryArtifactSchema` — the primary inputs the spike must decompose into ChangeSpecs |

---

## Knowledge Context

### Lessons Learned

No KB lessons were loaded (KB search not available in this execution context). The following lessons are inferred from the epic elaboration artifacts:

- **[ENG-001]** ChangeSpec schema is foundational — retrofitting schema changes after Phase 1 is extremely costly. (category: blocker)
  - *Applies because*: APIP-1020 is the spike that must validate this schema before integration begins. The ADR engineering review explicitly flags this as the most irreversible Phase 1 decision.

- **[RISK-002]** Diff Planner produces poor ChangeSpec decompositions. (category: blocker)
  - *Applies because*: The entire spike purpose is to validate decomposition quality on real stories before writing integration code. Poor decompositions undetected here will cascade through APIP-1030, APIP-1050, APIP-1060, and APIP-1070.

- **[RISK-001]** Cheap models produce incorrect code that passes micro-verify but fails QA. (category: blocker)
  - *Applies because*: The spike must measure model cost per decomposition. If decomposition quality requires Claude-level reasoning, cheap-model routing for this step must be flagged as unsafe.

### Blockers to Avoid (from past stories)

- Do not skip schema versioning. The spike must include a versioning strategy (e.g., `schema: z.literal(1)`) so ChangeSpec can evolve without breaking downstream consumers.
- Do not conflate ChangeSpec schema design with ChangeSpec integration. This spike produces a schema ADR and validation evidence — implementation code is for a follow-up story.
- Do not use TypeScript interfaces for the schema proposal. All schema definitions must be Zod schemas with `z.infer<>`.
- Do not evaluate decomposition quality on toy/trivial stories. The spike specifies 10+ real stories from the backlog to ensure practical signal.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| APIP ADR-001, Decision 3 | APIP-1020 as Research Spike | No integration code until spike validates schema. Deliverables are schema ADR + real story decompositions + quality metrics. |
| APIP ADR-001, Decision 4 | Local Dedicated Server | No Lambda. All pipeline runs on Docker Compose on local server. Spike tooling must work locally. |
| Monorepo ADR | Zod-First Types | All type definitions use Zod schemas. No TypeScript interfaces. |

### Patterns to Follow

- Define ChangeSpec as a Zod schema with `schema: z.literal(1)` for version pinning (follows `PlanSchema` pattern in `artifacts/plan.ts`).
- Use discriminated unions for ChangeSpec variants (`z.discriminatedUnion('change_type', [...])`) to enable exhaustive type-checking in downstream nodes.
- Persist spike deliverables as YAML artifacts under the feature directory using the existing `yaml-artifact-bridge` pattern.
- Design ChangeSpec fields so they are unambiguous to a model with a limited context window (this is tested during the decomposition exercise).

### Patterns to Avoid

- Do not model ChangeSpec as a free-form JSON blob. Downstream systems (review, QA, telemetry, affinity) need structured, typed fields they can query and route on.
- Do not design ChangeSpec in isolation. The spike must review how each of the 6 consuming systems (implementation loop, review, QA, telemetry, model affinity, merge) will read the schema.
- Do not skip cost measurement. The spike must record model cost (token count + USD estimate) per decomposition to inform APIP-0040 circuit breaker configuration.

---

## Conflict Analysis

### Conflict: sequencing risk (warning)
- **Severity**: warning
- **Description**: APIP-1020 depends on APIP-1010 (Structurer Node). APIP-1010 is currently `backlog` with no elaboration started. The spike cannot begin until APIP-1010 defines the `change_outline` format that becomes the primary input to ChangeSpec decomposition. If APIP-1010 slips, APIP-1020 is directly blocked.
- **Resolution Hint**: Ensure APIP-1010 elaboration is prioritized immediately after Phase 0 foundation work begins. The spike can proceed with a placeholder `change_outline` format if APIP-1010 is still in elaboration, but the schema ADR must be validated against the final APIP-1010 output before being published.

---

## Story Seed

### Title

ChangeSpec Schema Design and Validation Spike

### Description

**Context**: The autonomous pipeline's implementation loop (APIP-1030), review graph (APIP-1050), QA graph (APIP-1060), change telemetry (APIP-3010), model affinity profiles (APIP-3020), and merge graph (APIP-1070) all consume a shared atomic change contract called a ChangeSpec. This schema is the most irreversible decision in Phase 1: once integration code is written against a schema shape, changing it requires cascading updates across 6+ systems.

**Problem**: No ChangeSpec schema exists today. The existing `FileChangeSchema` and `PlanStepSchema` in `packages/backend/orchestrator/src/artifacts/plan.ts` provide field-level inspiration but were designed for a human-facing plan document, not a machine-executable atomic change contract. Building Phase 1 integration code before the schema is validated on real stories is RISK-002 (high severity).

**Proposed Solution Direction**: This spike bypasses integration code entirely. The deliverables are:
1. A draft ChangeSpec Zod schema capturing all fields required by the 6 consuming systems.
2. Manual decomposition of 10+ real backlog stories (from `plans/future/platform/autonomous-pipeline/backlog/`) into ChangeSpecs using the draft schema.
3. Quality measurement: decomposition accuracy, ambiguity count, and model cost per decomposition.
4. A published schema ADR (`_epic-elab/ADR-002-changespec-schema.md`) that either approves the schema or flags required revisions before integration begins.

The spike gates APIP-1030. No implementation graph code may be written until this spike publishes its ADR.

### Initial Acceptance Criteria

- [ ] AC-1: A draft `ChangeSpecSchema` is defined as a Zod schema with `schema: z.literal(1)` version pinning, covering all fields required by implementation loop, review, QA, telemetry, model affinity, and merge systems. The schema is placed at `packages/backend/orchestrator/src/artifacts/change-spec.ts` (or equivalent spike output location).
- [ ] AC-2: At least 10 real APIP backlog stories are decomposed into ChangeSpecs using the draft schema. Decompositions are persisted as YAML files at `plans/future/platform/autonomous-pipeline/_spike-output/APIP-1020/decompositions/`.
- [ ] AC-3: Quality metrics are recorded for each decomposition: (a) number of atomic ChangeSpecs produced, (b) number of ambiguous fields that required human clarification, (c) estimated token cost of the decomposition call, (d) whether the decomposition was judged accurate by manual inspection.
- [ ] AC-4: At least one decomposition uses each of the 6 consuming system perspectives (i.e., reviewers from implementation, review, QA, telemetry, affinity, and merge simulate reading the ChangeSpec and confirm all required fields are present).
- [ ] AC-5: The schema includes a versioning strategy for future migration (at minimum, a `schema` version field and a documented process for adding fields without breaking existing consumers).
- [ ] AC-6: A schema ADR is published at `plans/future/platform/autonomous-pipeline/_epic-elab/ADR-002-changespec-schema.md` with one of three verdicts: APPROVED (integration can begin), APPROVED WITH CONSTRAINTS (integration can begin with listed field restrictions), or REVISION REQUIRED (identified schema gaps must be resolved before APIP-1030 elaboration).
- [ ] AC-7: The ADR includes a cost model: median token count and USD cost per story decomposition, and a recommendation for whether this step should use Claude Sonnet, Haiku, or Opus based on measured quality vs cost.
- [ ] AC-8: The spike does NOT produce any integration code connecting the diff planner to the implementation graph. If any integration code is written, this criterion fails.

### Non-Goals

- Writing the DiffPlannerNode LangGraph node (that is the integration story that follows this spike).
- Connecting ChangeSpec output to APIP-1030 (Implementation Graph with Atomic Change Loop).
- Implementing model routing for the diff planner step.
- Building any API, Lambda handler, or HTTP endpoint.
- Modifying any production database schemas.
- Modifying any existing orchestrator graph code.
- Evaluating cheap-model quality for decomposition (that is APIP-0040 / RISK-001 scope — this spike measures cost to inform that work).

### Reuse Plan

- **Schemas**: Reuse `FileChangeSchema` and `PlanStepSchema` from `packages/backend/orchestrator/src/artifacts/plan.ts` as field-level inspiration. Do not import them as-is — ChangeSpec has additional contract fields not present in the plan artifact.
- **Patterns**: Zod `z.discriminatedUnion` for ChangeSpec change_type variants; `schema: z.literal(1)` for versioning; `z.infer<typeof ChangeSpecSchema>` for the exported type.
- **Packages**: `packages/backend/orchestrator` for the Zod schema location. `packages/backend/orchestrator/src/persistence/yaml-artifact-bridge.ts` for YAML output of decomposition results.
- **Reference stories for decomposition**: Pull 10+ stories from `plans/future/platform/autonomous-pipeline/backlog/` — prioritize APIP-0010, APIP-0020, APIP-0040, APIP-1010, APIP-5001, APIP-5007 since they have meaningful technical scope.

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

This is a spike: the primary deliverable is a published schema ADR, not runnable code. Test coverage expectations differ significantly from a feature story:
- Unit tests should be written for the Zod schema itself (parse valid ChangeSpec, reject invalid ChangeSpec, confirm discriminated union exhaustiveness).
- Integration tests are NOT required at this stage — the spike explicitly excludes integration code.
- The quality measurement exercise (AC-3) is the spike's equivalent of a test: it produces empirical evidence about schema fitness.
- The test plan should verify that all 10+ decomposition YAML files parse successfully against the published schema (this is a schema regression test).
- Consider a simple Vitest test file at `packages/backend/orchestrator/src/artifacts/__tests__/change-spec.test.ts` following the existing pattern in `artifacts/__tests__/plan.test.ts`.

### For UI/UX Advisor

No UI components are involved. This spike is entirely backend/schema design. The operator CLI (APIP-5005) may eventually surface ChangeSpec data, but that is out of scope for this spike. No UX input needed.

### For Dev Feasibility

Key feasibility questions for the implementation agent to investigate:

1. **Schema field inventory**: Review each of the 6 consuming systems' expected inputs:
   - Implementation loop: needs `file_path`, `change_type`, `description`, `acceptance_criteria_ref`, `estimated_tokens`
   - Review graph: needs `change_type`, `risk_level`, `affected_patterns`
   - QA graph: needs `testability_hint`, `ac_refs`, `test_strategy`
   - Telemetry: needs `change_type`, `model_used`, `token_cost`, `duration_ms`
   - Model affinity: needs `change_type`, `file_extension`, `complexity_estimate`
   - Merge graph: needs `commit_message_hint`, `pr_body_hint`, `related_acs`

2. **Discriminated union design**: Determine whether ChangeSpec should be a single schema with optional fields or a discriminated union on `change_type` (e.g., `file_change | migration_change | config_change | test_change`). Union is preferred for exhaustiveness checking but adds schema complexity.

3. **Decomposition prompt design**: The spike requires calling a model (likely Claude Sonnet) with a story's acceptance criteria and getting back a list of ChangeSpecs. The prompt template must be documented in the spike output. Start with `packages/backend/orchestrator/src/nodes/elaboration/delta-detect.ts` as a reference for how nodes call models with structured output.

4. **Canonical references for schema implementation**:
   - Schema file: `packages/backend/orchestrator/src/artifacts/plan.ts` (closest existing analogue)
   - Test file: `packages/backend/orchestrator/src/artifacts/__tests__/plan.test.ts` (test pattern to follow)
   - YAML persistence: `packages/backend/orchestrator/src/persistence/yaml-artifact-bridge.ts`
   - Node output contract pattern: `packages/backend/orchestrator/src/nodes/elaboration/delta-detect.ts`

5. **Spike output location decision**: The schema draft lives in `packages/backend/orchestrator/src/artifacts/change-spec.ts`. The decomposition YAML samples and ADR live under `plans/future/platform/autonomous-pipeline/`. This separation (code in packages, evidence in plans) follows the established monorepo pattern.
