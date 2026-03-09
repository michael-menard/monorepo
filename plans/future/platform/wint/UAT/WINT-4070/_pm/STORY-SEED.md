---
generated: "2026-03-08"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: false
adrs_loaded: true
conflicts_found: 2
blocking_conflicts: 0
---

# Story Seed: WINT-4070

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Baseline predates WINT-4040, WINT-4030 implementations; actual capability data now exists in graph.capabilities

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| graph.features table | graph schema (WINT-0060) | Feature registry the prosecutor queries |
| graph.capabilities table | graph schema (WINT-0060, WINT-0131) | Capability data inferred by WINT-4040 |
| graph_get_capability_coverage MCP tool | packages/backend/mcp-tools/src/graph-query/graph-get-capability-coverage.ts | Returns CRUD counts per feature — primary prosecution evidence |
| graph_get_franken_features MCP tool | packages/backend/mcp-tools/src/graph-query/graph-get-franken-features.ts | Returns features missing CRUD coverage — prosecution target list |
| graph_check_cohesion schema | packages/backend/mcp-tools/src/graph-query/__types__/index.ts | GraphCheckCohesionOutputSchema already defined (status: complete/incomplete/unknown) |
| scope-defender agent | .claude/agents/scope-defender.agent.md | Sister DA agent — structural template for the prosecutor role |
| evidence-judge agent | .claude/agents/evidence-judge.agent.md | Sister evaluator agent — shows pattern for pass/fail verdict output |

### Active In-Progress Work

| Story | Status | Overlap Risk |
|-------|--------|--------------|
| WINT-4040 | failed-code-review | Provides capability data this story reads — implementation exists at packages/backend/mcp-tools/src/scripts/infer-capabilities.ts |
| WINT-4050 | needs-code-review | Defines cohesion rules this prosecutor will apply |
| WINT-4030 | needs-code-review | Populates graph.features that backs prosecution queries |
| WINT-4060 | pending | Creates graph-checker agent (haiku) — parallel role covering mechanical rule application; prosecutor is PO overlay |

### Constraints to Respect

- graph.capabilities table schema is fixed: featureId FK, lifecycleStage enum (create/read/update/delete), maturityLevel, capabilityType
- GraphCheckCohesionOutputSchema already exists in __types__/index.ts — prosecutor output should be compatible
- scope-defender hard cap of 5 challenges is a parallel precedent — prosecutor should have a bounded verdict output
- This is a docs-only / agent-prompt-only story (new agent .md file only — no code changes)
- Protected: all production DB schemas, @repo/db client, orchestrator artifact schemas

---

## Retrieved Context

### Related Endpoints

None — this story creates an agent file, not an API endpoint.

### Related Components

None — no UI components involved.

### Reuse Candidates

| Candidate | Location | How |
|-----------|----------|-----|
| scope-defender agent structure | .claude/agents/scope-defender.agent.md | Template for DA-role worker agent: role, mission, inputs, phases, output schema, completion signals, non-negotiables |
| GraphCheckCohesionOutputSchema | packages/backend/mcp-tools/src/graph-query/__types__/index.ts | Existing schema: `{ status: complete/incomplete/unknown, violations?: string[] }` — prosecutor verdict should align or extend this |
| FrankenFeatureItemSchema | packages/backend/mcp-tools/src/graph-query/__types__/index.ts | `{ featureId, featureName, missingCapabilities[] }` — primary prosecution target data shape |
| CapabilityCoverageOutputSchema | packages/backend/mcp-tools/src/graph-query/__types__/index.ts | CRUD counts per feature — prosecution evidence |
| graph_get_franken_features | packages/backend/mcp-tools/src/graph-query/graph-get-franken-features.ts | Query to get features with missing CRUD (haiku-compatible) |
| graph_get_capability_coverage | packages/backend/mcp-tools/src/graph-query/graph-get-capability-coverage.ts | Query to get CRUD counts for a feature |
| evidence-judge agent patterns | .claude/agents/evidence-judge.agent.md | Pass/conditional-pass/fail verdict pattern with structured output |

---

## Canonical References

canonical_references: []
canonical_refs_note: 'Non-code story (agent-prompt-only) — no implementation pattern refs applicable. The agent .md file itself is the deliverable. The scope-defender agent (.claude/agents/scope-defender.agent.md) is the structural reference for agent file format.'

---

## Knowledge Context

### Lessons Learned

KB query was not available. Lessons below are inferred from sibling stories in Phase 4:

- **[WINT-4040]** Inference quality is heuristic — mark inferred data with maturity_level='beta' and surface gaps for human review (pattern: blocker)
  - *Applies because*: Prosecutor will be operating on beta-maturity capability data; verdicts should reflect confidence level
- **[WINT-4050/4060]** Cohesion rules may have exceptions — DA role must have escape hatches for legitimate partial-coverage features (pattern: pattern)
  - *Applies because*: Prosecutor is a PO role — must not block all features missing full CRUD when incomplete coverage is intentional
- **[WINT-4040]** Script that depends on prior story's data (WINT-4030 graph.features) must guard against empty prerequisite tables (pattern: blocker)
  - *Applies because*: Prosecutor must guard: if no capabilities data exists, emit BLOCKED rather than false verdicts

### Blockers to Avoid (from past stories)

- Producing verdicts on empty or unpopulated graph data (capabilities table may be empty if WINT-4040 not merged)
- Treating all Franken-features as failures without allowing exception patterns (legitimate single-operation features)
- Unclear completion signals — must emit exactly one of COMPLETE / COMPLETE WITH WARNINGS / BLOCKED

### Architecture Decisions (ADRs)

| ADR | Title | Constraint |
|-----|-------|------------|
| ADR-005 | Testing Strategy | UAT must use real services, not mocks — not directly applicable (agent-only story) |
| ADR-006 | E2E Tests in Dev Phase | E2E not applicable: frontend_impacted=false, agent-only story |

Only ADR-005 and ADR-006 are potentially relevant; both are inapplicable since this story creates no API, DB, or frontend code.

### Patterns to Follow

- Agent .md file structure from scope-defender: role metadata frontmatter, role/mission/inputs/execution phases/output schema/completion signals/non-negotiables sections
- Bounded output: hard cap on findings (avoid unbounded prosecution lists)
- Graceful degradation when optional inputs (cohesion rules, capability data) are missing
- Machine-readable output file + human-readable summary (scope-defender precedent)
- One completion signal per run (exactly one: COMPLETE, COMPLETE WITH WARNINGS, or BLOCKED)

### Patterns to Avoid

- Uncapped verdict lists (scope-defender caps at 5; prosecutor should have similar cap or structured output)
- Blocking on unavailable optional inputs (graceful degradation required)
- Hardcoding rules inside agent — rules should be read from graph.cohesionRules or WINT-4050 rule store
- Assuming graph.capabilities is fully populated — must guard against empty/sparse data

---

## Conflict Analysis

### Conflict: Dependency sequencing (WINT-4040)
- **Severity**: warning
- **Description**: WINT-4070 depends on WINT-4040 (capability inference), but WINT-4040 is currently at failed-code-review. The implementation exists (infer-capabilities.ts is deployed), but data may be sparse until WINT-4040 passes code review and is re-run. The prosecutor agent file can be written now; its runtime behavior guards against empty data.
- **Resolution Hint**: Include a precondition check in the agent: if `graph.capabilities` is empty, emit BLOCKED with reason "no capability data — run WINT-4040 first". Document in agent file that WINT-4040 is an execution prerequisite, not a file-creation prerequisite.

### Conflict: WINT-4060 overlap (graph-checker agent)
- **Severity**: warning
- **Description**: WINT-4060 also creates an agent that queries graph views for missing CRUD coverage (haiku-powered). WINT-4070 (sonnet-powered, PO role) must differentiate its role from the graph-checker to avoid redundancy.
- **Resolution Hint**: graph-checker (WINT-4060) is mechanical rule application — reports violations. cohesion-prosecutor (WINT-4070) is PO judgment — interprets violations, applies business context, decides whether a feature is truly complete or legitimately narrow-scoped. The prosecutor should consume graph-checker output or call the same MCP tools, then apply PO-layer reasoning (exceptions, deferral decisions, verdict with justification).

---

## Story Seed

### Title
Create cohesion-prosecutor Agent (PO Role) — Feature Completeness Enforcer

### Description

**Context**: The WINT graph infrastructure (WINT-0060, WINT-0131) tracks feature capabilities via `graph.capabilities`. WINT-4040 infers CRUD capabilities from story history. WINT-4050 defines cohesion rules (e.g., "features with 'create' need 'delete'"). WINT-4060 creates a haiku-powered graph-checker that mechanically detects rule violations.

**Problem**: Mechanical rule checking alone cannot distinguish between a legitimately narrow-scoped feature (e.g., a read-only reporting endpoint) and an incomplete feature that was never given a delete operation. A Product Owner lens is needed to apply business judgment at workflow gates — asking "is this feature actually done from a product perspective?" rather than just "does this feature pass all rules?"

**Proposed solution**: Create a sonnet-powered `cohesion-prosecutor` worker agent (new file: `.claude/agents/cohesion-prosecutor.agent.md`) that:
1. Accepts a story ID and feature ID as inputs
2. Queries `graph_get_capability_coverage` and/or `graph_get_franken_features` for coverage evidence
3. Applies PO-layer reasoning to determine whether missing CRUD coverage is a genuine gap vs. an acceptable exception
4. Emits a structured verdict: COMPLETE / INCOMPLETE-EXCUSED / INCOMPLETE-BLOCKED with justification
5. Writes a machine-readable `prosecution-verdict.json` to the story directory

The agent acts as a gatekeeper at story completion — it runs during the qa-verify or workflow gate phase to enforce feature completeness before a story is marked done.

### Initial Acceptance Criteria

- [ ] AC-1: Agent file exists at `.claude/agents/cohesion-prosecutor.agent.md` with valid frontmatter (model: sonnet, type: worker, spawned_by list)
- [ ] AC-2: Agent defines required inputs: `story_id`, `feature_id` (or feature name), `story_dir`, with optional `cohesion_rules_path` and `graph_checker_output_path`
- [ ] AC-3: Agent calls `graph_get_capability_coverage` or consumes graph-checker output to gather CRUD evidence for the feature
- [ ] AC-4: Agent applies PO-layer reasoning — distinguishes legitimate narrow-scope features from incomplete ones using business context from the story file
- [ ] AC-5: Agent emits verdict: one of `COMPLETE` / `INCOMPLETE-EXCUSED` / `INCOMPLETE-BLOCKED`, with justification and list of missing capabilities (if any)
- [ ] AC-6: Agent writes `prosecution-verdict.json` to `{story_dir}/_implementation/prosecution-verdict.json` with machine-readable schema
- [ ] AC-7: Agent handles missing capability data gracefully — if `graph.capabilities` is empty or feature not found, emits `PROSECUTION BLOCKED: no capability data` rather than a false verdict
- [ ] AC-8: Agent handles optional cohesion rules input — if rules not provided, applies embedded minimal PO heuristics (all 4 CRUD expected for data-owning features; read-only acceptable for reporting features)
- [ ] AC-9: Agent emits exactly one completion signal: `PROSECUTION COMPLETE`, `PROSECUTION COMPLETE WITH WARNINGS: {N} warnings`, or `PROSECUTION BLOCKED: {reason}`
- [ ] AC-10: Agent non-negotiables section explicitly prohibits modifying source files, DB schemas, or any code artifact — docs-only agent

### Non-Goals

- Do NOT write code — this is an agent .md file only
- Do NOT modify `graph.capabilities` or any DB schema
- Do NOT create a LangGraph node (deferred to Phase 9 equivalent)
- Do NOT duplicate graph-checker (WINT-4060) mechanical rule application — consume its output or call the same tools
- Do NOT enforce verdict outcomes automatically (reporting only; workflow integration is WINT-4120)
- Do NOT block indefinitely on missing WINT-4040 or WINT-4050 data — graceful degradation required
- Do NOT create a frontend component, API endpoint, or DB migration

### Reuse Plan

- **Agent structure**: `.claude/agents/scope-defender.agent.md` — frontmatter template, phase structure, completion signals, non-negotiables format
- **MCP tool inputs**: `GraphCheckCohesionInputSchema`, `FrankenFeatureItemSchema`, `CapabilityCoverageOutputSchema` from `packages/backend/mcp-tools/src/graph-query/__types__/index.ts`
- **Verdict pattern**: `evidence-judge.agent.md` — pass/conditional-pass/fail with structured JSON output
- **Packages**: None (agent file only, no npm packages)

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

- This is an agent-prompt-only story — no unit tests, no Vitest coverage, no Playwright E2E required
- Test plan should define: manual verification checklist (load agent, run against sample story with known capability gaps, verify prosecution-verdict.json shape), and AC-by-AC verification steps
- Key test scenarios: (1) feature with all 4 CRUD → COMPLETE verdict; (2) feature missing update → INCOMPLETE-BLOCKED or INCOMPLETE-EXCUSED depending on story context; (3) empty capability data → PROSECUTION BLOCKED
- ADR-005 and ADR-006 are not applicable (no backend, no frontend)

### For UI/UX Advisor

- Not applicable — agent files have no UI surface
- If there is a human-readable summary section in the output file, it should be legible to a PM reading raw markdown/JSON
- The verdict values (COMPLETE / INCOMPLETE-EXCUSED / INCOMPLETE-BLOCKED) should be unambiguous to a non-technical stakeholder

### For Dev Feasibility

- This is a docs-only story — implementation effort is agent .md authoring, not code
- Canonical references for agent file format: `.claude/agents/scope-defender.agent.md` (most relevant structural reference)
- MCP tools available for the agent to call at runtime: `graph_get_capability_coverage`, `graph_get_franken_features` (both deployed, verified by WINT-0131)
- Key design decision: should the agent call graph MCP tools directly, or consume graph-checker (WINT-4060) output file? Recommend: call MCP tools directly since WINT-4060 may not be complete; document both paths in agent inputs
- Output schema for `prosecution-verdict.json` should be defined in the agent file and aligned with `GraphCheckCohesionOutputSchema` for forward compatibility with WINT-4120
- Execution gate consideration: agent must function even when WINT-4040 data is sparse — include guard logic in Phase 1 of agent execution
