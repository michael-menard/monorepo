---
generated: "2026-03-08"
baseline_used: "plans/baselines/BASELINE-REALITY-2026-02-13.md"
baseline_date: "2026-02-13"
lessons_loaded: true
adrs_loaded: false
conflicts_found: 2
blocking_conflicts: 0
---

# Story Seed: WINT-4060

## Reality Context

### Baseline Status
- Loaded: yes
- Date: 2026-02-13
- Gaps: Baseline predates WINT-4010, WINT-4020, WINT-4030, WINT-0130, WINT-0131 deliveries (all completed/in-UAT after baseline date). Supplemented by direct codebase scan.

### Relevant Existing Features

| Feature | Location | Relevance |
|---------|----------|-----------|
| Graph query MCP tools (`graph_get_franken_features`, `graph_get_capability_coverage`) | `packages/backend/mcp-tools/src/graph-query/` | Direct consumers — graph-checker will call these tools to detect franken-features and coverage gaps |
| Rules registry sidecar (`getRules`, `proposeRule`, `promoteRule`) | `packages/backend/sidecars/rules-registry/`, `packages/backend/mcp-tools/src/rules-registry/` | Provides the active ruleset that graph-checker applies |
| `FrankenFeatureItemSchema`, `CapabilityCoverageOutputSchema` | `packages/backend/mcp-tools/src/graph-query/__types__/index.ts` | Zod types for graph tool outputs — must be imported, not redeclared |
| scope-defender agent | `.claude/agents/scope-defender.agent.md` | Exemplar agent-file structure for Phase 4 elaboration worker agents |
| `graph_get_franken_features()` function | `packages/backend/mcp-tools/src/graph-query/graph-get-franken-features.ts` | Identifies features with `< 4` distinct CRUD lifecycle stages — the primary data source for graph-checker |
| `graph_get_capability_coverage()` function | `packages/backend/mcp-tools/src/graph-query/graph-get-capability-coverage.ts` | Detailed capability breakdown per feature — used for rule evaluation context |

### Active In-Progress Work

| Story | Title | State | Overlap Risk |
|-------|-------|-------|--------------|
| WINT-4030 | Populate Graph with Existing Features and Epics | failed-qa (iteration 2) | High: graph-checker depends on WINT-4030 populating graph.features and graph.epics — graph-checker cannot run against an empty graph |
| WINT-4040 | Infer Existing Capabilities | in-progress (iteration 2) | Medium: WINT-4040 populates capabilities linked to features; graph-checker reads these via graph tools |
| WINT-4050 | Seed Initial Cohesion Rules | needs-code-review | Medium: graph-checker reads rules from wint.rules (seeded by WINT-4050) — no rules = no violations to detect |

### Constraints to Respect

- `FrankenFeatureItemSchema` and `CapabilityCoverageOutputSchema` are exported from `@repo/mcp-tools` — import them, do not redeclare
- Direct-call pattern (ARCH-001): call graph query compute functions directly, not via HTTP
- This is an agent-file-only story (`.agent.md` deliverable) — no TypeScript code, no test suite required
- Agent model: haiku (per Phase 4 pattern; scope-defender, gap-analytics-agent precedents)
- Agent must emit actionable feedback (per Risk Notes in index)

---

## Retrieved Context

### Related Endpoints

No HTTP endpoints are consumed or produced. All data access is via direct-call MCP tool functions:
- `graph_get_franken_features(input)` — `packages/backend/mcp-tools/src/graph-query/graph-get-franken-features.ts`
- `graph_get_capability_coverage(input)` — `packages/backend/mcp-tools/src/graph-query/graph-get-capability-coverage.ts`
- `rulesRegistryGet(input)` — `packages/backend/mcp-tools/src/rules-registry/rules-registry-get.ts`

### Related Components

Not applicable — this is a backend agent-file-only story with no UI surface.

### Reuse Candidates

| Asset | Location | How Used |
|-------|----------|----------|
| `graph_get_franken_features` | `packages/backend/mcp-tools/src/graph-query/graph-get-franken-features.ts` | Primary query source for detecting incomplete features |
| `graph_get_capability_coverage` | `packages/backend/mcp-tools/src/graph-query/graph-get-capability-coverage.ts` | Supplemental per-feature CRUD breakdown |
| `rulesRegistryGet` | `packages/backend/mcp-tools/src/rules-registry/rules-registry-get.ts` | Fetch active cohesion rules to apply |
| `FrankenFeatureItemSchema` | `packages/backend/mcp-tools/src/graph-query/__types__/index.ts` | Zod type for franken-feature output items |
| `CapabilityCoverageOutputSchema` | `packages/backend/mcp-tools/src/graph-query/__types__/index.ts` | Zod type for coverage breakdown output |
| scope-defender agent structure | `.claude/agents/scope-defender.agent.md` | Exemplar: 4-phase workflow, inputs table, outputs schema, completion signals, non-negotiables, LangGraph porting notes |

---

## Canonical References

This is an agent-prompt-only story — the deliverable is a single `.agent.md` markdown file. No TypeScript implementation pattern references are applicable.

| Pattern | File | Why |
|---------|------|-----|
| Agent/workflow (Phase 4 worker) | `.claude/agents/scope-defender.agent.md` | Best existing Phase 4 elaboration worker agent with identical structural requirements: haiku model, 4-phase workflow, required/optional inputs table, machine-readable JSON output, completion signals, non-negotiables section, LangGraph porting notes |

---

## Knowledge Context

### Lessons Learned

- **[WINT-2080, WKFL-010]** Agent-file-only stories: QA verification is purely structural/content — file inspection via grep and read; tests exempt, coverage not applicable.
  - *Applies because*: WINT-4060 delivers only `.claude/agents/graph-checker.agent.md`. No TypeScript code. Same exemption pattern applies.

- **[WKFL-010]** E2E tests are legitimately exempt for agent-file-only stories — document the exemption explicitly in EVIDENCE.yaml known_deviations.
  - *Applies because*: graph-checker has no UI surface, no HTTP endpoints, no TypeScript — no Playwright-testable surface area.

- **[WKFL-001, WKFL-006]** Review phase waived for documentation-only stories; substitute documentation quality check.
  - *Applies because*: graph-checker is a docs-only story (agent markdown file). Standard TypeScript code review provides no value.

- **[WINT-4010 OPP-01]** Import `FrankenFeatureItem` and `CapabilityCoverageOutput` from `@repo/mcp-tools` — do not redeclare parallel Zod schemas.
  - *Applies because*: The agent spec must reference the canonical types and instruct the implementing agent (downstream LangGraph node) to import rather than redefine these types.

- **[WINT-4010 OPP-04]** MCP wrappers should call compute functions directly, not HTTP — consistent with context-pack-get.ts pattern.
  - *Applies because*: graph-checker's LangGraph porting contract must specify direct-call pattern for all graph tool invocations.

### Blockers to Avoid (from past stories)

- Do not wait for WINT-4030 to reach `completed` state before elaborating WINT-4060 — the agent file can be authored independently; the dependency only matters at runtime
- Do not redeclare `FrankenFeatureItemSchema` or `CapabilityCoverageOutputSchema` in the agent spec — reference canonical import paths
- Do not specify HTTP calls to sidecar servers in the LangGraph porting notes — direct-call pattern only

### Architecture Decisions (ADRs)

ADR-LOG.md was not located at `plans/stories/ADR-LOG.md`. ADR context sourced from codebase evidence and KB lessons.

| Decision | Constraint |
|----------|------------|
| Direct-call pattern (ARCH-001) | Graph query tools must be called as imported TypeScript functions, not HTTP fetches |
| Zod-first types (CLAUDE.md) | All types defined via `z.object()` + `z.infer<>`. No TypeScript `interface` declarations |
| Agent model assignment | Phase 4 worker agents use haiku model (per scope-defender, gap-analytics-agent precedents) |
| No barrel files | Do not create an `index.ts` that only re-exports; import directly from source |

### Patterns to Follow

- Structured JSON output file (machine-readable) written to `{story_dir}/_implementation/graph-check-results.json`
- 4-phase sequential execution: Load Inputs → Query Graph → Apply Rules → Produce Output
- Required/optional inputs table with "Degradation if missing" column
- Completion signal on final line: `GRAPH-CHECKER COMPLETE`, `GRAPH-CHECKER COMPLETE WITH WARNINGS: {N}`, or `GRAPH-CHECKER BLOCKED: {reason}`
- LangGraph porting notes section documenting input/output contract for future node implementation
- Graceful degradation when optional inputs missing (increment warning count, continue with reduced context)

### Patterns to Avoid

- Hardcoding CRUD stages in the agent spec — reference the existing `CRUD_STAGES` constant from `graph-get-franken-features.ts`
- Specifying HTTP calls to sidecar servers in the porting contract
- Expanding scope beyond detecting and reporting — graph-checker reports findings only; remediation is for downstream agents (cohesion-prosecutor, backlog-curator)

---

## Conflict Analysis

### Conflict: Dependency not yet stable (WINT-4030 in failed-qa)

- **Severity**: warning
- **Description**: WINT-4030 (Populate Graph with Existing Features and Epics) is in `failed-qa` state (iteration 2). The graph-checker agent depends on WINT-4030 having populated `graph.features` and `graph.epics`. However, the agent file can be authored independently — the dependency only matters at runtime execution, not at story authoring time.
- **Resolution Hint**: Author the agent spec now; note in the agent's preconditions section that `graph.features` and `graph.epics` must be populated (WINT-4030 dependency) before graph-checker can produce meaningful results. The agent should degrade gracefully (return empty results with a warning) if the graph is empty.

### Conflict: Rules registry dependency not yet seeded (WINT-4050 in needs-code-review)

- **Severity**: warning
- **Description**: WINT-4050 seeds the initial cohesion rules into `wint.rules`. Without active rules, `getRules({ status: 'active' })` returns an empty array and graph-checker cannot detect violations. This is a runtime-only constraint.
- **Resolution Hint**: Agent spec should handle empty rules set gracefully — if `getRules` returns `[]`, emit a warning in the output and return an empty violations list rather than erroring. Document this in the graceful degradation section.

---

## Story Seed

### Title

Create graph-checker Agent

### Description

**Context**: The WINT Phase 4 feature cohesion subsystem has delivered its foundational infrastructure: the graph schema and query MCP tools (WINT-0130), the feature-capability linkage (WINT-0131), the feature registry (WINT-4010), the capability taxonomy (WINT-4020), and the cohesion rules registry with seeded rules (WINT-4050). The graph is being populated with existing features and epics (WINT-4030) and inferred capabilities (WINT-4040).

**Problem**: No agent currently queries the graph views (`franken_features`, `capability_coverage`) and applies the active cohesion rules to detect incomplete features. The pipeline has data and rules but no automated detector.

**Proposed Solution**: Create a haiku-powered worker agent (`graph-checker.agent.md`) that:
1. Fetches all franken-features via `graph_get_franken_features({})`
2. Fetches active cohesion rules via `rulesRegistryGet({ status: 'active' })`
3. Applies each rule against the franken-feature list and capability coverage data
4. Produces a machine-readable `graph-check-results.json` report with actionable violation details
5. Emits a human-readable summary for downstream agent consumption (cohesion-prosecutor, backlog-curator)

This agent is the detection layer of the cohesion enforcement pipeline. It does not remediate — it detects and reports with enough context for downstream agents to act.

### Initial Acceptance Criteria

- [ ] **AC-1**: A file `.claude/agents/graph-checker.agent.md` exists with valid YAML frontmatter (`created`, `updated`, `version`, `type: worker`, `model: haiku`, `name: graph-checker`, `spawned_by`)
- [ ] **AC-2**: The agent spec defines a required inputs section listing: story directory path (or invocation context), and optional package name filter for scoping franken-feature queries
- [ ] **AC-3**: The agent spec defines a 4-phase execution workflow: (1) Load Inputs, (2) Query Graph (call `graph_get_franken_features` and `rulesRegistryGet`), (3) Apply Rules (evaluate each active rule against each franken-feature), (4) Produce Output
- [ ] **AC-4**: The agent spec documents graceful degradation for: empty graph (no features populated), empty rules registry (no active rules), missing optional inputs — each increments warning count and continues
- [ ] **AC-5**: The agent spec defines the `graph-check-results.json` output schema with at minimum: `story_id`, `generated_at`, `franken_features_found` (count), `violations` (array of `{ rule_id, feature_id, feature_name, description, severity, actionable_hint }`), `warnings` (array), `warning_count`
- [ ] **AC-6**: Each violation in the output includes an `actionable_hint` field — a one-line description of what must be added to make the feature complete (e.g., "Add a `delete` capability to feature `user-authentication`")
- [ ] **AC-7**: The agent spec includes a non-goals section explicitly stating: does not modify graph data, does not create stories, does not write to the rules registry, does not perform remediation
- [ ] **AC-8**: The agent spec includes a LangGraph porting notes section documenting the input contract (state fields), execution contract (4-phase workflow), and output contract (`graph-check-results.json`) for future node implementation at `nodes/feature-cohesion/graph-check.ts`
- [ ] **AC-9**: The agent spec documents canonical references: `graph_get_franken_features.ts`, `graph_get_capability_coverage.ts`, `rulesRegistryGet.ts`, and `scope-defender.agent.md` (structural exemplar)
- [ ] **AC-10**: The completion signal section defines exactly three outcomes: `GRAPH-CHECKER COMPLETE`, `GRAPH-CHECKER COMPLETE WITH WARNINGS: {N} warnings`, `GRAPH-CHECKER BLOCKED: {reason}`

### Non-Goals

- Do NOT implement any TypeScript code (this is an agent-prompt-only story)
- Do NOT create MCP tools or Lambda handlers
- Do NOT modify `graph.features`, `graph.epics`, `capabilities`, or `wint.rules` tables
- Do NOT create stories or backlog entries (that is cohesion-prosecutor and backlog-curator's responsibility — WINT-4070, WINT-4100)
- Do NOT port the agent to a LangGraph node (that is deferred per porting notes, not in scope for this story)
- Do NOT add the agent to `model-assignments.yaml` in this story (a separate agent assignment story handles that)
- Do NOT enforce hard gates or block story delivery — graph-checker only reports

### Reuse Plan

- **Components**: Not applicable (no TypeScript code)
- **Patterns**: scope-defender 4-phase workflow structure, graceful degradation table, completion signals, LangGraph porting notes section
- **Packages**: References to `@repo/mcp-tools` (graph query tools), `@repo/sidecar-rules-registry` (getRules), `@repo/logger` — these are referenced in the agent spec as the tools the LangGraph node will import

---

## Recommendations for Subsequent Phases

### For Test Plan Writer

This is an agent-prompt-only story. The deliverable is a single `.agent.md` markdown file. QA verification strategy:
- Tests are exempt — no TypeScript code to test
- Coverage is not applicable — no TypeScript source files
- E2E is exempt — no UI surface, no HTTP endpoints
- QA verification is structural/content: verify file exists, frontmatter is valid YAML, all required sections present, output schema is complete, completion signals defined
- Document all exemptions explicitly in `EVIDENCE.yaml` `known_deviations`
- Recommend a documentation-quality check (schema validity, cross-reference verification) as substitute for code review per KB lesson pattern

### For UI/UX Advisor

Not applicable. This story produces an agent markdown file with no user-facing interface. The "UX" concern here is the quality and clarity of the `actionable_hint` field in violation output — each hint must be concrete and unambiguous enough for a downstream agent (cohesion-prosecutor) to act on without human interpretation.

### For Dev Feasibility

- **Complexity**: Low. The agent spec is a markdown file. All required infrastructure (graph tools, rules registry, types) is implemented and available.
- **Key risk**: WINT-4030 is in failed-qa; if it does not stabilize, the agent's Phase 2 query step will return an empty set at runtime. Mitigation: agent handles empty graph gracefully (warning + empty violations list).
- **Canonical references for subtask decomposition**:
  - Structural template: `.claude/agents/scope-defender.agent.md` — use this as the skeleton
  - Graph query types: `packages/backend/mcp-tools/src/graph-query/__types__/index.ts` — copy import paths exactly into LangGraph porting notes
  - Rules registry direct-call: `packages/backend/mcp-tools/src/rules-registry/rules-registry-get.ts` — reference this as the canonical `getRules` call site
  - Franken-features compute: `packages/backend/mcp-tools/src/graph-query/graph-get-franken-features.ts` — reference `CRUD_STAGES` constant; do not redefine it
- **Subtask suggestion**: Single subtask — author `.claude/agents/graph-checker.agent.md` using scope-defender as structural template, adapting phases 2-3 for graph querying and rule application. Estimated 3,000–5,000 tokens.
