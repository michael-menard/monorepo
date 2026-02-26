---
generated: "2026-02-25"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: true
conflicts_found: 2
blocking_conflicts: 0
---

# Story Seed: APIP-1020

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: No autonomous pipeline implementation exists yet. All APIP work is pre-implementation at baseline. The orchestrator package (`packages/backend/orchestrator/`) is deployed with elaboration and story-creation graphs, artifact schemas, and YAML persistence — this is the primary codebase context for this spike.

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| Orchestrator artifact schemas (Zod) | `packages/backend/orchestrator/src/artifacts/` | `FileChangeSchema` and `PlanStepSchema` in `plan.ts` are the closest field-level analogues to ChangeSpec fields; `schema: z.literal(1)` versioning pattern is already established |
| Story artifact schema | `packages/backend/orchestrator/src/artifacts/story.ts` | `StoryAcceptanceCriterionSchema` and `StoryArtifactSchema` are the primary inputs that decomposition must process into ChangeSpecs |
| YAML artifact persistence | `packages/backend/orchestrator/src/persistence/yaml-artifact-bridge.ts` | Established pattern for Zod-validated YAML artifact persistence under `plans/future/` feature directories |
| LangGraph elaboration graph | `packages/backend/orchestrator/src/graphs/elaboration.ts` | Existing LangGraph StateGraph with node wiring, conditional edges, and state annotations — downstream integration (APIP-1030+) will follow this pattern |
| Delta-detect node | `packages/backend/orchestrator/src/nodes/elaboration/delta-detect.ts` | Canonical node with Zod input/output contracts; shows how nodes call models with structured outputs |
| Discriminated union Zod pattern | `packages/backend/orchestrator/src/nodes/story/fanout-ux.ts` (line 134), `packages/backend/orchestrator/src/observability/tracer.ts` (line 117) | `z.discriminatedUnion()` is an established pattern in this codebase |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|-------------|
| APIP-0020 (Supervisor Loop) | In Elaboration | None — APIP-1020 is a pure research spike with no integration code. `changeOutline` added by APIP-1010 is nullable in ElaborationResult; APIP-0020 need not be updated. |
| APIP-5006 (LangGraph Server Infrastructure Baseline) | In Elaboration | None — spike is entirely local; no server dependency. |
| APIP-1010 (Structurer Node in Elaboration Graph) | Ready to Work | Direct dependency — APIP-1020 depends on APIP-1010's `ChangeOutlineItem` format as the primary input to ChangeSpec decomposition. Spike can use a placeholder format if APIP-1010 is not yet complete, but ADR-002 must be validated against final APIP-1010 output before being published. |

### Constraints to Respect

- **ADR-001 Decision 3**: APIP-1020 is a research spike. No integration code (DiffPlannerNode, wiring to APIP-1030) may be written until ADR-002 is published with a valid verdict.
- **ADR-001 Decision 4**: All pipeline components run locally on Docker. Spike tooling (model calls for decomposition) runs locally. No Lambda, no AWS services.
- **ENG-001 (Accepted Blocker)**: ChangeSpec schema review gates APIP-1030 elaboration. This spike is the gate.
- **Zod-first types**: All schema definitions use Zod with `z.infer<>`. No TypeScript interfaces.
- **No barrel files**: Import directly from source files.
- **YAML artifact persistence**: Spike output (decomposition YAMLs, ADR) follows `yaml-artifact-bridge` pattern under `plans/future/platform/autonomous-pipeline/`.

---

## Retrieved Context

### Related Endpoints

None. APIP-1020 is a research spike. No HTTP endpoints are created or modified.

### Related Components

| Component | Path | Notes |
|-----------|------|-------|
| Plan artifact schema | `packages/backend/orchestrator/src/artifacts/plan.ts` | `FileChangeSchema` (`path`, `action`, `reason`) and `PlanStepSchema` (`id`, `description`, `files`, `dependencies`, `slice`) are field-level inspiration — do NOT import as-is |
| Story artifact schema | `packages/backend/orchestrator/src/artifacts/story.ts` | `StoryAcceptanceCriterionSchema` and `StoryArtifactSchema` — the primary inputs the spike must decompose |
| Elaboration graph | `packages/backend/orchestrator/src/graphs/elaboration.ts` | Shows LangGraph StateGraph wiring pattern the downstream integration story will follow |
| Delta-detect node | `packages/backend/orchestrator/src/nodes/elaboration/delta-detect.ts` | Canonical node input/output contract with Zod; reference for decomposition prompt design |

### Reuse Candidates

- **`FileChangeSchema`** (`packages/backend/orchestrator/src/artifacts/plan.ts`): Fields `path`, `action` (`create | modify | delete`), `reason` — field-level inspiration for ChangeSpec `file_change` variant. Do not import as-is; ChangeSpec needs contract-level fields not present in plan artifacts.
- **`PlanStepSchema`** (same file): `id`, `description`, `files`, `dependencies`, `slice` — informs how atomic steps are structured with ordering and dependency references.
- **`schema: z.literal(1)`** pattern from `PlanSchema` in the same file — copy directly for ChangeSpec schema versioning.
- **`z.discriminatedUnion`** pattern from `packages/backend/orchestrator/src/nodes/story/fanout-ux.ts` (line 134) — same discriminated union on a type/kind field with typed variants.
- **YAML artifact persistence**: `packages/backend/orchestrator/src/persistence/yaml-artifact-bridge.ts` — for writing decomposition YAML and quality metrics artifacts.
- **Test pattern**: `packages/backend/orchestrator/src/artifacts/__tests__/plan.test.ts` — Vitest test structure (happy path parse, rejection of invalid fields, rejection of invalid enum values) to follow for `change-spec.test.ts`.

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Zod schema with `z.literal(1)` versioning | `packages/backend/orchestrator/src/artifacts/plan.ts` | `FileChangeSchema`, `PlanStepSchema`, and `PlanSchema` with `schema: z.literal(1)` — the direct structural model for ChangeSpec schema design |
| `z.discriminatedUnion` on a typed variant field | `packages/backend/orchestrator/src/nodes/story/fanout-ux.ts` | `UXGapSchema = z.discriminatedUnion('type', [...])` (line 134) — exact pattern to follow for ChangeSpec `change_type` variants |
| YAML artifact persistence with Zod validation | `packages/backend/orchestrator/src/persistence/yaml-artifact-bridge.ts` | Established pattern for writing spike deliverable YAML artifacts under feature directories |
| Vitest schema unit test structure | `packages/backend/orchestrator/src/artifacts/__tests__/plan.test.ts` | Test structure for `change-spec.test.ts`: minimal valid parse, full valid parse, rejection of invalid enum values, rejection of wrong schema version |

---

## Knowledge Context

### Lessons Learned

- **[WINT-1120 lesson]** Spike stories with mixed AC types (programmatic + command-level ACs) should explicitly mark command-level ACs as DEFERRED and designate CONDITIONAL_PASS as an acceptable QA outcome. (category: workflow)
  - *Applies because*: APIP-1020 has manual ACs (MC-1 through MC-3) that require live agent model calls for decomposition. These are not automatable in unit tests. The spike design should explicitly designate these as DEFERRED manual verification items and accept CONDITIONAL_PASS.

- **[APIP-1030 KB]** Splitting APIP-1030 into 1030a (schema-agnostic skeleton) and 1030b (ChangeSpec-dependent loop) enables parallel progress. (category: scheduling)
  - *Applies because*: APIP-1020 is on the critical path. The sooner ADR-002 is published, the sooner APIP-1030b can be unblocked. Any delay in this spike has direct critical path impact.

### Blockers to Avoid (from past stories)

- Do not write integration code (DiffPlannerNode, wiring to APIP-1030) during this spike — ADR-001 Decision 3 explicitly prohibits it.
- Do not skip schema versioning. The `schema: z.literal(1)` pattern must be in the first ChangeSpec draft; retrofitting versioning is costly once downstream consumers exist.
- Do not conflate the ChangeSpec schema (this spike) with the ChangeOutlineItem schema (APIP-1010). The two schemas serve different purposes: ChangeOutlineItem is the Structurer's intermediate output; ChangeSpec is the DiffPlanner's final machine-executable contract.
- Do not use TypeScript interfaces for the schema definition — all types must be `z.infer<typeof Schema>`.
- Do not evaluate schema fitness on trivial toy examples. The spike requires 10+ real APIP backlog stories to produce meaningful quality signal.
- Do not skip cost measurement. The ADR must include a cost model with median token count and USD estimate to inform model routing decisions in APIP-0040.

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| APIP ADR-001, Decision 3 | APIP-1020 as Research Spike | No integration code until ADR-002 is published with a valid verdict. Spike deliverables: schema ADR + 10+ story decompositions + quality metrics. |
| APIP ADR-001, Decision 4 | Local Dedicated Server | No Lambda. All pipeline runs on Docker Compose locally. Spike model calls run locally; no production API endpoint needed. |
| Monorepo code conventions | Zod-First Types | All schema definitions use Zod with `z.infer<>`. No TypeScript interfaces. |

### Patterns to Follow

- Define ChangeSpec as a Zod schema with `schema: z.literal(1)` version pinning, following the `PlanSchema` pattern in `artifacts/plan.ts`.
- Use `z.discriminatedUnion('change_type', [...])` for ChangeSpec variants (`file_change`, `migration_change`, `config_change`, `test_change`) to enable exhaustive type-checking in downstream nodes.
- Design ChangeSpec fields to be unambiguous with a limited model context window — the decomposition exercise will surface any fields that are subjective or underspecified.
- Persist spike deliverables as YAML artifacts using `yaml-artifact-bridge` under `plans/future/platform/autonomous-pipeline/_spike-output/APIP-1020/`.
- Place the schema file at `packages/backend/orchestrator/src/artifacts/change-spec.ts` following the artifact schema naming convention.

### Patterns to Avoid

- Do not model ChangeSpec as a free-form JSON blob. Downstream systems (review, QA, telemetry, model affinity, merge) require strongly typed, queryable fields.
- Do not design ChangeSpec without validating all 6 consuming system perspectives. Missing fields for any consumer will require a breaking schema change post-APIP-1030.
- Do not skip the cost measurement exercise. The ADR's cost model section is required (AC-7) and informs APIP-0040 model routing configuration.

---

## Conflict Analysis

### Conflict: APIP-1010 dependency (warning)
- **Severity**: warning
- **Description**: APIP-1020 depends on APIP-1010 (Structurer Node in Elaboration Graph). APIP-1010 defines the `ChangeOutlineItem` format — the primary structured input that the DiffPlanner will consume to produce ChangeSpecs. If APIP-1010 is still in progress when APIP-1020 begins, the spike must use a placeholder `change_outline` format for decomposition exercises. ADR-002 must be re-validated against the final APIP-1010 output before it is published.
- **Resolution Hint**: Prioritize APIP-1010 elaboration and implementation. The spike can proceed with a documented placeholder `change_outline` assumption, but the ADR should explicitly note this assumption and require re-validation before APIP-1030 elaboration begins.
- **Source**: baseline

### Conflict: APIP-1030 split creates parallel workstream opportunity (warning)
- **Severity**: warning
- **Description**: KB entry confirms APIP-1030 has been proposed for splitting into APIP-1030a (infrastructure skeleton, no ChangeSpec dependency) and APIP-1030b (change loop, gated on APIP-1020). If this split proceeds, APIP-1030a can begin alongside APIP-1020 elaboration. APIP-1020's ADR publishing timeline directly determines when APIP-1030b can begin.
- **Resolution Hint**: Confirm the APIP-1030 split status in `stories.index.md`. If APIP-1030a is unblocked, APIP-1030a elaboration should begin in parallel to maximize critical path throughput. APIP-1020 spike execution speed is critical.
- **Source**: lesson (KB)

---

## Story Seed

### Title

ChangeSpec Schema Design and Validation Spike

### Description

**Context**: The autonomous pipeline's implementation loop (APIP-1030), review graph (APIP-1050), QA graph (APIP-1060), change telemetry (APIP-3010), model affinity profiles (APIP-3020), and merge graph (APIP-1070) all consume a shared atomic change contract called a **ChangeSpec**. This schema is the most irreversible Phase 1 decision: once integration code is written against a schema shape, changing field names or types requires cascading updates across 6+ downstream systems.

**Problem**: No ChangeSpec schema exists today. The existing `FileChangeSchema` and `PlanStepSchema` in `packages/backend/orchestrator/src/artifacts/plan.ts` provide field-level inspiration but were designed for a human-facing plan document, not a machine-executable atomic change contract. Building Phase 1 integration code before the schema is validated on real stories is RISK-002 (high severity, affects APIP-1020, APIP-1030, and APIP-3030).

**Proposed Solution Direction**: This spike bypasses integration code entirely. The deliverables are:
1. A draft `ChangeSpecSchema` Zod schema (in `packages/backend/orchestrator/src/artifacts/change-spec.ts`) with `schema: z.literal(1)` version pinning and `z.discriminatedUnion('change_type', [...])` for exhaustive type-safety across 4 variants (`file_change`, `migration_change`, `config_change`, `test_change`).
2. Manual decomposition of 10+ real APIP backlog stories into ChangeSpecs using the draft schema, persisted as YAML under `_spike-output/APIP-1020/decompositions/`.
3. Quality measurement for each decomposition: AC count, ambiguous fields, estimated token cost, accuracy verdict.
4. Consumer-perspective validation: confirm all 6 downstream systems (implementation, review, QA, telemetry, model affinity, merge) have all required fields.
5. A published schema ADR (`_epic-elab/ADR-002-changespec-schema.md`) with a verdict (APPROVED / APPROVED WITH CONSTRAINTS / REVISION REQUIRED) and a cost model (median tokens + USD per decomposition + model recommendation).

This spike **gates APIP-1030b** (and effectively all of Phase 1 integration). No implementation graph code may be written until ADR-002 is published.

### Initial Acceptance Criteria

- [ ] AC-1: A draft `ChangeSpecSchema` is defined as a Zod schema with `schema: z.literal(1)` version pinning and `z.discriminatedUnion('change_type', [...])` covering all fields required by the 6 consuming systems (implementation loop, review, QA, telemetry, model affinity, merge). The schema is placed at `packages/backend/orchestrator/src/artifacts/change-spec.ts`. The `ChangeSpec` type is exported via `z.infer<typeof ChangeSpecSchema>`.
- [ ] AC-2: At least 10 real APIP backlog stories are decomposed into ChangeSpecs using the draft schema. Decompositions are persisted as YAML files at `plans/future/platform/autonomous-pipeline/_spike-output/APIP-1020/decompositions/`. Each file is parseable by `ChangeSpecSchema.parse()` without error.
- [ ] AC-3: Quality metrics are recorded for each decomposition in `_spike-output/APIP-1020/quality-metrics.yaml`: (a) number of atomic ChangeSpecs produced, (b) number of ambiguous fields requiring human clarification, (c) estimated token cost of the decomposition call, (d) whether the decomposition was judged accurate by manual inspection.
- [ ] AC-4: At least one decomposition uses each of the 6 consuming system perspectives (implementation, review, QA, telemetry, affinity, merge) to confirm all required fields are present. Findings documented in `_spike-output/APIP-1020/consumer-validation.yaml`.
- [ ] AC-5: The schema includes a versioning strategy: a `schema: z.literal(1)` version field and a documented process for adding fields without breaking existing consumers.
- [ ] AC-6: A schema ADR is published at `plans/future/platform/autonomous-pipeline/_epic-elab/ADR-002-changespec-schema.md` with one of three verdicts: APPROVED, APPROVED WITH CONSTRAINTS, or REVISION REQUIRED.
- [ ] AC-7: The ADR includes a cost model: median token count and USD cost per story decomposition, and a recommendation for whether this step should use Claude Sonnet, Haiku, or Opus.
- [ ] AC-8: The spike does NOT produce any integration code connecting a diff planner to the implementation graph. If any such integration code is written, this criterion fails.

### Non-Goals

- Writing the DiffPlannerNode LangGraph node (that is the integration story following this spike).
- Connecting ChangeSpec output to APIP-1030 (Implementation Graph with Atomic Change Loop).
- Implementing model routing for the diff planner step.
- Building any API, Lambda handler, or HTTP endpoint.
- Modifying any production database schemas.
- Modifying any existing orchestrator graph code.
- Evaluating cheap-model quality for decomposition (that is APIP-0040 / RISK-001 scope — this spike measures cost to inform that work, not to evaluate model quality).
- Defining the ChangeOutlineItem schema (that is APIP-1010's scope).
- Operator CLI visibility (APIP-5005).
- Any UI/dashboard changes (APIP-2020).

### Reuse Plan

- **Schemas**: `FileChangeSchema` and `PlanStepSchema` from `packages/backend/orchestrator/src/artifacts/plan.ts` as field-level inspiration. `schema: z.literal(1)` versioning copied directly from `PlanSchema`.
- **Patterns**: `z.discriminatedUnion('change_type', [...])` — follow `UXGapSchema` in `fanout-ux.ts` as the discriminated union model. `z.infer<typeof ChangeSpecSchema>` for the exported type alias.
- **Packages**: `packages/backend/orchestrator` for schema placement. `packages/backend/orchestrator/src/persistence/yaml-artifact-bridge.ts` for spike YAML output.
- **Tests**: Follow `packages/backend/orchestrator/src/artifacts/__tests__/plan.test.ts` structure for `change-spec.test.ts`.
- **Reference stories for decomposition**: Prioritize APIP-0010, APIP-0020, APIP-0040, APIP-1010, APIP-5001, APIP-5007, APIP-5004, APIP-5003, APIP-5006, APIP-5000 (10 minimum).

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

This is a `type: spike` story. Test coverage expectations differ from a feature story:

- **Unit tests** (Vitest): Focus on the Zod schema itself. Test: valid parse for each of the 4 discriminated union variants, rejection of missing required fields (ZodError), rejection of unknown `change_type` discriminant, rejection of wrong schema version (`schema: 2`), exhaustiveness checking via TypeScript switch + `assertNever()`.
- **No integration tests** by design (ADR-001 Decision 3). Integration code is explicitly deferred.
- **Schema regression test** (HP-4): A Vitest test that glob-reads all YAML files in `_spike-output/APIP-1020/decompositions/` and calls `ChangeSpecSchema.parse()` on each. This is the spike's primary programmatic validation.
- **Manual cases** (MC-1 through MC-3) require live model invocations and filesystem writes — these should be designated as DEFERRED in the test plan and CONDITIONAL_PASS should be an acceptable QA outcome (lesson from WINT-1120).
- Test file path: `packages/backend/orchestrator/src/artifacts/__tests__/change-spec.test.ts`
- Run command: `pnpm test --filter @repo/orchestrator -- change-spec`

### For UI/UX Advisor

No UI components are involved. This spike is entirely backend/schema design. The operator CLI (APIP-5005) may eventually surface ChangeSpec data for operator visibility, but that is out of scope for this spike. No UX input needed.

### For Dev Feasibility

Key feasibility questions and guidance:

1. **Schema field inventory** — the schema must cover all fields required by 6 consuming systems:
   - Implementation loop: `file_path`, `change_type`, `description`, `acceptance_criteria_ref`, `estimated_tokens`
   - Review graph: `change_type`, `risk_level`, `affected_patterns`
   - QA graph: `testability_hint`, `ac_refs`, `test_strategy`
   - Telemetry: `change_type`, `model_used`, `token_cost`, `duration_ms`
   - Model affinity: `change_type`, `file_extension`, `complexity_estimate`
   - Merge graph: `commit_message_hint`, `pr_body_hint`, `related_acs`

2. **Discriminated union design decision** — `z.discriminatedUnion('change_type', [...])` is preferred over a flat schema with optional fields. Variants: `file_change`, `migration_change`, `config_change`, `test_change`. The 4-variant design must be validated against 10+ real story decompositions to confirm all real-world changes can be classified into one of the four.

3. **APIP-1010 dependency handling** — If `ChangeOutlineItem` from APIP-1010 is not yet finalized, the spike should document the assumed `change_outline` format in the decomposition template and explicitly note it in ADR-002 as a pre-publication re-validation requirement.

4. **Decomposition prompt strategy** — The spike requires calling a model (Claude Sonnet recommended as baseline) with a story's acceptance criteria to get back a list of ChangeSpecs. The prompt template must be documented in the spike output at `_spike-output/APIP-1020/decomposition-template.yaml`. Reference `packages/backend/orchestrator/src/nodes/elaboration/delta-detect.ts` for how nodes call models with structured output contracts.

5. **Canonical references for schema implementation**:
   - Schema file: `packages/backend/orchestrator/src/artifacts/plan.ts` (closest existing analogue)
   - Discriminated union: `packages/backend/orchestrator/src/nodes/story/fanout-ux.ts` (line 134)
   - Test pattern: `packages/backend/orchestrator/src/artifacts/__tests__/plan.test.ts`
   - YAML persistence: `packages/backend/orchestrator/src/persistence/yaml-artifact-bridge.ts`
   - Node output contract: `packages/backend/orchestrator/src/nodes/elaboration/delta-detect.ts`

6. **Spike output directory separation** — Code artifacts in `packages/backend/orchestrator/src/artifacts/change-spec.ts`. Research evidence (decomposition YAMLs, quality metrics, consumer validation, ADR) in `plans/future/platform/autonomous-pipeline/_spike-output/APIP-1020/` and `plans/future/platform/autonomous-pipeline/_epic-elab/`. This separation follows the established monorepo pattern.

7. **Critical path pressure** — ADR-002 publication directly unblocks APIP-1030b. Timebox each manual decomposition to 30 minutes; 10 is the minimum to produce reliable quality signal. Stop at 10 if time is constrained.
