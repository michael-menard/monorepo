---
generated: "2026-03-08"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: true
conflicts_found: 3
blocking_conflicts: 0
---

# Story Seed: WINT-4130

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Baseline predates all Phase 4 feature-cohesion infrastructure. The graph & cohesion system (graph-checker WINT-4060, cohesion-prosecutor WINT-4070, cohesion rules WINT-4050, graph population WINT-4030, capability inference WINT-4040) either does not yet exist in production or is in unstable states. The baseline documents the DB schemas and MCP tools as established but not the Phase 4 agent/command layer that this story validates.

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| graph schema (graph.features, graph.epics, graph.capabilities, graph.feature_capabilities) | `packages/backend/database-schema/src/schema/wint.ts` | The underlying data store the cohesion system reads from. WINT-4030 populates it; WINT-4130 validates detection against it. |
| graph_get_franken_features MCP tool | `packages/backend/mcp-tools/src/graph-query/graph-get-franken-features.ts` | Primary detection query used by graph-checker; updated by WINT-0131 to use feature-capability linkage |
| graph_get_capability_coverage MCP tool | `packages/backend/mcp-tools/src/graph-query/graph-get-capability-coverage.ts` | Per-feature CRUD breakdown; enriches violation hints in graph-checker |
| rulesRegistryGet MCP tool | `packages/backend/mcp-tools/src/rules-registry/rules-registry-get.ts` | Loads active cohesion rules for graph-checker Phase 2 |
| graph-checker agent | `.claude/agents/graph-checker.agent.md` | The detection layer being validated; must exist and be invocable. Produces `graph-check-results.json`. WINT-4060 status: created (ready-to-work) |
| cohesion-check command | `.claude/commands/cohesion-check.md` | The CLI entrypoint for manual validation runs (WINT-4110 status: created). Spawns graph-checker agent. |
| backlog-curator agent | `.claude/agents/backlog-curator.agent.md` | Downstream consumer of graph-checker output. WINT-4100 status: created (ready-to-work). |
| cohesion rules (wint.rules table) | populated by WINT-4050 | Active rules that graph-checker evaluates. WINT-4050 status: needs-code-review. Rules include: features with 'create' need 'delete', features with 'upload' need 'replace'. |
| Graph population script | `packages/backend/mcp-tools/src/scripts/populate-graph-features.ts` | WINT-4030 deliverable. Populates graph.features and graph.epics from monorepo. WINT-4030 status: needs-code-review. |
| Capability inference | WINT-4040 deliverable (failed-code-review) | Populates graph.feature_capabilities from historical story analysis. Needed for franken-feature detection to see full CRUD coverage. |

### Active In-Progress Work

| Story | Status | Overlap / Dependency Risk |
|-------|--------|--------------------------|
| WINT-4060 (graph-checker agent) | created / ready-to-work | **Hard runtime dependency**: validation cannot run without graph-checker delivering `graph-check-results.json`. This story is the direct predecessor; WINT-4130 cannot be tested until WINT-4060 is merged. |
| WINT-4100 (backlog-curator agent) | created / ready-to-work | Depends on WINT-4060 which also blocks WINT-4130; no file overlap but shares the `graph-check-results.json` output as an input |
| WINT-4050 (cohesion rules) | needs-code-review | Rules must be seeded (via WINT-4050) for graph-checker to apply them. If rules table is empty, validation degrades to BUILTIN-CRUD-COMPLETENESS only. |
| WINT-4030 (populate graph) | needs-code-review | Graph must be populated with real features for detection to find franken-features. Without population, all queries return empty. |
| WINT-4040 (capability inference) | failed-code-review | Capability data is needed to detect incomplete CRUD coverage. If WINT-4040 remains broken, graph-checker can only detect via BUILTIN-CRUD-COMPLETENESS with limited fidelity. |
| WINT-4110 (cohesion-check command) | created | Command file that this story exercises to trigger graph-checker; must be delivered by WINT-4110 before WINT-4130 can use the `/cohesion-check` workflow |
| WINT-4120 (workflow integration) | pending | Integrates cohesion-prosecutor into qa-verify-story / dev-implement-story; WINT-4130 validates the checker layer, not the integrated enforcement layer — scopes are distinct |

### Constraints to Respect

- Protected: all production DB schemas in `packages/backend/database-schema/` — validation script may read but must NOT modify schema files
- Protected: `@repo/db` client package API surface — do not change connection pooling or pool exports
- Protected: Knowledge Base schemas and pgvector setup
- Protected: Orchestrator artifact schemas in `packages/backend/orchestrator/src/artifacts/`
- This story depends on WINT-4100 per the index entry, but the substantive runtime dependencies are: WINT-4060 (graph-checker), WINT-4030 (graph populated), WINT-4050 (rules seeded), WINT-4040 (capabilities inferred). WINT-4100 (backlog-curator) is listed as the formal prerequisite but the actual system being validated is deeper than backlog-curator alone.
- "Test on existing franken-features" implies the story must select real known examples from the codebase (e.g., upload-without-replace, create-without-delete) — these must be verifiable against actual graph data, not hypothetical
- ADR-005: if any test harness runs end-to-end through real services, it must use real DB (dev/staging), not mocked connections
- ADR-006: if this story produces runnable scripts or E2E verification steps, those should run against live resources

---

## Retrieved Context

### Related Endpoints

None — this story does not create API endpoints. It exercises existing MCP tools and the graph-checker agent via the cohesion-check command.

### Related Components

None — no frontend UI components involved.

### Reuse Candidates

| Candidate | Location | How |
|-----------|----------|-----|
| graph-checker agent (WINT-4060 deliverable) | `.claude/agents/graph-checker.agent.md` | Primary system under validation; invoke via `/cohesion-check` command to exercise Phase 1–4 workflow |
| cohesion-check command (WINT-4110 deliverable) | `.claude/commands/cohesion-check.md` | CLI surface for triggering validation runs |
| graph_get_franken_features | `packages/backend/mcp-tools/src/graph-query/graph-get-franken-features.ts` | Direct tool call for spot-checking detection output; `CRUD_STAGES` constant defines the 4 expected lifecycle stages |
| graph_get_capability_coverage | `packages/backend/mcp-tools/src/graph-query/graph-get-capability-coverage.ts` | Per-feature CRUD breakdown for confirming which stages are missing |
| rulesRegistryGet | `packages/backend/mcp-tools/src/rules-registry/rules-registry-get.ts` | Confirm which active rules are registered before running validation |
| EVIDENCE.yaml schema | `packages/backend/orchestrator/src/artifacts/evidence.ts` | Standard artifact for recording test outcomes; validation results should be recorded here |
| graph-check-results.json schema | Defined in `.claude/agents/graph-checker.agent.md` Output section | Expected output shape to assert against during validation |
| populate-graph-features.ts script | WINT-4030 deliverable | May need to be re-run to ensure graph has real feature data before validation |

---

## Canonical References

Files that demonstrate the patterns this story should follow:

| Pattern | File | Why |
|---------|------|-----|
| Validation / test harness script | `packages/backend/mcp-tools/src/scripts/populate-graph-features.ts` | WINT-4030 precedent for a read-only scanning script that exercises MCP tools against real data — validation script for WINT-4130 should follow the same pattern (TypeScript, direct imports, read-only) |
| EVIDENCE.yaml recording | `packages/backend/orchestrator/src/artifacts/evidence.ts` | All test outcomes must be captured in EVIDENCE.yaml per the workflow; this schema defines the valid shape |
| graph-checker output schema | `.claude/agents/graph-checker.agent.md` (Output section) | The JSON schema that validation asserts against — understand the `violations`, `warnings`, `franken_features_found` fields before writing assertions |
| MCP tool direct-call pattern (ARCH-001) | `packages/backend/mcp-tools/src/graph-query/graph-get-franken-features.ts` | Direct TypeScript import, not HTTP; validation scripts must follow ARCH-001 pattern |

---

## Knowledge Context

### Lessons Learned

KB query unavailable. Lessons inferred from predecessor stories and Phase 4 context:

- **[WINT-4030 risk notes]** Feature extraction from monorepo may need manual validation — graph population script may not capture all real features; hand-verify that known franken-features (upload-without-replace, create-without-delete) are actually in the graph before running the validator
  - *Applies because*: If the known franken-features are not in the graph, validation will produce zero results and cannot confirm detection works
- **[WINT-4040 failed-code-review]** Capability inference is in a broken state — graph.feature_capabilities data may be incomplete or absent; the validator must handle both the case where capabilities exist and where they don't
  - *Applies because*: Without capabilities data, graph-checker falls back to BUILTIN-CRUD-COMPLETENESS only; validation needs to document which detection path was active
- **[WINT-4050 risk notes]** Rules may need exceptions; rules table may not yet have the canonical "upload needs replace" and "create needs delete" rules seeded when this story runs
  - *Applies because*: Validation must first confirm the rules exist, then confirm detection fires against them — if rules are absent, the test scenario collapses to the BUILTIN path
- **[WINT-0131 verdict: CONDITIONAL PASS]** graph_get_franken_features and graph_get_capability_coverage operate in limited mode without the featureId foreign key migration (0027) — WINT-0131 fixed this, but must confirm it is merged before validation can rely on full-fidelity detection
  - *Applies because*: Validation relies on these tools operating in full mode, not limited mode

### Blockers to Avoid (from past stories)

- Running validation before confirming the graph is populated — `graph_get_franken_features({})` will return `[]` if WINT-4030 script has not been run; this produces a false-negative, not a real pass
- Running validation before confirming cohesion rules are seeded — `rulesRegistryGet({ status: 'active' })` will return `[]` if WINT-4050 rules are not in the table; detection falls back to BUILTIN-CRUD-COMPLETENESS only
- Running validation before confirming WINT-4040 capability data — incomplete capability records will suppress some franken-feature matches
- Asserting on exact output without reading the graph-check-results.json schema first — field names and shapes matter for assertions
- Treating "zero violations found" as a passing result without first confirming the graph has known violations loaded

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy — UAT Must Use Real Services | If any validation scenario is treated as UAT, it must connect to real DB (dev/staging), real Cognito, and must NOT use MSW. For this story's purposes, validation against the local dev PostgreSQL (port 5432 or knowledge-base port 5433 for KB) is acceptable as a live service. |
| ADR-006 | E2E Tests Required in Dev Phase | If validation produces a runnable test harness script, at least one happy-path run must execute against live resources and be recorded in EVIDENCE.yaml. |
| ADR-002 | Infrastructure-as-Code Strategy | Any changes to DB schema or infra as part of validation setup must follow the CloudFormation pattern; no ad-hoc schema changes |

### Patterns to Follow

- Read-only validation: this story validates detection, not enforcement; the validation must not modify graph data, rules, or any source file
- Pre-flight checks: before running validation, confirm graph.features is populated, active rules exist, and capability data is present; document the pre-flight state in validation output
- Structured output: record all validation results in EVIDENCE.yaml with `e2e_tests` section populated per ADR-006 schema
- Known-violation fixture: document specific known franken-features (upload-without-replace, create-without-delete) as the test fixtures; confirm these appear in graph data before asserting
- Graceful result: if graph-checker returns empty results, report it as a detection failure (not a test pass) and document which pre-condition was absent

### Patterns to Avoid

- Mocking the graph DB for validation — the entire point is to test real detection against real data
- Skipping the pre-flight check on graph population and rules seeding
- Creating new DB migrations or schema changes as part of validation — this story is validation-only
- Modifying the graph-checker agent or cohesion rules as part of validation — fix defects in separate stories, document findings as outputs

---

## Conflict Analysis

### Conflict: Deep dependency chain — WINT-4130 depends on WINT-4100, which depends on WINT-4060, with additional runtime dependencies on WINT-4030, WINT-4050, and WINT-4040

- **Severity**: warning
- **Description**: The formal index dependency is `WINT-4100`, but the actual runtime dependencies for meaningful validation are: (1) WINT-4060 (graph-checker agent must exist and be runnable), (2) WINT-4030 (graph must be populated with real features), (3) WINT-4050 (cohesion rules must be seeded), (4) WINT-4040 (capability inference — currently in failed-code-review). Several of these are in unstable states. WINT-4130 cannot produce meaningful validation results until all runtime dependencies are stable.
- **Resolution Hint**: Include a pre-flight checklist in the story ACs that must pass before the main validation ACs are attempted. Design the validation story to document the state of each prerequisite and produce partial results (with documented gaps) when prerequisites are missing. Do not block the seed — document missing prerequisites as known gaps.

### Conflict: WINT-4040 (capability inference) in failed-code-review — may produce incomplete or absent capability data

- **Severity**: warning
- **Description**: WINT-4040 is the story that populates `graph.feature_capabilities` by inferring which capabilities (create/read/update/delete/upload/replace/download) existing features have from historical story analysis. Without this data, `graph_get_franken_features` can only detect based on BUILTIN-CRUD-COMPLETENESS with limited fidelity. The specific known franken-features ("upload without replace", "create without delete") may not be detectable at all if the capability data is absent.
- **Resolution Hint**: Validate in two modes: (1) "rules mode" — if capabilities and rules exist, assert detection fires against the specific rules; (2) "builtin mode" — if capabilities are absent, assert that BUILTIN-CRUD-COMPLETENESS detection produces warnings for features with partial coverage. Document which mode was active in the validation run's EVIDENCE.yaml.

### Conflict: Scope ambiguity — "validate graph & cohesion system" could mean many things

- **Severity**: warning
- **Description**: The story description says "test on existing franken-features (upload without replace, create without delete), verify detection and enforcement." However, "enforcement" typically belongs to the cohesion-prosecutor (WINT-4070), which is still pending. If this story attempts to validate enforcement, it may need to invoke cohesion-prosecutor too — but that agent may not exist yet. The validation scope should be scoped to detection (graph-checker) not enforcement (cohesion-prosecutor).
- **Resolution Hint**: Scope WINT-4130 to detection validation only: does graph-checker correctly identify known franken-features? Enforcement validation (does cohesion-prosecutor correctly block/flag?) should be a separate story or explicitly noted as out of scope. Clarify in non-goals that cohesion-prosecutor enforcement is not in scope for this validation story.

---

## Story Seed

### Title

Validate Graph & Cohesion System — Detection Verification Against Known Franken-Features

### Description

**Context**: The Phase 4 graph & cohesion system consists of: a graph database (graph.features, graph.epics, graph.feature_capabilities), a graph population script (WINT-4030), capability inference (WINT-4040), cohesion rules (WINT-4050), the graph-checker agent (WINT-4060), the cohesion-check command (WINT-4110), and the backlog-curator agent (WINT-4100). As of 2026-03-08, these components are in various states of completion (needs-code-review, failed-code-review, ready-to-work). This story is the integration validation — the first time the whole system is exercised end-to-end against real codebase data.

**Problem**: No end-to-end validation has been run against the graph & cohesion system to confirm that it actually detects the franken-feature patterns it was designed for. The two canonical test cases — "upload without replace" and "create without delete" — are known patterns in the existing codebase, but it has never been confirmed that the graph-checker agent detects them when operating against real graph data populated from the monorepo.

**Proposed solution**: Create a validation story that:

1. **Pre-flight check**: Confirms graph.features is populated (WINT-4030 run), active cohesion rules exist (WINT-4050 run), and capability data is present (WINT-4040 run). Documents which pre-conditions are met and which are absent.
2. **Known-violation fixture**: Identifies at least two real features in the monorepo that exhibit the "upload without replace" and "create without delete" patterns. Confirms these features appear in the graph with the relevant capabilities recorded.
3. **Detection validation**: Invokes the graph-checker agent via the `/cohesion-check` command and confirms it produces a `graph-check-results.json` with violations for the known franken-features. Validates the output schema matches the agent's documented contract.
4. **Rule validation**: Confirms the specific cohesion rules (from WINT-4050) fire against the known violations, not just BUILTIN-CRUD-COMPLETENESS. Documents which rule IDs matched.
5. **Degradation validation**: Confirms graph-checker emits appropriate warnings when operating in limited mode (e.g., capabilities absent, rules absent).
6. **Evidence capture**: Records all validation results in EVIDENCE.yaml with the `e2e_tests` section populated per ADR-006.

This story produces validation evidence, not new code. Any defects found should be filed as separate fix stories, not resolved inline.

### Initial Acceptance Criteria

- [ ] **AC-1 (Pre-flight)**: Validation script or manual checklist confirms: (a) graph.features has at least one row for known franken-feature candidates; (b) `rulesRegistryGet({ status: 'active' })` returns at least one active rule; (c) graph.feature_capabilities has rows for the target features. Pre-flight state is documented in EVIDENCE.yaml.
- [ ] **AC-2 (Known fixture — upload without replace)**: At least one real feature in the monorepo is identified that has an "upload" capability but lacks a "replace" capability. This feature is confirmed to be present in graph.features with the upload capability recorded in graph.feature_capabilities.
- [ ] **AC-3 (Known fixture — create without delete)**: At least one real feature in the monorepo is identified that has a "create" capability but lacks a "delete" capability. This feature is confirmed to be present in graph.features with the create capability recorded.
- [ ] **AC-4 (Detection fires — graph-checker produces violations)**: Invoking the graph-checker (via `/cohesion-check` or direct agent invocation) against the target features produces a `graph-check-results.json` where `franken_features_found > 0` and `violations` contains at least one entry for each known franken-feature from AC-2 and AC-3.
- [ ] **AC-5 (Output schema conformance)**: The produced `graph-check-results.json` conforms to the schema documented in `graph-checker.agent.md`: fields `story_id`, `generated_at`, `franken_features_found`, `violations` (array), `warnings` (array), `warning_count` are all present and correctly typed.
- [ ] **AC-6 (Rule-specific detection)**: Each violation entry in `graph-check-results.json` contains a valid `rule_id` (either a rule from the active registry or `"BUILTIN-CRUD-COMPLETENESS"`) and a non-empty `actionable_hint` per the agent schema.
- [ ] **AC-7 (Graceful degradation — empty graph)**: Validation confirms that when graph-checker is invoked against a scoped context with no graph data, it emits `GRAPH-CHECKER COMPLETE WITH WARNINGS: 1 warnings` with the warning message `"graph.features empty — WINT-4030 may not have run"` and `violations: []`. (Can be tested against a feature ID not in the graph.)
- [ ] **AC-8 (Graceful degradation — empty rules)**: Validation confirms that when cohesion rules are absent (or scoped query returns no rules), graph-checker emits `GRAPH-CHECKER COMPLETE WITH WARNINGS` with the appropriate warning and falls back to BUILTIN-CRUD-COMPLETENESS. (May require a separate invocation with empty rules state or documented as a structural verification of the agent spec.)
- [ ] **AC-9 (Completion signal)**: The graph-checker agent emits exactly one completion signal as its final output line, matching one of: `GRAPH-CHECKER COMPLETE`, `GRAPH-CHECKER COMPLETE WITH WARNINGS: {N} warnings`, or `GRAPH-CHECKER BLOCKED: {reason}`.
- [ ] **AC-10 (Evidence captured)**: All validation outcomes (pre-flight state, fixture confirmation, detection results, schema conformance, degradation results) are recorded in `EVIDENCE.yaml` under an `e2e_tests` section per ADR-006 schema. Defects found are listed under `known_deviations`.
- [ ] **AC-11 (Defect triage)**: Any detection failures found (e.g., known franken-feature not detected, output schema mismatch, wrong rule ID) are documented as discrete findings in EVIDENCE.yaml. A recommendation is made for each finding: fix in WINT-4060, fix in WINT-4030, fix in WINT-4050, or defer. No inline fixes are made to other stories' deliverables.

### Non-Goals

- Do NOT create new DB migrations or schema changes — this is validation only
- Do NOT modify the graph-checker agent, cohesion rules, or graph population scripts to make tests pass — defects go to separate fix stories
- Do NOT validate cohesion enforcement (cohesion-prosecutor, WINT-4070) — that is pending and not in scope for this story
- Do NOT validate the backlog-curator agent (WINT-4100) or cohesion-check command integration beyond invoking graph-checker
- Do NOT create a permanent automated test suite in this story — validation is a one-time verification pass; automation belongs in a separate testing story
- Do NOT mock the graph DB — all validation must use real data (dev/staging environment)
- Do NOT block on a single missing prerequisite — if WINT-4040 (capability inference) data is absent, document the gap and validate in BUILTIN mode
- Do NOT create frontend components, API endpoints, or npm packages

### Reuse Plan

- **Validation approach**: Follow the WINT-4030 populate-graph script pattern for a read-only TypeScript runner that calls MCP tools directly (ARCH-001 direct import pattern)
- **Evidence capture**: Use existing `packages/backend/orchestrator/src/artifacts/evidence.ts` schema for EVIDENCE.yaml; populate `e2e_tests` section per ADR-006
- **Graph tools**: `graph_get_franken_features`, `graph_get_capability_coverage`, `rulesRegistryGet` — direct TypeScript imports, not HTTP
- **Known fixture identification**: Grep the monorepo for features with upload/replace/create/delete capability mismatches; `CRUD_STAGES` constant in `graph-get-franken-features.ts` defines canonical stage names
- **Packages**: `@repo/db` (for any DB direct queries), MCP tools via direct import — no new npm packages

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- This story IS the test plan in a sense — the ACs are validation scenarios. The test plan should define the exact test steps as a structured harness:
  - **HP-1**: Pre-flight check (AC-1) — assert each pre-condition before proceeding
  - **HP-2**: Upload-without-replace fixture (AC-2) — identify real feature, confirm in graph
  - **HP-3**: Create-without-delete fixture (AC-3) — identify real feature, confirm in graph
  - **HP-4**: Detection fires (AC-4) — invoke graph-checker, assert violations array non-empty
  - **HP-5**: Schema conformance (AC-5) — validate `graph-check-results.json` shape
  - **HP-6**: Rule ID presence (AC-6) — assert `rule_id` and `actionable_hint` populated
  - **EC-1**: Empty-graph degradation (AC-7) — invoke against non-existent feature ID
  - **EC-2**: Empty-rules degradation (AC-8) — structural verification or invocation with no active rules
  - **MC-1**: Evidence capture (AC-10) — review EVIDENCE.yaml completeness
- ADR-005 applies: all validation must use real services (no mocked graph DB)
- ADR-006 applies: at least one happy-path run must be captured in EVIDENCE.yaml `e2e_tests`
- Known risk: if WINT-4040 data is absent, AC-2 and AC-3 fixture confirmation will fail; plan should include a contingency path to BUILTIN mode testing (AC-6 fallback)
- Strategy: **manual validation with structured evidence capture** — no automated Vitest tests; the deliverable is EVIDENCE.yaml plus a validation report (VERIFICATION.md)

### For UI/UX Advisor

- Not applicable — this story has no frontend surface
- The validation output (`graph-check-results.json`, EVIDENCE.yaml, VERIFICATION.md) is developer/PM-facing only
- If the validation produces a human-readable VERIFICATION.md summary, it should follow the same scannable format as QA verification reports (one finding per section, severity label, recommended action)

### For Dev Feasibility

- **Story type**: validation-only — primary deliverable is EVIDENCE.yaml + VERIFICATION.md, not new source code
- **Execution model**: the implementer invokes the graph-checker agent against real graph data and records results; no new TypeScript code is required unless a validation runner script is needed
- **Optional validation runner script**: a lightweight TypeScript script at `packages/backend/mcp-tools/src/scripts/validate-cohesion-detection.ts` could automate the fixture confirmation and graph-checker invocation, following the same pattern as `populate-graph-features.ts` (WINT-4030 precedent)
- **Pre-conditions that must be met before dev starts**:
  1. WINT-4060 (graph-checker agent) must be merged — the agent file must exist at `.claude/agents/graph-checker.agent.md`
  2. WINT-4110 (cohesion-check command) should be available for CLI invocation (or implement direct agent invocation as fallback)
  3. WINT-4030 (graph population) must have been run at least once in the dev environment — `graph.features` must have rows
  4. WINT-4050 (cohesion rules) must have seeded at least the "upload needs replace" and "create needs delete" rules
  5. WINT-4040 (capability inference) — desirable but not blocking; document mode (rules mode vs BUILTIN mode) in EVIDENCE.yaml
- **Canonical references for subtask decomposition**:
  - `packages/backend/mcp-tools/src/graph-query/graph-get-franken-features.ts` — `CRUD_STAGES` constant, primary detection query
  - `packages/backend/mcp-tools/src/rules-registry/rules-registry-get.ts` — active rules query
  - `.claude/agents/graph-checker.agent.md` — output schema to assert against
  - `packages/backend/orchestrator/src/artifacts/evidence.ts` — EVIDENCE.yaml schema for recording results
- **Estimated complexity**: medium — primarily a read-and-assert exercise, but requires navigating the multi-layer dependency chain and understanding the graph data model
- **Key risk**: If WINT-4040 capability data is absent, the known franken-feature fixtures (AC-2, AC-3) cannot be confirmed from graph data alone. In this case, the implementer should: (a) document the gap, (b) manually seed the fixture data for validation purposes (if DB write access available), or (c) validate in BUILTIN mode only and note the limitation
